/* ═══════════════════════════════════════════════════════════════════════════
   TASK LISTING — the template

   One page draws every queue in the app. It reads shared/queue-kinds.js and
   knows nothing else: no queue is named in this file. Assessment pending, QC
   pending and Repairable bikes were three near-identical screens — the same
   chips, the same rows, the same scroll-direction dock — with every identifier
   renamed to keep them from colliding in one bundle. Renaming is not sharing,
   and the copies had already drifted: one sorted by wait, one did not; one
   showed a battery, one showed a dash, one showed nothing.

   The page is fixed in three parts:
     1  header   queue name + open count, average wait under it, search.
     2  filters  a fixed filter button and a scrolling row of quick chips. Slides
                 away as the list scrolls down. Figma 2872:22873.
     3  list     one row per bike: model • charge, number, time waiting.
     4  dock     scan FAB and the parked-task band.

   The Filters / Sort bar that used to close the dock is gone. Filters moved into
   the row and the sheet behind it, which is where a mechanic looks for them, and
   Sort by was never wired — the listing's order is a rule, not a preference.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Below this the pack is flagged. 20 is where a bike stops being able to finish
   an ordinary job, not where it is empty — a mechanic wants warning before it
   strands them, not after. */
const QUEUE_LOW_BATTERY = 20;

let queueKind = "task";
const queueDef = () => QUEUE_KINDS[queueKind];

/* What is selected, per queue: {groupId: [chipId, …]}. Per queue because coming
   back to Repairable bikes should find the view it was left on, not one reset by
   a look at another listing. */
const queueFilterBy = {};
const queueFilters  = () => (queueFilterBy[queueKind] ||= {});

/* The chosen ORDER, per queue and for the same reason: coming back to a listing
   should find the view it was left in. null is not "unsorted" — a list always
   has an order — it is the kind's own default, which is what Reset returns to. */
const queueSortBy = {};
const queueSort   = () => queueSortBy[queueKind] || null;
/* What the list is ACTUALLY ordered by: the mechanic's choice, or the kind's
   stated default standing in for it. The sheet presses this one, and the two
   have to be the same value or the sheet would point at a chip the list is not
   obeying. */
const queueSortLive = () => queueSort() || queueDef().sortDefault || null;

const qTitleEl   = document.getElementById("qTitle");
const qAvgEl     = document.getElementById("qAvg");
const qFiltersEl = document.getElementById("qFilters");
const qListEl    = document.getElementById("qList");
const qEmptyEl   = document.getElementById("qEmpty");
const qDockEl    = document.getElementById("qDock");
const qScreenEl  = document.getElementById("scrQueue");
/* Where the filter band lives when it is NOT riding inside a tab. Looked up by
   selector rather than read off qFiltersEl.parentElement: the build pre-renders
   a queue and bakes the resulting DOM back into the file, so the band may already
   be sitting inside the list when this line runs. */
const qScrollEl  = qScreenEl.querySelector(".qscroller");

/* Chips inside a group are OR, groups are AND. An empty group constrains
   nothing, so no selection at all is the whole queue — see the note on FILTERS
   in queue-kinds.js. */
function queueMatches(bike, selection){
  return (queueDef().filters || []).every(g => {
    const on = selection[g.id] || [];
    if (!on.length) return true;
    return g.chips.some(c => on.includes(c.id) && c.of(bike));
  });
}

/* Longest wait first — a queue is served in the order it formed, and the bike a
   mechanic should act on is the one that has been sitting there. A kind can
   override it; Repairable bikes puts the mechanic's own on top first. Copy
   before sorting, so the underlying fleet keeps its own order. */
