/* ═══════════════════════════════════════════════════════════════════════════
   FLEETS — the bikes each queue lists

   Lifted out of the three listing screens when they became one template. The
   data outlived the screens that used to own it, and a fleet defined inside a
   page is a fleet only that page can show.

   All three are deterministic: the same queue on every load, so a screenshot
   taken later still matches what a participant saw. Model names and the id
   scheme are Vaishnavi's from qc-task-list, so a bike reads the same in both
   prototypes.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Three, and they are the vocabulary the Bike type filter offers — Figma
   2872:22873. The four-name set this replaced ("Miracle 2.5", "DeX 3.0" …) came
   from Vaishnavi's qc-task-list and no longer matches the frames: a filter whose
   chips cannot name what the rows contain is a filter that finds nothing, so the
   data and the chips have to come from one list. That list is this one. */
const MODELS = ["Miracle", "Dex GR", "Dex NV"];

/* What is wrong with the bike, for the Issue type filter. Three values, because
   the frame offers three chips and "Both" is a state a bike is genuinely in —
   not the union of the other two, which is what a checkbox pair would make it. */
const ISSUE_KINDS = ["mech", "elec", "both"];

/* 26 in the yard: 15 with charge, 11 flat. Sixteen are lifted out into DONE
   below, leaving the 10 that are actually waiting on assessment. */
const FLEET = Array.from({length:26}, (_, i) => ({
  id: String(5078900 + i * 137),
  model: MODELS[i % MODELS.length],
  waitMins: 40 + ((i * 47) % 260),
  battery: i < 15 ? 12 + ((i * 23) % 76) : 0,
  /* Independent of the model cycle, which took two goes to get right. Both run
     on 3, so any stride over i only PERMUTES the pairing — every Miracle still
     ends up with the same issue, and "Miracle + electrical" finds nothing. This
     shifts each block of three by one, so the nine combinations all appear
     within the first nine bikes and every pair of chips matches something. */
  issue: ISSUE_KINDS[(i + Math.floor(i / 3)) % 3],
}));

/* THE WHOLE YARD, counted before a single bike is spliced out of it. Pending and
   done are one pool split in two, and this is the number that has to hold however
   the split moves: a bike lost or duplicated on the way across changes it, growing
   the fixture does not. Captured here because DONE's map below mutates FLEET. */
const YARD = FLEET.length;

/* ── WHERE A TRANSFERRED BIKE IS PARKED ──────────────────────────────────────
   Three zones, and a transferred bike is in exactly one of them. Named here
   rather than written into the rows because two places say them: the row's
   second line, and the note above the Transfer done list (see the `note` on that
   section in queue-kinds.js, which builds its bullets from this array). A note
   that listed a zone no row used — or missed one a row showed — would be the
   page contradicting itself.

   The weighting is INVENTED, like every other figure in these fixtures: most
   bikes go to allocation, fewer to QC, fewest are stuck. It is here to make the
   column look like a real day rather than a round robin. */
const TRANSFER_ZONES = ["Allocation zone", "QC pending zone", "Stuck bike zone"];

/* ── ASSESSED ALREADY ────────────────────────────────────────────────────────
   Sixteen bikes lifted OUT of FLEET, not invented beside it: an assessed bike is
   a bike that was waiting an hour ago, and two lists that do not share their
   bikes cannot show one moving between them. FLEET is 10 now and DONE is 16;
   finishing an assessment moves a seventeenth across (see completeAssessment in
   shared/assessment-record.js), which is the whole point of the pair.

   GROWING THE TRANSFERRED HALF MEANS GROWING THE YARD. These bikes are spliced
   out of FLEET, so adding one here without adding one to FLEET takes a bike off
   Assessment pending — the two counts are one pool, and that is the point of
   the splice. Five were added to both when Transfer done went from 6 to 11.

   DONE has two halves, split by `transferred` — assessed, and assessed AND
   handed over to the Sr. Mechanic's bay. They are two accordions on one page,
   not two pages.

   Each carries the RESULT rather than a copy of the checklist: which parts came
   back faulty, why, and what penalty each drew. Everything else — the twelve
   parts that were fine, the two findings rows, the five ticked steps — is
   derived from that when the record is opened, so a seeded bike and one a QCA
   has just finished go through exactly the same code. See loadAssessment.

   `reasons` must come from the part's OWN catalogue in data.js. A reason that is
   not in it would render as a chip nobody can unset; flowtest checks every one.

   waitMins is reused as "how long ago it was finished" — the template's right
   column is a duration either way, and the queue's own label says which. */
