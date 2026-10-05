/* ═══════════════════════════════════════════════════════════════════════════
   QUEUE KINDS — what each task LISTING page contains

   There is one listing page (screens/queue), the counterpart to the one task
   detail page. Three listings run through it today. It knows how to draw a queue
   of bikes and nothing about which queues exist; this file is the whole of its
   content.

   The token queue is deliberately NOT here. It lists people, not bikes, its rows
   carry call and skip actions, and it is Barun's file with its own stitching
   contract — folding it in would mean either bending this template out of shape
   or rewriting his page. Left alone until it is worth doing properly.

   Every kind may declare:
     title    the queue's name, in the header
     data()   the bikes in it. Called on every render, so a queue that empties as
              tasks finish reports the truth without being told
     filters  the filter groups — see below. [] for a queue with none
     sort()   optional comparator. The default is longest-waiting first
     battery  who shows a reading: true, false, or a predicate on the bike
     kind     the task kind a row opens, from TASK_KINDS
     guard    whether starting a task here can collide with a parked one. Only
              the kinds the dock actually parks need it
     mini     which parked kind docks on this listing, if any

   ── FILTERS ────────────────────────────────────────────────────────────────
   Figma 2872:22873 replaced the old single-select chip strip and the Filters /
   Sort bar at the foot with one control: a row of quick chips beside a filter
   button, and a sheet holding every group including the quick one.

   So a group is declared once and appears in both places if it is `quick`. Each
   is {id, label, quick?, chips:[{id, label, of(bike), dot?}]}.

   Chips inside a group are OR, groups are AND — the ordinary reading of a filter
   panel: "Miracle or Dex NV, that also has an electrical issue". An empty group
   constrains nothing, so no selection at all is the whole queue. That last part
   is why there is no longer an "All" chip: All is what you get by deselecting,
   and a chip that means "no filter" competes with the reset button for the same
   job.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Bikes whose pack has reached zero. They are not a separate list — a bike moves
   between filters by its own state. */
/* NOT `revived`. A bike that has been woken is still flat — the pack is removed
   as a step of the assessment this unblocks, not by the charger — so the battery
   alone would offer to revive it again the moment it came back. The flag is what
   says it has already been done. See beginRevival in fleets.js. */
const REVIVE = b => b.battery === 0 && !b.revived;
/* WHETHER THE TASK PAGE SHOWS A REVIVE STEP — a different question from whether
   the bike needs reviving, and it has to be, because the answer must not change
   while the task is open. A bike wakes with 5% the moment it pings, which makes
   REVIVE() false; keyed on that alone the step list would drop from four to
   three under a QCA standing on the page, taking the step they were on with it.

   True while it still needs it, while it is on charge in either phase, and ever
   after — a bike that has been through a revival keeps the four steps, so the
   task reads as one job from start to finish. */
const hasRevivalStep = b => !!b && (REVIVE(b) || onRevival(b.id) || !!b.revived);
/* Flat is not low: a bike on 0 is in Revive, and having it answer both chips
   would double-count it in two counts sitting side by side. */
const LOW_BATT = b => b.battery !== null && b.battery > 0
                   && b.battery < QUEUE_LOW_BATTERY;

/* Built from MODELS rather than written out, so the chips cannot drift from the
   models the fleets actually carry — the failure that made this vocabulary worth
   fixing in the first place. See the note on MODELS in fleets.js. */
const BIKE_TYPE_GROUP = {
  id: "model", label: "Bike type",
  chips: MODELS.map(m => ({id: m, label: m, of: b => b.model === m})),
};

/* ── SORT OPTIONS ────────────────────────────────────────────────────────────
   Shared for the reason BIKE_TYPE_GROUP is: two listings ordering by the same
   thing must order by the SAME thing, and a queue that wrote its own comparator
   is how the three original listings drifted apart in the first place.

   `of` returns the NUMBER to order by, not a comparator — direction is the
   sheet's business, and a kind that supplied its own would be able to disagree
   with the arrow the row is drawing. A bike missing the value returns null and
   the listing sinks it; see queueBikes.
   ─────────────────────────────────────────────────────────────────────────── */