function queueBikes(){
  const def = queueDef(), sel = queueFilters(), srt = queueSortLive();
  const rows = def.data().filter(b => queueMatches(b, sel)).slice();
  /* A chosen order beats the kind's default. Looked up by id rather than
     trusted from the stored state: a queue can be left sorted, its kind edited
     to drop that option, and the stale id would otherwise sort by undefined. */
  const opt = srt && (def.sorts || []).find(o => o.id === srt.id);
  if (opt) return queueReviveFirst(rows.sort((a, b) => {
    const va = opt.of(a), vb = opt.of(b);
    /* MISSING VALUES SINK, both ways. A bike with no pack reading has no place
       on a battery order, and floating it to the top of ascending — where
       null - number is NaN and the comparator gives up — would put the rows
       that answer the question least where the eye lands first. */
    const na = va == null, nb = vb == null;
    if (na || nb) return na && nb ? 0 : na ? 1 : -1;
    return srt.dir === "asc" ? va - vb : vb - va;
  }));
  return queueReviveFirst(rows.sort(def.sort || ((a, b) => b.waitMins - a.waitMins)));
}

/* BIKES ON CHARGE SIT ON TOP — Figma 2982:1400. Applied after the order, not
   instead of it: the rest of the board keeps whatever the kind or the sort sheet
   asked for, and these are lifted out of it.

   Above the board rather than in their place in it because they are not work
   waiting to be picked up — they are work already running, and a mechanic
   scanning for the next bike needs to see what is on charge before they see what
   is not. Oldest first, so the one about to come back is the one at the top.

   Not conditional on the queue: only FLEET carries reviving bikes today, so only
   the assessment board has any, and a listing with none is unchanged. */
function queueReviveFirst(rows){
  const on = rows.filter(b => onRevival(b.id));
  if (!on.length) return rows;
  /* REVIVED ABOVE CHARGING. A bike that has reported in is waiting on a person —
     somebody has to go and take it off the charger — where one still charging is
     waiting on itself. The row that needs a hand goes where a hand looks first.
     Within each phase, oldest first: the longest wait is the nearest to done. */
  on.sort((a, b) =>
    (isRevived(b.id) - isRevived(a.id))
    || (REVIVAL[a.id].startedAt - REVIVAL[b.id].startedAt));
  return on.concat(rows.filter(b => !onRevival(b.id)));
}

/* Whether this bike shows a reading. `battery` is true, false, "dash", or a
   predicate — Repairable bikes only shows one on Live. */
function queueShowsBattery(bike){
  const b = queueDef().battery;
  return typeof b === "function" ? b(bike) : !!b;
}
/* The pack comes OUT before an assessment is signed off, so every bike on
   Assessment done has no reading to give. It still shows the slot — "Dex NV •
   -- %" — rather than dropping it the way QC pending does, because on that queue
   no bike ever has a pack and here the same row carried a number an hour ago:
   the empty slot is the fact, and a row that silently lost half its title would
   read as a different kind of row.

   Rendered rather than stored. The bikes keep the last reading they had, which
   is what the dashboard's vitals card still shows once one is opened; this queue
   is the one place that knows the pack has since been pulled. Worth revisiting
   together with QC pending, which answers the same question differently. */
const queueDashesBattery = bike => {
  const b = queueDef().dash;
  return typeof b === "function" ? b(bike) : queueDef().battery === "dash";
};

/* Every chip in the app lands here — the quick ones in the row and the ones in
   the sheet, which commit on tap too now that the sheet has no Apply. One place
   that re-renders and one place that returns the list to the top: a filter that
   left you scrolled into the middle of a set you have not seen is disorienting. */
function applyQueueFilters(selection){
  queueFilterBy[queueKind] = selection;
  renderQueue();
  qListEl.scrollTop = 0; qLastY = 0; queueDockVisible(true);
  /* Keep the sheet honest if it is open over the top of this — the same chip
     exists in both places, and a quick chip tapped in the row has to leave the
     sheet's copy of it pressed. */
  if (typeof fltSyncOpen === "function") fltSyncOpen();
}

/* The order changed. Same shape as applyQueueFilters and for the same reasons:
   one place that re-renders, one place that returns the list to the top. A
   re-order leaves every row on screen but in a different place, so a mechanic
   left scrolled halfway would be looking at a set they never chose. */
