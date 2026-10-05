/* ═══════════════════════════════════════════════════════════════════════════
   MORPH — the task page folding into its parked card, and back out

   Minimising and resuming are the same movement in two directions, so they are
   one function. What travels is a GHOST: a plain div carrying the two lines the
   card shows, flown from one rectangle to the other on top of everything else.
   Nothing real is animated.

   That matters more than it looks. The screens are moved by the router's own
   transforms and the parked card is re-rendered from scratch on every change —
   animating either would mean a transition competing with a layout, and the
   state it left behind would depend on the animation finishing. Here the state
   change happens IMMEDIATELY and in full; the ghost is decoration that removes
   itself. Kill it mid-flight and the app is still exactly where it should be.

   Measured, not guessed: both rectangles are read from the real elements after
   the state change, so the flight lands wherever the card actually is.
   ═══════════════════════════════════════════════════════════════════════════ */

/* TASKMORPH_, not MORPH_: screens/assess/morph.js already owns MORPH_MS for the
   checklist's card flight. Two files in one bundle share one global scope, and a
   colliding const is a SyntaxError that kills every script after it. */
const TASKMORPH_MS = 340;

/* The phone frame, so the ghost is positioned in the same space as the screens
   rather than the document — the frame is centred in the viewport. */
const morphRoot = () => document.getElementById("phone");

function taskMorphRect(el){
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const f = morphRoot().getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return {x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height};
}

/* from/to are rects in frame space. `lines` is what the ghost carries — the same
   two lines the parked card shows, so the thing that moves is the thing that
   arrives. `landed` runs when the flight is over, or straight away if it cannot
   be flown at all. */
/* `asCard` says which END of the flight looks like the parked card. Minimising,
   that is the destination; resuming, it is the start — so the same two rules run
   in reverse rather than needing a second set. */
function taskMorph(from, to, lines, landed, asCard = "to"){
  const done = () => { if (landed) landed(); };
  if (!from || !to ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    done();
    return;
  }

  const g = document.createElement("div");
  g.className = asCard === "from" ? "morph morph--go" : "morph";
  g.setAttribute("aria-hidden", "true");
  g.innerHTML =
    `<span class="morph__l1">${lines[0] || ""}</span>` +
    `<span class="morph__l2 t-label-sm">${lines[1] || ""}</span>`;
  Object.assign(g.style, {
    left: from.x + "px", top: from.y + "px",
    width: from.w + "px", height: from.h + "px",
  });
  morphRoot().appendChild(g);

  /* Two frames, not one: the first commits the starting rectangle to layout, and
     without it the browser coalesces both sets of styles and there is nothing to
     transition between. */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    g.classList.toggle("morph--go", asCard === "to");
    Object.assign(g.style, {
      left: to.x + "px", top: to.y + "px",
      width: to.w + "px", height: to.h + "px",
    });
  }));

  /* setTimeout, not transitionend. The destination is guaranteed even if the
     transition never fires — a backgrounded tab, a pane that froze, a browser
     that dropped the frame. The one rule this file exists to keep. */
  let over = false;
  const end = () => {
    if (over) return;
    over = true;
    g.remove();
    done();
  };
  g.addEventListener("transitionend", end, {once:true});
  setTimeout(end, TASKMORPH_MS + 80);
}
