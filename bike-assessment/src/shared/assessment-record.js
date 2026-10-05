/* ═══════════════════════════════════════════════════════════════════════════
   ONE ASSESSMENT AT A TIME — loading a finished one, and filing a new one
   ═══════════════════════════════════════════════════════════════════════════
   PARTS and the bike's fault record are single globals: one bike's assessment,
   held in the app rather than against a bike. That was fine while there was one
   bike. Assessment done gave the QCA five more, and opening one has to show what
   was found on THAT bike — so the working set is loaded from a record on the way
   in, and captured back into one on the way out.

   The reset half matters just as much and is the part that would have been
   missed: opening a finished bike and then a pending one used to leave the
   pending bike wearing the finished one's faults, because nothing ever put the
   globals back. Both queues go through here now.

   A record is {faults:[{part, reasons, penalty}]} and nothing else. The parts
   that came back good are not listed — they are every part not named — and the
   findings rows are not stored at all, because they are counted from the faults.
   Storing what can be derived is how two numbers about one bike start to
   disagree.

   ONE CONSTRAINT on a record: a fault must carry at least one reason. The fault
   sheet on the checklist enforces it, so nothing a QCA does can break it — but a
   hand-written record with `reasons: []` files a mark the issues screen reads as
   a WITHDRAWAL (that is how un-faulting a part works, see fileAssessmentFault),
   and the fault would vanish on load rather than fail loudly.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Every part back to untouched, and the bike's fault record with it. Called when
   a PENDING bike is opened, which is the only time the app should be starting
   from nothing. */
function resetAssessment(){
  /* The record has to be in the ASSESSMENT's shape before anything is filed into
     it. It ships holding two seeded reports — the repair's brief — and one of
     them is a Front wheel; filing a faulty front wheel while those are still in
     there AMENDS the seeded row instead of adding one, and the row is then
     withdrawn when the dashboard switches the record to assessment shape, taking
     the fault with it. Two of three faults would arrive. See prepareIssuesFor. */
  prepareIssuesFor("assessment");
  PARTS.forEach(p => {
    p.status = "pending";
    p.reasons_selected = [];
    p.penalty = null;
    p.photos = [];
    /* Through the same filer the checklist uses, so the issue rows this bike had
       are withdrawn rather than left behind on the next one. */
    fileAssessmentFault(p);
  });
  RnM.resetAssessFlow();
}

/* A finished assessment, put back on screen. Every part is judged — that is what
   finished means — and the faults named in the record carry their reasons and
   their penalty. */
function loadAssessment(rec){
  /* Assessment shape first — see the note in resetAssessment. */
  prepareIssuesFor("assessment");
  const faults = (rec.assessment && rec.assessment.faults) || [];
  PARTS.forEach(p => {
    const f = faults.find(x => x.part === p.name);
    p.status = f ? "faulty" : "good";
    p.reasons_selected = f ? f.reasons.slice() : [];
    p.penalty = f ? f.penalty : null;
    p.photos = [];
    fileAssessmentFault(p);
  });
  /* Visited, all five. A finished assessment has been all the way through by
     definition, and without this the dashboard would open on a bike it says is
     done with four hollow rings and a CTA offering to start it. */
  RnM.completeAssessFlow();
}

/* The other direction: what is on screen, as a record. Reasons and penalty are
   copied rather than referenced — the working set is about to be reset for the
   next bike, and a record holding live PARTS objects would empty itself. */
function captureAssessment(){
  return {faults: PARTS.filter(p => p.status === "faulty").map(p => ({
    part: p.name,
    reasons: (p.reasons_selected || []).slice(),
    penalty: p.penalty,
  }))};
}

/* Sign-off: the bike leaves Assessment pending and joins Assessment done. Called
   from the dashboard's Finish — see YuzenRnM.onDone.

   Idempotent, because a finished bike can be opened again and finished again:
   the second pass updates the record it already has rather than listing the bike
   twice. Splicing FLEET rather than flagging the bike is deliberate — the two
   home counts and the two queues all read the lengths of these arrays, so the
   move is one operation and nothing can show a bike in both places. */
/* The handover: assessed, and now walked to the Sr. Mechanic's bay for
   allocation. Same list, one flag further on — the bike stays on Assessment done
   and moves from its first accordion to its second. Set by the task page's last
   step, which IS the handover: "Drop in Repairable bike area". */
/* Stamped with the REAL clock, not the frame's painted 9:41. A bike transferred
   during a field test should say the time the tester actually did it — that is
   the whole use of the column — and the seeded records carry their own morning
   times so the two never have to agree. See doneAt in shared/fleets.js. */
function transferBike(id){
  const bike = DONE.find(b => b.id === id);
  if (!bike) return;
  bike.transferred = true;
  const now = new Date();
  bike.doneAt = now.getHours() * 60 + now.getMinutes();
  /* INVENTED, like the seeded ones. The app does not time a task — nothing
     starts a clock when a QCA opens a bike — so a transfer made during a test
     gets a plausible figure rather than a measured one. Flagged here because a
     banner reading "41m spent" looks measured, and it is not. */
  if (bike.spentMins == null) bike.spentMins = 8;
}

function completeAssessment(id){
  const rec = captureAssessment();
  const already = DONE.find(b => b.id === id);
  if (already){ already.assessment = rec; already.waitMins = 0; return; }
  const at = FLEET.findIndex(b => b.id === id);
  if (at === -1) return;
  const [bike] = FLEET.splice(at, 1);
  DONE.unshift({...bike, waitMins: 0, assessment: rec});
}
