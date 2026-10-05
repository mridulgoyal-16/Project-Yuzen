/* ═══════════════════════════════════════════════════════════════════════════
   THE STEP BANNER — Figma 2913:32071
   ═══════════════════════════════════════════════════════════════════════════
   A 36px strip above the CTA on every step screen, saying that the step you are
   standing on is finished: "Assessment checklist done", with a tick. The button
   under it is unchanged — it still names the NEXT outstanding step.

   The two halves answer different questions and that is why both are there. The
   button has always said where you are going; nothing said whether the thing in
   front of you was actually complete, and on a screen like the checklist — where
   the footer arrives silently once the last part is judged — the appearance of a
   button was the only confirmation a QCA got.

   ONE function, four screens, one rule: it shows when this screen's own step
   counts as done, which is the same stepDone the dashboard's ticks read. Worth
   knowing: two of the four steps are "done" as soon as they are VISITED — the
   fault record and the picker have no completion of their own (see ASSESS_FLOW)
   — so on those the banner is there the moment you arrive. That is consistent
   rather than wrong, but it is the case to look at first if this ever reads
   oddly.
   ═══════════════════════════════════════════════════════════════════════════ */
function paintStepBanner(el, stepId){
  /* Assessment only. The fault record serves the repair too, and a repair has no
     steps to be part-way through — its footer is about closing the task. */
  if (!el || !window.RnM || !RnM.isAssessment()){ if (el) el.hidden = true; return; }
  /* Filled on first use rather than written into four markup files, so the strip
     cannot come out different on one of them. */
  if (!el.firstElementChild){
    el.innerHTML = `<span class="stepbanner__t t-label-md"></span>`
                 + `<span class="stepbanner__tick" aria-hidden="true">${ICON.rowGood}</span>`;
  }
  const label = RnM.stepBanner(stepId);
  el.hidden = !label;
  if (label) el.querySelector(".stepbanner__t").textContent = label;
}