const ASSESSED = [
  {i:  2, doneMins:  35, faults:[
    {part:"Front brake", reasons:["Pads worn"],                penalty:"minor"},
  ]},
  {i:  5, doneMins: 110, faults:[]},                 /* nothing wrong with it */
  {i:  9, doneMins: 180, faults:[
    {part:"Tyre",        reasons:["Tread below limit","Cut"],  penalty:"major"},
    {part:"Rear brake",  reasons:["Weak bite"],                penalty:"minor"},
  ]},
  {i: 13, doneMins: 265, faults:[
    {part:"Headlight",   reasons:["Not lighting"],             penalty:"no"},
  ]},
  {i: 18, doneMins: 420, faults:[
    {part:"MCU",         reasons:["Error code","Connector loose"], penalty:"major"},
    {part:"Front wheel", reasons:["Wobble","Bearing noise"],   penalty:"major"},
    {part:"Side stand",  reasons:["Spring weak"],              penalty:"no"},
  ]},
  /* ── and these have also been HANDED OVER ─────────────────────────────────
     Assessed, then walked to the Sr. Mechanic's bay for allocation. Same list,
     one flag further on: the page is Assessment done and both halves belong to
     it, which is why they are one array with a `transferred` flag rather than a
     third fleet. A bike that had to be looked up in one of two places depending
     on how far along it was would be a bike nobody finds.

     The flag is what the second accordion reads, and the task page's last step —
     Drop in Repairable bike area — is what sets it. See transferBike. */
  /* spentMins — how long the assessment itself took, wall clock. INVENTED: the
     app times nothing. It is the second half of the finished-task banner on the
     job page, where doneAt says WHEN and this says HOW LONG.

     allocMins — the wait shown on the Sr. Mechanic's Unallocated board. A
     transferred bike's clock RESTARTS: waitMins answers "how long has this been
     sitting in front of whoever is looking at it", and once the bike is walked to
     the bay that is the yard's clock, not the QCA's. The assessment is over, so
     the eight hours since somebody first picked the bike up are not what the Sr.
     Mechanic is waiting on. Ordered to match doneMins, so the board still reads
     longest-waiting first.

     doneAt — minutes past midnight, the clock time the QCA finished with the
     bike. Transferred rows show THAT instead of an elapsed duration: once a bike
     has left your hands "8h 30m" is answering a question nobody asked, and the
     handover time is what a QCA is actually looking for when they go back to
     check one. No date: the lists reset every day.

     Explicit rather than derived from doneMins. Deriving would need a "now" for
     the prototype, and the only clock on screen is the frame's painted 9:41 —
     which would put every one of these in the small hours. These are ordered to
     match doneMins so the column still reads down: longest ago, earliest time. */
  {i:  0, doneMins:  95, doneAt: 13*60 + 10, allocMins:  5, spentMins: 7, elecN: 0, transferred:true, zone:"Allocation zone", faults:[
    {part:"Rear wheel",  reasons:["Spokes loose"],             penalty:"minor"},
  ]},
  {i:  3, doneMins: 140, doneAt: 745, allocMins: 12, spentMins: 11, elecN: 3, transferred:true, zone:"QC pending zone", faults:[]},
  {i:  7, doneMins: 215, doneAt: 700, allocMins: 19, spentMins: 6, elecN: 0, transferred:true, zone:"Stuck bike zone", faults:[
    {part:"Horn",        reasons:["Weak"],                     penalty:"no"},
    {part:"Indicators",  reasons:["One not blinking"],         penalty:"minor"},
  ]},
  {i: 11, doneMins: 300, doneAt: 615, allocMins: 26, spentMins: 12, elecN: 2, transferred:true, zone:"Allocation zone", faults:[
    {part:"Charging port", reasons:["Pins bent"],              penalty:"major"},
  ]},
  {i: 15, doneMins: 385, doneAt: 560, allocMins: 34, spentMins: 5, elecN: 1, transferred:true, zone:"Allocation zone", faults:[]},
  {i: 20, doneMins: 510, doneAt: 485, allocMins: 44, spentMins: 9, elecN: 3, transferred:true, zone:"QC pending zone", faults:[
    /* Front wheel is one of the five parts the checklist was drawn against, so
       it is one of the five the app has a render of — this row shows a real crop
       where the rest of the catalogue falls back to the no-photo glyph. See
       paintFaults in screens/alloc. */
    {part:"Front wheel", reasons:["Wobble","Bearing noise"],   penalty:"major"},
    {part:"Seat lock",   reasons:["Will not latch"],           penalty:"minor"},
    {part:"Number plate",reasons:["Bent"],                     penalty:"no"},
  ]},
  /* ── the early shift ──────────────────────────────────────────────────────
     Five more handed over, taking Transfer done from 6 to 11. They continue the
     three runs the block above establishes and must keep continuing them or the
     board stops reading down: doneMins UP, allocMins up with it, doneAt DOWN —
     longest ago, earliest clock time. These land between 5:15 and 7:30, which is
     the shift before the one the six above belong to.

     Every part/reason pair here is one already used above, deliberately: the
     reasons have to come from the part's own catalogue in data.js and flowtest
     checks all of them, so reusing a proven pair cannot invent an unsettable
     chip. */
  {i: 21, doneMins: 585, doneAt: 450, allocMins: 53, spentMins:  8, elecN: 1, transferred:true, zone:"Allocation zone", faults:[
    {part:"Front brake", reasons:["Pads worn"],                penalty:"minor"},
  ]},
  {i: 22, doneMins: 650, doneAt: 420, allocMins: 61, spentMins:  6, elecN: 0, transferred:true, zone:"Stuck bike zone", faults:[]},
  {i: 23, doneMins: 720, doneAt: 385, allocMins: 70, spentMins: 13, elecN: 2, transferred:true, zone:"Allocation zone", faults:[
    {part:"Tyre",        reasons:["Tread below limit","Cut"],  penalty:"major"},
    {part:"Horn",        reasons:["Weak"],                     penalty:"no"},
  ]},
  {i: 24, doneMins: 790, doneAt: 350, allocMins: 78, spentMins:  7, elecN: 3, transferred:true, zone:"QC pending zone", faults:[
    {part:"Charging port", reasons:["Pins bent"],              penalty:"major"},
  ]},
  {i: 25, doneMins: 860, doneAt: 315, allocMins: 87, spentMins: 10, elecN: 0, transferred:true, zone:"Allocation zone", faults:[
    {part:"Headlight",   reasons:["Not lighting"],             penalty:"no"},
    {part:"Seat lock",   reasons:["Will not latch"],           penalty:"minor"},
  ]},
];