const SORT_WAIT = {
  id: "wait", label: "Wait time",
  of: b => b.waitMins,
};
/* Only worth offering where the queue actually shows a reading. On a listing
   whose bikes have had their packs pulled every row answers the same, so the
   option would be a control that does nothing — see `battery` on each kind. */
const SORT_BATTERY = {
  id: "battery", label: "Battery %",
  of: b => b.battery,
};

/* REMOVED: the Issue type group — Mech. only / Elect. only / Both, on all three
   queues. Sagar's call: what is wrong with a bike is not known before somebody
   goes and looks at it, so a listing of bikes WAITING to be looked at cannot
   offer it as a filter. It was fleet data pretending to be a finding.

   `issue` is still on every bike in fleets.js and nothing reads it now. Left
   there rather than stripped out, because a real listing will eventually carry
   something of this shape — reported symptoms, say — and that is a different
   field with a different source rather than this one renamed.

   To put it back, this is the whole group; add it to the three `filters` arrays
   below, where BIKE_TYPE_GROUP already sits:

     const ISSUE_TYPE_GROUP = {
       id: "issue", label: "Issue type",
       chips: [
         {id:"mech", label:"Mech. only",  of: b => b.issue === "mech"},
         {id:"elec", label:"Elect. only", of: b => b.issue === "elec"},
         {id:"both", label:"Both",        of: b => b.issue === "both"},
       ],
     };
*/

