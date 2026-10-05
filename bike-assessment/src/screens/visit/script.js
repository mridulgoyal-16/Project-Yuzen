/* ═══════════════════════════════════════════════════════════════════════════
   ONE REPAIR VISIT — a level under the Bike Info tab's repair history
   ═══════════════════════════════════════════════════════════════════════════
   Which visit, and what it is called. The label comes from the row that opened
   it rather than being recomputed here: the row already says "20 days ago" or
   "35 days earlier", and deriving the same words twice is how two screens end
   up disagreeing about the same repair.

   visitIndex is kept because the body, when it is briefed, will need to know
   WHICH repair — the label alone is a caption, not an identity.
   ═══════════════════════════════════════════════════════════════════════════ */
let visitIndex = 0;

function openRepairVisit(i, label){
  visitIndex = i;
  document.getElementById("visitWhen").textContent = label;
  document.getElementById("visitHead").textContent = label;
  goTo("visit");
}

/* The Bike Info tab, which is where it was opened from. The dashboard restores
   its own tab on entry, so there is nothing to put back. */
document.getElementById("visitBack").addEventListener("click", () => goTo("rnm"));
