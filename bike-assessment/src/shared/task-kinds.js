/* ═══════════════════════════════════════════════════════════════════════════
   TASK KINDS — what each task detail page contains

   There is ONE task detail page (screens/job). It knows how to draw a task and
   nothing about which tasks exist. This file is the whole of its content: four
   kinds today, each a plain object. Adding a fifth is an entry here — no markup,
   no CSS, no new screen.

   Every kind may declare:
     title    the task's name, in the second header and in the collapsed bar
     sub()    the task's context under it — whatever identifies THIS instance
     back     where the ✕ goes when the task has not been started
     art      hero image, as a CSS custom property name
     steps    the sub-tasks, in the order they are done
     tabs     optional: several step lists, one per tab, picked by the user
     progress optional: weighted phases; without it the steps share the bar

   A step may declare:
     label    what it is
     sub      a sub-heading, shown ONLY while the step is the active one
     cta      the footer's label while it is active; defaults to the label
     to       a screen it opens; without one, pressing it marks it done —
              an acknowledgement that a physical job is finished
     on()     an action of the step's own, run before `to` is considered. Return
              true to say it handled the press; anything else falls through.
              This is the seam for steps that need to do something other than
              open a page or tick over — see runJobStep()
     art      a hero image for while this step is the one in hand. Nothing sets
              one yet — every task shows the standard bike render, by Sagar's
              call, until the per-sub-task art is defined. The hook is live, so
              defining one is a single line here.
     revisit  — no longer used. Finished steps are always reopenable; the flag
                survived from when they were not, and is documented here so it
                is not reintroduced.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Which task flow the RnM dashboard is standing in. It is ONE screen and two
   flows reach it — the repairable bike's RnM step, and the assessment's first
   step — so neither its contents nor the way back out can be hardcoded. It used
   to force jobKind='repair' on the way home, which was right while repair was the
   only route in and is exactly the bug that would come back if this were removed.

   DERIVED, not assigned: enterRnm sets it from jobKind on every entry. It was
   recorded by the job page's step opener first, which worked but left the value
   stale for anything that reached the dashboard another way — goTo('rnm') on its
   own then rendered whichever flow had last opened it. Since the dashboard is
   only ever entered from the task page, and jobKind is what that page IS, reading
   it at the door is both simpler and correct.

   It is also the seam the two versions diverge along, and there are several
   divergences now: the timer's words, four rows instead of three, no hero
   carousel, a third tab. All of them are branches rather than a forked screen —
   a duplicated dashboard is 1 markup file, 8 stylesheets and 900 lines of script
   that would come apart at the first change either side took. */
let rnmKind = "repair";

/* ── THE ASSESSMENT'S STEPS ──────────────────────────────────────────────────
   Written once and shared by both shapes of the list below: a live bike gets
   these three, a dead one gets the revive step in front of them. Declared before
   TASK_KINDS because `const` does not hoist — the kind's `steps` is a function,
   so it reads this at render time, but REVIVE_STEP below is spread into an array
   and a const read before its declaration is a TDZ error, not undefined.
   ─────────────────────────────────────────────────────────────────────────── */
const ASSESS_STEPS = [
      {id:"assessment", label:"Assessment dashboard", to:"rnm"},
      /* `cta` because the row and the button say different things here: the row
         names the job — what this step IS — and the button names the outcome, in
         the past tense, because pressing it is the QCA reporting that the thing
         is now true. The steps that carry no cta are ones where those two
         sentences happen to be the same words. */
      {id:"battery",    label:"Remove battery mapping", cta:"Battery removed"},
      /* Same split as the battery step above: the ROW names the job — what
         this step is — and the BUTTON names the outcome in the past tense,
         because pressing it is the QCA reporting that the thing is now true. */
      {id:"drop",       label:"Drop in Repairable bike area", cta:"Bike dropped"},
];

/* ── REVIVE ──────────────────────────────────────────────────────────────────
   FIRST, and only for a bike whose pack has reached zero. A dead bike cannot be
   assessed: nothing on it answers, so the checklist has nothing to read and the
   dashboard has no vitals to show. Waking it is the job before the job.

   `on` rather than `to` or a bare acknowledgement — the third shape runJobStep
   offers. The other two do not fit: there is no screen to open, and a plain
   acknowledgement would let the QCA tick "revived" for a bike that never
   answered. Pressing it asks, and then the page waits.

   THE BUTTON IS PAST TENSE like every other step's — "Revival started" is the
   QCA reporting what they have just done, not a command to the app. What happens
   next is the bike's to report, which is why the label after it is a wait rather
   than a second action. */
