/* ═══════════════════════════════════════════════════════════════════════════
   TASK DETAIL — the template

   One page draws every task in the app. It reads shared/task-kinds.js and knows
   nothing else: no kind is named in this file, and no step is special-cased. The
   token detail page used to be a second copy of all of this — the collapse, the
   docked progress strip, the measured scroll tail, the stepper — which is
   exactly the pair that drifts. It is gone; `token` is a kind now.

   The page is fixed in five parts, in this order down the screen:
     1  bar          ✕ until the task is touched, then a chevron that parks it.
                     ⋮ always, its contents per screen (shared/sheet-config.js).
     2  hero         the task number as a backdrop, and art for the sub-task.
     3  second head  task name, task context, % of the whole task done.
                     Scrolled past, it merges into the bar.
     4  steps        active / upcoming / finished. Finished stays reopenable.
                     A sub-heading appears on the active step ONLY.
     5  footer       one CTA, in the context of the active step.
   ═══════════════════════════════════════════════════════════════════════════ */

let jobKind = "assessment";
const jobDef   = () => TASK_KINDS[jobKind];
/* Tabs, if the kind has them, are just several step lists. Everything below
   reads jobSteps() and never asks which of the two shapes it came from. */
const jobTabs  = () => jobDef().tabs || null;
const jobTabDef = () => (jobTabs() || []).find(t => t.id === jobTab) || (jobTabs() || [])[0];
/* EITHER SHAPE. A kind's step list may be an array or a function returning one:
   the assessment's depends on the bike in hand — a dead one gets a revive step in
   front of the rest — and nothing downstream should have to ask which it got. */
const jobStepList = v => (typeof v === "function" ? v() : v) || [];
const jobSteps = () => jobStepList(jobTabs() ? (jobTabDef() || {}).steps : jobDef().steps);

let jobAt  = 0;                /* index of the active step */
/* READ-ONLY. A bike the QCA has already transferred opens as a RECORD of the
   task, not as the task: every step ticked, no button, and the footer carrying
   when it was finished and how long it took. Nothing on the page advances,
   because there is nothing left to advance — the bike is in the yard. */
let jobDoneBike = null;
let jobTab = null;             /* id of the open tab, for kinds that have them */
/* Per tab, because switching tab switches the work. Coming back to Service
   should find it where it was left, not reset because Puncture was looked at.
   Keyed kind:tab, so two kinds with a tab of the same name do not share a slot. */
const jobAtByTab = {};

let tasksDoneToday = 4;        /* so the first bike of the session is Task #5 */

/* Resolve a field that a kind may give either as a value or as a function of
   current state. The token's title is its customer's name and changes per token;
   the assessment's is a constant. Both are just `title`. */
const jobVal = (v, fallback) =>
  (typeof v === "function" ? v() : v !== undefined ? v : fallback);

const jbCloseEl = document.getElementById("jbClose");
/* Spelled out rather than captured from the DOM at load. The build ships the
   PRE-RENDERED document, so reading innerHTML here would read back whatever the
   last render left in the button — which is the ✕ today only because build-time
   state is always a fresh task, and would silently become the chevron the day
   that stopped being true. */
const CLOSE_GLYPH = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 13.0537L6.927 18.127C6.7885 18.2653 6.61442 18.3362 6.40475 18.3395C6.19525 18.3427 6.018 18.2718 5.873 18.127C5.72817 17.982 5.65575 17.8063 5.65575 17.6C5.65575 17.3937 5.72817 17.218 5.873 17.073L10.9462 12L5.873 6.927C5.73467 6.7885 5.66383 6.61442 5.6605 6.40475C5.65733 6.19525 5.72817 6.018 5.873 5.873C6.018 5.72817 6.19367 5.65575 6.4 5.65575C6.60633 5.65575 6.782 5.72817 6.927 5.873L12 10.9462L17.073 5.873C17.2115 5.73467 17.3856 5.66383 17.5953 5.6605C17.8048 5.65733 17.982 5.72817 18.127 5.873C18.2718 6.018 18.3443 6.19367 18.3443 6.4C18.3443 6.60633 18.2718 6.782 18.127 6.927L13.0538 12L18.127 17.073C18.2653 17.2115 18.3362 17.3856 18.3395 17.5953C18.3427 17.8048 18.2718 17.982 18.127 18.127C17.982 18.2718 17.8063 18.3443 17.6 18.3443C17.3937 18.3443 17.218 18.2718 17.073 18.127L12 13.0537Z" fill="currentColor"/></svg>`;

/* Any progress at all on the task in hand. Past the first step counts, and so
   does a single swipe on the assessment checklist, which happens while jobAt is
   still 0 — the checklist IS step 0, so its own progress is the job's. */
