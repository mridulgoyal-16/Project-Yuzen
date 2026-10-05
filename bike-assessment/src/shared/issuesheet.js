/* ═══════════════════════════════════════════════════════════════════════════
   FAULT SHEET — the component

   Marking a part faulty asks what is wrong before it will take the verdict. The
   pattern is Barun's, from the mechanic's servicing checklist; the assessment
   checklist was rebuilt around it because the two are the same job — walk a list,
   judge each part, and say what is wrong with the ones that fail.

   In SHARED CHROME, not inside the assessment screen, for the same reason the ⋮
   sheet is: a sheet nested in an off-canvas screen renders off-canvas too, and
   every checklist is off-canvas until you open it.

   It names no part and no screen. openIssueSheet() is handed a part, a thumbnail
   and two callbacks, and hands back the reasons that were picked.

   ── Still owed ──────────────────────────────────────────────────────────────
   screens/checks draws this same sheet from its own markup and its own
   #scrChecks-scoped CSS. Moving it onto this component is the obvious next step
   and was deliberately NOT done in the same pass that rebuilt the assessment
   list — that screen is Barun's, it works, and putting a live screen through a
   refactor while the thing it is being refactored for is still settling is how
   both end up broken. Until then this is one component written twice, which is
   exactly the thing this codebase otherwise refuses to do.

   ── The Missing rule ────────────────────────────────────────────────────────
   Reasons multi-select among themselves; "Missing" is mutually exclusive with
   all of them, enforced by SWITCHING rather than by locking. Greying Missing out
   once a reason is picked is a dead end — someone who taps "Cut", then finds the
   part is simply gone, would have to clear every reason to reach it. So Missing
   always stays tappable and takes over when tapped, and the reasons are one tap
   away again. Same rule, no trap. Barun's reasoning, kept.
   ═══════════════════════════════════════════════════════════════════════════ */
const isScrim   = document.getElementById("isScrim");
const isSheet   = document.getElementById("isSheet");
const isChips   = document.getElementById("isChips");
const isThumb   = document.getElementById("isThumb");
const isNameEl  = document.getElementById("isName");
const isConfirm = document.getElementById("isConfirm");

/* {picked:Set, onConfirm, onCancel} while open, null otherwise. */
let isState = null;

function isPaint(){
  if (!isState) return;
  isChips.querySelectorAll(".issheet__chip").forEach(c => {
    const on = isState.picked.has(c.dataset.reason);
    c.classList.toggle("is-selected", on);
    c.setAttribute("aria-pressed", String(on));
  });
  isConfirm.disabled = isState.picked.size === 0;
}

/* `part` needs a name, a reasons list and whatever is already recorded against
   it; `thumb` is the caller's own 48px tile markup, because how a part is drawn
   belongs to the screen that owns the photographs, not to this sheet.

   onCancel fires when the sheet is dismissed without confirming. It matters: the
   sheet is opened by a press that has already animated the card away, so backing
   out has to put the card back — see cancelOutcome in the assessment screen. */
function openIssueSheet(part, thumb, onConfirm, onCancel){
  isState = {picked: new Set(part.reasons_selected || []), onConfirm, onCancel};

  isThumb.innerHTML = thumb || "";
  isNameEl.textContent = part.name;
  isChips.innerHTML = (part.reasons || []).concat(MISSING_REASON).map(r =>
    '<button type="button" class="issheet__chip" aria-pressed="false"' +
    ' data-reason="' + esc(r) + '">' + esc(r) + '</button>').join("");

  isPaint();
  isScrim.classList.add("is-open");
  isSheet.classList.add("is-open");
}

function setIssueSheet(open, committed){
  isScrim.classList.remove("is-open");
  isSheet.classList.remove("is-open");
  isSheet.style.transform = "";
  const s = isState;
  isState = null;
  if (!committed && s && s.onCancel) setTimeout(s.onCancel, 220);
}

isChips.addEventListener("click", e => {
  const chip = e.target.closest("[data-reason]");
  if (!chip || !isState) return;
  const v = chip.dataset.reason, picked = isState.picked;
  if (v === MISSING_REASON){
    isState.picked = picked.has(v) ? new Set() : new Set([v]);
  } else {
    picked.delete(MISSING_REASON);          /* a reason rules Missing out */
    picked.has(v) ? picked.delete(v) : picked.add(v);
  }
  isPaint();
});

isConfirm.addEventListener("click", () => {
  if (!isState) return;
  const {onConfirm, picked} = isState;
  const reasons = [...picked];
  setIssueSheet(false, true);
  /* After the sheet has left, not under it — the list behind is about to
     re-render and the movement should not happen through a closing sheet. */
  if (onConfirm) setTimeout(() => onConfirm(reasons), 220);
});

isScrim.addEventListener("click", () => setIssueSheet(false, false));

/* Drag the grabber down to dismiss, which counts as backing out. */
(() => {
  const zone = document.getElementById("isGrab");
  let d = null;
  zone.addEventListener("pointerdown", e => {
    d = {y0:e.clientY, dy:0};
    zone.setPointerCapture(e.pointerId);
    isSheet.classList.add("sheet--dragging");
  });
  zone.addEventListener("pointermove", e => {
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    isSheet.style.transform = "translateY(" + d.dy + "px)";
  });
  const end = () => {
    if (!d) return;
    const far = d.dy > 80; d = null;
    isSheet.classList.remove("sheet--dragging");
    if (far) setIssueSheet(false, false);
    else isSheet.style.transform = "translateY(0)";
  };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);
})();