const DONE = ASSESSED.map(({i, doneMins, doneAt, allocMins, spentMins, elecN, transferred, zone, faults}) => {
  const at = FLEET.findIndex(b => b.id === String(5078900 + i * 137));
  const [bike] = FLEET.splice(at, 1);
  return {...bike, waitMins: transferred ? allocMins : doneMins,
          transferred: !!transferred,
          /* Only a transferred bike has one — it is where the QCA walked it to.
             The row prints it when it is there and says nothing when it is not,
             so one field covers both halves of the list. */
          zone: transferred ? zone : null,
          doneAt: doneAt ?? null, spentMins: spentMins ?? null,
          /* HOW MANY the bike reported about itself, not which: the names come
             off the app's one diagnostic set — see issuesElectrical — and a
             second list of them here would be the same strings written twice.
             0 is a real answer; some bikes come in clean electrically. */
          elecN: elecN ?? 0,
          assessment: {faults}};
});

/* "1:10 PM" from minutes past midnight. Twelve-hour, because that is how a yard
   says a time out loud, and no date — every list resets at the start of the day,
   so the day is never in question. */
const fmtClock = m => {
  const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, "0");
  return `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
};

/* ── THE MECHANICS ───────────────────────────────────────────────────────────
   INVENTED, all of it. The real list is whoever is on shift and the app has no
   roster — this is the one place to replace when it gets one.

   Shared rather than owned by the allocation page, because two screens name the
   same people: the picker on that page, and the Allocated board, whose rows say
   who each bike went to. Two lists of four names would drift on the first edit.

   `status` is what they are doing right now and done/total is the day: a Sr.
   Mechanic handing out a bike asks both "is this person free" and "how much have
   they got through", and one number cannot answer the pair. Idle with work left
   is the normal case — a bike is finished and the next has not been started. */
const MECHANICS = [
  {id:"m1", name:"Ramesh K.", status:"working", done:2, total:4},
  {id:"m2", name:"Imran S.",  status:"working", done:1, total:3},
  {id:"m3", name:"Deepak V.", status:"idle",    done:3, total:3},
  {id:"m4", name:"Sunil G.",  status:"idle",    done:1, total:5},
];
const mechName = id => (MECHANICS.find(m => m.id === id) || {}).name || "";

/* WHO IS SIGNED IN, when the profile is Mechanic. The app has no accounts, so
   the mechanic using it is one of the four by fiat — and it has to be one of
   the four, because their task list is now the bikes the Sr. Mechanic gave
   them. Two profiles reading one set of allocations is the whole point: hand a
   bike to Ramesh on one screen and it is on Ramesh's list on the other. */
const ME = "m1";

/* ── THE SR. MECHANIC'S YARD ─────────────────────────────────────────────────
   Repairable bikes, in two states: not yet handed to a mechanic, and handed out.
   Every bike is in exactly one of them, which is why they read against each
   other and why they are the two tabs of one listing rather than two cards.

   UNALLOCATED IS NOT A FIXTURE. It is the QCA's own transferred bikes — the ones
   that left Assessment done when the task's last step dropped them in the
   Repairable Bike Area — so the chain runs end to end in the prototype: assess a
   bike, finish the task, and it appears on the Sr. Mechanic's board waiting to be
   given to someone. One list, read from the other end.

   ALLOCATED is still invented. 27 of them, the number the home card carried as a
   fixture, and they are the half nothing upstream produces yet: allocating a bike
   is the Sr. Mechanic's own action and there is no screen for it. */
/* `started` splits the allocated half again: a bike handed to a mechanic who has
   not picked it up yet, and one being worked on. Two accordions inside the tab —
   see QUEUE_KINDS.allocation. Every third, so both groups are populated and the
   split is deterministic rather than a fixture somebody has to keep in step. */
const ALLOC = Array.from({length:27}, (_, i) => ({
  id: String(5090100 + i * 113),
  model: MODELS[i % MODELS.length],
  /* MINUTES, not hours. Every figure on this board is inside one shift — how
     long a bike has waited, how long a mechanic has been on it, how long one
     took — so they run 0-50 rather than the hours the yard's other board does. */
  /* From 3, not from 0. A bike that reached a mechanic in no time at all is
     not a case worth showing, and "Pending since 0m" on the detail page reads
     as a figure that failed to load rather than as a fast handover. */
  waitMins: 3 + ((i * 13) % 48),
  battery: 8 + ((i * 29) % 84),
  allocated: true,
  /* Who it went to. Round-robin, so every mechanic has a full spread. */
  mech: MECHANICS[i % MECHANICS.length].id,
}));

/* ── THREE STATES, not two ───────────────────────────────────────────────────
   The board is read per mechanic now, and what a Sr. Mechanic is looking for in
   one person's list is where each bike has got to: waiting to be started, being
   worked on, finished.

   AT MOST ONE LIVE BIKE EACH, and only for a mechanic whose own status says
   they are working. A person works one bike at a time; two "on-going" rows
   under one name would be the board contradicting the line above it. Idle
   mechanics have none by definition — that is what idle means here.

   `mins` is the number the row shows, and what it MEANS is the row's state: how
   long it has waited, how long they have been on it, how long it took. One
   field rather than three, because the sub-line already says which question the
   number is answering. */
(function(){
  MECHANICS.forEach(m => {
    const mine = ALLOC.filter(b => b.mech === m.id);
    mine.forEach((b, k) => {
      /* WHEN it was handed over, in minutes past midnight. The two durations on
         the footer — how long it waited, how long it took — are differences
         between three clock times, and the time details page shows all three.
         Storing the first and deriving the rest keeps them from disagreeing.
         Invented, like every other figure on this board. */
      b.allocAt = 8 * 60 + 20 + (k * 37) % 210;
      const live = m.status === "working" && k === 0;
      b.state = live ? "live" : (k % 2 ? "done" : "pending");
      b.mins  = live ? 5 + ((k * 17) % 36)
              : b.state === "done" ? 20 + ((k * 23) % 51)
              : b.waitMins;
    });
  });
})();

/* ── WHAT IS WRONG WITH THE ALLOCATED ONES ───────────────────────────────────
   The 27 in the yard were a fixture with no findings — they never needed any,
   because nothing opened them. An on-going bike opens the same detail page the
   unallocated ones do now, and a page that said "no assessment on file" for
   every bike being worked on would be a page that looks broken rather than one
   with nothing to say.

   Dealt round a small pool rather than written out 27 times. Every part name
   and reason is a real one from the catalogue in shared/data.js — a name that
   is not in it renders as a chip nobody can unset. */
(function(){
  const POOL = [
    [{part:"Front brake",  reasons:["Weak bite"],                  penalty:"minor"}],
    [{part:"Tyre",         reasons:["Cut"],                        penalty:"major"},
     {part:"Rear brake",   reasons:["Pads worn"],                  penalty:"minor"}],
    [{part:"Front wheel",  reasons:["Wobble"],                     penalty:"major"}],
    [],
    [{part:"Side stand",   reasons:["Will not fold"],              penalty:"no"},
     {part:"Seat lock",    reasons:["Catch worn"],                 penalty:"minor"}],
    [{part:"Rear wheel",   reasons:["Spokes loose"],               penalty:"minor"}],
    [{part:"Battery lock", reasons:["Barrel loose"],               penalty:"no"},
     {part:"Number plate", reasons:["Illegible"],                  penalty:"no"},
     {part:"Tyre",         reasons:["Tread below limit"],          penalty:"major"}],
    [{part:"Display",      reasons:["Wrong reading"],              penalty:"minor"}],
  ];
  ALLOC.forEach((b, i) => {
    b.assessment = {faults: POOL[i % POOL.length]};
    b.elecN = [0, 2, 1, 3, 0, 1, 2, 0][i % 8];
  });
})();

/* Pending is what is still to do, and a bike being worked on is not done — so
   a count of "still to go" takes live with pending. Finished is the remainder. */
const allocPending = id => ALLOC.filter(b => b.mech === id && b.state !== "done").length;
const allocTotal   = id => ALLOC.filter(b => b.mech === id).length;

/* "4/7 pending", read off the SAME blocks the head draws — the coloured ones,
   ignoring the free slots. One function so the number and the picture cannot
   disagree: the count is the blocks said in words, not a second tally that
   happens to agree today. */
function allocCount(id){
  const b = allocBlocks(id).filter(k => k !== "free");
  return `${b.filter(k => k !== "done").length}/${b.length} pending`;
}

/* ── A SHIFT'S CAPACITY, AS BLOCKS ───────────────────────────────────────────
   18 slots — what one mechanic can get through in a shift. INVENTED: nothing in
   the app knows a mechanic's capacity, and the real figure is the thing to
   replace first if this reading is kept.

   The blocks are the shift read left to right: what is behind them, what is in
   hand, what is queued, and what is still free. The empties are the point of
   it — a row that is mostly pale is a person you can give the next bike to, and
   that is the question this board exists to answer. A count cannot show it
   without also being read. */
const ALLOC_CAP = 18;
function allocBlocks(id){
  const mine = ALLOC.filter(b => b.mech === id);
  const n = s => mine.filter(b => b.state === s).length;
  const out = [];
  for (let i = 0; i < n("done"); i++)    out.push("done");
  for (let i = 0; i < n("live"); i++)    out.push("live");
  for (let i = 0; i < n("pending"); i++) out.push("pending");
  while (out.length < ALLOC_CAP) out.push("free");
  /* Never past the row: a mechanic given more than a shift's worth would
     silently grow the head and break the rhythm down the list. */
  return out.slice(0, ALLOC_CAP);
}

/* The blocks as markup, because TWO screens draw them: the Allocated board's
   accordion heads and the allocation sheet's picker rows. They were a status
   ring and a "Working • 1/3 done" line on the second until the first proved
   the blocks say more in the same space — and the two screens name the same
   four people, so they must not describe them differently.

   The words go on the aria-label. Colour is the whole of this reading, and a
   row of squares says nothing to a screen reader or to anyone who cannot
   separate the greens from the greys. */
function allocBlocksHTML(id){
  const label = `${allocPending(id)} of ${allocTotal(id)} still to do, `
              + `${ALLOC_CAP - allocTotal(id)} slots free`;
  return `<span class="mblocks" aria-label="${label}">`
    + allocBlocks(id).map(k => `<i class="mblocks__b mblocks__b--${k}"></i>`).join("")
    + `</span>`;
}

const ALLOC_STATE = {pending:"Pending", live:"On-going", done:"Finished"};

/* The three moments, derived from the one that is stored. A bike that has not
   been started has no start and no finish; one still in hand has no finish. */
const allocStartedAt  = b => b.state === "pending" ? null : b.allocAt + b.waitMins;
const allocFinishedAt = b => b.state === "done" ? allocStartedAt(b) + b.mins : null;

/* The state as a mark and a word. Two screens say it — the Allocated board's
   rows and the detail page's banner — and one builder is what stops them from
   wording it differently.

   Pending gets no mark: not started is the absence of a state, and a glyph for
   it would give waiting the same weight as work. */
function allocStateHTML(b){
  const st = b && b.state;
  const mark = st === "live" ? `<span class="qstate qstate--live">${ICON.statePlay}</span>`
             : st === "done" ? `<span class="qstate qstate--done">${ICON.stateFlag}</span>`
             : "";
  return mark + (ALLOC_STATE[st] || "");
}

/* ── THE LIVE CLOCK ──────────────────────────────────────────────────────────
   A bike being worked on shows a timer that ticks, seconds and all — the one
   figure on this board that is not a fact about the past. Everything else says
   how long something waited or took, in whole minutes; this one is running, and
   the seconds are what say so.

   Anchored ONCE, the first time it is asked for: `mins` is how long they have
   been on it, so the start is that many minutes before the first render. Kept
   in a map rather than recomputed, or every repaint would reset the clock to a
   round number and it would never appear to move. */
const ALLOC_SINCE = {};
function allocLiveFrom(b){
  if (!(b.id in ALLOC_SINCE)) ALLOC_SINCE[b.id] = Date.now() - b.mins * 60000;
  return ALLOC_SINCE[b.id];
}
/* Starting work on a bike NOW: it becomes the live one and its clock starts
   from zero. Used when a mechanic takes a task on from their own list. */
function allocStartNow(b){
  b.state = "live";
  b.mins  = 0;
  ALLOC_SINCE[b.id] = Date.now();
}
/* And putting one back: the work on it is discarded, so it is waiting again
   and the number it shows is the wait it came in with. */
function allocStopWork(b){
  b.state = "pending";
  b.mins  = b.waitMins;
  delete ALLOC_SINCE[b.id];
}

/* ── REVIVAL ─────────────────────────────────────────────────────────────────
   A dead bike goes on an external power source and takes 5-10 minutes to come
   back up. SEVERAL RUN AT ONCE — the mechanic hooks one up and walks to the
   next, which is the whole reason this is not a task. One assessment is in hand
   at a time and the dock parks it; revivals stack on the board instead, because
   nobody is holding them.

   TWO PHASES, not one — Figma 2982:1404:

     charging   the bike is on the charger and has said nothing. The row reads
                "reviving…" and counts up from `startedAt`.
     revived    the bike has pinged to say it is live. The row reads "Revived"
                and counts up from `pingedAt`, and the task page offers Finish
                revival. It is still in the stack: the QCA has to come back and
                take it off charge, and until they do it is not on the board.

   The second phase exists because the bike coming back and the MECHANIC dealing
   with it are different events minutes apart. Collapsing them would put a bike
   into the assessment queue while it was still physically wired to a charger.

   id -> {startedAt, pingedAt}. Both anchors are stored rather than recomputed:
   a repaint must not reset a clock, the rule ALLOC_SINCE above exists for.
   ─────────────────────────────────────────────────────────────────────────── */
const REVIVAL = {};
/* On charge, nothing heard yet. */
const isReviving = id => !!REVIVAL[id] && !REVIVAL[id].pingedAt;
/* Reported in, still on charge, waiting for the QCA. */
const isRevived  = id => !!REVIVAL[id] && !!REVIVAL[id].pingedAt;
/* Either — what pins a row above the board. */
const onRevival  = id => !!REVIVAL[id];

/* What a bike comes back with. INVENTED, like every figure in these fixtures:
   a few minutes on a charger is enough to wake the electronics and not much
   more. Figma 2982:1404 draws 5%. */
const REVIVE_CHARGE = 5;

/* `sinceMs` backdates the DISPLAY only — see the seeds below. The ping is
   scheduled for what is LEFT of the wait, not the whole of it. */
function beginRevival(id, sinceMs){
  const since = sinceMs || 0;
  REVIVAL[id] = {startedAt: Date.now() - since, pingedAt: null};
  setTimeout(() => bikePinged(id), Math.max(0, CONFIG.REVIVE_MS - since));
}

/* THE BIKE REPORTED IN. Nothing here asked it to — the signal is the bike's and
   the timer above is the prototype standing in for it. It wakes with a little
   charge, which is what stops it being a revival candidate a second time and
   what makes it assessable at all. */
function bikePinged(id){
  if (!isReviving(id)) return;
  REVIVAL[id].pingedAt = Date.now();
  const bike = fleetBike(id);
  if (bike && bike.battery < REVIVE_CHARGE) bike.battery = REVIVE_CHARGE;
  revivalRepaint();
  if (typeof toast === "function") toast((bike ? bike.model + " " : "") + id + " is revived");
}

/* THE QCA TOOK IT OFF CHARGE — Finish revival on the task page. Only now does
   the bike leave the stack and join the bikes waiting to be assessed. */
function completeRevival(id){
  if (!REVIVAL[id]) return;
  delete REVIVAL[id];
  const bike = fleetBike(id);
  if (bike) bike.revived = true;
  revivalRepaint();
}

const fleetBike = id => FLEET.find(b => b.id === id) || DONE.find(b => b.id === id);

/* TWO SCREENS SHOW A REVIVAL and both must follow it: the board draws the row,
   the task page draws the footer that turns into Finish revival. A ping arriving
   while the QCA is standing on the task page has to be visible there — that is
   the whole sequence — and repainting only the listing left the button saying
   "Waiting for bike" for a bike that had already answered.

   Guarded on `current` because these fire on timers that outlive any one screen,
   and on typeof because this file loads before either renderer. */
function revivalRepaint(){
  if (typeof current === "undefined") return;
  if (current === "task" && typeof renderQueue === "function") renderQueue();
  if (current === "job"  && typeof renderJob   === "function") renderJob();
}

/* "since 8m" while charging, "4m ago" once it has reported — the frame's words,
   and they are two different facts: one is how long the wait has run, the other
   is how long the bike has been sitting there done. Minutes only. The seconds
   fmtLive shows are right for a job being worked on and wrong here: three
   stacked rows ticking seconds is movement that means nothing. */
function fmtSince(from){
  const m = Math.floor((Date.now() - from) / 60000);
  return m < 1 ? "just now" : `since ${m}m`;
}
function fmtAgo(from){
  const m = Math.floor((Date.now() - from) / 60000);
  return m < 1 ? "just now" : `${m}m ago`;
}

/* TWO ALREADY ON CHARGE — Figma 2982:1400 draws the board with a stack rather
   than an empty one. A revival takes long enough that the steady state IS two or
   three of these on top, and a QCA arriving at a board with none would never see
   the pattern.

   Backdated so they read 8m and 3m like the frame. The ping is still due when it
   is due, so the one eight minutes in reports shortly and the stack moves while
   you watch instead of holding still.

   5081092 is deliberately NOT seeded. It is the third flat bike on the board and
   the one left to start by hand, or there would be no way to see the beginning
   of this flow. */
beginRevival("5081229", 8 * 60000);
beginRevival("5081503", 3 * 60000);

/* "5m 12s". Not "5:12", which reads as a time of day next to a row that says
   "Finished in 43m" — the units are what make it a duration. */
function fmtLive(from){
  const t = Math.max(0, Math.floor((Date.now() - from) / 1000));
  return `${Math.floor(t / 60)}m ${String(t % 60).padStart(2, "0")}s`;
}
/* ── THE REST OF THE UNALLOCATED YARD ────────────────────────────────────────
   Eight more bikes waiting to be given out. The QCA's own six are the real
   chain — assess a bike, finish the task, watch it arrive here — and six is
   what that chain can produce in a session; a real yard holds 12-16 at any
   time, and a board that never fills teaches the wrong thing about how it
   reads. So the six are joined by eight fixtures.

   They carry assessment records of their own, because the allocation page reads
   faults off the record and a bike with none shows a stated placeholder — eight
   of those in a row would look like a broken page rather than a full yard. The
   parts and reasons are real ones from the catalogue in shared/data.js; a name
   that is not in it renders as a chip nobody can unset. */
/* A SPREAD, deliberately: some bikes come in mechanical only, some electrical
   only, some both, one clean. A board where every row said "3 elect." taught
   the shape of the fixture rather than the shape of the work.

   FOUR OF THE EIGHT ARE MECHANICAL ONLY — every fault on a mech part and no
   electrical report of their own. That is what the Mechanical only chip
   selects, and the first cut of this fixture left it filtering 14 bikes down
   to 1: a chip nobody would press twice, and a field test that would have
   taught the wrong thing about whether the filter is worth having. The mix is
   invented either way; it may as well exercise the control. */
const UNALLOC_EXTRA = [
  {elecN:0, faults:[{part:"Front brake", reasons:["Pads worn"],        penalty:"minor"}]},
  {elecN:0, faults:[{part:"Tyre",        reasons:["Tread below limit"],penalty:"major"},
                    {part:"Side stand",  reasons:["Spring weak"],      penalty:"no"}]},
  {elecN:3, faults:[]},
  {elecN:0, faults:[{part:"Headlight",   reasons:["Dim"],              penalty:"no"}]},
  {elecN:0, faults:[{part:"Rear wheel",  reasons:["Wobble","Bearing noise"], penalty:"major"}]},
  {elecN:2, faults:[{part:"Battery lock",reasons:["Key jams"],         penalty:"minor"},
                    {part:"Horn",        reasons:["Weak"],             penalty:"no"}]},
  {elecN:2, faults:[{part:"Display",     reasons:["Flickering"],       penalty:"minor"}]},
  {elecN:0, faults:[{part:"Rear brake",  reasons:["Weak bite"],        penalty:"minor"},
                    {part:"Number plate",reasons:["Loose"],            penalty:"no"},
                    {part:"Side stand",  reasons:["Stop worn"],        penalty:"minor"}]},
].map((o, i) => ({
  id: String(5083000 + i * 97),
  model: MODELS[i % MODELS.length],
  /* Minutes, like the six they stand beside — every wait on this board is
     inside one shift. */
  waitMins: 7 + ((i * 11) % 44),
  battery: null,
  transferred: true,
  doneAt: null,
  spentMins: null,
  elecN: o.elecN,
  assessment: {faults: o.faults},
}));

/* WHICH electrical faults a bike reported, by name. The names are the app's one
   diagnostic set and the count is the bike's, so a bike with two shows the first
   two — there is nowhere yet that records WHICH two, and inventing a second
   list of the same three strings would be the thing to unpick later. */
const bikeElectrical = b => (typeof issuesElectrical === "function"
  ? issuesElectrical() : []).slice(0, b && b.elecN != null ? b.elecN : 0);

/* "3 mech. • 2 elect. faults", and neither half is written when it is zero: a
   row that says "0 elect." makes you read a number to find out there is nothing
   there. A bike with neither says so in words rather than showing an empty
   line. */
function faultSummary(b){
  const m = ((b.assessment && b.assessment.faults) || []).length;
  const e = b && b.elecN ? b.elecN : 0;
  if (!m && !e) return "No faults";
  /* The noun is at the end and belongs to the whole line, so it agrees with the
     TOTAL: "1 mech. fault", but "1 mech. • 2 elect. faults". */
  return [m ? `${m} mech.` : "", e ? `${e} elect.` : ""]
    .filter(Boolean).join(" &bull; ") + (m + e === 1 ? " fault" : " faults");
}

/* Both halves, in the order the yard fills: what is waiting to be given out,
   then what has been. The QCA's own transfers come FIRST, so a bike signed off
   during a test lands at the top of the list where it can be found. */
const ALLOC_ALL = () =>
  DONE.filter(b => b.transferred).concat(UNALLOC_EXTRA).concat(ALLOC);

/* battery: null, not 0 — see the note on QUEUE_KINDS.qc. */
const QC_FLEET = Array.from({length:21}, (_, i) => ({
  id: String(5078900 + i * 137),
  model: MODELS[i % MODELS.length],
  waitMins: 40 + ((i * 47) % 260),
  battery: null,
  issue: ISSUE_KINDS[(i + Math.floor(i / 3)) % 3],
}));

/* 12, matching the count on Home's card. `mine` is the mechanic's own — two of
   them, one Live and one In-flow, so the sort-to-top shows up in more than one
   section. waitMins arrived with the template: every listing shows how long a
   bike has been sitting, and this one had no such field. */
const REPAIR = [
  {id:"5081300", model:"Dex NV",  section:"live",   battery:64, mine:false, waitMins: 95, issue:"mech"},
  {id:"5081437", model:"Miracle", section:"live",   battery:38, mine:true , waitMins:212, issue:"elec"},
  {id:"5081574", model:"Dex GR",  section:"live",   battery:81, mine:false, waitMins: 47, issue:"both"},
  {id:"5081711", model:"Miracle", section:"live",   battery:22, mine:false, waitMins:168, issue:"mech"},
  {id:"5081848", model:"Dex NV",  section:"live",   battery:55, mine:false, waitMins:131, issue:"elec"},
  {id:"5081985", model:"Miracle", section:"inflow", battery:0,  mine:false, waitMins: 73, issue:"both"},
  {id:"5082122", model:"Dex GR",  section:"inflow", battery:0,  mine:true , waitMins:254, issue:"mech"},
  {id:"5082259", model:"Miracle", section:"inflow", battery:0,  mine:false, waitMins:186, issue:"elec"},
  {id:"5082396", model:"Dex NV",  section:"inflow", battery:0,  mine:false, waitMins: 61, issue:"both"},
  {id:"5082533", model:"Miracle", section:"stock",  battery:0,  mine:false, waitMins:305, issue:"mech"},
  {id:"5082670", model:"Dex GR",  section:"stock",  battery:0,  mine:false, waitMins:142, issue:"elec"},
  {id:"5082807", model:"Dex NV",  section:"stock",  battery:0,  mine:false, waitMins:228, issue:"both"},
];

/* "4hrs 35mins". Minutes alone under an hour, and never an empty string. Used by
   the queue header's average, where the words read better than initials. */
const fmtWait = m => {
  const h = Math.floor(m / 60), mm = m % 60;
  return [h ? `${h}hr${h > 1 ? "s" : ""}` : "", mm ? `${mm}min${mm > 1 ? "s" : ""}` : ""]
    .filter(Boolean).join(" ") || "0mins";
};

/* Figma 2439:28119 — the horizontal android battery, replacing the vertical
   glyph the queues used to draw. Exported, not redrawn: the shape is the
   design's, and a hand-traced one would be a different battery. currentColor so
   the row can tint it — green with charge, red flat, grey with no reading. */
/* "4h 30m" for the rows — Figma 2439:28117. Two spans, not one string: the hours
   are primary and the minutes secondary, so the eye lands on the number that
   decides whether this bike has been waiting too long. */
function fmtWaitShort(m){
  const h = Math.floor(m / 60), mm = m % 60;
  const parts = [];
  if (h)  parts.push(`<span class="wait__h">${h}h</span>`);
  if (mm || !h) parts.push(`<span class="wait__m">${mm}m</span>`);
  return parts.join(" ");
}

/* The same "4h 30m", as plain text. fmtWaitShort splits the hours and minutes
   into two spans so the row can weight them differently; dropped into a line of
   prose those spans become flex items and the sentence grows an 8px hole —
   "Finished in  43m". Stripped rather than written twice, so the two can never
   disagree about how a duration reads. */
const fmtWaitFlat = m => fmtWaitShort(m).replace(/<[^>]+>/g, "");

const BATT_ICON = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none"><g id="battery_android_frame_5"><mask id="mask0_0_4" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20"><rect id="Bounding box" width="20" height="20" fill="#D9D9D9"/></mask><g mask="url(#mask0_0_4)"><path id="battery_android_frame_5_2" d="M3.49354 14.5829C2.87035 14.5829 2.34063 14.3647 1.90438 13.9285C1.46813 13.4922 1.25 12.9625 1.25 12.3393V7.65974C1.25 7.03655 1.46813 6.50683 1.90438 6.07058C2.34063 5.63433 2.87035 5.4162 3.49354 5.4162H14.5833C15.2065 5.4162 15.7363 5.63433 16.1725 6.07058C16.6088 6.50683 16.8269 7.03655 16.8269 7.65974V12.3393C16.8269 12.9625 16.6088 13.4922 16.1725 13.9285C15.7363 14.3647 15.2065 14.5829 14.5833 14.5829H3.49354ZM3.49354 13.3329H14.5833C14.8649 13.3329 15.1008 13.2377 15.2913 13.0472C15.4817 12.8568 15.5769 12.6209 15.5769 12.3393V7.65974C15.5769 7.37822 15.4817 7.14224 15.2913 6.95183C15.1008 6.76141 14.8649 6.6662 14.5833 6.6662H3.49354C3.21201 6.6662 2.97604 6.76141 2.78563 6.95183C2.59521 7.14224 2.5 7.37822 2.5 7.65974V12.3393C2.5 12.6209 2.59521 12.8568 2.78563 13.0472C2.97604 13.2377 3.21201 13.3329 3.49354 13.3329ZM17.6602 11.9227V8.08454H17.9967C18.2101 8.08454 18.389 8.15669 18.5333 8.30099C18.6778 8.44544 18.75 8.62433 18.75 8.83766V11.1693C18.75 11.3828 18.6778 11.5617 18.5333 11.706C18.389 11.8504 18.2101 11.9227 17.9967 11.9227H17.6602ZM3.49354 11.586V8.41308C3.49354 8.1996 3.56576 8.02072 3.71021 7.87641C3.85451 7.73197 4.0334 7.65974 4.24688 7.65974H10.6571C10.8704 7.65974 11.0493 7.73197 11.1937 7.87641C11.3381 8.02072 11.4102 8.1996 11.4102 8.41308V11.586C11.4102 11.7995 11.3381 11.9784 11.1937 12.1227C11.0493 12.2671 10.8704 12.3393 10.6571 12.3393H4.24688C4.0334 12.3393 3.85451 12.2671 3.71021 12.1227C3.56576 11.9784 3.49354 11.7995 3.49354 11.586Z" fill="currentColor"/></g></g></svg>`;
