/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN 1 — RENDER
   ═══════════════════════════════════════════════════════════════════════════ */
const listEl       = document.getElementById("list");
const scrollEl     = document.getElementById("scroll");
const nextBtn       = document.getElementById("nextBtn");
const assessFooter  = document.getElementById("assessFooter");
const scrAssessEl   = document.getElementById("scrAssess");

/* The second line of a row, and of the card head. What sits there depends on
   what is still owed on the part, which is why there are three answers and not
   one:

     pending   the note — what to look at. It is the instruction, and it is only
               worth screen space while it is still to be followed.
     faulty    what was found. The instruction has been acted on and the finding
               replaces it, because that is now the fact about this part.
     good      nothing. A part that passed needs no second line: the tick has
               said everything there is to say, and repeating the instruction
               under it turns a finished row into one that still looks like work.
               It is also what makes a long list readable — the rows still owed
               are the tall ones.

   Both readings are grey. The finding is a record, not an alarm: the red tick
   already marks the row, and a second red thing beside it spends the screen's one
   loud colour twice on the same fact. Sagar's call.

   A part with no line at all is a row of one line rather than a row with an empty
   second one — an empty <p> would shift the name off the row's centre. */
function subLineHTML(part, cls){
  const c = cls || "row__note";
  if (part.status === "good") return "";
  if (part.status === "faulty" && part.reasons_selected.length)
    return `<p class="${c}">${esc(part.reasons_selected.join(", "))}</p>`;
  return part.note ? `<p class="${c}">${esc(part.note)}</p>` : "";
}

function collapsedHTML(part, index){
  return `<div class="item item--collapsed item--tappable"
        data-id="${part.id}" data-index="${index}">
      <div class="row">
        <div class="row__lhs">
          ${thumbHTML(part)}
          <div class="row__text">
            <p class="t-label-md row__label">${esc(part.name)}</p>
            ${subLineHTML(part)}
          </div>
        </div>
        <div class="row__status">${statusIcon(part.status)}</div>
      </div>
    </div>`;
}

/* An SVG frame rather than `border:3px dashed`, because CSS cannot express
   Figma's 4-on / 6-off dash. The 3px stroke sits inside, so the panel stays
   exactly the card's 342x344. */
function revealHTML(kind, label){
  return `<div class="reveal reveal--${kind}" data-reveal="${kind}">
      <svg class="reveal__frame" preserveAspectRatio="none" viewBox="0 0 342 344" aria-hidden="true">
        <rect x="1.5" y="1.5" width="339" height="341" rx="10.5" fill="none"
              stroke="currentColor" stroke-width="3" stroke-dasharray="4 6"/>
      </svg>
      <div class="reveal__body">${ICON.confirm}<p class="t-label-md">${esc(label)}</p></div>
    </div>`;
}

