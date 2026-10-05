
/* ========================================================================
   RnM DASHBOARD — ported from RnM-home-page/prototype.html
   Wrapped so none of his ~40 consts reach this app's globals; enterRnm() is the
   only thing that leaves. His outbound hook table is window.YuzenRnM here, NOT
   window.Yuzen: the token queue is also a port of his work and also defines
   window.Yuzen, and it loads after this one — so the two collided silently and the
   later table won. The symptom was the back button doing nothing, because it was
   calling the token queue's onBack. window.RnM stays as the inbound counterpart.
   ======================================================================== */
let enterRnm = () => {};
/* Part exchange, which the ⋮ offers directly. It was the third tab; it is its
   own overlay now. */
let rnmShowParts = () => {};
let rnmShowVitals = () => {};

/* Selects the Bike essentials tab, where the commands now live. The ⋮ row calls
   this — see SHEET_ACTIONS in shared/sheet-config.js. */
let rnmShowCommands = () => {};
(function(){

  'use strict';

  /* ======================================================================
     STITCHING CONTRACT — this is the page's whole outbound surface.
     To wire this page into the assembled prototype, replace the function
     bodies below. Nothing else in this file needs to change.
     ====================================================================== */
  window.YuzenRnM = {
    /* rnmKind, not a literal 'repair'. Two flows reach this dashboard now and
       #scrJob is one screen serving whichever jobKind names — so forcing 'repair'
       here sent a QCA back to a Repairable bike page. See task-kinds.js. */
    onBack()          { jobKind = rnmKind; goTo('job'); },
    onMore()          { /* the shared sheet handles it — see data-opt-more */ },
    onViewAll()       { console.log('[YuzenRnM] onViewAll'); },
    /* The Checks card opens whichever checklist the flow it is standing in owns:
       the mechanic's servicing checks, or the QCA's assessment checklist. Without
       this the assessment's only route to its own checklist is gone — the card
       would open a servicing list for a bike nobody is servicing, and the faults
       and photos screens behind it would be unreachable.

       The one thing here I inferred rather than was told. Everything else about
       this dashboard is still the repair flow's, verbatim. */
    /* The ROW. On a repair it is the repair's checklist; on an assessment it is
       the picker — which checklists are running — not the parts inside them.
       Those two were one destination until the picker existed, which left the
       row and the Assessment checklist button below it opening the same page. */
    onOpenChecks()    { goTo(rnmKind === 'assessment' ? 'checklists' : 'checks'); },
    /* The BUTTON. The parts themselves, swiped one at a time. */
    onOpenParts()     { goTo(rnmKind === 'assessment' ? 'assess' : 'checks'); },
    onOpenIssues(section) { goTo('issues'); if (section) issuesShowSection(section); },
    /* Every check judged and every issue settled, so the job's RnM step is over.
       Back to the task page, standing on the step AFTER this one.

       Found by id rather than hardcoded to index 1, because the repair's step list
       has been reordered before. Math.max so it never walks backwards: reopening a
       dashboard that was already signed off must not undo what came after it. */
    onDone()          {
      /* Back to the task page that opened this, standing on the step AFTER the
         one that did. #scrJob is ONE screen serving several task types and it
         renders whichever jobKind currently says, so the kind has to be restored
         before the jump — arriving here by a route that left jobKind elsewhere is
         what used to send a mechanic back to the wrong task page entirely.

         The step is found by what it OPENS rather than by its id, because the two
         flows name it differently — 'rnm' in the repair, 'assessment' in the
         assessment — and by index because the repair's list has been reordered
         before. Math.max so it never walks backwards: reopening a dashboard that
         was already signed off must not undo what came after it. */
      /* Sign-off, and the bike moves lists: out of Assessment pending, into
         Assessment done, carrying what was found on it. Assessment only — a
         repair signs off against a different pair of lists that do not exist
         yet. See shared/assessment-record.js. */
      if (rnmKind === 'assessment') completeAssessment(BIKE.id);
      jobKind = rnmKind;
      const at = jobSteps().findIndex(s => s.to === 'rnm');
      if (at !== -1) jobAt = Math.max(jobAt, at + 1);
      goTo('job');
    },
    // action: 'power' | 'lock' | 'seat' | 'beep'
    onControl(action, state) { console.log('[YuzenRnM] onControl', action, state); },
    // state: 'connecting' | 'connected' | 'disconnected'
    onConnect(state)  { console.log('[YuzenRnM] onConnect', state); },
    // key: 'charge' | 'iot' — one vital was re-read
    onRead(key, value) { console.log('[YuzenRnM] onRead', key, value); },
  };

  // bt: 'off' | 'connecting' | 'on'
  /* bt starts 'on': the link is up at rest, so the vitals strip and everything
     downstream of it (odometer, range, temperature — see paintVitalsScreen) have
     real values to show. This is the one flag that has to agree with V.bt.st, or
     the strip reads Connected while the detail rnscreen reads Not connected. */
  const S = { power: false, locked: false, seat: 'Closed', beeping: false,
              bt: 'on' };

  function tap() { if (navigator.vibrate) navigator.vibrate(10); }

  /* ---- Bike footage ----------------------------------------------------- */
  /* Technique carried over from the Wynn XP prototype, which solved two real
     problems: seek while the clip is still hidden so the crossfade cannot catch
     a blank frame, and prime each decoder so the first tap is not cold. */
  const CLIPS = {
    seatOpen:  document.getElementById('vidSeatOpen'),
    seatClose: document.getElementById('vidSeatClose'),
    powerOn:   document.getElementById('vidPowerOn'),
    powerOff:  document.getElementById('vidPowerOff'),
  };
  const allClips = Object.values(CLIPS);

  function playClip(video) {
    const reveal = () => {
      video.classList.add('is-playing');
      allClips.forEach(v => { if (v !== video) v.classList.remove('is-playing'); });
      video.play().catch(() => {});
    };
    if (video.currentTime === 0) {
      reveal();
    } else {
      video.addEventListener('seeked', function onSeeked() {
        video.removeEventListener('seeked', onSeeked);
        reveal();
      }, { once: true });
      video.currentTime = 0;
    }
  }

  /* Resolves when the clip finishes, so the seat's label waits for the bike
     rather than flipping to Open while the seat is still rising. The timeout is
     a backstop: a clip that stalls must not strand the control. */
  const SEAT_TIMEOUT_MS = 3000;
  function clipDone(video) {
    return new Promise(resolve => {
      if (video.ended) { resolve(); return; }
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      video.addEventListener('ended', finish, { once: true });
      setTimeout(finish, SEAT_TIMEOUT_MS);
    });
  }

  allClips.forEach(video => {
    const warmUp = () => {
      video.play().then(() => { video.pause(); video.currentTime = 0; }).catch(() => {});
      video.removeEventListener('loadeddata', warmUp);
    };
    if (video.readyState >= 2) warmUp();
    else video.addEventListener('loadeddata', warmUp);
  });

  const rnScreenEl = document.getElementById('scrRnm');

  /* ---- Bottom tabs — Figma 2621:29373 ----------------------------------- */
  /* Two places, not one scrolling surface: Open tasks is the work, Bike
     essentials is the machine. Swapping panels with `hidden` rather than sliding
     says that — a slide would claim they are two halves of one page.
     The sheet that used to raise the task list is gone, and its drag-to-dismiss
     with it; a tab does not need dismissing. */
  /* VISUAL order, which every index in this file reads off — the marker, the
     is-tab-bike flag and rnmShowCommands all count along this list. Bike Info is
     second: it is the bike's record, which is what a QCA reads before deciding
     anything, so it sits next to the work rather than after the controls. */
  const rnTabs = [
    {btn: document.getElementById('rnTabTasks'), panel: document.getElementById('rnPanelTasks')},
    /* Assessment only. It is in this list rather than opening an overlay, which
       is what makes the marker land on it -- see the note where the old handler
       used to be. */
    {btn: document.getElementById('rnTabInfo'),  panel: document.getElementById('rnPanelInfo')},
    {btn: document.getElementById('rnTabBike'),  panel: document.getElementById('rnPanelBike')},
  ];
  const rnTabInk = document.getElementById('rnTabInk');

  /* Measured off the label, not stored: the marker is the width of the word it
     belongs to, so renaming a tab moves it with no number to keep in step. */
  function moveRnTabInk(){
    const on = rnTabs.find(t => t.btn.classList.contains('is-on'));
    if (!on) return;
    const lbl = on.btn.querySelector('span');
    if (!lbl.offsetWidth) return;
    /* Measured against the BAR, not summed from the button. The tabs are
       position:static, so they are not offset parents — a label's offsetLeft is
       already relative to the bar, and adding the button's offset counted the
       second tab's 195px twice and sent the marker off the right edge. */
    const bar = rnTabInk.offsetParent.getBoundingClientRect();
    const box = lbl.getBoundingClientRect();
    rnTabInk.style.width = Math.round(box.width) + 'px';
    rnTabInk.style.transform = 'translateX(' + Math.round(box.left - bar.left) + 'px)';
  }

  function setRnTab(i){
    rnTabs.forEach((t, n) => {
      const on = n === i;
      t.btn.classList.toggle('is-on', on);
      t.btn.setAttribute('aria-selected', String(on));
      t.panel.hidden = !on;
    });
    /* The assessment draws the bike only on Bike essentials — hero.css. It is
       recorded on the screen rather than read off a panel's `hidden`, because
       the footage lives outside both panels, in the hero they share. */
    /* Index 2, not 1 — Bike Info took the middle seat, so Bike essentials is the
     third tab now. rnTabs below is in VISUAL order and this reads off it. */
  rnScreenEl.classList.toggle('is-tab-bike', i === 2);
    moveRnTabInk();
  }
  rnTabs.forEach((t, i) => t.btn.addEventListener('click', () => { tap(); setRnTab(i); }));

  /* Bike info used to open the vitals overlay from here, which meant a tab that
     covered the bar it belongs to and then never highlighted — a destination
     wearing a tab's clothes. It is an ordinary panel now, so it selects like the
     other two and the bar stops lying about where you are. The panel is empty
     until its content is briefed, and the overlay is untouched: the options
     sheet's Bike info row still opens it (shared/sheet-config.js), which is how
     a repair reaches it, since this tab is the assessment's only. */

  /* The ⋮'s Bike commands. They are on the second tab now rather than under a
     sheet, so asking for them selects that tab. */
  rnmShowCommands = () => setRnTab(2);

  /* ---- Hero carousel ----------------------------------------------------- */
  /* Two slides, dots only — no swipe. The band sits under the app bar and over
     the panels; a horizontal drag here would fight the vertical scroll of
     whatever is below it, and the dots are a 44px-tall target either way. */
  const rnCarDots = [...document.querySelectorAll('#rnCarDots i')];
  let rnCarAt = 0;
  /* One slide in the assessment flow, so there is nowhere to go — see hero.css.
     Guarded here as well as hidden there, because CSS can take the second slide
     off screen but cannot stop a drag from sliding the track onto where it was. */
  const rnCarLive = () => !rnScreenEl.classList.contains('is-assessment');
  function setRnCar(i){
    if (!rnCarLive()) i = 0;
    rnCarAt = i;
    rnScreenEl.classList.toggle('is-car2', i === 1);
    rnCarDots.forEach((d, n) => d.classList.toggle('is-on', n === i));
  }
  document.getElementById('rnCarDots')
    .addEventListener('click', e => {
      const i = rnCarDots.indexOf(e.target);
      if (i !== -1) { tap(); setRnCar(i); }
    });
  /* Swipe. Dots alone were not enough — the band looks like something you drag,
     so it has to be. The track follows the finger and snaps on release.
     Guarded the same way the sheet's drag was: nothing moves until the finger has
     travelled DRAG_MIN and is going more sideways than up, so a tap on the card's
     CTA still lands. */
  (() => {
    const car   = document.getElementById('rnCar');
    const track = document.getElementById('rnCarTrack');
    const DRAG_MIN = 8;    /* travel before the track moves at all */
    const SNAP_MIN = 40;   /* travel that counts as a page turn on release */
    let d = null;

    /* A drag may start anywhere, the card included — the click-swallow on release
       is what tells a swipe from a tap, so the card does not need excluding. */
    car.addEventListener('pointerdown', e => {
      if (!rnCarLive()) return;
      d = {x0: e.clientX, y0: e.clientY, dx: 0, moved: false};
    });
    car.addEventListener('pointermove', e => {
      if (!d) return;
      const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (!d.moved){
        if (Math.abs(dx) < DRAG_MIN || Math.abs(dx) <= Math.abs(dy)) return;
        d.moved = true;
        car.setPointerCapture(e.pointerId);
        track.style.transition = 'none';
      }
      d.dx = dx;
      track.style.transform = 'translateX(calc(' + (rnCarAt * -50) + '% + ' + dx + 'px))';
    });
    const end = () => {
      if (!d) return;
      const {dx, moved} = d;
      d = null;
      track.style.transition = '';
      track.style.transform = '';
      if (!moved) return;
      if (dx <= -SNAP_MIN && rnCarAt === 0) setRnCar(1);
      else if (dx >= SNAP_MIN && rnCarAt === 1) setRnCar(0);
      /* Swallow the click the browser fires after a drag, or the tap-to-turn
         below would immediately undo the swipe. */
      car.addEventListener('click', ev => ev.stopPropagation(), {capture: true, once: true});
    };
    car.addEventListener('pointerup', end);
    car.addEventListener('pointercancel', end);

    /* Tapping the bike turns to the summary and back, so the carousel is also
       reachable without hitting a 6px dot with a gloved thumb. */
    track.addEventListener('click', e => {
      if (e.target.closest('.pxcard')) return;   /* the card has its own controls */
      setRnCar(rnCarAt === 1 ? 0 : 1);
    });
  })();
  document.getElementById('btnPxOpen')
    .addEventListener('click', () => { tap(); rnmShowParts(); });

  /* ---- Parts exchange ---------------------------------------------------- */
  /* Stores owns this record, not the mechanic. A part gets here because the
     mechanic raised an issue against it, went to stores, and stores — seeing that
     issue on the bike — issued a replacement. Nothing the mechanic does on this
     phone moves a row, which is why the whole panel is view-only and why this is a
     flat table rather than something derived from ISSUES: deriving it would say
     the app knows what stores handed over, and it does not.

     The rows are still chosen to agree with the issues on this bike, because a
     received part with no issue behind it would be a part nobody asked for:
       Front wheel — the Mechanical issue "Front wheel · Damage"
       MCU         — the Electrical fault "Motor controller unit lag"

     Returned is what has gone back, and it is drawn from what was received: the
     rule is that a part replaced rather than repaired has a faulty twin to hand
     in. The MCU is deliberately not in it — one part outstanding is what makes the
     two counts worth reading separately. */
  const SERIALISED = {
    /* Only these four carry a serial in the real system. The map is the whole
       rule: a part in it shows its number, a part not in it shows one line. */
    'MCU':        'MCU-8842-1179',
    'IoT device': 'IOT-4471-0925',
    'Motor':      'MTR-3310-7742',
    'Battery':    'BAT-9016-2284',
  };

  /* There is no seed table here any more, and that is the fix.

     A hard-coded `received`/`returned`/`hold` sat alongside the derived lists and
     disagreed with them: the front wheel's old part reads "On-bike" in Mechanical
     issues while the seed listed it under Returned, and Received showed two parts
     when only one spare had been fetched. Two records of the same fact, and the
     one nobody was updating won.

     Every band is derived from the issues now. If nothing has been fetched or
     handed back, the band is empty — which is the truth, and better than a
     plausible-looking list that contradicts the screen it came from. */
  const pxEsc = s => String(s).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* One row, one optional sub-line. `sub` wins where it exists — on a part in the
     mechanic's hands, WHICH one goes back matters more than its number — and the
     serial fills the slot everywhere else. */
  function pxRowHTML(r){
    const sub = r.sub || SERIALISED[r.part];
    /* Faint: this part is not here. It is listed so the mechanic can see what is
       still owed, and dimmed so it is never mistaken for something in hand. */
    return '<div class="prow' + (r.faint ? ' prow--faint' : '') + '">' +
      '<img class="prow__art" src="' + r.art + '" alt="">' +
      '<span class="prow__text">' +
        '<span class="prow__name">' + pxEsc(r.part) + '</span>' +
        (sub ? '<span class="prow__serial">' + pxEsc(sub) + '</span>' : '') +
      '</span>' +
    '</div>';
  }

  /* ---- Which physical part stores is waiting for ------------------------- */
  /* The outcome decides it, not this screen. Replaced put the spare on the bike,
     so the faulty original goes back. Fixed repaired the original and refitted
     it, so the spare is surplus and goes back instead. Until an outcome exists
     both are still live and the row says so rather than guessing — which is the
     whole difference between this screen during an RnM and after one. */
  const RETURNS = {replaced: 'Faulty', fixed: 'Good part'};
  const BOTH    = 'Faulty / Good part';

  function returnPending(q){
    return q.filter(x => {
      if (!x.got) return false;              /* nothing in hand to hand back */
      if (x.outcome === 'replaced') return !x.oldBack;
      if (x.outcome === 'fixed')    return !x.newBack;
      return !x.oldBack && !x.newBack;       /* undecided: either could go */
    }).map(x => ({part: x.part, art: x.art, sub: RETURNS[x.outcome] || BOTH}));
  }

  /* The mirror: a side that HAS gone back is a returned part, and it is worth
     naming which one, because "Front wheel" alone does not say whether stores got
     the broken one or the spare. */
  function returnedFrom(q){
    const out = [];
    q.forEach(x => {
      if (x.oldBack) out.push({part: x.part, art: x.art, sub: RETURNS.replaced});
      if (x.newBack) out.push({part: x.part, art: x.art, sub: RETURNS.fixed});
    });
    return out;
  }

  /* innerHTML is assigned, never appended — the build pre-renders the DOM it
     ships, so anything that adds on load would arrive doubled. See src/MAP.md. */
  function paintParts(){
    /* One source: the open issues. Every band is a different question asked of
       the same queue, so a part cannot appear somewhere that contradicts what
       the issue sheet says about it.

         Get spare      no spare fetched yet
         Received       stores has issued one — a record, so it stands even once
                        the part is fitted
         Return pending in the mechanic's hands and owed back, see returnPending
         Returned       actually handed over */
    const q = spareQueue();
    const recv = q.filter(x => x.got);
    const want = q.filter(x => !x.got).map(x => Object.assign({faint:true}, x));
    const hold = returnPending(q);
    const back = returnedFrom(q);

    /* Empty means empty on three of the four — the heading above a blank band is
       already telling the mechanic what would be there. Return pending is the
       exception and gets a stated empty state, because it is the only band that
       reads as a debt: "nothing here" and "this failed to load" look identical
       when both are blank, and that is the one band worth being sure about. */
    [['pxHold', hold], ['pxRet', back],
     ['pxRecv', recv], ['pxPend', want]]
    .forEach(([listId, rows]) => {
      const el = document.getElementById(listId);
      const bare = listId === 'pxHold' && !rows.length;
      el.classList.toggle('pxlist--empty', bare);
      el.innerHTML = bare ? '<p class="pxempty">Nothing to return</p>'
                          : rows.map(pxRowHTML).join('');
    });
  }

  /* ---- Component detail -------------------------------------------------- */
  /* Sagar's readings, verbatim. Grouped exactly as he wrote them — the blank
     lines between his blocks are the grouping, and they are meaningful: what the
     pack is doing right now, then what it holds, then how it was built. A flat
     list of twenty-one rows would have thrown that away.

     Data, not markup, because the two components differ only in their readings
     and anything else that earns a chevron will differ only in its readings too. */
  const COMPONENT_SPECS = {
    battery: {
      name: 'Battery',
      sn: 'BA-876-543-2109',
      groups: [
        [['Pack Voltage', '53.53V'],
         ['Pack Current', '-10.0300A'],
         ['Battery Temperature', '24.8\u00b0C \u00b7 24.75\u00b0C'],
         ['PCB Temperature', '28.00\u00b0C'],
         ['SOH (state of health)', '95.0%'],
         ['Battery location status', 'IN CHARGING UNIT']],
        [['Available/Full charge Energy', '0.920/0.930 kWh'],
         ['Available/Full charge Capacity', '18.20/18.30 Ah'],
         ['Battery Cycle Count', '338']],
        [['Battery hardware/software version', '5.4.1'],
         ['Battery Manufacturing Date', '30-1-23']],
      ],
    },
    iot: {
      name: 'IoT',
      sn: '9876-543-210',
      groups: [
        [['Location type', 'At Warehouse'],
         ['Bike Current Location', 'Yulu Centre PTP EV TEMP'],
         ['City', 'BLR']],
        [['Last Gprs Ping Time', {ago: 2}],
         ['Last Battery Ping Time', {ago: 26 * 60}],
         ['GPRS Signal', '0']],
        [['IOT device serial', '869009064016836 \u00b7 862174067195339'],
         ['IOT Version', '0.1.3'],
         ['SIM', '*****NA*****']],
      ],
    },
  };

  /* Relative, not stamped. A ping time is read to answer one question — is this
     thing still talking to us — and "07-Jul-2025 11:11:30" makes the mechanic do
     the subtraction themselves.

     Stored as minutes-before-now rather than as a date, because a fixed date in a
     prototype reads "over a year ago" by the time anyone demos it. The page is
     rendered on the tap, not at load, so this is computed fresh every time it is
     opened — and the build's pre-render never sees it, because cmpBody is empty
     until a chevron is pressed. */
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];

  function agoLabel(mins){
    const t = new Date(Date.now() - mins * 60000);
    const hhmm = String(t.getHours()).padStart(2, '0') + ':' +
                 String(t.getMinutes()).padStart(2, '0');
    if (mins < 1)  return 'Just now';
    /* Minutes win over the calendar: 30 minutes ago at 00:10 is "30 mins ago",
       not "Yesterday at 23:40". */
    if (mins < 60) return Math.round(mins) + (Math.round(mins) === 1 ? ' min ago' : ' mins ago');

    const now = new Date();
    if (t.toDateString() === now.toDateString()){
      /* Floor, not round: 90 minutes is an hour ago, not two. */
      const h = Math.floor(mins / 60);
      return h + (h === 1 ? ' hr ago' : ' hrs ago');
    }
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (t.toDateString() === y.toDateString()) return 'Yesterday at ' + hhmm;
    return t.getDate() + ' ' + MONTHS[t.getMonth()] + ' at ' + hhmm;
  }

  /* ---- Refresh ----------------------------------------------------------- */
  /* Each button carries its own "fetched at" on the element, so one handler
     serves every screen that has one and nothing has to track which is open.
     Unset means two minutes old — the resting state Sagar asked for — and it
     ages from there rather than being pinned, which is what a real reading does. */
  const FRESH_MS = 2 * 60000;

  function paintRefresh(btn){
    btn.querySelector('.refresh__ago').textContent =
      agoLabel((Date.now() - +btn.dataset.at) / 60000);
  }
  /* Opening a screen re-arms it at two minutes old. Deliberately a reset rather
     than a lazy default: the alternative kept whatever the last visit left on the
     element, so a screen opened after a refresh still read "Just now" and the
     resting state depended on what you had done before. */
  function armRefresh(scope){
    scope.querySelectorAll('[data-refresh]').forEach(b => {
      b.dataset.at = String(Date.now() - FRESH_MS);
      b.classList.remove('is-spinning');
      paintRefresh(b);
    });
  }

  document.getElementById('scrRnm').addEventListener('click', e => {
    const b = e.target.closest('[data-refresh]');
    if (!b) return;
    tap();
    b.dataset.at = String(Date.now());          /* -> "Just now" */
    b.classList.remove('is-spinning');
    void b.offsetWidth;                          /* restart the turn on a re-tap */
    b.classList.add('is-spinning');
    setTimeout(() => b.classList.remove('is-spinning'), 600);
    paintRefresh(b);
    /* The component readings are rendered from data at paint time, so re-drawing
       them is what makes the ping ages move. */
    if (b.closest('#screenComp') && compKey) paintCompBody(COMPONENT_SPECS[compKey]);
  });

  const screenComp = document.getElementById('screenComp');

  function setCompScreen(open){
    screenComp.classList.toggle('is-up', open);
    screenComp.setAttribute('aria-hidden', String(!open));
  }

  let compKey = null;

  /* innerHTML assigned, never appended — the build pre-renders the DOM it ships,
     so anything that adds on load would arrive doubled. See src/MAP.md. */
  function paintCompBody(c){
    document.getElementById('cmpBody').innerHTML = c.groups.map(g =>
      '<dl>' + g.map(([k, v]) =>
        '<div class="cmprow"><dt>' + pxEsc(k) + '</dt>' +
        /* A reading is either a literal or a moment; only the second needs
           working out at render time. */
        '<dd>' + pxEsc(v && typeof v === 'object' ? agoLabel(v.ago) : v) +
        '</dd></div>').join('') + '</dl>'
    ).join('<hr class="cmp__rule">');
  }

  function showComponent(key){
    const c = COMPONENT_SPECS[key];
    if (!c) return;
    compKey = key;
    document.getElementById('cmpName').textContent = c.name;
    document.getElementById('cmpSn').textContent   = c.sn;
    paintCompBody(c);
    armRefresh(screenComp);
    setCompScreen(true);
  }

  document.getElementById('btnCompBack')
    .addEventListener('click', () => { tap(); setCompScreen(false); });

  /* Delegated: the parts list is static markup, but a row that gains a chevron
     later needs only a data-comp to work. */
  document.getElementById('screenVitals').addEventListener('click', e => {
    const b = e.target.closest('[data-comp]');
    if (!b) return;
    tap();
    showComponent(b.dataset.comp);
  });

  const screenParts = document.getElementById('screenParts');

  /* ---- Tabs -------------------------------------------------------------- */
  /* Returned leads and opens, per 2710:33743. The underline is measured from the
     label at runtime rather than given a number, so renaming a tab moves it
     without anything here to remember. */
  const pxTabs   = document.getElementById('pxTabs');
  const pxInk    = document.getElementById('pxTabsInk');
  const PX_PANEL = {returned: 'pxPanelReturned', received: 'pxPanelReceived'};

  function setPartsTab(which){
    pxTabs.querySelectorAll('.pxtab').forEach(b => {
      const on = b.dataset.pxtab === which;
      b.classList.toggle('pxtab--on', on);
      b.setAttribute('aria-selected', String(on));
      if (on) movePxInk(b);
    });
    Object.keys(PX_PANEL).forEach(k => {
      document.getElementById(PX_PANEL[k]).hidden = (k !== which);
    });
  }
  function movePxInk(tab){
    /* The LABEL, not the tab. The frame's underline is 56 wide under a 195-wide
       tab — it is the width of "New · 2", centred on it. Measured against the
       strip, because the tabs are position:static and a tab's own offsetLeft is
       already strip-relative; adding anything to it double-counts. */
    const lab = tab.querySelector('.pxtab__in') || tab;
    const t = lab.getBoundingClientRect(), s = pxTabs.getBoundingClientRect();
    pxInk.style.width = t.width + 'px';
    pxInk.style.transform = 'translateX(' + (t.left - s.left) + 'px)';
  }
  pxTabs.addEventListener('click', e => {
    const b = e.target.closest('.pxtab');
    if (!b) return;
    tap();
    setPartsTab(b.dataset.pxtab);
  });

  function setPartsScreen(open){
    screenParts.classList.toggle('is-up', open);
    screenParts.setAttribute('aria-hidden', String(!open));
    /* Repainted on the way in, not only on arriving at the dashboard: a spare
       fetched from the issue sheet has to be in the right band by the time this
       screen is looked at again. */
    if (open){ paintParts(); setPartsTab('returned'); }
  }
  document.getElementById('btnPartsBack')
    .addEventListener('click', () => { tap(); setPartsScreen(false); });

  /* What the ⋮ routes here — see shared/sheet-config.js. */
  rnmShowParts = () => setPartsScreen(true);

  /* ---- Whole-card taps -------------------------------------------------- */
  /* A 48px glyph inside a 100px-tall card was the only live target on it, so most
     of what looks like a button was not one. The card now forwards to its own
     button — one command, one card, the whole thing tappable.

     Only .cmd--stack. Seat is .cmd--wide and holds TWO buttons, close and open;
     there is no single action for its card to forward to, so there the buttons
     stay the targets. View all is already a button in its own right.

     Delegated, and it steps aside when the press already landed on the button —
     otherwise the forwarded click would fire the handler a second time. */
  document.querySelector('#scrRnm .cmd-grid').addEventListener('click', e => {
    if (e.target.closest('.cmd-btn')) return;
    const card = e.target.closest('.cmd--stack');
    if (!card) return;
    const btn = card.querySelector('.cmd-btn');
    if (btn && !btn.disabled) btn.click();
  });

  /* ---- Power ------------------------------------------------------------ */
  const btnPower   = document.getElementById('btnPower');
  const statePower = document.getElementById('statePower');

  btnPower.addEventListener('click', () => {
    tap();
    S.power = !S.power;
    statePower.textContent = S.power ? 'On' : 'Off';
    btnPower.classList.toggle('is-lit', S.power);
    btnPower.setAttribute('aria-pressed', String(S.power));
    playClip(S.power ? CLIPS.powerOn : CLIPS.powerOff);
    window.YuzenRnM.onControl('power', S.power ? 'on' : 'off');
  });

  /* ---- Lock ------------------------------------------------------------- */
  /* Two signals, because either alone is ambiguous: the shackle opens and
     closes, and the circle fills when the lock is engaged (matching Power).
     The frame only ships the open-shackle glyph — the closed one reuses that
     export's body and keyhole verbatim with a symmetric arch redrawn at the
     same 1.5px weight, since the library's icon/lock is not reachable over the
     MCP. Swap in the real export when it lands. */
  const btnLock   = document.getElementById('btnLock');
  const stateLock = document.getElementById('stateLock');

  function paintLock() {
    /* The rncard is titled Wheel now, so the title is the thing and the state line
       carries Locked / Unlocked — the same shape as Power's On / Off. It used to
       have no state line at all, with the title naming the action instead; the
       frame reverses that and the three cards now read alike. */
    stateLock.textContent = S.locked ? 'Locked' : 'Unlocked';
    btnLock.setAttribute('aria-label', S.locked ? 'Unlock the wheel' : 'Lock the wheel');
    btnLock.setAttribute('aria-pressed', String(S.locked));
    btnLock.classList.toggle('is-unlocked', !S.locked);
  }

  btnLock.addEventListener('click', () => {
    tap();
    S.locked = !S.locked;
    paintLock();
    window.YuzenRnM.onControl('lock', S.locked ? 'locked' : 'unlocked');
  });

  /* ---- Seat: two momentary commands ------------------------------------- */
  /* The frame's two circles are both controls — close on the left, open on the
     right — not a state readout and a control. So neither glyph changes and
     neither latches: each press sends its own command, and pressing open three
     times sends open three times, which is how the bike is actually spoken to.

     Last press wins. A press takes a run number; if a later press arrives while
     the clip is still playing, the earlier run drops its settled state on the
     floor rather than overwriting the newer one. Without that, tapping open then
     close quickly would land on Open, because the first run finished last. */
  const btnSeatClose = document.getElementById('btnSeatClose');
  const btnSeatOpen  = document.getElementById('btnSeatOpen');
  const stateSeat    = document.getElementById('stateSeat');
  let seatRun = 0;

  function setSeatState(text) {
    S.seat = text;
    stateSeat.textContent = text;
  }

  async function fireSeat(dir) {
    const run = ++seatRun;
    const opening = dir < 0;
    setSeatState(opening ? 'Opening' : 'Closing');
    window.YuzenRnM.onControl('seat', opening ? 'opening' : 'closing');
    const clip = opening ? CLIPS.seatOpen : CLIPS.seatClose;
    playClip(clip);
    await clipDone(clip);
    if (run !== seatRun) return;               // a later press has taken over
    setSeatState(opening ? 'Open' : 'Closed');
    window.YuzenRnM.onControl('seat', opening ? 'open' : 'closed');
  }

  btnSeatOpen.addEventListener('click',  () => { tap(); fireSeat(-1); });
  btnSeatClose.addEventListener('click', () => { tap(); fireSeat(1);  });

  /* ---- Beep ------------------------------------------------------------- */
  /* Runs 4s then stops itself, and cannot be re-pressed until it does. It used to
     run 10s with a second tap cutting it short; a beep you are using to find a
     bike on a crowded floor wants to be short and to finish what it started. */
  const BEEP_MS   = 4000;
  const btnBeep   = document.getElementById('btnBeep');
  /* The frame shows '...' here, which is a placeholder rather than copy — beep is
     momentary, so at rest there is genuinely no state to report. An em dash holds
     the line so the three cards stay on one baseline. Needs real words. */
  const stateBeep = document.getElementById('stateBeep');
  const beepSweep = document.getElementById('beepSweep');
  let beepTimer = 0;

  function beepStop() {
    S.beeping = false;
    clearTimeout(beepTimer);
    btnBeep.disabled = false;
    btnBeep.classList.remove('is-beeping');
    btnBeep.setAttribute('aria-pressed', 'false');
    stateBeep.textContent = '\u2014';
    beepSweep.style.transition = 'none';
    beepSweep.style.height = '0%';
    window.YuzenRnM.onControl('beep', 'off');
  }

  btnBeep.addEventListener('click', () => {
    if (S.beeping) return;                 // locked out for the length of the run
    tap();
    S.beeping = true;
    btnBeep.disabled = true;
    btnBeep.classList.add('is-beeping');
    btnBeep.setAttribute('aria-pressed', 'true');
    stateBeep.textContent = 'Beeping';
    /* Full, committed, then drained. Linear because it is a clock — easing it
       would misreport how much time is left. */
    beepSweep.style.transition = 'none';
    beepSweep.style.height = '100%';
    void beepSweep.offsetWidth;
    beepSweep.style.transition = 'height ' + BEEP_MS + 'ms linear';
    beepSweep.style.height = '0%';
    window.YuzenRnM.onControl('beep', 'on');
    /* The timeout, not the transition, is what restores the resting state. */
    clearTimeout(beepTimer);
    beepTimer = setTimeout(beepStop, BEEP_MS);
  });

  /* ---- App bar and cards ------------------------------------------------ */
  document.getElementById('btnBack').addEventListener('click', () => { tap(); window.YuzenRnM.onBack(); });
  document.getElementById('btnMore').addEventListener('click', () => { tap(); window.YuzenRnM.onMore(); });
  document.getElementById('btnViewAll').addEventListener('click', () => {
    tap();
    setVitalsScreen(true);
    window.YuzenRnM.onViewAll();
  });
  /* ---- Repair progress -------------------------------------------------- */
  /* One bar for both cards, because the task is not done until both are: every
     check and every issue is one unit, so 15 units here and the bar is how many
     of them are closed. Weighting them equally is a placeholder — a check and an
     issue are not the same amount of work — but nothing here knows the difference
     yet, and an honest count beats an invented weighting. */
  const REPAIR = { checksDone: 0, checksTotal: 2, issuesDone: 0, issuesTotal: 13,
                   mechDone: 0, mechTotal: 0, elecDone: 0, elecTotal: 0 };
  const rnTasksHead = document.getElementById('rnTasksHead');
  const countChecks = document.getElementById('countChecks');
  const countMech   = document.getElementById('countMech');
  const countFaults = document.getElementById('countFaults');
  const countElec   = document.getElementById('countElec');
  const countPen    = document.getElementById('countPenalty');
  const countAssess = document.getElementById('countAssess');
  const rnScreen    = document.getElementById('scrRnm');
  const rnTabTasksLabel = document.querySelector('#rnTabTasks span');

  /* ── BIKE INFO ─────────────────────────────────────────────────────────────
     The bike's record: three readings, then the last five repairs.

     Stored as ABSOLUTE facts — the day of each visit and the odometer when it
     left — and every number on screen is a difference between two of them. The
     rows read as intervals ("35 days earlier", "1,221 kms travelled"), and
     typing intervals out would mean typing each figure twice and letting the two
     copies drift the first time a repair is added. It also makes the top block
     honest for free: "After repair" is today's odometer minus the last visit's,
     which is the same subtraction the first row does.
     ─────────────────────────────────────────────────────────────────────────── */
  const ODO_KMS = 7245;
  /* Newest first. Five, because the panel shows five — a sixth here would be a
     record the screen silently drops. */
  const REPAIRS = [
    {daysAgo:  20, odo: 6011},
    {daysAgo:  55, odo: 4790},
    {daysAgo:  98, odo: 3402},
    {daysAgo: 141, odo: 2115},
    {daysAgo: 203, odo:  640},
  ];
  /* 0 is today, and it is today deliberately: a pack running out is what sends a
     bike for assessment, so the interesting reading is the one a QCA will
     actually be standing in front of. */
  const PACK_ENDED_DAYS = 0;

  const kms = n => n.toLocaleString('en-IN') + ' kms';
  /* today / 1 day ago / x days ago — the three cases Sagar named. "1 days ago"
     is the one that gives a prototype away. */
  const daysAgoText = d => d === 0 ? 'Today' : d === 1 ? '1 day ago' : d + ' days ago';

  const biStats      = document.getElementById('biStats');
  const biStatsTasks = document.getElementById('biStatsTasks');
  const biRepairs = document.getElementById('biRepairs');
  /* The full Bike Info page shows the same two blocks as the Info tab — it is
     one bike, and two views of it that differ are two bikes as far as a QCA is
     concerned. Both copies are written from the same strings below. */
  const biStatsVitals   = document.getElementById('biStatsVitals');
  const biRepairsVitals = document.getElementById('biRepairsVitals');

  function paintBikeInfo(){
    /* The same three-tile block the Bike info overlay uses — .bi__stats in
       bikeinfo.css — with this tab's three readings in it. */
    /* Odometer, then the pack, then the distance since the last repair. The
       middle two were the other way round: "After repair" is the same figure the
       first row of the history states, so putting it next to the odometer read
       as two odometer readings side by side. The pack between them separates
       the two distances, and it is also the reading that says why the bike is
       here at all. */
    const html = [
      [kms(ODO_KMS),                    'Odometer'],
      [daysAgoText(PACK_ENDED_DAYS),    'Pack ended'],
      [kms(ODO_KMS - REPAIRS[0].odo),   'After repair'],
    ].map(([v, l]) => `<div class="bi__stat">
        <span class="bi__statv">${v}</span>
        <span class="bi__statl">${l}</span>
      </div>`).join('');
    /* Two panels, one block. Tasks added carries it too — see the note in the
       markup — and rendering it twice from one array is what stops the two
       tabs disagreeing about the same bike. */
    biStats.innerHTML = html;
    biStatsTasks.innerHTML = html;
    biStatsVitals.innerHTML = html;

    /* Each row is the gap between this visit and the one ABOVE it in the list —
       for the first, the gap to now. So the first row's kms is the same figure
       as "After repair" above, which is the point: the top block states where
       the bike has got to since it was last worked on, and the list says how
       that compares with every stretch before it. */
    const rhHTML = REPAIRS.map((r, i) => {
      const prev = i === 0 ? {daysAgo: 0, odo: ODO_KMS} : REPAIRS[i - 1];
      const when = i === 0 ? daysAgoText(r.daysAgo)
                           : (r.daysAgo - prev.daysAgo) + ' days earlier';
      return `<button class="rh__row" type="button" data-repair="${i}">
        <span class="rh__text">
          <span class="rh__when">${when}</span>
          <span class="rh__kms">${kms(prev.odo - r.odo)} travelled</span>
        </span>
        <img class="rh__go" src="assets/rnm/cmd-forward.svg" alt="">
      </button>`;
    }).join('');
    biRepairs.innerHTML       = rhHTML;
    biRepairsVitals.innerHTML = rhHTML;
  }

  /* Delegated, and on BOTH lists — the rows are rewritten on every paint, and
     the page and the tab draw the same five. */
  [biRepairs, biRepairsVitals].forEach(list => list.addEventListener('click', e => {
    const row = e.target.closest('[data-repair]');
    if (!row) return;
    tap();
    openRepairVisit(Number(row.dataset.repair),
                    row.querySelector('.rh__when').textContent);
  }));

  /* REMOVED: the overlay's hard-coded odometer, and the line that overwrote it.
       document.getElementById('biOdo').textContent = kms(ODO_KMS);
     Its three tiles are painted from the same array as the tab's now, so there
     is no second copy of the number to keep in step. */

  paintBikeInfo();

  /* ── The assessment as a sequence ──────────────────────────────────────────
     Five rows in the order a QCA works through them, and one button below that
     walks them. This replaced a fixed "Assessment checklist" CTA sitting under
     four findings rows, which said the checklist was the work and the rows were
     the report — true of the report, wrong about the job. All five are steps.

     DONE means three different things here, deliberately:

       the CHECKLIST is done when every part has been judged. It is the only step
       with a completion a machine can see, and visiting it proves nothing — a
       QCA can open the carousel, swipe one part and leave.

       MARK PENALTIES is done once visited AND no faulty part is still waiting
       for a penalty. Visited alone was wrong, and wrong in a way that quietly
       lost work: go back into a finished checklist, mark a good part faulty, and
       that new fault arrives with no penalty against it — but the step stayed
       ticked, the dashboard said "No penalty", and the assessment could be
       signed off with a fault nobody had priced. Nothing decided that there was
       no penalty; the app was reporting the absence of an answer as an answer.
       Now the tick comes off, the sub-line counts what is waiting, and every CTA
       in the flow — including the one on the checklist the QCA is standing on —
       goes back to naming this step.

       FAULTS is done once visited AND the QCA has ticked "Faults reviewed" in
       that screen's footer. Nothing there can be measured — reading a list and
       deciding it is complete leaves no trace — so rather than infer it from a
       visit, the app asks. See faultsConfirmed.

       THE PICKER is done once VISITED. Its answer may already be right and
       there is nothing to finish, so the mark says "you have been here", which
       is the only honest claim available for it.

       Worth knowing, and NOT changed here: adding a fault does not un-tick
       Mechanical faults, even though it files one. Penalty has a completion to
       fall back to and that record does not, so un-ticking it would mean sending
       a QCA back to re-read a list with no way to say they had.

     Visited is not reset between entries. One dashboard serves one bike for one
     job, so a QCA who has been to Mark penalties has been there. A second bike
     would want it cleared, and there is no second bike in this prototype.
     ─────────────────────────────────────────────────────────────────────────── */
  const ASSESS_FLOW = [
    /* ONE step for the checklist AND the penalties. They were two rows and two
       stops for as long as the dashboard had a door to each; they are two tabs
       across two screens now (see shared/steptabs.js), because a penalty is
       marked against what the checklist finds and neither half is a job on its
       own. Opens on the first tab, which is where the work starts. */
    {id:'assess',  row:'rowAssess',  label:'Assessment checklist',
     open:() => goTo('assess')},
    /* ONE step, not two. Mechanical and Electrical were two rows and two steps
       for as long as the dashboard had two doors into the record; they are two
       TABS on one screen now, so the sequence has one stop at it. Opens on
       Mechanical, which is the tab the screen defaults to.

       Three strings, because the row, the button and the banner are three
       different sentences: the ROW names the record ("Faults"), the CTA names
       the job ("Check faults" — read what the checklist filed, look over what is
       already marked, add anything spotted), and `done` reports the outcome.
       Sagar's wording. Flagged once and overruled: `check` is also the repair's
       "Run electrical checks", the picker's "Active checklists" and step one's
       "Assessment checklist", so the word now carries four meanings on one flow. */
    {id:'faults',  row:'rowFaults',  label:'Faults',
     cta:'Check faults', done:'Faults reviewed',
     open:() => window.YuzenRnM.onOpenIssues('Mechanical')},
    /* "viewed", not "done": nothing on that page has to change for the step to be
       behind you — the answer it opens with is usually the right one, and saying
       "done" would claim a decision the QCA may not have taken. */
    {id:'checks',  row:'rowChecks',  label:'Active checklist', done:'Active checklists viewed',
     open:() => goTo('checklists')},
  ];
  const assessVisited = new Set();
  /* The fault record is the one step nothing can measure. A QCA reads what the
     checklist filed, looks over what is already marked and adds anything they
     spot — and none of that leaves a mark the app can count, so "visited" was
     the only claim available and it was a weak one. They say so instead, with a
     checkbox in that screen's footer. Sagar's call, and it is the honest one:
     the app was inferring a judgement it had no way to make. */
  let faultsConfirmed = false;
  /* Faults with no penalty against them yet. Not "faults without a MINOR or
     MAJOR" — "No" is an answer, and a deliberate one; null is the absence of
     one. */
  const penaltyOutstanding = () =>
    PARTS.filter(p => p.status === 'faulty' && p.penalty === null).length;
  /* Both halves of the merged step, kept separate because the two tabs report
     themselves separately — see stepBanner. */
  const checklistDone = () => PARTS.every(p => p.status !== 'pending');
  const stepDone = s => {
    /* Every part judged AND every fault it turned up priced. Two conditions for
       one step, which is what merging two steps means — and it is the AND of
       exactly the two rules the separate steps had. */
    if (s.id === 'assess')  return checklistDone() && penaltyOutstanding() === 0;
    if (!assessVisited.has(s.id)) return false;
    if (s.id === 'faults')  return faultsConfirmed;
    return true;
  };

  /* Every route into a step goes through here — the row and the CTA both — so
     there is one place that records the visit. A row tapped in the REPAIR flow
     never reaches it. */
  function openAssessStep(id){
    const s = ASSESS_FLOW.find(x => x.id === id);
    assessVisited.add(id);
    s.open();
  }

  const assessStepBtn = document.getElementById('btnAssessStep');
  const rnAssessFoot  = document.getElementById('rnAssessFoot');
  assessStepBtn.addEventListener('click', () => {
    tap();
    const next = ASSESS_FLOW.find(s => !stepDone(s));
    /* Nothing left outstanding, so the button is the end of the job rather than
       another step — the same onDone the repair signs off with. This is also the
       only control in the assessment that closes its dashboard step; the ⋮ used
       to carry Finish repair and no longer does. */
    if (!next) { window.YuzenRnM.onDone(); return; }
    openAssessStep(next.id);
  });

  /* ── The assessment's four rows ────────────────────────────────────────────
     A repair's rows are work still to do — x of y checks closed. An assessment's
     are what it FOUND, which is a different kind of list and does not divide into
     a done-over-total: "3 marked" has no denominator, because how many faults a
     bike has is not known in advance. So the sub-lines are counts, each with its
     own word, and each word is doing a job:

       marked     a mechanical fault is something a person WROTE DOWN
       detected   an electrical one is largely read off the bike
       active     what the checklist still has open
       penalty    the price, and "No penalty" rather than "0 penalty" — zero is
                  a finding here, not an empty count

     Both rows read the bike's record and nothing else, and the two sections of
     that record are the two ways a fault is found — which is what their words
     already say:

       MARKED     a person looked and said so. Everything this checklist finds is
                  marked, whatever system the part belongs to, and it is FILED
                  against the bike as it is marked (see fileAssessmentFault in
                  assess/swipe.js). So the row reads 0 when an assessment opens —
                  the QCA has not found anything yet — and counts up as they do.
                  The two reports this app seeds are the repair's brief and are
                  withdrawn for an assessment; see prepareIssuesFor.
       DETECTED   the bike said so, and only a re-run of its checks can say it has
                  stopped. Nothing a person does on this checklist lands here.

     Neither row adds anything on top of the record, which is the point: each one
     counts exactly what the list behind it contains. They used to disagree — the
     count included this checklist's faults and the list had never heard of
     them. */
  const assessCounts = () => {
    const onBike = k => issuesTallyBy(k).total;
    return {
      mech:    onBike('Mechanical'),
      elec:    onBike('Electrical'),
      active:  PARTS.filter(p => p.status === 'pending').length,
      penalty: PARTS.filter(p => p.penalty === 'minor' || p.penalty === 'major').length,
      judged:  PARTS.filter(p => p.status !== 'pending').length,
      total:   PARTS.length,
    };
  };

  const rowName = (id, text) =>
    document.querySelector('#' + id + ' .trow__name').textContent = text;

  function paintAssessment(){
    const c = assessCounts();
    rowName('rowMech',    'Mechanical faults');
    rowName('rowElec',    'Electrical faults');
    rowName('rowChecks',  'Active checklist');
    /* Named for the screen it opens and for what the CTA calls it when it is the
       next step. It read "Penalty" while the button below said "Mark penalties",
       which made the row the CTA was pointing at hard to find. */
    rowName('rowPenalty', 'Mark penalties');
    countMech.textContent   = c.mech + ' marked';
    countElec.textContent   = c.elec + ' detected';
    /* Both halves on one line, in their own words — a person MARKED one, the bike
       DETECTED the other, and merging the rows must not merge the two claims into
       a single number that means neither. */
    countFaults.textContent = c.mech + ' marked \u00b7 ' + c.elec + ' detected';
    /* CHECKLISTS, not parts. "17 active" was progress through the carousel,
       and progress belongs to the thing making it — this row opens the picker
       that says which checklists are running, so it counts those. */
    countChecks.textContent = activeChecklistCount() + ' checklist'
                            + (activeChecklistCount() === 1 ? '' : 's');
    /* What is WAITING beats what was found. "No penalty" under a fault nobody
       has priced is the app answering a question on the QCA's behalf; the count
       of outstanding ones is the thing they have to act on. */
    countPen.textContent    = penaltyOutstanding()
      ? penaltyOutstanding() + ' pending'
      : c.penalty ? c.penalty + ' penalty' : 'No penalty';
    /* The row covers the checklist AND the penalties now, so its sub-line has to
       say which half is outstanding — "Pending" over a finished checklist with
       an unpriced fault would point a QCA at the wrong tab. Words rather than a
       count: "12/17" belongs to the carousel, which shows it while you are in
       there. */
    countAssess.textContent =
      !checklistDone()          ? 'Pending'
      : penaltyOutstanding()    ? penaltyOutstanding() + ' penalty pending'
      : c.penalty               ? 'Finished \u00b7 ' + c.penalty + ' penalty'
      :                           'Finished';
    /* The trailing mark on every row, and the CTA that walks them. Both are
       recomputed on every entry, which is why every back arrow in this flow
       returns HERE — see the note on each screen's back. */
    ASSESS_FLOW.forEach(s => {
      document.querySelector('#' + s.row + ' .trow__tick').innerHTML =
        stepDone(s) ? ICON.rowGood : ICON.rowPending;
    });
    const next = ASSESS_FLOW.find(s => !stepDone(s));
    /* "Start" only while the assessment is untouched. Once a QCA has been
       anywhere, naming the next step is more use than repeating the invitation —
       and once nothing is outstanding the button stops being a step at all. */
    /* Through the same accessor the step screens read, so the dashboard's button
       and theirs cannot end up saying different things about one step — this line
       read `next.label` and went on saying "Faults" after the CTA became "Check
       faults" everywhere else. */
    /* THREE STATES, and the middle one is nothing at all.

       UNTOUCHED it is a secondary Start: an invitation, and the only thing on
       the page to press.

       IN FLIGHT it slides out of the frame. The rows above ARE the flow, each
       one tappable and each saying where it has got to — a button repeating
       whichever is next was a second way to do the same thing, and it sat under
       the list claiming to be the way forward. Sagar's call, and it also gives
       the list the 100px back.

       DONE it comes back as a PRIMARY "Next step". Nothing on this page is
       outstanding, so the only thing left is the rest of the TASK — the battery
       and the drop, which live on the task page this dashboard is a step of.
       It reads "Next step" rather than "Task done" for that reason: the
       assessment is done, the task is not. */
    const started  = assessVisited.size > 0 || stepDone(ASSESS_FLOW[0]);
    const complete = !next;
    assessStepBtn.textContent = complete ? 'Next step' : 'Start';
    assessStepBtn.classList.toggle('btn-primary',   complete);
    assessStepBtn.classList.toggle('btn-secondary', !complete);
    rnAssessFoot.classList.toggle('is-away', started && !complete);
    /* "Assessment", not "Tasks added" and not the repair's "Tasks done". This
       panel stopped being a list of things that had happened when it became the
       five steps of the job — it is the assessment itself, and the tab names it.
       The count that would have gone in a heading over it went with the heading
       (hidden in tabbar.css): a done-over-total over rows that cannot be "done"
       was arithmetic nobody could act on. */
    rnTabTasksLabel.textContent = 'Assessment';
  }

  function paintRepair() {
    rnScreen.classList.toggle('is-assessment', rnmKind === 'assessment');
    if (rnmKind === 'assessment'){ paintAssessment(); return; }
    /* The tab is deliberately not reset on entry — a mechanic coming back should
       land where they left off. But Bike info is the assessment's tab and is
       hidden here, so a QCA who left the dashboard on it would hand the repair a
       live tab with no button: a blank screen under a bar with nothing lit. Only
       that one case is corrected. */
    if (rnTabs[1].btn.classList.contains('is-on')) setRnTab(0);
    /* The bar reads the WHOLE job — splitting the rows did not split the work. */
    const done  = REPAIR.checksDone + REPAIR.issuesDone;
    const total = REPAIR.checksTotal + REPAIR.issuesTotal;
    const pct   = total ? Math.round(100 * done / total) : 0;
    rnTabTasksLabel.textContent = 'Tasks done';
    rowName('rowChecks', 'Checklist');
    rowName('rowMech',   'Mechanical issues');
    rowName('rowElec',   'Electrical issues');
    countChecks.textContent = REPAIR.checksDone + '/' + REPAIR.checksTotal;
    countMech.textContent   = REPAIR.mechDone + '/' + REPAIR.mechTotal;
    countElec.textContent   = REPAIR.elecDone + '/' + REPAIR.elecTotal;
    /* The heading states the whole-repair tally the 6px band used to draw.
       A number you can read beats a bar you have to estimate. */
    rnTasksHead.textContent = 'Tasks done \u00b7 ' + done + '/' + total;
    /* Nothing else is conditional on being finished any more. Sign-off used to
       appear here as a Done button once done === total, which made finishing
       something the app granted rather than something the mechanic did — and it
       cost the hero 124px to make room for. It is Finish repair in the ⋮ now,
       offered whether or not everything closed, because a mechanic can be
       genuinely done with a bike they could not fully close. */
  }

  /* Inbound, unlike window.YuzenRnM which is outbound. The two screens that would
     move this bar are separate prototypes — mechanic-checks is the 2 checks and
     issues/ is the 13 issues — so the host sets the counts and this repaints. */
  window.RnM = {
    setRepair(next) { Object.assign(REPAIR, next); paintRepair(); },
    getRepair() { return { ...REPAIR }; },
    /* Forget which assessment steps have been visited. Nothing in the app calls
       it — one dashboard serves one bike for one job, so a QCA who has been to
       Mark penalties has been there — but a second bike would want it, and the
       suites need a clean sequence to assert the order of. */
    resetAssessFlow() { assessVisited.clear(); faultsConfirmed = false; paintRepair(); },
    /* The opposite, for a record being re-opened: a finished assessment has been
       all the way through by definition, so every step counts as visited. Without
       it the dashboard would open on a bike it calls done with four hollow rings
       and a CTA offering to start it. */
    completeAssessFlow() {
      ASSESS_FLOW.forEach(s => assessVisited.add(s.id));
      faultsConfirmed = true;
      paintRepair();
    },
    assessVisited() { return [...assessVisited]; },
    /* ── THE STEP CTA, for the step screens themselves ──────────────────────
       The dashboard's button walks the five steps; so does a button on each of
       the step screens, so a QCA who is standing on Mark penalties does not have
       to come back here to find out what is next. Both read the same two
       functions, which is what keeps them agreeing.

       nextStepLabel names the next step NOT YET DONE, which is not the same as
       the step after this one. That matters for the case Sagar named: someone
       who opens Electrical faults straight off the list, having already been to
       Mechanical, should be offered the picker rather than a step behind them.
       The step you are standing on is already marked visited by the time you get
       there, so it never offers you itself.

       "Assessment done" rather than "Finish" on these screens: on the dashboard
       the word sits under a list of five ticks and its meaning is obvious, and
       on a step screen it has to carry that meaning alone. */
    nextStepLabel(){
      const n = ASSESS_FLOW.find(s => !stepDone(s));
      /* `cta` where the button should say something other than the row's own
         name — see ASSESS_FLOW. Most steps have nothing to add and fall back. */
      return n ? (n.cta || n.label) : 'Assessment done';
    },
    advance(){
      const n = ASSESS_FLOW.find(s => !stepDone(s));
      if (!n) { window.YuzenRnM.onDone(); return; }
      openAssessStep(n.id);
    },
    /* Which flow the dashboard is standing in. The issues screen serves both and
       must not grow a step CTA on a repair. */
    isAssessment(){ return rnmKind === 'assessment'; },
    /* The QCA's own word that they are finished with the fault record — see
       faultsConfirmed. Read and written by that screen's footer. */
    faultsConfirmed(){ return faultsConfirmed; },
    confirmFaults(v){ faultsConfirmed = !!v; },
    /* What the banner above a step screen's CTA says, or nothing if that step is
       not finished — Figma 2913:32071. Reads the same stepDone the dashboard's
       ticks do, so a screen cannot claim to be done while its row says otherwise.
       See shared/stepbanner.js. */
    /* The two tabs of the merged step report themselves SEPARATELY: finishing
       the checklist is worth confirming on the checklist, whether or not the
       penalties beside it are done. So these two are conditions rather than a
       lookup, and everything else falls through to the flow. */
    stepBanner(id){
      if (id === 'assess')
        return checklistDone() ? 'Assessment checklist done' : '';
      if (id === 'penalty')
        return checklistDone() && penaltyOutstanding() === 0 ? 'Penalties marked' : '';
      const s = ASSESS_FLOW.find(x => x.id === id);
      return s && stepDone(s) ? (s.done || s.label + ' done') : '';
    },
    /* today / 1 day ago / N days ago. Exposed because the rule is the whole
       point of the reading and the suite has to be able to try all three — the
       panel itself can only ever show one of them at a time. */
    daysAgoText,
  };

  /* Each row is a step in the assessment and a plain way in on a repair, so the
     assessment's routes are recorded and the repair's are not. */
  document.getElementById('rowAssess').addEventListener('click', () => { tap(); openAssessStep('assess'); });
  document.getElementById('rowChecks').addEventListener('click', () => {
    tap();
    if (rnmKind === 'assessment') { openAssessStep('checks'); return; }
    window.YuzenRnM.onOpenChecks();
  });
  /* Both issue rows lead to the same screen — it is one list with two sections,
     and it opens on the one that was asked for. */
  /* The repair's two, unchanged — they are hidden on an assessment. */
  document.getElementById('rowMech').addEventListener('click', () => {
    tap(); window.YuzenRnM.onOpenIssues('Mechanical');
  });
  document.getElementById('rowElec').addEventListener('click', () => {
    tap(); window.YuzenRnM.onOpenIssues('Electrical');
  });
  /* And the assessment's one. */
  document.getElementById('rowFaults').addEventListener('click', () => {
    tap(); openAssessStep('faults');
  });
  /* The penalty is recorded on the Mark penalty screen, so the row opens it.
     Reachable whether or not anything is faulty — an assessment that found
     nothing still has a "no penalty" to look at. */
  /* The Penalty row is gone from the assessment — it is the second TAB of the
     Assessment checklist row now. The element is still in the markup and hidden
     (see tasksheet.css) rather than deleted, because the repair may yet want a
     row of its own here and the counts it carries are still painted. */
  /* The Assessment checklist BUTTON stood here, opening the parts carousel while
     the Active checklist row opened the picker. It is the first ROW now
     (#rowAssess) and the button below the rows is the stepper — see ASSESS_FLOW.
     onOpenParts survives as the hook that row and the stepper both call. */
  /* + Add Issues — Mark Issues, which is the flow for putting faults on parts.
     Same destination the ⋮'s Report issues on bike has; this is the primary on the
     screen where a mechanic is standing at the bike, so it earns a button rather
     than a menu row. */
  /* + Add Issues is gone from this screen — the tab layout has no room for it, so
     the route is the ⋮'s Report issues on bike. It sets markIssuesFrom itself; see
     SHEET_ACTIONS in shared/sheet-config.js. */

  /* ---- Vitals ----------------------------------------------------------- */
  /* Three independent readings. Tapping one re-reads only that one: a mechanic
     chasing a flaky sensor should be able to retry it without disturbing the
     other two. Each reveals its glyph in a way that matches what it measures —
     the battery fills across, the IoT arcs light outward from their dot, the
     bluetooth rune blooms from the middle — and each counts its number up as it
     goes, so the animation is the reading rather than decoration.

     Open question worth settling: whether charge and IoT can really be read
     without a bluetooth link, or whether they come over the network. This treats
     them as independent, which is what makes each one individually tappable. */
  const READ_WAIT = { charge: 700, iot: 700, bt: 2600 };   // before anything is known
  const REVEAL    = { charge: 1000, iot: 800, bt: 700 };   // the glyph filling in
  const LOW       = { charge: 20, iot: 3.6 };              // below this, say so in red

  const vBt = document.getElementById('vBt');
  const vBtIcon = document.getElementById('vBtIcon');
  const vBtLabel = document.getElementById('vBtLabel');
  const vCharge = document.getElementById('vCharge');
  const vChargeLabel = document.getElementById('vChargeLabel');
  const vIot = document.getElementById('vIot');
  const vIotLabel = document.getElementById('vIotLabel');
  const screenVitals = document.getElementById('screenVitals');

  const BT_GLYPH = {
    off:        'assets/rnm/v-bt-off.svg',
    connecting: 'assets/rnm/v-bt-searching.svg',
    on:         'assets/rnm/v-bt-on.svg',
  };

  /* What the bike reports once each is read. Mock, but one place to change it. */
  const READING = { charge: 75, iot: 4.3 };

  const V = {
    charge: { el: vCharge, label: vChargeLabel, st: 'ok',
              fmt: v => Math.round(v) + '%' },
    iot:    { el: vIot,    label: vIotLabel,    st: 'ok',
              fmt: v => v.toFixed(1) + ' V' },
    bt:     { el: vBt,     label: vBtLabel,     st: 'ok' },
  };

  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const glyphOf = key => V[key].el.querySelector('i');

  /* Snap the glyph to a level, with no animation. */
  function setFill(key, pct) {
    const i = glyphOf(key);
    i.style.transition = 'none';
    i.style.setProperty('--fill', pct + '%');
  }

  /* Animate the glyph filling in. This is a CSS transition on the registered
     --fill property rather than a hand-rolled rAF loop: a loop stops dead
     wherever the browser is not producing animation frames — a backgrounded tab,
     an embedded viewer — and leaves the glyph stuck at whatever it reached. */
  function revealGlyph(key, ms) {
    const i = glyphOf(key);
    setFill(key, 0);
    void i.offsetWidth;                    // commit 0% before transitioning off it
    i.style.transition = `--fill ${ms}ms cubic-bezier(.22, .61, .36, 1)`;
    i.style.setProperty('--fill', '100%');
  }

  /* Counts the label up alongside the fill, on a timer rather than per frame —
     it reads the clock each tick, so a throttled tab catches up instead of
     drifting, and it always lands exactly on the reading. */
  function countUp(key, ms, to, fmt) {
    const v = V[key];
    return new Promise(resolve => {
      const t0 = Date.now();
      clearInterval(v.tick);
      v.label.textContent = fmt(0);
      v.tick = setInterval(() => {
        const t = Math.min(1, (Date.now() - t0) / ms);
        v.label.textContent = fmt(to * easeOut(t));
        if (t >= 1) {
          clearInterval(v.tick);
          v.label.textContent = fmt(to);   // land on the reading, not near it
          resolve();
        }
      }, 40);
    });
  }

  /* idle: never read. pending: a read in flight. ok: a reading in hand.
     alert: no link, or a reading under LOW — the only state that goes red. */
  function markVital(key, state) {
    const v = V[key];
    v.st = state;
    v.el.classList.toggle('is-idle', state === 'idle');
    v.el.classList.toggle('is-alert', state === 'alert');
    v.el.classList.toggle('is-pending', state === 'pending');
    // idle and alert show the whole glyph flat; a live one is filled by the reveal.
    if (state === 'idle' || state === 'alert') setFill(key, 100);
    paintVitalsScreen();
  }

  async function readVital(key) {
    const v = V[key];
    if (v.st === 'pending') return;                  // already on its way
    /* Tapping a vital that is already live drops it. One rule for all three, so
       every column demonstrates its own red state and comes back on a second tap.
       Bluetooth always worked this way; charge and IoT now match it, because a
       re-read of a good reading returned the same good reading and there was no
       way to reach the alert design at all. */
    if (v.st === 'ok') {
      if (key === 'bt') {
        S.bt = 'off';
        vBtIcon.style.setProperty('--glyph', `url(${BT_GLYPH.off})`);
        vBtLabel.textContent = 'Connect';
        markVital('bt', 'alert');
        window.YuzenRnM.onConnect('disconnected');
      } else {
        /* No link, so the reading is unknown rather than low — the same '--' the
           detail rnscreen shows for everything else once the link is gone. */
        clearInterval(v.tick);
        v.label.textContent = '--';
        markVital(key, 'alert');
        window.YuzenRnM.onRead(key, null);
      }
      return;
    }
    markVital(key, 'pending');
    if (key === 'bt') {
      S.bt = 'connecting';
      vBtIcon.style.setProperty('--glyph', `url(${BT_GLYPH.connecting})`);
      vBtLabel.textContent = 'Connecting';
      window.YuzenRnM.onConnect('connecting');
    } else {
      v.label.textContent = '--';
    }
    await new Promise(r => setTimeout(r, READ_WAIT[key]));

    if (key === 'bt') {
      S.bt = 'on';
      vBtIcon.style.setProperty('--glyph', `url(${BT_GLYPH.on})`);
      vBtLabel.textContent = 'Connected';
      markVital('bt', 'ok');
      revealGlyph('bt', REVEAL.bt);
      window.YuzenRnM.onConnect('connected');
      return;
    }
    const value = READING[key];
    markVital(key, value <= LOW[key] ? 'alert' : 'ok');
    revealGlyph(key, REVEAL[key]);
    await countUp(key, REVEAL[key], value, v.fmt);
    window.YuzenRnM.onRead(key, value);
  }

  vCharge.addEventListener('click', () => { tap(); readVital('charge'); });
  vIot.addEventListener('click', () => { tap(); readVital('iot'); });
  vBt.addEventListener('click', () => { tap(); readVital('bt'); });

  /* The placeholder rnscreen reads the same state, so it can never drift out of
     step with the strip that opened it. */
  function paintVitalsScreen() {
    if (!screenVitals) return;
    const on = S.bt === 'on';
    const known = k => V[k].st === 'ok' || V[k].st === 'alert' && k === 'bt';
    const charge = V.charge.st === 'ok' ? READING.charge + '%' : '--';
    const iot    = V.iot.st === 'ok' ? READING.iot.toFixed(1) + ' V' : '--';
    const rows = {
      charge, iot,
      bt:       on ? 'Connected' : S.bt === 'connecting' ? 'Connecting' : 'Not connected',
      odo:      on ? '12,480 km' : '--',
      range:    on ? '48 km'     : '--',
      temp:     on ? '31 °C'     : '--',
      cycles:   on ? '412'       : '--',
      firmware: on ? 'v2.14.3'   : '--',
      seen:     on ? 'Just now'  : '--',
    };
    screenVitals.querySelectorAll('.vrow').forEach(row => {
      const key = row.dataset.v;
      row.querySelector('span').textContent = rows[key];
      const alert = key === 'bt' ? !on
        : (key === 'charge' || key === 'iot') && V[key].st === 'alert';
      row.classList.toggle('is-alert', alert);
      row.classList.toggle('is-idle', !alert && rows[key] === '--');
    });
  }

  /* ---- All vitals (placeholder) ----------------------------------------- */
  function setVitalsScreen(open) {
    screenVitals.classList.toggle('is-up', open);
    screenVitals.setAttribute('aria-hidden', String(!open));
    if (open) armRefresh(screenVitals);
  }
  /* What the ⋮ routes here — see shared/sheet-config.js. */
  rnmShowVitals = () => setVitalsScreen(true);
  /* Two ways in now: the arrow in the vitals strip and this rncard. Both open the
     same rnscreen — flagged in the README, since two affordances for one thing on
     one rnscreen is a decision to make rather than a thing to leave. */
  document.getElementById('btnViewAllCmd')
    .addEventListener('click', () => { tap(); setVitalsScreen(true); window.YuzenRnM.onViewAll(); });

  document.getElementById('btnVitalsBack')
    .addEventListener('click', () => { tap(); setVitalsScreen(false); });

  /* The bike is linked and read: charge, IoT voltage and bluetooth all rest in
     their good state. It used to open with all three red — nothing read and no
     link — which was honest about a cold start but meant the rnscreen introduced
     itself as a fault. Tap any column to drop it and see the red design.
     paintVitalsScreen() rather than markVital(), because the resting state is
     already what the markup says; this only syncs the detail rnscreen to it. */
  paintLock();
  paintVitalsScreen();
  paintRepair();

  setSeatState('Closed');            // the resting position
  /* Up, not down. The open tasks ARE the dashboard's job — the checklist and the
     two issue lists are what a mechanic came to this screen to work through — so
     the screen opens on them rather than on a sheet you have to know to raise.
     The commands underneath are a tool, and a tool can wait behind a menu row;
     see the ⋮'s Bike commands, which sends this back down to reveal them. */
  setRnTab(0);
  setRnCar(0);

  /* The one export: called by the router when this screen is shown. */
  /* ---- Live repair timer ------------------------------------------------- */
  /* Counts up for as long as the repair is open. Seeded at 4min 15sec rather than
     zero, because the frame shows it there and because the honest reading is that
     the repair started when the bike was picked up, not when this screen was
     opened — a dashboard you reach four steps into a task should not claim the
     work began the moment you looked at it.

     setInterval, not rAF: a backgrounded tab throttles rAF to nothing and the
     clock would silently stop. It also runs whether or not this screen is on
     frame, which is the point — the repair does not pause because you walked over
     to the Issues list. */
  const RN_TIMER_SEED = 255;
  const rnClockEl = document.getElementById('rnTimerClock');
  let rnSeconds = RN_TIMER_SEED;

  function paintRnTimer(){
    const m = Math.floor(rnSeconds / 60), s = rnSeconds % 60;
    /* "12m 40s" — the same short form the queue rows use for how long a bike has
       been waiting, so a duration reads the same wherever it appears. */
    rnClockEl.textContent = m + 'm ' + String(s).padStart(2, '0') + 's';
  }
  paintRnTimer();
  setInterval(() => { rnSeconds++; paintRnTimer(); }, 1000);

  /* Pull both tallies from the screens that own them on the way in, rather than
     trusting the copy REPAIR was seeded with — those screens own the records and
     these cards are views of them. Judge a part or resolve an issue there, come
     back, and the cards have moved. */
  enterRnm = function(){
    /* Which flow this is, read at the door — see rnmKind in task-kinds.js. Only
       the assessment differs; anything else gets the repair's shape, which is the
       screen as it was drawn. */
    rnmKind = jobKind === 'assessment' ? 'assessment' : 'repair';
    /* Before anything reads the record: an assessment opens on an empty mechanical
       list, a repair opens on the two reports it was sent for. */
    prepareIssuesFor(rnmKind);
    /* What this timer is timing, and on which bike. Two flows reach this
       dashboard and they are different jobs — the mechanic's is a live repair, the
       QCA's is an assessment — so the label follows rnmKind rather than being
       fixed in the markup. The clock itself is unchanged: both are "how long has
       this been open", which is the same reading either way.

       The bike is beside it because the timer said "Live repair" and nothing else,
       which on a screen reached from a queue of bikes left the one fact a mechanic
       needs to confirm off the only always-visible line. */
    document.getElementById('rnTimerWhat').textContent =
      rnmKind === 'assessment' ? 'Bike assessment' : 'Live repair';
    document.getElementById('rnTimerBike').textContent = ' · ' + BIKE.id;
    const t = issuesTally();
    REPAIR.issuesDone = t.done;
    REPAIR.issuesTotal = t.total;
    const m = issuesTallyBy('Mechanical');
    REPAIR.mechDone = m.done; REPAIR.mechTotal = m.total;
    const e = issuesTallyBy('Electrical');
    REPAIR.elecDone = e.done; REPAIR.elecTotal = e.total;
    const c = checksTally();
    REPAIR.checksDone = c.done;
    REPAIR.checksTotal = c.total;
    paintRepair();
    /* paintRepair is what puts the screen into (or out of) its assessment shape,
       and that shape has a third tab — so the marker has to be measured AFTER it,
       or it keeps the width and offset it had for two tabs. */
    moveRnTabInk();
    paintVitalsScreen();
    paintParts();
    /* Part exchange is somewhere you went; arriving at the dashboard means you
       have left it. The open-tasks sheet is deliberately NOT reset — a mechanic
       who opened the list, closed a task and came back should land on the list
       with its count moved, not have to raise it again. */
    setPartsScreen(false);
    setCompScreen(false);
  };
})();