function applyQueueSort(sort){
  if (sort) queueSortBy[queueKind] = sort;
  else delete queueSortBy[queueKind];
  renderQueue();
  qListEl.scrollTop = 0; qLastY = 0; queueDockVisible(true);
}

/* One row of the listing. 24 + 20 + 8 + 16 + 24 = 92 — Figma 2872:22873, and
   2902:31870 draws the same row inside the accordions. */
function queueRowHTML(b){
  const shows = queueShowsBattery(b);
  /* Red is a warning, not a state. A healthy reading is just information, so it
     takes the same colour as the text around it; only a pack that will not get
     through the job earns a colour of its own. */
  /* Per BIKE now, not per queue: Assessment pending carries a Transfer done
     section, and a bike in it has had its pack pulled while the ones above it
     have not. */
  const dash = queueDashesBattery(b);
  /* Out of this queue's hands. On Assessment pending the Transfer done rows are
     bikes the QCA has already walked to the Sr. Mechanic's bay: still worth
     seeing, not still theirs — so the row is drawn back in the greys rather than
     competing with the work above it for attention. */
  const muted = typeof queueDef().muted === "function" && queueDef().muted(b);
  /* The right-hand column: an elapsed wait, or the clock time the bike was
     handed over. Only where the queue asks for it AND the bike carries a stamp. */
  const clock = typeof queueDef().clock === "function"
    && queueDef().clock(b) && b.doneAt != null;
  /* Never red on a dash: there is no pack to warn about. */
  /* NOT WHILE IT IS COMING BACK. A bike that has just reported in is at 5% and
     climbing on a charger — red there would be warning about the one bike on the
     board nobody needs to worry about. It goes back to the ordinary rule the
     moment the QCA takes it off charge. A bike still CHARGING keeps its red: it
     is flat, that is why it is there, and the frame draws it so. */
  const low = shows && !dash && b.battery !== null && b.battery < QUEUE_LOW_BATTERY
              && !isRevived(b.id);
  /* Model and charge are one line, and the number is the quiet second. The charge
     moved up into the title because it is part of what you are choosing between;
     the number identifies the bike once you have chosen. A queue that shows no
     reading simply has no second half. */
  /* THREE HOOKS, all optional and all defaulting to what every queue had. A
     kind that wants a different row says so rather than the row growing a
     branch per queue — Allocated bikes is the first to use them: no pack
     reading, the number in the title beside the model, the mechanic's name
     underneath, and their face in front. */
  const def = queueDef();
  /* ON CHARGE, in one of two phases. The row keeps the left-hand column it
     always had — the pack reading is still the fact you need — and replaces the
     right, where a wait would otherwise be. It is not waiting: it is running. */
  const reviving = isReviving(b.id);
  const revived  = isRevived(b.id);
  const head = typeof def.head === "function" ? def.head(b)
    : shows
      ? `${b.model} &bull; <span class="pct">${dash ? "-- %" : b.battery + "%"}</span>`
      : b.model;
  /* THE ZONE RIDES ON THE BIKE, not on the queue — see TRANSFER_ZONES. Only a
     transferred bike carries one, so the same default line covers both halves of
     a listing: the number alone while the bike is still yours, the number and
     where you left it once it is not. A kind with its own `sub` is untouched. */
  const sub = typeof def.sub === "function" ? def.sub(b)
    : `${b.id}${b.zone ? ` &bull; ${esc(b.zone)}` : ""}${
        b.mine ? ' &bull; <span class="mine">Assigned to me</span>' : ""}`;
  const art = typeof def.art === "function" ? def.art(b) : "";
  const extra = typeof def.rowClass === "function" ? def.rowClass(b) : "";
  return `
      <button class="qrow${low ? " is-low" : ""}${muted ? " is-muted" : ""}${
        art ? " qrow--art" : ""}${
        /* BOTH classes on a revived row. is-reviving means "in the stack" — the
           tint, the two-line right column, and everything asking whether a row
           is on the board at all; is-revived is the second phase on top of it.
           One class per state would have every selector name two things. */
        reviving || revived ? " is-reviving" : ""}${
        revived ? " is-revived" : ""}${
        extra ? " " + extra : ""}" data-qbike="${b.id}">
        ${art}
        <span class="who">
          <span class="id t-label-md">${head}</span>
          <span class="sub t-label-sm">${sub}</span>
        </span>
        <span class="wait t-label-md">${
          /* TWO LINES ON A REVIVING ROW, mirroring the left: the state on the
             title's line, how long it has been on charge under it. The clock is
             the shared one — data-live-from is walked every second by the
             interval below, so the row does not own a timer and a repaint costs
             it nothing. */
          /* TWO LINES, mirroring the left: the state on the title's line with its
             glyph, how long under it. The clock is the app's one interval —
             data-live-from is walked every second, so no row owns a timer and a
             repaint costs nothing. Figma 2982:1404. */
          revived
            ? `<span class="wait__st">${ICON.charger}Revived</span>
               <span class="wait__since t-label-sm" data-live-from="${REVIVAL[b.id].pingedAt}"
                     data-live-fmt="ago">${fmtAgo(REVIVAL[b.id].pingedAt)}</span>`
          : reviving
            ? `<span class="wait__st">${ICON.boltBoost}reviving&hellip;</span>
               <span class="wait__since t-label-sm" data-live-from="${REVIVAL[b.id].startedAt}"
                     data-live-fmt="since">${fmtSince(REVIVAL[b.id].startedAt)}</span>`
          :
          /* PER QUEUE, not per bike. The clock time is the QCA's own record —
             "I finished that one at 8:05" — and it belongs on the QCA's board.
             The same bike on the Sr. Mechanic's Unallocated board goes back to
             a wait, because the question there is a different one: how long
             this has been sitting in the yard unallocated, not when somebody
             else stopped working on it. Declared by the kind; see `clock`.

             A kind can also replace the figure outright — Allocated bikes does,
             because its rows measure three different things. */
          clock ? `<span class="wait__at">${fmtClock(b.doneAt)}</span>`
                : typeof def.wait === "function" ? def.wait(b)
                : fmtWaitShort(b.waitMins)
        }</span>
      </button>`;
}

