
/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN 1 — ROW → CARD MORPH
   Opening a part rebuilds the list's innerHTML, so nothing survives to animate:
   the row is destroyed and the card is a different element. This runs a
   shared-element transition across that rebuild.

   A ghost, not a FLIP scale. The thumbnail is 48x48 and the card's image is
   310x220 — scaling one into the other is a 1:1 box becoming 1.4:1, so the
   picture visibly squashes on the way. The ghost animates width and height
   instead, and `background-size:cover` re-crops every frame, so the image
   genuinely grows rather than stretching.

   ONE direction only. The card you are leaving closes instantly — no shrinking
   image, no easing its height shut. It used to fly back up into its row, and that
   upward movement pulled the eye away from the very thing the mechanic needs to
   look at next. Judging a part is a rhythm of look-decide-swipe, and the only
   thing that should move is the part arriving.

   So the outgoing card is simply gone by the next frame, and the incoming one
   grows out of its thumbnail: title with the image, buttons just behind it.

   NOTHING ANIMATES HEIGHT, and that is the rule that keeps the list still.
   render() swaps a 96px row for a 392px card and a 392px card back for a 96px
   row in the same pass, so the two deltas cancel and every row below the pair is
   already where it belongs — the layout does not move at all. An earlier cut
   animated the incoming card's height from 96, which meant holding open a 296px
   hole the layout had already closed: the list below jumped up 296px on the first
   frame and slid back over 300ms. That was the bounce. It also shrank
   scrollHeight by the same 296, so near the foot of the list the browser clamped
   scrollTop and released it a moment later — the snap on the end of the bounce.

   The growth the eye actually wants is the IMAGE growing, and that is the ghost's
   job. The card's box only fades in.
   ═══════════════════════════════════════════════════════════════════════════ */
const MORPH_MS   = 300;
const MORPH_EASE = "cubic-bezier(.22,.61,.36,1)";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Everything the ghost needs to stand in for a box that is about to disappear. */
function snapshot(el){
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width) return null;
  const cs = getComputedStyle(el);
  return {
    top: r.top, left: r.left, width: r.width, height: r.height,
    radius: cs.borderRadius,
    image: cs.backgroundImage, size: cs.backgroundSize,
    position: cs.backgroundPosition, colour: cs.backgroundColor,
  };
}

/* Fly a box from `from` to wherever `toEl` has landed, with the real element
   hidden until it arrives — so there is only ever one of it on screen.

   The ghost lives INSIDE the scroller, in content coordinates. It has to:
   revealActive() smooth-scrolls the list at the same moment, and a ghost parked
   against the frame would sail away from its destination — it flew up over the
   app bar on the first cut. Anchored to the content, the scroll carries it. */
function flyGhost(from, toEl){
  if (!from || !toEl) return;
  const to = toEl.getBoundingClientRect();
  if (!to.width) return;
  const base = scrollEl.getBoundingClientRect();
  const y    = scrollEl.scrollTop;
  const cs   = getComputedStyle(toEl);

  const ghost = document.createElement("div");
  ghost.className = "morph-ghost";
  Object.assign(ghost.style, {
    backgroundImage: from.image, backgroundSize: from.size,
    backgroundPosition: from.position, backgroundColor: from.colour,
  });
  scrollEl.appendChild(ghost);

  toEl.style.visibility = "hidden";
  const frames = [
    {left: (from.left - base.left) + "px", top: (from.top - base.top + y) + "px",
     width: from.width + "px", height: from.height + "px", borderRadius: from.radius,
     backgroundSize: from.size},
    {left: (to.left - base.left) + "px", top: (to.top - base.top + y) + "px",
     width: to.width + "px", height: to.height + "px", borderRadius: cs.borderRadius,
     backgroundSize: cs.backgroundSize},
  ];
  const anim = ghost.animate(frames, {duration: MORPH_MS, easing: MORPH_EASE, fill: "both"});
  let cleaned = false;
  const done = () => {
    if (cleaned) return;
    cleaned = true;
    ghost.remove();
    toEl.style.visibility = "";
  };
  anim.addEventListener("finish", done);
  anim.addEventListener("cancel", done);
  /* Belt as well as braces. `finish` does not arrive if the tab is backgrounded
     mid-flight, and the cost of missing it is the real image staying invisible
     for good — a far worse failure than a ghost lingering a few frames. */
  setTimeout(done, MORPH_MS + 80);
}

/* The image leads; the words and the buttons come in just behind it. Staggering
   them is the difference between "a card appeared" and "the row became a card". */
function riseIn(el, delay){
  if (!el) return;
  el.animate([{opacity: 0, transform: "translateY(6px)"},
              {opacity: 1, transform: "none"}],
             {duration: 180, delay, easing: MORPH_EASE, fill: "both"});
}

/* The card's box has a hairline and a shadow, so without something it would
   simply pop into existence at full size. A fade is enough — the image is
   already flying into it and the text is rising behind that.

   Applied to the ITEM, not the .card inside it. swipe.js owns .card's opacity and
   transform while a swipe is in flight, and this has no business sharing them.

   fill:"none" for the same reason, one level down: a WAAPI animation that is
   filling beats an inline style, so a filling fade anywhere in here could out-rank
   flyOut()'s card.style.opacity = "0". With no fill it lets go the moment it ends,
   and a stalled one holds nothing at all — which is also the resting state. */
function fadeIn(el){
  if (!el) return;
  el.animate([{opacity: 0}, {opacity: 1}],
             {duration: 140, easing: MORPH_EASE, fill: "none"});
}

/* Anything still in the air belongs to a move the mechanic has already abandoned.
   Tapping quickly down the list used to stack ghosts — four after two taps — each
   landing on a destination that no longer existed. */
function clearGhosts(){
  document.querySelectorAll(".morph-ghost").forEach(g => g.remove());
  listEl.querySelectorAll(".card__media, .thumb").forEach(el => {
    if (el.style.visibility === "hidden") el.style.visibility = "";
  });
}

/* The one entry point: set the active part and re-render, morphing across it. */
function setActivePart(next){
  clearGhosts();
  if (reducedMotion() || next === -1 || next === activeIndex){
    activeIndex = next;
    render();
    return;
  }

  /* Only the part being opened is captured. The one being left closes with no
     animation at all — see the note above setActivePart. */
  const inItem  = listEl.querySelector(`.item[data-index="${next}"]`);
  const fromRow = snapshot(inItem && inItem.querySelector(".thumb"));

  activeIndex = next;
  render();

  const card = listEl.querySelector(".item--expanded");
  /* Reveal from in here rather than from the callers, so the scroll starts on the
     same frame as everything else and reads as one movement. */
  revealActive("smooth");
  if (card){
    fadeIn(card);
    flyGhost(fromRow, card.querySelector(".card__media"));
    /* Short delays on purpose. At 60/110 the card was a white panel for the
       first third of the move — the image had left the row but nothing had
       arrived yet. The title now travels with the image and the buttons land
       just after it. */
    riseIn(card.querySelector(".card__head > p"), 0);
    riseIn(card.querySelector(".card__actions"), 70);
  }
}
