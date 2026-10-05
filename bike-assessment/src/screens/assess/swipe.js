/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN 1 — SWIPE
   Right → good, left → faulty. Good commits straight away and the next pending
   part opens; faulty stops to ask what is wrong first — see flyOut. That asymmetry
   is the point of the sheet: a part is only ever recorded as faulty alongside the
   reason it failed.
   ═══════════════════════════════════════════════════════════════════════════ */
const COMMIT_RATIO   = 0.30;
const FLICK_VELOCITY = 0.65;
let drag = null;
let busy = false;

function bindCard(){
  const card = listEl.querySelector(".card");
  if (!card) return;
  card.addEventListener("pointerdown", onDown);
  card.querySelector('[data-action="good"]')
      .addEventListener("click", e => { e.stopPropagation(); if (!busy) flyOut("good"); });
  card.querySelector('[data-action="faulty"]')
      .addEventListener("click", e => { e.stopPropagation(); if (!busy) flyOut("faulty"); });
}

function paint(card, dx){
  const w   = card.offsetWidth;
  const rot = Math.max(-10, Math.min(10, dx * 0.045));
  card.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;
  const p = Math.min(1, Math.abs(dx) / (w * COMMIT_RATIO));
  const swipe = card.parentElement;
  swipe.querySelector('[data-reveal="good"]').style.opacity   = dx > 0 ? p : 0;
  swipe.querySelector('[data-reveal="faulty"]').style.opacity = dx < 0 ? p : 0;
}

function onDown(e){
  if (busy || e.button > 0) return;
  const card = e.currentTarget;
  card.classList.remove("card--settling");
  drag = {card, id:e.pointerId, x0:e.clientX, y0:e.clientY,
          dx:0, t:e.timeStamp, vx:0, axis:null};
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerup", onUp);
  card.addEventListener("pointercancel", onUp);
}

function onMove(e){
  if (!drag) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  /* Decide once whether this is a horizontal swipe or a vertical scroll, and
     only take pointer capture when it is definitely a swipe. */
  if (!drag.axis){
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (drag.axis === "y"){ endDrag(); return; }
    try { drag.card.setPointerCapture(drag.id); } catch (_) {}
  }
  const dt = Math.max(1, e.timeStamp - drag.t);
  drag.vx = (dx - drag.dx) / dt;
  drag.dx = dx; drag.t = e.timeStamp;
  paint(drag.card, dx);
}

function onUp(){
  if (!drag || drag.axis !== "x"){ endDrag(); return; }
  const {card, dx, vx} = drag;
  const past  = Math.abs(dx) >= card.offsetWidth * COMMIT_RATIO;
  const flick = Math.abs(vx) >= FLICK_VELOCITY && Math.abs(dx) > 24;
  endDrag();
  if (past || flick) flyOut(dx > 0 ? "good" : "faulty");
  else springBack(card);
}

function endDrag(){
  if (!drag) return;
  drag.card.removeEventListener("pointermove", onMove);
  drag.card.removeEventListener("pointerup", onUp);
  drag.card.removeEventListener("pointercancel", onUp);
  drag = null;
}

function springBack(card){
  card.classList.add("card--settling");
  card.style.transform = "translateX(0) rotate(0deg)";
  const swipe = card.parentElement;
  swipe.querySelectorAll(".reveal").forEach(r => r.style.opacity = 0);
  setTimeout(() => card.classList.remove("card--settling"), 320);
}

function flyOut(kind){
  const card = listEl.querySelector(".card");
  if (!card || busy) return;
  busy = true;

  const dir   = kind === "good" ? 1 : -1;
  const swipe = card.parentElement;
  swipe.querySelector(`[data-reveal="${kind}"]`).style.opacity = 1;
  swipe.querySelector(`[data-reveal="${kind === "good" ? "faulty" : "good"}"]`).style.opacity = 0;

  card.classList.remove("card--settling");
  card.classList.add("card--flying");
  card.style.transform = `translateX(${dir * (card.offsetWidth + 120)}px) rotate(${dir * 12}deg)`;
  card.style.opacity = "0";

  /* Long enough to read the confirmation, short enough not to cost ~10s
     across a 16-part list. */
  setTimeout(() => {
    /* Good is a complete answer on its own. Faulty is not — the sheet asks what
       is wrong before the verdict is taken, which is the mechanic's checklist
       pattern brought over. The card has already flown by this point, so backing
       out of the sheet has to put it back: that is cancelOutcome. */
    if (kind === "good") settle("good");
    else openIssueSheet(PARTS[activeIndex], thumbHTML(PARTS[activeIndex]),
                        reasons => settle("faulty", reasons),
                        cancelOutcome);
  }, 400);
}

/* Backing out of the sheet undoes the press that opened it. The part is left
   exactly as it was — pending if it had never been judged, or on its earlier call
   if this was a second look — and the card comes back rather than the list being
   left with a gap where a verdict should be. "Faulty, but I am not saying what"
   is not a state this screen holds. */