/* Which accordions are open, per queue and per section. The FIRST is open on
   arrival and the rest are shut — Figma 2902:31870. Remembered rather than reset,
   so a QCA who shut one and went to look at a bike comes back to the page they
   left. */
const qSecOpen = {};
const qSecKey  = id => queueKind + "/" + id;
function qSecIsOpen(sec, i){
  const k = qSecKey(sec.id);
  /* First open, unless the kind says otherwise. Allocated bikes says otherwise:
     its sections are four people, and opening one would say that person was
     the one to look at. */
  if (!(k in qSecOpen)) qSecOpen[k] = queueDef().openFirst !== false && i === 0;
  return qSecOpen[k];
}

/* The same sections drawn as a TAB STRIP instead of accordion heads. One section
   on screen at a time, which is right where the two are different jobs rather
   than two halves of one record — see QUEUE_KINDS.allocation.

   Reuses the .steptabs component, so a tab looks the same wherever it appears.
   The strip is a child of the list rather than fixed chrome, because this
   template has no place for a band between the header and the scroller and
   inventing one would mean a fourth top-offset rule. */
function queueTabsHTML(sections, bikes){
  const active = queueActiveSection(sections);
  /* THE COUNT IS OF THE WHOLE TAB, not of the filtered view — the same rule the
     title above and the quick chips already follow. A tab says how much is on
     that board; a filter is a way of looking at it, not a change to it. Counting
     the view also broke the OTHER tab: narrowing Pending to one model dropped
     Transfer done's count too, so the strip reported the filter rather than the
     boards. Rows still come from the filtered set. */
  const all = queueDef().data();
  return `<nav class="steptabs qsec-tabs" role="tablist">` + sections.map(sec => {
    const on = sec.id === active.id;
    return `<button class="steptab${on ? " is-on" : ""}" type="button" role="tab"
                    data-qsec="${sec.id}" aria-selected="${on}">
        <span class="t-label-md">${sec.label}</span>
        <span class="t-label-md steptab__n">${all.filter(sec.of).length}</span>
      </button>`;
  }).join("") + `</nav>`
    /* THE BOARD'S OWN NOTE, between the strip and the rows — see `note` on the
       section. It scrolls with the list rather than pinning under the tabs: it
       is read once on arrival and then it is in the way, and a tab whose note
       held its place while the rows moved under it would read as chrome for the
       screen rather than as the head of this one board. */
    + (active.note ? `<div class="qnote t-label-md">${active.note}</div>` : "")
    + bikes.filter(active.of).map(queueRowHTML).join("");
}