/* WHERE THE TASK ACTUALLY BEGINS. Normally step 0 — but a dead bike is given a
   revive step in front of the rest, and that one is not the task: it is hooking
   a bike to a charger and waiting on it. So the first REAL step is the one after
   it, and everything that asks "has this begun" has to measure from there. */
const jobFirstStep = () => {
  const steps = jobSteps();
  return steps.length && steps[0].id === "revive" ? 1 : 0;
};

/* WHERE A FRESHLY OPENED TASK LANDS. The first step, normally — but a bike that
   has already been through its revival opens PAST it, ticked, because asking a
   QCA to revive a bike that is awake and on the board is asking them to redo the
   thing they just did. The steps are kept either way, so the task still reads as
   one job start to finish.

   Called by the listing on every open; see QUEUE_KINDS.task.open. */
function jobEntryStep(){
  const steps = jobSteps();
  if (steps.length && steps[0].id === "revive"){
    const rec = typeof FLEET !== "undefined" && FLEET.find(b => b.id === BIKE.id);
    if (rec && rec.revived && !onRevival(BIKE.id)) return 1;
  }
  return 0;
}

/* Whether a named step is behind us. By ID, not by index: the assessment's steps
   shift down by one on a bike that needed reviving, and a phase keyed on `jobAt
   > 1` then measures whichever step happens to be second. */
const jobPast = id => {
  const i = jobSteps().findIndex(s => s.id === id);
  return i >= 0 && jobAt > i;
};

/* Any progress at all on the task in hand. Past the first real step counts, and
   so does a single swipe on the assessment checklist, which happens while jobAt
   is still on it — the checklist IS that step, so its own progress is the job's.

   A REVIVAL IS NOT A START. The bike has been woken and handed back to the
   board; the QCA has not committed to assessing it, and the slide on the
   dashboard step is where they do. Until then the corner button closes rather
   than parks, and backing out leaves nothing behind — see the note on the slide
   in renderJob. */
const jobStarted = () =>
  jobAt > jobFirstStep() || (jobKind === "assessment" && assessProgress().judged > 0);

/* The revive step's button, in whichever of its three states it is in.

   IT DOES NOT LEAVE. The QCA can walk away — the bike is on the board with a
   clock on it either way — but the page stays put so the sequence reads:
   press, watch it say it is waiting, come back to Finish revival. An automatic
   exit made the button feel like it had failed.

   NOT PARKED, either. Minimize holds the dock's one slot because a parked
   assessment is still the mechanic's — one bike in hand at a time. A revival is
   nobody's while it runs, so three can be on charge while an assessment is
   parked, which is the whole point of the stack. */
function runRevivalStep(i){
  const id = BIKE.id;

  /* Reported in: this press is the QCA taking it off charge. THE ONLY ONE OF THE
     THREE THAT ENDS THE STEP — the bike joins the bikes waiting to be assessed
     and the page moves to the dashboard step, which they can take now or leave
     for later like any other bike. */
  if (isRevived(id)){
    completeRevival(id);
    jobAt = Math.max(jobAt, i + 1);
    renderJob();
    toast(id + " is ready to assess");
    return true;
  }

  /* Still listening. Nothing a press can do; the footer is disabled and this is
     only reachable by tapping the step row itself. */
  if (isReviving(id)) return true;

  /* On the charger. THE SIGNAL IS THE BIKE'S — beginRevival's timer stands in
     for a message that in the real system arrives when the IoT comes back up. */
  beginRevival(id);
  renderJob();
  toast("Revival started · " + id + " is on charge");
  return true;
}

function jobProgress(){
  const ph = jobDef().progress;
  /* Kinds with no weighted phases share the bar equally between their steps.
     Flagged in the README: equal shares are a placeholder, not a claim that the
     steps cost the same. */
  if (!ph){
    const n = jobSteps().length;
    return n ? Math.round(100 * Math.min(jobAt, n) / n) : 0;
  }
  return Math.round(ph.reduce(
    (sum, p) => sum + p.pct * Math.min(1, Math.max(0, p.of() || 0)), 0));
}

const jbStepsEl  = document.getElementById("jbSteps");
const jbNoEl     = document.getElementById("jbNo");
const jbArtEl    = document.getElementById("jbArt");
const jbTabsWrap = document.getElementById("jbTabsWrap");
const jbTabsEl   = document.getElementById("jbTabs");
const jbUnderline = document.getElementById("jbTabsUnderline");

/* Progress on the assessment step, read from the flow's own state rather than
   tracked separately — there is one source of truth for what has been judged. */
function assessProgress(){
  const judged = PARTS.filter(p => p.status !== "pending").length;
  const faults = PARTS.filter(p => p.status === "faulty").length;
  return {judged, faults, total: PARTS.length};
}

