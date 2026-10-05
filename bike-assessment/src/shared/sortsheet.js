/* ═══════════════════════════════════════════════════════════════════════════
   SORT SHEET — the listing's ordering control

   The component only. WHAT can be sorted is the listing's business, and this
   file names no sort and no queue: it is handed a list of options and the order
   the listing is already showing, and hands back the new one.

   ONE selection, committed on tap — the same contract the filter sheet settled
   on. The list behind re-orders as you tap and the way out is to slide the
   sheet down, so there is nothing left for an Apply to confirm.

   DIRECTION IS A CHIP, NOT A CYCLE — Figma 2982:1287. Every field offers both
   ways as their own chips, "High to low" and "Low to high", and one chip in the
   sheet is pressed at all times.

   It replaced a row that cycled its direction on repeat taps. Two reasons the
   frame is right. A cycle hides half the control: nothing on screen said a
   second tap would do anything, so the other direction had to be discovered.
   And an arrow cannot say which way "up" runs on a battery percentage — high to
   low is unambiguous where an up arrow is a guess.

   SINGLE SELECT ACROSS THE WHOLE SHEET, not one per group: a list has one order,
   so pressing a chip anywhere releases the chip that was pressed before it.

   THERE IS ALWAYS A SELECTION. The kind names a default — longest wait first
   for most queues — and it is pressed on arrival, because the list is already in
   that order and a sheet showing nothing pressed would have denied it. Reset is
   how you get back to it, and it is dead until you have left it.
   ═══════════════════════════════════════════════════════════════════════════ */
const srtScrim = document.getElementById("srtScrim");
const srtSheet = document.getElementById("srtSheet");
const srtBody  = document.getElementById("srtBody");
const srtReset = document.getElementById("srtReset");

/* High to low FIRST, as the frame orders them. It is the direction every queue
   already opens in, so the chip that is pressed on arrival is also the one the
   eye reaches first. */
const SRT_DIRS = [
  {dir:"desc", label:"High to low"},
  {dir:"asc",  label:"Low to high"},
];

let srtOpts     = [];
let srtCur      = null;   /* the listing's own choice — null while it is on the default */
let srtDef      = null;   /* the kind's default, pressed whenever srtCur is null */
let srtOnChange = null;

/* What is actually pressed: the choice if there is one, the default if not. */
const srtLive = () => srtCur || srtDef;

function renderSortSheet(){
  const live = srtLive();
  srtBody.innerHTML = srtOpts.map(o =>
    '<div class="flgroup" data-srtgroup="' + o.id + '">' +
      '<p class="flgroup__h">' + esc(o.label) + '</p>' +
      '<div class="flgroup__chips" role="group" aria-label="' + esc(o.label) + '">' +
        SRT_DIRS.map(d => {
          const on = !!live && live.id === o.id && live.dir === d.dir;
          return '<button class="qchip" type="button" data-srtopt="' + o.id + '"' +
                 ' data-dir="' + d.dir + '" aria-pressed="' + on + '"' +
                 /* The field is in the group's own label, so the chip only has to
                    carry the direction — "Wait time, High to low" is read out by
                    the group and the chip together. */
                 '>' + d.label + '</button>';
        }).join("") +
      '</div>' +
    '</div>').join("");
  /* Dead while the list is in the kind's default order — there is nothing to
     return to. Not "nothing selected": something always is. */
  srtReset.disabled = !srtCur;
}

/* Opened by the listing, which owns the options, the current order and the
   default that stands in for it. */
function openSortSheet(opts, current, onChange, fallback){
  srtOpts     = opts || [];
  srtCur      = current || null;
  srtDef      = fallback || null;
  srtOnChange = onChange || null;
  renderSortSheet();
  setSortSheet(true);
}

function setSortSheet(open){
  srtScrim.classList.toggle("is-open", open);
  srtSheet.classList.toggle("is-open", open);
  const btn = document.getElementById("qSortBtn");
  if (btn) btn.setAttribute("aria-expanded", String(open));
}

srtScrim.addEventListener("click", () => setSortSheet(false));

/* The chip is the action. Unlike the filter sheet this REDRAWS the body rather
   than updating the tapped node in place: the selection is single, so pressing
   one chip has to release another in a different group, and there is no scroll
   position to protect — a queue declares two or three fields, not forty chips.

   A PRESSED CHIP DOES NOT UNPRESS. Tapping the one that is already on is a
   no-op rather than a toggle: releasing it would leave the sheet with nothing
   pressed while the list stayed in that very order, which is the state this
   design exists to rule out. Reset is the way back. */
srtBody.addEventListener("click", e => {
  const chip = e.target.closest("[data-srtopt]");
  if (!chip) return;
  const pick = {id: chip.dataset.srtopt, dir: chip.dataset.dir};
  const live = srtLive();
  if (live && live.id === pick.id && live.dir === pick.dir) return;
  srtCur = pick;
  if (srtOnChange) srtOnChange(srtCur);
  renderSortSheet();
});

srtReset.addEventListener("click", () => {
  srtCur = null;
  if (srtOnChange) srtOnChange(null);
  renderSortSheet();
});

/* ── Slide it down to close ──────────────────────────────────────────────────
   The filter sheet's gesture, to the letter — see the long note at the foot of
   filtersheet.js for why the whole surface is the handle and why a real drag
   has to swallow the click that follows it. Kept as a copy rather than lifted
   into a helper because the two sheets differ in what they exclude (Reset here,
   Reset there) and a shared version would need a config object longer than the
   twenty lines it replaced. If a third sheet wants it, lift it then.
   ─────────────────────────────────────────────────────────────────────────── */
(() => {
  const ARM = 8;     /* travel before this is a drag and not a tap */
  const FAR = 60;    /* travel before letting go dismisses */
  let d = null, swallow = false;

  srtSheet.addEventListener("pointerdown", e => {
    if (e.target.closest("#srtReset")) return;
    if (e.target.closest("#srtBody") && srtBody.scrollTop > 0) return;
    d = {y0:e.clientY, dy:0, on:false, id:e.pointerId};
  });

  srtSheet.addEventListener("pointermove", e => {
    if (!d) return;
    const dy = e.clientY - d.y0;
    if (!d.on){
      if (dy < -ARM){ d = null; return; }
      if (dy < ARM) return;
      d.on = true;
      srtSheet.setPointerCapture(d.id);
      srtSheet.classList.add("sheet--dragging");
    }
    d.dy = Math.max(0, dy);
    srtSheet.style.transform = "translateY(" + d.dy + "px)";
  });

  const end = () => {
    if (!d) return;
    const {on, dy} = d; d = null;
    if (!on) return;                 /* never moved: it was a tap */
    swallow = true;                  /* …but this one did, so eat its click */
    srtSheet.classList.remove("sheet--dragging");
    srtSheet.style.transform = "";
    if (dy > FAR) setSortSheet(false);
  };
  srtSheet.addEventListener("pointerup", end);
  srtSheet.addEventListener("pointercancel", end);

  srtSheet.addEventListener("click", e => {
    if (!swallow) return;
    swallow = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
})();