function cancelOutcome(){
  busy = false;
  render();
  revealActive();
}

/* Commit the outcome, collapse this item and open the next pending one. */
function settle(status, reasons){
  const part = PARTS[activeIndex];
  part.status = status;
  /* Cleared on good, so withdrawing a faulty call does not leave its reasons
     behind on a part that now reads good. */
  part.reasons_selected = status === "faulty" ? (reasons || []) : [];
  fileAssessmentFault(part);

  const next = PARTS.findIndex((p,i) => i > activeIndex && p.status === "pending");
  const target = next !== -1
    ? next
    : PARTS.findIndex(p => p.status === "pending");   /* wrap to any left behind */

  busy = false;
  /* Same morph as a tap: the part just judged shrinks back to its row while the
     next one grows out of its thumbnail. */
  setActivePart(target);                      /* reveals as part of the morph */
}

/* ── Filing a fault against the bike ──────────────────────────────────────────
   A mechanical part marked faulty here becomes a mechanical issue ON THE BIKE,
   in the same record the dashboard's Mechanical faults row counts and opens. It
   used to only be counted: the row added this checklist's faults to the bike's
   own, but tapping it opened a list that had never heard of them — the count and
   its destination disagreed. Filing them settles that; the row now counts exactly
   what the list contains.

   The pattern is the servicing checklist's, deliberately: one record seen from
   several screens rather than a copy per screen. Its two rules come with it —

     FILED    judging a part good withdraws only what THIS checklist filed. A
              faulty call is corrected by swiping the other way, and that must not
              also delete somebody else's report against the same part.
     reasons  an entry with reasons files or amends; an entry with none is a
              withdrawal. So the good case sends an empty list rather than
              nothing.

   EVERY faulty part is filed, whatever system it belongs to, and they all go to
   the MECHANICAL section. That looks wrong at a glance and is not: the two rows
   on the dashboard are not two systems, they are two ways of finding out. A
   person MARKS a fault; the bike DETECTS one — which is exactly what their
   sub-lines say, "x marked" against "x detected". Everything on this checklist is
   a QCA looking at the machine, so all of it is marked, including a headlight
   that does not come on.

   It was split by `part.system` for one build, which sent a faulty MCU to the
   Electrical row and made three quarters of this checklist file nothing at all —
   the first three parts on it are electrical, so a QCA swiping the top of the
   list saw Mechanical stay at 0. Sagar's correction, and the original brief's
   wording all along.

   Which leaves `part.system` with no reader. It is kept on the data because it
   is true of the parts and something will want it — a report grouped by system,
   most obviously — but nothing branches on it today.
   ─────────────────────────────────────────────────────────────────────────── */
const FILED_ASSESS = new Set();

function fileAssessmentFault(part){
  if (part.status === "faulty"){
    FILED_ASSESS.add(part.name);
    applyMarkedIssues([{
      name: part.name,
      reasons: (part.reasons_selected || []).slice(),
      catalogue: part.reasons.slice(),
      /* The picture and the rectangle of it this app shows. Both, because the
         renders are wide product shots and the tile is square: sending the URL
         alone left the Issues screen to `object-fit:cover` a 90x50 pigtail into a
         56px box, so the same part read as a different picture on the two lists.
         See cropStyle in shared/partrender.js. */
      photoSrc: partImageURL(part),
      crop: part.crop,
    }]);
  } else if (FILED_ASSESS.has(part.name)){
    FILED_ASSESS.delete(part.name);
    applyMarkedIssues([{name: part.name, reasons: []}]);
  }
}


/* Any row can be opened at any time — the flow suggests an order, it does not
   impose one. With the sheet gone, a part already judged simply becomes the open
   card again, its earlier call shown as the selected side, so a mis-swipe is
   corrected by swiping (or tapping) the other way. */
listEl.addEventListener("click", e => {
  if (busy || optSheet.classList.contains("is-open") || isSheet.classList.contains("is-open")) return;
  const row = e.target.closest("[data-index]");
  if (!row) return;
  setActivePart(Number(row.dataset.index));   /* reveals as part of the morph */
});

nextBtn.addEventListener("click", () => {
  /* The second tab of this step when it has anything on it, and the next
     outstanding step when it does not — see the note in
     screens/assess/script.js. The guard stays: the footer only exists once the
     checklist is finished, so a click arriving any other way should do nothing
     rather than skip the list. */
  if (!PARTS.every(p => p.status !== "pending")) return;
  if (assessHasFaults()) goTo("faults"); else RnM.advance();
});
/* Back to the dashboard, not the task page. This checklist is opened FROM the
   assessment dashboard — its Assessment checklist button and its Active checklist
   row are both routes in — so backing out of it has to land where it was opened
   from. It went to the task page, which skipped the screen in between and left
   the QCA two steps from where they had been.

   Same destination as Done on Mark penalties, deliberately: leaving this
   checklist and finishing it both put you back on the dashboard, and the step is
   closed from there. */
document.getElementById("assessBack").addEventListener("click", () => goTo("rnm"));