/* Which tab is open, per queue. First on arrival, remembered after — a Sr.
   Mechanic who was working the allocated side and went to look at a bike comes
   back to the side they left. */
const qTabBy = {};
function queueActiveSection(sections){
  const id = qTabBy[queueKind];
  return sections.find(s => s.id === id) || sections[0];
}

/* Heads and rows as SIBLINGS, not head-wraps-rows. The last head sticks to the
   bottom of the scroller while it is shut (see .qsec-head--foot), and a sticky
   element can only travel inside its own containing block — wrapped, that block
   would be the head's own 68px and it could not move at all. Flat, the block is
   the whole list and it pins where the frame draws it.

   Figma 2902:31870: 68px head, title left 24, count right-aligned 64 from the
   edge, chevron 24 from it. Pointing DOWN when the section is open and RIGHT
   when it is shut — the arrow shows what a tap will do to the list below. */
function queueSectionsHTML(sections, bikes){
  return sections.map((sec, i) => {
    const mine = bikes.filter(sec.of);
    const open = qSecIsOpen(sec, i);
    const last = i === sections.length - 1;
    /* A section can draw its own head. Allocated bikes does — its heads are
       people, with a face and a two-line body, where every other queue's is a
       label and a count. The chevron stays the template's either way: what a
       tap does to the list below is not the section's business. */
    const body = typeof sec.head === "function"
      ? sec.head(mine)
      : `<span class="t-label-md700">${sec.label}</span>
         <span class="qsec-head__n t-label-md700">${mine.length}</span>`;
    /* The pinned foot is OPT IN — see `stickyFoot`. Assessment done wants it:
       two sections over one list, and the second head holds its place at the
       floor so a long first section cannot hide it. The Allocated board does
       not: four people, and a head that stopped at the bottom while the list
       scrolled under it read as a fifth thing pinned to the screen rather than
       as the last of four. There the heads are rows and they scroll. */
    const pin = last && queueDef().stickyFoot;
    return `
      <button class="qsec-head${sec.head ? " qsec-head--tall" : ""}${
                pin ? " qsec-head--foot" : ""}${open ? " is-open" : ""}"
              type="button" data-qsec="${sec.id}" aria-expanded="${open}">
        ${body}
        <span class="qsec-head__go" aria-hidden="true">${ICON.chevronDown}</span>
      </button>` + (open ? mine.map(queueRowHTML).join("") : "");
  }).join("");
}

