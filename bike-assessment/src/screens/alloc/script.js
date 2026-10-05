/* ═══════════════════════════════════════════════════════════════════════════
   ALLOCATE A BIKE — the Sr. Mechanic's task detail page
   ═══════════════════════════════════════════════════════════════════════════
   A DRAFT. Sagar asked for a task detail page with the information laid out in
   a dummy form to edit, so the shape is the point and the content is not
   precious. What is real is marked; what is invented is marked too, and the
   invented parts are kept in one array each so they can be replaced wholesale.

   Own screen, not the shared task template — the rule from the Repairable bikes
   block is that nothing tapped inside one profile's board opens another
   profile's flow, and the template is the MECHANIC's job page.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){

  /* THE ROSTER IS SHARED — MECHANICS in shared/fleets.js. It lived here until
     the Allocated board started naming the same people on its rows; two lists
     of four names would have drifted on the first edit. Still invented, and
     still the one place to replace when a real roster exists. */
  const MECHS = MECHANICS;

  /* The silhouette moved to the shared icon set for the same reason — the board
     draws it too. See ICON.face. */
  const FACE = ICON.face;

  /* INVENTED. One reading for every bike, because there is no per-bike odometer
     anywhere in the app — it stands where a real one would go. */
  const ODO = "7,245 kms";

  /* Local, not in the shared ICON set. A control that exists on one draft screen
     does not belong in a registry every screen loads. */
  const RADIO = on => on
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10.25" stroke="#222222" stroke-width="1.5"/><circle cx="12" cy="12" r="6" fill="#222222"/></svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10.25" stroke="#B0B0B0" stroke-width="1.5"/></svg>`;

  /* Which of the three sections are open. Shut on arrival and shut again on
     every bike: the page is a decision, and the lists are evidence you reach
     for rather than a scroll you land in. */
  const accOpen = {mech:false, elec:false, cl:false};

  /* WHAT THE MECHANIC DID, once the work is over. Three kinds of row and three
     words, because they close in three different ways: a part is fixed by hand,
     a diagnostic is resolved when the bike stops reporting it, and a checklist
     is completed by being walked.

     ONLY ON A FINISHED BIKE. A row that said "Fixed" on a bike nobody has
     started would be the page inventing work — and there is nowhere yet that
     records a per-fault outcome, so even on a finished one these are dealt
     rather than read. Fixed and Repaired alternate; the real thing is a word
     the mechanic chooses per fault. */
  const outcomeMech = i => (i % 2 ? "Repaired" : "Fixed");
  const outMark = txt => `<span class="al-out t-label-sm">${txt}</span>`;
  const showOutcomes = () => !!allocBike && allocBike.state === "done";

  let allocBike = null;
  let allocPick = null;
  let sheetOpen = false;
  /* TWO MODES, one page. "allocate" is the decision — an unallocated bike, with
     the picker behind the CTA. "progress" is the same evidence read about a
     bike that already has a mechanic: same banner, same three sections, no CTA,
     because there is nothing left to decide. The breadcrumb says which state
     the bike is in, so the page is not silent about why the button is gone.

     One page rather than two, because the two would drift: the sections are the
     bike's faults and its checklists, and those are the same facts whoever is
     looking. What changes is whether you can act on them. */
  const ALLOC_CRUMB = {pending:"Waiting", live:"In progress", done:"Finished"};
  let allocMode = "allocate";
  let allocBack = "allocation";

  /* Entry point. Called from QUEUE_KINDS.allocation's open. The bike is whatever
     the board handed over: a real transferred bike, which carries an assessment
     record, or one of the 27 synthetic ALLOC rows, which does not. */
  function openAllocation(bike, mode){
    allocBike = bike;
    allocMode = mode === "progress" ? "progress" : "allocate";
    allocBack = allocMode === "progress" ? "allocated" : "allocation";
    allocPick = null;
    closeSheet();
    accOpen.mech = accOpen.elec = accOpen.cl = false;
    renderAlloc();
    /* Top of the page, bar showing. Arriving on a bike with the header already
       collapsed — because the last bike was scrolled — would be a page missing
       its back arrow. */
    document.getElementById("scrAlloc").classList.remove("hdr-up");
    document.getElementById("allocScroll").scrollTop = 0;
    alLastY = 0;
    alUnlock();
    goTo("alloc");
  }
  window.openAllocation = openAllocation;

  function renderAlloc(){
    const b = allocBike;
    if (!b) return;

    /* REAL — id, model, and the same wait figure the row on the board showed. */
    /* SWAPPED, watching: the BIKE goes in the bar and the PERSON heads the
       banner. The bar is the page's address — which bike you are looking at —
       and it stays put while the page scrolls; the banner is the subject, and
       on a bike somebody already has, the subject is who has it and what they
       are doing with it. It read the other way round for a build and put the
       bike's name twice on screen, a line apart.

       Allocating, there is no name to head anything with, so the bar keeps the
       app's usual "<bike> / <what this page is>". */
    const watchingBar = allocMode === "progress";
    document.getElementById("allocMore").hidden = !(watchingBar && b.state === "live");
    /* Same square tile the board's heads and the picker's rows carry — the
       three screens name the same four people. */
    const face = document.getElementById("allocFace");
    face.hidden = !watchingBar;
    if (watchingBar && !face.firstElementChild) face.innerHTML = ICON.face;
    document.getElementById("allocCrumb").textContent =
      watchingBar ? `${b.model} \u2022 ${b.id}` : b.id;
    document.querySelector("#scrAlloc .appbar__suffix").innerHTML =
      watchingBar ? "" : "&nbsp;/ Allocate bike";
    /* The footer holds one or the other, never both: the button when there is a
       decision to take, the two figures when there is not. */
    const watching = allocMode === "progress";
    document.getElementById("allocGo").hidden = watching;
    document.getElementById("allocMetrics").hidden = !watching;
    if (watching) paintMetrics(b);
    document.getElementById("allocTitle").textContent =
      allocMode === "progress" ? (mechName(b.mech) || "Allocated")
                               : `${b.model} \u2022 ${b.id}`;
    /* THE ROW, REPEATED. The banner says exactly what the list item said — the
       model and the pack reading on the first line, the number on the second —
       so the page you land on is visibly the thing you tapped. It carried the
       model alone over "number · odometer", which was two different sentences
       about the same bike a scroll apart.

       The odometer went with the change. It was invented anyway, and this
       banner is now a quotation rather than a summary; a figure that is in one
       and not the other is what makes the two stop matching. */
    /* WHAT THE LINE ANSWERS DEPENDS ON THE PAGE.

       Allocating, it is the fault counts — the sizing you tapped, which the
       three sections below then give in full. It is the row's own second line,
       verbatim, from one builder, so the two can never word it differently.

       Watching, the counts are already in the section heads two lines down and
       the thing you cannot see anywhere else is where the bike has GOT to. So
       the banner carries the state and its mark, and the name of the person
       holding it is in the bar above. */
    document.getElementById("allocSub").innerHTML =
      allocMode === "progress" ? allocStateHTML(b) : faultSummary(b);

    paintFaults();
    paintElec();
    paintChecks();
    paintMechs();
    paintCta();
  }

  const faults = () => (allocBike && allocBike.assessment && allocBike.assessment.faults) || [];
  const faultCount = () => faults().length;

  /* MECHANICAL — real where there is a record, drawn as the fault record draws
     them: a 56px crop of the part, its name, and the reasons that were picked.

     The picture is not in the record — the record holds a finding, not a render
     — so it is looked up by part name in the catalogue and cropped with the same
     helper the checklist and the fault record use. A part with no photo falls
     through to an empty tile rather than to somebody else's picture.

     The synthetic bikes have no record at all, and that is SAID rather than shown
     as an empty box: a blank panel reads as "no faults found", which is a finding
     this page has not got. */
  function paintFaults(){
    const el = document.getElementById("allocFaults");
    const f  = faults();
    if (!f.length){
      document.getElementById("allocMechN").textContent = accCount(0);
      paintAcc("mech", "allocFaults", "allocMechSub", []);
      el.innerHTML = `<p class="al-empty t-label-md">`
        + (allocBike && allocBike.assessment
            ? `No mechanical faults on this assessment.`
            : `No assessment on file for this bike — placeholder row, real data to come.`)
        + `</p>`;
      return;
    }
    document.getElementById("allocMechN").textContent = accCount(f.length);
    paintAcc("mech", "allocFaults", "allocMechSub", f.map(x => x.part));
    el.innerHTML = f.map((x, i) => {
      const part  = PARTS.find(p => p.name === x.part);
      const style = part ? cropStyle(partImageURL(part), part.crop, 56) : "";
      /* Most of the catalogue has no render — only the five parts the checklist
         was drawn against do — so the tile falls back to the same no-photo glyph
         thumbHTML uses rather than to an empty grey square or to somebody else's
         picture. The tile stays either way, so the rows still line up. */
      return `<div class="issue">
        <div class="issue__thumb${style ? "" : " issue__thumb--none"}">${
          style ? `<div class="issue__crop" style="${style}"></div>` : ICON.noPhoto(24)
        }</div>
        <div class="issue__main">
          <span class="issue__head">
            <span class="t-label-md issue__name">${esc(x.part)}</span>
          </span>
          <div class="t-label-md issue__reasons">${
            (x.reasons || []).map(r => `<span>${esc(r)}</span>`)
              .join('<span class="issue__dot" aria-hidden="true"></span>')
          }</div>
        </div>
        ${showOutcomes() ? outMark(outcomeMech(i)) : ""}
      </div>`;
    }).join("");
  }

  /* ELECTRICAL — what the bike reported. A line of text and nothing else: no
     picture, no reasons, and no control, because settling one of these means
     re-running the checks and that happens in the repair flow, not here. */
  function paintElec(){
    /* THIS BIKE'S, not the app's whole diagnostic set — see bikeElectrical. A
       bike that reported one fault must not list three here and two on the row
       that opened it. */
    const rows = bikeElectrical(allocBike);
    document.getElementById("allocElecN").textContent = accCount(rows.length);
    paintAcc("elec", "allocElec", "allocElecSub", rows);
    document.getElementById("allocElec").innerHTML = !rows.length
      ? `<p class="al-empty t-label-md">No electrical faults reported.</p>`
      : rows.map(f => `<div class="issue issue--plain">
          <span class="issue__plainMain">
            <span class="t-label-md issue__name">${esc(f)}</span>
          </span>
          ${showOutcomes() ? outMark("Resolved") : ""}
        </div>`).join("");
  }

  /* INVENTED throughout. Whole row is the target, per the rule set on the
     checklist picker: a list item is clickable anywhere on it, not just on its
     control. Radio, not checkbox — a bike goes to one mechanic. */
  function paintMechs(){
    document.getElementById("allocWho").innerHTML = MECHS.map(m => {
      const on = m.id === allocPick;
      /* THE SAME BLOCKS the Allocated board draws — .mblocks, shared. This row
         said "Working · 1/3 done" with a status ring beside it; the blocks say
         that and the thing the line could not, which is how much room the
         person has. It is the whole question being asked here, and the two
         screens name the same four people, so they must not describe them
         differently. */
      return `<button class="al-mech${on ? " is-on" : ""}" type="button"
                 role="radio" aria-checked="${on}" data-alloc-mech="${m.id}">
          <span class="al-mech__f" aria-hidden="true">${FACE}</span>
          <span class="al-mech__t">
            <span class="al-mech__n t-label-md">${esc(m.name)}</span>
            ${allocBlocksHTML(m.id)}
          </span>
          <span class="al-mech__r">${RADIO(on)}</span>
        </button>`;
    }).join("");
  }

  /* ACTIVE CHECKLISTS — what the bike is down for, with how many parts each
     list covers. A plain row like the electrical ones, because there is nothing
     to picture and nothing here to change: the picker is where a checklist is
     turned on, and that is the QCA's screen.

     Read from clSaved, the picker's saved set — which is app-wide, not per bike,
     the same limitation the electrical list has. Every bike shows the same two
     until there is somewhere to store a per-bike assignment. */
  function paintChecks(){
    const on = typeof CHECKLISTS !== "undefined"
      ? CHECKLISTS.filter(c => clSaved.includes(c.id)) : [];
    document.getElementById("allocClN").textContent = accCount(on.length);
    paintAcc("cl", "allocCl", "allocClSub", on.map(c => c.name));
    document.getElementById("allocCl").innerHTML = !on.length
      ? `<p class="al-empty t-label-md">No checklists assigned.</p>`
      : on.map(c => `<div class="issue issue--plain">
          <span class="issue__plainMain">
            <span class="t-label-md issue__name">${esc(c.name)}</span>
          </span>
          ${showOutcomes()
            ? outMark("Completed")
            : `<span class="al-n t-label-md">${c.items} ${c.items === 1 ? "part" : "parts"}</span>`}
        </div>`).join("");
  }

  /* ONE button, two jobs.

     CLOSED it reads "Allocate" and is live — it is the way into the decision,
     and a disabled button on arrival would say the page was waiting for
     something the page does not show.

     OPEN it reads "Assign and notify" and waits for a name. Two verbs because
     the press does two things — the bike gets an owner AND that person is told
     — and a QCA who read only "Notify" could reasonably think the assigning
     happened when they tapped the name. The label changes with the SHEET rather
     than with the pick, so the button always describes what pressing it would
     do next. */
  /* HOW LONG IT WAITED, AND HOW LONG HAS GONE INTO IT.

     The wait is `waitMins`, which is the bike's original queue time and is not
     overwritten when work starts — so it still answers "how long before anyone
     picked this up" on a bike that is finished.

     The second figure is the state's: nothing yet on a bike still waiting, a
     running clock while somebody is on it, and the final duration once it is
     done. The live one carries data-live-from, which is all the shared
     one-second ticker needs — see the interval in screens/queue. */
  function paintMetrics(b){
    /* One figure on a finished bike, in the middle, with the chevron that opens
       the whole clock — see screens/alloctime. Two figures while the work is
       live or waiting, and no chevron: there is not enough behind it yet to be
       worth a page. */
    const done = b.state === "done";
    document.getElementById("allocWaitedM").hidden = done;
    document.getElementById("allocMetrics").classList.toggle("metrics--one", done);
    const go = document.getElementById("allocTimes");
    go.hidden = !done;
    if (!go.firstElementChild) go.innerHTML = ICON.sheetChevron;
    document.getElementById("allocWaited").textContent =
      b.waitMins == null ? "—" : fmtWaitFlat(b.waitMins);
    const spent = document.getElementById("allocSpent");
    if (b.state === "live"){
      const from = allocLiveFrom(b);
      spent.classList.add("metricv--live");
      spent.dataset.liveFrom = from;
      spent.textContent = fmtLive(from);
    } else {
      spent.classList.remove("metricv--live");
      delete spent.dataset.liveFrom;
      spent.textContent = b.state === "done" ? fmtWaitFlat(b.mins) : "0m";
    }
  }

  /* One place that knows how a section is drawn: the chevron it carries, the
     line under its title, and whether its list is on screen. Called after each
     paint, because what the sub-line says is what the paint just built. */
  /* CLOSED OVER TOTAL — "2/2", "0/3", "0/0". A bare total said how much there
     is; the pair says how much is left, which is the question on a page about
     work in progress. The numerator is only ever the total or zero, because
     nothing records a per-fault outcome: a finished bike has closed all of it
     by definition, and on anything earlier nothing is closed yet. When per-
     fault outcomes exist this becomes a real count and nothing else moves. */
  const accCount = n => `${showOutcomes() ? n : 0}/${n}`;

  function paintAcc(key, bodyId, subEl, items){
    const head = document.querySelector(`[data-alloc-acc="${key}"]`);
    const body = document.getElementById(bodyId);
    const open = !!accOpen[key];
    head.classList.toggle("is-open", open);
    head.setAttribute("aria-expanded", String(open));
    head.querySelector(".al-acc__go").innerHTML = ICON.chevronDown;
    body.hidden = !open;
    /* THE PEEK LINE IS ONLY FOR A SHUT SECTION. Open, the list below says the
       same names in full, and the clipped version above it was the same
       sentence twice — the second one worse. It goes away entirely rather than
       greying out: the head is shorter open, which is space the list can have.

       Run together and clipped by CSS rather than cut here: where the line ends
       depends on the width it is given, and a string truncated in JS would be
       wrong on the first frame that is not 390 wide. */
    const sub = document.getElementById(subEl);
    sub.hidden = open;
    sub.textContent = items.length ? items.join(", ") : "None";
  }

  function paintCta(){
    const btn = document.getElementById("allocGo");
    btn.disabled = sheetOpen && !allocPick;
    btn.querySelector("span").textContent = sheetOpen ? "Assign and notify" : "Allocate";
  }

  function openSheet(){
    /* NOTHING PRESELECTED. The sheet is the question, and arriving with an
       answer already filled in makes the first name look like a recommendation
       the app is making — it is not, and the app has no basis for one. A pick
       from a previous open is dropped for the same reason. */
    allocPick = null;
    paintMechs();
    sheetOpen = true;
    document.getElementById("allocScrim").classList.add("is-open");
    document.getElementById("allocSheet").classList.add("is-open");
    document.getElementById("scrAlloc").classList.add("sheet-open");
    paintCta();
  }
  function closeSheet(){
    sheetOpen = false;
    document.getElementById("allocScrim").classList.remove("is-open");
    document.getElementById("allocSheet").classList.remove("is-open");
    document.getElementById("scrAlloc").classList.remove("sheet-open");
    paintCta();
  }

  /* DELEGATED, bound at load — not inside a "if the list is empty, build it and
     bind" branch. The build pre-renders the page and bakes the resulting DOM
     back into the file, so a listener attached during a first fill never exists
     at runtime: the element ships already populated and the branch never runs.
     This has bitten the tab strip once already. */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-alloc-mech]");
    if (!b) return;
    allocPick = b.dataset.allocMech;
    paintMechs();
    paintCta();
  });

  /* Scroll direction, not scroll position: the bar hides once you are clearly
     going down and returns the moment you go up, rather than waiting for the top
     of the list. 8px of slack so trackpad and finger noise cannot flicker it —
     the same figure and the same reasoning as the queue's filter band.

     Held down while the sheet is open: the page behind a scrim should not be
     rearranging itself. */
  const AL_SLACK = 8;
  let alLastY = 0;
  /* THE JITTER, and why the lock is here. Collapsing the bar hands its 73px to
     the scroller, and at the very bottom of the list there is no content to fill
     them — so the browser clamps scrollTop DOWN by 73 to keep the last row on
     the floor. That clamp fires a scroll event reading as an upward flick, which
     brings the bar back, which takes the 73 away again, which scrolls down…
     The page shook at the bottom of every long bike.

     Two guards. The bar does not hide when you are already at the floor, where
     hiding it buys no room; and every change locks the handler for the length of
     the transition, so the events the change itself causes cannot start another
     one. Locked events still update alLastY, or the first one after the lock
     lifts would carry the whole clamp as its delta. */
  /* The lock runs on the TRANSITION, not on a stopwatch. A 320ms timer was the
     first attempt and still shook: the clamp arrives over the whole 260ms of the
     height animation, and a couple of slow frames put the last of it past the
     deadline — the bar came back, took the 73 away again, and the loop was
     running. transitionend is the exact moment the resize is finished, and the
     baseline is resynced there so the first event after it cannot carry the
     clamp as its delta. The timer stays as a fallback: a transition that is
     interrupted, or never starts, never fires the event. */
  let alLocked = false, alFallback = 0;
  function alUnlock(){
    alLocked = false;
    clearTimeout(alFallback);
    alLastY = document.getElementById("allocScroll").scrollTop;
  }
  document.querySelector("#scrAlloc .appbar").addEventListener("transitionend", e => {
    if (e.propertyName === "height") alUnlock();
  });

  document.getElementById("allocScroll").addEventListener("scroll", () => {
    const el = document.getElementById("allocScroll");
    const y  = el.scrollTop;
    const dy = y - alLastY;
    if (Math.abs(dy) < AL_SLACK) return;
    alLastY = y;
    if (sheetOpen || alLocked) return;
    const scr  = document.getElementById("scrAlloc");
    /* Not at the floor. There is no room to hand the list down there — the
       collapse would only be undone by the clamp it causes. */
    const foot = el.scrollHeight - y - el.clientHeight;
    const want = dy > 0 ? (y > 0 && foot > 2) : false;
    if (want === scr.classList.contains("hdr-up")) return;
    scr.classList.toggle("hdr-up", want);
    alLocked = true;
    clearTimeout(alFallback);
    alFallback = setTimeout(alUnlock, 600);
  }, {passive:true});

  /* DELEGATED, bound at load — the build bakes the rendered DOM back into the
     file, so a listener attached during a paint never exists at runtime. */
  document.addEventListener("click", e => {
    const h = e.target.closest("[data-alloc-acc]");
    if (!h) return;
    const k = h.dataset.allocAcc;
    accOpen[k] = !accOpen[k];
    renderAlloc();
  });

  document.getElementById("allocTimes").addEventListener("click",
    () => { if (allocBike) openAllocTime(allocBike); });

  document.getElementById("allocScrim").addEventListener("click", closeSheet);

  /* Back closes the sheet if it is open, and leaves the page if it is not — the
     hardware-back habit. Without this the arrow would jump the QCA off a page
     they were mid-decision on. */
  document.getElementById("allocBack").addEventListener("click", () => {
    if (sheetOpen) return closeSheet();
    goTo(allocBack);
  });

  document.getElementById("allocGo").addEventListener("click", () => {
    if (!sheetOpen) return openSheet();
    const m = MECHS.find(x => x.id === allocPick);
    if (!m) return;
    /* Reports and stops. Allocating for real has to move the bike between the
       two blocks and put it on somebody's board, and neither of those exists yet
       — a button that silently did nothing would be worse than one that says so. */
    toast(allocBike.id + " → " + m.name + " (not wired yet)");
    closeSheet();
    goTo(allocBack);
  });

})();
