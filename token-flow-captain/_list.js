
  'use strict';

  /* ======================================================================
     STITCHING CONTRACT — this is the page's whole outbound surface.
     To wire this page into the assembled prototype, replace the function
     bodies below. Nothing else in this file needs to change.
     ====================================================================== */
  const LIST_HOOKS = {
    // A token was tapped — entry point to that token's flow.
    onTokenOpen({ token, name, type, vehicle, tab }) {
      console.log('[Yuzen] onTokenOpen', { token, name, type, vehicle, tab });
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
  const BELL_OUTLINE = '<img src="data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJub3RpZmljYXRpb25zIj4KPG1hc2sgaWQ9Im1hc2swXzBfMTciIHN0eWxlPSJtYXNrLXR5cGU6YWxwaGEiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjAiIHk9IjAiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+CjxyZWN0IGlkPSJCb3VuZGluZyBib3giIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0iI0Q5RDlEOSIvPgo8L21hc2s+CjxnIG1hc2s9InVybCgjbWFzazBfMF8xNykiPgo8cGF0aCBpZD0ibm90aWZpY2F0aW9uc18yIiBkPSJNNC4wODQ5NCAxOS44NzE0QzMuODc5OTIgMTkuODcxNCAzLjcwODExIDE5LjgwMTggMy41Njk1MSAxOS42NjI0QzMuNDMwNzIgMTkuNTIzIDMuMzYxMzMgMTkuMzUwMyAzLjM2MTMzIDE5LjE0NDFDMy4zNjEzMyAxOC45MzgxIDMuNDMwNzIgMTguNzY2NyAzLjU2OTUxIDE4LjYyOThDMy43MDgxMSAxOC40OTI5IDMuODc5OTIgMTguNDI0NSA0LjA4NDk0IDE4LjQyNDVMNS40NDM0NyAxOC40MjQ1TDUuNDQzNDcgOS40OTUyOEM1LjQ0MzQ3IDcuOTM5MjIgNS45MTgyOSA2LjU1NTU0IDYuODY3OTQgNS4zNDQyNUM3LjgxNzc4IDQuMTMyOTUgOS4wNDg0NiAzLjM3NDIxIDEwLjU2IDMuMDY4MDNWMi40Mzk3M0MxMC41NiAyLjAzOTg3IDEwLjY5OTggMS42OTk5IDEwLjk3OTUgMS40MTk4M0MxMS4yNTkyIDEuMTM5OTQgMTEuNTk4OCAxIDExLjk5ODMgMUMxMi4zOTggMSAxMi43MzggMS4xMzk5NCAxMy4wMTg1IDEuNDE5ODNDMTMuMjk5MSAxLjY5OTkgMTMuNDM5NSAyLjAzOTg3IDEzLjQzOTUgMi40Mzk3M1YzLjA2ODAzQzE0Ljk1MSAzLjM3NDIxIDE2LjE4MTcgNC4xMzI5NSAxNy4xMzE1IDUuMzQ0MjVDMTguMDgxMSA2LjU1NTU0IDE4LjU1NiA3LjkzOTIyIDE4LjU1NiA5LjQ5NTI4TDE4LjU1NiAxOC40MjQ1SDE5LjkxNDVDMjAuMTE5NSAxOC40MjQ1IDIwLjI5MTMgMTguNDk0MiAyMC40Mjk5IDE4LjYzMzZDMjAuNTY4NyAxOC43NzMxIDIwLjYzODEgMTguOTQ1OSAyMC42MzgxIDE5LjE1MTlDMjAuNjM4MSAxOS4zNTggMjAuNTY4NyAxOS41Mjk1IDIwLjQyOTkgMTkuNjY2NEMyMC4yOTEzIDE5LjgwMzEgMjAuMTE5NSAxOS44NzE0IDE5LjkxNDUgMTkuODcxNEw0LjA4NDk0IDE5Ljg3MTRaTTExLjk5NzcgMjMuMTA1NEMxMS40MjQ3IDIzLjEwNTQgMTAuOTM0OCAyMi45MDE1IDEwLjUyOCAyMi40OTM4QzEwLjEyMTEgMjIuMDg2IDkuOTE3NTggMjEuNTk1OCA5LjkxNzU4IDIxLjAyMzJMMTQuMDgxOSAyMS4wMjMyQzE0LjA4MTkgMjEuNTk3OCAxMy44Nzc4IDIyLjA4ODQgMTMuNDY5NyAyMi40OTUyQzEzLjA2MTYgMjIuOTAyIDEyLjU3MDkgMjMuMTA1NCAxMS45OTc3IDIzLjEwNTRaTTYuODkwNCAxOC40MjQ1TDE3LjEwOSAxOC40MjQ1TDE3LjEwOSA5LjQ5NTI4QzE3LjEwOSA4LjA4MTA4IDE2LjYxMSA2Ljg3NTkzIDE1LjYxNDkgNS44Nzk4M0MxNC42MTkgNC44ODM5MiAxMy40MTM5IDQuMzg1OTYgMTEuOTk5NyA0LjM4NTk2QzEwLjU4NTUgNC4zODU5NiA5LjM4MDQ2IDQuODgzOTIgOC4zODQ1NSA1Ljg3OTgzQzcuMzg4NDUgNi44NzU5MyA2Ljg5MDQgOC4wODEwOCA2Ljg5MDQgOS40OTUyOEw2Ljg5MDQgMTguNDI0NVoiIGZpbGw9IiMxQzFCMUYiLz4KPC9nPgo8L2c+Cjwvc3ZnPgo=" alt="">';
  const PIE_C = 56.55;   // 2·π·9

  function paintCooldowns() {
    document.querySelectorAll('.tl-bell[data-notify]').forEach(b => {
      const left  = cooling.get(b.dataset.notify);
      const glyph = b.querySelector('.tl-bell-glyph');
      const pie   = b.querySelector('.tl-bell-pie circle');
      b.disabled = !!left;
      b.classList.toggle('tl-is-waiting', !!left);
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
    { label: 'Assessment',    pct: 25 },
    { label: 'Faults marked', pct: 40 },
    { label: 'Under repair',  pct: 60 },
    { label: 'Quality check', pct: 85 },
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

  const S = { tab: 'pending', chip: 'All', nav: 'tasks', q: '' };

  const elTabs = document.getElementById('tlTabs');
  const elUnderline = document.getElementById('tlTabsUnderline');
  const elBody = document.getElementById('tlBody');
  const elNav = document.getElementById('tlBottomnav');
  const elToast = document.getElementById('tlToast');

  function tap() { if (navigator.vibrate) navigator.vibrate(10); }

  let toastTimer = 0;
  function toast(message) {
    elToast.textContent = message;
    elToast.classList.add('tl-is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove('tl-is-shown'), 1600);
  }

  /* ---- Rendering -------------------------------------------------------- */
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
      <div class="tl-active-card">
        <button class="tl-token-row" type="button" data-open="${esc(t.token)}">
          <span class="tl-badge tl-badge-active">${esc(t.token)}</span>
          <span class="tl-token-main">
            <span class="tl-token-name">${esc(t.name)}</span>
            <span class="tl-token-sub">${esc(subtitle(t))}</span>
          </span>
          <img src="data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJjaGV2cm9uX3JpZ2h0Ij4KPG1hc2sgaWQ9Im1hc2swXzBfMTYiIHN0eWxlPSJtYXNrLXR5cGU6YWxwaGEiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjAiIHk9IjAiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+CjxyZWN0IGlkPSJCb3VuZGluZyBib3giIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0iI0Q5RDlEOSIvPgo8L21hc2s+CjxnIG1hc2s9InVybCgjbWFzazBfMF8xNikiPgo8cGF0aCBpZD0iY2hldnJvbl9yaWdodF8yIiBkPSJNMTIuOTQ2MiAxMkw4Ljg3MzEgNy45MjY5QzguNzM0NjMgNy43ODg0NSA4LjY2MzggNy42MTQ0MiA4LjY2MDYgNy40MDQ4QzguNjU3MzggNy4xOTUyIDguNzI4MjIgNy4wMTc5NyA4Ljg3MzEgNi44NzMxQzkuMDE3OTcgNi43MjgyMiA5LjE5MzYgNi42NTU3OCA5LjQgNi42NTU3OEM5LjYwNjQgNi42NTU3OCA5Ljc4MjAzIDYuNzI4MjIgOS45MjY5IDYuODczMUwxNC40MjExIDExLjM2NzNDMTQuNTE0NyAxMS40NjA5IDE0LjU4MDggMTEuNTU5NiAxNC42MTkyIDExLjY2MzVDMTQuNjU3NyAxMS43NjczIDE0LjY3NjkgMTEuODc5NSAxNC42NzY5IDEyQzE0LjY3NjkgMTIuMTIwNSAxNC42NTc3IDEyLjIzMjcgMTQuNjE5MiAxMi4zMzY1QzE0LjU4MDggMTIuNDQwNCAxNC41MTQ3IDEyLjUzOTEgMTQuNDIxMSAxMi42MzI3TDkuOTI2OSAxNy4xMjY5QzkuNzg4NDUgMTcuMjY1NCA5LjYxNDQyIDE3LjMzNjIgOS40MDQ4IDE3LjMzOTRDOS4xOTUyIDE3LjM0MjYgOS4wMTc5NyAxNy4yNzE4IDguODczMSAxNy4xMjY5QzguNzI4MjIgMTYuOTgyIDguNjU1NzggMTYuODA2NCA4LjY1NTc4IDE2LjZDOC42NTU3OCAxNi4zOTM2IDguNzI4MjIgMTYuMjE4IDguODczMSAxNi4wNzMxTDEyLjk0NjIgMTJaIiBmaWxsPSIjMjIyMjIyIi8+CjwvZz4KPC9nPgo8L3N2Zz4K" alt="">
        </button>
        <div class="tl-card-divider"></div>
        <div class="tl-card-actions">
          <button class="tl-card-action" id="tlBtnCall" type="button">
            <span class="tl-icon-slot"><img src="data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE3IiBoZWlnaHQ9IjE3IiB2aWV3Qm94PSIwIDAgMTcgMTciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGlkPSJjYWxsIiBkPSJNMTUuOTQwMiAxN0MxNC4wNTU3IDE3IDEyLjE2MjUgMTYuNTYxOCAxMC4yNjA1IDE1LjY4NTVDOC4zNTg2NyAxNC44MDkyIDYuNjA5NjcgMTMuNTczIDUuMDEzNSAxMS45NzdDMy40MjM4MyAxMC4zODA4IDIuMTkwODMgOC42MzMzMyAxLjMxNDUgNi43MzQ1QzAuNDM4MTY3IDQuODM1ODMgMCAyLjk0NDI1IDAgMS4wNTk3NUMwIDAuNzU5NzUgMC4xIDAuNTA4MDgzIDAuMyAwLjMwNDc1QzAuNSAwLjEwMTU4MyAwLjc1IDAgMS4wNSAwSDQuMzExNUM0LjU2NCAwIDQuNzg2NzUgMC4wODI0MTcgNC45Nzk3NSAwLjI0NzI1QzUuMTcyNzUgMC40MTE5MTcgNS4yOTU1IDAuNjE1NDE3IDUuMzQ4IDAuODU3NzVMNS45MjEyNSAzLjhDNS45NjA5MiA0LjA3MyA1Ljk1MjU4IDQuMzA3NTggNS44OTYyNSA0LjUwMzc1QzUuODM5NzUgNC42OTk5MiA1LjczODQyIDQuODY0NjcgNS41OTIyNSA0Ljk5OEwzLjI4Mjc1IDcuMjQ2MjVDMy42NTQ0MiA3LjkyNjkyIDQuMDc5MDggOC41NzA4MyA0LjU1Njc1IDkuMTc4QzUuMDM0MjUgOS43ODUgNS41NTEyNSAxMC4zNjQ4IDYuMTA3NzUgMTAuOTE3M0M2LjY1NjQyIDExLjQ2NjEgNy4yMzk3NSAxMS45NzU3IDcuODU3NzUgMTIuNDQ2MkM4LjQ3NTc1IDEyLjkxNjcgOS4xNDMwOCAxMy4zNTQ2IDkuODU5NzUgMTMuNzU5OEwxMi4xMDM4IDExLjQ5NjNDMTIuMjYwMyAxMS4zMzM0IDEyLjQ0OTggMTEuMjE5MyAxMi42NzIzIDExLjE1MzhDMTIuODk0NiAxMS4wODg0IDEzLjEyNTcgMTEuMDcyNCAxMy4zNjU1IDExLjEwNThMMTYuMTQyMyAxMS42NzEzQzE2LjM5NDggMTEuNzM3OSAxNi42MDA4IDExLjg2NjcgMTYuNzYwNSAxMi4wNTc3QzE2LjkyMDIgMTIuMjQ4NyAxNyAxMi40NjU0IDE3IDEyLjcwNzhWMTUuOTVDMTcgMTYuMjUgMTYuODk4NCAxNi41IDE2LjY5NTIgMTYuN0MxNi40OTE5IDE2LjkgMTYuMjQwMiAxNyAxNS45NDAyIDE3WiIgZmlsbD0iIzIyMjIyMiIvPgo8L3N2Zz4K" alt=""></span>Call user
          </button>
          <button class="tl-card-action" id="tlBtnSkip" type="button">
            <img src="data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJza2lwX25leHQiPgo8bWFzayBpZD0ibWFzazBfMF8xMiIgc3R5bGU9Im1hc2stdHlwZTphbHBoYSIgbWFza1VuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeD0iMCIgeT0iMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij4KPHJlY3QgaWQ9IkJvdW5kaW5nIGJveCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRDlEOUQ5Ii8+CjwvbWFzaz4KPGcgbWFzaz0idXJsKCNtYXNrMF8wXzEyKSI+CjxwYXRoIGlkPSJza2lwX25leHRfMiIgZD0iTTE2LjM4NDUgMTYuNTU3OFY3LjQ0MjI1QzE2LjM4NDUgNy4yMjk0MiAxNi40NTYzIDcuMDUxMjUgMTYuNiA2LjkwNzc1QzE2Ljc0MzUgNi43NjQwOCAxNi45MjE3IDYuNjkyMjUgMTcuMTM0NSA2LjY5MjI1QzE3LjM0NzMgNi42OTIyNSAxNy41MjU2IDYuNzY0MDggMTcuNjY5MyA2LjkwNzc1QzE3LjgxMjggNy4wNTEyNSAxNy44ODQ1IDcuMjI5NDIgMTcuODg0NSA3LjQ0MjI1VjE2LjU1NzhDMTcuODg0NSAxNi43NzA2IDE3LjgxMjggMTYuOTQ4OCAxNy42NjkzIDE3LjA5MjNDMTcuNTI1NiAxNy4yMzU5IDE3LjM0NzMgMTcuMzA3OCAxNy4xMzQ1IDE3LjMwNzhDMTYuOTIxNyAxNy4zMDc4IDE2Ljc0MzUgMTcuMjM1OSAxNi42IDE3LjA5MjNDMTYuNDU2MyAxNi45NDg4IDE2LjM4NDUgMTYuNzcwNiAxNi4zODQ1IDE2LjU1NzhaTTYuMTE1NSAxNS42MTUzVjguMzg0NzVDNi4xMTU1IDguMTEwMjUgNi4yMDU4MyA3Ljg5MSA2LjM4NjUgNy43MjdDNi41NjczMyA3LjU2MjgzIDYuNzc4MjUgNy40ODA3NSA3LjAxOTI1IDcuNDgwNzVDNy4xMDI1OCA3LjQ4MDc1IDcuMTg3ODMgNy40ODkwOCA3LjI3NSA3LjUwNTc1QzcuMzYyMTcgNy41MjI0MiA3LjQ0NDI1IDcuNTYwOTIgNy41MjEyNSA3LjYyMTI1TDEyLjk1MiAxMS4yNTJDMTMuMDg5MiAxMS4zNDU1IDEzLjE5MDQgMTEuNDU1MSAxMy4yNTU3IDExLjU4MDhDMTMuMzIxMSAxMS43MDY0IDEzLjM1MzggMTEuODQ2MiAxMy4zNTM4IDEyQzEzLjM1MzggMTIuMTUzOCAxMy4zMjExIDEyLjI5MzYgMTMuMjU1NyAxMi40MTkzQzEzLjE5MDQgMTIuNTQ0OSAxMy4wODkyIDEyLjY1NDUgMTIuOTUyIDEyLjc0OEw3LjUyMTI1IDE2LjM3ODhDNy40NDQyNSAxNi40MzkxIDcuMzYyMTcgMTYuNDc3NiA3LjI3NSAxNi40OTQzQzcuMTg3ODMgMTYuNTEwOSA3LjEwMjU4IDE2LjUxOTMgNy4wMTkyNSAxNi41MTkzQzYuNzc4MjUgMTYuNTE5MyA2LjU2NzMzIDE2LjQzNzIgNi4zODY1IDE2LjI3M0M2LjIwNTgzIDE2LjEwOSA2LjExNTUgMTUuODg5OCA2LjExNTUgMTUuNjE1M1oiIGZpbGw9IiMxQzFCMUYiLz4KPC9nPgo8L2c+Cjwvc3ZnPgo=" alt="">Skip for now
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
      ? `<span class="tl-token-done" aria-label="Completed">${TICK}</span>`
      : mode === 'ongoing'
        ? `<span class="tl-token-more" aria-hidden="true"><img src="data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJjaGV2cm9uX3JpZ2h0Ij4KPG1hc2sgaWQ9Im1hc2swXzBfMTYiIHN0eWxlPSJtYXNrLXR5cGU6YWxwaGEiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjAiIHk9IjAiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+CjxyZWN0IGlkPSJCb3VuZGluZyBib3giIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0iI0Q5RDlEOSIvPgo8L21hc2s+CjxnIG1hc2s9InVybCgjbWFzazBfMF8xNikiPgo8cGF0aCBpZD0iY2hldnJvbl9yaWdodF8yIiBkPSJNMTIuOTQ2MiAxMkw4Ljg3MzEgNy45MjY5QzguNzM0NjMgNy43ODg0NSA4LjY2MzggNy42MTQ0MiA4LjY2MDYgNy40MDQ4QzguNjU3MzggNy4xOTUyIDguNzI4MjIgNy4wMTc5NyA4Ljg3MzEgNi44NzMxQzkuMDE3OTcgNi43MjgyMiA5LjE5MzYgNi42NTU3OCA5LjQgNi42NTU3OEM5LjYwNjQgNi42NTU3OCA5Ljc4MjAzIDYuNzI4MjIgOS45MjY5IDYuODczMUwxNC40MjExIDExLjM2NzNDMTQuNTE0NyAxMS40NjA5IDE0LjU4MDggMTEuNTU5NiAxNC42MTkyIDExLjY2MzVDMTQuNjU3NyAxMS43NjczIDE0LjY3NjkgMTEuODc5NSAxNC42NzY5IDEyQzE0LjY3NjkgMTIuMTIwNSAxNC42NTc3IDEyLjIzMjcgMTQuNjE5MiAxMi4zMzY1QzE0LjU4MDggMTIuNDQwNCAxNC41MTQ3IDEyLjUzOTEgMTQuNDIxMSAxMi42MzI3TDkuOTI2OSAxNy4xMjY5QzkuNzg4NDUgMTcuMjY1NCA5LjYxNDQyIDE3LjMzNjIgOS40MDQ4IDE3LjMzOTRDOS4xOTUyIDE3LjM0MjYgOS4wMTc5NyAxNy4yNzE4IDguODczMSAxNy4xMjY5QzguNzI4MjIgMTYuOTgyIDguNjU1NzggMTYuODA2NCA4LjY1NTc4IDE2LjZDOC42NTU3OCAxNi4zOTM2IDguNzI4MjIgMTYuMjE4IDguODczMSAxNi4wNzMxTDEyLjk0NjIgMTJaIiBmaWxsPSIjMjIyMjIyIi8+CjwvZz4KPC9nPgo8L3N2Zz4K" alt=""></span>`
      : mode === 'pending'
        ? `<button class="tl-bell" type="button" data-notify="${esc(t.token)}"
             data-name="${esc(t.name)}" aria-label="Notify ${esc(t.name)}">
             <span class="tl-bell-stack">
               <svg class="tl-bell-pie" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="9"/></svg>
               <span class="tl-bell-glyph"><img src="data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJub3RpZmljYXRpb25zIj4KPG1hc2sgaWQ9Im1hc2swXzBfMTciIHN0eWxlPSJtYXNrLXR5cGU6YWxwaGEiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjAiIHk9IjAiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+CjxyZWN0IGlkPSJCb3VuZGluZyBib3giIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0iI0Q5RDlEOSIvPgo8L21hc2s+CjxnIG1hc2s9InVybCgjbWFzazBfMF8xNykiPgo8cGF0aCBpZD0ibm90aWZpY2F0aW9uc18yIiBkPSJNNC4wODQ5NCAxOS44NzE0QzMuODc5OTIgMTkuODcxNCAzLjcwODExIDE5LjgwMTggMy41Njk1MSAxOS42NjI0QzMuNDMwNzIgMTkuNTIzIDMuMzYxMzMgMTkuMzUwMyAzLjM2MTMzIDE5LjE0NDFDMy4zNjEzMyAxOC45MzgxIDMuNDMwNzIgMTguNzY2NyAzLjU2OTUxIDE4LjYyOThDMy43MDgxMSAxOC40OTI5IDMuODc5OTIgMTguNDI0NSA0LjA4NDk0IDE4LjQyNDVMNS40NDM0NyAxOC40MjQ1TDUuNDQzNDcgOS40OTUyOEM1LjQ0MzQ3IDcuOTM5MjIgNS45MTgyOSA2LjU1NTU0IDYuODY3OTQgNS4zNDQyNUM3LjgxNzc4IDQuMTMyOTUgOS4wNDg0NiAzLjM3NDIxIDEwLjU2IDMuMDY4MDNWMi40Mzk3M0MxMC41NiAyLjAzOTg3IDEwLjY5OTggMS42OTk5IDEwLjk3OTUgMS40MTk4M0MxMS4yNTkyIDEuMTM5OTQgMTEuNTk4OCAxIDExLjk5ODMgMUMxMi4zOTggMSAxMi43MzggMS4xMzk5NCAxMy4wMTg1IDEuNDE5ODNDMTMuMjk5MSAxLjY5OTkgMTMuNDM5NSAyLjAzOTg3IDEzLjQzOTUgMi40Mzk3M1YzLjA2ODAzQzE0Ljk1MSAzLjM3NDIxIDE2LjE4MTcgNC4xMzI5NSAxNy4xMzE1IDUuMzQ0MjVDMTguMDgxMSA2LjU1NTU0IDE4LjU1NiA3LjkzOTIyIDE4LjU1NiA5LjQ5NTI4TDE4LjU1NiAxOC40MjQ1SDE5LjkxNDVDMjAuMTE5NSAxOC40MjQ1IDIwLjI5MTMgMTguNDk0MiAyMC40Mjk5IDE4LjYzMzZDMjAuNTY4NyAxOC43NzMxIDIwLjYzODEgMTguOTQ1OSAyMC42MzgxIDE5LjE1MTlDMjAuNjM4MSAxOS4zNTggMjAuNTY4NyAxOS41Mjk1IDIwLjQyOTkgMTkuNjY2NEMyMC4yOTEzIDE5LjgwMzEgMjAuMTE5NSAxOS44NzE0IDE5LjkxNDUgMTkuODcxNEw0LjA4NDk0IDE5Ljg3MTRaTTExLjk5NzcgMjMuMTA1NEMxMS40MjQ3IDIzLjEwNTQgMTAuOTM0OCAyMi45MDE1IDEwLjUyOCAyMi40OTM4QzEwLjEyMTEgMjIuMDg2IDkuOTE3NTggMjEuNTk1OCA5LjkxNzU4IDIxLjAyMzJMMTQuMDgxOSAyMS4wMjMyQzE0LjA4MTkgMjEuNTk3OCAxMy44Nzc4IDIyLjA4ODQgMTMuNDY5NyAyMi40OTUyQzEzLjA2MTYgMjIuOTAyIDEyLjU3MDkgMjMuMTA1NCAxMS45OTc3IDIzLjEwNTRaTTYuODkwNCAxOC40MjQ1TDE3LjEwOSAxOC40MjQ1TDE3LjEwOSA5LjQ5NTI4QzE3LjEwOSA4LjA4MTA4IDE2LjYxMSA2Ljg3NTkzIDE1LjYxNDkgNS44Nzk4M0MxNC42MTkgNC44ODM5MiAxMy40MTM5IDQuMzg1OTYgMTEuOTk5NyA0LjM4NTk2QzEwLjU4NTUgNC4zODU5NiA5LjM4MDQ2IDQuODgzOTIgOC4zODQ1NSA1Ljg3OTgzQzcuMzg4NDUgNi44NzU5MyA2Ljg5MDQgOC4wODEwOCA2Ljg5MDQgOS40OTUyOEw2Ljg5MDQgMTguNDI0NVoiIGZpbGw9IiMxQzFCMUYiLz4KPC9nPgo8L2c+Cjwvc3ZnPgo=" alt=""></span>
             </span>
           </button>`
        : '';
    const C = 2 * Math.PI * 25;                       // r=25 in the 58 box
    const pct = Number(t.pct) || 0;
    const badge = mode === 'ongoing'
      ? `<span class="tl-badge-wrap">
           <svg class="tl-badge-pie${pct >= 100 ? ' tl-is-complete' : ''}" viewBox="0 0 58 58" aria-hidden="true">
             <circle class="tl-track" cx="29" cy="29" r="25"/>
             <circle class="tl-fill" cx="29" cy="29" r="25"
               style="stroke-dasharray:${C.toFixed(2)};stroke-dashoffset:${(C * (1 - pct / 100)).toFixed(2)}"/>
           </svg>
           <span class="tl-badge tl-badge-upcoming">${esc(t.token)}</span>
         </span>`
      : `<span class="tl-badge tl-badge-upcoming">${esc(t.token)}</span>`;
    /* No third line: the ring carries the progress on its own. */
    const detail = '';
    return `
      <div class="tl-token-card${done ? ' tl-is-done' : ''}">
        <button class="tl-token-row" type="button" data-open="${esc(t.token)}">
          ${badge}
          <span class="tl-token-main">
            <span class="tl-token-name">${esc(t.name)}</span>
            <span class="tl-token-sub">${esc(subtitle(t))}</span>
            ${detail}
          </span>
        </button>
        ${trailing}
      </div>`;
  }

  function matchesSearch(t) {
    if (!S.q) return true;
    return (t.token + ' ' + t.name + ' ' + t.plate).toLowerCase().includes(S.q);
  }

  function visibleQueue() {
    const q = DATA[S.tab].queue;
    const byType = S.chip === 'All' ? q : q.filter(t => t.type === S.chip);
    if (!S.q) return byType;
    /* Token number, name and plate — the three things a captain has in hand. */
    return byType.filter(matchesSearch);
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
      ${d.active && matchesSearch(d.active) ? activeCardHTML(d.active) : ''}
      <div class="tl-section">
        <h2 class="tl-section-title">${esc(heading)}</h2>
        ${showChrome ? `<div class="tl-chips-sentinel" id="tlChipsSentinel"></div>
        <div class="tl-chips" id="tlChips">${
          CHIPS.map(c => `<button class="tl-chip${c === S.chip ? ' tl-is-selected' : ''}" type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join('')
        }</div>` : ''}
        <div class="tl-token-list">
          ${q.length ? q.map(t => tokenCardHTML(t, S.tab)).join('')
                     : `<p class="tl-empty">No ${esc(S.chip === 'All' ? '' : S.chip + ' ')}tokens here.</p>`}
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
    const sentinel = document.getElementById('tlChipsSentinel');
    const chips = document.getElementById('tlChips');
    if (!sentinel || !chips) return;
    chipsObserver = new IntersectionObserver(
      ([entry]) => chips.classList.toggle('tl-is-stuck', !entry.isIntersecting),
      { root: elBody, threshold: 0 },
    );
    chipsObserver.observe(sentinel);
  }

  function renderTabs() {
    TABS.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tl-tab';
      b.dataset.tab = t.id;
      b.textContent = t.count ? `${t.label} (${t.count})` : t.label;
      elTabs.insertBefore(b, elUnderline);
    });
  }

  function moveUnderline() {
    const a = elTabs.querySelector('.tl-tab.tl-is-active');
    if (!a) return;
    elUnderline.style.width = `${a.offsetWidth}px`;
    elUnderline.style.transform = `translateX(${a.offsetLeft}px)`;
  }

  function setTab(tabId) {
    S.tab = tabId;
    S.chip = 'All';                  // a stale type filter across tabs reads as a bug
    elTabs.querySelectorAll('.tl-tab').forEach(b =>
      b.classList.toggle('tl-is-active', b.dataset.tab === tabId));
    moveUnderline();
    elTabs.querySelector('.tl-tab.tl-is-active')
      .scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    render();
    elBody.scrollTop = 0;
  }

  function setNav(navId) {
    S.nav = navId;
    elNav.querySelectorAll('.tl-nav-item').forEach(b =>
      b.classList.toggle('tl-is-active', b.dataset.nav === navId));
    /* Home and Profile have no screens yet, so they are left genuinely blank
       rather than filled with invented content. Tasks owns the tabs, so those
       go with it. */
    const onTasks = navId === 'tasks';
    document.querySelector('.tl-tabs-wrap').hidden = !onTasks;
    /* Empty the body rather than hide it: `hidden` takes it out of flow and the
       bottom nav floats up to meet the header. */
    if (onTasks) render(); else elBody.innerHTML = '';
  }

  /* ---- Events ----------------------------------------------------------- */
  elTabs.addEventListener('click', e => {
    const b = e.target.closest('.tl-tab');
    if (!b || b.dataset.tab === S.tab) return;
    tap();
    elBody.classList.add('tl-is-swapping');
    setTab(b.dataset.tab);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => elBody.classList.remove('tl-is-swapping')));
  });

  elBody.addEventListener('click', e => {
    const chip = e.target.closest('.tl-chip');
    if (chip) {
      tap();
      /* render() rebuilds the body, which resets the chip row's scrollLeft to
         0 — that is what threw RSA out of frame when you tapped it. Carry the
         offset across the rebuild, then nudge the selected chip fully into
         view so a half-clipped chip becomes whole. */
      const row = document.getElementById('tlChips');
      const keepScroll = row ? row.scrollLeft : 0;
      const label = chip.dataset.chip;
      S.chip = label;
      render();
      const newRow = document.getElementById('tlChips');
      if (newRow) {
        newRow.scrollLeft = keepScroll;
        const sel = newRow.querySelector('.tl-chip.tl-is-selected');
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

    const bell = e.target.closest('.tl-bell');
    if (bell) {
      tap();
      if (bell.disabled || cooling.has(bell.dataset.notify)) return;
      const t = DATA[S.tab].queue.find(x => x.token === bell.dataset.notify);
      bell.classList.remove('tl-is-ringing');
      void bell.offsetWidth;                 // restart the animation
      bell.classList.add('tl-is-ringing');
      toast(`${t.name} notified`);
      LIST_HOOKS.onNotifyUser({ token: t.token, name: t.name });
      startCooling(t.token);
      return;
    }

    if (e.target.closest('#tlBtnCall')) {
      tap();
      const a = DATA[S.tab].active;
      toast(`Calling ${a.name}…`);
      LIST_HOOKS.onCallUser({ token: a.token, name: a.name });
      if (window.YuzenCall) window.YuzenCall.open(a.name, a.plate);
      return;
    }

    if (e.target.closest('#tlBtnSkip')) {
      tap();
      skipActive();
      return;
    }

    const row = e.target.closest('.tl-token-row');
    if (row) {
      tap();
      const d = DATA[S.tab];
      const t = (d.active && d.active.token === row.dataset.open)
        ? d.active
        : d.queue.find(x => x.token === row.dataset.open);
      LIST_HOOKS.onTokenOpen({
        token: t.token, name: t.name, type: t.type, vehicle: t.vehicle, tab: S.tab,
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
    LIST_HOOKS.onSkipToken({ token: skipped.token, name: skipped.name });

    // FLIP — measure both cards before the swap.
    const fromActive = elBody.querySelector('.tl-active-card');
    const fromFirst  = elBody.querySelector('.tl-token-card');
    const rA = fromActive && fromActive.getBoundingClientRect();
    const rF = fromFirst  && fromFirst.getBoundingClientRect();

    d.active = d.queue.shift();
    d.queue.unshift(skipped);          // next in line, not the back
    render();

    const toActive = elBody.querySelector('.tl-active-card');   // was the first queued
    const toFirst  = elBody.querySelector('.tl-token-card');    // is the skipped one

    let pending = 0;
    const flip = (el, from) => {
      if (!el || !from) return;
      const to = el.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top  - to.top;
      const sy = to.height ? from.height / to.height : 1;
      if (!dx && !dy && Math.abs(sy - 1) < 0.01) return;
      const inner = el.querySelector('.tl-token-main');
      pending++;
      el.classList.add('tl-is-flipping');
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
        el.classList.remove('tl-is-flipping');
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
  }

  elNav.addEventListener('click', e => {
    const b = e.target.closest('.tl-nav-item');
    if (!b) return;
    tap();
    setNav(b.dataset.nav);          // visual state only
    LIST_HOOKS.onNavigate(b.dataset.nav);
  });

  renderTabs();
  setTab(S.tab);
  setNav(S.nav);
  document.fonts.ready.then(moveUnderline);

  /* ══ Search ══════════════════════════════════════════════════════════════
     The magnifier used to be decoration. It filters what is already on screen
     rather than opening a results page — the captain is hunting one token in
     forty, and a second screen would only add a step and lose the tabs. ══ */
  const searchBtn = document.querySelector('#scrList .tl-btn-icon[aria-label="Search"]');
  const appbar    = document.querySelector('#scrList .tl-appbar');
  if (searchBtn && appbar) {
    const box = document.createElement('input');
    box.type = 'search';
    box.className = 'tl-search';
    box.placeholder = 'Token, name or number';
    box.setAttribute('aria-label', 'Search tokens');
    box.hidden = true;
    appbar.insertBefore(box, searchBtn);

    searchBtn.addEventListener('click', () => {
      const opening = box.hidden;
      box.hidden = !opening;
      appbar.classList.toggle('tl-is-searching', opening);
      if (opening) box.focus();
      else { box.value = ''; S.q = ''; render(); }
    });
    box.addEventListener('input', () => { S.q = box.value.trim().toLowerCase(); render(); });
  }

  /* ══ Bridge to the token details screen ═════════════════════════════════
     The queue owns the data; the details screen reports back into it. Kept to
     three calls so the two screens stay separable. ══ */

  /* A repair the captain has to act on does not belong in Ongoing. Ongoing means
     "someone else has it"; the moment the bike is Ready the next move is his, so
     the card returns to Pending where he is actually looking. Without this the
     finished bikes sit in a tab he has no reason to open. */
  /* renderTabs() appends its buttons and was only ever called once, at startup —
     calling it again to refresh the count stacked a second strip beside the
     first. The count is the only thing that changes, so paint just that. */
  function paintOngoingCount() {
    const n = DATA.ongoing.queue.length;
    const tab = TABS.find(x => x.id === 'ongoing');
    if (tab) tab.count = n;
    const btn = elTabs.querySelector('.tl-tab[data-tab="ongoing"]');
    if (btn) btn.textContent = n ? `Ongoing (${n})` : 'Ongoing';
    moveUnderline();
  }

  function reclaimFinished() {
    /* Keyed on the stage, not on the token's percentage. A bike at Ready is only
       three quarters of the way through its token — the handover is still to come
       — so a percentage test never fired. What matters is whose move it is. */
    const waiting = t => t.stage === 'Ready' || t.pct >= 100;
    const ready = DATA.ongoing.queue.filter(waiting);
    if (!ready.length) return 0;
    DATA.ongoing.queue = DATA.ongoing.queue.filter(t => !waiting(t));
    ready.forEach(t => {
      t.waiting = 'Ready to collect';       // why it is back in the list
      if (!DATA.pending.queue.some(x => x.token === t.token)) DATA.pending.queue.unshift(t);
    });
    return ready.length;
  }

  const STAGES_INDEX = Object.fromEntries(REPAIR_STAGES.map((s, i) => [s.label, i]));

  window.TokenQueue = {
    onOpen: null,                       // the details screen sets this

    /* Called on every step or stage change inside a token. */
    progress(p) {
      const inOngoing = DATA.ongoing.queue.find(t => t.token === p.token);
      const target = inOngoing
        || DATA.pending.queue.find(t => t.token === p.token)
        || (DATA.pending.active && DATA.pending.active.token === p.token ? DATA.pending.active : null);
      if (!target) return;
      target.pct = p.percent;
      if (p.stage) target.stage = p.stage;
      target.state = { done: p.done, stage: p.stage
        ? STAGES_INDEX[p.stage] : undefined };
      /* Once the captain has handed it over there is nothing left to do with it. */
      if (p.percent >= 100 && p.done >= p.of) {
        DATA.pending.queue = DATA.pending.queue.filter(t => t !== target);
        DATA.ongoing.queue = DATA.ongoing.queue.filter(t => t !== target);
        if (DATA.pending.active === target) DATA.pending.active = DATA.pending.queue.shift() || null;
        if (!DATA.completed.queue.some(x => x.token === target.token)) {
          DATA.completed.queue.unshift(target);
        }
      } else if (p.stage && p.stage !== 'Ready' && !inOngoing) {
        /* It is with the mechanic now, so that is where it belongs. */
        DATA.pending.queue = DATA.pending.queue.filter(t => t !== target);
        if (DATA.pending.active === target) DATA.pending.active = DATA.pending.queue.shift() || null;
        DATA.ongoing.queue.push(target);
      }
      reclaimFinished();
      paintOngoingCount();
      render();
    },

    /* The queue is the entry point, so it says which token opened. */
    show() { render(); },
  };
  LIST_HOOKS.onTokenOpen = t => {
    /* A token opened from Completed must open completed. The queue is the only
       thing that knows how far each one got, so it says. */
    if (!t.state) {
      t.state = S.tab === 'completed'
        ? { done: 4, stage: 5 }
        : t.stage ? { done: 2 } : {};
    }
    if (window.TokenQueue.onOpen) window.TokenQueue.onOpen(t);
  };

  /* Finished repairs are already waiting when the captain opens the app. */
  if (reclaimFinished()) { paintOngoingCount(); render(); }