function renderQueue(){
  const def = queueDef();
  const bikes = queueBikes();
  const sel = queueFilters();

  /* The count is of the whole queue, not the filtered view: it answers "how much
     is on my plate", which a filter does not change. The average below it IS the
     view's, because that one is about what is in front of you.

     `headline` where the page carries rows that are not its own work — Assessment
     pending lists what has been transferred out as a second section, and counting
     those in the title would have the page disagree with the home card that
     opened it. */
  const headline = def.headline ? def.headline() : def.data();
  /* The count comes OFF a queue whose tabs already carry one. On Assessment and
     fault marking the strip reads "Pending 10" a few pixels below a title saying
     "· 10", which is the same number twice — and the title's was the weaker of
     the two, because it counts one tab while sitting over both. A flat queue has
     nothing else stating it, so there it stays. */
  qTitleEl.textContent = def.sectionsAs === "tabs"
    ? def.title : `${def.title} · ${headline.length}`;

  /* THE FILTER BAR IS A COMPONENT — shared/filterbar.js. This screen hands it
     the kind's groups, its own selection and the rows to count against, and
     gets back the whole band: All, the quick chips, the scrolling run and the
     button that opens the rest in a sheet. Everything it used to do inline —
     building chips, the All state, lighting the button, the tap handling — went
     with it, so a second screen can have the same control by calling the same
     function. */
  paintFilterBar(qFiltersEl, {
    groups:    def.filters || [],
    selection: sel,
    /* The whole queue, not the filtered view: a count that fell to nothing as
       you narrowed would report what you had already done. `headline` where the
       page carries rows that are not its own work. */
    data:      headline,
    onChange:  applyQueueFilters,
    /* Declared by the kind, like the filters above — a queue with nothing worth
       ordering by gets no Sort button rather than an empty sheet. */
    sorts:     def.sorts || [],
    /* The CHOICE, not the live value — the bar needs to know whether the
       mechanic has moved off the default, which is what Reset keys off. */
    sort:      queueSort(),
    sortDefault: def.sortDefault || null,
    onSort:    applyQueueSort,
  });

  /* Sectioned or flat, the list is the same rows — see queueRowHTML. A queue
     that declares `sections` gets an accordion head before each group; one that
     does not gets what it always got. */
  const tabMode = !!def.sections && def.sectionsAs === "tabs";
  qListEl.innerHTML = !def.sections ? bikes.map(queueRowHTML).join("")
    : tabMode ? queueTabsHTML(def.sections, bikes)
    : queueSectionsHTML(def.sections, bikes);

  /* The filter row is optional. Assessment done has no filters to offer, and a
     72px band holding one disabled-looking button is worse than no band — so the
     row goes and the list takes the space back.

     In TAB mode it is optional per TAB. The band belongs to the board you are
     looking at — Pending is filterable, Transfer done is not — and a band that
     stayed put while the board under it changed would look like chrome for the
     screen when it is chrome for one tab. So it moves INTO the list, under the
     sticky strip and above the rows, and scrolls away with them. */
  const tabSec     = tabMode ? queueActiveSection(def.sections) : null;
  const hasFilters = (def.filters || []).length > 0 && !(tabSec && tabSec.noFilters);
  /* The strip goes into the list on ANY tab queue — a tab with no filter band
     still has an average, and leaving it pinned above the strip would put a fact
     about one board over both of them. */
  const inList     = tabMode;
  qFiltersEl.hidden = !hasFilters;
  /* The average belongs to the board too — see noAvg on the section. When it
     goes, the dock comes back down to the floor and the list stops padding for
     it, so the strip leaves no hole behind. */
  const hasAvg = !def.noAvg && !(tabSec && tabSec.noAvg);
  document.getElementById("qAvgBar").hidden = !hasAvg;
  qScreenEl.classList.toggle("has-avg", hasAvg);
  /* Shorter rows, for a listing read inside an accordion — see `tight`. */
  qScreenEl.classList.toggle("q-tight", !!def.tight);
  /* And the scan button — see noFab. Hidden rather than disabled: a control you
     can see and cannot use is a question the screen has to keep answering. */
  qScreenEl.classList.toggle("no-fab", !!(tabSec && tabSec.noFab));
  /* MOVED, not rebuilt — the nodes keep their ids, their chips and their
     listeners. The average strip travels with the band: it is a fact about the
     list under it, so on a tab queue it belongs inside the tab too. */
  if (inList) qListEl.insertBefore(qFiltersEl, qListEl.querySelector(".qsec-tabs").nextSibling);
  else if (qFiltersEl.parentElement !== qScrollEl) qScrollEl.insertBefore(qFiltersEl, qListEl);
  /* The 72px of top padding is the absolute band's clearance. In the list the
     band is in flow and makes its own room, so the list must not pad for it too. */
  qScreenEl.classList.toggle("has-filters", hasFilters && !inList);
  qScreenEl.classList.toggle("filters-inlist", inList);
  /* Nothing to slide out of the way once it scrolls with the rows. */
  if (inList) qFiltersEl.classList.remove("is-up");
  /* A shut head at the foot of the list — see .qsec-head--foot. It gives up the
     list's bottom padding, because a sticky element is measured against the
     scrollport and padding would hold it off the floor. */
  /* Accordion mode only. In tab mode there is no head at the foot of the list to
     pin — the strip is at the TOP — and treating the last tab as a shut
     accordion took the list's bottom padding away, so the last row sat under the
     scan button. */
  const shutFoot = !!def.sections && def.sectionsAs !== "tabs" && !!def.stickyFoot
    && !qSecIsOpen(def.sections[def.sections.length - 1], def.sections.length - 1);
  qScreenEl.classList.toggle("has-foot", shutFoot);
  /* GONE WITH THE LIFT: a measurement of whether that head was actually PINNED,
     which is a different question and the only thing the scan button cared
     about. The button is fixed in place now — see the removal note in
     style.css — so nothing has to ask. `shutFoot` still decides the padding. */
  qEmptyEl.hidden = bikes.length > 0;
  /* In tab mode the list is never hidden: the tab strip is INSIDE it, and hiding
     the list on an empty tab took away the only way back to the other one. The
     empty state is an absolute overlay inset 72 from the top, so it sits below
     the strip rather than over it. */
  qListEl.style.display = (bikes.length || tabMode) ? "" : "none";

  /* The whole queue, not the filtered view — the same denominator as the count
     above it. It is a measure of how this queue is being served since the
     mechanic came on shift, so it has to hold still while they look through it:
     an average that moved every time a chip was tapped would be reporting the
     filter, not their pace. It falls as they clear bikes and rises while they
     are stalled, which is the only thing it should respond to. */
  const avg = headline.length
    ? Math.round(headline.reduce((a, b) => a + b.waitMins, 0) / headline.length) : 0;
  /* One sentence on every queue. Assessment done carried its own for a build —
     "Avg. time since assessment", on the grounds that nothing in that list is
     waiting — and Sagar took it back to this. The per-kind override went with it
     rather than being left unread. */
  qAvgEl.textContent = `Avg. wait time: ${headline.length ? fmtWait(avg) : "—"}`;

  renderMinis();
}

