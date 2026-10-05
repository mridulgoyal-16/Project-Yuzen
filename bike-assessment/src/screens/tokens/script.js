
/* ═══════════════════════════════════════════════════════════════════════════
   TOKENS — the token queue, ported from Barun's token-task-list
   His logic verbatim inside an IIFE. It had to be wrapped: unwrapped it declares
   `toast`, `toastTimer`, `S`, `setTab` and more at top level, and this build
   concatenates every screen into ONE script — a second `function toast` is a
   redeclaration SyntaxError that would take the whole app down.

   Three things of his are removed rather than renamed, all of them chrome that
   belonged to a standalone page: his toast (his `toast(...)` calls now fall
   through to the app's own), and the bottom nav with its handler.

   `window.Yuzen` is left exactly as he wrote it — that is the contract the other
   prototypes plug into, and it still reports every tap.
   ═══════════════════════════════════════════════════════════════════════════ */
let enterTokens = () => {};

/* Outside the IIFE: the app owns navigation, his code does not know about goTo. */
document.getElementById("tkoBack").addEventListener("click", () => goTo("home"));

(() => {

  'use strict';

  /* ======================================================================
     STITCHING CONTRACT — this is the page's whole outbound surface.
     To wire this page into the assembled prototype, replace the function
     bodies below. Nothing else in this file needs to change.
     ====================================================================== */
  window.Yuzen = {
    // A token was tapped — entry point to that token's flow.
    /* Tapping a token opens its detail page, carrying the row's own data so the
       page shows the token that was tapped rather than a fixture. `plate` is the
       row's number — the detail page names the field plate, this file calls it
       plate too, so nothing is renamed across the seam. */
    onTokenOpen({ token, name, type, vehicle, plate, tab }) {
      enterToken({ token, name, type, vehicle, plate });
      goTo('token');
    },
    onCallUser({ token, name }) { console.log('[Yuzen] onCallUser', { token, name }); },
    onSkipToken({ token, name }) { console.log('[Yuzen] onSkipToken', { token, name }); },
    onNotifyUser({ token, name }) { console.log('[Yuzen] onNotifyUser', { token, name }); },
    onNavigate(destination) { console.log('[Yuzen] onNavigate', destination); },
  };

  /* A customer's phone may only be rung once every 20s — same shape as an OTP
     resend, so the wait has to be visible rather than a silently dead tap. */
  const NOTIFY_COOLDOWN = 10;
  const cooling = new Map();          // token -> seconds remaining
  let coolTicker = null;

  function startCooling(token) {
    cooling.set(token, NOTIFY_COOLDOWN);
    /* Draw the full pie with no transition, then let it drain — otherwise it
       animates in from empty on the first paint. */
    const c = document.querySelector(`.bell[data-notify="${token}"] .bell-pie circle`);
    if (c) { c.style.transition = 'none'; c.style.strokeDashoffset = '0'; void c.getBoundingClientRect(); c.style.transition = ''; }
    paintCooldowns();
    if (coolTicker) return;
    coolTicker = setInterval(() => {
      for (const [k, left] of cooling) {
        if (left <= 1) cooling.delete(k); else cooling.set(k, left - 1);
      }
      paintCooldowns();
      if (!cooling.size) { clearInterval(coolTicker); coolTicker = null; }
    }, 1000);
  }

  /* Touches only the bells, so a running cooldown never re-renders the list
     out from under a finger. */
  const BELL_FILLED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zM7.58 4.08 6.15 2.65C3.75 4.48 2.17 7.3 2.03 10.5h2c.15-2.65 1.51-4.97 3.55-6.42zm12.39 6.42h2c-.15-3.2-1.73-6.02-4.12-7.85l-1.42 1.43c2.02 1.45 3.39 3.77 3.54 6.42z"/></svg>';
  const BELL_OUTLINE = '<img src="assets/tokens/bell.svg" alt="">';
  const PIE_C = 56.55;   // 2·π·9

  function paintCooldowns() {
    document.querySelectorAll('.bell[data-notify]').forEach(b => {
      const left  = cooling.get(b.dataset.notify);
      const glyph = b.querySelector('.bell-glyph');
      const pie   = b.querySelector('.bell-pie circle');
      b.disabled = !!left;
      b.classList.toggle('is-waiting', !!left);
      b.setAttribute('aria-label', left
        ? `Notified — can ring again in ${left} seconds`
        : `Notify ${b.dataset.name || ''}`.trim());
      if (glyph) glyph.innerHTML = left ? BELL_FILLED : BELL_OUTLINE;
      /* Offset grows as the wait runs down, so the pie empties. */
      if (pie) pie.style.strokeDashoffset =
        left ? PIE_C * (1 - left / NOTIFY_COOLDOWN) : PIE_C;
    });
  }

  /* ---- Data ------------------------------------------------------------- */
  const TYPES = ['Service', 'Attach', 'Enquiry', 'RSA'];
  const CHIPS = ['All', ...TYPES];
  const NAMES = [
    'Rakesh Kumar', 'Anjali Sharma', 'Imran Sheikh', 'Priya Nair',
    'Vikram Reddy', 'Fatima Khan', 'Sunil Yadav', 'Meera Iyer',
    'Arjun Das', 'Neha Gupta', 'Rohit Patil', 'Kavya Menon',
  ];
  const VEHICLES = ['Dex NV', 'Dex GR'];
  const REPAIR_STAGES = [
    { label: 'In queue',      pct: 10 },
    { label: 'Assessment',    pct: 30 },
    { label: 'Under repair',  pct: 55 },
    { label: 'Quality check', pct: 80 },
    { label: 'Ready',         pct: 100 },
  ];

  // Deterministic, so a tester's session and a later screenshot agree.
  function makeToken(n, seed) {
    return {
      token: String(n).padStart(2, '0'),
      name: NAMES[(seed * 5 + n) % NAMES.length],
      type: TYPES[(seed * 3 + n) % TYPES.length],
      vehicle: VEHICLES[(seed * 7 + n) % VEHICLES.length],
      plate: String(543200 + n * 7 + seed * 13),
    };
  }

  const TABS = [
    { id: 'pending',   label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'ongoing',   label: 'Ongoing', count: 8 },
  ];

  const DATA = {
    // Pending: one active token plus the queue behind it.
    pending: {
      active: { token: '08', name: 'Rakesh Kumar', type: 'Service', vehicle: 'Dex NV', plate: '543210' },
      queue: Array.from({ length: 9 }, (_, i) => makeToken(9 + i, 1)),
    },
    completed: { active: null, queue: Array.from({ length: 6 }, (_, i) => makeToken(1 + i, 4)) },
    /* PROVISIONAL: stage names and percentages are invented until the real
       workshop states are confirmed. Finished repairs float to the top — those
       are the bikes someone can act on now; the rest follow, furthest along
       first. */
    ongoing:   { active: null, queue: Array.from({ length: 8 }, (_, i) => {
                   const t = makeToken(12 + i, 2);
                   const s = REPAIR_STAGES[i % REPAIR_STAGES.length];
                   return { ...t, stage: s.label, pct: s.pct };
                 }).sort((a, b) => b.pct - a.pct) },
  };

  const S = { tab: 'pending', chip: 'All', nav: 'tasks' };

  const elTabs = document.getElementById('tqTabs');
  const elUnderline = document.getElementById('tqTabsUnderline');
  const elBody = document.getElementById('tqBody');

  function tap() { if (navigator.vibrate) navigator.vibrate(10); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* The design shows the plate only on the active token — queued cards read
     "Type | Vehicle". Keep that: the plate is detail you need for the bike in
     front of you, not for the nine behind it. */
  /* The bike number now shows on every card, not just the active one — the
     captain needs to identify the bike for anything in the queue too. */
  function subtitle(t) {
    return t.plate ? `${t.type} | ${t.vehicle} • ${t.plate}`
                   : `${t.type} | ${t.vehicle}`;
  }

  function activeCardHTML(t) {
    return `
      <div class="active-card">
        <button class="token-row" type="button" data-open="${esc(t.token)}">
          <span class="badge badge-active">${esc(t.token)}</span>
          <span class="token-main">
            <span class="token-name">${esc(t.name)}</span>
            <span class="token-sub">${esc(subtitle(t))}</span>
          </span>
          <img src="assets/tokens/view-more.svg" alt="">
        </button>
        <div class="card-divider"></div>
        <div class="card-actions">
          <button class="card-action" id="btnCall" type="button">
            <span class="icon-slot"><img src="assets/tokens/call.svg" alt=""></span>Call user
          </button>
          <button class="card-action" id="btnSkip" type="button">
            <img src="assets/tokens/skip.svg" alt="">Skip for now
          </button>
        </div>
      </div>`;
  }

  const TICK = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="10" fill="currentColor"/>'
    + '<path d="M10.6 16.2 6.4 12l1.4-1.4 2.8 2.8 6-6L18 8.8z" fill="#fff"/></svg>';

  /* One card, three jobs. Only a token still waiting gets a bell: a completed
     token is closed, and one in the workshop is not standing at the counter. */
  function tokenCardHTML(t, mode) {
    const done = mode === 'completed';
    const trailing = done
      ? `<span class="token-done" aria-label="Completed">${TICK}</span>`
      : mode === 'ongoing'
        ? `<span class="token-more" aria-hidden="true"><img src="assets/tokens/view-more.svg" alt=""></span>`
      : mode === 'pending'
        ? `<button class="bell" type="button" data-notify="${esc(t.token)}"
             data-name="${esc(t.name)}" aria-label="Notify ${esc(t.name)}">
             <span class="bell-stack">
               <svg class="bell-pie" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="9"/></svg>
               <span class="bell-glyph"><img src="assets/tokens/bell.svg" alt=""></span>
             </span>
           </button>`
        : '';
    const C = 2 * Math.PI * 25;                       // r=25 in the 58 box
    const pct = Number(t.pct) || 0;
    const badge = mode === 'ongoing'
      ? `<span class="badge-wrap">
           <svg class="badge-pie${pct >= 100 ? ' is-complete' : ''}" viewBox="0 0 58 58" aria-hidden="true">
             <circle class="tqtrack" cx="29" cy="29" r="25"/>
             <circle class="fill" cx="29" cy="29" r="25"
               style="stroke-dasharray:${C.toFixed(2)};stroke-dashoffset:${(C * (1 - pct / 100)).toFixed(2)}"/>
           </svg>
           <span class="badge badge-upcoming">${esc(t.token)}</span>
         </span>`
      : `<span class="badge badge-upcoming">${esc(t.token)}</span>`;
    /* No third line: the ring carries the progress on its own. */
    const detail = '';
    return `
      <div class="token-card${done ? ' is-done' : ''}">
        <button class="token-row" type="button" data-open="${esc(t.token)}">
          ${badge}
          <span class="token-main">
            <span class="token-name">${esc(t.name)}</span>
            <span class="token-sub">${esc(subtitle(t))}</span>
            ${detail}
          </span>
        </button>
        ${trailing}
      </div>`;
  }

  function visibleQueue() {
    const q = DATA[S.tab].queue;
    return S.chip === 'All' ? q : q.filter(t => t.type === S.chip);
  }

  function render() {
    const d = DATA[S.tab];
    const q = visibleQueue();
    // Completed and Ongoing have no active token and no type filter — they are
    // plain lists, so the chips would be furniture with nothing to act on.
    const showChrome = S.tab === 'pending';
    const heading = S.tab === 'completed' ? 'Completed today'
                  : S.tab === 'ongoing'   ? 'In progress'
                  : 'Upcoming tokens';

    elBody.innerHTML = `
      ${d.active ? activeCardHTML(d.active) : ''}
      <div class="section">
        <h2 class="section-title">${esc(heading)}</h2>
        ${showChrome ? `<div class="chips-sentinel" id="tqChipsSentinel"></div>
        <div class="chips" id="tqChips">${
          CHIPS.map(c => `<button class="chip${c === S.chip ? ' is-selected' : ''}" type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join('')
        }</div>` : ''}
        <div class="token-list">
          ${q.length ? q.map(t => tokenCardHTML(t, S.tab)).join('')
                     : `<p class="empty">No ${esc(S.chip === 'All' ? '' : S.chip + ' ')}tokens here.</p>`}
        </div>
      </div>`;

    watchChips();
    paintCooldowns();      // a re-render must not wipe a running cooldown
  }

  /* render() rebuilds the body, so the observer has to be rebuilt with it —
     the previous sentinel node no longer exists. */
  let chipsObserver = null;
  function watchChips() {
    if (chipsObserver) { chipsObserver.disconnect(); chipsObserver = null; }
    const sentinel = document.getElementById('tqChipsSentinel');
    const chips = document.getElementById('tqChips');
    if (!sentinel || !chips) return;
    chipsObserver = new IntersectionObserver(
      ([entry]) => chips.classList.toggle('is-stuck', !entry.isIntersecting),
      { root: elBody, threshold: 0 },
    );
    chipsObserver.observe(sentinel);
  }

  function renderTabs() {
    /* Clear first. His original appended into an empty strip, which is right for a
       page loaded once — but this build ships a PRE-RENDERED DOM, so his init has
       already run and the tabs are already there. Appending again gave six. */
    elTabs.querySelectorAll('.tab').forEach(el => el.remove());
    TABS.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.dataset.tab = t.id;
      b.textContent = t.count ? `${t.label} (${t.count})` : t.label;
      elTabs.insertBefore(b, elUnderline);
    });
  }

  function moveUnderline() {
    const a = elTabs.querySelector('.tab.is-active');
    if (!a) return;
    elUnderline.style.width = `${a.offsetWidth}px`;
    elUnderline.style.transform = `translateX(${a.offsetLeft}px)`;
  }

  function setTab(tabId) {
    S.tab = tabId;
    S.chip = 'All';                  // a stale type filter across tabs reads as a bug
    elTabs.querySelectorAll('.tab').forEach(b =>
      b.classList.toggle('is-active', b.dataset.tab === tabId));
    moveUnderline();
    /* Scroll the STRIP, not via scrollIntoView. scrollIntoView walks up every
       scrollable ancestor, and in this app one of them is the phone frame — so it
       dragged the entire UI 99px left on load, before any interaction. Standalone
       his page had no such ancestor, which is why it never showed there. */
    const activeTab = elTabs.querySelector('.tab.is-active');
    if (activeTab) {
      const target = activeTab.offsetLeft - (elTabs.clientWidth - activeTab.offsetWidth) / 2;
      elTabs.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
    render();
    elBody.scrollTop = 0;
  }/* ---- Events ----------------------------------------------------------- */
  elTabs.addEventListener('click', e => {
    const b = e.target.closest('.tab');
    if (!b || b.dataset.tab === S.tab) return;
    tap();
    elBody.classList.add('is-swapping');
    setTab(b.dataset.tab);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => elBody.classList.remove('is-swapping')));
  });

  elBody.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) {
      tap();
      /* render() rebuilds the body, which resets the chip row's scrollLeft to
         0 — that is what threw RSA out of frame when you tapped it. Carry the
         offset across the rebuild, then nudge the selected chip fully into
         view so a half-clipped chip becomes whole. */
      const row = document.getElementById('tqChips');
      const keepScroll = row ? row.scrollLeft : 0;
      const label = chip.dataset.chip;
      S.chip = label;
      render();
      const newRow = document.getElementById('tqChips');
      if (newRow) {
        newRow.scrollLeft = keepScroll;
        const sel = newRow.querySelector('.chip.is-selected');
        if (sel) {
          const pad = 24;
          const relLeft  = sel.offsetLeft - newRow.scrollLeft;
          const relRight = relLeft + sel.offsetWidth;
          if (relRight > newRow.clientWidth - pad)
            newRow.scrollTo({ left: sel.offsetLeft + sel.offsetWidth - newRow.clientWidth + pad, behavior: 'smooth' });
          else if (relLeft < pad)
            newRow.scrollTo({ left: Math.max(0, sel.offsetLeft - pad), behavior: 'smooth' });
        }
      }
      return;
    }

    const bell = e.target.closest('.bell');
    if (bell) {
      tap();
      if (bell.disabled || cooling.has(bell.dataset.notify)) return;
      const t = DATA[S.tab].queue.find(x => x.token === bell.dataset.notify);
      bell.classList.remove('is-ringing');
      void bell.offsetWidth;                 // restart the animation
      bell.classList.add('is-ringing');
      toast(`${t.name} notified`);
      window.Yuzen.onNotifyUser({ token: t.token, name: t.name });
      startCooling(t.token);
      return;
    }

    if (e.target.closest('#btnCall')) {
      tap();
      const a = DATA[S.tab].active;
      toast(`Calling ${a.name}…`);
      window.Yuzen.onCallUser({ token: a.token, name: a.name });
      return;
    }

    if (e.target.closest('#btnSkip')) {
      tap();
      skipActive();
      return;
    }

    const row = e.target.closest('.token-row');
    if (row) {
      tap();
      const d = DATA[S.tab];
      const t = (d.active && d.active.token === row.dataset.open)
        ? d.active
        : d.queue.find(x => x.token === row.dataset.open);
      window.Yuzen.onTokenOpen({
        token: t.token, name: t.name, type: t.type,
        vehicle: t.vehicle, plate: t.plate, tab: S.tab,
      });
    }
  });

  /* Skip promotes the next token in the queue into the active card and sends
     the skipped one to the back, which is what actually happens at a station. */
  let skipping = false;          // guards a FLIP already in flight
  function skipActive() {
    const d = DATA[S.tab];
    if (!d.active || !d.queue.length) { toast('No one else waiting'); return; }
    if (skipping) return;
    skipping = true;

    const skipped = d.active;
    window.Yuzen.onSkipToken({ token: skipped.token, name: skipped.name });

    // FLIP — measure both cards before the swap.
    const fromActive = elBody.querySelector('.active-card');
    const fromFirst  = elBody.querySelector('.token-card');
    const rA = fromActive && fromActive.getBoundingClientRect();
    const rF = fromFirst  && fromFirst.getBoundingClientRect();

    d.active = d.queue.shift();
    d.queue.unshift(skipped);          // next in line, not the back
    render();

    const toActive = elBody.querySelector('.active-card');   // was the first queued
    const toFirst  = elBody.querySelector('.token-card');    // is the skipped one

    let pending = 0;
    const flip = (el, from) => {
      if (!el || !from) return;
      const to = el.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top  - to.top;
      const sy = to.height ? from.height / to.height : 1;
      if (!dx && !dy && Math.abs(sy - 1) < 0.01) return;
      const inner = el.querySelector('.token-main');
      pending++;
      el.classList.add('is-flipping');
      el.style.transformOrigin = 'top left';
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px) scaleY(${sy})`;
      // Counter-scale the text so only the card box changes shape.
      if (inner) { inner.style.transition = 'none'; inner.style.transform = `scaleY(${1 / sy})`; }
      el.getBoundingClientRect();                       // flush
      const EASE = 'cubic-bezier(.22, .61, .36, 1)', MS = 420;
      el.style.transition = `transform ${MS}ms ${EASE}`;
      el.style.transform = 'translate(0, 0) scaleY(1)';
      if (inner) { inner.style.transition = `transform ${MS}ms ${EASE}`; inner.style.transform = 'scaleY(1)'; }
      const clear = () => {
        el.classList.remove('is-flipping');
        el.style.transition = el.style.transform = el.style.transformOrigin = '';
        if (inner) inner.style.transition = inner.style.transform = '';
        if (--pending <= 0) skipping = false;
      };
      el.addEventListener('transitionend', clear, { once: true });
      setTimeout(clear, MS + 180);
    };

    flip(toActive, rF);      // grows into the active slot
    flip(toFirst,  rA);      // minimises into the first queue slot
    if (!pending) skipping = false;
    toast(`Token ${skipped.token} is next in line`);
  }renderTabs();
  setTab(S.tab);
  document.fonts.ready.then(moveUnderline);

  /* The one thing the app needs from in here: re-render on arrival, so the screen
     is right whether or not it has been opened before. */
  enterTokens = () => { render(); moveUnderline(); };
})();
