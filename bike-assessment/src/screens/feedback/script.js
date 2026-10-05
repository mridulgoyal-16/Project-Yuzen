
/* ═══════════════════════════════════════════════════════════════════════════
   FEEDBACK — Figma 1993:30144
   Read-only: what the rider recorded and what the captain wrote down. Nothing
   here is editable, so the only outbound action is Okay, which closes the
   Feedback step out and hands the task back.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Deterministic bar heights — a fixed pattern rather than random, so the
   waveform is the same in every screenshot. */
document.getElementById("fbWave").innerHTML =
  [3,7,4,9,5,11,6,13,5,10,4,8,6,12,7,9,4,11,5,7,3,9,6,12,4,8,5,10,3,7,4]
    .map(h => `<i style="height:${h}px"></i>`).join("");

document.getElementById("fbBack").addEventListener("click", () => goTo("job"));
document.getElementById("fbPlay").addEventListener("click",
  () => toast("Recording — no audio supplied yet"));
document.getElementById("fbRate").addEventListener("click",
  () => toast("Playback speed — not wired yet"));

/* Start Repair ticks the Feedback step and goes STRAIGHT to the dashboard rather
   than back through the task page. Reading the complaint and starting the repair
   are one intent, and the task page in between only existed to be tapped through.
   jobAt still advances, so backing out of the dashboard lands on a task list that
   agrees with where the mechanic actually is. The step stays tappable afterwards
   — see `revisit` in JOB_KINDS — because the feedback is what the rest of the
   repair is judged against, so it has to stay readable. */
document.getElementById("fbOkay").addEventListener("click", () => {
  if (jobKind === "repair" && jobAt === 0) jobAt = 1;
  goTo("rnm");
});