/* NO LISTENERS HERE for the chips or the filter button. Both moved into
   shared/filterbar.js with the rest of the band — the component binds one
   delegated listener at load and calls back through onChange, which is
   applyQueueFilters above. See the note there on why binding inside a paint is
   the one thing that cannot work in this build. */

/* ── THE LIVE CLOCK ──────────────────────────────────────────────────────────
   One interval for the whole app, started at LOAD — not inside a paint. The
   build pre-renders the page and writes the resulting DOM back, so anything
   started the first time a list is drawn is started once, at build time, in a
   browser that is thrown away. Same trap the tab strip's listener fell into.

   It walks whatever [data-live-from] happens to be on screen, so a repaint that
   replaces the elements costs it nothing and a screen with none costs a query
   per second. The anchor is on the element, so the clock survives the repaint
   the way it could not if the elapsed time were counted here.
   ─────────────────────────────────────────────────────────────────────────── */
setInterval(() => {
  document.querySelectorAll("[data-live-from]").forEach(el => {
    /* Two shapes now. A job being worked on counts in seconds; a bike on charge
       counts in whole minutes — see fmtSince. The node says which it wants, so
       the one interval still serves both and neither owns a timer. */
    el.textContent = el.dataset.liveFmt === "since" ? fmtSince(+el.dataset.liveFrom)
      : el.dataset.liveFmt === "ago" ? fmtAgo(+el.dataset.liveFrom)
      : fmtLive(+el.dataset.liveFrom);
  });
}, 1000);

