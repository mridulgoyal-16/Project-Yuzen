/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN 0 — Start
   ═══════════════════════════════════════════════════════════════════════════ */
document.getElementById("startNow").addEventListener("click", () => goTo("assess"));
document.getElementById("watchVideo").addEventListener("click", () => toast("Walkthrough video — not supplied yet"));
/* The flow is entered from the Assessment listing, so every way out of it returns
   there rather than skipping to Home. */
document.getElementById("startClose").addEventListener("click", () => goTo("job"));