function expandedHTML(part){
  return `<div class="item item--expanded" data-id="${part.id}">
      <div class="swipe">
        ${revealHTML("good",   part.name + " marked good")}
        ${revealHTML("faulty", part.name + " marked Faulty")}
        <div class="card" data-card="${part.id}">
          <div class="card__head">
            <div class="card__headText">
              <p class="t-label-md700">${esc(part.name)}</p>
              ${subLineHTML(part, "card__note")}
            </div>
            ${mediaHTML(part)}
          </div>
          <div class="card__actions">
            <button class="btn-faulty${part.status === "faulty" ? " is-on" : ""}"
                    data-action="faulty" aria-pressed="${part.status === "faulty"}">
              <span class="btn-faulty__inner">
                <span class="btn-label">${ICON.faulty}<span class="t-label-md txt-negative">Faulty</span></span>
              </span>
            </button>
            <button class="btn-good${part.status === "good" ? " is-on" : ""}"
                    data-action="good" aria-pressed="${part.status === "good"}">
              <span class="btn-good__inner">
                <span class="btn-label">${ICON.good}<span class="t-label-md txt-positive">Good</span></span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function render(){
  listEl.innerHTML = PARTS
    .map((p,i) => i === activeIndex ? expandedHTML(p) : collapsedHTML(p,i))
    .join("");

  const done = PARTS.filter(p => p.status !== "pending").length;
  const finished = done === PARTS.length;
  document.getElementById("progressFill").style.width = (done / PARTS.length * 100) + "%";
  /* No disabled state to design: the footer simply does not exist until the
     checklist is finished, so Next is only ever reachable when it is valid. */
  /* It said "Mark penalty" for as long as Mark penalties was the only thing that
     could follow this screen. It is one of five steps now, so it names whichever
     is still outstanding — a QCA who has already done the penalties and comes
     back to re-swipe a part should be pointed forwards, not at a step behind
     them. See RnM.nextStepLabel. */
  paintStepTabs(document.getElementById("assessTabs"), "assess");
  /* The tab beside this one, when there is anything on it. The two are one step
     and the penalties are its second half — but with nothing faulty there is
     nothing to price, the Penalties tab is switched off (see steptabs.js), and a
     CTA still offering it would be a door through a wall the strip just built.
     In that case it names the next outstanding step, like every other screen. */
  if (finished) nextBtn.textContent = assessHasFaults() ? "Mark penalties" : stepLabel();
  paintStepBanner(document.getElementById("assessBanner"), "assess");
  assessFooter.classList.toggle("is-shown", finished);
  scrAssessEl.classList.toggle("has-footer", finished);

  bindCard();
}

/* Called by the router on arrival — see the note there. render() does the work;
   this is the name the router knows it by, alongside enterRnm, enterIssues and
   the rest. */
/* Anything to price. The Penalties tab, and this screen's CTA, both hang off it
   — one place, so they cannot disagree about whether that half of the step
   exists. */
const assessHasFaults = () => PARTS.some(p => p.status === "faulty");

function enterAssess(){ render(); }

/* The large heading hands its words to the app bar as it scrolls out. The
   threshold is measured off the heading itself rather than hard-coded, so it
   still holds if the type scale changes; the 16px lead-in means the swap lands
   just before the last of it clears the bar. */
const listHeadEl = document.getElementById("listhead");
const assessAppbar = document.getElementById("assessAppbar");

/* Nothing to hand over any more — the heading is gone (see the markup), so the
   bar simply carries the breadcrumb the whole time. It used to swap: the large
   title scrolled away and the bar picked its words up. With no title there is
   nothing to wait for, and a bar that stayed blank until you scrolled would
   leave the screen unnamed at the top, which is where you arrive. */
function syncListHeading(){
  assessAppbar.classList.add("is-collapsed");
  assessAppbar.querySelector(".appbar__suffix").setAttribute("aria-hidden", "false");
}
scrollEl.addEventListener("scroll", syncListHeading, {passive:true});

/* The card is the list item expanded in place, so it is only scrolled far enough
   to sit comfortably in view, clamping at either end of the list.

   A THIRD of the free space above it, not half. Dead-centre pushes the Faulty /
   Good buttons into the bottom third of the screen, which is a reach; sitting the
   card a little high puts the image at eye level and the buttons where the thumb
   already is. */
const REVEAL_BIAS = 1 / 3;

/* Scrolled by hand rather than with scrollTo({behavior:"smooth"}). The native
   smooth scroll picks its own duration and curve, so the page was still travelling
   after the card had finished growing — the two read as two movements. This runs
   on the morph's clock, so they are one.

   easeOutCubic is near enough the morph's cubic-bezier(.22,.61,.36,1) to be
   indistinguishable at 300ms; matching the bezier exactly would cost a solver for
   no visible gain. */
let revealRAF = 0, revealSnap = 0;
function scrollAssessTo(top, ms){
  cancelAnimationFrame(revealRAF);
  clearTimeout(revealSnap);
  const from = scrollEl.scrollTop, delta = top - from;
  if (!ms || Math.abs(delta) < 1){ scrollEl.scrollTop = top; return; }
  const t0 = performance.now();
  const step = now => {
    const t = Math.min(1, (now - t0) / ms);
    scrollEl.scrollTop = from + delta * (1 - Math.pow(1 - t, 3));
    if (t < 1) revealRAF = requestAnimationFrame(step);
  };
  revealRAF = requestAnimationFrame(step);
  /* Land it even if the frames never come. rAF is throttled to nothing in a
     backgrounded tab, and the cost of that is the card left stranded half-way up
     the list — so the destination is guaranteed, not merely animated towards. */
  revealSnap = setTimeout(() => { cancelAnimationFrame(revealRAF); scrollEl.scrollTop = top; }, ms + 80);
}

/* Hand the scroller back. The snap above is a promise to land somewhere, and it
   keeps that promise ms+80 later whatever else has happened in between — so if
   the mechanic takes over and scrolls, or anything else sets scrollTop, the snap
   would yank the list out from under them a third of a second later. Whoever
   takes the scroller calls this to cancel it. */
function cancelAssessScroll(){
  cancelAnimationFrame(revealRAF);
  clearTimeout(revealSnap);
}

/* A touch or a wheel on the list IS taking over. */
["pointerdown", "wheel", "touchstart"].forEach(ev =>
  scrollEl.addEventListener(ev, cancelAssessScroll, {passive:true}));

function revealActive(behavior){
  const el = listEl.querySelector(".item--expanded");
  if (!el) return;
  const target = el.offsetTop - (scrollEl.clientHeight - el.offsetHeight) * REVEAL_BIAS;
  const max = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
  const top = Math.min(Math.max(0, target), max);
  /* MORPH_MS is read at call time — morph.js loads after this file. */
  scrollAssessTo(top, behavior === "smooth" ? MORPH_MS : 0);
}

