  'use strict';

  /* ======================================================================
     STITCHING CONTRACT — the page's whole outbound surface. To wire this
     into the assembled prototype, replace the function bodies below.
     `onProgress` is the one the token list needs: it fires on every step
     change with the fraction complete, which is what drives the ring on
     the Ongoing tab.
     ====================================================================== */
  window.Yuzen = {
    onBack()        { console.log('[Yuzen] onBack'); },
    onMore()        { console.log('[Yuzen] onMore'); },
    onLearn()       { console.log('[Yuzen] onLearn'); },
    onOpenFeedback(){ console.log('[Yuzen] onOpenFeedback'); },
    onOpenStep(id) { console.log('[Yuzen] onOpenStep', id); },
    onDictate(on)   { console.log('[Yuzen] onDictate', on); },
    onTab(tab)      { console.log('[Yuzen] onTab', tab); },
    // step: 0..3, done: how many are complete, of: total
    onProgress(p)   {
      console.log('[Yuzen] onProgress', p);
      if (window.TokenQueue) window.TokenQueue.progress(p);
    },
    onRecord(state, seconds) { console.log('[Yuzen] onRecord', state, seconds); },
    onStage(stage, pct)      { console.log('[Yuzen] onStage', stage, pct); },
    onOutcome(kind, reason)  { console.log('[Yuzen] onOutcome', kind, reason); },
  };

  /* ---- The token this screen is showing --------------------------------- */
  /* Whatever opened this screen passes it in. `onTokenOpen` in the token list
     already emits exactly this shape. */
  let TOKEN = { token: '08', name: 'Rakesh Kumar', vehicle: 'Dex NV', plate: '543210' };

  /* ---- The Service checklist -------------------------------------------- */
  /* Four steps. The zones are named as the yard names them — Live Repairable and
     Live Repaired are places a mechanic walks to, so they are capitalised and
     quoted rather than described. The bike goes back to the customer, not the
     driver: that was the open question and this is the answer. */
  const SERVICE_STEPS = [
    { id: 'complaint', todo: 'Collect customer feedbacks',
      done: 'Customer feedbacks collected' },
    { id: 'park',      todo: 'Move bike to "Live Repairable" zone',
      done: 'Moved to "Live Repairable" zone' },
    { id: 'pick',      todo: 'Pick bike from "Live Repaired" zone',
      done: 'Picked from "Live Repaired" zone' },
    { id: 'handover',  todo: 'Handover bike to customer',
      done: 'Bike handed over to customer' },
  ];
  /* A swap keeps the token and changes what is left to do. The complaint and the
     parking still happened and still matter — the bike is still going to the
     workshop — so they stay, and only the remedy changes. */
  const SWAP_STEPS = [
    { id: 'assign',   todo: 'Assign a replacement bike', done: 'Replacement assigned' },
    { id: 'swapout',  todo: 'Handover replacement',      done: 'Replacement handed over' },
  ];
  /* Mutable, because the token's type can change under the captain. */
  let STEPS = SERVICE_STEPS.slice();

  /* What the captain fixed himself. This tab is the record of that, not a
     close button — the same bike coming back next week is why it is worth
     writing down. */
  const PUNCTURE_FIXES = ['Tyre inflated', 'Puncture patched', 'Tube replaced',
                          'Chain re-seated', 'Brake adjusted', 'Fitting tightened'];
  /* The live app's own lists, from the YC Token screens. The Figma frame showed
     placeholders (User gone / No photos / Rust); these are what captains actually
     pick, so they are what the prototype should test with. */
  const UNFIT_REASONS = ['Photo Unavailable', 'No Issue With Bike', 'Customer Left', 'Others'];
  const SWAP_REASONS_LIST = ['Approve Free Upgrade', 'Normal Swap', 'Bike Unavailable'];
  /* Picking Others has to be spelled out, and the live app holds Submit until it
     is: at least 5 characters, at most 100. */
  const OTHER_MIN = 5, OTHER_MAX = 100;
  /* What is standing in the RTD zone right now. Mock — the real number decides
     whether a swap is even possible. */
  const RTD_BIKES = [
    { id: 'DEX 774102', charge: 92 },
    { id: 'DEX 551903', charge: 78 },
    { id: 'WYN 220145', charge: 64 },
  ];

  /* The workshop stages the captain watches while the bike is out of his hands.
     PROVISIONAL: these names and weights are not confirmed — they are the same
     placeholder set the token list's Ongoing ring uses, kept identical so the
     two screens cannot disagree. */
  const STAGES = [
    { label: 'In queue',      pct: 10 },
    { label: 'Assessment',    pct: 25 },
    { label: 'Faults marked', pct: 40 },
    { label: 'Under repair',  pct: 60 },
    { label: 'Quality check', pct: 85 },
    { label: 'Ready',         pct: 100 },
  ];

  /* What the mechanic found. This is the captain's basis for escalating to a
     swap, which is why it is surfaced here rather than left in the mechanic's
     own flow. Mock, but it is the shape the assessment flow produces. */
  const FAULTS = [
    { severity: 'minor', part: 'Front brake pad', note: 'worn, replaced' },
    { severity: 'minor', part: 'Horn',            note: 'loose contact' },
  ];

  /* The token has exactly one live route at a time: Service until an outcome is
     chosen, then whichever route that outcome put it on. The checklist belongs to
     the live route — not to the Service tab — which is what lets a swapped token
     keep showing its steps after Service is no longer available. */
  function liveTab() {
    if (S.outcome === 'puncture') return 'puncture';
    if (S.outcome) return 'swap';
    return 'service';
  }

  const S = {
    tab: 'service',
    step: 0,              // the step the captain is on
    done: 0,              // how many are complete
    recording: false,
    recSeconds: 0,
    clip: null,           // { seconds } once recorded
    stage: -1,            // index into STAGES, -1 = not with the mechanic yet
    expanded: {},         // which done steps are open
    testing: false,
    outcome: null,        // 'puncture' | 'unfit' | 'swap' once chosen
    type: 'Service',      // the token's type; a swap changes it
    fixes: [],            // which puncture fixes the captain ticked
    reason: null,         // the reason behind the outcome
    floorPct: 0,          // a swapped token's progress cannot fall
  };

  const elSteps  = document.getElementById('jbSteps');   // the measuring box
  const elRows   = document.getElementById('jbRows');    // wiped on every render
  const elRails  = document.getElementById('jbRails');   // persists, so it can animate
  const elFooter = document.getElementById('footer');
  const elToast  = document.getElementById('toast');

  function tap() { if (navigator.vibrate) navigator.vibrate(10); }

  /* The bar names the plate; the token's own heading lives below it. Once that
     heading scrolls out of sight the bar picks up the name, so you always know
     which token you are inside. This is the behaviour Sagar's appbar__suffix was
     built for. */
  const elScroll = document.getElementById('jbScroll');
  const elBar    = document.getElementById('jbBar');
  const elTitle  = document.getElementById('jbTitle');
  const elId     = document.getElementById('tokId');     // the one identity
  const elSlot   = document.getElementById('tokSlot');   // where it aims on the card
  const elDock   = document.getElementById('jbDock');    // the one progress bar
  const elPSlot  = document.getElementById('tokProgSlot');
  /* His bar is transparent over the hero and turns solid once the title block
     has passed under it, at which point it carries the token's name and the
     progress docks beneath it. */
  /* The sheet has to be able to reach the top whatever a tab holds, or the
     expanded state is unreachable — with four short steps there was only 225px
     of travel where ~295 was needed. The tail is measured, not fixed, so it adds
     exactly the shortfall and nothing more. */
  function sizeScrollTail() {
    elSteps.style.paddingBottom = '0px';
    /* The tail exists so a short checklist can still be scrolled far enough for
       the card to clear the bar. The outcome tabs have no checklist and nothing
       to dock, so on those it is ~400px of blank page pretending to be content.
       They stay their own height. */
    if (S.tab !== liveTab()) return;
    const pin = elBar.getBoundingClientRect().bottom;
    /* The card's BOTTOM, not its top: it now scrolls right under the bar instead
       of pinning beneath it, and --c only reaches 1 once it has fully cleared. */
    const start = elTitle.getBoundingClientRect().bottom + elScroll.scrollTop;
    const need = Math.max(0, (start - pin) - (elScroll.scrollHeight - elScroll.clientHeight));
    elSteps.style.paddingBottom = Math.round(need) + 'px';
  }

  /* One number, 0 to 1, for how far the token page has become the expanded view.
     Everything that changes between the two reads from it, so they move together
     and land together. */
  function paintAppbar() {
    const pin = elBar.getBoundingClientRect().bottom;
    const now = elTitle.getBoundingClientRect().bottom;
    const from = elTitle.offsetTop + elTitle.offsetHeight;  // its bottom, unscrolled
    const span = Math.max(1, from - pin);
    const c = Math.min(1, Math.max(0, (from - now) / span));
    scrJob.style.setProperty('--c', c.toFixed(3));
    elBar.classList.toggle('is-solid', c > .98);    // kept for anything keyed to it
    placeIdentity();
  }

  /* The identity rests in the bar and is pulled down onto the card's hidden slot
     whenever the card is below it. It rides the card exactly, then docks: once
     the row would pass the bar it stops and the rest of the card slides under.

     Interpolating between the two positions was wrong. The card and the identity
     travel nearly the same distance, so any blend leaves the name in mid-air,
     detached from the row it belongs to. Glue plus a clamp is what the frames
     actually show.

     The resting origin is derived by subtracting the translate last applied
     rather than cached, so it survives the type resizing underneath it and any
     relayout. */
  const DOCK = 96;                 // the last stretch of approach, where it resizes
  let idT = { x: 0, y: 0 };
  function placeIdentity() {
    const here = elId.getBoundingClientRect();
    const rest = { x: here.left - idT.x, y: here.top - idT.y };
    const slot = elSlot.getBoundingClientRect();
    const dy = slot.top - rest.y;                        // >0 while below the bar
    const d = Math.min(1, Math.max(0, 1 - dy / DOCK));   // 0 riding, 1 docked
    idT = { x: (slot.left - rest.x) * (1 - d), y: Math.max(0, dy) };
    elId.style.transform = `translate(${idT.x.toFixed(1)}px, ${idT.y.toFixed(1)}px)`;
    /* Its own --c, so the badge and type shrink as it arrives rather than across
       the whole scroll. The screen's --c still drives the bar and the dock. */
    elId.style.setProperty('--c', d.toFixed(3));
    scrJob.style.setProperty('--d', d.toFixed(3));   // the % label reads this
    placeProgress(d);
  }

  /* The progress bar rides the card and docks with the name, on the same
     fraction, so the two arrive together. Where the identity only moves, this
     also grows: inset 24 and rounded on the card, full-bleed and square in the
     strip. Interpolating left/width rather than scaleX matters — scaling would
     stretch the fill and lie about the percentage. */
  const DOCK_TOP = () => elBar.getBoundingClientRect().bottom - scrJob.getBoundingClientRect().top;
  function placeProgress(d) {
    const slot = elPSlot.getBoundingClientRect();
    const screen = scrJob.getBoundingClientRect();
    const restL = slot.left - screen.left, restW = slot.width;
    const restT = slot.top - screen.top;
    const dockT = DOCK_TOP();
    const lerp = (a, b) => a + (b - a) * d;
    elDock.style.left = lerp(restL, 0).toFixed(1) + 'px';
    elDock.style.width = lerp(restW, screen.width).toFixed(1) + 'px';
    elDock.style.top = lerp(restT, dockT).toFixed(1) + 'px';
    elDock.style.borderRadius = lerp(3, 0).toFixed(1) + 'px';
  }
  elScroll.addEventListener('scroll', paintAppbar, { passive: true });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' +
                  String(Math.floor(s % 60)).padStart(2, '0');

  let toastTimer = 0;
  function toast(msg) {
    elToast.textContent = msg;
    elToast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove('is-on'), 2200);
  }

  /* ---- Progress out to the token list ----------------------------------- */
  function reportProgress() {
    // While the bike is with the mechanic the captain's step count sits still,
    // so the stage carries the movement — otherwise the Ongoing ring would
    // freeze for the whole repair.
    let fraction = S.done / STEPS.length;
    if (S.step === 2 && S.stage >= 0) {
      const within = STAGES[S.stage].pct / 100;
      fraction = (S.done + within) / STEPS.length;
    }
    let pct = Math.round(fraction * 100);
    /* A swap is a one-way door, and it throws away the workshop fraction the
       token had already earned — 53% became 50%. Monotonic from the moment it
       converts, because a ring that steps backwards reads as a bug to whoever is
       watching the queue. Before a conversion the count can still fall, which is
       correct: deleting the recording really does undo that step. */
    if (S.outcome === 'swap') pct = Math.max(pct, S.floorPct || 0);
    S.floorPct = pct;          // remembered on every report, so the conversion
                               // inherits the figure the token had just earned
    ['tokProgSlot', 'tokDockProg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.querySelector('i').style.width = pct + '%'; el.setAttribute('aria-valuenow', pct); }
    });
    const lbl = document.getElementById('tokProgPct');
    if (lbl) lbl.textContent = pct + '%';
    window.Yuzen.onProgress({
      token: TOKEN.token,
      step: S.step,
      done: S.done,
      of: STEPS.length,
      stage: S.stage >= 0 ? STAGES[S.stage].label : null,
      percent: pct,          // the clamped figure, so the ring and the label agree
    });
  }

  /* ---- Markers ---------------------------------------------------------- */
  const TICK_DOT = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="12" fill="var(--surface-positive)"/>'
    + '<path d="M7.5 12.4l3 3 6-6.2" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const MARKER = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle class="ring" cx="12" cy="12" r="12"/>
      <circle class="dot"  cx="12" cy="12" r="4"/>
      <path class="tick" d="M7.5 12.4l3 3 6-6.2"/>
    </svg>`;
  const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>';

  /* ---- The Service tab -------------------------------------------------- */
  /* His waveform, verbatim: 31 bars of these heights, drawn rather than shipped
     as an asset so the row survives being any width. Both recorders on this
     prototype use it, because there is only one recorder component. */
  const WAVE = [3,7,4,9,5,11,6,13,5,10,4,8,6,12,7,9,4,11,5,7,3,9,6,12,4,8,5,10,3,7,4];
  function waveBars(played) {
    return WAVE.map((h, i) =>
      `<i class="${i < played ? 'is-played' : ''}" style="height:${h}px"></i>`).join('');
  }

  const PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
                   '<path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

  /* The step row's clip is the same .fbaudio component as the feedback page —
     same 64px pill, same bars — with the trailing control swapped from playback
     speed to delete, because this recording is the captain's own and he has to
     be able to drop it. */

  function workHTML() {
    const st = STAGES[Math.max(0, S.stage)];
    return `
      <div class="tk__work">
        <span class="tk__workCap t-label-xs">Repair status</span>
        <div class="tk__workHead">
          <span class="tk__stage">${esc(st.label)}</span>
          <span class="tk__pct t-label-sm">${st.pct}%</span>
        </div>
        <div class="tk__bar"><i id="workBar"></i></div>
      </div>`;
  }

  function serviceHTML() {
    return STEPS.map((s, i) => {
      const done = i < S.done;
      const active = i === S.step && !done;
      const label = done ? s.done : s.todo;

      /* The row is status. The chevron is a promise that there is something to
         read, so it only appears once there is: no arrow on a step nothing has
         happened to yet. The one row that is tappable while still empty is the
         complaint, and it goes straight to the recorder rather than to a page
         explaining that the recorder exists. */
      const info = stepHasInfo(s.id);
      const toFeedback = !info && s.id === 'complaint' && S.step === 0;
      const nav = info ? `data-open="${s.id}"` : toFeedback ? 'data-feedback="1"' : '';
      const extra = (s.id === 'pick' && active && S.stage >= 0) ? workHTML() : '';
      const dot = done ? TICK_DOT : '<i></i>';
      return `
        <div class="jb__step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}"
             data-step="${s.id}" ${nav}
             ${nav ? `role="button" tabindex="0" aria-label="${esc(label)}${
                        info ? ' — open details' : ' — record the feedback'}"` : ''}>
          <span class="dot">${dot}</span>
          <span class="body">
            <span class="top">
              <span class="lbl t-label-md">${esc(label)}</span>
              ${info ? `<span class="tk__go" aria-hidden="true">${CHEV_RIGHT}</span>` : ''}
            </span>
            ${extra ? `<span class="extra">${extra}</span>` : ''}
          </span>
        </div>`;
    }).join('');
  }

  /* ---- Footer per state ------------------------------------------------- */
  const TICK_ICON = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l5 5 9-9.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const MIC_ICON  = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v5.5A3.5 3.5 0 0 0 12 15Zm6-3.5a6 6 0 0 1-5.25 5.95V21h-1.5v-3.55A6 6 0 0 1 6 11.5h1.5a4.5 4.5 0 0 0 9 0H18Z"/></svg>';

  function footerHTML() {
    /* An outcome tab the token is not on: its own controls. */
    if (S.tab !== liveTab()) {
      if (S.tab === 'puncture') {
        const off = S.fixes.length === 0;      // nothing to confirm until he says what he did
        return (off ? '<span class="tk__why t-label-sm">Tick what you fixed</span>' : '') +
               `<button class="btn-primary t-label-md700" id="btnPuncture" type="button"
                        ${off ? 'disabled' : ''}>Close token</button>`;
      }
      /* Others has no footer: each row carries its own reason and its own
         consequence, so a button shared between them could only be ambiguous. */
      return '';
    }
    if (S.recording) {
      return `
        <div class="tk__rec">
          <span class="tk__time t-label-md" id="recTime">0:00</span>
          <span class="tk__recWave" id="recWave" aria-hidden="true">${
            Array.from({ length: 40 }, (_, i) =>
              `<i style="animation-delay:${(i * 70) % 900}ms"></i>`).join('')}</span>
          <button class="tk__stop" id="btnStop" type="button" aria-label="Stop recording"><b></b></button>
        </div>`;
    }
    if (S.done >= STEPS.length) {
      return `<button class="btn-primary t-label-md700" id="btnCta" type="button"
                      disabled>Token closed</button>`;
    }
    /* Keyed on which step it is, not on its index: a swapped token has different
       steps in positions 2 and 3, and an index-driven footer offered to pick up a
       bike that had just been swapped away. */
    const id = STEPS[S.step].id;
    /* No leading icons. A tick before "Bike picked" claims the thing is already
       done; the button is the doing of it.

       When a button is disabled the reason goes above it rather than into it, so
       the button can keep naming the action and the line can explain the wait.
       That way the captain reads "why not yet" and "what next" as two separate
       facts instead of one ambiguous label. */
    const btn = (label, off = false, because = '') =>
      (off && because ? `<span class="tk__why t-label-sm">${esc(because)}</span>` : '') +
      `<button class="btn-primary t-label-md700" id="btnCta" type="button"
              ${off ? 'disabled' : ''}>${esc(label)}</button>`;

    if (id === 'complaint') return btn('Start');
    if (id === 'park')      return btn('Bike moved');
    if (id === 'pick') {
      const st = STAGES[Math.max(0, S.stage)];
      return S.stage >= STAGES.length - 1
        ? btn('Bike picked')
        : btn('Bike picked', true, `With the mechanic — ${st.label.toLowerCase()}`);
    }
    if (id === 'assign')    return btn('Replacement assigned');
    if (id === 'swapout')   return btn('Replacement handed over');
    return btn('Bike handed over', S.testing, 'Take it for a quick test ride first');
  }

  /* ---- Stubs for the other two tabs ------------------------------------- */
  const SWAP_REASONS = [
    { id: 'major',    label: 'Major repair',      hint: 'Too long to wait — the driver takes another bike' },
    { id: 'parts',    label: 'Parts unavailable', hint: 'Cannot be finished today' },
    { id: 'unfit',    label: 'Unserviceable',     hint: 'Off the road until further notice' },
    { id: 'accident', label: 'Accident damage',   hint: 'Needs assessment before any repair' },
  ];

  function stubHTML() {
    if (S.tab === 'puncture') {
      /* Not a close button: a record of what the captain did before he gave the
         bike back. Multi-select, because two of these often happen together. */
      return `<div class="tk__outcomes">
        <span class="swp__cap t-label-xs" style="margin-top:0">What you fixed</span>
        <div class="tk__chiprow" role="group" aria-label="What you fixed">
          ${PUNCTURE_FIXES.map(f => `
            <button class="tkchip t-label-md" type="button" data-fix="${esc(f)}"
                    aria-pressed="${S.fixes.includes(f)}">${esc(f)}</button>`).join('')}
        </div>
      </div>`;
    }
    /* The Others frame: two rows, one that ends the token and one that changes
       it. Both ask for a reason; only their consequence differs. */
    return `<div class="tk__outcomes"><div class="sheet__list">
      <button class="sheet__opt" type="button" data-outcome="unfit">
        ${BLOCK_ICON}<span class="lbl t-label-md">Bike is unserviceable</span>
        <span class="tk__go" aria-hidden="true">${CHEV_RIGHT}</span>
      </button>
      <button class="sheet__opt" type="button" data-outcome="swap">
        ${SWAP_ICON}<span class="lbl t-label-md">Bike swap</span>
        <span class="tk__go" aria-hidden="true">${CHEV_RIGHT}</span>
      </button>
    </div></div>`;
  }

  /* ---- Render ----------------------------------------------------------- */
  function render() {
    elRows.innerHTML = S.tab === liveTab() ? serviceHTML() : stubHTML();
    elFooter.innerHTML = footerHTML();
    paintAppbar();
    // The bar animates from 0 on insert, so it has something to travel from.
    // Rail spans dot-centre to dot-centre, measured rather than guessed.
    if (S.tab === liveTab()) {
      const dots = [...elSteps.querySelectorAll('.dot')];
      if (dots.length > 1) {
        let rail = elRails.querySelector('.jb__rail');
        if (!rail) { rail = document.createElement('div'); rail.className = 'jb__rail'; elRails.append(rail); }
        let fill = elRails.querySelector('.jb__rail--done');
        if (!fill) { fill = document.createElement('div'); fill.className = 'jb__rail--done'; elRails.append(fill); }
        const box = elSteps.getBoundingClientRect();
        const centre = d => { const r = d.getBoundingClientRect(); return r.top - box.top + r.height / 2; };
        const top = centre(dots[0]);
        rail.style.top = fill.style.top = top + 'px';
        rail.style.height = (centre(dots[dots.length - 1]) - top) + 'px';
        /* Fills to the step in hand — the active one, or the last one if the
           token is closed. The height is a transition, so the line travels to
           the next dot instead of appearing there. */
        const at = elSteps.querySelector('.jb__step.is-active .dot')
                || dots[dots.length - 1];
        fill.style.height = Math.max(0, centre(at) - top) + 'px';
      }
    } else {
      elRails.querySelectorAll('.jb__rail, .jb__rail--done').forEach(r => r.remove());
    }
    sizeScrollTail();
    paintAppbar();
    const bar = document.getElementById('workBar');
    if (bar) requestAnimationFrame(() => { bar.style.width = STAGES[Math.max(0, S.stage)].pct + '%'; });
  }

  /* ---- Advancing the checklist ------------------------------------------ */
  function advance() {
    if (S.done < S.step + 1) S.done = S.step + 1;
    S.step = Math.min(S.done, STEPS.length - 1);
    if (S.done >= STEPS.length) S.step = STEPS.length - 1;
    reportProgress();
    render();
    /* Walk forward. Once the work has started the next step is where the captain
       is going, so take him there rather than returning him to the checklist to
       find it. Back from a step page shows the checklist, which makes the list an
       overview rather than a corridor. */
    if (S.done > 0 && S.done < STEPS.length && scrStep) openStep(STEPS[S.step].id);
    /* A swap closes when the replacement is actually in the driver's hands, not
       when the captain decides on one — until then the token is still open work.
       The Service route confirms from its own handler, which also runs the test
       ride first. */
    if (S.outcome === 'swap' && S.done >= STEPS.length) {
      showSuccess('Token Closed Successfully');
    }
  }

  /* ---- Recording -------------------------------------------------------- */
  let recTimer = 0;
  function startRecording() {
    S.recording = true; S.recSeconds = 0;
    window.Yuzen.onRecord('start', 0);
    render();
    const t0 = Date.now();
    clearInterval(recTimer);
    /* A full sweep of the pill takes REC_SWEEP seconds; past that it starts
       over, so a long recording keeps drawing rather than sitting full. */
    const REC_SWEEP = 20;
    recTimer = setInterval(() => {
      S.recSeconds = (Date.now() - t0) / 1000;
      const el = document.getElementById('recTime');
      if (el) el.textContent = mmss(S.recSeconds);
      const wave = document.getElementById('recWave');
      if (wave) {
        const bars = wave.children;
        const lit = Math.floor((S.recSeconds % REC_SWEEP) / REC_SWEEP * bars.length) + 1;
        for (let i = 0; i < bars.length; i++) bars[i].classList.toggle('is-on', i < lit);
      }
    }, 90);
  }
  function stopRecording() {
    clearInterval(recTimer);
    S.recording = false;
    S.clip = { seconds: Math.max(1, Math.round(S.recSeconds)) };
    S.expanded.complaint = true;
    window.Yuzen.onRecord('stop', S.clip.seconds);
    toast('Complaint recorded — the mechanic will hear this');
    advance();                    // the recording is the step; stopping completes it
  }

  /* ---- Playing it back -------------------------------------------------- */
  let playTimer = 0;

  /* ---- The workshop, advancing on its own ------------------------------- */
  /* Stands in for the mechanic's flow pushing updates. Each stage lands, the bar
     animates to it, and the token list hears about it. */
  let stageTimer = 0;
  function runWorkshop() {
    S.stage = 0;
    reportProgress();
    render();
    window.Yuzen.onStage(STAGES[0].label, STAGES[0].pct);
    clearInterval(stageTimer);
    stageTimer = setInterval(() => {
      if (S.stage >= STAGES.length - 1) {
        clearInterval(stageTimer);
        toast('Bike is ready to collect');
        return;
      }
      S.stage++;
      window.Yuzen.onStage(STAGES[S.stage].label, STAGES[S.stage].pct);
      reportProgress();
      render();
    }, 2600);
  }

  /* ---- Wiring ----------------------------------------------------------- */
  document.getElementById('btnClose').addEventListener('click', () => {
    tap(); window.Yuzen.onBack(); backToList();
  });
  /* The overflow sheet. Learn is one of its rows now. */
  const elSheet = document.getElementById('moreSheet');
  const elScrim = document.getElementById('scrim');
  function setSheet(open) {
    [elSheet, elScrim].forEach(el => {
      if (open) { el.hidden = false; void el.offsetHeight; }
      el.classList.toggle('is-on', open);
    });
    if (!open) setTimeout(() => { elSheet.hidden = true; elScrim.hidden = true; }, 300);
  }
  document.getElementById('btnMore').addEventListener('click', () => {
    tap(); setSheet(true); window.Yuzen.onMore();
  });
  elScrim.addEventListener('click', () => { tap(); setSheet(false); });
  document.getElementById('optLearn').addEventListener('click', () => {
    tap(); setSheet(false); window.Yuzen.onLearn();
  });

  document.getElementById('tabs').addEventListener('click', e => {
    /* .tk__tab, not .tab — nothing on this screen carries the bare class, so the
       strip was inert and neither outcome tab could be reached at all. */
    const t = e.target.closest('.tk__tab');
    if (!t || t.disabled) return;
    tap();
    S.tab = t.dataset.tab;
    [...document.querySelectorAll('.tk__tab')].forEach(x => x.classList.toggle('is-on', x === t));
    window.Yuzen.onTab(S.tab);
    lockTabs();
    render();
  });

  elSteps.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('[data-open]');
    if (row) { e.preventDefault(); openStep(row.dataset.open); return; }
    if (e.target.closest('[data-feedback]')) { e.preventDefault(); openFeedback(); }
  });
  elSteps.addEventListener('click', e => {
    /* Every row opens its own page. The row shows status; the page holds what
       actually happened. */
    const row = e.target.closest('[data-open]');
    if (row) { tap(); openStep(row.dataset.open); return; }
    if (e.target.closest('[data-feedback]')) { tap(); openFeedback(); return; }
    /* Others: each row asks for its reason before it does anything. */
    const out = e.target.closest('[data-outcome]');
    if (out) { tap(); openReasons(out.dataset.outcome); return; }
    /* Puncture: what the captain fixed. Several can be true at once. */
    const fix = e.target.closest('[data-fix]');
    if (fix) {
      tap();
      const f = fix.dataset.fix;
      S.fixes = S.fixes.includes(f) ? S.fixes.filter(x => x !== f) : S.fixes.concat(f);
      fix.setAttribute('aria-pressed', String(S.fixes.includes(f)));
      elFooter.innerHTML = footerHTML();      // the CTA turns on with the first tick
      return;
    }
  });

  let testTimer = 0;
  function onFooterClick(e) {
    if (e.target.closest('#btnStop')) { tap(); stopRecording(); return; }
    if (e.target.closest('#btnPuncture')) {
      tap();
      S.outcome = 'puncture'; S.type = 'Puncture'; S.reason = S.fixes.join(', ');
      clearInterval(stageTimer);
      /* Fixed on the spot: the bike never went to the workshop, so the middle of
         the service checklist never happened. */
      STEPS = [SERVICE_STEPS[0],
               { id: 'fixed', todo: 'Fix on the spot', done: `Fixed — ${S.fixes.join(', ')}` },
               SERVICE_STEPS[3]];
      S.done = STEPS.length; S.step = STEPS.length;
      paintType(); lockTabs(); reportProgress(); render();
      window.Yuzen.onOutcome('puncture', S.reason);
      showSuccess('Token Closed Successfully');
      return;
    }
    const cta = e.target.closest('#btnCta');
    if (!cta || cta.disabled) return;
    tap();

    if (S.step === 0) { openFeedback(); return; }
    if (S.step === 1) {
      advance();                              // parked -> the mechanic takes it
      runWorkshop();
      return;
    }
    if (S.step === 2) {
      clearInterval(stageTimer);
      S.stage = -1;
      advance();                              // picked -> handover, after a test
      S.testing = true;
      render();
      clearTimeout(testTimer);
      testTimer = setTimeout(() => { S.testing = false; render(); }, 4000);
      toast('Take it for a quick test');
      return;
    }
    advance();                                // handover complete
    /* Whatever route it took, a token ends the same way. The live app confirms a
       close with this dialog and it is the right call — closing is the one thing
       the captain cannot undo from here. */
    showSuccess('Token Closed Successfully');
  }
  /* One handler, two footers: the checklist's and the step page's. */
  elFooter.addEventListener('click', onFooterClick);
  document.getElementById('stepFooter').addEventListener('click', onFooterClick);

  /* ---- Customer feedback, on its own page ------------------------------- */
  const scrJob = document.getElementById('scrJob');
  const scrFb  = document.getElementById('scrFb');

  function showScreen(which) {
    // Sagar's screens travel on data-pos; the token slides left as this comes in.
    scrJob.dataset.pos = which === 'fb' ? 'left' : 'in';
    scrFb.dataset.pos  = which === 'fb' ? 'in' : 'right';
  }
  function openFeedback() { showScreen('fb'); window.Yuzen.onOpenFeedback(); }

  /* Closing the page is what completes the step — by the back arrow or by Done,
     because both mean the same thing here. */
  function closeFeedback() {
    showScreen('job');
    /* advance() takes it from here and opens the next step. */
    /* The step is waiting on the customer's recording, so leaving without one
       leaves the step where it was. Nothing is lost — the page keeps its state,
       and Get feedback returns to it. */
    if (S.step === 0 && REC.customer.state === 'done') {
      S.clip = { seconds: REC.customer.seconds };
      S.expanded.complaint = false;             // collapsed on return; the row is state
      advance();
      toast('Feedback saved — move the bike to "Live Repairable"');
    } else if (S.step === 0) {
      toast("Record the customer's feedback first");
    }
  }
  document.getElementById('fbBack').addEventListener('click', () => { tap(); closeFeedback(); });
  document.getElementById('fbDone').addEventListener('click', () => { tap(); closeFeedback(); });

  /* ══ Bridge from the queue ══════════════════════════════════════════════
     The queue is the entry point. Opening a token loads it here and resets the
     flow, because a token carries its own state and none of it belongs to the
     last one the captain looked at. ══ */
  function openToken(t) {
    TOKEN = { token: t.token, name: t.name,
              vehicle: t.vehicle || 'Dex NV', plate: t.plate || '543210' };
    STEPS = SERVICE_STEPS.slice();
    /* A token carries its own progress. Opening a Completed token on an empty
       checklist made it look untouched, which is worse than not listing it:
       the list said done and the token said nothing had happened. The list
       passes what it knows, and anything it does not know is derived from the
       stage the bike is at. */
    const st = t.state || {};
    const done = st.done != null ? st.done
               : t.pct >= 100 ? SERVICE_STEPS.length
               : t.stage ? 2 : 0;
    const stage = st.stage != null ? st.stage
                : t.stage ? Math.max(0, STAGES.findIndex(x => x.label === t.stage))
                : -1;
    Object.assign(S, {
      tab: 'service', step: Math.min(done, SERVICE_STEPS.length - 1), done,
      recording: false, recSeconds: 0,
      clip: done > 0 ? { seconds: 45 } : null,
      stage: done >= SERVICE_STEPS.length ? STAGES.length - 1 : stage,
      expanded: {}, testing: false, outcome: st.outcome || null,
      type: t.type || 'Service', fixes: st.fixes || [], reason: st.reason || null,
      floorPct: 0,
    });
    Object.keys(RECORDERS).forEach(k => {
      /* A step already done implies its recording exists. */
      REC[k] = done > 0 && k === 'customer'
        ? { state: 'done', seconds: 45, rate: 0 }
        : { state: 'idle', seconds: 0, rate: 0 };
      renderRec(k);
    });
    /* The identity is rendered twice — the traveller and the card's hidden slot
       — so both copies have to be repainted or the name changes as it docks. */
    document.querySelectorAll('#tokId, #tokSlot').forEach(box => {
      box.querySelector('.tk__badge').textContent = TOKEN.token;
      box.querySelector('.h').textContent = TOKEN.name;
      box.querySelector('.s').innerHTML =
        `<span class="tk__idType">${esc(S.type)} |&nbsp;</span>` +
        `${esc(TOKEN.vehicle)} &bull; ${esc(TOKEN.plate)}`;
    });
    document.querySelectorAll('.tk__tab').forEach(x => {
      x.disabled = false;
      x.classList.toggle('is-on', x.dataset.tab === 'service');
    });
    if (scrList) scrList.dataset.pos = 'left';
    scrJob.dataset.pos = 'in';
    elScroll.scrollTop = 0;
    reportProgress(); render(); sizeScrollTail(); paintAppbar();
  }

  /* Only when there is a list to go back to. Built on its own — which is how the
     other profiles will take this screen — the back arrow is the host's business,
     so it fires onBack and leaves the screen where it is. */
  function backToList() {
    if (!scrList) return;
    scrJob.dataset.pos = 'right';
    scrList.dataset.pos = 'in';
    if (window.TokenQueue) window.TokenQueue.show();
  }

  /* ══ Calling ═════════════════════════════════════════════════════════════
     A dummy, but it has to exist. Tapping "Call user" and having nothing happen
     is indistinguishable from a broken button, which is the one thing a tester
     will report as a bug rather than as feedback. ══ */
  const callScr = document.getElementById('callScr');
  let callTimer = 0;
  window.YuzenCall = {
    open(name, plate) {
      document.getElementById('callInitial').textContent = (name || '?').trim()[0];
      document.getElementById('callName').textContent = name || '';
      /* Masked: the prototype has no real numbers and should not imply it does. */
      document.getElementById('callNum').textContent =
        '+91 98•••• ' + String(plate || '000000').slice(-2);
      const state = document.getElementById('callState');
      state.textContent = 'Calling…';
      callScr.hidden = false;
      clearTimeout(callTimer);
      callTimer = setTimeout(() => { state.textContent = 'Ringing…'; }, 1600);
    },
  };
  document.getElementById('callEnd').addEventListener('click', () => {
    tap(); clearTimeout(callTimer); callScr.hidden = true;
  });

  /* ══ Outcomes: unserviceable, swap, puncture ════════════════════════════
     Unserviceable ENDS the token. A swap CONTINUES it — the customer's problem
     has not changed, only the remedy has, so the token keeps its recording, its
     faults and its clock, and its type changes from Service to Swap. Closing one
     token and opening another would lose that thread and double-count the bike
     in the queue. Progress carries on from where it was rather than resetting,
     so the ring on the Ongoing tab never goes backwards. ══ */
  const rsnScrim = document.getElementById('rsnScrim');
  const rsnSheet = document.getElementById('rsnSheet');
  const rsnChips = document.getElementById('rsnChips');
  const rsnTitle = document.getElementById('rsnTitle');
  const rsnOk    = document.getElementById('rsnConfirm');
  const rsnOther = document.getElementById('rsnOther');
  const rsnText  = document.getElementById('rsnText');
  const rsnCount = document.getElementById('rsnCount');
  const rsnHint  = document.getElementById('rsnHint');
  let rsnFor = null, rsnPick = null;

  function openReasons(kind) {
    rsnFor = kind; rsnPick = null;
    const list = kind === 'unfit' ? UNFIT_REASONS : SWAP_REASONS_LIST;
    rsnTitle.textContent = kind === 'unfit'
      ? 'Reason for unserviceability' : 'Reason for the swap';
    rsnChips.innerHTML = list.map(r =>
      `<button class="tkchip t-label-md" type="button" data-reason="${esc(r)}"
               aria-pressed="false">${esc(r)}</button>`).join('');
    rsnOk.disabled = true;
    rsnOk.querySelector('span').textContent = 'Submit';
    rsnText.value = ''; rsnOther.hidden = true;
    rsnScrim.hidden = false; rsnSheet.hidden = false;
    void rsnSheet.offsetHeight;            // commit before transitioning, not rAF
    rsnScrim.classList.add('is-on'); rsnSheet.classList.add('is-on');
  }
  function closeReasons() {
    rsnScrim.classList.remove('is-on'); rsnSheet.classList.remove('is-on');
    setTimeout(() => { rsnScrim.hidden = true; rsnSheet.hidden = true; }, 300);
  }
  rsnScrim.addEventListener('click', closeReasons);
  rsnChips.addEventListener('click', e => {
    const chip = e.target.closest('[data-reason]');
    if (!chip) return;
    tap();
    /* One reason, not several: the workshop acts on a single cause. */
    [...rsnChips.children].forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    rsnPick = chip.dataset.reason;
    paintOther();
  });

  /* Others is not a reason on its own — it is a promise to type one. The live app
     puts that in a second sheet; here it opens under the chips, because sending
     the captain to another sheet to write five words is a step that earns nothing. */
  function paintOther() {
    const wants = rsnPick === 'Others';
    rsnOther.hidden = !wants;
    if (wants) {
      const n = rsnText.value.trim().length;
      rsnCount.textContent = `${rsnText.value.length}/${OTHER_MAX}`;
      rsnHint.hidden = n >= OTHER_MIN;
      rsnOk.disabled = n < OTHER_MIN;
      rsnText.focus();
    } else {
      rsnOk.disabled = !rsnPick;
    }
  }
  rsnText.addEventListener('input', paintOther);
  rsnOk.addEventListener('click', () => {
    tap();
    if (!rsnPick) return;
    /* Others carries what was typed, not the word "Others". */
    const reason = rsnPick === 'Others' ? rsnText.value.trim() : rsnPick;
    if (rsnFor === 'unfit') markUnserviceable(reason);
    else confirmSwap(reason);
    closeReasons();
  });

  /* The live app confirms a close with a dialog rather than a toast, and it is
     the right call: closing a token is the one action the captain cannot undo
     from this screen, so it should take an acknowledgement. */
  function showSuccess(message) {
    document.getElementById('okMsg').textContent = message;
    okScrim.hidden = false; okCard.hidden = false;
    void okCard.offsetHeight;
    okScrim.classList.add('is-on'); okCard.classList.add('is-on');
  }
  const okScrim = document.getElementById('okScrim');
  const okCard  = document.getElementById('okCard');
  document.getElementById('okBtn').addEventListener('click', () => {
    tap();
    okScrim.classList.remove('is-on'); okCard.classList.remove('is-on');
    setTimeout(() => { okScrim.hidden = true; okCard.hidden = true; }, 240);
    backToList();                       // the token is done; the queue is next
  });

  function markUnserviceable(reason) {
    clearInterval(stageTimer);
    S.outcome = 'unfit'; S.reason = reason; S.type = 'Unserviceable';
    /* Terminal: whatever was still to do is replaced by the fact that it stopped. */
    STEPS = SERVICE_STEPS.slice(0, Math.max(1, S.done)).concat(
      [{ id: 'unfit', todo: 'Marked unserviceable', done: `Unserviceable — ${reason}` }]);
    S.done = STEPS.length; S.step = STEPS.length;
    paintType(); lockTabs(); reportProgress(); render();
    window.Yuzen.onOutcome('unserviceable', reason);
    showSuccess('Token Closed Successfully');
  }

  function confirmSwap(reason) {
    /* "Bike Unavailable" is not a swap — it is the absence of one. With nothing
       to hand the driver, the token cannot be resolved this way, so it takes the
       unserviceable route out instead of converting to a swap that can never be
       completed. */
    if (reason === 'Bike Unavailable') return markUnserviceable('Bike unavailable');
    clearInterval(stageTimer);
    S.outcome = 'swap'; S.reason = reason; S.type = 'Swap';
    /* The complaint and the parking stand: the bike is still going in. Only what
       is left changes, and the count of what is done is untouched. */
    STEPS = SERVICE_STEPS.slice(0, 2).concat(SWAP_STEPS);
    S.done = Math.min(S.done, 2); S.step = S.done; S.stage = -1;
    paintType(); lockTabs(); reportProgress(); render();
    window.Yuzen.onOutcome('swap', reason);
    toast(`Swap approved — ${reason}. Assign a replacement bike`);
  }

  /* The type lives in the subtext, which the identity renders twice — once as the
     traveller and once as the card's hidden slot. Both have to say the same
     thing or the text changes as it docks. */
  function paintType() {
    document.querySelectorAll('.tk__idType').forEach(el => {
      el.textContent = S.type + ' |\u00a0';
    });
  }
  /* A converted token has outgrown the routes it did not take. They stay visible
     so the captain can see they existed, and plainly unavailable. */
  function lockTabs() {
    if (!S.outcome) return;
    /* The routes the token did not take stay visible — the captain should be able
       to see they existed — and plainly unavailable. */
    const live = liveTab();
    document.querySelectorAll('.tk__tab').forEach(t => {
      t.disabled = t.dataset.tab !== live;
      t.classList.toggle('is-on', t.dataset.tab === live);
    });
    S.tab = live;
  }

  /* ══ A step's page ══════════════════════════════════════════════════════
     One page per step. The checklist answers "where are we"; this answers
     "what happened". Everything that used to sit inside a row lives here. ══ */
  const scrList = document.getElementById('scrList');   // absent when built alone
  const scrStep = document.getElementById('scrStep');
  const stepBody = document.getElementById('stepBody');
  const stepTitle = document.getElementById('stepTitle');
  const TICK_SM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l1.4-1.4 ' +
                  '2.8 2.8 7.1-7.1 1.4 1.4z"/></svg>';

  /* Is there anything on this step's page yet? The chevron and the row's own
     tappability both hang off this, so an empty page is unreachable rather than
     apologetic. */
  function stepHasInfo(id) {
    if (id === 'complaint') return REC.customer.state === 'done';
    if (id === 'park')      return S.done > 1;
    if (id === 'pick')      return S.stage >= 0;
    /* The swap steps have something to show the moment the swap is confirmed:
       what was available in the zone, and why the captain chose it. */
    if (id === 'assign' || id === 'swapout') return S.outcome === 'swap';
    if (id === 'unfit' || id === 'fixed')    return true;
    return S.done >= STEPS.length;
  }

  function stateOf(id) {
    const i = STEPS.findIndex(s => s.id === id);
    if (i < S.done) return { label: 'Done', cls: 'is-done' };
    if (i === S.step) return { label: 'In progress', cls: '' };
    return { label: 'Not started', cls: '' };
  }

  function stepPageHTML(id) {
    const st = stateOf(id);
    const head = `<div class="stp__state">
        <span class="stp__pill t-label-sm ${st.cls}"><i></i>${st.label}</span>
        <span class="stp__meta t-label-sm">Token ${esc(TOKEN.token)} · ${esc(TOKEN.vehicle)}</span>
      </div>`;

    if (id === 'complaint') {
      const r = REC.customer, c = REC.captain;
      return head +
        `<h2 class="t-heading-sm" style="margin-top:36px">What the customer said</h2>
         <div class="fbsummary fbquote"><p class="t-body-md">${RECORDERS.customer.summary}</p></div>
         <p class="stp__meta t-label-sm" style="margin-top:8px">Recording ${mmss(r.seconds)}</p>
         <div class="fbdivider"></div>
         <h2 class="t-heading-sm">What you reported</h2>
         ${c.state === 'done'
            ? `<div class="fbsummary fbquote"><p class="t-body-md">${RECORDERS.captain.summary}</p></div>`
            : `<p class="stp__empty t-body-md" style="margin-top:16px">You have not added your own
                 note yet.</p>`}`;
    }

    if (id === 'park') {
      return head +
        `<h2 class="t-heading-sm" style="margin-top:36px">Where it is</h2>
         <p class="t-body-md" style="margin-top:16px;color:var(--content-secondary)">Parked in
           <b style="color:var(--content-primary)">live repairable</b>, which is what puts it in
           the mechanic's queue.</p>`;
    }

    if (id === 'unfit') {
      return head +
        `<h2 class="t-heading-sm" style="margin-top:36px">Why it stopped</h2>
         <p class="t-body-md" style="margin-top:16px;color:var(--content-secondary)">Marked
           unserviceable — <b style="color:var(--content-primary)">${esc(S.reason || '')}</b>.
           The bike is off the road until someone reassesses it.</p>`;
    }
    if (id === 'fixed') {
      return head +
        `<h2 class="t-heading-sm" style="margin-top:36px">What you fixed</h2>
         <div class="tk__chiprow" style="margin-top:16px">${S.fixes.map(f =>
           `<span class="tkchip t-label-md" aria-hidden="true">${esc(f)}</span>`).join('')}</div>
         <p class="t-body-md" style="margin-top:16px;color:var(--content-secondary)">Done at the
           counter. The bike never went to the workshop.</p>`;
    }
    if (id === 'assign' || id === 'swapout') {
      const n = RTD_BIKES.length;
      return head +
        `<span class="swp__cap t-label-xs">Available in the RTD zone</span>
         <span class="swp__count t-heading-sm">${n} bike${n === 1 ? '' : 's'} ready</span>
         <div class="swp__bikes">${RTD_BIKES.map(b => `
           <span class="swp__bike">
             <span class="m t-label-md">${esc(b.id)}</span>
             <span class="c t-label-sm">${b.charge}%</span>
           </span>`).join('')}</div>
         <span class="swp__cap t-label-xs">Why</span>
         <span class="t-body-md" style="color:var(--content-secondary)">${esc(S.reason || '—')}</span>`;
    }

    if (id === 'pick') {
      const stages = STAGES.map((sg, i) => {
        const cls = i < S.stage ? 'is-done' : i === S.stage ? 'is-now' : '';
        return `<span class="stp__stage ${cls} t-body-md">
                  <b>${i < S.stage ? TICK_SM : ''}</b>${esc(sg.label)}
                </span>`;
      }).join('');
      const faults = FAULTS.length
        ? `<h2 class="t-heading-sm" style="margin-top:36px">What the mechanic found</h2>
           <div class="stp__faults">${FAULTS.map(f => `
             <span class="stp__fault t-body-md">
               <span class="stp__tag t-label-xs ${f.severity === 'major' ? 'is-major' : ''}"
                     >${f.severity === 'major' ? 'Major' : 'Minor'}</span>
               <span>${esc(f.part)} — ${esc(f.note)}</span>
             </span>`).join('')}</div>`
        : '';
      return head +
        `<h2 class="t-heading-sm" style="margin-top:36px">Repair status</h2>
         <div class="stp__stages">${stages}</div>${faults}`;
    }

    return head +
      `<h2 class="t-heading-sm" style="margin-top:36px">Handed over</h2>
       <p class="t-body-md" style="margin-top:16px;color:var(--content-secondary)">The bike went
         back to the customer and the token closed.</p>`;
  }

  /* Once the work has started the captain is walked forward: finishing a step
     opens the next one rather than returning him to the checklist to find it
     himself. Back from any step page shows the checklist, so the list is the
     overview rather than the route. */
  function continueToNextStep() {
    if (S.done >= STEPS.length) return false;
    const next = STEPS[S.step];
    if (!next || next.id === 'complaint') return false;
    openStep(next.id);
    return true;
  }

  const stepFooter = document.getElementById('stepFooter');

  function openStep(id) {
    const s = STEPS.find(x => x.id === id);
    stepTitle.textContent = (S.done > STEPS.indexOf(s)) ? s.done : s.todo;
    stepBody.innerHTML = stepPageHTML(id);
    /* Only the step in hand carries an action; the others are a record. */
    const live = STEPS[S.step] && STEPS[S.step].id === id && S.done < STEPS.length;
    stepFooter.innerHTML = live ? footerHTML() : '';
    stepFooter.classList.toggle('is-shown', !!live);
    scrJob.dataset.pos = 'left';
    scrStep.dataset.pos = 'in';
    window.Yuzen.onOpenStep(id);
  }
  document.getElementById('stepBack').addEventListener('click', () => {
    tap();
    scrStep.dataset.pos = 'right';
    scrJob.dataset.pos = 'in';
  });

  /* ══ The recorder ═══════════════════════════════════════════════════════
     One component, two instances, three states:

       idle      a mic and a prompt — tap anywhere on the pill to start
       recording the time climbing, the bars alive, pause and stop
       done      the clip, plus a written summary of what was said

     Pause matters more than it looks: the captain is holding a conversation
     while he does this, and a customer stops to think. Without pause he either
     records the silence or loses the thread restarting.

     Both halves of the page use it. The captain's half can be typed instead —
     and once he records, his side behaves exactly like the customer's. ══ */
  const RECORDERS = {
    customer: {
      el: document.getElementById('recCustomer'),
      hint: "Record the customer's feedback",
      /* Stands in for speech-to-text. Real summaries come from the transcript;
         the emphasis marks the phrases a mechanic acts on. */
      summary: 'Bike keeps <strong>stopping</strong> at speed breakers, its very ' +
               '<strong>difficult to start again</strong> once stopped. The bike also ' +
               '<strong>makes noise, brake is loose</strong>',
    },
    captain: {
      el: document.getElementById('recCaptain'),
      hint: 'Record your feedback',
      summary: 'Confirmed the <strong>stalling at low speed</strong> and the ' +
               '<strong>loose front brake</strong>. Horn is <strong>intermittent</strong>. ' +
               'Recommending a full electrical check.',
    },
  };
  const REC = {};        // key → { state, seconds, rate }
  Object.keys(RECORDERS).forEach(k => REC[k] = { state: 'idle', seconds: 0, rate: 0 });

  const MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3.5 3.5 0 0 0 ' +
    '3.5-3.5V6a3.5 3.5 0 0 0-7 0v5.5A3.5 3.5 0 0 0 12 15Zm6-3.5a6 6 0 0 1-5 5.916V21h-2v-3.584A6 ' +
    '6 0 0 1 6 11.5h2a4 4 0 0 0 8 0h2Z" fill="currentColor"/></svg>';
  const PAUSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" ' +
    'fill="currentColor"/></svg>';
  const RATES_R = [1, 1.5, 2, 4];
  const TICK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l1.4-1.4 ' +
    '2.8 2.8 7.1-7.1 1.4 1.4z" fill="currentColor"/></svg>';
  const CHEV_RIGHT = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M13.546 12L9.473 7.927a.749.749 0 01.53-1.28.723.723 0 01.535.216l4.49 4.49a.9.9 ' +
    '0 010 1.294l-4.49 4.49a.72.72 0 01-.523.217.75.75 0 01-.542-1.28L13.546 12z" ' +
    'fill="currentColor"/></svg>';
  const BLOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M5.6 18.4 18.4 5.6" stroke="currentColor" stroke-width="1.5"/></svg>';
  const SWAP_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function recHTML(key) {
    const r = REC[key], cfg = RECORDERS[key];
    /* The captain's field already carries a mic, so his recorder has no idle
       state of its own — it takes the field's place the moment he starts, rather
       than sitting under it as a second way to do the same thing. */
    if (key === 'captain' && r.state === 'idle') return '';
    if (r.state === 'idle') {
      return `<div class="fbaudio fbaudio--idle" data-rec-start="${key}" role="button"
                   tabindex="0" aria-label="${esc(cfg.hint)}">
        <span class="fbaudio__hint t-label-md">${esc(cfg.hint)}</span>
        <span class="fbaudio__mic" aria-hidden="true">${MIC_SVG}</span>
      </div>`;
    }
    if (r.state === 'recording' || r.state === 'paused') {
      const paused = r.state === 'paused';
      return `<div class="fbaudio ${paused ? 'fbaudio--paused' : 'fbaudio--live'}">
        <button class="fbaudio__mic" data-rec-pause="${key}" type="button"
                aria-label="${paused ? 'Resume recording' : 'Pause recording'}"
                >${paused ? PLAY_SVG : PAUSE_SVG}</button>
        <span class="fbaudio__time t-label-md" data-rec-time="${key}">${mmss(r.seconds)}</span>
        <span class="fbaudio__dot" aria-hidden="true"></span>
        <span class="fbaudio__wave" aria-hidden="true">${waveBars(0)}</span>
        <button class="fbaudio__save" data-rec-stop="${key}" type="button"
                aria-label="Save this recording">${TICK_SVG}</button>
      </div>`;
    }
    return `<div class="fbaudio">
        <button class="fbaudio__play" data-rec-play="${key}" type="button"
                aria-label="Play the recording">${PLAY_SVG}</button>
        <span class="fbaudio__time t-label-md" data-rec-time="${key}">${mmss(r.seconds)}</span>
        <span class="fbaudio__dot" aria-hidden="true"></span>
        <span class="fbaudio__wave" data-rec-wave="${key}" aria-hidden="true">${waveBars(0)}</span>
        <button class="fbaudio__rate fbaudio__del" data-rec-del="${key}" type="button"
                aria-label="Delete this recording and start again">${TRASH_SVG}</button>
      </div>
      <div class="fbsummary fbquote"><p class="t-body-md">${cfg.summary}</p></div>`;
  }

  function renderRec(key) {
    RECORDERS[key].el.innerHTML = recHTML(key);
    if (key === 'captain') {
      const field = document.getElementById('fbField');
      field.hidden = REC.captain.state !== 'idle';
    }
    paintFbDone();
  }

  /* The page exists to capture the customer's complaint, so Done is not an exit
     until there is one. Disabled rather than hidden: the captain can see what he
     still owes. */
  function paintFbDone() {
    const btn = document.getElementById('fbDone');
    if (btn) btn.disabled = REC.customer.state !== 'done';
  }
  Object.keys(RECORDERS).forEach(renderRec);

  const recTimers = {};
  function recStart(key) {
    const r = REC[key];
    r.state = 'recording'; r.seconds = 0;
    renderRec(key);
    window.Yuzen.onRecord('start', 0);
    let last = Date.now();
    clearInterval(recTimers[key]);
    recTimers[key] = setInterval(() => {
      const now = Date.now();
      if (REC[key].state === 'recording') {
        REC[key].seconds += (now - last) / 1000;
        const t = RECORDERS[key].el.querySelector('[data-rec-time]');
        if (t) t.textContent = mmss(REC[key].seconds);
      }
      last = now;                 // paused time is skipped, not accumulated
    }, 100);
  }
  function recPause(key) {
    const r = REC[key];
    r.state = r.state === 'paused' ? 'recording' : 'paused';
    renderRec(key);
    window.Yuzen.onRecord(r.state === 'paused' ? 'pause' : 'resume', r.seconds);
  }
  function recStop(key) {
    clearInterval(recTimers[key]);
    const r = REC[key];
    r.seconds = Math.max(1, Math.round(r.seconds));
    r.state = 'done';
    renderRec(key);
    window.Yuzen.onRecord('stop', r.seconds);
    /* The customer's recording is the complaint the mechanic will hear, so it is
       what the step is waiting on. */
    if (key === 'customer') { S.clip = { seconds: r.seconds }; toast('Customer feedback recorded'); }
    else toast('Your feedback recorded');
  }
  const playTimers = {};
  function recPlay(key) {
    const box = RECORDERS[key].el;
    const wave = box.querySelector('[data-rec-wave]');
    const time = box.querySelector('[data-rec-time]');
    const btn  = box.querySelector('[data-rec-play]');
    if (!wave) return;
    const bars = [...wave.children], total = REC[key].seconds * 1000;
    const rate = RATES_R[REC[key].rate], t0 = Date.now();
    clearInterval(playTimers[key]);
    btn.classList.add('is-playing');
    playTimers[key] = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) * rate / total);
      bars.forEach((b, i) => b.classList.toggle('is-played', i / bars.length <= t));
      time.textContent = mmss(REC[key].seconds * t);
      if (t >= 1) {
        clearInterval(playTimers[key]);
        btn.classList.remove('is-playing');
        setTimeout(() => {
          bars.forEach(b => b.classList.remove('is-played'));
          time.textContent = mmss(REC[key].seconds);
        }, 500);
      }
    }, 60);
  }

  document.getElementById('fbbody').addEventListener('click', e => {
    const hit = (attr) => { const el = e.target.closest(`[data-rec-${attr}]`);
                            return el && el.getAttribute(`data-rec-${attr}`); };
    let k;
    if ((k = hit('start'))) { tap(); recStart(k); return; }
    if ((k = hit('pause'))) { tap(); recPause(k); return; }
    if ((k = hit('stop')))  { tap(); recStop(k);  return; }
    if ((k = hit('play')))  { tap(); recPlay(k);  return; }
    if ((k = hit('del'))) {
      tap();
      clearInterval(playTimers[k]);
      REC[k] = { state: 'idle', seconds: 0, rate: 0 };
      renderRec(k);
      /* Deleting the complaint walks the step back — the recording IS the step,
         so the checklist must not go on claiming it is done. */
      if (k === 'customer' && S.done > 0) {
        S.clip = null; S.done = 0; S.step = 0; render(); reportProgress();
      }
      window.Yuzen.onRecord('delete', 0);
      return;
    }
  });
  document.getElementById('fbbody').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-rec-start]')) {
      e.preventDefault(); recStart(e.target.closest('[data-rec-start]').dataset.recStart);
    }
  });

  /* The mic in the captain's field starts his recording — typing and recording
     are two ways into the same note, so the field and the recorder are one
     control, not two. */
  /* Belt and braces only. The label around the input is what actually raises the
     keyboard — a phone ignores focus() called from a container's click handler —
     but this keeps a mouse click on the pill's edge behaving the same way. */
  document.getElementById('fbField').addEventListener('click', e => {
    if (e.target.closest('#fbMic')) return;
    document.getElementById('fbInput').focus();
  });
  document.getElementById('fbMic').addEventListener('click', () => {
    tap();
    if (REC.captain.state === 'idle') recStart('captain');
    RECORDERS.captain.el.scrollIntoView({ block: 'nearest' });
    window.Yuzen.onDictate(true);
  });

  /* The queue hands tokens over. Registered last, so everything it touches
     already exists. */
  if (window.TokenQueue) window.TokenQueue.onOpen = openToken;

  reportProgress();
  render();
  // Fonts change the card's height, which changes the tail.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { sizeScrollTail(); paintAppbar(); });
  window.addEventListener('resize', () => { sizeScrollTail(); paintAppbar(); });