/* Picking a bike is what carries it into the flow. Which task that starts is the
   queue's own business — the row does not know. */
qListEl.addEventListener("click", e => {
  const head = e.target.closest("[data-qsec]");
  if (head){
    /* A TAB selects; an accordion head toggles. Same attribute, because both are
       the same section list — what differs is what the kind asked for. */
    if (queueDef().sectionsAs === "tabs"){
      qTabBy[queueKind] = head.dataset.qsec;
      renderQueue();
      qListEl.scrollTop = 0;
      return;
    }
    const k = qSecKey(head.dataset.qsec);
    qSecOpen[k] = !qSecOpen[k];
    renderQueue();
    return;
  }
  const row = e.target.closest("[data-qbike]");
  if (!row) return;
  const def  = queueDef();
  const bike = def.data().find(b => b.id === row.dataset.qbike);
  if (!bike) return;
  const start = () => {
    /* Off by default. Only openFinishedJob turns it back on, so a live task can
       never inherit the record state from a bike looked at a moment earlier —
       the same class of bug as the working set not being reset between bikes. */
    jobDoneBike = null;
    BIKE.id = bike.id;
    BIKE.battery = bike.battery;
    BIKE.model = bike.model;
    stampBike();
    /* A kind may take over from here — the two assessment queues do, because one
       has to clear the working set and the other has to load a finished one into
       it. Still no queue named in this file: the hook is the kind's, and the
       default below is what a queue with nothing special to say gets. */
    if (def.open) { def.open(bike); return; }
    jobKind = def.kind; jobAt = jobEntryStep();
    goTo("job");
  };
  /* TWO GUARDS, and they ask the same question about different things.

     `busy` is a task already IN HAND — the mechanic's own list has one bike
     being worked on, and the app allows exactly one. `guard` is a task PARKED
     on the dock. A queue can have either, both, or neither.

     The kind says what a conflict is and what taking over means, because only
     it knows: this file names no queue. */
  const busy = typeof def.busy === "function" ? def.busy(bike) : null;
  const take = () => { if (def.takeOver) def.takeOver(bike, busy); start(); };
  if (busy){
    guardBusyTask(busy, MINI_NOUN[def.kind] || "task", take);
    return;
  }
  if (!def.guard || guardNewTask(def.kind, bike.id, start)) take();
});

document.getElementById("qBack").addEventListener("click", () => goTo("home"));
document.getElementById("qSearch").addEventListener("click", () => toast("Search — not wired yet"));
document.getElementById("qScanFab").addEventListener("click", () => toast("Scan bike — not wired yet"));

/* ── The dock ─────────────────────────────────────────────────────────────────
   Scrolling down hands the screen to the list; scrolling up brings the filter row
   back. 8px of slack so trackpad and finger noise cannot make it flicker.

   Only the filter row moves now. The dock used to drop by the Filters / Sort
   bar's height so the FAB fell into the space it vacated; with no bar there is
   no space to fall into, and moving the FAB would take it off the frame.
   ─────────────────────────────────────────────────────────────────────────── */
const Q_DOCK_SLACK = 8;
let qLastY = 0;

function queueDockVisible(v){
  /* Only the absolute band travels. In the list it scrolls away by itself, and
     translating it as well would slide it over the rows. */
  if (qScreenEl.classList.contains("filters-inlist")) return;
  qFiltersEl.classList.toggle("is-up", !v);
}

qListEl.addEventListener("scroll", () => {
  const y = qListEl.scrollTop;
  const dy = y - qLastY;
  if (Math.abs(dy) < Q_DOCK_SLACK) return;
  qLastY = y;
  queueDockVisible(dy < 0 || y <= 0);
}, {passive:true});

/* Called by the router with the route name, which is also the kind. Each queue
   keeps its own filters and starts at the top of its list. */
function enterQueue(name){
  if (name && QUEUE_KINDS[name]) queueKind = name;
  renderQueue();
  qListEl.scrollTop = 0;
  qLastY = 0;
  queueDockVisible(true);
}