const QUEUE_KINDS = {
  task: {
    /* Same words as the home card that opens it — the card names the listing, and
       two names for one board is how a QCA ends up thinking they are two. The
       TAB below is just "Pending": inside the page the title has already said
       what the board is, so the tab only has to draw the distinction against
       Transfer done. */
    title: "Assessment & fault marking",
    /* The bikes still to assess, AND the ones this QCA has already handed to the
       Sr. Mechanic's bay — two accordions below, the work and what has gone out.
       The transferred ones are also on Assessment done, deliberately: that page
       is the record of what was found, this one is the day's board. */
    data:  () => FLEET.concat(DONE.filter(b => b.transferred)),
    /* What the page is NAMED for. The title's count and the average under it read
       this rather than data(), or the page would say 17 while the home card that
       opened it says 10 — and the average would be dragged by bikes that are not
       waiting for anything. */
    headline: () => FLEET,
    /* TABS, not accordions. Two accordions put the work and what has left the
       QCA's hands on one scroll, which reads as one longer list; tabs say they
       are two boards. Assessment done keeps accordions — its two halves are one
       record read straight down, where these two are different jobs. */
    sectionsAs: "tabs",
    sections: [
      {id:"pending",  label:"Pending",       of: b => !b.transferred},
      /* No filter band on this tab. Both chips ask about a pack in a bike that
         is waiting, and nothing here is waiting — the band would be two chips
         that always count zero. The band now rides INSIDE the active tab (see
         renderQueue), which is what makes per-tab a thing that can be said. */
      /* EXCLUSIVE, and not just in its rows. No filter band — both chips ask
         about a pack, and every bike here has had its pack pulled. No average —
         the right-hand column on these rows is a clock time, not a wait, so an
         average wait is a figure about the OTHER tab sitting under this one. And
         no parked-task band: a task in hand belongs to the board you are
         working, and this is the board of what has left. Nor a scan button —
         scanning a bike is how you pick the next one up, and there is nothing
         here to pick up. */
      /* A NOTE above the rows — Figma 2982:673. This tab is a record of bikes
         that have left the QCA's hands, and the one question it kept raising was
         "so where is it now": the rows say what was transferred, not where it
         went. The note answers that once, above the list, rather than the row
         growing a location it cannot know.

         Declared here rather than drawn in the template for the same reason the
         filters are: a note belongs to the board, and the template names no
         board. Any section can carry one. */
      {id:"transfer", label:"Transfer done", of: b =>  b.transferred,
       noFilters:true, noAvg:true, noMini:true, noFab:true,
       /* The bullets are BUILT from TRANSFER_ZONES, the same array the rows
          read their zone out of. Written out by hand they were a second copy of
          the list, and the first zone added to one and not the other would have
          the note contradicting the rows underneath it. */
       note: `<p>\u2705 Assessment for following bikes is done.</p>
              <p>\u27a1\ufe0f These bike are parked in 1 of the following:</p>
              <ul>${TRANSFER_ZONES.map(z => `<li>${z}</li>`).join("")}</ul>`},
    ],
    filters: [
      /* Both chips ask about a pack in a bike that is waiting. A transferred bike
         has had its pack pulled and is not waiting, so neither chip counts it —
         without the guard, Revive would tally bikes that have already gone. */
      {id:"quick", label:"Quick", quick:true, chips:[
        {id:"revive",  label:"Revive",      of: b => !b.transferred && REVIVE(b)},
        {id:"lowbatt", label:"Low battery", of: b => !b.transferred && LOW_BATT(b)},
      ]},
      BIKE_TYPE_GROUP,
    ],
    /* BOTH options here: this queue shows a live pack reading on every row, so
       "which is emptiest" is a question its rows can actually answer. Default
       order is unchanged — longest wait first — and Reset in the sheet returns
       to it. A listing with no `sorts` shows no Sort button at all. */
    sorts: [SORT_WAIT, SORT_BATTERY],
    /* THE ORDER THE LIST IS ALREADY IN, named so the sheet can press it. It has
       to agree with `sort` below (absent here, so the template's own longest-
       wait-first) — if the two disagreed the sheet would point at a chip the
       list was not obeying. */
    sortDefault: {id:"wait", dir:"desc"},
    battery: true,
    /* The pack is out of a transferred bike, so its row shows the slot and no
       number — the same "-- %" Assessment done uses, per bike here because this
       page carries both kinds. */
    dash: b => !!b.transferred,
    /* Transferred rows carry the clock time the QCA finished with them instead
       of an elapsed wait — once a bike has left your hands, "8h 30m" answers a
       question nobody asked. This queue only: see the note in queueRowHTML. */
    clock: b => !!b.transferred,
    /* And drawn back: a transferred bike is on this page to be seen, not to be
       worked on. See .qrow.is-muted. */
    muted: b => !!b.transferred,
    kind:  "assessment",
    guard: true,
    mini:  "assessment",
    /* A pending bike starts from nothing. Without this the working set — PARTS,
       the fault record, the five steps — would still hold whatever bike was
       looked at last, which is exactly what opening a finished one leaves
       behind. See shared/assessment-record.js. */
    /* Two kinds of row on one board. A PENDING bike starts a task from nothing.
       A TRANSFERRED one is finished and gone — it opens the same page as a
       RECORD: every step ticked, no button, and the footer carrying when it was
       done and how long it took. It used to start a fresh assessment on a bike
       already in the yard, which is the one thing this row must not offer. */
    open: bike => {
      if (bike.transferred){ openFinishedJob(bike); return; }
      /* jobKind FIRST — jobEntryStep reads the kind's step list to decide
         whether this bike's revival is already behind it. */
      resetAssessment(); jobKind = "assessment"; jobAt = jobEntryStep(); goTo("job");
    },
  },

  /* The other half of the QCA's day: bikes they have finished with. Same bikes
     as `task` — they are spliced out of one list into the other on sign-off, so
     one cannot show a bike the other also shows.

     No quick chips. The right-hand column and the average under the title are
     both durations since the assessment was finished rather than time spent
     waiting, and both are labelled as waits — the template says "Avg. wait time"
     on every queue and this one does too. Sagar's call; flagged here because the
     words and the number do not quite agree. */
  assessdone: {
    /* The last head pins to the floor while it is shut — Figma 2902:31870. Two
       sections over one list, and this is what keeps the second reachable when
       the first is long. Opt in, because it is wrong on a board of four
       people; see queueSectionsHTML. */
    stickyFoot: true,
    title: "Assessment done",
    data:  () => DONE,
    /* No filter row on this page — Sagar's call. The two accordions below are
       the split that matters here, and a Bike type filter over eleven bikes the
       QCA has already been through is a control looking for a job. Empty rather
       than absent: the template reads the length. */
    filters: [],
    /* Two accordions over one list, in the order the work runs: assessed, then
       handed over. Figma 2902:31870. The counts are of the whole list rather
       than the filtered view for the same reason the title's is. */
    sections: [
      {id:"done",     label:"Assessment done", of: b => !b.transferred},
      {id:"transfer", label:"Transfer done",   of: b =>  b.transferred},
    ],
    /* "dash", not true: the pack is pulled before an assessment is signed off,
       so the slot is there and the number is not. See queueDashesBattery. */
    battery: "dash",
    kind:  "assessment",
    /* Neither guarded nor parkable: opening a record is not starting a task, so
       it cannot collide with one that is parked. */
    guard: false,
    mini:  null,
    /* Straight to the task page with the assessment step behind it, carrying that
       bike's own findings — see loadAssessment. jobAt 1 is the step after the
       dashboard's, which is where sign-off leaves it. */
    open: bike => { loadAssessment(bike); jobKind = "assessment"; jobAt = 1; goTo("job"); },
  },

  /* Every bike here is battery-less by definition — the pack comes out for the
     check — so the cell shows no reading at all. A reading of zero is not the
     same as no reading, and 0% would send it to Revive on any other screen.

     Which also means neither quick chip can apply: both are questions about a
     pack that is not in the bike. The row is the filter button alone. */
  qc: {
    title: "QC pending",
    data:  () => QC_FLEET,
    filters: [BIKE_TYPE_GROUP],
    battery: false,
    kind:  "qc",
    /* No guard and no dock slot: a QC is not one of the kinds the dock parks, so
       it cannot collide with a parked assessment or repair. */
    guard: false,
    mini:  null,
  },

  /* The Sr. Mechanic's board: what is waiting to be given out, and what has
     been. Two TABS rather than two accordions — a Sr. Mechanic works one side at
     a time and the other is a different job, where Assessment done's two halves
     are one record read straight down. Same sections field either way; only
     `sectionsAs` differs.

     Unallocated is the QCA's transferred bikes, not a fixture — see ALLOC in
     fleets.js. So the chain runs end to end: assess a bike, finish the task, and
     it turns up here. */
  /* UNALLOCATED ONLY. This was both halves of the yard under two tabs; the
     allocated half is its own block on Home now — see `allocated` below — so
     what is left is a single list of bikes waiting to be given out, and a strip
     of one tab would be a control with nothing to switch to. */
  allocation: {
    title: "Unallocated bikes",
    data:  () => ALLOC_ALL().filter(b => !b.allocated),
    /* The full band — All, one quick chip, and the button that opens the rest.
       The QCA's two chips do not come across: both ask about a pack, and every
       bike here has had its pack pulled. What a Sr. Mechanic sorts by instead is
       what the job IS, so the quick chip is Mechanical only.

       MECHANICAL ONLY means mechanical work and NOTHING ELSE: at least one
       fault on the record, every one of them on a mech part (see `system` in
       shared/data.js), and the bike reporting no electrical faults of its own.

       Both halves matter. A bike whose marked faults are all mechanical but
       which is also pinging errors at the yard needs somebody who can do both,
       and that is exactly the call this chip exists to take off the pile — a
       list that included it would send a mechanical hand to a job they cannot
       finish.

       A bike with no faults at all is not "mechanical only": it is nothing
       only, and it does not belong under a chip that says what kind of work
       this is. */
    /* Quick FIRST in the sheet, then Bike type — the sheet lists the groups in
       array order, and the quick group is found by its flag rather than by its
       place, so the two can be ordered for reading. Same order as `task`: the
       narrow, decision-shaped question comes before the broad one. An earlier
       note here put Bike type first on the grounds that the quick chip is
       already on the band and so is least needed in the sheet — but `task`'s
       quick chips sit on its band too and lead its sheet, so that reasoning was
       not being applied consistently. One order across both listings. */
    filters: [
      {id:"quick", label:"Quick", quick:true, chips:[
        {id:"mechonly", label:"Mechanical only", of: b => {
          if (b.elecN) return false;
          const f = (b.assessment && b.assessment.faults) || [];
          return f.length > 0 && f.every(x => {
            const part = PARTS.find(p => p.name === x.part);
            return part && part.system === "mech";
          });
        }},
      ]},
      BIKE_TYPE_GROUP,
    ],
    /* No pack reading. Every bike here has had its pack pulled, so the slot
       only ever said "-- %" — a permanent blank where a number goes. The bike
       number takes the space beside the model instead, and the line underneath
       answers the question this board is actually for: what kind of work is
       this, and how much of it. */
    battery: false,
    head: b => `${b.model} &bull; ${b.id}`,
    /* "3 mech. \u2022 2 elect. faults" — short, because it is a sizing, not a
       report: the faults themselves are one tap away on the allocation page. A
       side that is zero is left out entirely; see faultSummary. */
    sub: b => faultSummary(b),
    /* SELF-CONTAINED. `kind` is the repair only so the row can carry a battery
       rule; nothing here starts a repair task. Tapping a bike used to open the
       MECHANIC's task page — a Sr. Mechanic allocating work would have found
       themselves inside somebody else's job, which is the one thing this block
       must not do. Allocating is their own action, and it now has a screen of
       its own — screens/alloc — which is a draft: it lays the decision out and
       reports rather than moving the bike.

       Sagar's rule, and it is worth keeping: a profile's blocks are exclusive.
       Nothing tapped inside one leads into another profile's flow. */
    kind:  "repair",
    /* Its OWN detail page — screens/alloc — not the mechanic's task template.
       Still self-contained: nothing on that page starts a repair. */
    open:  bike => openAllocation(bike),
    guard: false,
    mini:  null,
  },

  /* ── ALLOCATED BIKES ──────────────────────────────────────────────────────
     The other half of the yard, and its own block on Home rather than a tab of
     the one above. The two are different jobs: Unallocated is a decision queue
     — pick a bike, pick a mechanic — and this is a board you watch.

     READ BY MECHANIC, not by state. It was two tabs, Waiting and On-going, and
     that answered "how much is sitting" when the question a Sr. Mechanic
     actually has is "how is each of my people doing". One accordion per person,
     all shut on arrival: the board opens as four names and their loads, and you
     expand the one you are asking about. Splitting by state instead scattered
     one person's work across two tabs and made that question unanswerable.

     Every section is one mechanic; their bikes carry the state. */
  allocated: {
    title: "Allocated bikes",
    data:  () => ALLOC,
    /* No average. It was an average WAIT, and the rows here are three different
       measurements — waited, been on it, took — so a mean across them is a
       number about nothing. */
    noAvg: true,
    sections: MECHANICS.map(m => ({
      id: m.id,
      label: m.name,
      of: b => b.mech === m.id,
      /* The head is a person, not a label: face, name, and their shift as a row
         of colour-coded blocks — finished, in hand, queued, free. It read
         "Working • 4/7 pending", which answered how much is left but not the
         question underneath it, which is who has room. Eighteen blocks answer
         both at a glance and take the same line.

         The words are on the aria-label rather than lost: colour is the whole
         of this reading, and a row of squares says nothing to a screen reader
         or to anyone who cannot separate the greens from the greys. */
      head: () => `
        <span class="qmech__face" aria-hidden="true">${ICON.face}</span>
        <span class="qmech__t">
          <span class="qmech__top">
            <span class="qmech__n t-label-md700">${esc(m.name)}</span>
            <span class="qmech__c t-label-sm">${allocCount(m.id)}</span>
          </span>
          ${allocBlocksHTML(m.id)}
        </span>`,
    })),
    /* All shut. The first-open default is for a page whose first section is the
       work; here the first section is one person out of four and opening it
       would say they were the one to look at. */
    openFirst: false,
    filters: [],
    battery: false,
    head: b => `${b.model} &bull; ${b.id}`,
    /* A mark in front of the two states that are something — see ICON.statePlay
       and ICON.stateFlag. Pending gets none: not started is the absence of a
       state, and a glyph for it would give waiting the same weight as work.

       THE DURATION IS IN THE SUB-LINE for everything but the live row. "43m"
       alone on the right had to be read against the word on the left to mean
       anything, and it meant something different on each of the three states.
       Written out — "Finished in 43m", "Pending since 40m" — each row says what
       its own number is, and the right-hand column is left for the one figure
       that has to stand apart because it is moving. */
    sub:  b => allocStateHTML(b)
              + (b.state === "done"    ? ` in ${fmtWaitFlat(b.mins)}`
               : b.state === "pending" ? ` since ${fmtWaitFlat(b.mins)}` : ""),
    /* Finished rows sit back on the grey. They are the part of a mechanic's
       list that needs no action, and this is the one board where done work
       stays in view — dimming the text as well would have made three states
       into a gradient rather than three states. */
    rowClass: b => b.state === "done" ? "qrow--past" : "",
    /* TIGHTER ROWS. The 92px row is sized for a listing you scan; these sit
       inside an accordion under a person's name, and seven of them at 92 push
       the next mechanic off the screen. 76 keeps the two lines and takes 16 off
       the air above and below them. */
    tight: true,
    /* PENDING, then the one being worked on, then what is finished — the order
       the work moves in. Sorted by state before time, so a mechanic's list
       reads as a queue rather than as a pile: what is waiting, what is in hand,
       what is behind them. Longest first within each state, as everywhere. */
    sort: (a, b) => {
      const rank = {pending:0, live:1, done:2};
      return (rank[a.state] - rank[b.state]) || (b.mins - a.mins);
    },
    /* ONLY the live row keeps the right-hand column, and what it holds is a
       running clock — see fmtLive. The other two put their duration in the
       sub-line, so this space says one thing on this board: somebody is on that
       bike right now, and this is how long they have been. */
    wait: b => b.state !== "live" ? ""
      : `<span class="wait__live" data-live-from="${allocLiveFrom(b)}">${
           fmtLive(allocLiveFrom(b))}</span>`,
    kind:  "repair",
    /* A BIKE WITH A MECHANIC opens the same detail page an unallocated one
       does, in its read-only mode: the banner and the three sections, no CTA.
       What is wrong with a bike is the same fact whoever is looking, and a Sr.
       Mechanic watching a repair wants exactly what they wanted before handing
       it over. The breadcrumb carries the state.

       Still not the MECHANIC's job page — that is somebody else's work, and the
       rule this whole block keeps is that no profile's board opens another
       profile's flow.

       ALL THREE STATES open it, finished included. A record of work that is
       over ideally says what was DONE to the bike, and this page says what was
       WRONG with it — but the two overlap almost entirely, and the page already
       reads correctly for a finished bike: the mechanic's name heads it, the
       banner says Finished, and the footer carries how long it waited and how
       long it took. A starting point to build the record from, rather than a
       toast that teaches nothing. */
    open:  bike => openAllocation(bike, "progress"),
    guard: false,
    mini:  null,
  },

  repair: {
    title: "Repair tasks",
    /* THE SIGNED-IN MECHANIC'S OWN ALLOCATIONS — see ME in shared/fleets.js.
       This was a twelve-bike fixture of its own, which meant the Sr. Mechanic
       could hand Ramesh a bike and Ramesh's list would not change. One set of
       allocations, read by both profiles, is the chain this prototype is for.

       REPAIR, the old fixture, is still in fleets.js and unused. Left there
       rather than deleted: it carries the Live / In-flow / Stock sections that
       the battery rule and the removed filter group were written against, and
       that is a real distinction this board will want back. */
    data:  () => ALLOC.filter(b => b.mech === ME),
    /* NO filter row. Sagar's call: a mechanic works down what they have been
       given, and twelve bikes sorted with their own on top is a list you read
       rather than one you search. It carried a Section group — Live / In-flow /
       Stock, the three places a bike physically is — and the whole band went with
       it, the button included.

       The sections survive in the DATA and in the battery rule below, so putting
       the group back is these six lines and nothing else:

         {id:"section", label:"Section", quick:true, chips:[
           {id:"live",   label:"Live", dot:true, of: b => b.section === "live"},
           {id:"inflow", label:"In-flow",        of: b => b.section === "inflow"},
           {id:"stock",  label:"Stock",          of: b => b.section === "stock"},
         ]},
         BIKE_TYPE_GROUP,
    */
    filters: [],
    /* No pack reading. Every bike on this list is one the Sr. Mechanic pulled
       out of the yard, and the number in the title identifies it. */
    battery: false,
    head: b => `${b.model} &bull; ${b.id}`,
    /* The same three states the Sr. Mechanic watches, said the same way — one
       builder, so the two profiles cannot describe one bike differently. */
    sub:  b => allocStateHTML(b)
              + (b.state === "done"    ? ` in ${fmtWaitFlat(b.mins)}`
               : b.state === "pending" ? ` since ${fmtWaitFlat(b.mins)}` : ""),
    wait: b => b.state !== "live" ? ""
      : `<span class="wait__live" data-live-from="${allocLiveFrom(b)}">${
           fmtLive(allocLiveFrom(b))}</span>`,
    rowClass: b => b.state === "done" ? "qrow--past" : "",
    tight: true,
    /* What is still to do first, then the one in hand, then what is behind
       them — the order the work moves in. No Sort control on this screen, so
       this is the only ordering there is. */
    sort:  (a, b) => {
      const rank = {pending:0, live:1, done:2};
      return (rank[a.state] - rank[b.state]) || (b.mins - a.mins);
    },
    kind:  "repair",
    /* ONE BIKE IN HAND AT A TIME. Tapping a bike while another is on-going
       raises the same discard-or-cancel dialog a parked task does — it is the
       same rule, and the mechanic should not have to learn it twice. A bike
       that is already the live one is not a conflict with itself, and a
       finished one is not being started. */
    busy: bike => bike.state === "done" ? null
            : ALLOC.find(b => b.mech === ME && b.state === "live" && b.id !== bike.id),
    /* What taking over MEANS: the bike that was in hand goes back to waiting
       with its work discarded, and the one just tapped becomes live with its
       clock at zero. Without this the dialog would ask a question whose answer
       changed nothing. */
    takeOver: (bike, other) => {
      if (other) allocStopWork(other);
      if (bike.state === "pending") allocStartNow(bike);
    },
    guard: true,
    mini:  "repair",
    /* THE BIKE IN HAND, at the foot of the list. Not a parked task — nothing
       was minimised — but the same object: one job, open, and reachable from
       wherever the mechanic is on their list.

       The bar is a placeholder. Nothing here knows how far through a repair is
       — that lives in the RnM dashboard's own tallies — so it shows a fixed
       fraction rather than a number it would be inventing per bike. */
    miniFor: () => {
      const b = ALLOC.find(x => x.mech === ME && x.state === "live");
      return b ? {bike:{id:b.id, model:b.model}, step:"On-going", pct:40} : null;
    },
    openMini: () => {
      const b = ALLOC.find(x => x.mech === ME && x.state === "live");
      if (!b) return;
      BIKE.id = b.id; BIKE.battery = b.battery; BIKE.model = b.model;
      stampBike();
      jobKind = "repair"; jobAt = 0;
      goTo("job");
    },
  },
};