/* The two sub-tasks the Assessment checklist step is made of, each with its own
   count. Order is the order they are done in, so the first one that is not
   finished is the one the mechanic is on.

   There were three. "Take bike pictures 0/4" went with the Bike photos screen —
   see archive/README.md.

   DORMANT: nothing calls this. It fed the assessment step's sub-heading, which is
   off for now — see jobStepSub() below, which carries the four lines that bring
   it back. Kept rather than deleted because "for now" is what was asked, and
   labelled rather than left to be found. */
function assessSubtasks(){
  const total    = PARTS.length;
  const judged   = PARTS.filter(p => p.status !== "pending").length;
  const f        = faultyParts();
  const detailed = f.filter(isDetailed).length;
  const swept    = judged === total;
  return [
    {id:"parts",  label:`Assess bike parts ${judged}/${total} done`, done: swept},
    /* A clean bike has nothing to mark; say so rather than showing 0/0. */
    {id:"faults", done: swept && detailed === f.length,
     label: swept && !f.length ? "Marking faults — none found"
                               : `Marking faults ${detailed}/${f.length} done`},
  ];
}

/* The active step's sub-heading: whatever the step itself declares, and nothing
   computed. Shown on the ACTIVE step and nowhere else — a finished step's
   sub-heading is a count that has stopped moving, which reads as a thing still to
   do.

   The assessment step used to compute one from assessSubtasks() — "Assess bike
   parts 2/17 done", then "Marking faults 1/1 done" — and Sagar has taken it off
   for now. The mechanism is untouched: the token flow's Handover step still
   declares a fixed `sub`, and putting the assessment's back is the four lines
   below plus a caller for assessSubtasks(), which is kept for that reason.

     if (step.id === "assessment" && jobKind === "assessment"){
       if (!assessProgress().judged) return "";
       const subs = assessSubtasks();
       return (subs.find(s => !s.done) || subs[subs.length - 1]).label;
     }
*/
function jobStepSub(step){
  return step.sub || "";
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
function buildJobTabs(){
  /* Idempotent: the build ships the PRE-RENDERED DOM, so this runs once in
     headless Chrome and again in the browser. Seventh screen to need this
     guard; without the clear the strip ends up doubled. */
  jbTabsEl.querySelectorAll(".jb__tab").forEach(t => t.remove());
  (jobTabs() || []).forEach(t => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "jb__tab";
    b.setAttribute("role", "tab");
    b.dataset.jbtab = t.id;
    b.textContent = t.label;
    jbTabsEl.insertBefore(b, jbUnderline);
  });
}

function moveJobUnderline(){
  const on = jbTabsEl.querySelector(".jb__tab.is-active");
  if (!on) return;
  jbUnderline.style.width = on.offsetWidth + "px";
  jbUnderline.style.transform = `translateX(${on.offsetLeft}px)`;
}

jbTabsEl.addEventListener("click", e => {
  const b = e.target.closest("[data-jbtab]");
  if (!b || b.dataset.jbtab === jobTab) return;
  jobAtByTab[jobKind + ":" + jobTab] = jobAt;   /* park this tab's place */
  jobTab = b.dataset.jbtab;
  jobAt  = jobAtByTab[jobKind + ":" + jobTab] || 0;
  if (navigator.vibrate) navigator.vibrate(10);
  renderJob();
});