const REVIVE_STEP = {
  id: "revive",
  label: "Revive dead bike",
  /* THREE STATES, one step — Figma 2982:1404 and the flow around it:

       idle      "Revival started"  the QCA has hooked the bike to a charger and
                                    is reporting that, past tense like every
                                    other step's button.
       charging  "Waiting for bike" the app is listening and there is nothing to
                                    press. Disabled, because a second press
                                    cannot make a bike answer sooner.
       revived   "Finish revival"   the bike has pinged. This is the QCA taking
                                    it off charge, which is what actually ends
                                    the step and puts the bike on the board.

     The last two are separate on purpose: the bike coming back and the mechanic
     dealing with it are minutes apart, and collapsing them would drop a bike
     into the assessment queue while it was still wired to a charger. */
  cta: () => isRevived(BIKE.id) ? "Finish revival"
           : isReviving(BIKE.id) ? "Waiting for bike"
           : "Revival started",
  /* NO SUB-HEADING. It said what the footer was already saying a few pixels
     below — "waiting for the bike", "take it off charge" — and the button is the
     thing being read there. It also made this the one step taller than 72,
     which re-flowed the list every time the state changed under it. */
  on: (step, i) => runRevivalStep(i),
};

const TASK_KINDS = {
  assessment: {
    /* THE SAME WORDS AS THE QUEUE THAT OPENS IT, and as the home card above
       that — see QUEUE_KINDS.task. A task named one thing on the board and
       another once you are inside it is how a QCA ends up believing they are
       two jobs. */
    title: "Assessment & fault marking",
    /* Model • number • pack, carried off the row that was tapped: the queue sets
       BIKE on every open (three places do — the listing, the token queue and the
       parked-task band) so the page cannot disagree with the row behind it.

       THE PACK READING DASHES ONCE THE BIKE IS IN DONE, which is exactly when the
       listings dash it: a pack is pulled as part of finishing an assessment — it
       is one of the steps on this very page — so a number here afterwards would
       be reporting a battery that is no longer in the bike. Derived rather than
       carried on BIKE: three places set that object and a fourth field is a
       fourth thing to forget, where membership of DONE is the fact itself. */
    sub:   () => {
      const pulled = typeof DONE !== "undefined" && DONE.some(d => d.id === BIKE.id);
      /* THE FLEET RECORD'S pack, not the stamped copy's. BIKE is a three-field
         snapshot the listing takes on open, so a bike that wakes mid-task — a
         revival pings and takes it from 0% to 5% — left this header disagreeing
         with the row behind it. Same reason the step list reaches for the record;
         the copy is a starting point, never the truth. */
      const rec = (typeof FLEET !== "undefined" && FLEET.find(b => b.id === BIKE.id)) || BIKE;
      return `${BIKE.model || "Dex NV"} • ${BIKE.id} • ${pulled ? "-- %" : rec.battery + "%"}`;
    },
    back:  "task",
    art:   "--img-bike",
    /* A FUNCTION, not an array, because a dead bike has one more step than a
       live one. Everything downstream reads jobSteps(), which resolves either
       shape — see the note there.

       Keyed on REVIVE(BIKE), the same predicate the queue's Revive chip uses, so
       "dead" means one thing in the listing and on the page it opens. Reviving
       does NOT clear it: the pack is still flat — waking the bike is what step 1
       does, removing its pack is step 3 — so the list keeps the same length for
       the whole task and jobAt cannot be left pointing at a step that vanished
       under it. */
    steps: () => {
      /* THE FLEET RECORD, not BIKE. BIKE is a three-field copy the listing stamps
         on open — id, model, battery — and `revived` is not one of them, so a
         woken bike read off the copy still looks like a candidate and is handed
         the revive step it has already been through. Same reason `sub` above
         reaches for DONE rather than trusting what it was handed. */
      const rec = FLEET.find(b => b.id === BIKE.id) || BIKE;
      return hasRevivalStep(rec) ? [REVIVE_STEP, ...ASSESS_STEPS] : ASSESS_STEPS;
    },
    /* Weighted by phase, not counted by click. How many faults a bike has is
       unknown until the checklist is done, so a click-count denominator would
       move under the mechanic mid-task — the bar would go backwards on finding a
       fault. Each phase owns a fixed share and reports only how far through
       itself it is, so the total only ever rises. Shares are the rough effort
       each phase costs, not its step count. */
    progress: [
      /* 40 + 20, up from 35 + 15. The photos phase held 10 and its screen is
         archived, so the 10 went to the two phases that are still work a QCA
         does with their hands — the battery and the drop are unchanged because
         neither got easier. The five must still total 100 or the bar cannot
         reach the end. */
      {id:"checklist", pct:40, of:() => PARTS.filter(p => p.status !== "pending").length / PARTS.length},
      {id:"faults",    pct:20, of:() => {
         const f = faultyParts();
         /* Nothing to detail is done, not stalled — but only once the checklist
            has actually asked the question. */
         if (!f.length) return PARTS.every(p => p.status !== "pending") ? 1 : 0;
         return f.filter(isDetailed).length / f.length;
       }},
      /* BY STEP ID, not by index. These read `jobAt > 1` and `jobAt > 2` until a
         revived bike gained a fourth step in front of the other three and both
         phases started measuring the step above the one they name — the bar
         filled a quarter the moment the revival finished. */
      {id:"battery",   pct:25, of:() => (jobPast("battery") ? 1 : 0)},
      {id:"drop",      pct:15, of:() => (jobPast("drop")    ? 1 : 0)},
    ],
  },

  repair: {
    title: "Repairable bike",
    sub:   () => `${BIKE.model || "Dex NV"} • ${BIKE.id}`,
    back:  "repair",
    art:   "--img-bike",
    steps: [
      {id:"feedback", label:"Feedback",      cta:"View Feedbacks", to:"feedback"},
      {id:"rnm",      label:"RnM Dashboard", cta:"Start RnM",      to:"rnm"},
      {id:"parts",    label:"Part exchange summary"},
      {id:"park",     label:"Park in repaired bikes"},
    ],
  },

  /* Quality check. No sub-screens behind its steps yet, which needs no special
     casing: pressing a step with no `to` marks it done, so the five walk end to
     end while the screens behind them are still to be designed. */
  qc: {
    title: "Quality Check",
    sub:   () => `${BIKE.model || "Dex NV"} • ${BIKE.id}`,
    back:  "qc",
    art:   "--img-bike",
    steps: [
      {id:"connect",    label:"Connect bike",     cta:"Connect"},
      {id:"summary1",   label:"View Summary",     cta:"View summary"},
      {id:"electrical", label:"Electrical Check", cta:"Start electrical check"},
      {id:"mechanical", label:"Mechanical Check", cta:"Start mechanical check"},
      {id:"summary2",   label:"Summary",          cta:"Finish QC"},
    ],
  },

  /* The captain's task. Same page as the three above — the only thing it adds is
     tabs, because a token can take one of three routes and the captain picks
     which. The person is the task's identity here, not the bike, so `title` is
     read from state rather than fixed. */
  token: {
    /* Token number and what the token is FOR, on the title line. The number was
       a circle in the bar; inline it reads as part of the task's name, which is
       what it is — "08 • Service token" identifies the job. The person and their
       bike drop to the context line below, with everything else that identifies
       this particular instance. */
    title: () => `${TOKEN.token} • ${TOKEN.type} token`,
    sub:   () => `${TOKEN.name} • ${TOKEN.plate} • ${TOKEN.vehicle}`,
    back:  "tokens",
    art:   "--img-bike",
    tabs: [
      {id:"service", label:"Service", steps:[
        {id:"complaint", label:"Note customer complaint", cta:"Start",
                         to:"complaint"},
        {id:"park",      label:'Move bike to "Live Repairable Zone"', cta:"Parked"},
        {id:"pick",      label:'Pick bike from "Live Repaired"',
                         sub:"handover to customer", cta:"Handover bike"},
      ]},
      /* The frame's own name. The trailing + is part of the label, not a control. */
      {id:"puncture", label:"Puncture +", steps:[], soon:"Coming soon"},
      /* Named, because "coming soon" on its own tells a captain nothing about
         what this tab will hold. Both outcomes close the token rather than repair
         the bike, which is why they share a tab. */
      {id:"other", label:"Other", steps:[],
       soon:"Swap and unserviceable<br>coming soon"},
    ],
  },
};

/* Which token is open. Filled by enterToken() from the queue's own row data, so
   the detail page never invents a token the list does not have. */
let TOKEN = {token:"08", name:"Rakesh Kumar", type:"Service", vehicle:"Dex NV", plate:"543210"};
