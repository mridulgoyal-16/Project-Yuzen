/* ═══════════════════════════════════════════════════════════════════════════
   Options sheet (⋮) — Figma 2186:22468
   One sheet, four screens. It used to be nested inside the Assessment screen,
   which meant only that screen could show it: a sheet inside an off-canvas
   screen renders off-canvas too. It now sits in shared chrome beside the toast
   and the camera input, and its rows are built per screen on open.

   This file is the COMPONENT only — open, close, drag-to-dismiss, and turning a
   list of option keys into rows. What those options are, and which screen gets
   which, lives entirely in shared/sheet-config.js. Nothing here names a screen.
   ═══════════════════════════════════════════════════════════════════════════ */
const optScrim = document.getElementById("optScrim");
const optSheet = document.getElementById("optSheet");
const optList  = document.getElementById("optList");

/* Reads the catalogue and the per-screen map from sheet-config.js. An unknown
   screen gets an empty list rather than a broken one. */
function renderOptSheet(){
  /* A screen's list may be a function, because one screen can be two screens:
     the RnM dashboard serves the repair and the assessment and they do not offer
     the same things. Everything else is still a plain array. */
  const forThis = SHEET_FOR[current];
  optList.innerHTML = ((typeof forThis === "function" ? forThis() : forThis) || []).map(k => {
    const it = SHEET_ITEMS[k];
    return `<button class="sheet__opt" data-opt="${k}">
      ${it.icon}
      <span class="lbl t-label-md">${it.label}</span>
      ${it.chevron ? ICON.sheetChevron : ""}
    </button>`;
  }).join("");
}

/* Every ⋮ in the app opens the same sheet — a screen adds one by marking its
   button [data-opt-more]. */
const optMores = [...document.querySelectorAll("[data-opt-more]")];

function setOptSheet(open){
  if (open) renderOptSheet();       /* built on open, so it always fits the screen */
  optScrim.classList.toggle("is-open", open);
  optSheet.classList.toggle("is-open", open);
  optMores.forEach(b => b.setAttribute("aria-expanded", String(open)));
}
optMores.forEach(b => b.addEventListener("click",
  () => setOptSheet(!optSheet.classList.contains("is-open"))));
optScrim.addEventListener("click", () => setOptSheet(false));

optSheet.addEventListener("click", e => {
  const opt = e.target.closest("[data-opt]");
  if (!opt) return;
  setOptSheet(false);
  /* Per-screen behaviour first — see SHEET_ACTIONS in sheet-config.js. Nothing
     here knows which screen it is on; it asks the table and falls through. */
  const override = (SHEET_ACTIONS[current] || {})[opt.dataset.opt];
  if (override){ setTimeout(override, 200); return; }
  if (opt.dataset.opt === "minimise"){
    /* Park the task on its own listing — see shared/minitask.js. */
    setTimeout(minimiseTask, 200);
    return;
  }
  if (opt.dataset.opt === "discard"){
    setTimeout(discardTask, 200);
    return;
  }
  if (opt.dataset.opt === "commands"){
    /* Raise the persistent sheet — see shared/commands.js. It is not modal and
       does not belong to this screen: it stays up while the mechanic carries on
       working, and across navigation, until they slide it away. */
    setTimeout(() => setCommandsSheet(true), 200);
    return;
  }
  /* The rest lead somewhere that does not exist yet. */
  setTimeout(() => toast(SHEET_ITEMS[opt.dataset.opt].label + " — not wired yet"), 200);
});

/* Drag the grabber down to dismiss. */
(() => {
  const zone = document.getElementById("optGrab");
  let d = null;
  zone.addEventListener("pointerdown", e => {
    d = {y0:e.clientY, dy:0};
    zone.setPointerCapture(e.pointerId);
    optSheet.classList.add("sheet--dragging");
  });
  zone.addEventListener("pointermove", e => {
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    optSheet.style.transform = `translateY(${d.dy}px)`;
  });
  const end = () => {
    if (!d) return;
    const far = d.dy > 60; d = null;
    optSheet.classList.remove("sheet--dragging");
    optSheet.style.transform = "";
    if (far) setOptSheet(false);
  };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);
})();
