/* ═══════════════════════════════════════════════════════════════════════════
   FILTER SHEET — Figma 2872:22873

   The component only. What the groups are is the listing's business, and this
   file names no filter and no queue: it is handed a list of groups, and edits the
   selection the listing is already showing.

   ONE selection, not two. There was a draft and an Apply to commit it — the same
   contract the shift page's Update has — and the sheet lost both: a chip is the
   action now, the list behind the sheet changes as you tap, and the way out is to
   slide the sheet down. So there is nothing left for an Apply to confirm.

   That makes the sheet behave exactly like the quick chips in the listing row,
   which always committed on tap. Two controls doing the same thing two different
   ways was the part worth removing.

   The one button left is Reset, and its rule is now literally true: it is enabled
   once a filter is applied, because applied is the only state there is. It clears
   immediately, like everything else here.
   ═══════════════════════════════════════════════════════════════════════════ */
const fltScrim = document.getElementById("fltScrim");
const fltSheet = document.getElementById("fltSheet");
const fltBody  = document.getElementById("fltBody");
const fltReset = document.getElementById("fltReset");

let fltGroups = [];

const fltPicked = (sel, gid) => sel[gid] || [];
const fltAny    = sel => Object.values(sel).some(v => v.length);

function renderFilterSheet(){
  const sel = queueFilters();
  fltBody.innerHTML = fltGroups.map(g =>
    '<div class="flgroup" data-flgroup="' + g.id + '">' +
      '<p class="flgroup__h">' + g.label + '</p>' +
      '<div class="flgroup__chips" role="group" aria-label="' + g.label + '">' +
        g.chips.map(c =>
          '<button class="qchip" type="button" data-flchip="' + c.id + '"' +
          ' aria-pressed="' + fltPicked(sel, g.id).includes(c.id) + '">' +
          (c.dot ? '<span class="qdot" aria-hidden="true"></span>' : "") +
          c.label + '</button>').join("") +
      '</div>' +
    '</div>').join("");
  fltSyncButtons();
}

function fltSyncButtons(){
  fltReset.disabled = !fltAny(queueFilters());
}

/* Opened by the listing, which owns the groups. There is nothing to seed any
   more — the sheet reads the live selection every time it draws. */
function openFilterSheet(groups){
  fltGroups = groups || [];
  renderFilterSheet();
  setFilterSheet(true);
}

/* Called by the listing after it commits, so a quick chip tapped in the row while
   the sheet is up leaves the sheet's copy of that chip pressed. Only redraws when
   the sheet is actually open, and never during the sheet's own tap — that one
   updates the button it was given and would otherwise lose its scroll. */
let fltPainting = false;
function fltSyncOpen(){
  if (fltPainting || !fltSheet.classList.contains("is-open")) return;
  renderFilterSheet();
}

function setFilterSheet(open){
  fltScrim.classList.toggle("is-open", open);
  fltSheet.classList.toggle("is-open", open);
  const btn = document.getElementById("qFilterBtn");
  if (btn) btn.setAttribute("aria-expanded", String(open));
}

fltScrim.addEventListener("click", () => setFilterSheet(false));

/* The chip is the action. The tapped button is updated in place rather than the
   body being redrawn — a redraw would throw away the sheet's scroll position
   mid-tap, on the one screen where the mechanic is working down a long list of
   chips. The listing behind re-renders either way. */
fltBody.addEventListener("click", e => {
  const chip = e.target.closest("[data-flchip]");
  if (!chip) return;
  const gid = chip.closest("[data-flgroup]").dataset.flgroup;
  const id  = chip.dataset.flchip;
  const sel = {...queueFilters()};
  const on  = fltPicked(sel, gid);
  sel[gid] = on.includes(id) ? on.filter(x => x !== id) : on.concat([id]);
  fltPainting = true;
  applyQueueFilters(sel);
  fltPainting = false;
  chip.setAttribute("aria-pressed", String(sel[gid].includes(id)));
  fltSyncButtons();
});

/* Clears everything, at once. It used to clear a draft and wait for Apply; with
   the draft gone there is nothing to wait for, and a Reset that needed confirming
   while every chip beside it did not would be the odd one out. */
fltReset.addEventListener("click", () => {
  fltPainting = true;
  applyQueueFilters({});
  fltPainting = false;
  renderFilterSheet();
});

/* ── Slide it down to close ──────────────────────────────────────────────────
   The only way out, now that there is no Apply. So the handle is the WHOLE
   sheet, not just the title row: a mechanic reaching to push it away puts their
   thumb wherever the sheet is, and a sheet that only answers along one 48px strip
   reads as broken rather than as particular. The scrim still closes it too.

   Three things have to keep working while the whole surface is a handle:

     the chips     a tap must still be a tap. So a press only ARMS the drag —
                   nothing moves until the finger has travelled 8px — and the
                   click that follows a real drag is swallowed once, or letting go
                   over a chip would toggle the filter you were trying to dismiss.
     Reset         excluded outright: it is a button, and a press on it is never
                   the start of a gesture.
     the body      it scrolls when a queue declares enough groups. A drag that
                   began mid-scroll would fight the scroller, so the sheet only
                   takes the gesture when the body is already at its top — the
                   ordinary rule for a scrollable sheet.
   ─────────────────────────────────────────────────────────────────────────── */
(() => {
  const ARM = 8;     /* travel before this is a drag and not a tap */
  const FAR = 60;    /* travel before letting go dismisses */
  let d = null, swallow = false;

  fltSheet.addEventListener("pointerdown", e => {
    if (e.target.closest("#fltReset")) return;
    if (e.target.closest("#fltBody") && fltBody.scrollTop > 0) return;
    d = {y0:e.clientY, dy:0, on:false, id:e.pointerId};
  });

  fltSheet.addEventListener("pointermove", e => {
    if (!d) return;
    const dy = e.clientY - d.y0;
    if (!d.on){
      /* Upward travel is not this gesture — let it go rather than holding the
         pointer hostage in case the body wants to scroll. */
      if (dy < -ARM){ d = null; return; }
      if (dy < ARM) return;
      d.on = true;
      fltSheet.setPointerCapture(d.id);
      fltSheet.classList.add("sheet--dragging");
    }
    d.dy = Math.max(0, dy);
    fltSheet.style.transform = "translateY(" + d.dy + "px)";
  });

  const end = () => {
    if (!d) return;
    const {on, dy} = d; d = null;
    if (!on) return;                 /* never moved: it was a tap */
    swallow = true;                  /* …but this one did, so eat its click */
    fltSheet.classList.remove("sheet--dragging");
    fltSheet.style.transform = "";
    if (dy > FAR) setFilterSheet(false);
  };
  fltSheet.addEventListener("pointerup", end);
  fltSheet.addEventListener("pointercancel", end);

  /* Capture phase, so it runs before the chip handler rather than after it. */
  fltSheet.addEventListener("click", e => {
    if (!swallow) return;
    swallow = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
})();