/* ── Render ───────────────────────────────────────────────────────────────── */
function renderJob(){
  const def = jobDef();

  jbNoEl.textContent = `Task #${tasksDoneToday + 1}`;
  document.querySelectorAll("[data-job-title]").forEach(
    el => el.textContent = jobVal(def.title, ""));
  document.querySelectorAll("[data-job-sub]").forEach(
    el => el.textContent = jobVal(def.sub, ""));

  /* ✕ becomes a downward chevron the moment the task has been worked on. A task
     in hand cannot be closed — the only way out is to park it — and the arrow is
     what says so. Same action the ⋮ sheet's Minimize offers, reached from the
     corner the mechanic's thumb is already on. Written on every render because
     the very first swipe on the checklist is what changes it. */
  /* ✕, never the park chevron, on a record. jobStarted() is true here — the
     working set is a finished assessment — but there is nothing to park: the
     bike left the QCA's hands hours ago and the only way out is to close. */
  const live = jobStarted() && !jobDoneBike;
  jbCloseEl.innerHTML = live ? ICON.chevronDown : CLOSE_GLYPH;
  jbCloseEl.setAttribute("aria-label", live ? "Minimise task" : "Close");
  /* And the ⋮ goes dead. Its sheet offers Minimise and Finish — both actions on
     a task in hand, and this is a record of one that ended hours ago. A menu
     that opens onto two things you cannot do is worse than no menu. */
  const more = document.getElementById("jbMore");
  more.disabled = !!jobDoneBike;
  more.hidden   = !!jobDoneBike;

  /* Tabs */
  const tabs = jobTabs();
  jbTabsWrap.hidden = !tabs;
  if (tabs){
    jbTabsEl.querySelectorAll(".jb__tab").forEach(b => {
      const on = b.dataset.jbtab === jobTab;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    moveJobUnderline();
  }

  const steps = jobSteps();
  /* On a finished record there is no active step — every one of them is behind
     you — so `active` is deliberately undefined and jobAt sits past the end. */
  const active = steps[jobAt];
  const record = !!jobDoneBike;

  /* The hero follows the sub-task in hand, falling back to the task's own art
     once there is no active step left. */
  jbArtEl.style.backgroundImage =
    `var(${(active && active.art) || def.art || "--img-bike"})`;

  jbStepsEl.innerHTML = steps.length
    ? steps.map((step, i) => {
        const done   = record || i < jobAt;
        const isNow  = !record && i === jobAt;
        const cls = ["jb__step", done ? "is-done" : "", isNow ? "is-active" : ""]
                     .filter(Boolean).join(" ");
        const dot = done ? ICON.rowGood : `<i></i>`;
        /* Active only. See jobStepSub(). */
        const sub = isNow ? jobStepSub(step) : "";
        return `
          <button class="${cls}" data-jbstep="${step.id}" ${done || isNow ? "" : "disabled"}>
            <span class="dot">${dot}</span>
            <span class="body">
              <span class="top">
                <!-- Numbered. The dots and the rail say these run in an order;
                     the number says WHICH one you are on without counting down
                     the list. Written into the label rather than as a list
                     marker, because the row is a <button> and a real <ol> would
                     put the count outside the thing that is tappable. -->
                <span class="lbl t-label-md">${i + 1}. ${step.label}</span>
              </span>
              ${sub ? `<span class="prog t-label-sm">${sub}</span>` : ""}
            </span>
          </button>`;
      }).join("")
    : `<p class="jb__empty t-heading-sm">${(jobTabDef() || {}).soon || "Coming soon"}</p>`;

  /* Rail spans dot-centre to dot-centre, so it is measured, not guessed. */
  const dots = [...jbStepsEl.querySelectorAll(".dot")];
  let rail = jbStepsEl.querySelector(".jb__rail");
  if (!rail){ rail = document.createElement("div"); rail.className = "jb__rail"; jbStepsEl.prepend(rail); }
  rail.style.display = dots.length > 1 ? "" : "none";
  if (dots.length > 1){
    const base = jbStepsEl.getBoundingClientRect().top;
    const a = dots[0].getBoundingClientRect(), b = dots[dots.length - 1].getBoundingClientRect();
    rail.style.top = (a.top - base + 12) + "px";
    rail.style.height = (b.top - a.top) + "px";
  }

  /* The footer is the active step's button. A step can name its own label;
     otherwise the step's label is the button. The assessment's first step is the
     one exception, because its wording depends on whether it has been begun. */
  /* A record shows its two figures where the button would be, and the button
     goes away entirely — a disabled "Task complete" is still a control, and a
     control on a page with nothing to do invites the tap it will refuse. */
  const doneEl = document.getElementById("jbDone");
  const cta = document.getElementById("jbStart");
  doneEl.hidden = !record;
  cta.hidden = record;
  if (record){
    document.getElementById("jbDoneAt").textContent =
      jobDoneBike.doneAt == null ? "—" : fmtClock(jobDoneBike.doneAt);
    document.getElementById("jbDoneFor").textContent =
      jobDoneBike.spentMins == null ? "—" : fmtWait(jobDoneBike.spentMins);
  }
  /* THE SLIDE ALWAYS SAYS START TASK. It is the one press that commits a
     mechanic to a bike, and it is the same press whatever the first step
     happens to be called — the repair's opens Feedbacks and the assessment's
     opens a dashboard, and neither of those is what the gesture means. Once
     the task is in hand the button goes back to naming the step, because from
     then on that is exactly what it does. */
  const slide = !!steps.length && !!active && !jobStarted()
                && active.id !== "revive";
  cta.querySelector("span").textContent =
    slide ? "Start task"
    : !steps.length ? "Nothing to do yet"
    : !active ? "Task complete"
    /* A function where the label depends on live state — the revive step's does,
       because it is three buttons in one place. See REVIVE_STEP. */
    : active.cta ? jobVal(active.cta, "")
    : (jobKind === "assessment" && jobAt === 0)
        ? (assessProgress().judged ? "Resume task" : "Start task")
    : active.label;
  /* Nothing to press while the app is listening — a second press cannot make a
     bike answer sooner, and an enabled button there invites one. */
  const listening = !!active && active.id === "revive" && isReviving(BIKE.id);
  cta.disabled = listening || !steps.length || !active;
  /* THE SLIDE IS THE FIRST PRESS ONLY. Starting a task commits a QCA to a bike,
     and that is the one press worth making deliberate; Resume task, Battery
     removed and the rest are steps within a job already begun, and a gesture on
     each of those is friction charged for nothing. Sagar's call.

     Keyed on jobStarted(), which is the same test the corner button uses to
     decide between closing and parking — so "a task that has not begun" means
     one thing on this screen rather than two. */
  /* NOT ON THE REVIVE STEP. The slide exists because starting a task commits a
     QCA to a bike they then have in hand — see the note above. Reviving is not
     that: it is a request to a bike that may never answer, and the QCA does not
     have the bike until it does. So the first press on a dead bike is a plain
     button saying what it does, and the slide is skipped rather than made to
     mean something it does not. */
  cta.classList.toggle("jb__slide", slide && !(active && active.id === "revive"));
  /* Back to rest whenever the button's job changes under it — a new step, a new
     task, a tab switch. Without this the next one could open half slid. */
  jbSlideReset();

  /* No progress bar on a record — a full black bar over a finished task is a
     reading nobody needs, and it painted over the footer's own hairline. Hidden
     rather than zeroed, so what shows is the plain rule the band already draws. */
  document.getElementById("jbProg").hidden = record;

  const pct = jobProgress();
  document.querySelectorAll("#scrJob .jb__prog i").forEach(f => f.style.width = pct + "%");
  /* aria-valuenow is the only place the number is written now — the visible
     percentage went with the labelled row. */
  document.getElementById("jbProg").setAttribute("aria-valuenow", pct);

  sizeJobScroll();
  syncJobBar();
}

/* ── DISCARD ─────────────────────────────────────────────────────────────────
   Put the bike back. The task closes, the page returns to the listing it was
   opened from, and the bike is exactly where it was in it — discarding is not
   finishing and not failing.

   NOT THE SAME AS MINIMIZE, and the difference is the dock. Minimize parks the
   task: it holds the one slot, guards the next bike against it, and the band at
   the bottom keeps saying you owe this bike something. Discard releases all of
   that. A mechanic who is not coming back today should be able to leave the bike
   for whoever picks it up next, not carry it around.

   WHAT IT DOES NOT DO: clear the assessment working set. Whatever was judged on
   the checklist is still there, so reopening the same bike finds those marks —
   the queue resets the STEP pointer on open, as it does for every bike, so the
   task restarts at step one with the findings intact.

   ── FLAGGED ──────────────────────────────────────────────────────────────────
   Sagar asked for this as "close the task, maybe save the progress". The step
   pointer is the part not saved, and resuming mid-flow would mean storing it per
   bike the way minimised[] does for a parked task. That is a product call, not a
   guess: if a discarded task should resume where it was, it is doing Minimize's
   job without Minimize's band, and the two rows want rethinking together.
   ─────────────────────────────────────────────────────────────────────────── */
function discardTask(){
  const back = jobDef().back || "task";
  /* Not a record any more either, or the next open of this page would come up
     ticked. Same reset the queue does on the way in; done here too so the state
     cannot outlive the task by way of some other entry point. */
  jobDoneBike = null;
  goTo(back);
  toast("Task discarded — the bike is back on the list");
}

/* Open a finished task as a record. Called from the Transfer done rows; see the
   note on jobDoneBike. loadAssessment puts that bike's own findings in the
   working set, so the dashboard behind it reads the right bike if it is opened
   — the steps here are ticked because the task is over, not because the working
   set says so. */
function openFinishedJob(bike){
  loadAssessment(bike);
  jobDoneBike = bike;
  jobKind = "assessment";
  jobAt = jobSteps().length;
  goTo("job");
}

/* One way to complete a step, not two that could disagree: the footer and the
   step's own button both come here. */
function runJobStep(i){
  const steps = jobSteps();
  const step  = steps[i];
  if (!step) return;

  /* What a step DOES is the step's business, not the template's. Three shapes,
     and a kind picks per step which one it wants:

       on()   an action of its own. It returns true if it handled the step —
              anything else falls through to the acknowledgement below, so a
              handler that only wants a side effect does not have to fake one.
       to     opens a screen. That screen advances the step when it is finished,
              so the footer here is not also a way to skip past doing the work.
       neither  the step IS the button: pressing it is the mechanic saying they
              have done a physical job — parked the bike, swapped the part.

     Adding a fourth shape means adding it here and nowhere else. */
  if (typeof step.on === "function" && step.on(step, i) === true) return;
  if (step.to) {
    /* Opening a step's screen makes it the step you are ON. Without this the
       index never moved for a screen-step — it only ever advanced when a step
       was tapped as done — so coming back from the RnM dashboard left the task
       page still pointing at Feedback, the step before it. Every screen-step had
       the same hole; Feedback merely hid its own by bumping the index on entry.

       Math.max, never backwards: reopening a finished step to re-read it must
       not un-finish everything after it. A screen that genuinely completes on
       entry still advances past itself — see feedback/script.js. */
    jobAt = Math.max(jobAt, i);
    if (jobTab) jobAtByTab[jobKind + ":" + jobTab] = jobAt;
    goTo(step.to);
    return;
  }
  if (i < jobAt) { toast(step.label + " · already done"); return; }
  jobAt = i + 1;
  if (jobTab) jobAtByTab[jobKind + ":" + jobTab] = jobAt;
  if (jobAt >= steps.length && !jobTabs()) finishJob();
  else { renderJob(); toast(step.label + " · done"); }
}

/* A screen-step that finishes ITSELF, rather than being ticked on the task page.
   Opening such a step only makes it current (see step.to above); it is the screen
   that knows when the work in it is actually done — writing the complaint, in the
   one case that has this today.

   The screen names the route it occupies rather than its own index, so a step
   moving inside a tab cannot silently point at its neighbour. Returns true if that
   closed the whole task, so the caller knows not to navigate somewhere the task
   page has already left.

   Feedback still ticks its own step inline (jobAt = 1). It predates this and does
   the same thing; worth folding in next time either is touched. */
function completeJobStepTo(route){
  const steps = jobSteps();
  const i = steps.findIndex(s => s.to === route);
  if (i < 0) return false;
  jobAt = Math.max(jobAt, i + 1);
  if (jobTab) jobAtByTab[jobKind + ":" + jobTab] = jobAt;
  if (jobAt >= steps.length && !jobTabs()){ finishJob(); return true; }
  renderJob();
  return false;
}

/* Finished steps are reopenable, always. A mechanic who wants to re-read the
   feedback, or a captain checking what they noted, should not have to restart
   the task to do it — and a disabled row gives no way to find out that it holds
   anything at all. Upcoming steps stay disabled: they are not skippable. */
jbStepsEl.addEventListener("click", e => {
  const b = e.target.closest("[data-jbstep]");
  if (!b) return;
  runJobStep(jobSteps().findIndex(s => s.id === b.dataset.jbstep));
});

/* ── The slide ────────────────────────────────────────────────────────────────
   Figma 2913:32095. The CTA is dragged across rather than tapped, because
   starting a task and closing a step of one are both things a QCA does once and
   should not do by brushing the screen with a gloved thumb.

   A TAP still commits, and that is deliberate rather than a shortcut left in.
   Our labels are the ones this button always had — "Start task", "View
   Feedbacks" — not "Slide to start", so a tap that did nothing would read as a
   dead button to anyone who had not noticed the knob. The tap runs the same
   animation the drag ends with, so what happens is the same thing either way.
   Say the word and it becomes drag-only; the guard is one line.

   Progress lives in --p on the element (0 to 1) and everything visual reads off
   it — see the stylesheet. The travel is measured rather than assumed, so the
   knob still lands on the right edge if the button is ever a different width. */
const jbSlideEl  = document.getElementById("jbStart");
const JB_KNOB    = 56;
const JB_INSET   = 4;
/* Past 60% of the way it completes on release; short of that it springs back.
   Low enough that a committed drag does not have to reach the very edge, high
   enough that a nudge does not fire the task. */
const JB_COMMIT  = 0.6;

let jbTravel = 0, jbDragging = false, jbFrom = 0, jbP = 0, jbJustDragged = false;

const jbSetP = p => {
  jbP = Math.max(0, Math.min(1, p));
  jbSlideEl.style.setProperty("--p", jbP);
};

/* Back to rest, with no animation — used when the button's job changes under it
   (a new step, a new task) so the next one never starts half slid. */
function jbSlideReset(){
  jbSlideEl.classList.remove("is-settling", "is-done");
  jbSetP(0);
}

/* The end of the gesture, however it was made: knob to the far side, chevron
   becomes a tick, and the step runs once that has been seen. 220ms is the
   settle; the extra 60 is so the tick is not gone before it registers. */
function jbSlideCommit(){
  jbSlideEl.classList.add("is-settling", "is-done");
  jbSetP(1);
  setTimeout(() => { jbSlideReset(); runJobStep(jobAt); }, 280);
}

function jbMeasure(){
  jbTravel = jbSlideEl.offsetWidth - JB_KNOB - JB_INSET * 2;
  jbSlideEl.style.setProperty("--jb-travel", jbTravel + "px");
}

/* Whether this press is the slide one. Read at the moment of the gesture rather
   than latched, because the button changes job under the QCA's thumb. */
const jbIsSlide = () => jbSlideEl.classList.contains("jb__slide");

jbSlideEl.addEventListener("pointerdown", e => {
  if (jbSlideEl.disabled || !jbIsSlide()) return;
  jbMeasure();
  jbDragging = true;
  jbFrom = e.clientX - jbP * jbTravel;
  jbSlideEl.classList.remove("is-settling");
  jbSlideEl.setPointerCapture(e.pointerId);
});

jbSlideEl.addEventListener("pointermove", e => {
  if (!jbDragging) return;
  jbSetP((e.clientX - jbFrom) / (jbTravel || 1));
});

function jbEndDrag(){
  if (!jbDragging) return;
  jbDragging = false;
  jbSlideEl.classList.add("is-settling");
  if (jbP >= JB_COMMIT){
    /* A completed drag is followed by a click on the same element, and that
       click must not commit a second time. */
    jbJustDragged = true;
    setTimeout(() => { jbJustDragged = false; }, 400);
    jbSlideCommit();
  } else {
    jbSetP(0);
  }
}
jbSlideEl.addEventListener("pointerup", jbEndDrag);
jbSlideEl.addEventListener("pointercancel", jbEndDrag);

jbSlideEl.addEventListener("click", () => {
  if (jbJustDragged || jbSlideEl.disabled) return;
  /* An ordinary button on every press but the first: no knob, nothing to animate,
     so the step just runs. */
  if (!jbIsSlide()) { runJobStep(jobAt); return; }
  /* A tap that never moved. Measure first — the button may not have been dragged
     since it was last resized, and the knob has to know where the far side is. */
  jbMeasure();
  jbSlideCommit();
});

/* ── Header collapse ──────────────────────────────────────────────────────── */
/* The title snaps into the bar the moment it would slide under it — measured off
   the title's own position, so it holds if the hero ever changes height. */
const jbScrollEl = document.getElementById("jbScroll");
const jbBarEl    = document.getElementById("jbBar");
const jbTitleEl  = document.getElementById("jbTitle");
const jbFooterEl = document.querySelector("#scrJob .ffooter");

/* Where the header ends. It used to be the bar plus a progress strip docked
   under it; the strip moved to the footer, so the bar is the whole of it. */
function jbStackBottom(){
  return jbBarEl.getBoundingClientRect().bottom;
}

function syncJobBar(){
  const t = jbTitleEl.getBoundingClientRect(), stack = jbStackBottom();
  /* Two thresholds, because one could not serve both jobs.

     The bar goes OPAQUE the moment the title touches it. The bar is transparent
     at rest and sits above the scroller, so until it has a surface the title
     slides straight across the ✕ and the ⋮ — which is what a short frame parked
     it on top of: the scroll range ran out mid-crossing and left it there. With
     a surface, the title disappears behind the bar instead.

     The bar's OWN title only arrives once the page's is fully behind it. That is
     the original rule and the reason for it stands — firing it on contact would
     show the same words twice. */
  jbBarEl.classList.toggle("is-opaque", t.top <= stack);
  jbBarEl.classList.toggle("is-solid",  t.bottom <= stack);
}

/* End the scroll with the steps resting on the bar's bottom edge, rather than
   letting the list ride up under it. The tail is whatever is left of the
   viewport once the steps are parked there — so it shrinks as steps are added
   and disappears entirely once they fill the page. */
function sizeJobScroll(){
  const top   = jbScrollEl.getBoundingClientRect().top;
  const stack = jbStackBottom() - top;
  /* A tab strip travels with the page, so it counts as content the tail has to
     clear — measuring only the steps would overshoot by its height. */
  const tabs = jbTabsWrap.hidden ? 0 : jbTabsWrap.offsetHeight;

  /* The footer overlays the scroller on this page, so every measurement below
     has to take it out of the usable height. MEASURED, not read from --footer-h:
     the progress strip lives in there now, so the footer is taller than the token
     and a fixed 124 would leave the last step clipped behind it. */
  const footer = jbFooterEl.offsetHeight;

  if (tabs){
    /* The steps block is given the height of everything visible below the strip,
       whatever it holds. Without it an empty tab collapses the page, the
       scroller clamps, and the strip visibly jumps up the screen on switching to
       Puncture — the tabs moving is the page getting shorter under them. A
       floor, not a fixed height: a longer list still grows past it. */
    jbStepsEl.style.minHeight =
      Math.max(0, Math.round(jbScrollEl.clientHeight - stack - tabs - footer)) + "px";
  } else {
    jbStepsEl.style.minHeight = "";
  }

  const rest = jbScrollEl.clientHeight - stack - jbStepsEl.offsetHeight - tabs;
  jbScrollEl.style.paddingBottom = Math.max(footer, Math.round(rest)) + "px";
}
jbScrollEl.addEventListener("scroll", syncJobBar, {passive:true});

/* Untouched, the corner button closes: back to the list this task came from, not
   always the assessment queue. Started, it parks instead — see renderJob(). */
jbCloseEl.addEventListener("click", () => {
  /* A RECORD just closes. jobStarted() is true on one — the working set holds a
     finished assessment — and parking it would put a black "Task complete" band
     across the listing for a bike that left the QCA's hands hours ago, with a
     Resume that resumes nothing. This page is a sheet: it opens and it shuts. */
  if (jobDoneBike){ jobDoneBike = null; goTo(jobDef().back); return; }
  if (jobStarted()) { minimiseTask(); return; }
  goTo(jobDef().back);
});
/* No listener for jbMore. It carries data-opt-more, so shared/sheet.js binds it
   like every other ⋮ in the app. This screen used to toast "not wired yet" from
   the days before the sheet moved into shared chrome, and the stale listener
   survived the move — so the sheet opened AND claimed it did not exist. */

/* The task is over: it leaves the queue it came from. A finished bike is not a
   bike anyone should be able to pick up again, and leaving it on the list with no
   way to tell it apart is how two mechanics end up on the same one.

   The parked slot for this kind is cleared with it. A task cannot be both in hand
   and finished, and a card pointing at a bike that is no longer on the list would
   resume into nothing. */
function finishJob(){
  /* An ASSESSMENT's last step is "Drop in Repairable bike area", which is the
     handover to the Sr. Mechanic's bay — so finishing the task is what moves the
     bike into Assessment done's second accordion. The bike left FLEET at sign-off
     (see completeAssessment), so the splice below finds nothing and the flag is
     the whole move. */
  if (jobKind === "assessment") transferBike(BIKE.id);
  const list = jobKind === "repair" ? REPAIR : FLEET;
  const at = list.findIndex(b => b.id === BIKE.id);
  if (at !== -1) list.splice(at, 1);
  minimised[jobKind] = null;
  tasksDoneToday++;
  const id = BIKE.id;
  renderMinis();
  goTo(jobDef().back);
  toast("Task complete · " + id);
}

/* Where the page was left when a step opened a page of its own. Coming back from
   writing a complaint is a return to a place you were already standing, so the
   list has to be where you left it. Reset only when a NEW task is opened. */
let jbScrollAt = 0;
jbScrollEl.addEventListener("scroll",
  () => { jbScrollAt = jbScrollEl.scrollTop; }, {passive:true});

/* Open a task of a given kind. Everything a kind needs to switch cleanly happens
   here, so no caller has to remember the four things that go with it. */
function enterJobKind(kind, {fresh = false} = {}){
  if (kind && kind !== jobKind){
    jobKind = kind;
    jobTab  = jobTabs() ? jobTabs()[0].id : null;
    jobAt   = jobTab ? (jobAtByTab[jobKind + ":" + jobTab] || 0) : jobAt;
  }
  if (fresh) jbScrollAt = 0;
  renderJob();
  /* renderJob() rewrites the list and the browser clamps scrollTop against the
     old height for a beat, so this is set after the DOM is in place, not before. */
  jbScrollEl.scrollTop = jbScrollAt;
  syncJobBar();
}

/* The token queue's entry point, kept because that file is Barun's and its
   stitching contract names it. It is a thin call onto the template now: a token
   is a kind, not a screen. `t` is the tapped row — its absence means the captain
   never left the page, so it opens where they were. */
function enterToken(t){
  const fromQueue = !!t;
  if (t) TOKEN = {...TOKEN, ...t};
  jobKind = "token";
  /* A token opens on the tab matching its own type when there is one. Anything
     else lands on Service, the only tab with steps; the captain moves it. */
  const match = jobTabs().find(x =>
    x.label.toLowerCase().startsWith(String(TOKEN.type || "").toLowerCase()));
  jobTab = match && match.steps.length ? match.id : "service";
  jobAt  = jobAtByTab["token:" + jobTab] || 0;
  buildJobTabs();
  enterJobKind(null, {fresh: fromQueue});
}

buildJobTabs();
/* No renderJob() here. It reads the assessment's progress phases, which call
   faultyParts() — a const in a file that loads later, so at load time it is in
   the temporal dead zone and the throw takes every script after this one down.
   shared/boot.js does the first render, once everything is defined. */
/* Satoshi lands after first paint and any tab labels change width with it. */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveJobUnderline);
