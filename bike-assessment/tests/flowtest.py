import html as H, json, pathlib, subprocess, tempfile
SRC=pathlib.Path(__file__).resolve().parents[1]/"prototype.html"
def _find_chrome():
    """Chrome, wherever it is. Hard-coding the macOS bundle path meant the build
    silently degraded to a JS-only ship on any other machine, and the two test
    suites crashed outright. Order: an explicit CHROME env var, then the usual
    macOS and Linux locations, then whatever is on PATH."""
    import os, shutil
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    for p in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "/Applications/Chromium.app/Contents/MacOS/Chromium",
              "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
              "/usr/bin/chromium", "/usr/bin/chromium-browser",
              "/opt/google/chrome/chrome"):
        if os.path.exists(p):
            return p
    for n in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        w = shutil.which(n)
        if w:
            return w
    return ""

CHROME = _find_chrome()
OUT=pathlib.Path(__file__).parent
html=SRC.read_text()

CHECKS = r"""
/* CHECKS runs inside an async listener, so a throw surfaces as an unhandled
   rejection, not window.onerror — without this the harness just times out with
   no title and the failure looks like a JSON parse error. */
addEventListener('unhandledrejection', e => {
  document.title='RESULT'+JSON.stringify([...(typeof out!=='undefined'?out:[]),
    {t:'UNCAUGHT '+(e.reason && e.reason.message || e.reason), pass:false, got:String(e.reason && e.reason.stack||'').split('\n')[1]||''}]);
});
const out=[];
const ok=(n,c,d)=>out.push({t:n,pass:!!c,got:d});

/* ── WHICH BIKE THESE OPEN ───────────────────────────────────────────────────
   A row whose pack is not flat. The three-step assessment is what a LIVE bike
   gets; a bike on 0% is given a revive step in front of the other three (see
   REVIVE_STEP), so "the first row" would quietly decide which of two flows every
   assertion below is about — and since the board's default order puts the
   emptiest packs near the top, the first row IS a dead one.

   Named rather than indexed for the same reason the queue's own tests assert
   rules instead of fixtures: re-weighting the fleet must not silently move these
   onto the other flow. The revive flow has its own block further down. */
/* An ORDINARY three-step bike: never flat, never on charge, never revived. The
   test is hasRevivalStep, not `battery > 0` — a revived bike wakes with 5% and
   keeps its four steps, so charge alone stopped meaning "the plain flow" the
   moment revival gained a second phase. */
const liveRow = () => [...document.querySelectorAll('#qList .qrow')]
  .find(r => { const b = FLEET.find(f => f.id === r.dataset.qbike);
               return b && b.battery > 0 && !hasRevivalStep(b); });
/* A flat bike NOT already on charge — the board seeds two of those (Figma
   2982:1400) and they cannot be opened, so "a dead bike" means one still to
   start. */
const deadRow = () => [...document.querySelectorAll('#qList .qrow')]
  .find(r => { const b = FLEET.find(f => f.id === r.dataset.qbike);
               return b && b.battery === 0 && !isReviving(b.id); });
/* THE BOARD MINUS THE STACK. Reviving bikes are pinned above the list and are
   not tappable, so an index into .qrow stopped being an index into the work the
   moment revival arrived. Everything asserting about order, waits or opening a
   bike means these. */
const workRows = () => [...document.querySelectorAll('#qList .qrow:not(.is-reviving)')];
/* "Some other bike" for the guard tests: not on charge, not the parked one, and
   NOT FLAT. A flat bike is given the revive step in front of the other three, so
   picking one silently moves every downstream assertion onto the four-step
   flow — which is exactly what an index into .qrow started doing. */
const otherLiveRow = () => workRows().find(r => {
  const b = FLEET.find(f => f.id === r.dataset.qbike);
  return b && b.battery > 0 && !hasRevivalStep(b)
    && !mini().textContent.includes(r.dataset.qbike);
});

const R=s=>document.querySelector(s).getBoundingClientRect();
const H=()=>document.getElementById('phone').getBoundingClientRect().bottom;

/* Build integrity. The deliverable is opened on other people's machines and on
   phones, so a surviving `assets/…` reference would work here and nowhere else —
   the one failure that looks like success on the machine that built it. */
ok('the deliverable references no filesystem path',
   !/url\(assets\//.test(document.documentElement.innerHTML), 'assets/ reference survived');
/* 39, not the original 14: the RnM, Issues, Add issues and Servicing checks ports
   each brought their own part photographs in, the home cards took four
   illustrations from Figma 2149:31286, and the workbench shortcuts took six more
   from 2189:31118 — which also retired the three flat tiles they replaced, so the
   count went 36 - 3 + 6. The two RnM card illustrations (Figma 2401:27736) took
   it to 41. Parts exchange adds the front-wheel and MCU part photos, and the
   front wheel appears in both the received and the returned list — three <img>
   for two files — which takes it to 44. Then the seed table went: Part exchange
   is derived from the issues now, and at load nothing has been fetched, so the
   only part rows on the screen are the two under Get spare. 42. The Sr.
   Mechanic's two allocation cards take it to 44 — they are hidden on every other
   profile, but hidden is not absent, and they share ONE placeholder file which
   inlines once per reference, so two cards are two matches from one asset. The
   Quality Associate's Assessment done card is another, and so is the assessment's
   merged Faults row, which borrows the repair's issues tile. The Sr. Mechanic's
   two cards became one and took a reference back with them. The number is worth keeping exact rather
   than loosening
   to a floor — it is the check that catches an asset silently failing to inline,
   and a floor would pass while half of them went missing. */
/* 48. The three section headings on the allocation page borrow the dashboard's
   own row art — the same picture meaning the same thing on both screens — and
   each reference is inlined where it stands. */
ok('all 48 images are embedded',
   (document.documentElement.innerHTML.match(/data:image\/(png|jpeg);base64,/g)||[]).length===48,
   (document.documentElement.innerHTML.match(/data:image\/(png|jpeg);base64,/g)||[]).length);
/* One family, everywhere. The root used to be left on the UA default (Times) —
   only body carried the stack — and the drawn keyboard asked for a 400 that is
   not embedded. Neither showed up as a visible fallback, which is exactly why it
   is worth asserting: the next one might. Weights are checked against the three
   faces that ship; anything else silently snaps to the nearest. */
ok('every element renders in Satoshi',
   (()=>{const bad=[...document.querySelectorAll('*')]
      .filter(el=>!/^Satoshi/.test(getComputedStyle(el).fontFamily));
     return bad.length===0;})(),
   [...document.querySelectorAll('*')]
      .filter(el=>!/^Satoshi/.test(getComputedStyle(el).fontFamily))
      .map(el=>el.tagName).slice(0,5).join(',') || 'all Satoshi');
ok('and only at weights that ship',
   (()=>{const w=new Set();document.querySelectorAll('body *').forEach(el=>{
      /* head, title and style carry text but paint nothing. */
      const cs=getComputedStyle(el);
      if(cs.display!=='none'&&cs.fontStyle==='normal'&&(el.textContent||'').trim())
        w.add(cs.fontWeight);});
     return [...w].every(v=>['500','700','900'].includes(v));})(),
   (()=>{const w=new Set();document.querySelectorAll('body *').forEach(el=>{
      /* head, title and style carry text but paint nothing. */
      const cs=getComputedStyle(el);
      if(cs.display!=='none'&&cs.fontStyle==='normal'&&(el.textContent||'').trim())
        w.add(cs.fontWeight);});
     return [...w].sort().join('/');})());
ok('all 3 Satoshi weights are embedded',
   (document.documentElement.innerHTML.match(/data:font\/otf;base64,/g)||[]).length===3,
   (document.documentElement.innerHTML.match(/data:font\/otf;base64,/g)||[]).length);

// data — five real parts, real names, real renders
ok('checklist is 15-18 parts long', PARTS.length>=15 && PARTS.length<=18, PARTS.length);
ok('the five with renders come first',
   PARTS.slice(0,5).map(p=>p.name).join('|')==='MCU|Pigtail Light|Throttle controller|Front wheel|Tyre',
   PARTS.slice(0,5).map(p=>p.name).join('|'));
ok('every one of those five has an image', PARTS.slice(0,5).every(p=>p.photo && p.crop), PARTS.slice(0,5).filter(p=>!p.photo).map(p=>p.name));
ok('the rest sit below and carry no image', PARTS.slice(5).every(p=>!p.photo), PARTS.slice(5).filter(p=>p.photo).map(p=>p.name));
/* Both came over from the mechanic's servicing checklist when the assessment
   list was rebuilt around it. The per-part reasons had been stripped out of this
   flow once; they are back because the fault sheet needs them, and per PART
   rather than one global list — "Wobble" is a wheel fault and means nothing on a
   horn. */
ok('every part carries a note and its own reasons',
   PARTS.every(p => typeof p.note === 'string' && p.note.length > 10
                 && Array.isArray(p.reasons) && p.reasons.length >= 3),
   PARTS.filter(p=>!p.note||!(p.reasons||[]).length).map(p=>p.name).join('|') || 'all');
ok('and the reasons really are per part, not one list repeated',
   new Set(PARTS.map(p=>p.reasons.join('|'))).size >= PARTS.length - 3,
   new Set(PARTS.map(p=>p.reasons.join('|'))).size+' distinct of '+PARTS.length);

// home — the entry point
ok('home is the first screen', current==='home' && document.getElementById('scrHome').classList.contains('is-active'), current);
ok('eight task cards', document.querySelectorAll('.hm__task').length===8, document.querySelectorAll('.hm__task').length);
/* DOM order is still the pipeline a bike travels. What the Quality Associate sees
   is QC and RTD paired on their own row, and that is done by a grid rule on the QC
   card rather than by reordering here — so this assertion guards the markup and the
   geometry suite guards the layout. */
ok('and they read down the pipeline a bike travels',
   [...document.querySelectorAll('.hm__task .l')].map(l=>l.textContent).join('|')
   === 'Active tokens|Dropped bikes|Assessment & fault marking|Repair tasks|Unallocated bikes|Allocated bikes|QC pending|RTD pending',
   [...document.querySelectorAll('.hm__task .l')].map(l=>l.textContent).join('|'));
ok('six workbench shortcuts', document.querySelectorAll('.hm__sc').length===6, document.querySelectorAll('.hm__sc').length);
ok('Home is the current nav item', document.querySelector('.hmnav [data-nav="home"]').getAttribute('aria-current')==='page', true);
/* Three of the four cards are wired now — Active tokens opens the token queue,
   ported from Barun's prototype. Dropped bikes is the one that still reports. */
document.querySelector('[data-task="dropped"]').click();
ok('an unwired card stays put', current==='home', current);
document.querySelector('[data-task="tokens"]').click();
await new Promise(r=>setTimeout(r,460));
ok('Active tokens opens the token queue', current==='tokens', current);
ok('it has no bottom nav — this screen leaves by the back button',
   !document.querySelector('#scrTokens .bottomnav') && !!document.getElementById('tkoBack'),
   'nav present');
ok('and the queue rendered: tabs, an active card, upcoming tokens',
   document.querySelectorAll('#tqTabs .tab').length===3
   && !!document.querySelector('#scrTokens .active-card')
   && document.querySelectorAll('#scrTokens .token-card').length > 3,
   document.querySelectorAll('#tqTabs .tab').length+' tabs / '
   + document.querySelectorAll('#scrTokens .token-card').length+' cards');
ok('his window.Yuzen contract survived the port', typeof window.Yuzen === 'object'
   && typeof window.Yuzen.onTokenOpen === 'function', typeof window.Yuzen);
/* One toast in the app, not two: his was removed so his calls fall through. */
ok('there is exactly one toast element', document.querySelectorAll('.toast').length===1,
   document.querySelectorAll('.toast').length);
document.getElementById('tkoBack').click();
await new Promise(r=>setTimeout(r,460));
ok('back returns to Home', current==='home', current);
document.querySelector('[data-task="assessment"]').click();
await new Promise(r=>setTimeout(r,450));
ok('Assessment & fault marking opens the task screen', current==='task', current);
/* NAME ONLY on a queue with tabs. The strip below already carries the count, and
   the title's version of it was the weaker one — it counts a single tab while
   sitting over both. A flat queue keeps its count; see Repairable bikes below. */
ok('queue names itself, and leaves the counting to its tabs',
   document.querySelector('#scrQueue .q__title .h').textContent.trim()==='Assessment & fault marking'
   && document.querySelector('.qsec-tabs .steptab.is-on .steptab__n').textContent===String(FLEET.length),
   document.querySelector('#scrQueue .q__title .h').textContent.trim());
/* Figma 2872:22873 replaced a single-select chip strip with a filter button and
   a row of quick chips carrying counts. The button is FIRST and fixed — it is the
   way to the groups that are not in the row, and the chips scroll past it. */
ok('All first, then the quick chips, then the filter button',
   !!document.getElementById('qFilterBtn')
   && !!document.querySelector('#qFilterBtn svg')
   && [...document.querySelectorAll('[data-qchip]')].map(b=>b.textContent.trim().replace(/ . \d+$/,''))
        .join('/')==='All/Revive/Low battery'
   /* The two buttons CLOSE the run, and are inside the scroller with the chips —
      they travel with them rather than holding their place while they slide
      under them. One of the set, not controls standing beside it.

      Filters then Sort, in that order: Filters narrows what the list contains
      and Sort arranges what is left, so the one that changes the set comes
      before the one that arranges it. Sort is last. */
   && document.getElementById('qFilterBtn').parentElement.id==='qQuick'
   && document.getElementById('qFilterBtn').nextElementSibling===document.getElementById('qSortBtn')
   && !document.getElementById('qSortBtn').nextElementSibling,
   [...document.querySelectorAll('[data-qchip]')].map(b=>b.textContent.trim()).join('/'));
ok('no tabs left', !document.querySelector('[data-tktab], .tktabs'), 'none');
/* No "All" chip any more, and nothing pressed. All is what deselecting gives
   you — a chip meaning "no filter" would compete with Reset for the same job. */
/* ALL is the resting state, and the only thing pressed on arrival. It is not a
   filter — it is the absence of one — so the list under it is the whole queue.
   It came back after a build without it: with nothing pressed the row had no
   state you could point at, and the chips read as available rather than as
   already showing you everything. */
ok('only All is pressed on arrival, and that is the whole queue',
   [...document.querySelectorAll('[data-qchip][aria-pressed="true"]')]
     .map(b=>b.dataset.qchip).join('/')==='__all'
   && document.querySelectorAll('.qrow').length===FLEET.length,
   document.querySelectorAll('.qrow').length+' rows');
/* The count on a chip is of the whole queue, not the filtered view: it says what
   is still there to reach for, not what you have already done. */
/* All counts the QUEUE, not the sum of the chips beside it — the chips overlap
   and a bike can match neither. */
ok('each quick chip carries its count, and All carries the queue\u2019s',
   (()=>{const t=[...document.querySelectorAll('[data-qchip]')].map(b=>b.textContent.trim());
     return t[0]==='All \u2022 '+FLEET.length
         && t[1]==='Revive \u2022 '+FLEET.filter(b=>b.battery===0).length
         && t[2]==='Low battery \u2022 '+FLEET.filter(b=>b.battery>0&&b.battery<QUEUE_LOW_BATTERY).length;})(),
   [...document.querySelectorAll('[data-qchip]')].map(b=>b.textContent.trim()).join('/'));
/* Counted against the fleet rather than named. It was 6 flat and 15 charged when
   FLEET was all 21; five of those bikes are in DONE now (see ASSESSED) and a
   sixth moves across every time an assessment is signed off, so a literal here
   is a number that goes stale on the first run of the flow it is testing. */
ok('the split really is battery === 0',
   FLEET.filter(b=>b.battery===0).length + FLEET.filter(b=>b.battery>0).length===FLEET.length
   && FLEET.filter(b=>b.battery===0).length > 0,
   FLEET.filter(b=>b.battery===0).length+' flat / '+FLEET.filter(b=>b.battery>0).length+' charged');
/* A quick chip commits on tap — it is the one filter that does not go through the
   sheet's draft, because it is in view of the list it changes. */
document.querySelector('[data-qchip="revive"]').click();
await new Promise(r=>setTimeout(r,60));
ok('a quick chip commits on tap and filters the list',
   document.querySelectorAll('.qrow').length===FLEET.filter(b=>b.battery===0).length
   && document.querySelector('[data-qchip="revive"]').getAttribute('aria-pressed')==='true',
   document.querySelectorAll('.qrow').length+' rows');
/* Chips within a group are OR, so two of them widen rather than narrow — the
   opposite of the old strip, where a second tap replaced the first. */
document.querySelector('[data-qchip="lowbatt"]').click();
await new Promise(r=>setTimeout(r,60));
ok('and a second chip in the same group ORs with it',
   document.querySelectorAll('.qrow').length
     === FLEET.filter(b=>b.battery===0||b.battery<QUEUE_LOW_BATTERY).length
   && document.querySelectorAll('[data-qchip][aria-pressed="true"]').length===2,
   document.querySelectorAll('.qrow').length+' rows');
document.querySelector('[data-qchip="revive"]').click();
document.querySelector('[data-qchip="lowbatt"]').click();
await new Promise(r=>setTimeout(r,60));
ok('deselecting everything is what All used to be',
   document.querySelectorAll('.qrow').length===FLEET.length, document.querySelectorAll('.qrow').length);

/* ── The filter sheet ────────────────────────────────────────────────────────
   Figma 2872:22873, less its Apply. The quick chips are a shortcut; this is the
   whole set. Every chip commits on tap, the same as the row's — the draft and the
   Apply that confirmed it are gone, and sliding the sheet down is the way out.
   ─────────────────────────────────────────────────────────────────────────── */
document.getElementById('qFilterBtn').click();
await new Promise(r=>setTimeout(r,350));
/* Two groups, not the frame's three. Issue type is gone — what is wrong with a
   bike is not known before somebody goes and looks at it, so a listing of bikes
   WAITING to be looked at cannot filter on it. See queue-kinds.js, which carries
   the group itself in a note. */
ok('the filter button opens the sheet, with its two groups',
   document.getElementById('fltSheet').classList.contains('is-open')
   && [...document.querySelectorAll('.flgroup__h')].map(h=>h.textContent).join('/')
        ==='Quick/Bike type'
   && !document.querySelector('[data-flgroup="issue"]'),
   [...document.querySelectorAll('.flgroup__h')].map(h=>h.textContent).join('/'));
ok('and no Apply, and no footer holding one',
   !document.getElementById('fltApply') && !document.querySelector('.flsheet__foot'),
   'apply still present');
/* Declared once and read twice: the quick group is the row AND the sheet's first
   group, so the two can never disagree about what Revive means. */
ok('the quick group appears in the row and in the sheet, from one declaration',
   [...document.querySelectorAll('[data-flgroup="quick"] .qchip')].map(c=>c.textContent.trim())
     .join('/')==='Revive/Low battery',
   [...document.querySelectorAll('[data-flgroup="quick"] .qchip')].map(c=>c.textContent.trim()).join('/'));
ok('Reset starts disabled — nothing is applied to clear',
   fltReset.disabled && !fltAny(queueFilters()), 'reset already live');
/* A chip in the sheet is the action. The list behind changes as you tap, which is
   what makes the Apply unnecessary rather than merely absent. */
document.querySelector('[data-flgroup="model"] [data-flchip="Dex NV"]').click();
await new Promise(r=>setTimeout(r,60));
ok('a chip in the sheet filters the list on tap, with the sheet still open',
   document.getElementById('fltSheet').classList.contains('is-open')
   && document.querySelectorAll('.qrow').length
        === FLEET.filter(b=>b.model==='Dex NV').length
   && !fltReset.disabled,
   document.querySelectorAll('.qrow').length+' rows');
/* Groups AND while chips OR — "a Dex NV that is also on a flat pack". It used to
   be read against Issue type; with that group gone, Quick is the other group on
   this queue. Asserted against the fleet rather than a fixture count. */
document.querySelector('[data-flgroup="quick"] [data-flchip="revive"]').click();
await new Promise(r=>setTimeout(r,60));
ok('a second group narrows it: groups AND, chips OR',
   document.querySelectorAll('.qrow').length
     === FLEET.filter(b=>b.model==='Dex NV'&&b.battery===0).length
   && document.querySelectorAll('.qrow').length > 0,
   document.querySelectorAll('.qrow').length+' rows');
document.querySelector('[data-flgroup="quick"] [data-flchip="revive"]').click();
await new Promise(r=>setTimeout(r,60));
/* The same chip exists in two places, so tapping one has to leave the other
   showing the same thing. */
document.querySelector('#qQuick [data-qchip="revive"]').click();
await new Promise(r=>setTimeout(r,60));
ok('a quick chip tapped in the row presses its twin in the open sheet',
   document.querySelector('[data-flgroup="quick"] [data-flchip="revive"]')
     .getAttribute('aria-pressed')==='true',
   'sheet copy not pressed');
document.querySelector('#qQuick [data-qchip="revive"]').click();
await new Promise(r=>setTimeout(r,60));
/* Reset clears everything at once now. With no draft there is nothing to wait
   for, and a Reset that needed confirming while every chip beside it did not
   would be the odd one out. */
fltReset.click();
await new Promise(r=>setTimeout(r,60));
ok('Reset clears every group and the list at once',
   document.querySelectorAll('.flgroup [aria-pressed="true"]').length===0
   && fltReset.disabled
   && document.querySelectorAll('.qrow').length===FLEET.length,
   document.querySelectorAll('.qrow').length+' rows');
/* ── Sliding it down ─────────────────────────────────────────────────────────
   The way out, now that there is no Apply — so the handle is the whole sheet and
   not one strip of it. Which means a tap and a drag start identically, and the
   three cases below are the ones that has to get right.
   ─────────────────────────────────────────────────────────────────────────── */
const flDrag = (el, dy, steps) => {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width/2, y0 = r.top + r.height/2;
  const opt = d => ({bubbles:true, cancelable:true, pointerId:1, pointerType:'touch',
                     clientX:x, clientY:y0+d, buttons:1});
  el.dispatchEvent(new PointerEvent('pointerdown', opt(0)));
  for (let i=1;i<=steps;i++) el.dispatchEvent(new PointerEvent('pointermove', opt(dy*i/steps)));
  el.dispatchEvent(new PointerEvent('pointerup', opt(dy)));
  el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
};
flDrag(document.querySelector('.flsheet__title'), 30, 5);
await new Promise(r=>setTimeout(r,350));
ok('a short drag springs back rather than dismissing',
   document.getElementById('fltSheet').classList.contains('is-open')
   && !document.getElementById('fltSheet').style.transform,
   document.getElementById('fltSheet').style.transform || 'no transform');
flDrag(document.querySelector('.flsheet__title'), 100, 8);
await new Promise(r=>setTimeout(r,350));
ok('a long one closes it',
   !document.getElementById('fltSheet').classList.contains('is-open'), 'still open');
/* Started on a CHIP, not the title — the whole surface is the handle. The chip
   must not fire on the way out, or letting go would toggle the filter you were
   pushing the sheet away to be rid of. */
document.getElementById('qFilterBtn').click();
await new Promise(r=>setTimeout(r,350));
{
  const chip = document.querySelector('[data-flchip="Dex NV"]');
  flDrag(chip, 120, 8);
  await new Promise(r=>setTimeout(r,350));
  ok('dragging from a chip closes it without tripping the chip',
     !document.getElementById('fltSheet').classList.contains('is-open')
     && chip.getAttribute('aria-pressed')==='false'
     && document.querySelectorAll('.qrow').length===FLEET.length,
     chip.getAttribute('aria-pressed')+' / '+document.querySelectorAll('.qrow').length+' rows');
}
/* …and the other half of that: below the arming distance it is still a tap. */
document.getElementById('qFilterBtn').click();
await new Promise(r=>setTimeout(r,350));
{
  const chip = document.querySelector('[data-flchip="Dex NV"]');
  flDrag(chip, 3, 2);
  await new Promise(r=>setTimeout(r,60));
  ok('but a nudge under 8px is still a tap, and still filters',
     document.getElementById('fltSheet').classList.contains('is-open')
     && chip.getAttribute('aria-pressed')==='true'
     && document.querySelectorAll('.qrow').length
          === FLEET.filter(b=>b.model==='Dex NV').length,
     document.querySelectorAll('.qrow').length+' rows');
  chip.click();
  await new Promise(r=>setTimeout(r,60));
}
/* The scrim still closes it too. */
document.getElementById('fltScrim').click();
await new Promise(r=>setTimeout(r,350));
ok('and the scrim closes it without committing anything, because it already has',
   !document.getElementById('fltSheet').classList.contains('is-open')
   && document.querySelectorAll('.qrow').length===FLEET.length,
   document.querySelectorAll('.qrow').length+' rows');
/* ── A BOARD'S NOTE ──────────────────────────────────────────────────────────
   Figma 2982:673. Declared by the SECTION, drawn by the template, and it must
   stay on the board that declared it — a note about where transferred bikes are
   parked is wrong on the tab of bikes that have not moved. */
goTo('task'); await new Promise(r=>setTimeout(r,60));
ok('the Pending board carries no note',
   !document.querySelector('.qnote'), 'a note is showing');
document.querySelector('[data-qsec="transfer"]').click();
await new Promise(r=>setTimeout(r,60));
ok('Transfer done does, and it sits between the strip and the first row',
   !!document.querySelector('.qnote')
   && document.querySelector('.qnote').previousElementSibling.classList.contains('qfilters')
   && document.querySelector('.qnote').nextElementSibling.classList.contains('qrow'),
   document.querySelector('.qnote')
     ? document.querySelector('.qnote').previousElementSibling.className + ' → qnote → '
       + document.querySelector('.qnote').nextElementSibling.className
     : 'no note');
/* The copy is the frame's, bullets included. Asserted as text rather than as
   markup so a change of element does not fail a test about words. */
ok('and it says what the frame says',
   /Assessment for following bikes is done/.test(document.querySelector('.qnote').textContent)
   && [...document.querySelectorAll('.qnote li')].map(l=>l.textContent.trim()).join('/')
      ==='Allocation zone/QC pending zone/Stuck bike zone',
   [...document.querySelectorAll('.qnote li')].map(l=>l.textContent.trim()).join('/'));
/* THE NOTE AND THE ROWS NAME THE SAME ZONES. The bullets are built from
   TRANSFER_ZONES and every row reads its zone out of the same array, so a zone
   on a row that the note does not list is a page contradicting itself. */
ok('every zone a row shows is one the note lists',
   (()=>{const listed=[...document.querySelectorAll('.qnote li')].map(l=>l.textContent.trim());
         const shown=[...document.querySelectorAll('.qrow .sub')]
           .map(x=>x.textContent.split('•')[1]).filter(Boolean).map(x=>x.trim());
         return shown.length>0 && shown.every(z=>listed.includes(z));})(),
   [...document.querySelectorAll('.qrow .sub')].slice(0,3).map(x=>x.textContent.trim()).join(' / '));
/* Bike number, then where it was left. The number still leads — it is what
   identifies the bike; the zone is where to walk to once you know which one. */
ok('the second line is the number, then the zone',
   /^\d{7} • (Allocation zone|QC pending zone|Stuck bike zone)$/
     .test(document.querySelector('.qrow .sub').textContent.trim()),
   document.querySelector('.qrow .sub').textContent.trim());
/* Weighted, not round-robin: most to allocation, fewest stuck. Asserted as an
   ORDERING rather than as 6/3/2, so the fixture can be re-weighted without
   failing a test about the shape of a day. */
ok('the zones are weighted — most to allocation, fewest stuck',
   (()=>{const n=z=>DONE.filter(d=>d.zone===z).length;
         return n(TRANSFER_ZONES[0])>n(TRANSFER_ZONES[1])
             && n(TRANSFER_ZONES[1])>n(TRANSFER_ZONES[2]);})(),
   TRANSFER_ZONES.map(z=>z+'='+DONE.filter(d=>d.zone===z).length).join(' '));
/* Only transferred bikes have one — a bike still waiting has not been walked
   anywhere, and a zone on it would be inventing a place it is not. */
ok('and only a transferred bike carries a zone',
   DONE.every(d => d.transferred ? !!d.zone : d.zone===null)
   && FLEET.every(b => !b.zone),
   DONE.filter(d=>!d.transferred && d.zone).length+' untransferred with a zone');

/* It SCROLLS with the rows rather than pinning under the tabs — it is read once
   on arrival and then it is in the way. */
ok('the note is in the list, not chrome above it',
   document.querySelector('.qnote').closest('#qList')===document.getElementById('qList'),
   'not in the list');
/* BACK TO PENDING before anything below runs. The active tab is REMEMBERED per
   queue (see qTabBy), so goTo('task') alone returns to Transfer done — and every
   assertion after this one is written against Pending's rows, which carry a pack
   reading and a wait where these carry a dash and a clock time. */
document.querySelector('[data-qsec="pending"]').click();
await new Promise(r=>setTimeout(r,60));

/* ── BIKES ON CHARGE ─────────────────────────────────────────────────────────
   Figma 2982:1400 and 2982:1404. A dead bike goes on an external power source
   for 5-10 minutes and several run at once, so they stack above the board with a
   clock each. TWO PHASES: charging, then reported-in-and-waiting-for-a-person.
   This is the thing that is NOT a task — one assessment is in hand at a time and
   the dock parks it, where any number of revivals can be running. */
goTo('task'); await new Promise(r=>setTimeout(r,60));
ok('the board seeds a stack of bikes already on charge',
   Object.keys(REVIVAL).length===2
   && document.querySelectorAll('.qrow.is-reviving').length===2,
   document.querySelectorAll('.qrow.is-reviving').length+' reviving rows');
ok('and they sit on top, before every bike that is still waiting',
   [...document.querySelectorAll('#qList .qrow')].slice(0,2)
     .every(r=>r.classList.contains('is-reviving'))
   && ![...document.querySelectorAll('#qList .qrow')].slice(2)
     .some(r=>r.classList.contains('is-reviving')),
   [...document.querySelectorAll('#qList .qrow')]
     .map(r=>r.classList.contains('is-reviving')?'R':'.').join(''));
ok('a charging row reads reviving, with its glyph and how long it has been on',
   (()=>{const r=document.querySelector('.qrow.is-reviving');
     return /^reviving/.test(r.querySelector('.wait__st').textContent.trim())
       && !!r.querySelector('.wait__st svg')
       && /^(since \d+m|just now)$/.test(r.querySelector('.wait__since').textContent)
       && r.querySelector('.wait__since').dataset.liveFmt==='since';})(),
   document.querySelector('.qrow.is-reviving .wait').textContent.replace(/\s+/g,' ').trim());
ok('and it still shows the flat pack that put it there',
   document.querySelector('.qrow.is-reviving').classList.contains('is-low')
   && document.querySelector('.qrow.is-reviving .pct').textContent==='0%',
   document.querySelector('.qrow.is-reviving .pct').textContent);

/* ── THE THREE STATES OF THE STEP ────────────────────────────────────────── */
{
  const row = deadRow();
  const id  = row.dataset.qbike;
  ok('the last flat bike is still openable, and leads with Revive dead bike',
     !!row && !onRevival(id), id);
  row.click(); await new Promise(r=>setTimeout(r,460));
  ok('its task page has four steps, revive first',
     current==='job'
     && document.querySelectorAll('.jb__step .lbl')[0].textContent==='1. Revive dead bike'
     && document.querySelectorAll('.jb__step').length===4,
     [...document.querySelectorAll('.jb__step .lbl')].map(e=>e.textContent).join('/'));
  ok('and the CTA offers Revival started',
     document.getElementById('jbStart').textContent.trim()==='Revival started'
     && !document.getElementById('jbStart').disabled,
     document.getElementById('jbStart').textContent.trim());

  /* ONE — on the charger. */
  document.getElementById('jbStart').click();
  await new Promise(r=>setTimeout(r,200));
  ok('pressing it puts the bike on charge and stays on the page',
     current==='job' && isReviving(id), current+' / reviving='+isReviving(id));
  ok('the CTA becomes Waiting for bike, and there is nothing to press',
     document.getElementById('jbStart').textContent.trim()==='Waiting for bike'
     && document.getElementById('jbStart').disabled,
     document.getElementById('jbStart').textContent.trim()
       +' / disabled='+document.getElementById('jbStart').disabled);
  ok('the step is still the one in hand — nothing has been ticked',
     jobAt===0 && document.querySelectorAll('.jb__step')[0].classList.contains('is-active'),
     'jobAt='+jobAt);

  /* TWO — the bike reports in. Called directly rather than waited for: the real
     signal is the bike's and the timer standing in for it is nine minutes. */
  bikePinged(id);
  await new Promise(r=>setTimeout(r,120));
  ok('when it pings, the CTA becomes Finish revival and comes alive',
     isRevived(id)
     && document.getElementById('jbStart').textContent.trim()==='Finish revival'
     && !document.getElementById('jbStart').disabled,
     document.getElementById('jbStart').textContent.trim());
  /* It woke with a little charge — that is what makes it assessable at all. */
  ok('and it wakes with some charge, so it is no longer flat',
     FLEET.find(b=>b.id===id).battery===REVIVE_CHARGE,
     String(FLEET.find(b=>b.id===id).battery));
  ok('but it has NOT left the stack — somebody still has to take it off charge',
     onRevival(id) && !FLEET.find(b=>b.id===id).revived, 'already released');

  /* THREE — the QCA takes it off charge. */
  document.getElementById('jbStart').click();
  await new Promise(r=>setTimeout(r,200));
  ok('Finish revival releases the bike and moves to the dashboard step',
     !onRevival(id) && jobAt===1
     && document.querySelectorAll('.jb__step')[0].classList.contains('is-done')
     && document.querySelectorAll('.jb__step')[1].classList.contains('is-active'),
     'onRevival='+onRevival(id)+' jobAt='+jobAt);
  /* The steps are RETAINED — it does not restart as a three-step task. */
  ok('and the four steps are kept, so the task reads as one job start to finish',
     document.querySelectorAll('.jb__step').length===4,
     document.querySelectorAll('.jb__step').length+' steps');
  /* AND THE TASK HAS STILL NOT BEGUN. Reviving a bike is hooking it to a charger
     and handing it back to the board; assessing it is the commitment, and the
     slide is where that is made — exactly as on a bike that never needed
     reviving. Until it is swiped this bike is nobody's. */
  ok('the dashboard step offers the slide, like any other bike',
     document.getElementById('jbStart').textContent.trim()==='Start task'
     && document.getElementById('jbStart').classList.contains('jb__slide')
     && !!document.querySelector('#jbKnob'),
     document.getElementById('jbStart').textContent.trim()
       +' / slide='+document.getElementById('jbStart').classList.contains('jb__slide'));
  ok('and the corner still closes rather than parks, because nothing is in hand',
     !jobStarted(), 'jobStarted='+jobStarted());
  /* Backing out must leave nothing behind — no parked card, no dock slot held. */
  document.getElementById('jbClose').click();
  await new Promise(r=>setTimeout(r,520));
  ok('backing out of a revived bike parks nothing',
     current==='task' && !minimised.assessment
     && document.getElementById('qMini').hidden,
     current+' / parked='+!!minimised.assessment);
  /* And the progress bar has NOT moved: the revival is not assessment work. */
  ok('and the bar has not moved — a revival is not progress on the assessment',
     (()=>{const el=document.getElementById('jbProg');
           return el.getAttribute('aria-valuenow')==='0';})(),
     document.getElementById('jbProg').getAttribute('aria-valuenow')+'%');
  document.querySelector(`[data-qbike="${id}"]`).click();
  await new Promise(r=>setTimeout(r,460));
  ok('reopening it comes back to the dashboard step, still unstarted',
     jobAt===1 && document.getElementById('jbStart').textContent.trim()==='Start task',
     'jobAt='+jobAt+' cta='+document.getElementById('jbStart').textContent.trim());
  goTo('task'); await new Promise(r=>setTimeout(r,300));
  ok('and on the board it is an ordinary bike again, out of the stack',
     !onRevival(id)
     && !document.querySelector(`[data-qbike="${id}"]`).classList.contains('is-reviving'),
     document.querySelector(`[data-qbike="${id}"]`).className);
}

/* ── THE REVIVED ROW ─────────────────────────────────────────────────────── */
{
  const id = Object.keys(REVIVAL)[0];
  bikePinged(id);
  await new Promise(r=>setTimeout(r,120));
  const row = document.querySelector(`[data-qbike="${id}"]`);
  ok('a bike that has reported in reads Revived, with the charger glyph',
     row.classList.contains('is-revived')
     && row.querySelector('.wait__st').textContent.trim()==='Revived'
     && !!row.querySelector('.wait__st svg')
     && /^(\d+m ago|just now)$/.test(row.querySelector('.wait__since').textContent)
     && row.querySelector('.wait__since').dataset.liveFmt==='ago',
     row.querySelector('.wait').textContent.replace(/\s+/g,' ').trim());
  /* Not a warning any more: it is at 5% and climbing on a charger, which is a
     result rather than something to worry about. A bike still CHARGING keeps
     its red, because it is genuinely flat. */
  ok('and its pack is no longer drawn as a warning',
     !row.classList.contains('is-low'), row.className);
  ok('it sits above the bikes still charging — it is the one needing a person',
     document.querySelectorAll('#qList .qrow')[0]===row,
     [...document.querySelectorAll('#qList .qrow')].slice(0,3)
       .map(r=>r.classList.contains('is-revived')?'V':r.classList.contains('is-reviving')?'R':'.').join(''));
}
goTo('task'); await new Promise(r=>setTimeout(r,200));

/* ── SORT ────────────────────────────────────────────────────────────────────
   Figma 2982:1287. Two chips per field — High to low / Low to high — one of
   which is pressed at all times, and the band's button that opens them. The
   list is asserted by its RENDERED order rather than by the state object: the
   state is what we set, the order is what the mechanic sees, and only one of
   those is the feature. */
const qWaits = () => [...document.querySelectorAll('.qrow:not(.is-reviving) .wait')].map(w=>w.textContent.trim());
/* The board, not the stack: bikes on charge are pinned above the order and are
   all 0%, so counting them would make every descending sort look broken. */
const qNums  = () => [...document.querySelectorAll('.qrow:not(.is-reviving) .id')]
                       .map(e=>parseInt((e.textContent.match(/(\d+)%/)||[])[1],10));
const srtChip = (id,dir) => document.querySelector(`[data-srtopt="${id}"][data-dir="${dir}"]`);
ok('the band carries a Sort button, with a glyph',
   !!document.getElementById('qSortBtn') && !!document.querySelector('#qSortBtn svg'),
   document.getElementById('qSortBtn') ? 'present' : 'missing');
/* A queue that declares no `sorts` gets NO button, rather than one that opens
   an empty sheet. QC pending is the case — filters, but nothing to order by. */
goTo('qc'); await new Promise(r=>setTimeout(r,60));
ok('a queue with nothing to order by shows no Sort button at all',
   !document.getElementById('qSortBtn') && !!document.getElementById('qFilterBtn'),
   document.getElementById('qSortBtn') ? 'button present' : 'none');
goTo('task'); await new Promise(r=>setTimeout(r,60));

const defaultOrder = qWaits();
document.getElementById('qSortBtn').click();
await new Promise(r=>setTimeout(r,350));
ok('tapping it opens the sort sheet, headed "Sort by"',
   document.getElementById('srtSheet').classList.contains('is-open')
   && document.querySelector('.srtsheet__title').textContent.trim()==='Sort by',
   document.querySelector('.srtsheet__title').textContent.trim());
/* The frame's shape: a heading per field, two direction chips under each. */
ok('a group per field, each with both directions, High to low first',
   [...document.querySelectorAll('#srtBody .flgroup__h')].map(h=>h.textContent).join('/')
     ==='Wait time/Battery %'
   && [...document.querySelectorAll('#srtBody .qchip')].map(c=>c.textContent.trim()).join('/')
     ==='High to low/Low to high/High to low/Low to high',
   [...document.querySelectorAll('#srtBody .qchip')].map(c=>c.textContent.trim()).join('/'));
/* It REUSES the library chip the filter sheet uses — same component in the
   frame, so the same class here. A lookalike of its own is how the two drift. */
ok('and they are the sheet\'s own 48px chips, not a second lookalike',
   document.querySelectorAll('#srtBody .qchip').length===4
   && !document.querySelector('.srtopt'),
   document.querySelectorAll('#srtBody .qchip').length+' chips');

/* THERE IS ALWAYS A SELECTION. The kind's default is pressed on arrival — the
   list is already in that order, and nothing pressed would have denied it. */
ok('the kind default is pressed on arrival, and only it',
   srtChip('wait','desc').getAttribute('aria-pressed')==='true'
   && document.querySelectorAll('#srtBody .qchip[aria-pressed="true"]').length===1,
   document.querySelectorAll('#srtBody .qchip[aria-pressed="true"]').length+' pressed');
ok('and Reset is dead, because that IS the order the list is in',
   document.getElementById('srtReset').disabled, 'reset already live');

/* SINGLE SELECT ACROSS THE SHEET — a list has one order, so a chip in the other
   group releases this one. */
srtChip('battery','asc').click();
await new Promise(r=>setTimeout(r,60));
ok('a chip in another group takes the selection and releases the first',
   srtChip('battery','asc').getAttribute('aria-pressed')==='true'
   && srtChip('wait','desc').getAttribute('aria-pressed')==='false'
   && document.querySelectorAll('#srtBody .qchip[aria-pressed="true"]').length===1,
   document.querySelectorAll('#srtBody .qchip[aria-pressed="true"]').length+' pressed');
ok('and the list is actually in battery order, lowest first',
   qNums().every((v,i,a)=>i===0||a[i-1]<=v), qNums().slice(0,5).join(','));
srtChip('battery','desc').click();
await new Promise(r=>setTimeout(r,60));
ok('the other direction is its own chip, not a second tap on the same one',
   qNums().every((v,i,a)=>i===0||a[i-1]>=v)
   && srtChip('battery','desc').getAttribute('aria-pressed')==='true'
   && srtChip('battery','asc').getAttribute('aria-pressed')==='false',
   qNums().slice(0,5).join(','));
/* A pressed chip does not unpress: that would leave nothing selected while the
   list stayed in that very order. */
srtChip('battery','desc').click();
await new Promise(r=>setTimeout(r,60));
ok('tapping the pressed chip again changes nothing',
   srtChip('battery','desc').getAttribute('aria-pressed')==='true'
   && document.querySelectorAll('#srtBody .qchip[aria-pressed="true"]').length===1
   && qNums().every((v,i,a)=>i===0||a[i-1]>=v),
   document.querySelectorAll('#srtBody .qchip[aria-pressed="true"]').length+' pressed');

/* THE BUTTON NEVER LIGHTS — the one place it parts company with Filters. */
ok('the band button stays plain however the list is ordered',
   !document.getElementById('qSortBtn').classList.contains('is-on'), 'it lit');

/* RESET returns to the kind's default, and presses that chip again. */
ok('Reset came alive once the order left the default',
   !document.getElementById('srtReset').disabled, 'still dead');
document.getElementById('srtReset').click();
await new Promise(r=>setTimeout(r,60));
ok('Reset returns the list to the kind default and presses it again',
   qWaits().join('|')===defaultOrder.join('|')
   && srtChip('wait','desc').getAttribute('aria-pressed')==='true'
   && document.getElementById('srtReset').disabled,
   qWaits().slice(0,3).join('|'));
document.getElementById('srtScrim').click();
await new Promise(r=>setTimeout(r,350));
ok('the scrim closes the sort sheet too',
   !document.getElementById('srtSheet').classList.contains('is-open'), 'still open');

/* Model and charge are the title now; the number is the quiet second line. The
   charge moved up because it is part of what you choose between — the number
   identifies the bike once you have chosen. */
ok('model and charge lead the row, number beneath',
   /^(Miracle|Dex GR|Dex NV) \u2022 \d+%$/.test(document.querySelector('.qrow .id').textContent.trim())
   && /^\d{7}$/.test(document.querySelector('.qrow .sub').textContent.trim()),
   document.querySelector('.qrow .id').textContent+' / '+document.querySelector('.qrow .sub').textContent);
/* Red is the warning, and it starts at 20% — not at empty. Assert the threshold
   itself, not a fixture: the fleet is deterministic but the boundary is the rule.

   A BIKE THAT HAS JUST REPORTED IN IS EXEMPT and is excluded here rather than
   weakening the rule: it sits at 5% on a charger and climbing, so red would be
   warning about the one bike on the board nobody needs to worry about. It rejoins
   the rule the moment the QCA takes it off charge. A bike still CHARGING keeps
   its red — it is genuinely flat, which is why it is there. */
ok('only packs under 20% are flagged, except one coming back off a charger',
   (()=>{const rows=[...document.querySelectorAll('.qrow')];
     return rows.every(r => {
       const pct = parseInt(r.querySelector('.pct').textContent, 10);
       if (isNaN(pct)) return true;
       if (r.classList.contains('is-revived')) return !r.classList.contains('is-low');
       return r.classList.contains('is-low') === (pct < QUEUE_LOW_BATTERY);
     });})(),
   QUEUE_LOW_BATTERY + '% threshold');
/* The battery glyph went with the redesign: a percentage beside the model needs
   no icon to say what it is, and it was the only thing on the row drawn rather
   than written. */
ok('and the reading carries no glyph any more',
   !document.querySelector('.qrow .batt') && !!document.querySelector('.qrow .id .pct'),
   document.querySelector('.qrow .id').textContent);
/* "4h 30m" per Figma 2439:28117, hours primary and minutes secondary — two
   spans, not one string, so the eye lands on the number that decides whether
   this bike has waited too long. The header's average keeps the long words. */
ok('and the waiting time is on the right, in short form',
   /^(\d+h ?)?(\d+m)?$/.test(document.querySelector('.qrow:not(.is-reviving) .wait').textContent.trim())
   && !!document.querySelector('.qrow:not(.is-reviving) .wait .wait__h'),
   document.querySelector('.qrow:not(.is-reviving) .wait').textContent);

// the dock follows scroll direction
/* The Filters / Sort bar is gone — filtering moved to the top of the screen and
   Sort by was never wired. So the dock is the FAB and the parked-task slot, and
   it no longer travels: there is nothing below it to drop into. */
ok('the dock is the FAB and the parked slot, with no bar',
   !!document.querySelector('#qDock #qScanFab') && !!document.querySelector('#qDock #qMini')
   && !document.querySelector('.qbar') && !document.querySelector('[data-qbar]'), true);
/* THE BAND BELONGS TO THE TAB, not to the screen. On a tab queue it is rendered
   inside the list under the strip, so it scrolls away with the rows it filters
   and does not travel on its own — a band that stayed put while the board under
   it changed would look like chrome for the screen when it is chrome for one
   board. */
const L=document.getElementById('qList');
/* Strip, then the band. Both belong to the board you are looking at, so both
   ride inside the tab; the average is pinned to the floor of the scroller and
   belongs to neither. */
ok('the band rides inside the list, under the strip',
   document.getElementById('qFilters').parentElement.id==='qList'
   && document.getElementById('qFilters').previousElementSibling.classList.contains('qsec-tabs')
   && document.getElementById('qAvgBar').parentElement.classList.contains('qscroller'),
   document.getElementById('qFilters').parentElement.id);
/* THE TWO TABS ARE EXCLUSIVE, and not only in their rows. Transfer done drops
   the filter band (both chips ask about a pack that has been pulled), the
   average (its right-hand column is a clock time, so an average WAIT would be a
   figure about the other tab) and the parked-task band (a task in hand belongs
   to the board being worked, which is the other one). */
minimised.assessment = {bike:{id:'5081092', model:'Dex GR'}, step:'Assessment dashboard', pct:20};
renderMinis();
ok('a parked task shows on Pending', !document.getElementById('qMini').hidden, 'hidden');
document.querySelector('[data-qsec="transfer"]').click();
await new Promise(r=>setTimeout(r,60));
ok('Transfer done drops the band, the average, the parked task and the scan',
   document.getElementById('qFilters').hidden
   && document.getElementById('qAvgBar').hidden
   && document.getElementById('qMini').hidden
   && getComputedStyle(document.querySelector('.qfabrow')).display==='none'
   && !document.getElementById('scrQueue').classList.contains('has-avg'),
   [...document.querySelectorAll('.qrow')].length+' rows');
document.querySelector('[data-qsec="pending"]').click();
await new Promise(r=>setTimeout(r,60));
ok('and Pending has them all back',
   !document.getElementById('qFilters').hidden
   && !document.getElementById('qAvgBar').hidden
   && !document.getElementById('qMini').hidden,
   'missing');
minimised.assessment = null; renderMinis();
L.scrollTop=200; L.dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
ok('and it does not travel — it is scrolling already',
   !document.getElementById('qFilters').classList.contains('is-up'), 'travelled');
L.scrollTop=0; L.dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
/* QC pending is the other shape: no tabs, so the band is chrome pinned to the
   top of the scroller — and there it still gets out of the way on the way down
   and comes back on the way up, with 8px of slack against finger noise. */
goTo('qc'); await new Promise(r=>setTimeout(r,450));
const Q=document.getElementById('qList');
ok('a queue without tabs keeps the band as chrome, and it starts down',
   document.getElementById('qFilters').parentElement.classList.contains('qscroller')
   && !document.getElementById('qFilters').classList.contains('is-up'), 'up');
Q.scrollTop=200; Q.dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
ok('scrolling down takes the filter row up',
   document.getElementById('qFilters').classList.contains('is-up'), 'still down');
Q.scrollTop=120; Q.dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
ok('scrolling up brings it back', !document.getElementById('qFilters').classList.contains('is-up'), 'still up');
Q.scrollTop=124; Q.dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
ok('a 4px nudge is ignored', !document.getElementById('qFilters').classList.contains('is-up'), 'flickered');
Q.scrollTop=0; Q.dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
goTo('task'); await new Promise(r=>setTimeout(r,450));
ok('longest wait first, in every filter',
   (()=>{const mins=[...document.querySelectorAll('.qrow:not(.is-reviving) .wait')].map(el=>{
       const m=el.textContent.match(/(?:(\d+)hrs?)?\s*(?:(\d+)mins?)?/);
       return (+(m[1]||0))*60 + (+(m[2]||0));});
     return mins.every((v,i)=>i===0||mins[i-1]>=v);})(),
   [...document.querySelectorAll('.qrow:not(.is-reviving) .wait')].slice(0,3).map(e=>e.textContent).join(' / '));
/* Of the bikes actually WAITING. The two on charge sit above the board and are
   not in the queue's order at all — see queueReviveFirst. */
ok('the first row is the longest-waiting bike still on the board',
   (()=>{const worst=Math.max(...FLEET.filter(b=>!onRevival(b.id)).map(b=>b.waitMins));
     const want = fmtWaitShort(worst).replace(/<[^>]+>/g,'');
     return document.querySelector('.qrow:not(.is-reviving) .wait').textContent.trim()===want.trim();})(),
   document.querySelector('.qrow:not(.is-reviving) .wait').textContent);
/* Not a literal id: eleven bikes have been spliced out of FLEET into DONE (see
   ASSESSED) and the first of them was 5078900, so naming one is naming the seed
   list rather than the invariant. What the sort must not do is reorder the
   source, so that is what is checked. */
ok('FLEET itself is untouched by the sort',
   (()=>{const before = FLEET.map(b=>b.id).join(',');
     queueBikes();
     return FLEET.map(b=>b.id).join(',') === before;})(), 'reordered');
ok('header shows an average wait', /^Avg\. wait time: \d/.test(document.getElementById('qAvg').textContent), document.getElementById('qAvg').textContent);
const avgAssess = document.getElementById('qAvg').textContent;
document.querySelector('[data-qchip="revive"]').click();
await new Promise(r=>setTimeout(r,60));
/* Against REVIVE() itself, not a hand-rolled `battery===0`. The chip's meaning
   moved when revival arrived — a woken bike is still flat and is no longer a
   candidate — and a copy of the old rule here would have failed for being stale
   rather than for anything being wrong. Assert the rule, not the fixture. */
ok('Revive lists exactly the bikes that still need it',
   document.querySelectorAll('.qrow').length===FLEET.filter(b=>REVIVE(b)).length
   && [...document.querySelectorAll('.qrow .pct')].every(s=>s.textContent==='0%'),
   document.querySelectorAll('.qrow').length+' rows vs '+FLEET.filter(b=>REVIVE(b)).length);
/* It does NOT follow the filter. The header reports how this queue is being
   served, so it holds still while the chips are tapped — a figure that moved on
   every tap would be reporting the filter, not the mechanic's pace. */
ok('and the average holds still across chips',
   document.getElementById('qAvg').textContent===avgAssess, 'moved with the filter');
ok('it is the whole queue\'s average, not the view\'s',
   (()=>{const avg=Math.round(FLEET.reduce((a,b)=>a+b.waitMins,0)/FLEET.length);
     return document.getElementById('qAvg').textContent==='Avg. wait time: '+fmtWait(avg);})(),
   document.getElementById('qAvg').textContent);
document.querySelector('[data-qchip="revive"]').click();
await new Promise(r=>setTimeout(r,60));
document.getElementById('qBack').click();
await new Promise(r=>setTimeout(r,450));
ok('queue back returns home', current==='home', current);
document.querySelector('[data-task="assessment"]').click();
await new Promise(r=>setTimeout(r,450));
const picked = liveRow().dataset.qbike;
liveRow().click();
await new Promise(r=>setTimeout(r,450));

// job — the task the bike carries
ok('picking a bike opens its job page', current==='job' && document.getElementById('scrJob').classList.contains('is-active'), current);
ok('and it carries that bike through', BIKE.id===picked, BIKE.id+' vs '+picked);
/* MODEL, NUMBER AND PACK, and all three carried off the row that was tapped —
   asserted against BIKE rather than against the fixture, because the point is
   that the page cannot disagree with the row behind it. The pack reads through
   as a number here: this bike is still in FLEET, so it still has one. */
ok('the job names the bike, its number and its pack',
   document.querySelector('#scrJob .jb__title .s').textContent.replace(/\s+/g,' ').trim()
     ===`${BIKE.model} • ${BIKE.id} • ${BIKE.battery}%`,
   document.querySelector('#scrJob .jb__title .s').textContent);
/* And the heading is the queue's own words — see the note on TASK_KINDS. */
ok('and the heading matches the board that opened it',
   document.querySelector('#scrJob .jb__title .h').textContent.trim()==='Assessment & fault marking',
   document.querySelector('#scrJob .jb__title .h').textContent.trim());
ok('three steps, assessment first',
   [...document.querySelectorAll('.jb__step .lbl')].map(e=>e.textContent).join('/')==='1. Assessment dashboard/2. Remove battery mapping/3. Drop in Repairable bike area',
   [...document.querySelectorAll('.jb__step .lbl')].map(e=>e.textContent).join('/'));
ok('step one is active, the rest disabled',
   document.querySelectorAll('.jb__step')[0].classList.contains('is-active')
   && [...document.querySelectorAll('.jb__step')].slice(1).every(b=>b.disabled),
   'ok');
ok('untouched, it is a heading and nothing else',
   !document.querySelector('.jb__step .prog'), 'carries a sub-heading already');
ok('the CTA reads Start task', document.getElementById('jbStart').textContent.trim()==='Start task',
   document.getElementById('jbStart').textContent.trim());
/* ── The CTA is a SLIDE — Figma 2913:32095 ─────────────────────────────────
   Starting a task, and closing a step of one, are things a QCA does once and
   should not do by brushing the screen with a gloved thumb. Same 318x64 and the
   same words as the button it replaces; the knob is the only thing added. */
{
  const el = document.getElementById('jbStart');
  const r  = () => el.getBoundingClientRect();
  const at = () => parseFloat(getComputedStyle(el).getPropertyValue('--p')) || 0;
  const send = (t, x) => el.dispatchEvent(new PointerEvent(t,
    {clientX:r().left + x, clientY:r().top + 32, bubbles:true, pointerId:9}));
  ok('the CTA carries a knob at rest, on the near side',
     !!document.getElementById('jbKnob') && at()===0
     && Math.round(R('#jbKnob').left - r().left)===4,
     Math.round(R('#jbKnob').left - r().left)+' from the edge');
  send('pointerdown', 30); send('pointermove', 150);
  await new Promise(r=>setTimeout(r,60));
  /* Mid-drag: the knob follows the thumb and the label fades behind it rather
     than shuffling sideways out of its way. */
  ok('dragging moves the knob and fades the label',
     at() > 0.3 && at() < 0.9
     && parseFloat(getComputedStyle(el.querySelector('span')).opacity) < 1,
     'p '+at().toFixed(2));
  /* Short of the commit point it springs back — a nudge must not start a task. */
  send('pointerup', 150);
  await new Promise(r=>setTimeout(r,320));
  ok('releasing short of the commit point springs back', at()===0 && current==='job',
     'p '+at()+' / '+current);
  /* THE FIRST PRESS ONLY. Starting a task commits a QCA to a bike; the steps
     within a job already begun are ordinary buttons, and a gesture on each of
     those is friction charged for nothing. Keyed on jobStarted(), the same test
     the corner button uses to decide between closing and parking. */
  PARTS[0].status = 'good'; renderJob();
  ok('and once the task is begun it is an ordinary button again',
     el.textContent.trim()==='Resume task'
     && !el.classList.contains('jb__slide')
     && document.getElementById('jbKnob').offsetParent === null,
     el.textContent.trim()+' / slide '+el.classList.contains('jb__slide'));
  PARTS[0].status = 'pending'; renderJob();
  ok('and a slide again on a task nobody has touched',
     el.classList.contains('jb__slide') && el.textContent.trim()==='Start task',
     el.textContent.trim());
}

// the title snaps into the bar with the actions
ok('bar is transparent over the hero at rest',
   !document.getElementById('jbBar').classList.contains('is-solid'), 'already solid');
{
  const sc=document.getElementById('jbScroll');
  ok('the page can scroll far enough to collapse',
     sc.scrollHeight - sc.clientHeight >= Math.round(document.getElementById('jbTitle').getBoundingClientRect().top
       - document.getElementById('jbBar').getBoundingClientRect().bottom),
     (sc.scrollHeight-sc.clientHeight)+' available');
  sc.scrollTop = sc.scrollHeight; sc.dispatchEvent(new Event('scroll'));
  await new Promise(r=>setTimeout(r,60));
  ok('scrolling snaps the title into the bar',
     document.getElementById('jbBar').classList.contains('is-solid'), 'still transparent');
  ok('close and more sit in that same bar',
     !!document.querySelector('#jbBar #jbClose') && !!document.querySelector('#jbBar #jbMore')
     && !!document.querySelector('#jbBar .jb__barTitle'), true);
  ok('and the steps have ridden up over the image',
     (()=>{const hero=document.querySelector('.jb__heroWrap').getBoundingClientRect();
       const bar=document.getElementById('jbBar').getBoundingClientRect();
       const step=document.querySelector('.jb__step').getBoundingClientRect();
       /* hero has passed behind the bar, and a step now occupies that space */
       const visible=[...document.querySelectorAll('.jb__step')]
         .some(el=>{const r=el.getBoundingClientRect(); return r.bottom > bar.bottom && r.top < bar.bottom + 300;});
       return hero.bottom <= bar.bottom && visible;})(),
     'hero bottom '+Math.round(document.querySelector('.jb__heroWrap').getBoundingClientRect().bottom)
       +', first step '+Math.round(document.querySelector('.jb__step').getBoundingClientRect().top));
  sc.scrollTop = 0; sc.dispatchEvent(new Event('scroll'));
  await new Promise(r=>setTimeout(r,60));
  ok('back at the top it goes transparent again',
     !document.getElementById('jbBar').classList.contains('is-solid'), 'still solid');
}
/* Start task opens the DASHBOARD now, not the checklist. The step is called
   "Assessment dashboard" and that is what it opens; the checklist hangs off the
   dashboard's Checks card, which is the same shape the mechanic's repair flow
   already has. */
document.getElementById('jbStart').click();
await new Promise(r=>setTimeout(r,450));
ok('Start task opens the assessment dashboard', current==='rnm', current);
/* One screen, two flows. Which one it is standing in decides where its exits go
   and which checklist its Checks card opens — see rnmKind in task-kinds.js. */
ok('and the dashboard knows which flow opened it', rnmKind==='assessment', rnmKind);
/* The first place the two versions actually diverge. The clock is the same
   reading either way — how long this has been open — but what it is timing is not
   the same job, so the words follow the flow. */
ok('the timer names the assessment, not a live repair',
   document.getElementById('rnTimerWhat').textContent==='Bike assessment'
   && document.getElementById('rnTimerBike').textContent.trim()==='· '+BIKE.id,
   document.getElementById('rnTimerWhat').textContent
     + document.getElementById('rnTimerBike').textContent);
/* And the mechanic's dashboard is untouched — the whole point of branching here
   rather than renaming the label outright. */
/* jobKind, not rnmKind — the dashboard reads its flow off the task page at the
   door, so setting rnmKind by hand is overwritten by the next entry. That is the
   point of deriving it: there is one source and it cannot go stale. */
ok('while the repair flow still reads Live repair',
   (()=>{ const was = jobKind; jobKind = 'repair'; enterRnm();
     const t = document.getElementById('rnTimerWhat').textContent;
     jobKind = was; enterRnm(); return t === 'Live repair'; })(),
   document.getElementById('rnTimerWhat').textContent);
/* And everything else the two flows differ on, in one place. The assessment lists
   what it FOUND — mechanical, electrical, what is still open, and the price — and
   has no part-exchange card to swipe to. */
ok('the assessment lists four findings, not three tasks',
   (()=>{const n = id => document.querySelector('#'+id+' .trow__name').textContent;
     const c = id => document.getElementById(id).textContent;
     return n('rowMech')==='Mechanical faults'   && /^\d+ marked$/.test(c('countMech'))
         && n('rowElec')==='Electrical faults'   && /^\d+ detected$/.test(c('countElec'))
         && n('rowChecks')==='Active checklist'  && /^\d+ checklists?$/.test(c('countChecks'))
         && n('rowPenalty')==='Mark penalties'
         && /^(No penalty|\d+ penalty)$/.test(c('countPenalty'));})(),
   [...document.querySelectorAll('#rnPanelTasks .trow')]
     .map(r=>r.querySelector('.trow__name').textContent+' '+r.querySelector('.trow__count').textContent)
     .join(' | '));
/* "Assessment", and no heading over them. Three of the four rows are findings
   rather than tasks, so there was nothing for a done-over-total to count. */
ok('the tab reads Assessment and the heading is gone',
   document.querySelector('#rnTabTasks span').textContent==='Assessment'
   && document.getElementById('rnTasksHead').offsetParent === null,
   document.querySelector('#rnTabTasks span').textContent);
/* The order a QCA works in, set by `order` so the DOM keeps reading in the
   repair's. It was findings-first — what the assessment turned UP — with the
   checklist below as a button; the checklist is step 1 now and the button is a
   stepper. */
/* THREE rows. Mechanical and Electrical are one, and so are the checklist and
   the penalties — a penalty is marked against what the checklist finds, and
   neither pair is two jobs. Both splits live inside their screens as tabs. */
ok('and they are ordered checklist, faults, picker',
   [...document.querySelectorAll('#rnPanelTasks .trow')]
     .filter(r=>r.offsetParent!==null)
     .sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)
     .map(r=>r.id).join('/')==='rowAssess/rowFaults/rowChecks',
   [...document.querySelectorAll('#rnPanelTasks .trow')]
     .filter(r=>r.offsetParent!==null)
     .sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)
     .map(r=>r.id).join('/'));
/* And its sub-line keeps both halves in their own words. A person MARKED one,
   the bike DETECTED the other; merging the rows must not merge the two claims
   into one number that means neither. */
ok('and the merged row states both halves',
   /^\d+ marked \u00b7 \d+ detected$/.test(document.getElementById('countFaults').textContent),
   document.getElementById('countFaults').textContent);
/* Nothing on the bike to begin with. The two mechanical reports this app seeds
   are the repair's brief — a mechanic is sent to a bike someone has already
   reported — and an assessment is the visit that decides whether there is
   anything to report, so it opens on an empty record. */
ok('the mechanical row opens at nothing',
   document.getElementById('countMech').textContent==='0 marked'
   && issuesTallyBy('Mechanical').total===0,
   document.getElementById('countMech').textContent);
/* A mechanical part marked faulty is FILED against the bike, so the row counts it
   because the list contains it — asserted together, because the count and its
   destination used to disagree: the row added this checklist's faults to the
   bike's own and the list it opened had never heard of them. */
ok('marking one faulty files it on the bike, and the row counts the list',
   (()=>{const wheel = PARTS.find(p=>p.name==='Front wheel');
     const was = wheel.status, wasR = wheel.reasons_selected;
     wheel.status='faulty'; wheel.reasons_selected=['Wobble'];
     fileAssessmentFault(wheel); enterRnm();
     const filed = issuesByPart()['Front wheel'];
     const counted = document.getElementById('countMech').textContent==='1 marked';
     /* …and swiping the other way withdraws it again. */
     wheel.status='good'; wheel.reasons_selected=[];
     fileAssessmentFault(wheel); enterRnm();
     const gone = !issuesByPart()['Front wheel']
               && document.getElementById('countMech').textContent==='0 marked';
     wheel.status = was; wheel.reasons_selected = wasR;
     return wheel.system==='mech' && counted && gone
       && filed && filed.reasons.join()==='Wobble';})(),
   document.getElementById('countMech').textContent);
/* An ELECTRICAL part files against Mechanical too, and that is the point rather
   than a slip: the two rows are two ways of finding a fault, not two systems. A
   QCA looking at a headlight that does not come on has MARKED it; the Electrical
   row counts what the bike DETECTED, and nothing a person does lands there.

   This is the case that was actually broken — the first three parts on this
   checklist are electrical, so splitting by system meant a QCA swiping the top of
   the list watched Mechanical stay at 0. */
ok('an electrical part files against Mechanical, and leaves Detected alone',
   (()=>{const mcu = PARTS.find(p=>p.name==='MCU');
     const was = mcu.status, wasR = mcu.reasons_selected;
     const elec = issuesTallyBy('Electrical').total;
     const mech = issuesTallyBy('Mechanical').total;
     mcu.status='faulty'; mcu.reasons_selected=['Error code'];
     fileAssessmentFault(mcu); enterRnm();
     const filed   = issuesTallyBy('Mechanical').total === mech + 1;
     const marked  = document.getElementById('countMech').textContent === (mech+1)+' marked';
     const untouched = issuesTallyBy('Electrical').total === elec
       && document.getElementById('countElec').textContent === elec+' detected';
     mcu.status='good'; mcu.reasons_selected=[];
     fileAssessmentFault(mcu); enterRnm();
     mcu.status = was; mcu.reasons_selected = wasR;
     return mcu.system==='elec' && filed && marked && untouched;})(),
   document.getElementById('countMech').textContent+' / '
     +document.getElementById('countElec').textContent);
/* The filed row carries the PART'S OWN picture, at the crop the rest of the app
   shows it at. Every one of them used to be the front wheel: the sender handed
   over `var(--img-mcu)` — a CSS variable, not an image — so the receiving screen
   found nothing usable and fell back to its own default photo. Two lists, same
   part, different picture.

   Asserted on the two functions that carry it rather than on the row — ISSUES is
   private to the Issues screen, and these are where the bug was: an image URL
   that resolves to actual bytes, and a crop that scales to the tile asking. */
ok('every part on this checklist resolves to its own render, with a crop',
   (()=>{const withPhoto = PARTS.filter(p => p.photo);
     const urls = withPhoto.map(partImageURL);
     return withPhoto.length >= 5
       /* real bytes, not `var(--img-mcu)`, which is what used to travel */
       && urls.every(u => /^data:image\//.test(u))
       /* and a DIFFERENT one each — every filed row showed the front wheel */
       && new Set(urls).size === urls.length
       /* the crop follows the tile: 56 in a row, 64 in the sheet */
       && withPhoto.every(p => cropStyle(partImageURL(p), p.crop, 56)
                            && cropStyle(partImageURL(p), p.crop, 64))
       && cropStyle(partImageURL(withPhoto[0]), withPhoto[0].crop, 56)
          !== cropStyle(partImageURL(withPhoto[0]), withPhoto[0].crop, 64);})(),
   PARTS.filter(p=>p.photo).map(p => p.photo+':'+partImageURL(p).slice(0,11)).join(' '));
/* And the repair gets its brief back — the withdrawal is per visit, not a delete. */
ok('the repair still opens on the two reports it was sent for',
   (()=>{const was = jobKind;
     jobKind='repair'; enterRnm();
     const back = issuesTallyBy('Mechanical').total===2;
     jobKind=was; enterRnm();
     return back && issuesTallyBy('Mechanical').total===0;})(),
   issuesTallyBy('Mechanical').total+' after');
/* The Part Exchange card is the repair's paperwork and has no counterpart here,
   and with it gone the carousel is a one-page carousel — so the dots go too, and
   the swipe is disarmed rather than merely hidden. */
ok('no part-exchange card and no carousel on the assessment',
   (()=>{const px = document.getElementById('btnPxOpen');
     const dots = document.getElementById('rnCarDots');
     const hidden = el => el.offsetParent === null;
     /* setRnCar is inside the RnM screen's IIFE, so the swipe guard is exercised
        the way a finger would: the dot for slide 2 is the only handle, and it is
        gone. Which is the assertion. */
     return hidden(px) && hidden(dots)
       && !document.getElementById('scrRnm').classList.contains('is-car2');})(),
   document.getElementById('scrRnm').className);
/* The third section is a real tab now: it selects a panel under the bar and takes
   the marker, where it used to open the Bike info overlay over the top and leave
   the marker on the tab you had come from. Four things are asserted together
   because the point is that you have STAYED on this page: the tab lights, its
   panel is the live one, the app bar is still there, and the overlay did not
   open. */
ok('Info selects a third panel and keeps you on the dashboard',
   (()=>{const t = document.getElementById('rnTabInfo');
     if (!t || t.offsetParent === null) return false;
     if (t.textContent.trim() !== 'Info') return false;
     t.click();
     const vitals = document.getElementById('screenVitals');
     return t.classList.contains('is-on')
       && t.getAttribute('aria-selected') === 'true'
       && document.getElementById('rnPanelInfo').offsetParent !== null
       && document.getElementById('rnPanelTasks').hidden
       && document.getElementById('rnBar').offsetParent !== null
       && current === 'rnm'
       && !vitals.classList.contains('is-up');})(),
   document.getElementById('rnTabInfo').className + ' / ' + current);
/* It held an empty panel by brief for a while; it holds the bike's record now.
   The bike is still not drawn behind it — the render belongs to Bike essentials,
   and a page of text over a photograph is neither. */
ok('and the panel carries the record, with no bike behind it',
   document.querySelectorAll('#biStats .bi__stat').length === 3
   && document.querySelectorAll('#biRepairs .rh__row').length === 5
   && document.querySelector('#scrRnm .hero-media').offsetParent === null,
   document.querySelectorAll('#biRepairs .rh__row').length + ' repairs');
/* Every figure on this panel is a DIFFERENCE between two absolute records — the
   odometer today, and the odometer when each visit ended. So the top block's
   "After repair" and the first row's distance are the same subtraction, and the
   two cannot drift: 7,245 - 6,011. */
/* The pack sits BETWEEN the two distances. "After repair" is the same figure the
   first row of the history states, so next to the odometer it read as two
   odometer readings side by side. */
const readings = q => [...document.querySelectorAll(q+' .bi__stat')]
  .map(e=>e.querySelector('.bi__statl').textContent+' '+e.querySelector('.bi__statv').textContent)
  .join(' | ');
ok('the three readings are the odometer, the pack, and the distance since the last repair',
   readings('#biStats')==='Odometer 7,245 kms | Pack ended Today | After repair 1,234 kms',
   readings('#biStats'));
/* And Tasks added carries the same three, from the same array — two panels
   disagreeing about one bike is the failure this rules out. */
ok('Tasks added carries the same block, not a second copy of the numbers',
   readings('#biStatsTasks')===readings('#biStats'),
   readings('#biStatsTasks'));
ok('and the first row states that same distance, because it is the same gap',
   document.querySelector('#biRepairs .rh__when').textContent==='20 days ago'
   && document.querySelector('#biRepairs .rh__kms').textContent==='1,234 kms travelled',
   document.querySelector('#biRepairs .rh__when').textContent+' / '
     +document.querySelector('#biRepairs .rh__kms').textContent);
/* Row two onwards is the gap to the row ABOVE it, not to today — 55 days ago
   minus 20 is 35, and 6,011 minus 4,790 is 1,221. Written as "earlier" so the
   list reads down as a sequence rather than five unrelated dates. */
ok('and the rows below it are gaps between consecutive visits',
   [...document.querySelectorAll('#biRepairs .rh__row')].slice(1, 3)
     .map(r=>r.querySelector('.rh__when').textContent+' '+r.querySelector('.rh__kms').textContent)
     .join(' | ')==='35 days earlier 1,221 kms travelled | 43 days earlier 1,388 kms travelled',
   [...document.querySelectorAll('#biRepairs .rh__row')]
     .map(r=>r.querySelector('.rh__when').textContent).join(' | '));
/* Today / 1 day ago / N days ago — "1 days ago" is the one that gives a
   prototype away. */
ok('the pack reading has all three of its cases',
   RnM.daysAgoText(0)==='Today' && RnM.daysAgoText(1)==='1 day ago'
   && RnM.daysAgoText(9)==='9 days ago',
   [RnM.daysAgoText(0), RnM.daysAgoText(1), RnM.daysAgoText(9)].join(' / '));
/* Readings at the top, history on the FLOOR — the slack sits between the two
   rather than under the last row. Asserted as a gap, because the exact figure
   moves with the frame height. */
ok('the history stands on the floor of the panel, under the slack',
   /* Against the TAB BAR, not the panel's border box: the panel is inset:0 over
      the whole screen and reserves the bar's 88 plus 24 in padding, so its own
      bottom edge is 112 below where the content can reach. */
   (()=>{const bar = document.querySelector('#scrRnm .rntabbar').getBoundingClientRect();
     const last = document.querySelector('#biRepairs .rh__row:last-child').getBoundingClientRect();
     const stats = document.getElementById('biStats').getBoundingClientRect();
     const head = document.querySelector('#rnPanelInfo .bi__rhhead').getBoundingClientRect();
     return Math.round(bar.top - last.bottom)===24 && head.top - stats.bottom > 24;})(),
   Math.round(document.querySelector('#scrRnm .rntabbar').getBoundingClientRect().top
     - document.querySelector('#biRepairs .rh__row:last-child').getBoundingClientRect().bottom)
     + ' above the bar');

/* A level deeper, named by the row that opened it. */
document.querySelector('#biRepairs .rh__row').click();
await new Promise(r=>setTimeout(r,450));
ok('a repair opens a page of its own, carrying the row\u2019s own words',
   current==='visit' && document.getElementById('visitHead').textContent==='20 days ago',
   current+' / '+document.getElementById('visitHead').textContent);
document.getElementById('visitBack').click();
await new Promise(r=>setTimeout(r,450));
ok('and its back returns to the dashboard', current==='rnm', current);
document.getElementById('rnTabInfo').click();
/* The overlay is untouched and still reached from the options sheet, which is
   how a repair gets to it now that this tab is the assessment's only. */
ok('the options sheet still opens the bike info overlay',
   (()=>{const vitals = document.getElementById('screenVitals');
     rnmShowVitals();
     const up = vitals.classList.contains('is-up');
     document.getElementById('btnVitalsBack').click();   /* put it away again */
     return up && !vitals.classList.contains('is-up');})(), 'overlay');
document.getElementById('rnTabTasks').click();
ok('and the mechanic gets neither the third tab nor a missing carousel',
   (()=>{const was = jobKind; jobKind = 'repair'; enterRnm();
     const t = document.getElementById('rnTabInfo').offsetParent === null;
     const px = document.getElementById('btnPxOpen').offsetParent !== null;
     const head = document.getElementById('rnTasksHead').offsetParent !== null;
     const lbl = document.querySelector('#rnTabTasks span').textContent;
     jobKind = was; enterRnm();
     return t && px && head && lbl === 'Tasks done';})(), 'repair shape changed');
ok('its back returns to the assessment task, not a repairable bike',
   (()=>{ YuzenRnM.onBack(); return jobKind==='assessment'; })(), jobKind);
await new Promise(r=>setTimeout(r,450));
ok('which is the job page', current==='job', current);
/* Through the dashboard to the checklist, the way a QCA actually reaches it. */
document.getElementById('jbStart').click();
await new Promise(r=>setTimeout(r,450));
/* onOpenParts, not onOpenChecks: the Active checklist ROW opens the picker now
   — which checklists are running — and the Assessment checklist BUTTON opens the
   parts. They were one destination until the picker existed. */
YuzenRnM.onOpenParts();
await new Promise(r=>setTimeout(r,450));
ok('the dashboard opens the ASSESSMENT checklist, not the servicing one',
   current==='assess', current);
// come back mid-way and the step shows its progress, expanded
PARTS[0].status='good'; PARTS[1].status='faulty';
document.getElementById('assessBack').click();
await new Promise(r=>setTimeout(r,450));
/* Back to the DASHBOARD, which is where this checklist is opened from — both by
   its Assessment checklist button and by its Active checklist row. It used to go
   to the task page, skipping the screen in between. */
ok('checklist back returns to the dashboard', current==='rnm', current);
/* It used to name the sub-task in hand — "Assess bike parts 2/17 done". That is
   off for now, so what is asserted is the absence: the step is its heading and
   nothing else, even mid-way through, which is the state that used to produce a
   line. The mechanism itself is still covered on the token flow, which declares a
   fixed sub-heading — see the page-wide rule further down. */
ok('a step in progress is still a heading and nothing else',
   !document.querySelector('.jb__step .prog'),
   document.querySelector('.jb__step .prog') ? document.querySelector('.jb__step .prog').textContent : 'none');
/* One line, no list underneath, no chevron. It was two — the heading and a
   computed sub-heading — and with that off the active step is a heading alone;
   there has been nothing to expand since the sub-task list came out. */
ok('and carries nothing under it, and no chevron',
   !document.querySelector('.jb__detail') && !document.querySelector('.jb__step .chev')
   && document.querySelectorAll('.jb__step.is-active .body > *').length===1,
   document.querySelectorAll('.jb__step.is-active .body > *').length+' children');
// weighted, so finding a fault never sends the bar backwards
ok('progress is weighted by phase and only rises',
   (()=>{const p1=jobProgress(); PARTS[2].status='faulty'; renderJob();
     const p2=jobProgress(); return p2>=p1 && p1>0 && p2<100;})(),
   jobProgress()+'%');
/* The visible percentage is gone with the slim bar; the figure is on the bar
   itself now, in aria-valuenow and in the fill's width. */
ok('and the bar carries the same figure',
   document.getElementById('jbProg').getAttribute('aria-valuenow')===String(jobProgress())
   && document.querySelector('#jbProg i').style.width===jobProgress()+'%',
   document.getElementById('jbProg').getAttribute('aria-valuenow')+'%');
PARTS[2].status='pending'; renderJob();
ok('the CTA becomes Resume task', document.getElementById('jbStart').textContent.trim()==='Resume task',
   document.getElementById('jbStart').textContent.trim());
PARTS.forEach(p=>p.status='pending');
document.getElementById('jbStart').click();
await new Promise(r=>setTimeout(r,450));
// the Start intro screen is built but no longer on the path — see README
ok('start screen still exists, unrouted', !!document.getElementById('scrStart'), true);
ok('nothing routes to it',
   !/goTo\("start"\)/.test(document.documentElement.innerHTML), 'something still does');
document.querySelector('[data-task="assessment"]').click();
liveRow().click();
document.getElementById('jbStart').click();
await new Promise(r=>setTimeout(r,450));
ok('Start now lands on the dashboard', current==='rnm' && document.getElementById('scrRnm').classList.contains('is-active'), current);
YuzenRnM.onOpenParts();
await new Promise(r=>setTimeout(r,450));
ok('and the checklist is one step behind it',
   current==='assess' && document.getElementById('scrAssess').classList.contains('is-active'), current);
document.getElementById('assessBack').click();
await new Promise(r=>setTimeout(r,450));
document.getElementById('startNow').click();
await new Promise(r=>setTimeout(r,450));

// re-opening a judged part shows the call that was made
ok('fresh card has neither side selected',
   !document.querySelector('.btn-faulty.is-on, .btn-good.is-on'), 'neither');
document.querySelector('.btn-good').click();
await new Promise(r=>setTimeout(r,700));
document.querySelector('.item[data-id="p0"] .row').click();
await new Promise(r=>setTimeout(r,80));
ok('re-opened good part shows Good selected',
   document.querySelector('.btn-good').classList.contains('is-on') && !document.querySelector('.btn-faulty').classList.contains('is-on'),
   document.querySelector('.btn-good').className+' / '+document.querySelector('.btn-faulty').className);
ok('selected side is announced', document.querySelector('.btn-good').getAttribute('aria-pressed')==='true', document.querySelector('.btn-good').getAttribute('aria-pressed'));
/* Faulty no longer commits on its own: the fault sheet asks WHAT is wrong first,
   which is the mechanic's checklist pattern brought over. The card has already
   flown by the time it opens, so the sheet is the only thing on screen naming the
   part — hence the name and the thumbnail in its head. */
document.querySelector('#scrAssess .btn-faulty').click();
await new Promise(r=>setTimeout(r,700));
ok('pressing Faulty opens the fault sheet instead of committing',
   document.getElementById('isSheet').classList.contains('is-open')
   && document.getElementById('isName').textContent===PARTS[0].name
   && PARTS[0].status!=='faulty',
   document.getElementById('isName').textContent+' / '+PARTS[0].status);
/* The part's own reasons, plus Missing appended to every part. */
ok('it offers this part\'s reasons and Missing',
   [...document.querySelectorAll('#isChips .issheet__chip')].map(c=>c.textContent.trim()).join('|')
     === PARTS[0].reasons.concat('Missing').join('|'),
   [...document.querySelectorAll('#isChips .issheet__chip')].map(c=>c.textContent.trim()).join('|'));
ok('and will not take the verdict until one is picked',
   document.getElementById('isConfirm').disabled, 'already enabled');
/* Missing switches rather than locks — a mechanic who taps a reason, then finds
   the part simply gone, must be able to reach Missing without clearing up first.
   And a reason rules Missing back out, symmetrically. */
document.querySelector('#isChips [data-reason="'+PARTS[0].reasons[0]+'"]').click();
ok('picking one enables it', !document.getElementById('isConfirm').disabled, 'still disabled');
document.querySelector('#isChips [data-reason="Missing"]').click();
ok('Missing takes over from every reason',
   [...document.querySelectorAll('#isChips .is-selected')].map(c=>c.textContent.trim()).join('|')==='Missing',
   [...document.querySelectorAll('#isChips .is-selected')].map(c=>c.textContent.trim()).join('|'));
document.querySelector('#isChips [data-reason="'+PARTS[0].reasons[1]+'"]').click();
ok('and a reason takes it straight back off',
   [...document.querySelectorAll('#isChips .is-selected')].map(c=>c.textContent.trim()).join('|')===PARTS[0].reasons[1],
   [...document.querySelectorAll('#isChips .is-selected')].map(c=>c.textContent.trim()).join('|'));
document.getElementById('isConfirm').click();
await new Promise(r=>setTimeout(r,700));
ok('confirming commits the verdict AND the reason together',
   PARTS[0].status==='faulty' && PARTS[0].reasons_selected.join('|')===PARTS[0].reasons[1],
   PARTS[0].status+' / '+JSON.stringify(PARTS[0].reasons_selected));
document.querySelector('#scrAssess .item[data-id="p0"] .row').click();
await new Promise(r=>setTimeout(r,80));
ok('swapping the call swaps the selected side',
   document.querySelector('#scrAssess .btn-faulty').classList.contains('is-on')
   && !document.querySelector('#scrAssess .btn-good').classList.contains('is-on'),
   document.querySelector('#scrAssess .btn-faulty').className);
/* The finding replaces the guidance. The note says what to look at; once a part
   has failed, what was FOUND is the fact about it. Read off the CARD here — p0 is
   the open one after that tap — then again off the row once it is collapsed. */
ok('and the card now reads the fault instead of the note',
   document.querySelector('#scrAssess .card__note').textContent.trim()===PARTS[0].reasons[1],
   document.querySelector('#scrAssess .card__note').textContent.trim());
activeIndex = 1; render();
await new Promise(r=>setTimeout(r,120));
ok('so does its row, once it is a row again',
   document.querySelector('#scrAssess .item[data-id="p0"] .row__note').textContent.trim()
     === PARTS[0].reasons[1],
   document.querySelector('#scrAssess .item[data-id="p0"] .row__note').textContent.trim());
/* And a part still pending shows the guidance, in the grey that says it is
   guidance — the two lines are not the same kind of statement. */
ok('a part not yet judged shows its note, in tertiary',
   document.querySelector('#scrAssess .item[data-id="p2"] .row__note').textContent.trim()===PARTS[2].note
   && !document.querySelector('#scrAssess .item[data-id="p2"] .row__note').classList.contains('is-fault'),
   document.querySelector('#scrAssess .item[data-id="p2"] .row__note').textContent.trim());
/* Settled height, so wait out the open morph — 80ms lands mid-flight, where the
   card is legitimately still growing. */
await new Promise(r=>setTimeout(r,450));
/* 416, up from 392: the card head carries the part's note under its name now, and
   a 16px line plus its 8px gap is exactly the 24. Worth asserting rather than
   loosening — the selected pill must not add to it, which is what this line is
   actually for, and the growth has one cause that can be named. */
ok('card still 416 with a side selected', Math.round(R('.item--expanded').height)===416, R('.item--expanded').height);
/* Hand the bike back as it was found. Marking a part faulty FILES a mechanical
   issue against it now, so a reset that only clears statuses leaves the record
   carrying faults the rest of the suite never created — which is exactly what
   downstream sections measuring the bike's mechanical issues would then count.
   fileAssessmentFault withdraws whatever this block filed; it is a no-op for
   anything it did not. */
PARTS.forEach(p=>p.status='pending');
PARTS.forEach(fileAssessmentFault);
activeIndex=0; render();
/* Put the scroller back to the top explicitly. Opening parts above scrolled it,
   and "at rest" below means at rest — not wherever the last reveal happened to
   leave it. This used to pass without the reset only because the morph's height
   animation shrank scrollHeight mid-flight and the browser clamped scrollTop down
   for us; with that bounce fixed the scroll stays where it was put. */
/* cancelAssessScroll() first, not just scrollTop=0. A reveal from the taps above
   leaves a snap timeout armed for ms+80, and it lands wherever it was told to
   regardless of what set scrollTop in the meantime — which made this assertion
   race the timer and pass or fail on how fast the run was. */
cancelAssessScroll();
document.getElementById('scroll').scrollTop=0;
document.getElementById('scroll').dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));

// screen 1 — the bar names the screen, all the way down
/* The large heading is gone: the tab strip above the list says Assessment and
   the bar carries the breadcrumb, so a title as well was the third place naming
   one screen. What went with it is the hand-off — there is nothing to wait for,
   and a bar that stayed blank until you scrolled would leave the screen unnamed
   at the top, which is where you arrive. */
ok('no large heading on the checklist', !document.querySelector('#scrAssess .listhead h2'),
   'heading still there');
ok('the bar carries the breadcrumb from the top',
   document.getElementById('assessAppbar').classList.contains('is-collapsed')
   && document.querySelector('#assessAppbar .appbar__titles p').textContent.replace(/\s+/g,' ').trim()===BIKE.id+' / Assessment Checklist',
   document.querySelector('#assessAppbar .appbar__titles p').textContent.replace(/\s+/g,' ').trim());
document.getElementById('scroll').scrollTop=300;
document.getElementById('scroll').dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
ok('and keeps it once the list is scrolled', document.getElementById('assessAppbar').classList.contains('is-collapsed'), true);
document.getElementById('scroll').scrollTop=0;
document.getElementById('scroll').dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
ok('and back at the top', document.getElementById('assessAppbar').classList.contains('is-collapsed'), true);
ok('the list keeps its rhythm without it', Math.round(R('.item--collapsed').height)===96, R('.item--collapsed').height);

// screen 1 geometry
ok('s1 collapsed row = 96', Math.round(R('.item--collapsed').height)===96, R('.item--collapsed').height);
ok('s1 expanded item = 416', Math.round(R('.item--expanded').height)===416, R('.item--expanded').height);
ok('no footer until the checklist is finished', !document.getElementById('assessFooter').classList.contains('is-shown'), true);
ok('list runs to the bottom of the frame', Math.round(R('#scroll').bottom)===Math.round(H()), R('#scroll').bottom+' vs '+H());
/* THIS screen's bar. A bare .progress matches the fault record's too, and that
   one is display:none on an assessment — see .iq-no-progress — so the unqualified
   selector measured a hidden element on another page. */
ok('progress bar sits under the app bar', Math.round(R('#scrAssess .progress').top)===Math.round(R('#assessAppbar').bottom), R('#scrAssess .progress').top+' vs '+R('#assessAppbar').bottom);
/* Below the STRIP now, which sits between the bar and the list. */
ok('list starts below the tab strip', Math.round(R('#scroll').top)===Math.round(R('#assessTabs').bottom), R('#scroll').top+' vs '+R('#assessTabs').bottom);
ok('and the strip starts below the progress bar', Math.round(R('#assessTabs').top)===Math.round(R('#scrAssess .progress').bottom), R('#assessTabs').top+' vs '+R('#scrAssess .progress').bottom);
ok('footer holds one button', document.getElementById('assessFooter').querySelectorAll('button').length===1, document.getElementById('assessFooter').querySelectorAll('button').length);
/* "Mark penalty", not "Mark Faults" — the faults are already marked by the time
   this button exists, one per part, with the reason each one failed. What the next
   screen actually asks for is the penalty. */
ok('and it names its destination', document.getElementById('nextBtn').textContent.trim()==='Mark penalty', document.getElementById('nextBtn').textContent.trim());
ok('Add issues is gone from the footer', !document.getElementById('addIssues'), 'absent');

// REPAIR — Repairable bikes, the assessment queue's twin
goTo('home'); await new Promise(r=>setTimeout(r,420));
document.querySelector('[data-task="repairable"]').click();
await new Promise(r=>setTimeout(r,420));
ok('the Repairable bikes card opens its own listing', current==='repair', current);
/* Standardised with the other queues: the same header, the same average, the
   same row. This page used to have a one-line header with no average and rows
   that dropped the battery cell entirely outside Live — three drifts that were
   only possible because it was a separate copy of the screen. */
const MINE = () => ALLOC.filter(b => b.mech === ME);
ok('same header as every other queue: name, count, average, search',
   document.querySelector('#scrQueue .q__title .h').textContent.trim()==='Repair tasks · '+MINE().length
   && /^Avg\. wait time: \d/.test(document.getElementById('qAvg').textContent)
   && !!document.getElementById('qSearch'),
   document.querySelector('#scrQueue .q__title .h').textContent.trim());
/* NO filter row. It carried a Section group — Live / In-flow / Stock, the three
   places a bike physically is — and Sagar took the whole band off: a mechanic
   works down what they have been given, and twelve bikes with their own on top
   is a list you read rather than one you search. The sections survive in the
   data and in the battery rule; see the note in queue-kinds.js. */
/* THE SAME ALLOCATIONS THE SR. MECHANIC MADE. This list was a fixture of its
   own, which meant handing Ramesh a bike on one screen changed nothing on his.
   One set, read by both profiles. */
ok('no filter row, and the list is this mechanic\u2019s own allocations',
   document.getElementById('qFilters').hidden
   && document.querySelectorAll('.qrow').length===MINE().length
   && [...document.querySelectorAll('.qrow')].every(r=>
        MINE().some(b=>b.id===r.dataset.qbike)),
   document.querySelectorAll('.qrow').length+' rows');
ok('no Filters / Sort bar anywhere in the app now',
   !document.querySelector('.qbar') && !document.querySelector('[data-qbar]')
   && Object.values(QUEUE_KINDS).every(k=>!('bar' in k)), 'bar present');
ok('but the scan FAB is', !!document.getElementById('qScanFab'), 'FAB missing');

const rpRows = () => [...document.querySelectorAll('#qList .qrow')];
ok('rows read model and number, like the yard\u2019s own boards',
   rpRows().every(r=>/^(Miracle|Dex GR|Dex NV) . \d{7}$/.test(r.querySelector('.id').textContent.trim())),
   rpRows()[0].querySelector('.id').textContent.trim());
/* No pack reading: every bike here came out of the yard and the number in the
   title identifies it. */
ok('and no pack reading on any of them',
   rpRows().every(r=>!r.querySelector('.pct')), 'a reading is present');
/* THE THREE STATES, said the same way the Sr. Mechanic says them — one builder,
   so the two profiles cannot describe one bike differently. Still to do first,
   then the one in hand, then what is behind them. */
ok('every row carries its state, and they read in work order',
   (()=>{const subs = rpRows().map(r=>r.querySelector('.sub').textContent.trim());
     const rank = s => s.startsWith('Pending') ? 0 : s === 'On-going' ? 1 : 2;
     return subs.every(s=>/^(Pending since|On-going|Finished in)/.test(s))
       && subs.every((s,i)=>i===0||rank(subs[i-1])<=rank(s));})(),
   rpRows().map(r=>r.querySelector('.sub').textContent.trim()).join(' / '));
/* x/y pending on the card, not a bare total: what is LEFT, over the whole day's
   allocation, from the same numbers the listing shows. */
ok('the card counts what is left over what was given',
   document.querySelector('[data-task="repairable"] .n').textContent.trim()
     === MINE().filter(b=>b.state!=='done').length + '/' + MINE().length + ' pending',
   document.querySelector('[data-task="repairable"] .n').textContent.trim());
document.getElementById('qBack').click();
await new Promise(r=>setTimeout(r,420));
ok('back returns to Home', current==='home', current);
/* Picking a repairable bike opens the SAME task page as the assessment queue —
   the other kind of task on one template, not a second copy of it. */
goTo('home'); await new Promise(r=>setTimeout(r,420));
document.querySelector('[data-task="repairable"]').click();
await new Promise(r=>setTimeout(r,420));
/* Nothing to pin any more — this queue has no filter row, so the order is the
   sort's and the mechanic's own bikes are on top. */
/* The row splits the bike across two lines now — model (and charge) on the
   title, number underneath — so the pair is read from both. */
/* The row carries the whole pair on its title now — "Dex GR • 5092925" — where
   it used to split model and number across two lines. */
const rpRow0 = document.querySelectorAll('#qList .qrow')[0];
const rpPicked = rpRow0.querySelector('.id').textContent.trim();
/* ONE BIKE IN HAND AT A TIME. The fixture has one on-going, so tapping a
   waiting bike raises the discard-or-cancel dialog rather than starting it —
   the same rule and the same wording a parked task gets. Asserted here because
   it is the first thing a mechanic will do. */
document.querySelectorAll('#qList .qrow')[0].click();
await new Promise(r=>setTimeout(r,120));
ok('starting a bike while one is on-going asks first',
   document.getElementById('dlg').classList.contains('is-open')
   && /partway through/.test(document.getElementById('dlgBody').textContent)
   && current==='repair',
   current+' / '+document.getElementById('dlgBody').textContent.trim().slice(0,40));
ok('and Cancel leaves everything where it was',
   (()=>{document.getElementById('dlgCancel').click();
     return !document.getElementById('dlg').classList.contains('is-open')
       && current==='repair';})(), current);
/* Discard takes the bike in hand back to waiting and starts the tapped one. */
document.querySelectorAll('#qList .qrow')[0].click();
await new Promise(r=>setTimeout(r,120));
document.getElementById('dlgGo').click();
await new Promise(r=>setTimeout(r,460));
ok('discarding puts the old one back to waiting and starts this one',
   ALLOC.filter(b=>b.mech===ME&&b.state==='live').length===1
   && ALLOC.find(b=>b.mech===ME&&b.state==='live').id===rpRow0.dataset.qbike,
   ALLOC.filter(b=>b.mech===ME&&b.state==='live').map(b=>b.id).join(','));
ok('a repairable bike opens the task page', current==='job' && jobKind==='repair', current+'/'+jobKind);
/* No longer checks for #jbLearn: the Learn pill was removed from this screen, and
   this screen is every task detail page. What the assertion is actually for is that
   the repair kind reuses the SAME template rather than forking it, so it now proves
   that by the hero and both titles alone. */
ok('the title reads Repairable bike, hero and header otherwise unchanged',
   document.querySelector('.jb__title .h').textContent.trim()==='Repairable bike'
   && document.querySelector('.jb__barTitle .h').textContent.trim()==='Repairable bike'
   && !!document.querySelector('.jb__bike'),
   document.querySelector('.jb__title .h').textContent.trim());
/* The subtitle is model-then-number where the row is number-then-model, so
   compare the pair rather than the string. */
ok('the bike picked follows through to the subtitle',
   (()=>{const sub=document.querySelector('.jb__title .s').textContent.replace(/\s+/g,' ').trim();
     const [model, id] = rpPicked.split(' • ');
     return sub === `${model} • ${id}`;})(),
   document.querySelector('.jb__title .s').textContent.replace(/\s+/g,' ').trim()+' from '+rpPicked);
ok('the stepper is the four repair steps',
   [...document.querySelectorAll('.jb__step .lbl')].map(x=>x.textContent.trim()).join('|')
     === '1. Feedback|2. RnM Dashboard|3. Part exchange summary|4. Park in repaired bikes',
   [...document.querySelectorAll('.jb__step .lbl')].map(x=>x.textContent.trim()).join('|'));
/* THE SLIDE SAYS START TASK, whatever the first step is called. It is the one
   press that commits a mechanic to a bike, and that is the same press on both
   kinds — the repair's first step opens Feedbacks and the assessment's opens a
   dashboard, and neither is what the gesture means. The step's own name comes
   back the moment the task is in hand; see the next assertion. */
ok('the slide says Start task, not the first step\u2019s name',
   document.getElementById('jbStart').textContent.trim()==='Start task'
   && document.getElementById('jbStart').classList.contains('jb__slide'),
   document.getElementById('jbStart').textContent.trim());
/* And once it is in hand the button names the step again — including the first
   one, which says View Feedbacks the moment it is no longer the slide. */
ok('RnM names its own too, and the rest fall back to their label',
   (()=>{jobAt=1; renderJob(); const a=document.getElementById('jbStart').textContent.trim();
     jobAt=3; renderJob(); const b=document.getElementById('jbStart').textContent.trim();
     jobAt=0; renderJob(); return a==='Start RnM' && b==='Park in repaired bikes';})(),
   (()=>{jobAt=1; renderJob(); const a=document.getElementById('jbStart').textContent.trim();
     jobAt=0; renderJob(); return a;})());
ok('four steps share the bar equally, 25 each',
   (()=>{const seen=[]; for(let i=0;i<=4;i++){jobAt=i; seen.push(jobProgress());}
     jobAt=0; renderJob(); return seen.join(',')==='0,25,50,75,100';})(),
   'uneven');
/* The assessment step's sub-heading is assessment-only — it reads PARTS, which
   says nothing about a repair. */
ok('no assessment sub-heading leaks onto the repair steps',
   !document.querySelector('.jb__step .prog'), 'sub-heading present');
/* Feedbacks — Figma 1993:30144. The Feedback step opens it, Start Repair closes the step
   out, and the step stays reachable afterwards. */
document.getElementById('jbStart').click();
await new Promise(r=>setTimeout(r,460));
ok('View Feedbacks opens the Feedbacks page', current==='feedback', current);
ok('it carries both sections and the recording',
   document.querySelector('#scrFeedback h2').textContent.trim()==='User-reported issues'
   && [...document.querySelectorAll('#scrFeedback h2')].map(h=>h.textContent.trim()).join('|')
        === 'User-reported issues|Captain-reported issues'
   && !!document.getElementById('fbPlay') && document.querySelectorAll('#fbWave i').length > 20
   && document.querySelectorAll('#scrFeedback .fblist li').length===2,
   [...document.querySelectorAll('#scrFeedback h2')].map(h=>h.textContent.trim()).join('|'));
/* The quote is three <li> now, not one <p> — it was a paragraph and a mechanic
   had to read prose to count how many things were wrong. Same three emphases,
   same two colours; what changed is that each complaint is its own line. The old
   selector returned null and threw, which took the whole run down at 113. */
ok('the phrases a mechanic acts on are emphasised, the rest secondary',
   (()=>{const items=[...document.querySelectorAll('.fbquote__list li')];
     const st=items[0].querySelector('strong');
     return items.length===3
       && document.querySelectorAll('.fbquote__list strong').length===3
       && getComputedStyle(items[0]).color==='rgb(113, 113, 113)'
       && getComputedStyle(st).color==='rgb(34, 34, 34)';})(),
   document.querySelectorAll('.fbquote__list li').length + ' points');
document.getElementById('fbOkay').click();
await new Promise(r=>setTimeout(r,460));
ok('Start Repair goes straight to the dashboard, Feedback done',
   current==='rnm' && jobAt===1, current+'/'+jobAt);
ok('and the button says so', document.querySelector('#fbOkay span').textContent==='Start Repair',
   document.querySelector('#fbOkay span').textContent);
/* Everything with a home on the screen itself is off this sheet. `report` because
   Add Issues is a button in the footer; `commands` because it is a tab in the bar
   at the foot of the screen, so a row for it is a second door to one room; and
   `feedbacks` because what the customer said is read before the work starts, not
   from the dashboard you are working on. What is left is what you do TO the
   repair, plus the generic pair. */
/* Read through a resolver, because the dashboard's list is a function of which
   flow is standing in it — see SHEET_FOR in sheet-config.js. */
const sheetFor = n => { const v = SHEET_FOR[n];
                        return (typeof v === 'function' ? v() : v) || []; };
ok('the dashboard \u22ee offers neither Bike commands, Feedbacks nor Report issues',
   (()=>{const was = rnmKind; rnmKind = 'repair';
     const l = sheetFor('rnm'); rnmKind = was;
     return !l.includes('commands') && !l.includes('feedbacks')
         && !l.includes('report') && l.includes('parts');})(),
   sheetFor('rnm').join('/'));
/* The sheet is one component fed by one config file. Every key a screen names
   has to exist in the catalogue, or the row renders as `undefined` at open time
   — which is the failure mode a per-screen list invites, so it is asserted. */
ok('every screen\'s option list resolves against the catalogue',
   (()=>{const was = rnmKind;
     /* Both shapes of the computed list, or half of it goes unchecked. */
     const keys = ['assessment','repair'].flatMap(k => {
       rnmKind = k; return Object.keys(SHEET_FOR).flatMap(sheetFor);
     });
     rnmKind = was;
     return keys.every(k => SHEET_ITEMS[k]);})(),
   Object.keys(SHEET_FOR).flatMap(sheetFor).filter(k => !SHEET_ITEMS[k]).join(',') || 'all resolve');
/* Every \u22ee is bound once, by shared/sheet.js, via data-opt-more. The job page
   kept a per-screen listener from before the sheet moved into shared chrome, so
   pressing it opened the sheet AND toasted "not wired yet". Press all of them and
   assert the sheet opens and nothing is claimed to be missing. */
for (const b of document.querySelectorAll('[data-opt-more]')){
  /* Clear the text, not just the class — the toast node keeps its last message
     long after it has faded, and an earlier test's words would read as this
     one's. */
  const tEl=document.getElementById('toast'); if(tEl) tEl.textContent='';
  b.click();
  await new Promise(r=>setTimeout(r,60));
  const t=document.getElementById('toast');
  ok(`\u22ee on ${b.closest('section').id} opens the sheet and says nothing`,
     optSheet.classList.contains('is-open') && !/not wired/.test(t?.textContent||''),
     (optSheet.classList.contains('is-open')?'open':'shut')+' / '+(t?.textContent||'silent'));
  setOptSheet(false);
  await new Promise(r=>setTimeout(r,60));
}
/* Save the flow's place: the block below drives the template through every kind
   to inspect it, and the tests after this one carry on from the repair task they
   were in the middle of. */
const __keep = {kind: jobKind, tab: jobTab, at: jobAt};
/* ── One template, four kinds ────────────────────────────────────────────────
   The token detail page was a second copy of this whole screen — collapse,
   docked strip, measured tail, stepper — and a copy is the thing that drifts.
   It is a kind now. These assert the template stays generic: every kind that
   exists renders through it, and the optional parts appear only where declared. */
ok('every task kind renders on the one template',
   Object.keys(TASK_KINDS).every(k => {
     jobKind = k; jobTab = TASK_KINDS[k].tabs ? TASK_KINDS[k].tabs[0].id : null;
     jobAt = 0; renderJob();
     return document.querySelectorAll('#jbSteps .jb__step').length
            || document.querySelector('#jbSteps .jb__empty');
   }), Object.keys(TASK_KINDS).join('/'));
ok('tabs appear only for kinds that declare them',
   Object.keys(TASK_KINDS).every(k => {
     jobKind = k; jobTab = TASK_KINDS[k].tabs ? TASK_KINDS[k].tabs[0].id : null;
     jobAt = 0; renderJob();
     return document.getElementById('jbTabsWrap').hidden === !TASK_KINDS[k].tabs;
   }), 'tabs match config');
/* The progress strip left the second header for the footer, where it stays put
   instead of scrolling away with the title. */
ok('progress rides the footer edge and still reports its value',
   (()=>{const p=document.getElementById('jbProg'),
           f=document.querySelector('#scrJob .ffooter');
     return f.contains(p) && !document.querySelector('#scrJob .jb__progPct')
         && p.getAttribute('aria-valuenow') === String(jobProgress());})(),
   document.getElementById('jbProg').getAttribute('aria-valuenow')+'%');
ok('and nothing is left docked under the header',
   !document.getElementById('jbDock'), 'dock removed');
/* Sub-heading on the active step and nowhere else, and finished steps stay
   reopenable — both are page-wide rules, so they are asserted on the kind that
   has one of each rather than on all four. */
jobKind = 'token'; jobTab = 'service'; jobAt = 2; renderJob();
ok('a sub-heading shows on the active step only',
   document.querySelectorAll('#jbSteps .jb__step .prog').length === 1
   && !!document.querySelector('#jbSteps .is-active .prog'),
   document.querySelectorAll('#jbSteps .jb__step .prog').length + ' shown');
ok('finished steps stay reopenable, upcoming ones do not',
   [...document.querySelectorAll('#jbSteps .is-done')].every(b => !b.disabled),
   'done are live');
jobKind = 'token'; jobTab = 'puncture'; jobAt = 0; renderJob();
ok('a tab with no steps says so rather than showing an empty list',
   !!document.querySelector('#jbSteps .jb__empty')
   && document.getElementById('jbStart').disabled,
   document.querySelector('#jbSteps .jb__empty')?.textContent);
jobKind = __keep.kind; jobTab = __keep.tab; jobAt = __keep.at; renderJob();

/* ── Morph ───────────────────────────────────────────────────────────────────
   The ghost is decoration, so what is asserted is that it never owns state: the
   navigation and the parked card are correct the instant minimise is called,
   before anything has had a chance to animate. */
/* Same save/restore as the template block: the tests after this one are partway
   through a repair task and this drives an assessment through minimise. */
const __m = {kind: jobKind, tab: jobTab, at: jobAt, screen: current};
jobKind = 'assessment'; jobAt = 1; goTo('job');
await new Promise(r=>setTimeout(r,60));
const __bike = BIKE.id;
minimiseTask();
ok('minimise parks and navigates immediately, not on landing',
   current === 'task' && !!minimised.assessment
   && !!document.querySelector('[data-resume="assessment"]'),
   current + ' / ' + (minimised.assessment ? 'parked' : 'lost'));
ok('a ghost flies from the title to the card',
   (()=>{const g = document.querySelector('.morph');
     return !!g && g.textContent.includes(__bike);})(),
   document.querySelector('.morph')?.textContent || 'none');
/* The card is held invisible only while something is flying to it. If the ghost
   were ever lost mid-flight the card would be stranded at opacity 0 — hence the
   setTimeout guarantee in morph.js, asserted here by waiting it out. */
await new Promise(r=>setTimeout(r,TASKMORPH_MS + 160));
ok('and both are cleaned up once it lands',
   !document.querySelector('.morph')
   && !document.querySelector('.minitask__card.is-arriving'),
   'ghost gone, card shown');
document.querySelector('[data-resume="assessment"]').click();
ok('resuming reopens the task at once and flies the other way',
   current === 'job' && !minimised.assessment,
   current + ' / ' + (minimised.assessment ? 'still parked' : 'cleared'));
await new Promise(r=>setTimeout(r,TASKMORPH_MS + 160));
minimised.assessment = null; renderMinis();
jobKind = __m.kind; jobTab = __m.tab; jobAt = __m.at; renderJob(); goTo(__m.screen);
await new Promise(r=>setTimeout(r,60));

/* The Customer photos pill rests beside the page title and flies into the app
   bar on scroll. Asserted by the transform it is given, not by its rect: the
   flight is a transition, and a rect read mid-flight is whatever frame it is on. */
/* Needs a faulty part: with none, the page shows its empty state, the scroller is
   display:none and the title block has no height to measure against — in which
   case the pill correctly stays in the bar. */
/* Three, not one: the page has to be taller than the frame or scrollTop clamps
   to 0 and it never reaches the collapse threshold. */
PARTS[0].status='faulty'; PARTS[1].status='faulty'; PARTS[2].status='faulty';
goTo('home'); await new Promise(r=>setTimeout(r,120));
goTo('faults'); await new Promise(r=>setTimeout(r,180));
/* This pair used to follow the Customer photos pill down onto the title's line
   and back up into the bar. The pill is gone, and what is left of that idea is
   the state it flew into: the photographs are open when the screen arrives, so
   the title has already given up its space and the breadcrumb is already in the
   bar. That is now the resting look, and it is what is asserted. */
ok('the screen rests scrolled, because the photographs are already open',
   faultsAppbar.classList.contains('is-collapsed')
   && document.getElementById('scrFaults').classList.contains('photos-open')
   && !document.querySelector('#faultsAppbar .pill-btn'),
   faultsAppbar.className);
/* Nothing left in the bar but the ⋮ — the pill was the only other action, and a
   stray listener or an orphaned rule would show up here as a second button. */
ok('and the only action left in that bar is the \u22ee',
   [...document.querySelectorAll('#faultsAppbar button')]
     .map(b=>b.id).join(',') === 'faultsBack,faultsMore',
   [...document.querySelectorAll('#faultsAppbar button')].map(b=>b.id).join(','));
PARTS[0].status='pending'; PARTS[1].status='pending'; PARTS[2].status='pending'; renderFaults();

/* A queue with FILTERS gets the row, because the filter button lives in it — one
   with no quick chips still needs the way into its groups, and QC pending is that
   case: both quick chips ask about a pack that has been taken out of the bike.

   A queue with no filters at all does not get the row. Assessment done is that
   one: its split is the two accordions, and a 72px band holding a single button
   that opens an empty sheet is worse than no band. */
ok('a queue gets the filter row when it has filters, and not when it has none',
   Object.keys(QUEUE_KINDS).every(k => {
     queueKind = k; renderQueue();
     const groups = QUEUE_KINDS[k].filters || [];
     const quick = groups.find(g=>g.quick);
     return document.getElementById('qFilters').hidden === (groups.length === 0)
         /* +1 for All, which every quick group now leads with. */
         && document.querySelectorAll('#qQuick .qquickchip').length
              === (quick ? quick.chips.length + 1 : 0);
   }),
   Object.keys(QUEUE_KINDS).map(k => {
     const q=(QUEUE_KINDS[k].filters||[]).find(g=>g.quick);
     return k+':'+(q?q.chips.length:0);}).join(' '));
queueKind = 'qc'; renderQueue();
ok('QC pending shows the button alone, and its group is still reachable',
   document.querySelectorAll('#qQuick .qquickchip').length===0
   && !!document.getElementById('qFilterBtn')
   && QUEUE_KINDS.qc.filters.length===1,
   document.querySelectorAll('#qQuick .qquickchip').length+' quick chips');
/* Bike type is declared once and is the SAME object on all three queues — a
   second copy is how the chips and the fleet drift apart. Issue type was the
   other shared one and is gone; nothing on any queue names it now. */
/* Only two queues still offer it: the mechanic's lost its whole filter row and
   the two boards below never had one. */
ok('the shared group is shared, not copied',
   QUEUE_KINDS.task.filters[1]===QUEUE_KINDS.qc.filters[0],
   'copied');
ok('and no queue offers Issue type any more',
   Object.values(QUEUE_KINDS).every(k => !k.filters.some(g => g.id==='issue')),
   Object.values(QUEUE_KINDS).map(k=>k.filters.map(g=>g.id).join('+')).join(' / '));
queueKind = 'task'; renderQueue();

/* ── Screen transition ───────────────────────────────────────────────────────
   One thing moves. Assert the resting states, not the animation: the page you
   left never gets a transform, and the page you leave is the one that slides. */
goTo('home'); await new Promise(r=>setTimeout(r,700));
jobKind='repair'; goTo('repair'); await new Promise(r=>setTimeout(r,700));
goTo('job'); await new Promise(r=>setTimeout(r,700));
const _cs = id => getComputedStyle(document.getElementById(id));
ok('going in, the page behind does not move',
   document.getElementById('scrQueue').dataset.pos==='left' && _cs('scrQueue').zIndex==='0',
   document.getElementById('scrQueue').dataset.pos+' z'+_cs('scrQueue').zIndex);
goTo('feedback'); await new Promise(r=>setTimeout(r,700));
/* The task page is one element under two route names. Split across ORDER, the
   later alias won and parked it off-frame the moment it opened anything.

   Asserted on data-pos and the z-layer rather than the computed transform: the
   transform is mid-transition for 340ms and the headless run's virtual clock does
   not reliably tick the compositor for an off-screen element, which made a
   transform reading flaky. data-pos IS the contract — the transform is only what
   the stylesheet does with it, and the rule is asserted once, below. */
ok('and that holds for a screen with an alias',
   document.getElementById('scrJob').dataset.pos==='left' && _cs('scrJob').zIndex==='0',
   document.getElementById('scrJob').dataset.pos+' z'+_cs('scrJob').zIndex);
goTo('job'); await new Promise(r=>setTimeout(r,700));
ok('coming back, the page you leave slides off and the destination is just there',
   document.getElementById('scrFeedback').dataset.pos==='right'
   && _cs('scrFeedback').zIndex==='2'
   && document.getElementById('scrJob').dataset.pos==='in'
   && _cs('scrJob').zIndex==='1',
   document.getElementById('scrFeedback').dataset.pos+' over active');
/* The stylesheet half of the contract, read from the rules rather than from a
   live element, so it cannot be defeated by animation timing. */
const _rules = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules] } catch(e){ return [] } })
  .filter(r => r.selectorText && r.selectorText.includes('data-pos'));
const _ruleFor = pos => (_rules.find(r => r.selectorText.includes('"'+pos+'"')) || {style:{}}).style;
ok('behind is parked at rest, ahead is parked off-frame right',
   _ruleFor('left').transform==='none' && _ruleFor('right').transform==='translateX(100%)',
   _ruleFor('left').transform+' / '+_ruleFor('right').transform);
ok('and nothing fades — a fade is movement to the eye',
   _cs('scrFeedback').opacity==='1' && _cs('scrQueue').opacity==='1',
   _cs('scrFeedback').opacity+'/'+_cs('scrQueue').opacity);

/* ── RnM dashboard — Figma 2470:40192 / 2470:40826 ──────────────────────────
   The tab strip is gone. The commands are inline on the dashboard, the task list
   is a sheet the footer raises, and part exchange is its own overlay off the ⋮. */
jobKind='repair'; goTo('rnm'); await new Promise(r=>setTimeout(r,700));
const _rnm = document.getElementById('scrRnm');
/* The bottom tabs replace the sheet. Open tasks is the resting tab — the checklist
   and the two issue lists are what a mechanic came here to work through — and the
   bike's readings and controls are the other. */
ok('the dashboard rests on the Tasks done tab',
   document.getElementById('rnTabTasks').classList.contains('is-on')
   && document.getElementById('rnPanelTasks').hidden === false
   && document.getElementById('rnPanelBike').hidden === true,
   document.getElementById('rnTabTasks').className);
ok('and the heading carries the whole-repair tally the progress band used to draw',
   /^Tasks done \u00b7 \d+\/\d+$/.test(document.getElementById('rnTasksHead').textContent),
   document.getElementById('rnTasksHead').textContent);
ok('and the command grid is on the other tab, not gone',
   !!document.getElementById('btnPower'), 'btnPower missing');
ok('and the sheet it replaced is gone, grabber and all',
   !document.getElementById('rnTaskSheet') && !document.getElementById('rnTaskGrab')
   && !document.getElementById('rnFoot') && !document.getElementById('repairBar'),
   'no sheet');
ok('and the strip before it is gone too, panels and all',
   !document.querySelector('#scrRnm .rntab') && !document.getElementById('panelTasks')
   && !document.getElementById('panelCommands') && !document.getElementById('panelParts'),
   'no rntabs');
ok('and the ⋮ no longer offers a version switch',
   !document.querySelector('#optList [data-opt="variant"]')
   && typeof SHEET_ITEMS.variant === 'undefined', 'clean');
/* The hero is a carousel: the bike, and a part-exchange summary whose counts come
   from the same table the overlay lists. */
ok('the hero carousel rests on the bike slide',
   !_rnm.classList.contains('is-car2')
   && document.querySelector('#rnCarDots i').classList.contains('is-on'),
   _rnm.className);
document.querySelectorAll('#rnCarDots i')[1].click();
await new Promise(r=>setTimeout(r,420));
/* The card carries no counts any more — they said what the screen behind it says
   better. So the assertion is that the slide turned and the card is still the
   pressable thing that opens Part exchange. */
ok('and the second dot turns to the part-exchange summary',
   _rnm.classList.contains('is-car2')
   && !!document.getElementById('btnPxOpen')
   && !document.querySelector('#scrRnm .pxcard__counts'),
   _rnm.className);
document.querySelectorAll('#rnCarDots i')[0].click();
await new Promise(r=>setTimeout(r,420));
/* Switching tabs swaps the panel and moves the marker. */
document.getElementById('rnTabBike').click();
await new Promise(r=>setTimeout(r,420));
ok('the Bike essentials tab swaps the panel and takes the marker',
   document.getElementById('rnPanelBike').hidden === false
   && document.getElementById('rnPanelTasks').hidden === true
   && parseFloat(getComputedStyle(document.getElementById('rnTabInk')).width) > 0,
   getComputedStyle(document.getElementById('rnTabInk')).width);
document.getElementById('rnTabTasks').click();
await new Promise(r=>setTimeout(r,420));
/* Part exchange left the strip for an overlay, and the ⋮ is how you reach it. */
rnmShowParts();
await new Promise(r=>setTimeout(r,420));
/* Received is what is in hand, and at load that is the MCU alone: both mechanical
   issues are still waiting on a spare, so their parts sit under Get spare at 40%
   until one is fetched. The faint flag is the assertion that matters, and it does
   NOT mean the same thing on both tabs: on New it is a part that has not arrived,
   on Old it is one already handed back. What the two share is that the mechanic
   has nothing left to do about that row. */
ok('the ⋮ opens Part exchange as its own overlay, with each band on the right side',
   document.getElementById('screenParts').classList.contains('is-up')
   /* Every band is derived from the issues, and at load nothing has been fetched
      or handed back — so three of the four are EMPTY and only Get spare lists
      anything: the two mechanical issues, at 40%. This is the assertion that
      would have caught the seed table, which claimed a returned front wheel the
      issue sheet said was still on the bike, and two received parts when no
      spare had been fetched at all. Faint means exactly one thing here — not in
      hand yet — so nothing outside Get spare carries it. */
   && document.querySelectorAll('#pxHold .prow').length === 0
   && document.querySelectorAll('#pxRet .prow').length === 0
   && document.querySelectorAll('#pxRecv .prow').length === 0
   && document.querySelectorAll('#pxPend .prow--faint').length === 2
   /* Return pending is the one band that states its emptiness rather than just
      being blank — see paintParts. So exactly one, and it is inside pxHold. */
   && document.querySelectorAll('#scrRnm .pxempty').length === 1
   && document.querySelectorAll('#pxHold .pxempty').length === 1,
   document.querySelectorAll('#pxHold .prow').length+' pending, '
   +document.querySelectorAll('#pxRecv .prow').length+' received, '
   +document.querySelectorAll('#pxPend .prow--faint').length+' awaited');
/* The two states of this screen, and the reason there is no flag for them. A
   spare in hand with no outcome yet cannot know which physical part stores gets,
   so the row offers both; an outcome resolves it to one word. */
ok('a pending part with no outcome yet names both, and one word once decided',
   (()=>{ const sub = s => [...document.querySelectorAll('#pxHold .prow')]
            .map(r => (r.querySelector('.prow__serial')||{}).textContent);
     return sub().every(t => t === 'Faulty' || t === 'Good part'
                          || t === 'Faulty / Good part'); })(),
   [...document.querySelectorAll('#pxHold .prow__serial')].map(e=>e.textContent).join('|'));
document.getElementById('btnPartsBack').click();
await new Promise(r=>setTimeout(r,420));
/* Three rows are off this sheet, all for the same reason — each points at
   something already on the screen. Report issues (Add Issues is in the footer),
   Bike commands (it is a tab in the bar at the foot), and Feedbacks (read before
   the work starts, not from the dashboard mid-repair). */
document.getElementById('btnMore').click();
await new Promise(r=>setTimeout(r,220));
const _rnmOpts = [...document.querySelectorAll('#optList [data-opt]')].map(b=>b.dataset.opt);
document.getElementById('optScrim').click();
await new Promise(r=>setTimeout(r,220));
ok('the dashboard ⋮ offers only what has no home on the screen',
   /* Membership, not the exact run: the order below the first row is a decision
      that gets revisited, and pinning the whole string turned every reshuffle
      into a failure that read like a break. What matters is which rows are
      absent, because each one was removed for pointing at something the screen
      already shows. */
   !['report','commands','feedbacks'].some(k=>_rnmOpts.includes(k))
   /* The sign-off row is finish OR partial, never both: Finish repair claims
      the bike is done and only shows once every issue is closed. */
   && ['parts','minimise'].every(k=>_rnmOpts.includes(k))
   && _rnmOpts.includes(issuesAllResolved() ? 'finish' : 'partial')
   && !_rnmOpts.includes(issuesAllResolved() ? 'partial' : 'finish'),
   _rnmOpts.join('|'));
/* rnmShowCommands survived the row's removal — the Bike commands TAB calls it.
   Called directly, because there is no longer a ⋮ row to tap for it. */
rnmShowCommands();
ok('and choosing it selects the Bike essentials tab',
   document.getElementById('rnPanelBike').hidden === false
   && document.getElementById('rnTabBike').classList.contains('is-on'),
   document.getElementById('rnTabBike').className);
document.getElementById('rnTabTasks').click();
ok('and the tab puts the task list back',
   document.getElementById('rnPanelTasks').hidden === false,
   document.getElementById('rnPanelTasks').hidden);
/* The rows still work with the sheet shut — the test taps them directly, which is
   what the sheet does when it is up. */
/* The rows are views of the screens that own the records, split the way the
   issues screen already splits itself. */
const _mech = issuesTallyBy('Mechanical'), _elec = issuesTallyBy('Electrical');
ok('the three rows read from the screens that own the records',
   document.getElementById('countMech').textContent === _mech.done+'/'+_mech.total
   && document.getElementById('countElec').textContent === _elec.done+'/'+_elec.total
   && _mech.total + _elec.total === issuesTally().total,
   document.getElementById('countMech').textContent+' + '+document.getElementById('countElec').textContent);
/* On a REPAIR the dashboard rows are the section switch — that flow keeps two
   rows and the screen shows no strip, so the row you tap has to decide what it
   renders. */
document.getElementById('rowElec').click();
await new Promise(r=>setTimeout(r,700));
const _rows = () => document.querySelectorAll('#iqList .iq-row, #iqList > *').length;
ok('the Electrical row lands on the electrical list, not the last one looked at',
   current==='issues' && _rows() === _elec.total, current+' / '+_rows()+' rows');
ok('and the strip stays down on a repair, so there is no second switch',
   document.getElementById('iqTabs').hidden, 'strip is up');
/* And the action goes back where a repair keeps it, with the heading and the
   marks it never lost. */
ok('the repair keeps its action in the footer, its heading and its marks',
   document.getElementById('iqMarkBtn').closest('#iqFooter')
   && !document.getElementById('iqHead').hidden
   /* Whichever section this block happens to be standing in — what matters is
      that a repair still counts done-over-total, not which half it is on. */
   && /^(Mechanical|Electrical) issues \d+\/\d+$/.test(document.getElementById('iqHeadTitle').textContent),
   document.getElementById('iqHeadTitle').textContent);
goTo('rnm'); await new Promise(r=>setTimeout(r,700));
document.getElementById('rowMech').click();
await new Promise(r=>setTimeout(r,700));
ok('and the Mechanical row lands on the mechanical list',
   current==='issues' && _rows() === _mech.total, _rows()+' rows');
goTo('rnm'); await new Promise(r=>setTimeout(r,700));

ok('and the sheet is titled', document.querySelector('#optSheet .sheet__title').textContent==='More options',
   document.querySelector('#optSheet .sheet__title').textContent);
/* Back out of the dashboard to see the task page's own state. Start Repair skips
   it on the way in, so it is only repainted when the mechanic actually returns. */
goTo('job');
await new Promise(r=>setTimeout(r,460));
ok('and the CTA becomes Start RnM',
   document.getElementById('jbStart').textContent.trim()==='Start RnM',
   document.getElementById('jbStart').textContent.trim());
ok('Feedback is ticked but still tappable — the feedback stays readable',
   (()=>{const st=document.querySelectorAll('.jb__step')[0];
     return st.classList.contains('is-done') && !st.disabled;})(),
   'disabled after completion');
document.querySelectorAll('.jb__step')[0].click();
await new Promise(r=>setTimeout(r,460));
ok('   …and reopens it', current==='feedback', current);
document.getElementById('fbBack').click();
await new Promise(r=>setTimeout(r,460));
ok('back leaves the step where it was', current==='job' && jobAt===1, current+'/'+jobAt);
ok('the later steps stay locked', [...document.querySelectorAll('.jb__step')].slice(2).every(b=>b.disabled),
   'a later step is tappable');
jobAt = 0; renderJob();

ok('× returns to the repairable list, not the assessment queue',
   (()=>{document.getElementById('jbClose').click(); return true;})(), 'ok');
await new Promise(r=>setTimeout(r,460));
ok('   …confirmed', current==='repair', current);

/* Back through the assessment queue, and the same page becomes the other kind. */
goTo('task'); await new Promise(r=>setTimeout(r,420));
liveRow().click();
await new Promise(r=>setTimeout(r,460));
ok('the assessment queue still opens the assessment kind',
   jobKind==='assessment'
   && document.querySelector('.jb__title .h').textContent.trim()==='Assessment & fault marking'
   && [...document.querySelectorAll('.jb__step .lbl')].map(x=>x.textContent.trim()).join('|')
        === '1. Assessment dashboard|2. Remove battery mapping|3. Drop in Repairable bike area',
   jobKind+' / '+document.querySelector('.jb__title .h').textContent.trim());

/* Hand the run back to the checklist: what follows tests the sheet there, and the
   sheet is built per screen. */
goTo('assess'); await new Promise(r=>setTimeout(r,420));

// MINIMISE — park a task on its own listing and pick it up again
const mini = () => document.querySelector('#qMini .minitask__card');
const rmini = () => document.querySelector('#qMini .minitask__card');
goTo('home'); await new Promise(r=>setTimeout(r,420));
document.querySelector('[data-task="assessment"]').click();
await new Promise(r=>setTimeout(r,420));
const firstBike = liveRow().dataset.qbike;
liveRow().click();
await new Promise(r=>setTimeout(r,460));
jobAt = 1; renderJob();
document.getElementById('jbMore').click();
await new Promise(r=>setTimeout(r,80));
document.querySelector('[data-opt="minimise"]').click();
await new Promise(r=>setTimeout(r,700));
ok('Minimize parks the task and returns to its own listing', current==='task', current);
ok('the parked card carries the bike and the step it was left on',
   !!mini() && mini().textContent.includes(firstBike) && mini().textContent.includes('Remove battery'),
   mini() ? mini().textContent.replace(/\s+/g,' ').trim() : 'no card');
/* One dock slot on one template, so "does it leak" is now a question about the
   QUEUE's own config rather than about two separate slots: the repairable list
   declares `mini: "repair"`, so a parked assessment cannot surface on it. */
ok('a parked task belongs to one list — by the queue it docks on',
   QUEUE_KINDS.task.mini==='assessment' && QUEUE_KINDS.repair.mini==='repair'
   && QUEUE_KINDS.qc.mini===null,
   [QUEUE_KINDS.task.mini, QUEUE_KINDS.repair.mini, QUEUE_KINDS.qc.mini].join('/'));
ok('the list gives up the height the card takes',
   document.getElementById('scrQueue').classList.contains('has-mini'), 'no clearance');

/* Tapping another bike must ask first. Named rather than indexed: the board
   pins bikes on charge above the work, so [3] stopped meaning "a different
   bike" — it can now land on the parked one, which reopens without asking. */
otherLiveRow().click();
await new Promise(r=>setTimeout(r,220));
ok('starting another task asks before discarding',
   document.getElementById('dlg').classList.contains('is-open') && current==='task',
   current);
ok('and names the task at risk rather than saying "your previous task"',
   document.getElementById('dlgBody').textContent.includes(firstBike),
   document.getElementById('dlgBody').textContent);
document.getElementById('dlgCancel').click();
await new Promise(r=>setTimeout(r,220));
ok('Cancel keeps the parked task and goes nowhere',
   !document.getElementById('dlg').classList.contains('is-open') && !!mini() && current==='task',
   current);

/* Reopening the parked bike is a resume, not a new task — so it must not ask. */
document.querySelector(`.qrow[data-qbike="${firstBike}"]`).click();
await new Promise(r=>setTimeout(r,520));
ok('reopening the parked bike resumes without asking',
   current==='job' && jobAt===1 && BIKE.id===firstBike
   && !document.getElementById('dlg').classList.contains('is-open'),
   current+'/'+jobAt+'/'+BIKE.id);
ok('and the card is gone once resumed', document.getElementById('qMini').hidden, 'still parked');

/* Discarding: park again, then take a different bike. */
document.getElementById('jbMore').click();
await new Promise(r=>setTimeout(r,80));
document.querySelector('[data-opt="minimise"]').click();
await new Promise(r=>setTimeout(r,700));
/* Named, not indexed — see the note on workRows. [3] used to be "some other
   bike" and became the parked one once the stack took the first two places,
   which reopens instead of asking and starts at the step it was left on. */
const otherRowEl = otherLiveRow();
const otherBike = otherRowEl.dataset.qbike;
otherRowEl.click();
await new Promise(r=>setTimeout(r,220));
document.getElementById('dlgGo').click();
await new Promise(r=>setTimeout(r,520));
ok('Discard and start new opens the bike tapped, from step one',
   current==='job' && BIKE.id===otherBike && jobAt===0, current+'/'+BIKE.id+'/'+jobAt);
ok('and the parked task is gone', minimised.assessment===null, 'still parked');

/* Minimising from mid-flow must come back to mid-flow, not to the task page.
   The ⋮ is on the checklist and Mark penalties as well. */
goTo('home'); await new Promise(r=>setTimeout(r,420));
document.querySelector('[data-task="assessment"]').click(); await new Promise(r=>setTimeout(r,420));
liveRow().click(); await new Promise(r=>setTimeout(r,480));
document.getElementById('jbStart').click(); await new Promise(r=>setTimeout(r,300));
document.getElementById('startNow').click(); await new Promise(r=>setTimeout(r,420));
ok('mid-flow on the checklist before minimising', current==='assess', current);
PARTS[0].status='good'; PARTS[1].status='good'; render();
const swipedBefore = PARTS.filter(p=>p.status!=='pending').length;
document.getElementById('assessMore').click(); await new Promise(r=>setTimeout(r,120));
document.querySelector('[data-opt="minimise"]').click(); await new Promise(r=>setTimeout(r,700));
ok('minimising from the checklist still parks on the queue', current==='task', current);
document.querySelector('#qMini .minitask__card').click(); await new Promise(r=>setTimeout(r,560));
ok('and resuming returns to the checklist, not the task page', current==='assess', current);
ok('with the swipes still there — nothing was reset',
   PARTS.filter(p=>p.status!=='pending').length===swipedBefore,
   PARTS.filter(p=>p.status!=='pending').length+' vs '+swipedBefore);

/* And from Mark penalties, one screen deeper. It used to be Bike photos, which
   was two deeper and is archived — see archive/README.md. Mark penalties is now
   the deepest screen the assessment has, so it is the case worth holding. */
PARTS.forEach(p=>p.status='good'); PARTS[0].status='faulty';
PARTS[0].penalty='minor';
goTo('faults'); await new Promise(r=>setTimeout(r,420));
document.getElementById('faultsMore').click(); await new Promise(r=>setTimeout(r,120));
document.querySelector('[data-opt="minimise"]').click(); await new Promise(r=>setTimeout(r,700));
document.querySelector('#qMini .minitask__card').click(); await new Promise(r=>setTimeout(r,560));
ok('resuming from Mark penalties lands back on Mark penalties', current==='faults', current);
minimised.assessment = null; minimised.repair = null; renderMinis();
/* Hand back a clean sheet — but leave the faults footer HIDDEN, not in its empty
   state. Its margin-bottom animates over 280ms, so a section that arrives
   expecting it hidden would measure mid-transition if this left it shown. */
PARTS.forEach(p=>{p.status='pending';p.penalty=null;p.photos=[];});
/* …and un-file what the checklist filed against the bike. Setting a status by
   hand skips settle(), which is what normally files and withdraws, so a reset
   that only touched PARTS left mechanical issues behind on the record — and a
   later section measuring the bike's parts counted them. */
PARTS.forEach(fileAssessmentFault);
PARTS[0].status='faulty'; PARTS[1].status='faulty';   /* faulty, undetailed */
collapsedFaults.clear(); activeIndex=0; jobAt=0; render(); renderFaults();
PARTS[0].status='pending'; PARTS[1].status='pending'; /* data clean, footer stays put */

/* A repair task parks on the repairable listing, not the assessment queue. */
goTo('home'); await new Promise(r=>setTimeout(r,420));
document.querySelector('[data-task="repairable"]').click();
await new Promise(r=>setTimeout(r,420));
/* The bike already IN HAND, not the first waiting one: tapping a waiting bike
   while one is on-going raises the discard dialog rather than opening it, which
   is asserted above. Picking up the live one is the case this block is about. */
[...document.querySelectorAll('#qList .qrow')]
  .find(r=>r.querySelector('.sub').textContent.trim()==='On-going').click();
await new Promise(r=>setTimeout(r,480));
document.getElementById('jbMore').click();
await new Promise(r=>setTimeout(r,80));
document.querySelector('[data-opt="minimise"]').click();
await new Promise(r=>setTimeout(r,700));
ok('a repair task parks on the repairable listing', current==='repair' && !!rmini(), current);
/* Go and look: the one dock slot is empty on the assessment queue, because that
   queue docks a parked ASSESSMENT and there isn't one. Same slot, different
   answer per queue. */
goTo('task'); await new Promise(r=>setTimeout(r,420));
ok('and not on the assessment queue', document.getElementById('qMini').hidden, 'card on the wrong list');
goTo('repair'); await new Promise(r=>setTimeout(r,420));
ok('its card names the repair step, not an assessment one',
   rmini().textContent.includes('Feedback'), rmini().textContent.replace(/\s+/g,' ').trim());
rmini().click();
await new Promise(r=>setTimeout(r,520));
ok('and it resumes as a repair task', current==='job' && jobKind==='repair', current+'/'+jobKind);

/* ── One parked task PER KIND ───────────────────────────────────────────────
   The whole point of the per-kind slots: a parked assessment must not lock the
   repairable queue, and both cards must be able to sit on their own listings at
   the same time without either dialog firing. */
minimised.assessment = null; minimised.repair = null; renderMinis();
/* Park an assessment. */
goTo('home'); await new Promise(r=>setTimeout(r,420));
document.querySelector('[data-task="assessment"]').click(); await new Promise(r=>setTimeout(r,420));
const parkedAssess = liveRow().dataset.qbike;
liveRow().click(); await new Promise(r=>setTimeout(r,480));
document.getElementById('jbMore').click(); await new Promise(r=>setTimeout(r,80));
document.querySelector('[data-opt="minimise"]').click(); await new Promise(r=>setTimeout(r,700));
/* Now open a repairable bike. This must NOT ask — a parked ASSESSMENT is no
   reason to refuse a repair. The bike opened is the one already in hand, so the
   other guard (one repair at a time) has nothing to object to either; that rule
   is asserted on its own above. */
goTo('home'); await new Promise(r=>setTimeout(r,420));
document.querySelector('[data-task="repairable"]').click(); await new Promise(r=>setTimeout(r,420));
[...document.querySelectorAll('#qList .qrow')]
  .find(r=>r.querySelector('.sub').textContent.trim()==='On-going').click();
await new Promise(r=>setTimeout(r,480));
ok('a parked assessment does not block a repairable bike',
   current==='job' && jobKind==='repair'
   && !document.getElementById('dlg').classList.contains('is-open'),
   current+'/'+jobKind+'/dlg='+document.getElementById('dlg').classList.contains('is-open'));
ok('and the parked assessment survived it', minimised.assessment
   && minimised.assessment.bike.id===parkedAssess,
   JSON.stringify(minimised.assessment && minimised.assessment.bike.id));
/* Park the repair too — both docks at once. */
document.getElementById('jbMore').click(); await new Promise(r=>setTimeout(r,80));
document.querySelector('[data-opt="minimise"]').click(); await new Promise(r=>setTimeout(r,700));
ok('both kinds can be parked at the same time',
   !!minimised.assessment && !!minimised.repair && !!rmini(),
   'assess='+!!minimised.assessment+' repair='+!!minimised.repair);
goTo('task'); await new Promise(r=>setTimeout(r,420));
ok('and each listing shows its own card, not the other kind\'s',
   mini().textContent.includes(parkedAssess), mini().textContent.replace(/\s+/g,' ').trim());
/* Discarding one must leave the other alone. */
otherLiveRow().click();
await new Promise(r=>setTimeout(r,220));
ok('a second assessment still asks — the guard is per kind, not off',
   document.getElementById('dlg').classList.contains('is-open'), 'no dialog');
document.getElementById('dlgGo').click(); await new Promise(r=>setTimeout(r,520));
ok('discarding the assessment leaves the parked repair untouched',
   minimised.assessment===null && !!minimised.repair,
   'assess='+!!minimised.assessment+' repair='+!!minimised.repair);
/* The % is snapshotted, so it must be a number the card can show. */
ok('the parked card carries a % of its own',
   typeof minimised.repair.pct==='number' && minimised.repair.pct>=0 && minimised.repair.pct<=100,
   String(minimised.repair && minimised.repair.pct));
goTo('repair'); await new Promise(r=>setTimeout(r,420));
/* The reference carries the figure in the bar alone — there is no numeral on the
   step line, which is what edge-to-edge buys. So assert the geometry. */
ok('and the bar shows it — fill width matches the snapshot %', (()=>{
     const bar = document.querySelector('#qMini .minitask__bar');
     const fill = bar && bar.querySelector('i');
     if (!fill) return false;
     const got = Math.round(100 * fill.getBoundingClientRect().width
                                / bar.getBoundingClientRect().width);
     return Math.abs(got - minimised.repair.pct) <= 1;
   })(), 'bar/fill missing or off');

minimised.assessment = null; minimised.repair = null; renderMinis();
jobKind='assessment'; jobAt=0;
PARTS.forEach(p=>{p.status='pending';p.penalty=null;p.photos=[];});
/* …and un-file what the checklist filed against the bike. Setting a status by
   hand skips settle(), which is what normally files and withdraws, so a reset
   that only touched PARTS left mechanical issues behind on the record — and a
   later section measuring the bike's parts counted them. */
PARTS.forEach(fileAssessmentFault);
activeIndex=0; render();
goTo('assess'); await new Promise(r=>setTimeout(r,420));

// ⋮ options sheet
ok('sheet closed at rest', !document.getElementById('optSheet').classList.contains('is-open'), true);
document.getElementById('assessMore').click();
await new Promise(r=>setTimeout(r,400));
ok('more button opens the sheet', document.getElementById('optSheet').classList.contains('is-open'), true);
/* Per Figma 2186:22468 and per screen: only the checklist offers the issues row,
   because it is the only screen that walks the parts. */
const sheetLabels = () => [...document.querySelectorAll('.sheet__opt .lbl')].map(s=>s.textContent.trim()).join('|');
ok('the checklist offers all three, in order',
   sheetLabels()==='Bike commands|Report issues on bike|Minimize', sheetLabels());
ok('every row has a 24px icon',
   [...document.querySelectorAll('.sheet__opt')].every(o=>{
     const i=o.querySelector('svg'); return i && Math.round(i.getBoundingClientRect().width)===24;}),
   'icon missing or wrong size');
ok('only the issues row carries a chevron',
   [...document.querySelectorAll('.sheet__opt')].map(o=>o.querySelectorAll('svg').length).join(',')==='1,2,1',
   [...document.querySelectorAll('.sheet__opt')].map(o=>o.querySelectorAll('svg').length).join(','));
ok('rows are 72px, content inset 24',
   (()=>{const o=document.querySelector('.sheet__opt'), r=o.getBoundingClientRect();
     const i=o.querySelector('svg').getBoundingClientRect();
     const l=o.querySelector('.lbl').getBoundingClientRect();
     return Math.round(r.height)===72 && Math.round(i.left-r.left)===24
       && Math.round(l.left-i.right)===16;})(),
   Math.round(document.querySelector('.sheet__opt').getBoundingClientRect().height));
document.getElementById('optScrim').click();
await new Promise(r=>setTimeout(r,400));
ok('scrim dismisses the sheet', !document.getElementById('optSheet').classList.contains('is-open'), true);
ok('reason sheet is gone', !document.querySelector('#issueChips, .tog, #sheetConfirm'), 'absent');

/* Backing out of the sheet undoes the press that opened it — the card comes back
   and the part is left exactly as it was. "Faulty, but not saying what" is not a
   state this screen holds. */
document.querySelector('#scrAssess .btn-faulty').click();
await new Promise(r=>setTimeout(r,700));
document.getElementById('isScrim').click();
await new Promise(r=>setTimeout(r,600));
ok('dismissing the sheet puts the card back and leaves the part alone',
   PARTS[0].status==='pending'
   && !document.getElementById('isSheet').classList.contains('is-open')
   && !!document.querySelector('#scrAssess .item--expanded .card'),
   PARTS[0].status);
/* Good is a complete answer on its own, so it still commits straight away — and
   it clears any reason an earlier faulty call left behind, or a part now reading
   good would still be carrying what was wrong with it. */
PARTS[0].status='faulty'; PARTS[0].reasons_selected=['Error code'];
activeIndex=0; render();
await new Promise(r=>setTimeout(r,120));
document.querySelector('#scrAssess .btn-good').click();
await new Promise(r=>setTimeout(r,700));
ok('Good commits with no sheet, and clears the earlier reasons',
   PARTS[0].status==='good' && PARTS[0].reasons_selected.length===0
   && !document.getElementById('isSheet').classList.contains('is-open'),
   PARTS[0].status+' / '+JSON.stringify(PARTS[0].reasons_selected));
/* It HAS a strip now, and not the mechanic's: theirs holds two checklists side
   by side, this one holds the two halves of one step — the parts, and the
   penalties marked against what they turn up. */
ok('the QCA list carries the Assessment / Penalties strip',
   [...document.querySelectorAll('#assessTabs .steptab')]
     .map(t=>t.querySelector('span').textContent).join('/')==='Assessment/Penalties'
   && !document.querySelector('#scrAssess .ck-tabs'),
   [...document.querySelectorAll('#assessTabs .steptab')]
     .map(t=>t.querySelector('span').textContent).join('/'));

/* Row → card morph. A ghost flies the image between the two boxes across the
   list's rebuild; the real image is hidden until it lands, and both must be
   cleaned up or the screen is left with a stray picture and an invisible one. */
activeIndex = 1; render();
await new Promise(r=>setTimeout(r,120));
document.querySelector('.item[data-index="4"]').click();
await new Promise(r=>setTimeout(r,30));
/* One ghost, not two. The card being left closes with no animation: its image
   used to fly back up into its row, which pulled the eye off the part arriving. */
ok('opening a part flies exactly one ghost — the one arriving',
   document.querySelectorAll('.morph-ghost').length===1,
   document.querySelectorAll('.morph-ghost').length);
ok('and the card being left is already a plain row',
   (()=>{const rows=[...document.querySelectorAll('.item--collapsed')];
     return rows.some(r=>r.dataset.id==='p1') && !document.querySelector('.item--expanded[data-id="p1"]');})(),
   'still expanded');
ok('and the ghost rides in the scroller, not the frame',
   document.querySelector('.morph-ghost').parentElement.id==='scroll',
   document.querySelector('.morph-ghost').parentElement.id);
ok('the real image is hidden while its ghost is in the air',
   getComputedStyle(document.querySelector('.item--expanded .card__media')).visibility==='hidden',
   getComputedStyle(document.querySelector('.item--expanded .card__media')).visibility);
await new Promise(r=>setTimeout(r,600));
ok('every ghost is cleaned up when it lands',
   document.querySelectorAll('.morph-ghost').length===0,
   document.querySelectorAll('.morph-ghost').length);
/* The card rests a little ABOVE centre. Dead-centre pushed Faulty / Good into the
   bottom third, which is a reach on a phone held one-handed. */
ok('the open card sits above the middle, not on it',
   (()=>{const sc=scrollEl.getBoundingClientRect();
     const c=document.querySelector('.item--expanded').getBoundingClientRect();
     const centre = c.top - sc.top + c.height/2;
     const above = sc.height/2 - centre;
     return above > 30 && above < 120;})(),
   (()=>{const sc=scrollEl.getBoundingClientRect();
     const c=document.querySelector('.item--expanded').getBoundingClientRect();
     return Math.round(sc.height/2 - (c.top - sc.top + c.height/2))+'px above centre';})());
ok('which puts the buttons inside the comfortable reach, not the bottom quarter',
   (()=>{const sc=scrollEl.getBoundingClientRect();
     const b=document.querySelector('.item--expanded .card__actions').getBoundingClientRect();
     return (b.top - sc.top + b.height/2) / sc.height < 0.68;})(),
   (()=>{const sc=scrollEl.getBoundingClientRect();
     const b=document.querySelector('.item--expanded .card__actions').getBoundingClientRect();
     return Math.round((b.top - sc.top + b.height/2) / sc.height * 100)+'%';})());
ok('and the real image is visible again, at full size',
   (()=>{const m=document.querySelector('.item--expanded .card__media');
     return getComputedStyle(m).visibility==='visible'
       && Math.round(m.getBoundingClientRect().height)===220;})(),
   getComputedStyle(document.querySelector('.item--expanded .card__media')).visibility);
/* Not asserting getAnimations() is idle: headless does not tick animations under
   virtual time, so they never report finished here. What matters is the DOM they
   leave behind, and that is asserted above. */

// mixed state -> screen 2
const f=new Set([0,2,6]);
PARTS.forEach((p,i)=>p.status=f.has(i)?'faulty':'good');
activeIndex=-1; render();
ok('footer appears when all judged', document.getElementById('assessFooter').classList.contains('is-shown'), true);
document.getElementById('nextBtn').click();
await new Promise(r=>setTimeout(r,500));
ok('router moved to faults', current==='faults', current);
ok('only faulty parts listed', document.querySelectorAll('.fitem').length===3, document.querySelectorAll('.fitem').length);
ok('parts with renders show them on Mark faults',
   /url\("data:image/.test(getComputedStyle(document.querySelector('.fitem[data-id="p0"] .thumb')).backgroundImage),
   getComputedStyle(document.querySelector('.fitem[data-id="p0"] .thumb')).backgroundImage.slice(0,24));
ok('parts without one fall back to the pending tile',
   !!document.querySelector('.fitem[data-id="p6"] .thumb svg'), 'placeholder present');
/* Every faulty part arrives expanded, not just the first undetailed one. */
ok('every faulty part arrives open',
   document.querySelectorAll('.fitem.is-open').length===document.querySelectorAll('.fitem').length
   && collapsedFaults.size===0,
   document.querySelectorAll('.fitem.is-open').length+' of '+document.querySelectorAll('.fitem').length);
/* Photos only appear under a Minor/Major penalty, so the resting height of a
   freshly-arrived card — no penalty yet — is the one chip row alone.

   161 and 241, down from 273 and 353: the Damage group took 84 with it (a 20px
   caption, its 8px gap, a 40px chip row and the body's 16px gap) and the
   "Penalty:" caption another 28. Both numbers are measured, not derived, and are
   here so that a change to the card's rhythm has to be deliberate. */
ok('s2 open item without a penalty = 161', Math.round(R('.fitem.is-open').height)===161, R('.fitem.is-open').height);
document.querySelector('.fitem.is-open .fchips [data-group="penalty"][data-value="minor"]').click();
ok('s2 open item with one = 241', Math.round(R('.fitem.is-open').height)===241, R('.fitem.is-open').height);
ok('and No takes the Photos row away again',
   (document.querySelector('.fitem.is-open .fchips [data-group="penalty"][data-value="no"]').click(),
    !document.querySelector('.fitem.is-open .fphotos-row')), 'no photos row');
document.querySelector('.fitem.is-open .fchips [data-group="penalty"][data-value="no"]').click();
collapsedFaults.add('p6'); renderFaults();
ok('s2 collapsed item = 97', Math.round(R('.fitem:not(.is-open)').height)===97, R('.fitem:not(.is-open)').height);
collapsedFaults.clear(); renderFaults();
/* The footer holds the step CTA, and it waits: until every fault on screen has
   a penalty against it there is nothing to move on FROM. (For a while there was
   no footer here at all — the Done button that used to fill it closed nothing
   and went where the back arrow went. This one advances the assessment.) */
ok('the step CTA waits until every penalty is set',
   !document.getElementById('ffooter').classList.contains('is-shown'),
   document.getElementById('ffooter').className);

/* The damage group's own block stood here: three types held at once, Missing
   exclusive against them in both directions, canonical rather than tap order.
   All of it went with the group. The one rule worth keeping is that the same
   idea still exists where it belongs — the checklist's fault sheet, whose
   Missing-switches-rather-than-locks behaviour is asserted in its own block. */
ok('nothing on this screen asks about damage any more',
   !document.querySelector('#flist [data-group="damage"]')
   && typeof DAMAGE === 'undefined'
   && !('damage' in PARTS[0]),
   Object.keys(PARTS[0]).join(','));

// screen 2 — page title hands off the same way
ok('the page is titled Mark penalties', document.querySelector('#faultsHead h2').textContent.trim()==='Mark penalties', document.querySelector('#faultsHead h2').textContent.trim());
/* The photographs are open when this screen arrives — they are the evidence the
   penalty is judged against, so a QCA should not have to go and find them. Which
   means the page's RESTING state is its scrolled one: the title has given up its
   space to the carousel and the breadcrumb is already in the bar. Every assertion
   below about "at rest" reads from there, so the carousel is shut first. */
ok('the photographs are open on arrival, without being asked for',
   document.getElementById('carousel').classList.contains('is-open')
   && document.getElementById('scrFaults').classList.contains('photos-open'),
   document.getElementById('carousel').className);
setCarousel(false);
await new Promise(r=>setTimeout(r,450));
/* The CLASS, not the computed opacity. The suffix fades in and out, and headless
   does not tick transitions under virtual time (see the note further down) — so
   once the bar HAS been collapsed, which it now is on arrival, the opacity it
   reached never unwinds however long we wait. The class is the contract; the fade
   is asserted by eye and by the rule that drives it. */
ok('s2 header shows only the bike number at rest',
   !document.getElementById('faultsAppbar').classList.contains('is-collapsed'),
   document.getElementById('faultsAppbar').className);
// with only a few faults the list is shorter than the viewport and never
// scrolls, so the hand-off is exercised with every part faulty
PARTS.forEach(p=>p.status='faulty'); renderFaults();
await new Promise(r=>setTimeout(r,60));
const fs=document.getElementById('fscroll');
ok('faults list is scrollable with every part faulty', fs.scrollHeight > fs.clientHeight, fs.scrollHeight+' vs '+fs.clientHeight);
fs.scrollTop=200; fs.dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
ok('s2 breadcrumb comes in on scroll', document.getElementById('faultsAppbar').classList.contains('is-collapsed'), document.getElementById('faultsAppbar').className);
ok('s2 breadcrumb reads the bike / Mark penalties', document.querySelector('#faultsAppbar .appbar__titles p').textContent.replace(/\s+/g,' ').trim()===BIKE.id+' / Mark penalties', document.querySelector('#faultsAppbar .appbar__titles p').textContent.replace(/\s+/g,' ').trim());
document.getElementById('fscroll').scrollTop=0;
document.getElementById('fscroll').dispatchEvent(new Event('scroll'));
await new Promise(r=>setTimeout(r,60));
ok('s2 breadcrumb retreats at the top', !document.getElementById('faultsAppbar').classList.contains('is-collapsed'), document.getElementById('faultsAppbar').className);
ok('title survives a re-render', !!document.querySelector('#faultsHead h2'), true);
PARTS.forEach((p,i)=>p.status = f.has(i) ? 'faulty' : 'good');   // back to the three
collapsedFaults.clear(); renderFaults();
/* Same reason: the block's 64px is a transitioned height, and it has been to 0
   and back by this point in the run. The 64 itself is measured in geomtest, which
   reaches this screen before anything has collapsed. */
ok('faults heading clears the grey band',
   !document.getElementById('scrFaults').classList.contains('photos-open'),
   document.getElementById('scrFaults').className);

// Customer photos: no control at all, and none left over
/* The pill is gone from the markup, from shared/base.css and from the screen's
   own placement rule. Asserted as an absence in all three places, because a
   removal like this leaves litter: an id nobody queries, a class nobody sets, a
   transform nobody clears. */
ok('no photos control anywhere in the bar',
   !document.getElementById('photosToggle')
   && !document.querySelector('.pill-btn')
   && !document.querySelector('#faultsHead button'),
   'clean');
setCarousel(true);
await new Promise(r=>setTimeout(r,450));
ok('the photographs open on their own and put the page in its scrolled state',
   document.getElementById('carousel').classList.contains('is-open')
   && document.getElementById('faultsAppbar').classList.contains('is-collapsed')
   && document.getElementById('scrFaults').classList.contains('photos-open'),
   document.getElementById('faultsAppbar').className);

// tick appears on completion
/* The penalty IS the completion now. It used to take a penalty and a damage type
   before the ring filled, which meant a part could carry a judgement and still
   read as outstanding. */
collapsedFaults.clear(); PARTS[0].penalty=null; renderFaults();
ok('an unanswered part shows the dashed ring',
   !!document.querySelector('.fitem[data-id="p0"] .fstatus circle[stroke-dasharray]'), 'dashed');
document.querySelector('.fitem[data-id="p0"] [data-group="penalty"][data-value="no"]').click();
ok('and the penalty alone fills it',
   !!document.querySelector('.fitem[data-id="p0"] .fstatus circle[fill="#00654F"]'), 'filled');
ok('no chevrons left on the page', !document.querySelector('.fchev'), 'none');
ok('status is the only thing in the row end',
   document.querySelector('.fitem[data-id="p0"] .frow__end').children.length===1, 
   document.querySelector('.fitem[data-id="p0"] .frow__end').children.length);

/* Four screens carry a ⋮, and the sheet is rebuilt per screen on open — so the
   list always matches where you are, not where you last opened it. */
{
  const labels = () => [...document.querySelectorAll('.sheet__opt .lbl')].map(x=>x.textContent.trim()).join('|');
  const check = async (id, want) => {
    document.getElementById(id).click();
    await new Promise(r=>setTimeout(r,60));
    ok(`⋮ on ${current} offers ${want}`, labels()===want, labels());
    document.getElementById('optScrim').click();
    await new Promise(r=>setTimeout(r,60));
  };
  await check('faultsMore', 'Bike commands|Minimize');
  /* The dashboard's menu is COMPUTED, because one screen serves two jobs. The
     assessment offers neither the repair's paperwork nor its sign-off, and not
     Bike info either — that is a tab here. Both shapes are asserted, because the
     point of the change is the difference between them. */
  {
    const wasKind = jobKind, wasAt = current;
    /* The sheet reads `current`, so this has to actually BE on the dashboard —
       enterRnm() paints it, goTo() is what makes it the screen you are on. */
    jobKind='assessment'; enterRnm(); goTo('rnm');
    await new Promise(r=>setTimeout(r,450));
    await check('btnMore', 'Play to learn|Minimize');
    jobKind='repair'; enterRnm(); await new Promise(r=>setTimeout(r,60));
    /* ONE OF THE TWO, never both. Finish repair claims the bike is done and
       only appears once every issue on it is closed; until then the row in that
       place is Partial repair closure — the honest version of the same action,
       for a bike that is as done as it is going to get today. Here the record
       is open, so it is the partial one. */
    await check('btnMore', issuesAllResolved()
      ? 'Part exchange|Bike info|Finish repair|Play to learn|Minimize'
      : 'Part exchange|Bike info|Partial repair closure|Play to learn|Minimize');
    jobKind=wasKind; enterRnm(); goTo(wasAt);
    await new Promise(r=>setTimeout(r,450));
  }
  ok('the flow screens carry a ⋮',
     ['jbMore','assessMore','faultsMore'].every(i=>!!document.getElementById(i)),
     ['jbMore','assessMore','faultsMore'].filter(i=>!document.getElementById(i)).join(','));
}

/* One ⋮ menu for the whole app: it lives outside every screen, so any screen can
   open it. It used to be nested inside the checklist, which meant only the
   checklist could show it. */
ok('the options sheet is shared chrome, not nested in a screen',
   !document.getElementById('optSheet').closest('.screen'), 'still inside a screen');
document.getElementById('faultsMore').click();
await new Promise(r=>setTimeout(r,60));
ok('⋮ on Mark faults opens it',
   document.getElementById('optSheet').classList.contains('is-open'), 'did not open');
ok('and both ⋮ report the open state',
   document.getElementById('faultsMore').getAttribute('aria-expanded')==='true'
   && document.getElementById('assessMore').getAttribute('aria-expanded')==='true',
   'aria out of sync');
document.getElementById('optScrim').click();
await new Promise(r=>setTimeout(r,60));
ok('and the scrim closes it', !document.getElementById('optSheet').classList.contains('is-open'), 'still open');

/* Folding: a finished row folds when you move to another one, and a finished
   row you tap again folds deliberately. An unfinished row never folds itself.
   Ids come from the data, not hard-coded — which parts are faulty varies. */
collapsedFaults.clear();
const fp = faultyParts();
const A = fp[0].id, B = fp[1].id;
fp[0].penalty='minor';                             // A finished
fp[1].penalty=null;                                // B still to do
renderFaults();
const row = id => document.querySelector(`.fitem[data-id="${id}"] .frow`);
ok('both are open before anything is tapped',
   !collapsedFaults.has(A) && !collapsedFaults.has(B), [...collapsedFaults].join(','));
row(B).click(); await new Promise(r=>setTimeout(r,60));
ok('tapping another row folds the finished one away', collapsedFaults.has(A), [...collapsedFaults].join(','));
ok('and leaves the unfinished row you tapped open', !collapsedFaults.has(B), [...collapsedFaults].join(','));
row(B).click(); await new Promise(r=>setTimeout(r,60));
ok('tapping an unfinished row again does not fold it', !collapsedFaults.has(B), 'folded');
row(A).click(); await new Promise(r=>setTimeout(r,60));
ok('a folded row reopens on tap', !collapsedFaults.has(A), 'still folded');
row(A).click(); await new Promise(r=>setTimeout(r,60));
ok('and a finished open row folds when tapped again', collapsedFaults.has(A), 'still open');
collapsedFaults.clear(); renderFaults();

// photos
document.querySelector('.fitem[data-id="p0"] .frow').click();
document.querySelector('.fitem[data-id="p0"] [data-fact="photo"]').click();
ok('photo added', PARTS[0].photos.length===1, PARTS[0].photos.length);
document.querySelector('.fitem[data-id="p0"] .fphoto__x').click();
ok('photo removed', PARTS[0].photos.length===0, PARTS[0].photos.length);

// complete everything -> submit pushes, does not overlay
const d=[['no'],['minor'],['major']];
PARTS.filter(p=>p.status==='faulty').forEach((p,i)=>{p.penalty=d[i][0];});
renderFaults();
await new Promise(r=>setTimeout(r,450));
/* "submit shown when all detailed" and "submit does not overlay list" stood
   here. Both measured a footer this screen no longer has; the list simply runs
   to the floor now. */
ok('the list runs to the bottom of the frame instead', Math.round(R('#fscroll').bottom)===Math.round(H()),
   R('#fscroll').bottom+' / '+H());

// carousel pushes the list down
setCarousel(false); await new Promise(r=>setTimeout(r,450));
const before=R('#fscroll').top;
setCarousel(true);
await new Promise(r=>setTimeout(r,450));
/* Asserted through the class and the token, not by measuring the box. The push is
   a height transition, and headless does not tick animations under virtual time
   (see the note further up) — so the carousel measures 0 here for the whole run
   however long we wait, and the old measured assertion could only ever fail.
   Verified by hand in a real browser: #fscroll.top goes 126.5 -> 374.5, exactly
   248. The constant is still 248, so a real change to the carousel's resting
   height still breaks this. */
ok('carousel pushes list by 248',
   document.getElementById('carousel').classList.contains('is-open')
   && getComputedStyle(document.documentElement).getPropertyValue('--carousel-h').trim()==='248px',
   getComputedStyle(document.documentElement).getPropertyValue('--carousel-h'));
ok('4 slides + 4 dots', document.querySelectorAll('.slide').length===4 && document.querySelectorAll('.dots button').length===4, true);

// back preserves entered detail
/* To the DASHBOARD now, from every screen in this flow — see the note on
   faultsBack. The checklist is one step further in. */
document.getElementById('faultsBack').click();
await new Promise(r=>setTimeout(r,450));
ok('back returns to the dashboard, not the screen that handed over', current==='rnm', current);
goTo('assess'); await new Promise(r=>setTimeout(r,450));
PARTS[0].status='good'; render();          // un-fault a detailed part
/* Mark penalties is only where this button goes while it is the next step still
   outstanding — that is the whole point of it — so the sequence is cleared
   before leaning on it. */
RnM.resetAssessFlow();
document.getElementById('nextBtn').click();
await new Promise(r=>setTimeout(r,450));
ok('unfaulted part drops off list', document.querySelectorAll('.fitem').length===2, document.querySelectorAll('.fitem').length);
PARTS[0].status='faulty';
document.getElementById('faultsBack').click(); await new Promise(r=>setTimeout(r,450));
goTo('assess'); await new Promise(r=>setTimeout(r,450));
document.getElementById('nextBtn').click();  await new Promise(r=>setTimeout(r,450));
ok('re-faulted part keeps its detail', PARTS[0].penalty==='no',
   String(PARTS[0].penalty));

/* ── The end of the assessment checklist ─────────────────────────────────────
   Screen 3 was Bike photos: four tiles, one shot a side, and the Checklist done
   button that advanced the job and returned to the task page. It is archived (see
   archive/README.md) and its whole block of assertions went with it.

   What replaces it is smaller and, deliberately, different: Mark penalties ends
   with Done, Done goes back to the DASHBOARD, and the step is closed from the
   dashboard's own Done. So the step advances in one place rather than two.
   ─────────────────────────────────────────────────────────────────────────── */
/* The Done button was asserted here, and then clicked to get back to the
   dashboard. Both are gone — Sagar took the button off, because it read as
   signing the step off while deliberately not advancing it, and the back arrow
   already made the same journey. So the route out is the back arrow, twice:
   Mark penalties → the parts checklist → the dashboard. */
ok('there is no photos screen left in the app',
   ORDER.indexOf('photos')===-1
   && !document.getElementById('scrPhotos')
   && typeof bikePhotos === 'undefined',
   ORDER.join('>'));
document.getElementById('faultsBack').click();
await new Promise(r=>setTimeout(r,450));
document.getElementById('assessBack').click();
await new Promise(r=>setTimeout(r,450));
ok('backing out of the penalties reaches the assessment dashboard', current==='rnm', current);
/* And it does NOT close the step on its way past — that is the dashboard's job,
   and two buttons advancing one step is how a step ends up advancing twice. */
ok('and leaves the step for the dashboard to close', jobAt===0, String(jobAt));
YuzenRnM.onDone();
await new Promise(r=>setTimeout(r,450));
ok('the dashboard\'s Done is what returns to the job page', current==='job', current);
ok('there is no summary screen left', !document.getElementById('scrSummary') && ORDER.indexOf('summary')===-1,
   ORDER.join('>'));
ok('step one is ticked', document.querySelectorAll('.jb__step')[0].classList.contains('is-done'), 'not done');
/* The row names the JOB and the button names the OUTCOME: "Remove battery
   mapping" is what the step is, "Battery removed" is what pressing the button
   reports. They were the same words for as long as every step's button simply
   repeated its label. */
ok('and Remove battery mapping is now the active step',
   document.querySelectorAll('.jb__step')[1].classList.contains('is-active')
   && document.querySelectorAll('.jb__step .lbl')[1].textContent==='2. Remove battery mapping'
   && document.getElementById('jbStart').textContent.trim()==='Battery removed',
   document.getElementById('jbStart').textContent.trim());

/* The bar is the WHOLE task, so finishing the checklist must not send it back to
   zero. It used to: the old summary's Yeah!! reset every part before advancing
   the step, which zeroed all three assessment phases at once. */
/* 60 was 35 checklist + 15 faults + 10 photos. The photos phase is archived and
   its 10 went to the two that remain — 40 + 20 — so the same 60 is reached by
   finishing the same work, with one fewer thing to finish. */
ok('progress holds at 60% on Remove battery, not 0',
   jobProgress()===60, jobProgress()+'%');
ok('the work done is still on the data', PARTS.every(p=>p.status!=='pending'),
   'state was wiped');
jobAt = 2; renderJob();
ok('battery carries 25 of it', jobProgress()===85, jobProgress()+'%');
jobAt = 3; renderJob();
ok('and the drop closes it at 100', jobProgress()===100, jobProgress()+'%');
ok('past the last step the CTA does not throw',
   document.getElementById('jbStart').textContent.trim()==='Task complete'
   && document.getElementById('jbStart').disabled,
   document.getElementById('jbStart').textContent.trim());
jobAt = 0;
PARTS.forEach(p=>{p.status='pending';p.penalty=null;p.photos=[];});
/* …and un-file what the checklist filed against the bike. Setting a status by
   hand skips settle(), which is what normally files and withdraws, so a reset
   that only touched PARTS left mechanical issues behind on the record — and a
   later section measuring the bike's parts counted them. */
PARTS.forEach(fileAssessmentFault);
activeIndex = 0; collapsedFaults.clear(); tickSeen.clear();
render(); renderJob();
ok('the job page is the flow\'s single doorway',
   ORDER.indexOf('job') < ORDER.indexOf('assess'), ORDER.join('>'));
document.getElementById('jbStart').click();
await new Promise(r=>setTimeout(r,300));
document.getElementById('startNow').click();
await new Promise(r=>setTimeout(r,300));

/* ALL-GOOD PATH → the empty state. Reached by going to the tab directly rather
   than through the checklist's CTA: with nothing faulty that button skips the
   Penalties tab, which is the point of it — but the screen still has to say
   something sensible to anyone who arrives another way (the dashboard row, or
   a bike whose faults were all un-marked after they were priced). */
PARTS.forEach(p=>{p.status='good'; p.penalty=null;});
PARTS.forEach(fileAssessmentFault); render();
document.getElementById('faultsBack').click(); await new Promise(r=>setTimeout(r,450));
RnM.resetAssessFlow();
goTo('faults'); await new Promise(r=>setTimeout(r,450));
ok('empty state when nothing faulty', !document.getElementById('fempty').hidden, true);
/* And the CTA is there even so: nothing to judge is a finished screen, not a
   blocked one. */
ok('and the step CTA is offered on it',
   document.getElementById('ffooter').classList.contains('is-shown'),
   document.getElementById('ffooter').className);
/* The empty state says why it is empty rather than declaring the bike clean:
   this screen is downstream of the checklist, so nothing here yet means nothing
   has been marked YET. "Every part came back good" claimed a result that had not
   been reached. */
ok('the empty state names the cause, not a verdict',
   document.querySelector('#fempty .t-label-md700').textContent.trim()==='Assessment pending'
   && /faults you mark\.$/.test(document.querySelector('#fempty .t-body-sm').textContent.trim()),
   document.querySelector('#fempty .t-label-md700').textContent.trim());

/* ── THE SR. MECHANIC'S BOARD ──────────────────────────────────────────────
   TWO blocks under a heading of their own, and nothing on either leads into
   another profile's flow. Unallocated is a decision queue — the QCA's own
   transferred bikes, so the chain runs end to end: assess a bike, finish the
   task, and it turns up here waiting to be given to someone — and Allocated is a
   board you watch, split into two accordions. */
{
  const wasRole = SHIFT.role;
  SHIFT.role = 'Sr. Mechanic'; goTo('home'); await new Promise(r=>setTimeout(r,450));
  /* And the section is not called "My Tasks" for them: the two blocks are one
     yard, not a to-do list. Every other role keeps the shared heading. */
  ok('the Sr. Mechanic has two blocks, under a heading of their own',
     [...document.querySelectorAll('#scrHome .hm__task')].filter(b=>!b.hidden)
       .map(b=>b.querySelector('.l').textContent).join('|')
       ==='Unallocated bikes|Allocated bikes'
     && document.getElementById('hmHeading').textContent==='Repairable bikes Zone',
     [...document.querySelectorAll('#scrHome .hm__task')].filter(b=>!b.hidden)
       .map(b=>b.querySelector('.l').textContent).join('|')
       +' / '+document.getElementById('hmHeading').textContent);
  document.querySelector('[data-task="allocation"]').click();
  await new Promise(r=>setTimeout(r,450));
  /* ONE list, no strip. It held both halves under two tabs for a build; the
     allocated half is its own block now, so a strip of one tab would be a
     control with nothing to switch to. */
  ok('Unallocated opens a plain board, no tabs',
     current==='allocation' && !document.querySelector('.qsec-tabs')
     && document.querySelector('#scrQueue .q__title .h').textContent.trim()
        ==='Unallocated bikes · '+ALLOC_ALL().filter(b=>!b.allocated).length,
     document.querySelector('#scrQueue .q__title .h').textContent.trim());
  /* The unallocated half is not a fixture — it is what the QCA transferred. */
  ok('and Unallocated is the QCA\u2019s transferred bikes, not an invented list',
     document.querySelectorAll('.qrow').length===ALLOC_ALL().filter(b=>!b.allocated).length
     /* The QCA's own transfers are IN it and come first — that is the chain the
        prototype has to show end to end. The rest are fixture, because six is
        what one session can produce and a real yard holds 12-16. */
     && DONE.filter(d=>d.transferred).every(d =>
          [...document.querySelectorAll('.qrow')].some(r=>r.dataset.qbike===d.id))
     && document.querySelectorAll('.qrow').length >= 12,
     document.querySelectorAll('.qrow').length+' rows');
  /* A row opens the Sr. Mechanic's OWN detail page — and not the MECHANIC's
     task page. Allocating work must not drop them inside somebody else's job,
     which is what `jobKind` untouched is asserting. */
  const allocRow = document.querySelector('#qList .qrow').dataset.qbike;
  document.querySelector('#qList .qrow').click();
  await new Promise(r=>setTimeout(r,450));
  ok('tapping a bike opens its allocation page, and starts no repair task',
     current==='alloc' && jobKind!=='repair',
     current+' / '+jobKind);
  /* The page is that bike's, and it reads its faults off the record the QCA
     filed rather than off a fixture of its own. */
  /* Two lists, and they are two different KINDS of thing: what a QCA marked by
     hand, off this bike's own record, and what the bike reported about itself. */
  ok('and the page is that bike, with its marked faults on it',
     document.getElementById('allocCrumb').textContent===allocRow
     && document.querySelectorAll('#allocFaults .issue').length
        === DONE.find(d=>d.id===allocRow).assessment.faults.length,
     document.getElementById('allocCrumb').textContent+' / '
       +document.querySelectorAll('#allocFaults .issue').length+' faults');
  /* A mechanical row carries the part's picture and its reasons; an electrical
     one is a line of text with neither, because nobody chose it and there is no
     part to photograph. */
  /* A tile on every row and reasons on every row. The tile is the part's own
     crop where the catalogue has a render for it and the no-photo glyph where it
     does not — never an empty square, and never another part's picture. */
  ok('mechanical rows carry a tile and their reasons',
     [...document.querySelectorAll('#allocFaults .issue')].every(r =>
       !!r.querySelector('.issue__thumb')
       && !!(r.querySelector('.issue__crop') || r.querySelector('.issue__thumb svg'))
       && !!r.querySelector('.issue__reasons span')),
     document.querySelectorAll('#allocFaults .issue__thumb').length+' tiles');
  /* THIS BIKE'S count, not the app's whole diagnostic set — the row that opened
     the page says how many it reported, and the section has to agree. Some
     bikes report none. */
  ok('and the electrical list is what THIS bike reported, plain',
     (()=>{const bike = ALLOC_ALL().find(b=>b.id===allocRow);
       return document.querySelectorAll('#allocElec .issue--plain').length===bike.elecN
         && !document.querySelector('#allocElec .issue__thumb');})(),
     document.querySelectorAll('#allocElec .issue--plain').length+' of '
       +ALLOC_ALL().find(b=>b.id===allocRow).elecN);
  /* And the spread is real: the board is not one fixture repeated. A row that
     always said "3 elect." would teach the shape of the data rather than the
     shape of the work. */
  ok('the unallocated bikes carry a spread of fault kinds',
     (()=>{const u = ALLOC_ALL().filter(b=>!b.allocated);
       const mech = b => ((b.assessment&&b.assessment.faults)||[]).length;
       return u.some(b=>mech(b)&&!b.elecN) && u.some(b=>!mech(b)&&b.elecN)
           && u.some(b=>mech(b)&&b.elecN)  && u.length>=12;})(),
     ALLOC_ALL().filter(b=>!b.allocated)
       .map(b=>((b.assessment&&b.assessment.faults)||[]).length+'/'+b.elecN).join(' '));
  /* ONE button, two jobs. Closed it reads Allocate and is LIVE — it is the way
     into the decision, and a dead button on arrival would say the page was
     waiting for something the page does not show. */
  ok('the CTA arrives live, and reads Allocate',
     document.getElementById('allocGo').disabled===false
     && document.getElementById('allocGo').textContent.trim()==='Allocate',
     document.getElementById('allocGo').textContent.trim());
  document.getElementById('allocGo').click();
  await new Promise(r=>setTimeout(r,60));
  /* Pressing it opens the picker, and the same button becomes the confirm —
     dead until a name is chosen. It stays on the frame's floor while the sheet
     sits above it, so it does not move when the sheet arrives. */
  ok('it opens the picker and turns into a dead Assign and notify',
     document.getElementById('allocSheet').classList.contains('is-open')
     && document.getElementById('allocScrim').classList.contains('is-open')
     && document.getElementById('allocGo').disabled===true
     && document.getElementById('allocGo').textContent.trim()==='Assign and notify',
     document.getElementById('allocGo').textContent.trim());
  ok('and the mechanics are in the sheet, not on the page',
     document.querySelectorAll('#allocSheet [data-alloc-mech]').length > 0
     && !document.querySelector('#allocScroll [data-alloc-mech]'),
     document.querySelectorAll('#allocSheet [data-alloc-mech]').length+' in the sheet');
  document.querySelector('[data-alloc-mech]').click();
  ok('picking one arms it',
     document.getElementById('allocGo').disabled===false
     && document.querySelector('[data-alloc-mech]').getAttribute('aria-checked')==='true',
     document.getElementById('allocGo').textContent.trim());
  /* Back closes the sheet rather than leaving the page — the hardware-back
     habit. Leaving mid-decision from one tap would be the wrong surprise. */
  document.getElementById('allocBack').click();
  await new Promise(r=>setTimeout(r,60));
  ok('back shuts the sheet first, and the button goes back to Allocate',
     current==='alloc'
     && !document.getElementById('allocSheet').classList.contains('is-open')
     && document.getElementById('allocGo').textContent.trim()==='Allocate',
     current+' / '+document.getElementById('allocGo').textContent.trim());
  document.getElementById('allocBack').click();
  await new Promise(r=>setTimeout(r,450));
  ok('and back lands on the board it came from', current==='allocation', current);
  /* ── THE SECOND BLOCK ──────────────────────────────────────────────────
     Allocated bikes: its own listing, read BY MECHANIC. One accordion per
     person, ALL SHUT on arrival — the board opens as four names and their
     loads, and you expand the one you are asking about. It was two tabs by
     state, which scattered one person's work across both and made "how is each
     of my people doing" unanswerable. */
  goTo('home'); await new Promise(r=>setTimeout(r,450));
  document.querySelector('[data-task="allocated"]').click();
  await new Promise(r=>setTimeout(r,450));
  ok('Allocated bikes is one accordion per mechanic, all shut',
     current==='allocated'
     && [...document.querySelectorAll('.qsec-head')].map(h=>h.querySelector('.qmech__n').textContent)
          .join('/')===MECHANICS.map(m=>m.name).join('/')
     && !document.querySelector('.qsec-head.is-open')
     && document.querySelectorAll('.qrow').length===0,
     current+' / '+document.querySelectorAll('.qrow').length+' rows');
  /* The head is a person: face, name, and whether they are free with how much
     is left. Pending counts the bike being worked on — it is not done. */
  /* THE HEAD IS A SHIFT, drawn as blocks: finished, in hand, queued, free. The
     words are on the aria-label rather than lost — colour is the whole of this
     reading, and a row of squares says nothing to a screen reader. */
  ok('each head carries a face and its shift as blocks',
     MECHANICS.every(m => {
       const h = document.querySelector('[data-qsec="'+m.id+'"]');
       const want = ALLOC.filter(b=>b.mech===m.id&&b.state!=='done').length
                  + ' of ' + ALLOC.filter(b=>b.mech===m.id).length + ' still to do, '
                  + (ALLOC_CAP - ALLOC.filter(b=>b.mech===m.id).length) + ' slots free';
       /* The count beside the name is the blocks said in words — same source,
          so the number and the picture cannot disagree. */
       return !!h.querySelector('.qmech__face svg')
           && h.querySelector('.qmech__c').textContent.trim()
                === ALLOC.filter(x=>x.mech===m.id&&x.state!=='done').length
                   + '/' + ALLOC.filter(x=>x.mech===m.id).length + ' pending'
           && h.querySelectorAll('.mblocks__b').length===ALLOC_CAP
           && h.querySelector('.mblocks').getAttribute('aria-label')===want;
     }),
     document.querySelector('[data-qsec="m1"] .mblocks').getAttribute('aria-label'));
  /* AT MOST ONE LIVE BIKE EACH, and none for an idle mechanic. A person works
     one bike at a time; two On-going rows under one name would be the board
     contradicting the line above it. */
  ok('at most one on-going bike each, and none for an idle mechanic',
     MECHANICS.every(m => {
       const live = ALLOC.filter(b=>b.mech===m.id&&b.state==='live').length;
       return live === (m.status==='working' ? 1 : 0);
     }),
     MECHANICS.map(m=>m.name+':'+ALLOC.filter(b=>b.mech===m.id&&b.state==='live').length).join(' '));
  /* Expanding one shows THAT mechanic's bikes, every state together, each row
     saying where it has got to and carrying a duration. */
  document.querySelector('[data-qsec="m1"]').click();
  await new Promise(r=>setTimeout(r,60));
  ok('expanding one shows that mechanic\u2019s bikes, in every state',
     document.querySelectorAll('.qrow').length===ALLOC.filter(b=>b.mech==='m1').length
     && [...document.querySelectorAll('.qrow')].every(r=>
          ALLOC.some(b=>b.id===r.dataset.qbike&&b.mech==='m1'))
     /* Three states on screen at once, each row saying its own state in words. */
     && ['Pending since','On-going','Finished in'].every(w =>
          [...document.querySelectorAll('.qrow .sub')].some(e=>e.textContent.trim().startsWith(w))),
     [...new Set([...document.querySelectorAll('.qrow .sub')].map(e=>e.textContent.trim()))].join('/'));
  /* THE DURATION IS IN THE SUB-LINE, written out, for every state but the one
     that is running. "43m" alone on the right had to be read against the word
     on the left to mean anything, and it meant something different on each of
     the three. The right-hand column is left for the live clock, so that space
     says one thing on this board: somebody is on that bike right now. */
  ok('only the live row keeps the right-hand column, and it ticks',
     [...document.querySelectorAll('.qrow')].every(r => {
       const live = r.querySelector('.sub').textContent.trim()==='On-going';
       const wait = r.querySelector('.wait').textContent.trim();
       return !r.querySelector('.pct')
           && (live ? /^\d+m \d\d s?$|^\d+m \d\ds$/.test(wait) : wait==='');
     }),
     [...document.querySelectorAll('.qrow')].map(r=>r.querySelector('.wait').textContent.trim()||'-').join('/'));
  /* And it is a CLOCK, not a number that happens to have seconds in it: the
     element carries the moment the work started and the text is derived from
     it, so a second later is a different string.

     Asserted against the ANCHOR rather than by waiting a second and looking
     again. This suite runs headless under virtual time, where a real-time
     interval is not guaranteed to fire — a test that waited would be testing
     the harness. The tick itself is verified in the browser. */
  {
    const el = document.querySelector('[data-live-from]');
    const from = +el.dataset.liveFrom;
    ok('the live clock is anchored to when the work started, and derived',
       from > 0 && from < Date.now()
       && el.textContent.trim()===fmtLive(from)
       && fmtLive(from - 1000)!==fmtLive(from),
       el.textContent.trim()+' from '+new Date(from).toLocaleTimeString());
  }
  /* No average: the rows measure three different things, so a mean across them
     is a number about nothing. */
  ok('and the board carries no average',
     document.getElementById('qAvgBar').hidden
     && !document.getElementById('scrQueue').classList.contains('has-avg'), 'shown');
  document.querySelector('[data-qsec="m1"]').click();
  await new Promise(r=>setTimeout(r,60));
  /* And the two blocks do not overlap: every bike in the yard is in exactly one
     of them. */
  ok('the two blocks are one yard split in two, with no bike in both',
     !ALLOC_ALL().filter(b=>!b.allocated).some(u => ALLOC.some(a => a.id===u.id)),
     ALLOC_ALL().filter(b=>!b.allocated).length+' + '+ALLOC.length);
  SHIFT.role = wasRole; goTo('home'); await new Promise(r=>setTimeout(r,450));
}

/* ── ASSESSMENT DONE ───────────────────────────────────────────────────────
   The other half of the QCA's day. Five bikes are seeded there, and they are the
   SAME bikes as Assessment pending — spliced out of one array into the other, so
   the two counts are one fleet split in two and nothing can appear in both. */
/* THE WHOLE YARD between them, whatever the split — the number that must hold is
   that no bike is lost or duplicated when one moves. An earlier block in this
   file signs an assessment off, so the split itself has already shifted by the
   time we get here; asserting a literal split would be asserting the order of
   the file.

   Against YARD rather than a literal total. The literal was 21, and it failed
   the moment the fixture grew — which is a test reporting its own staleness, not
   a bike going missing. YARD is captured in fleets.js before anything is spliced,
   so this still catches the failure it is for. */
ok('the two lists share one fleet and never overlap',
   FLEET.length + DONE.length === YARD && DONE.length >= 5
   && !DONE.some(d => FLEET.some(f => f.id===d.id)),
   FLEET.length+' pending / '+DONE.length+' done');
/* Every reason on a seeded record has to be in that part's OWN catalogue. One
   that is not renders as a chip nobody can unset — the record would be showing a
   fault the app has no way to describe. */
ok('every seeded fault names a real part and real reasons',
   DONE.every(d => d.assessment.faults.every(f => {
     const part = PARTS.find(p => p.name === f.part);
     return part && f.reasons.every(r => part.reasons.includes(r))
       && ['no','minor','major'].includes(f.penalty);})),
   DONE.map(d=>d.assessment.faults.map(f=>f.part).join('+')||'clean').join(' / '));
/* Opening one loads THAT bike's findings into the working set. */
SHIFT.role='Quality Associate'; goTo('home'); await new Promise(r=>setTimeout(r,450));
ok('the pending card counts the list, not a fixture',
   document.querySelector('[data-task="assessment"] .n').textContent===String(FLEET.length),
   document.querySelector('[data-task="assessment"] .n').textContent);
/* Routed, not clicked. Sagar removed the Assessment done home card, so this
   listing has no entry point on the board any more — it is still the only place
   an assessed-but-not-transferred bike appears, which is why the block stays. If
   a way back in is ever built, this line becomes a click again. */
goTo('assessdone');
await new Promise(r=>setTimeout(r,450));
/* Two accordions over one list — assessed, then handed over — with the first
   open on arrival and the second shut. So the rows on screen are the first
   section's, not the whole list. Figma 2902:31870. */
ok('Assessment done opens its own listing, split in two',
   current==='assessdone'
   && [...document.querySelectorAll('.qsec-head')].map(h=>h.querySelector('span').textContent)
        .join('/')==='Assessment done/Transfer done'
   && document.querySelectorAll('.qrow').length===DONE.filter(b=>!b.transferred).length,
   current+' / '+document.querySelectorAll('.qrow').length+' rows');
/* No pack. It comes out before an assessment is signed off, so every row here
   shows the slot with nothing in it rather than a stale number — and nothing on
   this queue is ever red, because there is no pack to warn about. */
ok('every row reads -- %, and none of them is low',
   [...document.querySelectorAll('.qrow .pct')].every(e=>e.textContent==='-- %')
   && !document.querySelector('.qrow.is-low'),
   [...document.querySelectorAll('.qrow .pct')].map(e=>e.textContent).join('/'));
/* First open, second shut — and the chevron says which: down on the open one,
   right on the shut one, because it shows what a tap will do to the list below. */
ok('the first is open and the second is not, and the arrows agree',
   (()=>{const h=[...document.querySelectorAll('.qsec-head')];
     const rot = e => getComputedStyle(e.querySelector('.qsec-head__go')).transform;
     return h[0].classList.contains('is-open') && !h[1].classList.contains('is-open')
       && h[0].getAttribute('aria-expanded')==='true'
       && h[1].getAttribute('aria-expanded')==='false'
       && rot(h[0])!==rot(h[1]);})(),
   [...document.querySelectorAll('.qsec-head')].map(h=>h.getAttribute('aria-expanded')).join('/'));
/* Shut the first, open the second: the third frame. */
document.querySelector('[data-qsec="done"]').click();
document.querySelector('[data-qsec="transfer"]').click();
await new Promise(r=>setTimeout(r,60));
ok('tapping a head swaps which list is on screen',
   document.querySelectorAll('.qrow').length===DONE.filter(b=>b.transferred).length
   && !document.querySelector('.qsec-head--foot:not(.is-open)'),
   document.querySelectorAll('.qrow').length+' rows');
document.querySelector('[data-qsec="done"]').click();
document.querySelector('[data-qsec="transfer"]').click();
await new Promise(r=>setTimeout(r,60));
/* One sentence on every queue, this one included. It read "Avg. time since
   assessment" for a build — nothing in this list is waiting — and Sagar put it
   back to the shared wording. */
ok('and it carries the same average as every other queue',
   /^Avg\. wait time: /.test(document.getElementById('qAvg').textContent),
   document.getElementById('qAvg').textContent);
/* By id, not by "the one with three faults". An earlier block in this file signs
   an assessment off, so DONE holds records this block did not write — and one of
   them matched the shape while carrying different parts. A fixture picked by
   description finds whatever else happens to fit it. */
const doneBike = DONE.find(d => d.id === '5081366');
document.querySelector('[data-qbike="'+doneBike.id+'"]').click();
await new Promise(r=>setTimeout(r,450));
ok('a record opens on the task page with its step behind it', current==='job' && jobAt===1,
   current+' / '+jobAt);
ok('and the working set is that bike\u2019s findings, every other part good',
   PARTS.filter(p=>p.status==='faulty').map(p=>p.name).sort().join('|')
     === doneBike.assessment.faults.map(f=>f.part).sort().join('|')
   && PARTS.every(p=>p.status!=='pending'),
   PARTS.filter(p=>p.status==='faulty').map(p=>p.name).join('|'));
/* And the faults were FILED, so the dashboard's Mechanical row counts them
   rather than reading zero over a list that holds three. */
ok('the faults are filed against the bike, not just set on the parts',
   issuesTallyBy('Mechanical').total===doneBike.assessment.faults.length,
   issuesTallyBy('Mechanical').total+' filed');
goTo('rnm'); await new Promise(r=>setTimeout(r,450));
/* A finished assessment has been all the way through by definition. Without
   completeAssessFlow it would open with four hollow rings and a CTA offering to
   start a bike it calls done. */
const tickState = () => [...document.querySelectorAll('#rnPanelTasks .trow')]
  /* VISIBLE rows only. The panel holds both flows' rows and hides the other
     flow's — the repair's two fault rows on an assessment, the assessment's
     merged one on a repair — and a hidden row reports a mark nobody can see. */
  .filter(r => r.offsetParent !== null)
  .sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)
  .map(r=>r.querySelector('.trow__tick svg circle[fill="#00654F"]') ? 'done' : 'open')
  .join('/');
ok('the dashboard opens it finished, with nothing outstanding',
   tickState()==='done/done/done'
   && document.getElementById('btnAssessStep').textContent==='Next step'
   && document.getElementById('btnAssessStep').classList.contains('btn-primary'),
   tickState()+' / '+document.getElementById('btnAssessStep').textContent);

/* THE RESET. Opening a finished bike and then a pending one used to leave the
   pending bike wearing the finished one's faults — the working set is one set of
   globals and nothing ever put it back. This is the assertion that would have
   caught it. */
goTo('task'); await new Promise(r=>setTimeout(r,450));
const pendingId = FLEET[0].id;
document.querySelector('[data-qbike="'+pendingId+'"]').click();
await new Promise(r=>setTimeout(r,450));
ok('a pending bike opened after a finished one starts from nothing',
   PARTS.every(p=>p.status==='pending' && p.penalty===null)
   && issuesTallyBy('Mechanical').total===0,
   PARTS.filter(p=>p.status!=='pending').length+' judged, '
     +issuesTallyBy('Mechanical').total+' filed');

/* SIGN-OFF MOVES THE BIKE. */
const wasPending = FLEET.length, wasDone = DONE.length;
goTo('rnm'); await new Promise(r=>setTimeout(r,450));
PARTS.forEach(p=>{p.status='good'; p.penalty=null;});
PARTS[4].status='faulty'; PARTS[4].reasons_selected=['Cut']; PARTS[4].penalty='minor';
PARTS.forEach(fileAssessmentFault);
RnM.completeAssessFlow(); enterRnm();
document.getElementById('btnAssessStep').click();
await new Promise(r=>setTimeout(r,450));
ok('Finish moves the bike from pending to done, carrying what was found',
   FLEET.length===wasPending-1 && DONE.length===wasDone+1
   && DONE[0].id===pendingId
   && DONE[0].assessment.faults.length===1
   && DONE[0].assessment.faults[0].part==='Tyre',
   FLEET.length+' pending / '+DONE.length+' done / '+DONE[0].id);
/* Twice over the same bike updates its record rather than listing it again. */
document.getElementById('btnAssessStep').click();
await new Promise(r=>setTimeout(r,450));
ok('and signing the same bike off twice does not list it twice',
   DONE.length===wasDone+1 && DONE.filter(b=>b.id===pendingId).length===1,
   DONE.length+' done');
/* Put the fleets back, so nothing downstream counts a list this block edited. */
DONE.shift(); FLEET.unshift({id:pendingId, model:'Miracle', waitMins:40, battery:12, issue:'mech'});
jobAt = 0;

/* ── THE ASSESSMENT IS A SEQUENCE ──────────────────────────────────────────
   THREE rows in working order and one button that walks them. It was five: the
   checklist and its penalties are one step split into two tabs, and so are the
   two fault sections — neither pair is two jobs. Asserted from a clean start,
   because the whole point is the order it goes in. */
PARTS.forEach(p=>{p.status='pending'; p.penalty=null; p.reasons_selected=[];});
PARTS.forEach(fileAssessmentFault);
RnM.resetAssessFlow();
jobKind='assessment'; goTo('rnm'); await new Promise(r=>setTimeout(r,450));
const stepBtn = document.getElementById('btnAssessStep');
ok('the checklist is a row, not a button under the rows',
   !document.getElementById('btnAssessChecklist')
   && document.querySelector('#rowAssess .trow__name').textContent==='Assessment checklist',
   document.querySelector('#rowAssess .trow__name').textContent);
ok('and its sub-line says where the step stands, not a count',
   document.getElementById('countAssess').textContent==='Pending',
   document.getElementById('countAssess').textContent);
/* A dashed ring on every row until the step behind it is done — the same two
   marks the checklist puts on a part, which is the one place in this app that
   already means "not yet" and "done".

   tickState, declared with the Assessment done block above, reads the marks in
   VISUAL order: the rows are reordered by `order` in tasksheet.css, so a
   DOM-order read would report the sequence in the repair's arrangement and every
   expectation below would be a puzzle to check against the screen. */
const ticks = tickState;
ok('every step opens un-ticked', ticks()==='open/open/open', ticks());
ok('nothing done yet, so the button invites', stepBtn.textContent==='Start', stepBtn.textContent);
stepBtn.click(); await new Promise(r=>setTimeout(r,450));
ok('Start enters step 1, on its first tab', current==='assess'
   && document.querySelector('#assessTabs .steptab.is-on').dataset.steptab==='assess',
   current);
/* Dead until there is something to price. A penalty is marked against a fault;
   with none found there is nothing on the other side, and a live tab onto an
   empty screen teaches a QCA the flow is broken. */
ok('the Penalties tab is dead while nothing is faulty',
   (()=>{const t = document.querySelector('#assessTabs [data-steptab="penalty"]');
     if (t.getAttribute('aria-disabled') !== 'true') return false;
     t.click();
     return current === 'assess';})(),
   document.querySelector('#assessTabs [data-steptab="penalty"]').getAttribute('aria-disabled'));
ok('and the strip names the two halves of it',
   [...document.querySelectorAll('#assessTabs .steptab')]
     .map(t=>t.querySelector('span').textContent).join('/')==='Assessment/Penalties',
   [...document.querySelectorAll('#assessTabs .steptab')]
     .map(t=>t.querySelector('span').textContent).join('/'));
/* Half-done is not done. */
PARTS[0].status='good';
document.getElementById('assessBack').click(); await new Promise(r=>setTimeout(r,450));
/* AND THE FOOTER IS GONE while the assessment is in flight. The rows above are
   the flow — each tappable, each saying where it has got to — so a button
   repeating whichever is next was a second way to do one thing. It comes back
   at the end as the primary Task done. */
ok('once started, the step button is out of the frame',
   document.getElementById('rnAssessFoot').classList.contains('is-away'),
   'still up');
ok('a part judged does not finish the step',
   document.getElementById('countAssess').textContent==='Pending'
   && ticks()==='open/open/open',
   document.getElementById('countAssess').textContent+' / '+ticks());
/* Every part judged and nothing faulty: BOTH halves of the step are done, so the
   row reads Finished and the button moves to the next one. A faulty part left
   unpriced would hold it — that case is asserted further down. */
PARTS.forEach(p=>{ if (p.status==='pending') p.status='good'; });
enterRnm();
ok('every part judged, with nothing to price, finishes the whole step',
   document.getElementById('countAssess').textContent==='Finished'
   && ticks()==='done/open/open'
   /* And the footer stays away: the rows are the flow while it is in flight. */
   && document.getElementById('rnAssessFoot').classList.contains('is-away'),
   document.getElementById('countAssess').textContent+' / '+ticks());
/* The CHECKLIST's own CTA goes to the tab beside it, not to the next step: the
   penalties are the second half of the same piece of work. */
goTo('assess'); await new Promise(r=>setTimeout(r,450));
/* Nothing faulty, so nothing to price: the CTA skips the dead tab and names the
   next step instead. A button still offering Mark penalties would be a door
   through a wall the strip has just built. */
ok('with nothing faulty the CTA skips the dead tab',
   document.getElementById('nextBtn').textContent==='Check faults'
   && document.getElementById('assessFooter').classList.contains('is-shown'),
   document.getElementById('nextBtn').textContent);
/* One faulty part, and both come to life together. */
PARTS[4].status='faulty'; PARTS[4].reasons_selected=['Cut']; PARTS[4].penalty=null;
PARTS.forEach(fileAssessmentFault); enterAssess();
ok('one faulty part brings the tab and the CTA to life together',
   document.querySelector('#assessTabs [data-steptab="penalty"]').getAttribute('aria-disabled')==='false'
   && document.getElementById('nextBtn').textContent==='Mark penalties',
   document.getElementById('nextBtn').textContent);
document.getElementById('nextBtn').click(); await new Promise(r=>setTimeout(r,450));
ok('which is Mark penalties, with the strip following',
   current==='faults'
   && document.querySelector('#faultsTabs .steptab.is-on').dataset.steptab==='penalty',
   current);
/* Priced, which is what the tab is for — and only then is the merged step done
   and the sequence able to move on. */
PARTS[4].penalty='no'; renderFaults();
await new Promise(r=>setTimeout(r,60));
/* And from there the CTA is the sequence's again. */
ok('and from there the CTA names the next step',
   document.querySelector('#faultsNext span').textContent==='Check faults',
   document.querySelector('#faultsNext span').textContent);
document.getElementById('faultsNext').click(); await new Promise(r=>setTimeout(r,450));
ok('the fault record opens on the mechanical tab',
   current==='issues' && document.querySelector('.iq-tab.is-on').dataset.iqtab==='Mechanical',
   current+' / '+document.querySelector('.iq-tab.is-on').dataset.iqtab);
ok('and the other section is a tab beside it, not a second step',
   document.querySelectorAll('#iqTabs .iq-tab').length===2
   && !document.getElementById('iqTabs').hidden,
   document.querySelectorAll('#iqTabs .iq-tab').length+' tabs');
/* Each tab carries its own count — issuesTallyBy, not ISSUES, because that array
   is inside the screen's own closure and this file only sees what it publishes. */
ok('and both tabs count their own section',
   [...document.querySelectorAll('#iqTabs .iq-tab')].every(t =>
     t.querySelector('.iq-tab__n').textContent
       === String(issuesTallyBy(t.dataset.iqtab).total)),
   [...document.querySelectorAll('#iqTabs .iq-tab')]
     .map(t=>t.dataset.iqtab+' '+t.querySelector('.iq-tab__n').textContent).join(' / '));
/* The section's own action sits under its tab rather than in the footer: adding
   an issue is something you do on this list, not the way off the screen. */
ok('the section action sits under the tabs, and the footer holds the confirm and the CTA',
   document.getElementById('iqMarkBtn').parentElement.id==='iqAction'
   && !document.getElementById('iqConfirm').hidden
   && !!document.getElementById('iqDoneBtn').closest('#iqFooter'),
   document.getElementById('iqMarkBtn').parentElement.id);
ok('and it names the section it acts on',
   document.getElementById('iqMarkLabel').textContent==='Add issues',
   document.getElementById('iqMarkLabel').textContent);
/* NO banner here, and that is the point of it. Every other step screen REPORTS
   its step as finished; nothing on this one can be measured, so the QCA is asked
   and the CTA stays disabled until they answer. Figma 2913:32124. And the CTA
   says "Next" rather than naming the step: two tabs and a confirmation in one
   strip is already three things saying where the QCA is. */
ok('the fault record asks rather than reports, and holds the CTA until it is told',
   document.getElementById('iqBanner').hidden
   && document.getElementById('iqConfirm').getAttribute('aria-checked')==='false'
   && document.getElementById('iqDoneBtn').disabled
   && document.getElementById('iqDoneBtn').textContent==='Next',
   'checked '+document.getElementById('iqConfirm').getAttribute('aria-checked')
     +' / disabled '+document.getElementById('iqDoneBtn').disabled);
document.querySelector('[data-iqtab="Electrical"]').click();
await new Promise(r=>setTimeout(r,60));
ok('tapping a tab swaps the list without leaving the step',
   current==='issues' && document.querySelector('.iq-tab.is-on').dataset.iqtab==='Electrical',
   document.querySelector('.iq-tab.is-on').dataset.iqtab);
document.getElementById('iqConfirm').click();
ok('ticking it finishes the step, and the CTA still just says Next',
   document.getElementById('iqConfirm').getAttribute('aria-checked')==='true'
   && !document.getElementById('iqDoneBtn').disabled
   && document.getElementById('iqDoneBtn').textContent==='Next',
   document.getElementById('iqDoneBtn').textContent);
document.getElementById('iqDoneBtn').click(); await new Promise(r=>setTimeout(r,450));
ok('which is the last of the three', current==='checklists', current);
ok('so its CTA is the end of the assessment, and live',
   document.querySelector('#clNext span').textContent==='Assessment done'
   && !document.getElementById('clNext').disabled
   && !document.getElementById('clFoot').classList.contains('is-editing'),
   document.querySelector('#clNext span').textContent);
/* An edit takes the primary away until it is committed or abandoned. Back is the
   other way out, which is why disabling the primary traps nobody. */
document.querySelector('#clList .cl-item[data-cl="mre"]').click();
ok('an edit disables it and grows Update in above it',
   document.getElementById('clNext').disabled
   && document.getElementById('clFoot').classList.contains('is-editing'),
   'disabled '+document.getElementById('clNext').disabled);
document.getElementById('clBack').click(); await new Promise(r=>setTimeout(r,450));
document.getElementById('rowChecks').click(); await new Promise(r=>setTimeout(r,450));
ok('backing out discards it and the CTA is live again',
   activeChecklistCount()===2 && !document.getElementById('clNext').disabled
   && !document.getElementById('clFoot').classList.contains('is-editing'),
   activeChecklistCount()+' / disabled '+document.getElementById('clNext').disabled);
document.querySelector('#clList .cl-item[data-cl="mre"]').click();
document.getElementById('clUpdate').click(); await new Promise(r=>setTimeout(r,450));
ok('and committing it does the same, without leaving the page',
   current==='checklists' && activeChecklistCount()===3
   && !document.getElementById('clNext').disabled,
   current+' / '+activeChecklistCount());
document.querySelector('#clList .cl-item[data-cl="mre"]').click();
document.getElementById('clUpdate').click(); await new Promise(r=>setTimeout(r,450));
document.getElementById('clBack').click(); await new Promise(r=>setTimeout(r,450));
/* THE FOOTER COMES BACK, as a primary. Nothing on the page is a step any more,
   so the one action left is closing the job — the one moment on this screen
   that earns a filled button. */
ok('and with nothing outstanding the button is a primary Next step',
   stepBtn.textContent==='Next step' && ticks()==='done/done/done'
   && stepBtn.classList.contains('btn-primary')
   && !document.getElementById('rnAssessFoot').classList.contains('is-away'),
   stepBtn.textContent+' / '+ticks());
/* Next step is the one control in the assessment that closes its dashboard
   step and hands the QCA back to the task. */
stepBtn.click(); await new Promise(r=>setTimeout(r,450));
ok('Finish signs the step off and returns to the job', current==='job' && jobAt===1,
   current+' / '+jobAt);
/* Tapping a row does the same as the button reaching it — one route in, one
   place that records the visit. */
jobAt=0; RnM.resetAssessFlow(); goTo('rnm'); await new Promise(r=>setTimeout(r,450));
ok('the rows are the same steps, un-ticked again except the checklist',
   ticks()==='done/open/open', ticks());
document.getElementById('rowFaults').click(); await new Promise(r=>setTimeout(r,450));
document.getElementById('iqConfirm').click();
window.YuzenIQ.onBack(); await new Promise(r=>setTimeout(r,450));
ok('a row tapped out of order still counts as visited',
   ticks()==='done/done/open'
   && document.getElementById('rnAssessFoot').classList.contains('is-away'),
   ticks()+' / '+stepBtn.textContent);


/* ── THE STEP CTA TRAVELS WITH THE QCA ─────────────────────────────────────
   The dashboard's button walks the five steps; so does a button on each step
   screen, so nobody has to come back to the list to find out what is next. All
   of them read one pair of functions — RnM.nextStepLabel and RnM.advance — which
   is what keeps them agreeing.

   The rule is NEXT OUTSTANDING, not "the one after this". Walked in order it
   comes to the same thing; jumped into out of order it does not, and the second
   case is the one worth asserting. */
/* One priced fault, not none: the Penalties tab is dead while there is nothing
   to price, so a fleet of good parts would leave this block tapping a tab the
   strip has switched off. */
PARTS.forEach(p=>{p.status='good'; p.penalty=null;});
PARTS[4].status='faulty'; PARTS[4].reasons_selected=['Cut']; PARTS[4].penalty='no';
PARTS.forEach(fileAssessmentFault);
RnM.resetAssessFlow();
jobKind='assessment'; goTo('rnm'); await new Promise(r=>setTimeout(r,450));
/* Through the checklist's second TAB — the Penalty row is gone from the
   dashboard, because the penalties are the second half of the checklist step. */
document.getElementById('rowAssess').click(); await new Promise(r=>setTimeout(r,450));
document.querySelector('#assessTabs [data-steptab="penalty"]').click();
await new Promise(r=>setTimeout(r,450));
ok('Mark penalties offers the next step once every penalty is set',
   current==='faults'
   && document.getElementById('ffooter').classList.contains('is-shown')
   && document.querySelector('#faultsNext span').textContent==='Check faults',
   document.querySelector('#faultsNext span').textContent);
document.getElementById('faultsNext').click(); await new Promise(r=>setTimeout(r,450));
/* And a banner above it says the step in front of you is finished — Figma
   2913:32071. The button says where you are going; nothing said whether the
   thing you were standing on was actually done, and on the checklist, where the
   footer arrives silently once the last part is judged, the appearance of a
   button was the only confirmation a QCA got. */
/* "Penalties marked", not "Mark penalties done" — the label with a word stuck on
   the end is the instruction repeated, and the banner is reporting an outcome.
   Steps whose two sentences coincide still fall back to "<label> done". */
ok('and a banner over it names what was just finished',
   !document.getElementById('faultsBanner').hidden
   && document.querySelector('#faultsBanner .stepbanner__t').textContent==='Penalties marked',
   document.querySelector('#faultsBanner .stepbanner__t').textContent);
ok('and it goes there directly, without going via the dashboard', current==='issues', current);
/* One rule, four screens: the banner reads the same stepDone the dashboard's
   ticks do, so a screen cannot claim to be finished while its row says it is
   not. On the fault record it names the SECTION, because that screen is two
   steps wearing one set of chrome. */
/* An assessment READS this record. No Resolve buttons, no open/closed marks, and
   the heading counts HOW MANY rather than how many of how many — "0/3" is a score
   for work that is not the QCA's, on a list they cannot move. The repair still
   closes faults here and still counts them that way. */
/* An assessment READS this record. No Resolve buttons, no open/closed marks, and
   no heading over the list — the tabs above it already name the section and carry
   its count, and a title repeating both was the third place on one screen saying
   "Mechanical". The repair keeps all three. */
ok('the record is read-only on this side, with no heading over it',
   !document.querySelector('#iqList .issue__tick')
   && !document.querySelector('#iqList .issue__mark')
   && document.getElementById('iqHead').hidden,
   document.querySelectorAll('#iqList .issue__tick').length+' resolve buttons, head hidden '
     +document.getElementById('iqHead').hidden);
/* NO banner on this screen, and that is the point of it. Every other step screen
   REPORTS its step as finished; here nothing can be measured — reading a fault
   list and deciding it is complete leaves no trace — so the QCA is asked, and the
   CTA opposite stays disabled until they answer. Figma 2913:32124. */
ok('the fault record asks rather than reports, and holds the CTA until it is told',
   document.getElementById('iqBanner').hidden
   && document.getElementById('iqConfirm').getAttribute('aria-checked')==='false'
   && document.getElementById('iqDoneBtn').disabled,
   'checked '+document.getElementById('iqConfirm').getAttribute('aria-checked')
     +' / disabled '+document.getElementById('iqDoneBtn').disabled);
document.getElementById('iqConfirm').click();
ok('and ticking it finishes the step',
   document.getElementById('iqConfirm').getAttribute('aria-checked')==='true'
   && !document.getElementById('iqDoneBtn').disabled,
   'disabled '+document.getElementById('iqDoneBtn').disabled);
/* An assessment does not CLOSE faults here, it reads them — a bike with three
   unresolved electrical faults is a perfectly complete assessment. So the
   button is always live, where a repair holds it back until the section is
   cleared. */
/* Always THERE, unlike a repair's, which waits for the section to be cleared —
   an assessment reads that record rather than closing it. What it waits for
   instead is the QCA's own tick beside it — already given, a few lines up. */
ok('the fault record offers the next step once it is told the step is done',
   !document.getElementById('iqDoneBtn').hidden
   && !document.getElementById('iqDoneBtn').disabled
   && document.getElementById('iqDoneBtn').textContent==='Next',
   document.getElementById('iqDoneBtn').textContent);
document.getElementById('iqDoneBtn').click(); await new Promise(r=>setTimeout(r,450));
ok('which is the last of the four', current==='checklists', current);
ok('so its CTA is the end of the assessment, and live',
   document.querySelector('#clNext span').textContent==='Assessment done'
   && !document.getElementById('clNext').disabled
   && !document.getElementById('clFoot').classList.contains('is-editing'),
   document.querySelector('#clNext span').textContent);
/* An edit takes the primary away until it is committed or abandoned. Back is the
   other way out, which is why disabling the primary traps nobody. */
document.querySelector('#clList .cl-item[data-cl="mre"]').click();
ok('an edit disables it and grows Update in above it',
   document.getElementById('clNext').disabled
   && document.getElementById('clFoot').classList.contains('is-editing'),
   'disabled '+document.getElementById('clNext').disabled);
document.getElementById('clBack').click(); await new Promise(r=>setTimeout(r,450));
document.getElementById('rowChecks').click(); await new Promise(r=>setTimeout(r,450));
ok('backing out discards it and the CTA is live again',
   activeChecklistCount()===2 && !document.getElementById('clNext').disabled
   && !document.getElementById('clFoot').classList.contains('is-editing'),
   activeChecklistCount()+' / disabled '+document.getElementById('clNext').disabled);
document.querySelector('#clList .cl-item[data-cl="mre"]').click();
document.getElementById('clUpdate').click(); await new Promise(r=>setTimeout(r,450));
ok('and committing it does the same, without leaving the page',
   current==='checklists' && activeChecklistCount()===3
   && !document.getElementById('clNext').disabled,
   current+' / '+activeChecklistCount());
document.querySelector('#clList .cl-item[data-cl="mre"]').click();
document.getElementById('clUpdate').click(); await new Promise(r=>setTimeout(r,450));
document.getElementById('clNext').click(); await new Promise(r=>setTimeout(r,450));
ok('Assessment done signs the job off', current==='job' && jobAt===1, current+' / '+jobAt);

/* A FAULT ADDED AFTER THE FACT re-opens the penalty step.
   The case Sagar found: go back into a finished checklist, mark a good part
   faulty, and the new fault arrives with no penalty against it — but the step
   was ticked on "visited", so it stayed ticked, the dashboard said "No penalty",
   and the assessment could be signed off with a fault nobody had priced. */
PARTS.forEach(p=>{p.status='good'; p.penalty=null; p.reasons_selected=[];});
PARTS.forEach(fileAssessmentFault);
RnM.resetAssessFlow();
goTo('rnm'); await new Promise(r=>setTimeout(r,450));
['rowPenalty','rowFaults','rowChecks'].forEach(id => {
  document.getElementById(id).click();
  /* The fault record is the one step that has to be told it is finished. */
  if (id === 'rowFaults') document.getElementById('iqConfirm').click();
});
goTo('rnm'); await new Promise(r=>setTimeout(r,450));
ok('with nothing faulty the whole sequence is done',
   ticks()==='done/done/done' && stepBtn.textContent==='Next step',
   ticks()+' / '+stepBtn.textContent);
/* Back into the checklist, and one part goes bad. */
goTo('assess'); await new Promise(r=>setTimeout(r,450));
PARTS[0].status='faulty'; PARTS[0].reasons_selected=['Error code'];
fileAssessmentFault(PARTS[0]);
enterAssess();
ok('the checklist still points at its own second tab',
   document.getElementById('nextBtn').textContent==='Mark penalties',
   document.getElementById('nextBtn').textContent);
goTo('rnm'); await new Promise(r=>setTimeout(r,450));
/* The merged step re-opens: its first half is still finished, its second is not,
   and the row says WHICH — "Pending" here would point at the wrong tab. */
/* And the footer goes away again with it: something is outstanding, so the
   rows are the flow once more and there is nothing to close. */
ok('and the step is open again on the dashboard',
   ticks()==='open/done/done'
   && document.getElementById('rnAssessFoot').classList.contains('is-away')
   && document.getElementById('countAssess').textContent==='1 penalty pending',
   ticks()+' / '+document.getElementById('countAssess').textContent);
/* And the sub-line counts what is WAITING rather than reporting the absence of
   an answer as an answer. */
ok('the row says what is pending, not "No penalty"',
   document.getElementById('countPenalty').textContent==='1 pending',
   document.getElementById('countPenalty').textContent);
/* Pricing it closes the step again — and "No" is an answer, so it counts. */
stepBtn.click(); await new Promise(r=>setTimeout(r,450));
document.querySelector('#assessTabs [data-steptab="penalty"]').click();
await new Promise(r=>setTimeout(r,450));
ok('Mark penalties holds its CTA back while the new fault is unpriced',
   current==='faults' && !document.getElementById('ffooter').classList.contains('is-shown'),
   document.getElementById('ffooter').className);
PARTS[0].penalty='no'; renderFaults();
await new Promise(r=>setTimeout(r,450));
ok('answering it — even with No — closes the step and ends the assessment',
   document.getElementById('ffooter').classList.contains('is-shown')
   && document.querySelector('#faultsNext span').textContent==='Assessment done',
   document.querySelector('#faultsNext span').textContent);
document.getElementById('faultsBack').click(); await new Promise(r=>setTimeout(r,450));
ok('and the dashboard agrees', ticks()==='done/done/done'
   && document.getElementById('countPenalty').textContent==='No penalty',
   ticks()+' / '+document.getElementById('countPenalty').textContent);

/* OUT OF ORDER. Everything done except the checklist step, and the QCA opens the
   picker straight off the list: the CTA has to point BACK at it rather than
   forward to the step after this one. One faulty part left unpriced is what
   holds it — the merged step needs every part judged AND every fault it turned
   up priced. */
jobAt=0; RnM.resetAssessFlow();
PARTS.forEach(p=>{p.status='good'; p.penalty=null;});
PARTS[4].status='faulty'; PARTS[4].reasons_selected=['Cut']; PARTS[4].penalty=null;
PARTS.forEach(fileAssessmentFault);
goTo('rnm'); await new Promise(r=>setTimeout(r,450));
document.getElementById('rowFaults').click(); await new Promise(r=>setTimeout(r,450));
document.getElementById('iqConfirm').click();
window.YuzenIQ.onBack(); await new Promise(r=>setTimeout(r,450));
document.getElementById('rowChecks').click(); await new Promise(r=>setTimeout(r,450));
ok('a step opened out of order points at what is actually outstanding',
   document.querySelector('#clNext span').textContent==='Assessment checklist',
   document.querySelector('#clNext span').textContent);
document.getElementById('clNext').click(); await new Promise(r=>setTimeout(r,450));
ok('and goes there, not to the step after this one', current==='assess', current);
/* Priced, and the whole thing closes. */
PARTS[4].penalty='no'; enterAssess();
document.getElementById('assessBack').click(); await new Promise(r=>setTimeout(r,450));
ok('pricing it leaves nothing outstanding',
   stepBtn.textContent==='Next step' && ticks()==='done/done/done'
   && !document.getElementById('rnAssessFoot').classList.contains('is-away'),
   stepBtn.textContent+' / '+ticks());

/* ── PENALTIES ARE THE CHECKLIST'S SECOND TAB ──────────────────────────────
   There is no Penalty row any more: the dashboard has one row for the checklist
   and its penalties, and the strip inside switches between them. Both screens
   still come BACK to the dashboard, which is the rule everywhere in this flow —
   backing out of a step returns to the list of steps. */
jobKind='assessment'; goTo('rnm'); await new Promise(r=>setTimeout(r,450));
ok('there is no Penalty row left on the dashboard',
   document.getElementById('rowPenalty').offsetParent === null, 'still shown');
document.getElementById('rowAssess').click(); await new Promise(r=>setTimeout(r,450));
document.querySelector('#assessTabs [data-steptab="penalty"]').click();
await new Promise(r=>setTimeout(r,450));
ok('the Penalties tab opens Mark penalties', current==='faults', current);
document.getElementById('faultsBack').click();
await new Promise(r=>setTimeout(r,450));
ok('and its back returns to the dashboard, not the checklist', current==='rnm', current);
/* The other door. With one faulty part the checklist's CTA is its own second
   tab; with none it skips to the next step, because there would be nothing to
   price. */
PARTS.forEach(p=>{p.status='good'; p.penalty=null;});
PARTS[4].status='faulty'; PARTS[4].reasons_selected=['Cut'];
PARTS.forEach(fileAssessmentFault);
RnM.resetAssessFlow();
goTo('assess'); await new Promise(r=>setTimeout(r,450));
ok('the checklist\u2019s CTA points at its own second tab',
   document.getElementById('nextBtn').textContent==='Mark penalties',
   document.getElementById('nextBtn').textContent);
document.getElementById('nextBtn').click();
await new Promise(r=>setTimeout(r,450));
ok('Mark penalty at the end of the checklist still opens it', current==='faults', current);
document.getElementById('faultsBack').click();
await new Promise(r=>setTimeout(r,450));
/* And THAT back goes to the dashboard too. It went to the checklist for one
   build — the screen remembered which door it came through — which is wrong now
   the dashboard is a sequence: backing out of a step returns to the list of
   steps, not to whatever handed over. */
ok('and so does the back from the checklist\u2019s own door', current==='rnm', current);

/* ── ACTIVE CHECKLISTS ─────────────────────────────────────────────────────
   The dashboard's Active checklist row used to open the parts carousel, which
   is what its own BUTTON opens — so the row had no destination of its own and
   the count under it was answering the carousel's question ("17 active") rather
   than its own. It opens the picker now. */
jobKind='assessment'; goTo('rnm'); await new Promise(r=>setTimeout(r,450));
document.getElementById('rowChecks').click();
await new Promise(r=>setTimeout(r,450));
ok('the Active checklist row opens the picker, not the parts', current==='checklists', current);
ok('the page is titled Active checklists',
   document.querySelector('#scrChecklists .listhead h2').textContent.trim()==='Active checklists',
   document.querySelector('#scrChecklists .listhead h2').textContent.trim());
ok('every row carries the count of items inside it, not a chevron',
   [...document.querySelectorAll('#clList .cl-item')].every(r => /^\d+ items$/.test(r.querySelector('.cl-item__sub').textContent))
   && !document.querySelector('#clList svg[viewBox="0 0 24 24"] path[d^="M10.4538"]'),
   [...document.querySelectorAll('#clList .cl-item__sub')].map(e=>e.textContent).join(' | '));
/* The two running lists ARE the carousel, so between them they hold every part
   on it. Derived rather than typed — see CL_PERIODIC. */
ok('and the two running ones account for every part on the checklist',
   CHECKLISTS.filter(c=>c.on).reduce((n,c)=>n+c.items,0)===PARTS.length,
   CHECKLISTS.map(c=>c.name+' '+c.items).join(' | '));
/* The two the bike ARRIVED with are locked: ticked, and not removable. A QCA can
   add to what the bike was sent in for; they cannot quietly decide not to do it.
   Asserted by trying — the row is aria-disabled rather than disabled, so the tap
   lands and is refused in the handler, and only that proves the refusal. */
ok('the pre-assigned checklists are ticked and locked',
   [...document.querySelectorAll('#clList .cl-item')]
     .map(r=>r.dataset.cl+':'+r.getAttribute('aria-checked')+(r.getAttribute('aria-disabled')?':locked':''))
     .join(' | ')==='periodic:true:locked | monsoon:true:locked | mre:false | xyz:false',
   [...document.querySelectorAll('#clList .cl-item')]
     .map(r=>r.dataset.cl+':'+r.getAttribute('aria-checked')).join(' | '));
ok('and tapping one changes nothing at all',
   (()=>{document.querySelector('#clList .cl-item[data-cl="periodic"]').click();
     return document.querySelector('#clList .cl-item[data-cl="periodic"]').getAttribute('aria-checked')==='true'
       && !document.getElementById('clFoot').classList.contains('is-editing')
       && activeChecklistCount()===2;})(),
   document.querySelector('#clList .cl-item[data-cl="periodic"]').getAttribute('aria-checked'));

/* The whole row toggles, not just the box — asserted by clicking the NAME, which
   is the part of the row that used to do nothing. */
ok('tapping the row text toggles it',
   (()=>{const row = document.querySelector('#clList .cl-item[data-cl="mre"]');
     row.querySelector('.cl-item__name').click();
     const on = document.querySelector('#clList .cl-item[data-cl="mre"]').getAttribute('aria-checked')==='true';
     document.querySelector('#clList .cl-item[data-cl="mre"]').click();
     return on;})(),
   document.querySelector('#clList .cl-item[data-cl="mre"]').getAttribute('aria-checked'));
/* And it announces as one control rather than a row with a button inside it. */
ok('the row is the checkbox, not a container for one',
   document.querySelectorAll('#clList .cl-item[role="checkbox"]').length===4
   && !document.querySelector('#clList .cl-item button'),
   document.querySelectorAll('#clList .cl-item[role="checkbox"]').length);

/* A tick is a proposal until Update is pressed. Back is the way to change your
   mind, and it has to leave the record alone to be that. */
document.querySelector('#clList .cl-item[data-cl="xyz"]').click();
/* Dirty: Update appears and the primary goes disabled. Offering to move on from
   an uncommitted edit is how an edit gets lost, and there is no third state
   where both are live — "next" would have to choose between saving and
   discarding on the QCA's behalf. */
ok('ticking a fourth reveals Update and disables the step CTA',
   document.getElementById('clFoot').classList.contains('is-editing')
   && document.getElementById('clNext').disabled,
   document.getElementById('clFoot').className
     +', next disabled '+document.getElementById('clNext').disabled);
document.getElementById('clBack').click();
await new Promise(r=>setTimeout(r,450));
ok('backing out discards the tick', current==='rnm' && activeChecklistCount()===2,
   current+' / '+activeChecklistCount());
ok('and the row still counts checklists', document.getElementById('countChecks').textContent==='2 checklists',
   document.getElementById('countChecks').textContent);
/* And the page does not remember the abandoned draft on the way back in. */
document.getElementById('rowChecks').click();
await new Promise(r=>setTimeout(r,450));
ok('the abandoned tick is gone on return',
   !document.getElementById('clFoot').classList.contains('is-editing')
   && !document.getElementById('clNext').disabled
   && document.querySelectorAll('#clList .cl-item[aria-checked="true"]').length===2,
   document.querySelectorAll('#clList .cl-item[aria-checked="true"]').length);
/* Update commits and STAYS. It used to save and return to the dashboard, which
   made saving and leaving one act — a QCA who wanted to change the selection and
   carry on had to come back in. */
document.querySelector('#clList .cl-item[data-cl="xyz"]').click();
document.getElementById('clUpdate').click();
await new Promise(r=>setTimeout(r,450));
ok('Update commits without leaving, and hands the page back to the step CTA',
   current==='checklists' && activeChecklistCount()===3
   && !document.getElementById('clFoot').classList.contains('is-editing')
   && !document.getElementById('clNext').disabled,
   current+' / '+activeChecklistCount());
/* Untick back to two, so nothing after this block reads a dashboard it edited. */
document.querySelector('#clList .cl-item[data-cl="xyz"]').click();
document.getElementById('clUpdate').click();
await new Promise(r=>setTimeout(r,450));
ok('and back to two', activeChecklistCount()===2, activeChecklistCount());
document.getElementById('clBack').click(); await new Promise(r=>setTimeout(r,450));

document.title = 'RESULT' + JSON.stringify(out);
"""

doc = html + "\n<script>window.addEventListener('load',async()=>{" + CHECKS + "});</script>"
with tempfile.NamedTemporaryFile("w",suffix=".html",dir=pathlib.Path(__file__).parent,delete=False) as t:
    t.write(doc); p=pathlib.Path(t.name)
try:
    d=subprocess.run([CHROME,"--headless=new","--disable-gpu","--window-size=460,1000",
        # 120s of VIRTUAL time, not wall clock. The suite waits out real
        # transitions; when the budget runs out Chrome dumps the DOM mid-run and
        # the harness sees no RESULT at all — a hang, not a failure. Raised from
        # 45s when the morph tests pushed it over.
        "--virtual-time-budget=120000","--dump-dom",f"file://{p}"],
        capture_output=True,text=True,timeout=180).stdout
finally:
    p.unlink(missing_ok=True)

i=d.find("RESULT")
res=json.loads(H.unescape(d[i+6:d.find("</title>",i)]))
bad=[r for r in res if not r["pass"]]
for r in res: print(("PASS " if r["pass"] else "FAIL ")+r["t"]+("" if r["pass"] else f"   → got {r['got']}"))
print(f"\n{len(res)-len(bad)}/{len(res)} passed")
