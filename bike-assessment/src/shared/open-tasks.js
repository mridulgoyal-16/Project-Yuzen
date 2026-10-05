/* ═══════════════════════════════════════════════════════════════════════════
   OPEN TASKS — the repair's three pieces of work, and what comes next

   The RnM dashboard lists three rows: the checklist, electrical issues,
   mechanical issues. Each has its own screen, and each screen used to end in a
   Done that returned to the dashboard — so finishing one meant going back to a
   list, reading it, and picking the next thing. Three times.

   This file is the one place that knows those three exist as a sequence. Both
   screens ask it the same two questions: is everything finished, and if not,
   where next. Neither has to know the other exists.

   The tallies are not copied here. Each screen owns its own records and exposes
   a tally function; this reads those live, so a number can never drift from the
   rows it counts.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Dashboard order — the sequence a mechanic is walked through is the sequence
   they were shown. Changing the rows there means changing this. */
const OPEN_TASKS = [
  {id:"checks", label:"Checklist",
   tally: () => checksTally(),
   open:  () => goTo("checks")},
  {id:"elec",   label:"Electrical issues",
   tally: () => issuesTallyBy("Electrical"),
   open:  () => { goTo("issues"); issuesShowSection("Electrical"); }},
  {id:"mech",   label:"Mechanical issues",
   tally: () => issuesTallyBy("Mechanical"),
   open:  () => { goTo("issues"); issuesShowSection("Mechanical"); }},
];

/* A task with nothing in it is finished, not pending: 0/0 is "nothing to do
   here", and stopping a mechanic on an empty list to tell them it is empty is
   the opposite of helping. */
const taskDone = t => { const x = t.tally(); return x.done >= x.total; };

/* The next unfinished task AFTER this one, wrapping — so finishing the middle
   one carries on to the last and then comes back for anything skipped, rather
   than dead-ending because the only thing left is behind you. */
function nextOpenTask(afterId){
  const i = OPEN_TASKS.findIndex(t => t.id === afterId);
  for (let n = 1; n <= OPEN_TASKS.length; n++){
    const t = OPEN_TASKS[(i + n) % OPEN_TASKS.length];
    if (!taskDone(t)) return t;
  }
  return null;
}

const allOpenTasksDone = () => OPEN_TASKS.every(taskDone);

/* What the primary CTA should say and do at the end of a task. "Done" only when
   the whole repair is closed — until then the honest word is Next, because there
   is more, and the button knows where. */
function endOfTaskCTA(taskId){
  const next = nextOpenTask(taskId);
  return next
    ? {label:"Next", go: next.open, next}
    : {label:"Done", go: () => goTo("rnm"), next:null};
}
