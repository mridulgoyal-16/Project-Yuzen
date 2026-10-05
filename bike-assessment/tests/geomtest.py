import html as H, json, pathlib, subprocess, tempfile
SRC=pathlib.Path(__file__).resolve().parents[2]/"yuzen-flow"/"index.html"
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
html=SRC.read_text()

# Geometry that sits behind a transition is asserted with transitions disabled —
# headless Chrome does not tick them under virtual time.
CHECKS = r"""
document.head.insertAdjacentHTML('beforeend','<style>*{transition:none !important;animation:none !important}</style>');
const out=[];const ok=(n,c,d)=>out.push({t:n,pass:!!c,got:d});
const R=s=>document.querySelector(s).getBoundingClientRect();
const PB=()=>document.getElementById('phone').getBoundingClientRect().bottom;
/* A row whose pack is not flat. A 0% bike gets a revive step in front of the
   assessment's three and a plain button instead of the slide, so anything
   measuring the knob has to open a LIVE bike — and the board's default order
   puts the flattest packs at the top, so the first row is a dead one. See
   REVIVE_STEP in task-kinds.js. */
const LIVEROW=()=>[...document.querySelectorAll('#qList .qrow')]
  .find(r=>{const b=FLEET.find(f=>f.id===r.dataset.qbike); return b&&b.battery>0;});

// job page geometry, against Figma 2144:30682
{
  document.querySelector('[data-task="assessment"]').click();
  LIVEROW().click();
  ok('two 40px circular actions, 24px in from each edge',
     (()=>{const a=R('#jbClose'), b=R('#jbMore'), s=R('#scrJob');
       return Math.round(a.width)===40 && Math.round(b.width)===40
         && Math.round(a.left-s.left)===24 && Math.round(s.right-b.right)===24;})(),
     Math.round(R('#jbClose').width)+' / '+Math.round(R('#jbClose').left-R('#scrJob').left));
  ok('task number is 56px Black, centred, behind the bike',
     (()=>{const c=getComputedStyle(document.getElementById('jbNo'));
       return c.fontSize==='56px' && c.fontWeight==='900' && c.textAlign==='center';})(),
     getComputedStyle(document.getElementById('jbNo')).font);
  ok('the bike darkens over it so the number reads through',
     getComputedStyle(document.querySelector('.jb__bike')).mixBlendMode==='darken',
     getComputedStyle(document.querySelector('.jb__bike')).mixBlendMode);
  /* 380, was 395 — the title block moved up per Figma 2380:27352. The gradient
     behind it still runs 396, so the band overlaps its last 15px. */
  ok('title block starts at 380 with a hairline under it',
     Math.round(R('.jb__title').top - R('#scrJob').top)===380
     && getComputedStyle(document.querySelector('.jb__title')).borderBottomColor==='rgb(232, 232, 232)',
     Math.round(R('.jb__title').top - R('#scrJob').top));
  /* The three Learn-pill assertions that stood here — 88x36 on Surface/Secondary,
     24 in from the right, its 20px play_circle 8 from the left edge — went with the
     pill itself, removed from every task detail page at Sagar's request. They did
     not just fail: R('#jbLearn') returned null and getComputedStyle(null) threw,
     which killed the harness before it could emit any JSON at all. A geometry
     suite that measures a deleted node takes the whole run down with it. */
  /* EVERY step, not just the active one. They were 72 and 56, so completing a
     step made the rows under it jump 16px — asserted across the whole list now,
     because the rule is that they match, not that one of them measures 72.
     A step carrying a sub-line is exempt: it is taller because it says more. */
  ok('every step is a 72px band, active or not',
     (()=>{const hs=[...document.querySelectorAll('.jb__step')]
             .filter(el=>!el.querySelector('.prog'))
             .map(el=>Math.round(el.getBoundingClientRect().height));
           return hs.length>1 && hs.every(h=>h===72);})(),
     [...document.querySelectorAll('.jb__step')]
       .map(el=>Math.round(el.getBoundingClientRect().height)).join('/'));
  ok('indicators are 24px and 24px in',
     Math.round(R('.jb__step .dot').width)===24
     && Math.round(R('.jb__step .dot').left - R('#scrJob').left)===24,
     Math.round(R('.jb__step .dot').width));
  ok('the rail runs dot-centre to dot-centre',
     (()=>{const dots=[...document.querySelectorAll('.jb__step .dot')].map(d=>d.getBoundingClientRect());
       const rail=R('.jb__rail');
       return Math.abs(rail.top - (dots[0].top+12)) < 1
         && Math.abs(rail.bottom - (dots[dots.length-1].top+12)) < 1;})(),
     'rail '+Math.round(R('.jb__rail').top)+'-'+Math.round(R('.jb__rail').bottom));
  // collapsed: one bar carries the actions and the title, and covers the status strip
  {
    const sc=document.getElementById('jbScroll');
    sc.scrollTop = sc.scrollHeight; sc.dispatchEvent(new Event('scroll'));
    const bar=R('#jbBar'), t=R('#jbTitle');
    /* Behind the bar. The docked progress strip is gone — progress moved to the
       footer — so the header is the bar and nothing else, and everything that
       measured against the strip now measures against the bar's own bottom. */
    ok('the in-content title is fully behind the header, not beside it',
       t.bottom <= bar.bottom, Math.round(t.bottom - bar.bottom)+'px past');
    ok('the solid bar drops its hairline',
       getComputedStyle(document.getElementById('jbBar')).boxShadow==='none',
       getComputedStyle(document.getElementById('jbBar')).boxShadow);
    /* The scroll ends with the steps resting on the header, not riding up under
       it — the tail padding is measured to land exactly here. */
    ok('the list stops flush with the bottom of the bar',
       Math.round(R('#jbSteps').top - bar.bottom)===0,
       Math.round(R('#jbSteps').top - bar.bottom)+'px off');
    /* A slim full-bleed bar ON the footer's top edge, not a row inside it: it
       meets both frame edges and its top is the footer's top. */
    ok('progress is a slim bar on the footer top edge',
       (()=>{const p=R('#jbProg'), f=R('#scrJob .ffooter');
         return Math.round(p.top-f.top)===0 && Math.round(p.left-f.left)===0
             && Math.round(p.right-f.right)===0 && Math.round(p.height)===6;})(),
       Math.round(R('#jbProg').height)+'px, '
       +Math.round(R('#jbProg').width)+' of '+Math.round(R('#scrJob .ffooter').width));
    ok('bar carries close, title and more in one row',
       Math.round(R('#jbClose').left) < Math.round(R('.jb__barTitle').left)
       && Math.round(R('.jb__barTitle').right) <= Math.round(R('#jbMore').left),
       'order wrong');
    /* is-opaque, not is-solid: the bar takes its surface the moment the title
       touches it, and only puts its own title up once the page's has gone fully
       behind — two thresholds, because a short frame can run out of scroll
       mid-crossing and park the title on top of the buttons.
       getComputedStyle on a pseudo-element does not report this reliably in
       headless, so read the rule — the strip is verifiably white in the renders. */
    ok('and it reaches up over the status strip',
       (()=>{const r=[...document.styleSheets[0].cssRules]
               .find(x=>x.selectorText==='.jb__bar.is-opaque::before');
         const h=[...document.styleSheets[0].cssRules]
               .find(x=>x.selectorText==='.jb__bar::before');
         return !!r && r.style.backgroundColor.includes('surface-inverse')
             && h.style.height==='var(--status-h)';})(),
       'rule missing');
    ok('buttons drop their lift on a solid bar',
       getComputedStyle(document.getElementById('jbClose')).boxShadow==='none',
       getComputedStyle(document.getElementById('jbClose')).boxShadow);
    sc.scrollTop = 0; sc.dispatchEvent(new Event('scroll'));
  }
  document.getElementById('jbClose').click();
}

/* The ⋮ on Mark faults lands where the checklist's does: glyph 24 in from the
   edge. Measured per screen, since parked screens are translated. */
{
  const f=document.getElementById('faultsMore').getBoundingClientRect();
  const a=document.getElementById('assessMore').getBoundingClientRect();
  const fs=document.getElementById('scrFaults').getBoundingClientRect();
  const as=document.getElementById('scrAssess').getBoundingClientRect();
  ok('Mark faults carries a ⋮, aligned with the checklist\'s',
     Math.round(fs.right-(f.right-12))===24 && Math.round(as.right-(a.right-12))===24
     && Math.round(f.width)===48,
     Math.round(fs.right-(f.right-12))+' vs '+Math.round(as.right-(a.right-12)));
  /* It used to have the Customer photos pill on its left; with that gone it is
     the bar's only action, and the breadcrumb has the rest of the row. */
  ok('and it is the only action left in that bar, clear of the breadcrumb',
     (()=>{const t=document.querySelector('#faultsAppbar .appbar__titles p')
             .getBoundingClientRect();
       return !document.querySelector('#faultsAppbar .pill-btn')
         && Math.round(t.right) <= Math.round(f.left);})(),
     'pill gone');
}

/* The shift bar is pinned chrome: outside the scroller, so it neither slides
   down with the page's top padding nor scrolls away. */
/* It used to be pinned above the scroller so the shift status stayed on screen
   wherever you were on the page. Sagar reversed that — it scrolls with the rest of
   the content now — but it still rests in the same place: 44 status + 16. */
ok('shift bar scrolls with the page, and still rests at 60',
   document.getElementById('hmbody').contains(document.querySelector('.hm__shift'))
   && Math.round(R('.hm__shift').top - R('#scrHome').top)===60,
   Math.round(R('.hm__shift').top - R('#scrHome').top));
/* The shortcuts used to straddle the fold — half a tile showing, captions under
   the nav, so the row read as a deliberate peek. A third row of task cards ended
   that: the tiles now start below the fold outright and no amount of adjusting the
   94px gap brings them back (they would need to straddle 628 and start at 684 at
   best). So the peek is gone, and what is asserted instead is the invariant that
   motivated it — the fold must not cut through the middle of any text. Whether to
   buy the peek back by shortening the gap or the cards is Sagar's call; see the
   README's open items. */
ok('the fold does not slice through any label',
   (()=>{const b=document.getElementById('hmbody'), vb=b.clientHeight;
     const rel=e=>{const r=e.getBoundingClientRect(), br=b.getBoundingClientRect();
       return {t:r.top-br.top+b.scrollTop, b:r.bottom-br.top+b.scrollTop};};
     return [...b.querySelectorAll('.hm__task .n, .hm__task .l, .hm__sc .cap, .hm__heading p')]
       .every(e=>{const r=rel(e); return r.b<=vb || r.t>=vb;});})(),
   'a label straddles the fold');

/* Repairable bikes reuses the queue's chrome, so the two must measure the same
   where they overlap and differ only where they are meant to. */
{
  document.getElementById('scrHome') && goTo('repair');
  const S=document.getElementById('scrQueue').getBoundingClientRect();
  /* NO filter row here any more. It carried the Live / In-flow / Stock section
     chips — and their 72px band, their 40px pills and the Live presence dot went
     with them when Sagar took the row off this queue: a mechanic works down what
     they have been given rather than searching it. The band and the chips are
     still measured on Assessment pending, which keeps its own; what is asserted
     here is that this page gives the space back to the list. */
  ok('no filter row on the mechanic\'s queue, and the list takes the space',
     document.getElementById('qFilters').hidden
     && Math.round(R('#qList').top)===Math.round(R('#scrQueue .appbar').bottom),
     'hidden '+document.getElementById('qFilters').hidden
       +' / list at '+Math.round(R('#qList').top - R('#scrQueue .appbar').bottom));
  /* 76, the TIGHT row — the same one the Sr. Mechanic's board uses, because
     this list is now the same allocations read by the other profile. The 92px
     row is for a queue you scan; these are a day's work under one name.

     "Assigned to me" went with the fixture: every bike on this list is theirs,
     so a badge saying so on every row said nothing. */
  ok('every row is the tight 76, dividers inset 24',
     (()=>{const rows=[...document.querySelectorAll('#qList .qrow')];
       return rows.every(r=>Math.round(r.getBoundingClientRect().height)===76)
         && getComputedStyle(rows[0], '::after').left==='24px'
         && !document.querySelector('#qList .mine');})(),
     [...new Set([...document.querySelectorAll('#qList .qrow')]
       .map(r=>Math.round(r.getBoundingClientRect().height)))].join('/'));
  /* THE BAND TAKES THE FAB'S PLACE. On this list the bike in hand is always
     shown at the foot — see miniFor — so the scan button is only on screen when
     nothing is being worked on. Put aside and restored, because the rest of
     this block measures the list rather than the dock. */
  const wasLive = ALLOC.find(b => b.mech === ME && b.state === 'live');
  if (wasLive){ wasLive.state = 'pending'; renderQueue(); renderMinis(); }
  ok('with nothing in hand the FAB is the queue\'s, 56px bottom-right inset 24',
     (()=>{const f=R('#qScanFab');
       return Math.round(f.width)===56 && Math.round(S.right-f.right)===24;})(),
     Math.round(R('#qScanFab').width));
  /* Stamped icons must survive the pre-render without doubling: build.py ships
     the rendered DOM, so the stamp runs once at build and once on open. */
  /* There is one scan FAB now, not one per listing — the three queues are one
     template. That also retires the assertion that the two FABs drew the same
     glyph: they used to drift because there were two of them. */
  ok('stamped glyphs appear exactly once each',
     ['watchVideo','qScanFab']
       .every(id => document.getElementById(id).querySelectorAll('svg').length === 1),
     ['watchVideo','qScanFab']
       .map(id => id+':'+document.getElementById(id).querySelectorAll('svg').length).join(' '));
  ok('the glyph is drawn true size, not stretched to the button',
     (()=>{const g=R('#qScanFab svg'), b=R('#qScanFab');
       return g.width < b.width && Math.round(g.width)===24;})(),
     Math.round(R('#qScanFab svg').width)+' in '+Math.round(R('#qScanFab').width));
  /* And the band is back where the FAB was, once a bike is in hand again. */
  if (wasLive){ wasLive.state = 'live'; renderQueue(); renderMinis(); }
  ok('and with a bike in hand the band takes its place',
     !document.getElementById('qMini').hidden
     && getComputedStyle(document.querySelector('#scrQueue .qfabrow')).display==='none',
     getComputedStyle(document.querySelector('#scrQueue .qfabrow')).display);
  goTo('home');
}

/* Minimised task, against Figma 2191:24126 — a full-bleed 390x84 band at the foot
   of the screen with a 6px progress bar edge to edge on its top, text inset 24 and
   a bare 24px expand icon inset 24. */
{
  goTo('task');
  minimised.assessment = {bike:{id:'5080407', model:'DeX 3.0', battery:37},
                          at:1, step:'Remove battery', pct:60};
  renderMinis();
  const card = R('#qMini .minitask__card'), S = R('#scrQueue');
  const txt = R('#qMini .minitask__line1'), btn = R('#qMini .minitask__expand');
  const CS  = sel => getComputedStyle(document.querySelector(sel));
  ok('the parked band is 390 wide and 90 tall — 6 bar + 84 band',
     Math.round(card.width)===390 && Math.round(card.height)===90,
     Math.round(card.width)+'x'+Math.round(card.height));
  ok('it is full-bleed and inverted, square, and not lifted',
     CS('#qMini .minitask__card').borderRadius==='0px'
     && CS('#qMini .minitask__card').backgroundColor==='rgb(34, 34, 34)'
     && CS('#qMini .minitask__card').boxShadow==='none'
     && Math.round(card.left - S.left)===0,
     CS('#qMini .minitask__card').borderRadius+' / '
     + CS('#qMini .minitask__card').backgroundColor);
  /* Flush with the top of the average strip, which is this screen's floor now —
     the whole dock rides on it, so the band clears it the same way the FAB does. */
  ok('and it is flush with the top of the average strip',
     Math.round(R('.qavg').top - card.bottom)===0, Math.round(R('.qavg').top - card.bottom));
  ok('text inset 24, expand icon 24px inset 24',
     Math.round(txt.left-card.left)===24 && Math.round(btn.width)===24
     && Math.round(card.right-btn.right)===24,
     Math.round(txt.left-card.left)+' / '+Math.round(btn.width)
     +' / '+Math.round(card.right-btn.right));
  /* 6 bar + 16 above the first line, 24 below the second. The source is asymmetric. */
  ok('16 above the first line, 24 below the second',
     Math.round(txt.top - card.top)===22
     && Math.round(card.bottom - R('#qMini .minitask__line2').bottom)===24,
     Math.round(txt.top-card.top)+' / '
     + Math.round(card.bottom - R('#qMini .minitask__line2').bottom));
  /* content/disabled, not content/tertiary: tertiary was chosen against white and
     is too dark to sit on #222 at 14px. See the note in shared/minitask.css. */
  ok('the step line is Label/Small in content/disabled, not the pill 16/20',
     CS('#qMini .minitask__line2').fontSize==='14px'
     && CS('#qMini .minitask__line2').color==='rgb(176, 176, 176)',
     CS('#qMini .minitask__line2').fontSize+' / '+CS('#qMini .minitask__line2').color);
  ok('the bike number is content/inverse now the band is dark',
     CS('#qMini .minitask__line1').color==='rgb(255, 255, 255)',
     CS('#qMini .minitask__line1').color);
  /* The bar. This is why the band replaced the pill: edge to edge, so the low
     percentages that matter most are not eaten by a 40px radius. */
  {
    const bar = R('#qMini .minitask__bar'), fill = R('#qMini .minitask__bar i');
    ok('the progress bar is 6px and runs the full width, edge to edge',
       Math.round(bar.height)===6 && Math.round(bar.width)===390
       && Math.round(bar.left-card.left)===0,
       Math.round(bar.height)+'px x '+Math.round(bar.width));
    ok('it rides the top edge of the band',
       Math.round(bar.top - card.top)===0, Math.round(bar.top - card.top));
    ok('the fill is the snapshot % of the whole width, not of an inset track',
       Math.round(100*fill.width/bar.width)===60, Math.round(100*fill.width/bar.width));
    /* Swapped with the band. A #222 fill on a dark card is invisible, which would
       leave the EMPTY part of the track as the only thing you can see — see the
       note in shared/minitask.css. */
    ok('fill on content/inverse over a content/secondary track',
       CS('#qMini .minitask__bar i').backgroundColor==='rgb(255, 255, 255)'
       && CS('#qMini .minitask__bar').backgroundColor==='rgb(113, 113, 113)',
       CS('#qMini .minitask__bar i').backgroundColor+' on '
       + CS('#qMini .minitask__bar').backgroundColor);
  }
  /* The band takes the foot of the screen, so the FAB stands down — it does not
     stack on top of it. The Filters / Sort bar used to stand down here too, and
     that cost the mechanic every filter while a task was parked. It is gone, and
     the filters are at the top of the screen where the band cannot reach them. */
  ok('the scan FAB stands down while a task is parked',
     CS('#scrQueue .qfabrow').display==='none', CS('#scrQueue .qfabrow').display);
  ok('and the filter row is untouched by it',
     CS('#scrQueue .qFilters, #qFilters').display!=='none'
     && !document.getElementById('qFilters').classList.contains('is-up'),
     CS('#qFilters').display);
  ok('the band sits on the average strip, this screen\u2019s floor',
     Math.round(R('#qMini .minitask__card').bottom - R('.qavg').top)===0,
     Math.round(R('#qMini .minitask__card').bottom - R('.qavg').top));
  ok('the list clears the band so its last row is not underneath it',
     Math.round(parseFloat(CS('#qList').paddingBottom)) >= 90,
     CS('#qList').paddingBottom);
  minimised.assessment = null; renderMinis();
  ok('the FAB comes back when nothing is parked',
     CS('#scrQueue .qfabrow').display!=='none', CS('#scrQueue .qfabrow').display);
  goTo('home');
}

/* The frame must never scroll. `overflow:hidden` still makes an element a scroll
   container, so one scrollIntoView() inside any screen can shift the entire UI —
   the ported token queue did exactly that on load, dragging everything 99px left.
   Asserted on the frame itself so any future offender is caught here, not by eye. */
{
  const ph = document.getElementById('phone');
  ok('the phone frame is clip, not hidden — it cannot become a scroll container',
     getComputedStyle(ph).overflowX === 'clip', getComputedStyle(ph).overflowX);
  goTo('tokens');
  /* Ask the browser to do the thing that used to break it. */
  const t = document.querySelector('#tqTabs .tab:last-child');
  if (t) t.scrollIntoView({block:'nearest', inline:'nearest'});
  ok('and scrollIntoView inside a screen leaves the frame put',
     ph.scrollLeft === 0 && ph.scrollTop === 0, ph.scrollLeft + '/' + ph.scrollTop);
  ok('shared chrome stays pinned to the frame',
     Math.round(R('.statusbar').left - ph.getBoundingClientRect().left) === 0,
     Math.round(R('.statusbar').left - ph.getBoundingClientRect().left));
  ok('and the token queue sits square in it',
     (()=>{const S=R('#scrTokens'), c=R('#scrTokens .active-card');
       return Math.round(S.left - ph.getBoundingClientRect().left)===0
         && Math.round(c.left - S.left)===24 && Math.round(c.width)===342;})(),
     Math.round(R('#scrTokens .active-card').left - R('#scrTokens').left));
  goTo('home');
}

// home geometry, against Figma 2137:29516
/* The task cards are filtered by profile now — a mechanic sees one of the six, a
   captain two — so most of them are hidden and measure 0x0. What these two
   assertions are actually about is the CARD, not which cards a role gets: the
   159x160 box and the 92/120 baselines are the same wherever one appears. So the
   filter is lifted for the measurement and put back afterwards. */
const hmHidden = [...document.querySelectorAll('#scrHome .hm__task')].filter(b => b.hidden);
hmHidden.forEach(b => b.hidden = false);
ok('shift bar is 56px inset 24, radius 12',
   Math.round(R('.hm__shift').height)===56
   && Math.round(R('.hm__shift').left - R('#scrHome').left)===24
   && getComputedStyle(document.querySelector('.hm__shift')).borderRadius==='12px',
   Math.round(R('.hm__shift').height)+' @'+Math.round(R('.hm__shift').left-R('#scrHome').left));
/* Every card, with the filter lifted — no profile is shown them all; this is the
   fixture that lets each one be measured at once.

   Asserted as a GRID rather than as a fixed number of rows: two column positions
   183 apart, rows 184 apart, every card 159x160. It used to name four rows of
   two, which counted cards rather than measuring the grid and broke the moment a
   ninth card arrived — and it would have broken again on QC's grid-column:1 pin
   landing on an odd row. What the frame specifies is the rhythm, so that is what
   is checked. */
ok('task cards are 159x160 on a 183/184 grid, two to a row',
   (()=>{const c=[...document.querySelectorAll('.hm__task')].map(t=>t.getBoundingClientRect());
     const lefts = [...new Set(c.map(r=>Math.round(r.left)))].sort((a,b)=>a-b);
     const tops  = [...new Set(c.map(r=>Math.round(r.top)))].sort((a,b)=>a-b);
     return c.length===8
       && c.every(r=>Math.round(r.width)===159 && Math.round(r.height)===160)
       && lefts.length===2 && lefts[1]-lefts[0]===183
       && tops.every((y,i)=>i===0 || y-tops[i-1]===184);})(),
   [...document.querySelectorAll('.hm__task')].map(t=>{const r=t.getBoundingClientRect();
     return Math.round(r.width)+'x'+Math.round(r.height);}).join(' '));
ok('count sits at 92 and label at 120 inside the card',
   (()=>{const card=R('.hm__task'), n=R('.hm__task .n'), l=R('.hm__task .l');
     return Math.round(n.top-card.top)===92 && Math.round(l.top-card.top)===120;})(),
   Math.round(R('.hm__task .n').top-R('.hm__task').top)+' / '+Math.round(R('.hm__task .l').top-R('.hm__task').top));
/* Per Figma 2189:31118: six 48px icons, three to a row, 8px between columns and
   36px between rows. The 64px tile this used to measure is gone — that frame sets
   the icons straight on the surface with no plate behind them. */
/* The 8px is between CELLS, not between icons: each 48px icon is centred in a
   109px column, so icon-to-icon reads 69. Measuring the icons was the first way
   this was written and it fails against a correct layout. */
hmHidden.forEach(b => b.hidden = true);   /* filter back on */

ok('shortcuts are a 3-column grid of 48px icons in 109px cells',
   (()=>{const c=[...document.querySelectorAll('.hm__sc i')].map(t=>t.getBoundingClientRect());
     const s=[...document.querySelectorAll('.hm__sc')].map(t=>t.getBoundingClientRect());
     return c.length===6
       && c.every(r=>Math.round(r.width)===48 && Math.round(r.height)===48)
       && Math.round(s[0].width)===109
       && Math.round(s[1].left-s[0].right)===8
       && Math.round(s[3].left)===Math.round(s[0].left);})(),
   (()=>{const s=[...document.querySelectorAll('.hm__sc')].map(t=>t.getBoundingClientRect());
     return Math.round(s[0].width)+'w gap'+Math.round(s[1].left-s[0].right);})());
ok('and the rows clear each other by 36',
   (()=>{const s=[...document.querySelectorAll('.hm__sc')].map(t=>t.getBoundingClientRect());
     return Math.round(s[3].top-s[0].bottom)===36;})(),
   (()=>{const s=[...document.querySelectorAll('.hm__sc')].map(t=>t.getBoundingClientRect());
     return Math.round(s[3].top-s[0].bottom)+'px';})());
ok('bottom nav is 100px with a hairline above it',
   Math.round(R('.hmnav').height)===100
   && getComputedStyle(document.querySelector('.hmnav')).boxShadow.includes('232, 232, 232'),
   Math.round(R('.hmnav').height)+'px');
ok('nav items land on 86 / 195 / 304',
   (()=>{const c=[...document.querySelectorAll('.hmnav button')].map(b=>{const r=b.getBoundingClientRect();
       return Math.round((r.left+r.right)/2 - R('#scrHome').left)});
     return c.join('/')==='86/195/304';})(),
   [...document.querySelectorAll('.hmnav button')].map(b=>{const r=b.getBoundingClientRect();
     return Math.round((r.left+r.right)/2 - R('#scrHome').left)}).join('/'));

// the quick filter row and the list row, per Figma 2872:22873
document.querySelector('[data-task="assessment"]').click();
/* ONE SET, in one rhythm: chips from 24, 8 apart, and the filter button last in
   the run at the same 8. The divider that used to stand between them is gone —
   the button opens the rest of the same filter list, so a rule saying "different
   kind of thing" was drawing a distinction that is not there. */
ok('chips from 24 and the 52x40 button last, all 8 apart',
   (()=>{const S=R('#scrQueue'), b=R('.qfbtn');
     const c=[...document.querySelectorAll('.qquickchip')].map(x=>x.getBoundingClientRect());
     /* The gap is measured off #qQuick, not off the last chip. Three chips and
        the button no longer fit in 342, so the chip run SCROLLS — that is the
        point of it — and a chip's rect then runs past the container clipping
        it. The button sits 8 from the container's edge and stays put while the
        chips move under it.

        The chip-to-chip gap is taken between the two UNPRESSED chips: All is
        pressed on arrival and carries a 1.5px ring against a 1px one, which
        moves each edge half a pixel and rounds either way. */
     return Math.round(b.width)===52 && Math.round(b.height)===40
       && Math.round(c[0].left-S.left)===24
       && Math.round(c[2].left-c[1].right)===8
       && Math.round(b.left-c[c.length-1].right)===8
       /* Inside the scroller with them: the whole run travels, button included. */
       && document.getElementById('qFilterBtn').parentElement.id==='qQuick'
       && document.getElementById('qQuick').scrollWidth
            > document.getElementById('qQuick').clientWidth;})(),
   [...document.querySelectorAll('.qquickchip,.qfbtn')]
     .map(e=>Math.round(e.getBoundingClientRect().left-R('#scrQueue').left)).join('/'));
/* And it is drawn as a CHIP, not as something heavier. It carried a dark ring at
   all times, which read as permanently selected while saying nothing about
   whether anything was filtered. */
ok('the button is drawn as one of the chips, not heavier',
   (()=>{const b=getComputedStyle(document.querySelector('.qfbtn'));
     /* Against an UNPRESSED chip. All is pressed on arrival and wears the
        selected fill, which is the one thing the button must not match. */
     const c=getComputedStyle(document.querySelector('[data-qchip="revive"]'));
     return b.borderTopColor===c.borderTopColor
       && b.backgroundColor===c.backgroundColor
       && b.borderRadius==='100px' && c.borderRadius==='100px';})(),
   getComputedStyle(document.querySelector('.qfbtn')).borderTopColor);
// border-width is asserted from the rule, not getComputedStyle: a 1.5px border
// rounds to 1px in the used value at DPR 1, which is where these tests run.
const chipRule = [...document.styleSheets[0].cssRules]
  .find(r => r.selectorText === '.qquickchip[aria-pressed="true"]').style;
// a var() in the shorthand stops the longhands serialising, so read the shorthand
ok('selected chip is a 1.5px dark ring in the rule',
   /^1\.5px solid/.test(chipRule.border) && chipRule.border.includes('border-selected'),
   chipRule.border);
document.querySelector('[data-qchip="revive"]').click();
ok('selected chip: grey fill, dark ring',
   (()=>{const c=getComputedStyle(document.querySelector('[data-qchip="revive"]'));
     return c.backgroundColor==='rgb(247, 247, 247)' && c.borderTopColor==='rgb(34, 34, 34)';})(),
   getComputedStyle(document.querySelector('[data-qchip="revive"]')).border);
ok('unselected chip: white, hairline',
   (()=>{const c=getComputedStyle(document.querySelector('[data-qchip="lowbatt"]'));
     return c.backgroundColor==='rgb(255, 255, 255)' && c.borderTopColor==='rgb(232, 232, 232)';})(),
   getComputedStyle(document.querySelector('[data-qchip="lowbatt"]')).border);
document.querySelector('[data-qchip="revive"]').click();
ok('the band is 72 tall and closed by a hairline',
   Math.round(R('.qfilters').height)===72
   && getComputedStyle(document.querySelector('.qfilters')).boxShadow.includes('232, 232, 232'),
   Math.round(R('.qfilters').height)+' / '
     + getComputedStyle(document.querySelector('.qfilters')).boxShadow);
/* Band under the strip, and the average PINNED TO THE FLOOR — 8 + a 16px line +
   8, sitting on the bottom of the scroller rather than in the run of controls at
   the top. */
ok('the band is under the strip, and the average is on the floor',
   Math.round(R('.qfilters').top - R('.qsec-tabs').bottom)===0
   && Math.round(R('.qavg').height)===32
   && Math.round(R('.qavg').bottom - R('#scrQueue .qscroller').bottom)===0,
   Math.round(R('.qavg').height)+' / '
     + Math.round(R('.qavg').bottom - R('#scrQueue .qscroller').bottom));
ok('queue dividers are inset 24px either side',
   (()=>{const r=document.querySelector('.qrow');
     const d=getComputedStyle(r,'::after');
     return d.left==='24px' && d.right==='24px' && d.height==='1px';})(),
   (()=>{const d=getComputedStyle(document.querySelector('.qrow'),'::after');
     return d.left+' / '+d.right+' / '+d.height;})());
/* 24 + 20 + 8 + 16 + 24 = 92. The frame's two lines are further apart than the
   80px row's were, and the padding went 16 -> 24 with them. */
ok('rows are 92px, title at 24 and number at 52',
   (()=>{const r=R('.qrow'), h=R('.qrow .id'), sub=R('.qrow .sub');
     return Math.round(r.height)===92
       && Math.round(h.top-r.top)===24 && Math.round(sub.top-r.top)===52;})(),
   Math.round(R('.qrow').height)+' / '+Math.round(R('.qrow .id').top-R('.qrow').top)
     +' / '+Math.round(R('.qrow .sub').top-R('.qrow').top));
ok('the wait sits on the right edge, inset 24, vertically centred',
   (()=>{const r=R('.qrow'), w=R('.qrow .wait');
     return Math.round(r.right-w.right)===24
       && Math.round((w.top+w.bottom)/2 - (r.top+r.bottom)/2)===0;})(),
   Math.round(R('.qrow').right-R('.qrow .wait').right));
/* Strip, then band, then rows — and the strip is the thing pinned to the top of
   the scroller, so this queue leads with Pending / Transfer done. */
ok('and the first row sits right below the band',
   Math.round(R('.qrow').top - R('.qfilters').bottom)===0
   && Math.round(R('.qsec-tabs').top - R('#qList').top)===0,
   Math.round(R('.qrow').top - R('.qfilters').bottom));

// the dock overlays the list, so hiding it cannot resize the viewport
ok('FAB is a 56px circle bottom-right',
   (()=>{const f=R('#qScanFab');
     return Math.round(f.width)===56 && Math.round(f.height)===56
       && Math.round(R('#scrQueue').right - f.right)===24;})(),
   Math.round(R('#qScanFab').width)+'x'+Math.round(R('#qScanFab').height)
     +' inset '+Math.round(R('#scrQueue').right - R('#qScanFab').right));
/* 16 above the average strip — the same skirt it kept off the frame's floor
   before the strip was pinned there. 16 + 56 + 16 = 88, plus the strip's 32, is
   the list's bottom padding. */
ok('FAB sits 16px above the average strip',
   Math.round(R('.qavg').top - R('#qScanFab').bottom)===16,
   Math.round(R('.qavg').top - R('#qScanFab').bottom));
ok('dock is an overlay, not a flex item',
   getComputedStyle(document.getElementById('qDock')).position==='absolute',
   getComputedStyle(document.getElementById('qDock')).position);
ok('and it no longer travels — there is nothing below it to drop into',
   (()=>{const d=getComputedStyle(document.getElementById('qDock'));
     return d.transition==='none' && d.transform==='none'
       && ![...document.styleSheets[0].cssRules]
             .some(r=>r.selectorText==='.qdock.is-down');})(),
   getComputedStyle(document.getElementById('qDock')).transition+' / '
     + getComputedStyle(document.getElementById('qDock')).transform);
ok('list keeps its full height under it',
   Math.round(R('#qList').bottom)===Math.round(R('#scrQueue').bottom),
   R('#qList').bottom+' vs '+R('#scrQueue').bottom);
/* 88 for the scan button and 32 more for the average strip pinned under it. */
ok('and pads 120px so rows clear the FAB and the average',
   getComputedStyle(document.getElementById('qList')).paddingBottom==='120px',
   getComputedStyle(document.getElementById('qList')).paddingBottom);
/* In the list, in flow — so it makes its own room and the list must NOT pad for
   it as well. The overlay band is still what a non-tab queue gets; that is
   asserted on QC pending below. */
ok('the filter row is in the list, in flow',
   getComputedStyle(document.getElementById('qFilters')).position==='static'
   && document.getElementById('qFilters').parentElement.id==='qList',
   getComputedStyle(document.getElementById('qFilters')).position+' in '
     + document.getElementById('qFilters').parentElement.id);
ok('so the list pads nothing at the top',
   getComputedStyle(document.getElementById('qList')).paddingTop==='0px',
   getComputedStyle(document.getElementById('qList')).paddingTop);
/* THE OTHER SHAPE. QC pending has no tabs, so its band is chrome pinned to the
   top of the scroller and the list pads 72 to clear it. Both shapes ship, and
   which one you get is whether the queue has tabs. */
goTo('qc'); await new Promise(r=>setTimeout(r,450));
ok('a queue without tabs keeps the band as chrome, and pads for it',
   getComputedStyle(document.getElementById('qFilters')).position==='absolute'
   && document.getElementById('qFilters').parentElement.classList.contains('qscroller')
   && getComputedStyle(document.getElementById('qList')).paddingTop==='72px'
   && Math.round(R('.qfilters').top - R('#scrQueue .appbar').bottom)===0,
   getComputedStyle(document.getElementById('qFilters')).position+' / '
     + getComputedStyle(document.getElementById('qList')).paddingTop);
goTo('task'); await new Promise(r=>setTimeout(r,450));

/* ── The filter sheet, against the frame ─────────────────────────────────────
   Figma 2872:22873 draws 390x584 with three groups. Every number below is one of
   its own, and they come out of a rhythm rather than being placed: head 24 from
   the top, body 24 under it, 16 inside a group, 32 between groups, 36 to the
   rule, 24 to Apply, 24 below. Assert the total as well as the parts — the
   total is what catches a gap changed by one.
   ─────────────────────────────────────────────────────────────────────────── */
{
  document.getElementById('qFilterBtn').click();
  const SH = () => R('#fltSheet');
  const rel = sel => { const r=R(sel), s=SH();
    return [Math.round(r.left-s.left), Math.round(r.top-s.top),
            Math.round(r.width), Math.round(r.height)]; };
  /* 336, not the frame's 584. The rule, the Apply and the 36 between them came
     off when the sheet lost its footer; the Issue type group's 124 came off when
     that group was removed. The sheet is sized by its content, so the total is
     worth asserting — it catches a gap changed by one. */
  ok('sheet is 390x336 with 24px top corners',
     (()=>{const s=SH();
       return Math.round(s.width)===390 && Math.round(s.height)===336
         && getComputedStyle(document.getElementById('fltSheet')).borderTopLeftRadius==='24px';})(),
     Math.round(SH().width)+'x'+Math.round(SH().height));
  ok('title at 24,24 and Reset opposite it, 48 tall',
     (()=>{const t=rel('.flsheet__title'), r=rel('.flsheet__reset');
       return t[0]===24 && t[1]===24 && t[3]===40
         && r[1]===24 && r[3]===48
         && Math.round(SH().right - R('.flsheet__reset').right)===24;})(),
     rel('.flsheet__title').join(',')+' / '+rel('.flsheet__reset').join(','));
  /* Two groups now, on the same 124 pitch — Issue type was the third. The pitch
     is what matters here, so it is asserted rather than hard-coded: add a group
     back and this still holds. */
  ok('groups start at 96 and repeat on 124',
     (()=>{const g=[...document.querySelectorAll('.flgroup')]
         .map(e=>Math.round(e.getBoundingClientRect().top - SH().top));
       return g.length===2 && g[0]===96 && g.slice(1).every((y,i)=>y-g[i]===124);})(),
     [...document.querySelectorAll('.flgroup')]
       .map(e=>Math.round(e.getBoundingClientRect().top - SH().top)).join('/'));
  ok('sheet chips are the 48px Chips/Large, 8 apart, inset 24',
     (()=>{const c=[...document.querySelectorAll('[data-flgroup="model"] .qchip')]
         .map(e=>e.getBoundingClientRect());
       return Math.round(c[0].height)===48
         && Math.round(c[0].left - SH().left)===24
         && Math.round(c[1].left-c[0].right)===8
         && getComputedStyle(document.querySelector('.qchip')).borderRadius==='100px';})(),
     Math.round(R('.qchip').height)+'px');
  ok('the last group is 24 off the floor, with nothing below it',
     (()=>{const g=[...document.querySelectorAll('.flgroup')].pop().getBoundingClientRect();
       return Math.round(SH().bottom - g.bottom)===24
         && !document.querySelector('.flsheet__foot') && !document.getElementById('fltApply');})(),
     Math.round(SH().bottom - [...document.querySelectorAll('.flgroup')].pop()
       .getBoundingClientRect().bottom));
  /* Reset is the only button left, and both its states are filled pills — the
     fill is what moves, from surface/disabled to surface/secondary. A flat-white
     enabled variant would have no edge at all on a white sheet. */
  ok('Reset reads disabled: grey fill, grey label',
     (()=>{const r=getComputedStyle(document.getElementById('fltReset'));
       return r.backgroundColor==='rgb(221, 221, 221)' && r.color==='rgb(176, 176, 176)';})(),
     getComputedStyle(document.getElementById('fltReset')).backgroundColor);
  document.querySelector('[data-flchip="Dex NV"]').click();
  ok('active Reset takes surface/secondary with the label in full',
     (()=>{const r=getComputedStyle(document.getElementById('fltReset'));
       return r.backgroundColor==='rgb(247, 247, 247)' && r.color==='rgb(34, 34, 34)';})(),
     getComputedStyle(document.getElementById('fltReset')).backgroundColor);
  /* The stamper inserts at the top of the button, and the frame puts the glyph
     AFTER the word — so the order is a CSS one and worth asserting. */
  ok('the Reset glyph sits after the word',
     R('.flsheet__reset svg').left > R('.flsheet__reset span').right,
     Math.round(R('.flsheet__reset svg').left - R('.flsheet__reset span').right));
  /* Clear it again: a chip in the sheet commits on tap now, so leaving one on
     would hand a filtered list to every assertion after this block. */
  document.querySelector('[data-flchip="Dex NV"]').click();
  document.getElementById('fltScrim').click();
}
{
  const before = Math.round(R('#qList').height);
  document.getElementById('qFilters').classList.add('is-up');
  ok('taking the filter row up leaves the list exactly the same height',
     Math.round(R('#qList').height)===before, before+' -> '+Math.round(R('#qList').height));
  document.getElementById('qFilters').classList.remove('is-up');
}

/* A healthy reading is information, not good news: it sits in the row's own text
   colours, so red stays the only colour on the screen that means anything. The
   reading is part of the title now, so it is the percentage that changes colour
   and not a glyph — there is no glyph left. */
/* A row that is NOT low, found rather than assumed to be the first. It was the
   first for as long as the longest-waiting bike happened to have charge; eleven
   bikes have since moved out of this fleet into Assessment done and the one at
   the top is now flat. */
ok('healthy rows draw the charge in the text colour',
   getComputedStyle(document.querySelector('.qrow:not(.is-low) .pct')).color==='rgb(34, 34, 34)',
   getComputedStyle(document.querySelector('.qrow:not(.is-low) .pct')).color);
document.querySelector('[data-qchip="lowbatt"]').click();
ok('and only a low pack goes red',
   getComputedStyle(document.querySelector('.qrow .pct')).color==='rgb(193, 53, 21)',
   getComputedStyle(document.querySelector('.qrow .pct')).color);
ok('and nothing else in the row changes with it',
   getComputedStyle(document.querySelector('.qrow .id')).color==='rgb(34, 34, 34)'
   && getComputedStyle(document.querySelector('.qrow .wait')).color==='rgb(34, 34, 34)',
   getComputedStyle(document.querySelector('.qrow .id')).color);
document.querySelector('[data-qchip="lowbatt"]').click();

/* ── ASSESSMENT DONE — the two accordions, Figma 2902:31870 ─────────────────
   Measured here rather than in flowtest because these are the frame's numbers:
   a 68px head, the title on the 24 inset, the count right-aligned 64 from the
   edge and the chevron 24 from it, over the same 92px rows every other queue
   draws. Restores the pending queue afterwards, or everything below inherits it. */
{
  const wasKind = queueKind;
  queueKind = 'assessdone'; renderQueue();
  const S2 = () => R('#scrQueue');
  ok('the head is 68 tall, full width, on the frame\u2019s insets',
     (()=>{const h = R('.qsec-head'), t = R('.qsec-head > span'), n = R('.qsec-head__n'),
             g = R('.qsec-head__go'), s = S2();
       return Math.round(h.height)===68 && Math.round(h.width)===Math.round(s.width)
         && Math.round(t.left - s.left)===24
         && Math.round(s.right - n.right)===64
         && Math.round(s.right - g.right)===24
         && Math.round(g.width)===24;})(),
     Math.round(R('.qsec-head').height)+' tall, count '
       +Math.round(S2().right - R('.qsec-head__n').right)+' from the edge, chevron '
       +Math.round(S2().right - R('.qsec-head__go').right));
  /* No filter row on this queue, so the first head sits directly under the app
     bar's rule — 116 on the frame, and the same here. The average is on the
     floor and is not between them. */
  ok('and it starts where the app bar ends, with no filter band between',
     document.getElementById('qFilters').hidden
     && Math.round(R('.qsec-head').top - R('#scrQueue .appbar').bottom)===0,
     Math.round(R('.qsec-head').top - R('#scrQueue .appbar').bottom)+' below the bar');
  /* ONE line per boundary. The head drew both its edges for a build, which put
     2px under the app bar (it draws its own border-bottom) and 2px between two
     adjacent heads. Everything above a head already draws a line, so the head
     only ever draws the one below itself — except the pinned foot, which floats
     over rows it is not part of and needs a top edge of its own. */
  ok('no boundary is drawn twice',
     (()=>{const h=[...document.querySelectorAll('.qsec-head')];
       const lines = e => (getComputedStyle(e).boxShadow.match(/inset/g)||[]).length;
       /* The first sits under the app bar, which draws its own border-bottom, so
          it must not draw a top edge of its own. The last is shut and floating
          over rows it is not part of, so it must. */
       return lines(h[0])===1 && lines(h[1])===2;})(),
     [...document.querySelectorAll('.qsec-head')]
       .map(e=>(getComputedStyle(e).boxShadow.match(/inset/g)||[]).length).join('/'));
  /* And back to back — the third frame, both shut — the second drops its top edge
     again, because the first is drawing that line. */
  document.querySelector('[data-qsec="done"]').click();
  ok('and two heads back to back draw one line between them',
     (()=>{const h=[...document.querySelectorAll('.qsec-head')];
       const lines = e => (getComputedStyle(e).boxShadow.match(/inset/g)||[]).length;
       return lines(h[0])===1 && lines(h[1])===1
         && Math.round(R('.qsec-head--foot').top - R('.qsec-head').bottom)===0;})(),
     [...document.querySelectorAll('.qsec-head')]
       .map(e=>(getComputedStyle(e).boxShadow.match(/inset/g)||[]).length).join('/'));
  document.querySelector('[data-qsec="done"]').click();
  ok('the rows inside are the queue\u2019s own 92px row',
     Math.round(R('.qrow').height)===92
     && Math.round(R('.qrow').top - R('.qsec-head').bottom)===0,
     Math.round(R('.qrow').height)+' tall');
  /* Shut, the last head pins to the FLOOR — which on this screen is the top edge
     of the average strip, not the bottom of the scroller. The strip is opaque
     and pinned across the bottom, so anything behind it is not on screen at all.
     Asserted with the section long enough to overflow, because that is the only
     state in which sticky does anything. */
  const wasT = DONE.map(b => b.transferred);
  DONE.forEach(b => b.transferred = false); DONE[DONE.length-1].transferred = true;
  renderQueue();
  await new Promise(r=>setTimeout(r,60));
  ok('a shut last head pins above the average strip when the list overflows',
     Math.round(R('.qavg').top - R('.qsec-head--foot').bottom)===0
     && getComputedStyle(document.querySelector('.qsec-head--foot')).position==='sticky',
     Math.round(R('.qavg').top - R('.qsec-head--foot').bottom)+' above the strip');
  /* And the FAB sits clear of it rather than on its chevron. The frame has no
     FAB; ours does, and at 24 from the bottom right they would collide. */
  /* AND IT DOES NOT MOVE. The button used to climb onto a pinned head so it did
     not sit on the chevron; Sagar fixed it in place — a button that moves is a
     button you have to look for, and the collision it avoided is a 56px circle
     over the right end of a head whose text and count both sit well left of it.
     16 above the strip whether a head is pinned under it or not. */
  ok('the scan button stays put over a pinned head',
     Math.round(R('.qavg').top - R('.qfab').bottom)===16,
     Math.round(R('.qavg').top - R('.qfab').bottom)+' above the strip');
  document.querySelector('[data-qsec="done"]').click();
  await new Promise(r=>setTimeout(r,60));
  ok('and stays there with nothing pinned',
     Math.round(R('.qavg').top - R('.qfab').bottom)===16,
     Math.round(R('.qavg').top - R('.qfab').bottom)+' above the strip');
  document.querySelector('[data-qsec="done"]').click();
  await new Promise(r=>setTimeout(r,60));
  DONE.forEach((b, i) => { b.transferred = wasT[i]; });
  queueKind = wasKind; renderQueue();
}

LIVEROW().click();
/* The fault record's footer is a row on the assessment — Figma 2913:32124. The
   confirmation on the 24px inset at one end, the CTA on the 24 at the other. It
   sat centred as a pair for one build: .iq-footer is a flex COLUMN with
   align-items:center, so the row shrank to its contents and space-between had
   nothing to space. */
{
  const wasKind = jobKind, wasAt = jobAt;
  jobKind = 'assessment'; enterRnm();
  document.getElementById('rowFaults').click();
  ok('the confirm and the CTA sit on the frame\u2019s insets, one at each end',
     (()=>{const s = R('#scrIssues'), c = R('#iqConfirm'), d = R('#iqDoneBtn');
       return Math.round(c.left - s.left)===24
         && Math.round(s.right - d.right)===24
         && d.left > c.right;})(),
     Math.round(R('#iqConfirm').left - R('#scrIssues').left)+' / '
       +Math.round(R('#scrIssues').right - R('#iqDoneBtn').right));
  /* Two lines of 20 against a 24px box, and the box is centred on the pair. */
  ok('the label is two lines and the box is centred against them',
     Math.round(R('.iq-confirm__t').height)===40
     && Math.round(R('.iq-confirm__box').width)===24
     && Math.abs(Math.round((R('.iq-confirm__box').top + R('.iq-confirm__box').bottom) / 2
                            - (R('.iq-confirm__t').top + R('.iq-confirm__t').bottom) / 2)) <= 1,
     Math.round(R('.iq-confirm__t').height)+' tall');
  window.YuzenIQ.onBack();
  jobKind = wasKind; jobAt = wasAt; enterRnm();
}

/* The task CTA is a slide — Figma 2913:32095, in this app's colours and at the
   318x64 the button already had. The knob is a 56px disc on a 4px inset, which
   leaves it exactly centred in the track's 64. */
ok('the task CTA is a 318x64 track with a 56px knob inset 4',
   (()=>{const b = R('#jbStart'), k = R('#jbKnob');
     return Math.round(b.width)===318 && Math.round(b.height)===64
       && Math.round(k.width)===56 && Math.round(k.height)===56
       && Math.round(k.left - b.left)===4
       && Math.round(k.top - b.top)===4
       && getComputedStyle(document.getElementById('jbStart')).borderRadius==='100px';})(),
   Math.round(R('#jbStart').width)+'x'+Math.round(R('#jbStart').height)
     +', knob '+Math.round(R('#jbKnob').width)+' @'+Math.round(R('#jbKnob').left - R('#jbStart').left));
/* And the label is centred on the TRACK, not on what is left of it beside the
   knob — it must not shuffle sideways as the knob travels. */
ok('and its label is centred on the whole track',
   Math.abs(Math.round((R('#jbStart span').left + R('#jbStart span').right) / 2
                       - (R('#jbStart').left + R('#jbStart').right) / 2)) <= 1,
   Math.round((R('#jbStart span').left + R('#jbStart span').right) / 2)
     +' vs '+Math.round((R('#jbStart').left + R('#jbStart').right) / 2));
document.getElementById('jbStart').click();
await new Promise(r=>setTimeout(r,60));

// screen 1 — footer only exists once the checklist is finished
ok('s1 footer sits below the frame while parts remain', Math.round(R('#assessFooter').top)>=Math.round(PB()),
   R('#assessFooter').top+' vs phone bottom '+PB());
PARTS.forEach(p=>p.status='good'); activeIndex=-1; render();
await new Promise(r=>setTimeout(r,60));
ok('s1 footer lands inside the frame when finished', Math.round(R('#assessFooter').bottom)===Math.round(PB()),
   R('#assessFooter').bottom+' vs '+PB());
ok('s1 list gives up exactly the footer height', Math.round(R('#scroll').bottom)===Math.round(R('#assessFooter').top),
   R('#scroll').bottom+' / '+R('#assessFooter').top);
/* THIS screen's bar. There are two `.progress` elements in the document and the
   fault record's is display:none on an assessment, so the bare selector measured
   a hidden one on another page. Fifth of these in the suites; the rule is that a
   geometry selector names the screen it belongs to. */
ok('progress bar is 6px directly under the app bar',
   Math.round(R('#scrAssess .progress').height)===6
   && Math.round(R('#scrAssess .progress').top)===Math.round(R('#assessAppbar').bottom),
   R('#scrAssess .progress').height+' @ '+R('#scrAssess .progress').top+' vs '+R('#assessAppbar').bottom);
// the last row must still be reachable above the footer
document.getElementById('scroll').scrollTop = 99999;
ok('last part scrolls clear of the footer',
   Math.round([...document.querySelectorAll('.item')].pop().getBoundingClientRect().bottom) <= Math.round(R('#assessFooter').top),
   [...document.querySelectorAll('.item')].pop().getBoundingClientRect().bottom+' vs '+R('#assessFooter').top);
document.getElementById('scroll').scrollTop = 0;
ok('progress fills to 100% when every part is judged',
   document.getElementById('progressFill').style.width==='100%', document.getElementById('progressFill').style.width);
PARTS.forEach(p=>p.status='pending');

const f=new Set([0,2,6]);
PARTS.forEach((p,i)=>p.status=f.has(i)?'faulty':'good');
activeIndex=-1; render();
document.getElementById('nextBtn').click();
await new Promise(r=>setTimeout(r,80));

/* The hidden-footer measurements stood here. Mark penalties has no footer any
   more — see the note at the foot of screens/faults/script.js — so the list runs
   to the floor whatever state the parts are in. The -124px slide-up itself is
   still a live pattern and is measured on the Active checklists picker, further
   down, which is where it went. */
ok('the list reaches the bottom of the frame', Math.round(R('#fscroll').bottom)===Math.round(PB()),
   R('#fscroll').bottom+' vs phone bottom '+PB());

/* The screen arrives with the photographs open — see enterFaults. So shut them
   before measuring the OPENING, or the press under test closes them instead. */
ok('the photographs are open on arrival',
   document.getElementById('carousel').classList.contains('is-open')
   && Math.round(R('#carousel').height)===248,
   Math.round(R('#carousel').height));
setCarousel(false);
await new Promise(r=>setTimeout(r,80));
const before=R('#fscroll').top, h0=R('#carousel').height;
setCarousel(true);
await new Promise(r=>setTimeout(r,80));
ok('carousel opens to 248', Math.round(R('#carousel').height)===248, h0+' -> '+R('#carousel').height);
ok('carousel pushes the list down by 248', Math.round(R('#fscroll').top-before)===248, R('#fscroll').top-before);
/* Between the TAB STRIP and the list. The Assessment / Penalties strip sits
   under the app bar on this screen now — the penalties are the second half of
   the checklist step, and the strip is how you get between them. */
ok('carousel sits between the tab strip and the list',
   Math.round(R('#carousel').top)===Math.round(R('#faultsTabs').bottom)
   && Math.round(R('#faultsTabs').top)===Math.round(R('#scrFaults .appbar').bottom)
   && Math.round(R('#carousel').bottom)===Math.round(R('#fscroll').top),
   'appbar '+R('#scrFaults .appbar').bottom+' tabs '+R('#faultsTabs').top+'-'+R('#faultsTabs').bottom
     +' car '+R('#carousel').top+'-'+R('#carousel').bottom+' list '+R('#fscroll').top);
setCarousel(false);
await new Promise(r=>setTimeout(r,80));
ok('carousel closes back to 0', Math.round(R('#carousel').height)===0, R('#carousel').height);
ok('list returns to its place', Math.round(R('#fscroll').top)===Math.round(before), R('#fscroll').top+' vs '+before);

// the selected fill must not change the resting geometry
const p0was=PARTS[0].status; PARTS[0].status='good'; activeIndex=0; render();
/* Back to the frame's 344 on a part that has PASSED: the note is the instruction,
   and a part that passed no longer needs telling what to look at, so its second
   line goes and the card returns to the height it was drawn at. A pending part's
   card is 368 — the 16px line plus its 8px gap. Both are asserted, because the
   difference between them is the whole of the rule. The media is the frame's 220
   either way: the card grew, the photograph did not shrink to pay for it. */
ok('a judged card is the frame\'s 342x344; a pending one is 24 taller',
   (()=>{const w=Math.round(R('.card').width), good=Math.round(R('.card').height);
     const media=Math.round(R('.card__media').height);
     PARTS[0].status='pending'; render();
     const pending=Math.round(R('.card').height);
     PARTS[0].status='good'; render();
     return w===342 && good===344 && pending===368 && media===220;})(),
   R('.card').width+'x'+R('.card').height+' media '+R('.card__media').height);
/* ── The fault sheet ─────────────────────────────────────────────────────────
   Shared chrome, so it is measured once and both checklists get the answer — see
   shared/issuesheet.js, and the note there about the mechanic's screen still
   drawing its own copy.
   ─────────────────────────────────────────────────────────────────────────── */
{
  const wasStatus = PARTS[1].status;
  PARTS[1].status = 'pending'; activeIndex = 1; render();
  openIssueSheet(PARTS[1], thumbHTML(PARTS[1]), () => {}, () => {});
  const S = R('#isSheet');
  ok('sheet is full width with 24px top corners, and inside the frame',
     Math.round(S.width)===390
     && getComputedStyle(document.getElementById('isSheet')).borderTopLeftRadius==='24px'
     && Math.round(S.bottom)===Math.round(R('#phone').bottom),
     Math.round(S.width)+' / '+Math.round(S.bottom - R('#phone').bottom));
  ok('the part it is asking about leads it: 48px tile, name beside it',
     (()=>{const t=R('#isThumb'), n=R('#isName');
       return Math.round(t.width)===48 && Math.round(t.height)===48
         && Math.round(t.left - S.left)===24
         && Math.round(n.left - t.right)===16;})(),
     Math.round(R('#isThumb').width)+' @'+Math.round(R('#isThumb').left - R('#isSheet').left));
  ok('rule under it is inset 24 like every other rule',
     Math.round(R('.issheet__divider').left - S.left)===24
     && Math.round(S.right - R('.issheet__divider').right)===24,
     Math.round(R('.issheet__divider').left - S.left));
  ok('chips are 40px pills, 6 apart, inset 24',
     (()=>{const c=[...document.querySelectorAll('#isChips .issheet__chip')]
         .map(e=>e.getBoundingClientRect());
       return Math.round(c[0].height)===40
         && Math.round(c[0].left - S.left)===24
         && Math.round(c[1].left - c[0].right)===6
         && getComputedStyle(document.querySelector('.issheet__chip')).borderRadius==='100px';})(),
     Math.round(R('.issheet__chip').height)+'px');
  /* An inset ring, not a thicker border: a chip growing by a pixel reflows a
     wrapped run, and these wrap. */
  ok('selecting a chip changes no geometry',
     (()=>{const before = Math.round(R('.issheet__chip').width);
       document.querySelector('#isChips .issheet__chip').click();
       const after = Math.round(R('.issheet__chip').width);
       const cs = getComputedStyle(document.querySelector('.issheet__chip'));
       return before===after && cs.backgroundColor==='rgb(247, 247, 247)'
         && cs.boxShadow.includes('34, 34, 34');})(),
     getComputedStyle(document.querySelector('.issheet__chip')).boxShadow);
  ok('confirm is full width inside the 24 inset, 64 tall',
     (()=>{const b=R('#isConfirm');
       return Math.round(b.height)===64 && Math.round(b.left - S.left)===24
         && Math.round(S.right - b.right)===24;})(),
     Math.round(R('#isConfirm').width)+'x'+Math.round(R('#isConfirm').height));
  ok('disabled confirm is the grey pill, enabled is dark',
     (()=>{const b=document.getElementById('isConfirm');
       const on = getComputedStyle(b).backgroundColor;
       b.disabled = true; const off = getComputedStyle(b).backgroundColor;
       b.disabled = false;
       return on==='rgb(34, 34, 34)' && off==='rgb(221, 221, 221)';})(),
     getComputedStyle(document.getElementById('isConfirm')).backgroundColor);
  setIssueSheet(false, true);
  PARTS[1].status = wasStatus; activeIndex = 0; render();
}
ok('selected pill uses the positive reveal tint',
   getComputedStyle(document.querySelector('.btn-good__inner')).backgroundColor==='rgb(229, 240, 237)',
   getComputedStyle(document.querySelector('.btn-good__inner')).backgroundColor);
ok('the other side stays transparent',
   getComputedStyle(document.querySelector('.btn-faulty__inner')).backgroundColor==='rgba(0, 0, 0, 0)',
   getComputedStyle(document.querySelector('.btn-faulty__inner')).backgroundColor);
PARTS[0].status=p0was;

// status icons are literally the checklist's own two assets
ok('empty status is the checklist ring, unmodified',
   ICON.fstatus(false,false).includes(ICON.rowPending), 'differs from ICON.rowPending');
ok('filled status is the checklist disc, unmodified',
   ICON.fstatus(true,false).includes(ICON.rowGood), 'differs from ICON.rowGood');
ok('both sit in a 24px slot like the checklist status',
   Math.round(R('#flist .fstatus').width)===24 && Math.round(R('#flist .fstatus').height)===24,
   R('#flist .fstatus').width+'x'+R('#flist .fstatus').height);

// the new option sets must stay on one line each
/* Photos are gated behind a Minor/Major penalty, so set one — everything below
   measures that row. Setting it also FINISHES the part now that damage is gone,
   so AUTO_ADVANCE is what would fold this card out from under the measurements;
   the suite runs with it off (see CONFIG at the top of the bundle). */
document.querySelector('.fitem.is-open .fchips [data-group="penalty"][data-value="minor"]').click();
/* The open card is symmetric: 24px above the thumbnail, 24px below the Photos
   row. The tail used to be 36 when open, which read bottom-heavy. */
ok('open item is padded 24 top and bottom, not 24/36',
   (()=>{const it=document.querySelector('.fitem.is-open'), b=it.getBoundingClientRect();
     const row=it.querySelector('.frow').getBoundingClientRect();
     const last=it.querySelector('.fdetails__body').lastElementChild.getBoundingClientRect();
     return Math.round(row.top-b.top)===24 && Math.round(b.bottom-last.bottom)<=25;})(),
   (()=>{const it=document.querySelector('.fitem.is-open'), b=it.getBoundingClientRect();
     return Math.round(b.bottom - it.querySelector('.fdetails__body').lastElementChild.getBoundingClientRect().bottom);})()+'px below');
/* One chip group, not two. The Damage row and both blocks' captions are gone:
   the card asks for the penalty and nothing else, so the assertions that fixed
   Damage's four chips and the label-above-chips stacking went with them. */
/* Scoped to ONE card. Every faulty part arrives open, so an unscoped
   `.fitem.is-open .fchips` counts every card's group and "how many groups has a
   card got" cannot be asked of it. */
const fcard=document.querySelector('.fitem.is-open');
const rows=[...fcard.querySelectorAll('.fchips')];
ok('one chip group only, No / Minor / Major',
   rows.length===1 && [...rows[0].children].map(c=>c.textContent).join('/')==='No/Minor/Major',
   rows.length+' group(s): '+[...rows[0].children].map(c=>c.textContent).join('/'));
ok('the chips stay on one line',
   new Set([...rows[0].children].map(c=>Math.round(c.getBoundingClientRect().top))).size===1,
   new Set([...rows[0].children].map(c=>Math.round(c.getBoundingClientRect().top))).size+' lines');
ok('no caption over them',
   !rows[0].previousElementSibling && !fcard.querySelector('.fspec'),
   rows[0].previousElementSibling ? rows[0].previousElementSibling.textContent : 'none');

// the three Mark faults changes
ok('divider is inset 24px both sides',
   Math.round(R('.fdivider').left - R('#flist').left)===24 && Math.round(R('#flist').right - R('.fdivider').right)===24,
   (R('.fdivider').left-R('#flist').left)+' / '+(R('#flist').right-R('.fdivider').right));
ok('open row is white',
   getComputedStyle(document.querySelector('.fitem.is-open')).backgroundColor==='rgb(255, 255, 255)',
   getComputedStyle(document.querySelector('.fitem.is-open')).backgroundColor);
ok('thumb tile still reads against it',
   getComputedStyle(document.querySelector('.fitem.is-open .thumb')).backgroundColor==='rgb(247, 247, 247)',
   getComputedStyle(document.querySelector('.fitem.is-open .thumb')).backgroundColor);
ok('camera card still reads against it',
   getComputedStyle(document.querySelector('.fitem.is-open .fadd')).backgroundColor==='rgb(247, 247, 247)',
   getComputedStyle(document.querySelector('.fitem.is-open .fadd')).backgroundColor);
/* Two blocks left where there were three, and the 16 between them is the body's
   own gap — so this still catches a change to it. */
const specs=[...fcard.querySelectorAll('.fdetails__body > *')];
ok('16px between the chips and Photos, and nothing between them',
   specs.length===2
   && Math.round(specs[1].getBoundingClientRect().top - specs[0].getBoundingClientRect().bottom)===16,
   specs.length+' blocks, '
   +(specs[1].getBoundingClientRect().top-specs[0].getBoundingClientRect().bottom)+'px');

// Customer photos — the title collapsing and the header button fading in are
// both transitioned, so they are asserted here rather than in flowtest.
/* Shut first. The screen's RESTING state is now the open one, and "at rest" in
   the assertions below means the state the title is still on screen in. */
setCarousel(false);
await new Promise(r=>setTimeout(r,80));
ok('title block is 64px with the carousel shut', Math.round(R('#faultsHead').height)===64, R('#faultsHead').height);
/* The pill's own geometry was asserted here — dropped onto the title's line at
   rest, collapsed to a 40px circle once the title moved up. All of it went with
   the button. What survives is the block it shared the line with: the title has
   the whole width now, and the breadcrumb has the bar. */
ok('the title has the line to itself, on the 24px inset',
   (()=>{const h=R('#faultsHead h2'), S=R('#scrFaults');
     return Math.round(h.left - S.left)===24
       && !document.querySelector('#faultsAppbar .pill-btn');})(),
   Math.round(R('#faultsHead h2').left - R('#scrFaults').left)+'px inset');
setCarousel(true);
await new Promise(r=>setTimeout(r,80));
ok('title gives up its space when the carousel opens', Math.round(R('#faultsHead').height)===0, R('#faultsHead').height);
ok('the collapsed breadcrumb has the row to itself, clear of the \u22ee',
   (()=>{const t=R('#faultsAppbar .appbar__titles p'), m=R('#faultsMore');
     return Math.round(t.right) <= Math.round(m.left);})(),
   R('#faultsAppbar .appbar__titles p').right+' vs '+R('#faultsMore').left);
/* Still no title between — only the tab strip, which is chrome for the step
   rather than a heading for the list. */
ok('carousel sits under the strip, with no title between',
   Math.round(R('#carousel').top)===Math.round(R('#faultsTabs').bottom)
   && Math.round(R('#faultsTabs').top)===Math.round(R('#faultsAppbar').bottom),
   R('#carousel').top+' vs '+R('#faultsTabs').bottom);

const d=[['no'],['minor'],['major']];
PARTS.filter(p=>p.status==='faulty').forEach((p,i)=>{p.penalty=d[i][0];});
collapsedFaults.clear(); renderFaults();
await new Promise(r=>setTimeout(r,80));
/* Once every fault has a penalty the step CTA arrives, in flow, and the list
   gives up exactly its height rather than hiding a row behind it. */
ok('the step CTA takes its 124px out of the list once everything is detailed',
   Math.round(R('#ffooter').bottom)===Math.round(PB())
   && Math.round(R('#fscroll').bottom)===Math.round(R('#ffooter').top)
   && Math.round(R('#ffooter').height)===124,
   R('#fscroll').bottom+' / '+R('#ffooter').top+' h'+Math.round(R('#ffooter').height));
/* The step banner rides the footer's top edge — 36 tall, full width, its text on
   the 24 inset and a 20px tick on the far one. Figma 2913:32071. Measured here
   because the footer is only up once every penalty is set, which is also the
   only state in which the banner has anything to say. */
ok('the step banner is a 36px strip on the footer\u2019s top edge',
   (()=>{
     /* Its innards are written on first paint, and it only paints in the
        ASSESSMENT — the fault screens serve the repair too. Without this the
        selector below returns null and the whole suite dies with a decode error
        rather than one FAIL line. */
     if (!document.querySelector('#faultsBanner .stepbanner__t')) return false;
     /* The screen by name — there is no file-wide S() here; the ones above are
        block-locals belonging to other screens. */
     const b = R('#faultsBanner'), f = R('#ffooter'), s = R('#scrFaults');
     return Math.round(b.height)===36
       && Math.round(b.width)===Math.round(s.width)
       && Math.round(f.top - b.bottom)===0
       && Math.round(R('#faultsBanner .stepbanner__t').left - s.left)===24
       && Math.round(s.right - R('#faultsBanner .stepbanner__tick').right)===24
       && Math.round(R('#faultsBanner .stepbanner__tick').width)===20;})(),
   document.querySelector('#faultsBanner .stepbanner__t')
     ? Math.round(R('#faultsBanner').height)+' tall, tick '
       +Math.round(R('#faultsBanner .stepbanner__tick').width)
     : 'banner never painted');
ok('a filled disc on every detailed part',
   document.querySelectorAll('.fstatus circle[fill="#00654F"]').length===3,
   document.querySelectorAll('.fstatus circle[fill="#00654F"]').length);

/* Screen 3's geometry — four 163x200 dashed tiles on a 16px grid, their camera
   glyphs, the 124px footer — went with the Bike photos screen. It is archived
   whole (archive/bike-photos-screen/, see archive/README.md), and so is this
   block's worth of measurements: they belong to that file and would only rot
   here. What Mark penalties now ends with is a button, and it is asserted in
   flowtest where behaviour belongs.

   One thing this block also happened to hold has been kept, below: the
   breadcrumb bars agreeing with each other. That is a contract BETWEEN screens,
   so losing one screen must not lose it. The flow's 124px footer used to be
   measured here too; Mark penalties has none now, so it is measured on the
   Active checklists picker instead — same footer, same three numbers. */

/* The suffix collapses to zero WIDTH, not just zero opacity. Hidden with opacity
   alone it still occupied its width, overflowing the nowrap title line and
   truncating the bike number behind an ellipsis with a gap after it. */
{
  const bar=document.getElementById('faultsAppbar');
  const p=bar.querySelector('.appbar__titles p'), suf=bar.querySelector('.appbar__suffix');
  bar.classList.remove('is-collapsed');
  ok('at rest the suffix takes no width and the bike number is not truncated',
     Math.round(suf.getBoundingClientRect().width)===0 && p.scrollWidth <= p.clientWidth+1,
     Math.round(suf.getBoundingClientRect().width)+'px wide');
  bar.classList.add('is-collapsed');
  ok('collapsed it opens up and still fits',
     suf.getBoundingClientRect().width > 40 && p.scrollWidth <= p.clientWidth+1,
     Math.round(suf.getBoundingClientRect().width)+'px wide');
  /* A plain leading space is stripped at the start of an inline-block, running
     the slash into the number — so the separator is an &nbsp; inside the span. */
  ok('the number and the slash keep a space between them',
     /\u00a0\s*\//.test(p.textContent), JSON.stringify(p.textContent));
  bar.classList.remove('is-collapsed');
}

/* Every breadcrumb bar is one component: same row height, same back-button
   position, same text origin, same divider. The suffix bars drifted 2px up once
   the suffix became an inline-block — its baseline comes from its bottom margin
   edge when overflow is hidden, which grew the line box. */
{
  /* Measured against each screen's own left edge: parked screens are translated,
     so a phone-relative offset would compare a screen to where it is stored. */
  /* Two bars, not three — Bike photos carried the third and is archived. The
     assertion is still worth having with two: it is what catches one screen's
     breadcrumb drifting off the other's, which is exactly what happened when the
     suffix became an inline-block. */
  const bars=[['#assessAppbar','#assessBack','#assessAppbar .appbar__titles p'],
              ['#faultsAppbar','#faultsBack','#faultsAppbar .appbar__titles p']]
    .map(([h,b,t])=>{const hdr=document.querySelector(h);
      const row=hdr.querySelector('.appbar__row').getBoundingClientRect();
      const S=hdr.closest('.screen').getBoundingClientRect();
      return {row:Math.round(row.height),
              back:Math.round(document.querySelector(b).getBoundingClientRect().left-S.left),
              text:Math.round(document.querySelector(t).getBoundingClientRect().left-S.left),
              top: Math.round(document.querySelector(t).getBoundingClientRect().top-row.top)};});
  const same=k=>bars.every(b=>b[k]===bars[0][k]);
  ok('both breadcrumb bars agree on row height, back button and text origin',
     same('row') && same('back') && same('text'), JSON.stringify(bars));
  ok('and their breadcrumbs sit on the same baseline',
     same('top'), bars.map(b=>b.top).join(' / '));
}

/* Screen 4's geometry checks went with the summary screen — see README — and
   screen 3's with the Bike photos screen. Mark penalties' Done now ends the
   checklist, and it returns to the dashboard rather than to the task page. */
document.getElementById('faultsBack').click();
await new Promise(r=>setTimeout(r,450));
document.getElementById('assessBack').click();
await new Promise(r=>setTimeout(r,450));
ok('backing out lands on the assessment dashboard, not a summary',
   current==='rnm' && !document.getElementById('scrSummary'), current);

/* ── ACTIVE CHECKLISTS ─────────────────────────────────────────────────────
   The picker the dashboard's Active checklist row opens. Measured here because
   it carries two things the rest of the flow relies on: the parts list's 96px
   row rhythm, and the 124px CTA footer that used to be measured on Mark
   penalties. */
goTo('checklists');
await new Promise(r=>setTimeout(r,450));
ok('four checklists, one row each',
   document.querySelectorAll('#clList .cl-item').length===4,
   document.querySelectorAll('#clList .cl-item').length);
ok('a row is the list rhythm: 24 + 48 + 24 = 96',
   Math.round(R('#clList .cl-item').height)===96, R('#clList .cl-item').height);
ok('its divider is inset 24, like the parts list',
   Math.round(R('#clList .cl-item').left)===Math.round(R('#clScroll').left),
   R('#clList .cl-item').left+' / '+R('#clScroll').left);
/* Against the SCROLLER, not the row. Measured off the row this passed while the
   row itself was 48px wider than the phone and the checkbox was off-screen —
   the two moved together, so the gap between them was right and the position
   was not. A geometry assertion has to be anchored to something that cannot
   move with the thing it is measuring. */
ok('the checkbox lands 24 from the right edge of the screen',
   Math.round(R('#clScroll').right - R('#clList .cl-check svg').right)===24,
   R('#clScroll').right+' - '+R('#clList .cl-check svg').right);
ok('and the row is exactly as wide as the screen',
   Math.round(R('#clList .cl-item').width)===Math.round(R('#clScroll').width),
   R('#clList .cl-item').width+' / '+R('#clScroll').width);
ok('two are ticked to start with',
   document.querySelectorAll('#clList .cl-item[aria-checked="true"]').length===2,
   document.querySelectorAll('#clList .cl-item[aria-checked="true"]').length);
/* The footer is always here now — it carries the step CTA, which is not
   conditional on anything. Update is the part that comes and goes. */
/* At rest the footer holds the step CTA alone, full width on the 24px inset,
   and Update is collapsed to nothing above it. */
ok('the step CTA is in the frame, full width, with Update collapsed above it',
   Math.round(R('#clFoot').bottom)===Math.round(PB())
   && !document.getElementById('clFoot').classList.contains('is-editing')
   && Math.round(R('.clfoot__slot').height)===0
   && Math.round(R('#clNext').width)===Math.round(R('#clScroll').width - 48),
   R('#clNext').width+' of '+(R('#clScroll').width - 48)
     +', slot '+Math.round(R('.clfoot__slot').height));
ok('the footer is the flow\u2019s 124px',
   Math.round(R('#clFoot').height)===124, R('#clFoot').height);
document.querySelector('#clList .cl-item[data-cl="mre"]').click();
await new Promise(r=>setTimeout(r,450));
/* Dirty: Update grows in ABOVE the primary and pushes it down. Asserted as a
   class plus the two widths, not as a measured height — the growth is a
   grid-template-rows transition and headless does not tick transitions under
   virtual time, so the slot measures 0 for the whole run however long we wait.
   The widths are real either way: both buttons are width:100% of the footer's
   content box, collapsed or not, which is what "same width" means here.

   They were side by side once. That left the primary 115px of text box for a
   label that wants 140, and "Assessment done" wrapped onto two lines. */
ok('ticking a third grows Update in above the step CTA, at the same width',
   document.getElementById('clFoot').classList.contains('is-editing')
   && Math.round(R('#clUpdate').width)===Math.round(R('#clNext').width)
   && Math.round(R('#clUpdate').width)===Math.round(R('#clScroll').width - 48)
   && Math.round(R('#clNext span').height)===20,
   R('#clUpdate').width+' / '+R('#clNext').width);
document.getElementById('clUpdate').click();
await new Promise(r=>setTimeout(r,450));
/* activeChecklistCount, not the dashboard's row: Update stays on this page now,
   and the row behind it is repainted when the dashboard is next entered. */
ok('Update commits in place and hands the footer back',
   current==='checklists' && activeChecklistCount()===3
   && !document.getElementById('clFoot').classList.contains('is-editing'),
   current+' / '+activeChecklistCount());
/* Put it back, so nothing downstream measures a dashboard this block edited. */
document.querySelector('#clList .cl-item[data-cl="mre"]').click();
document.getElementById('clUpdate').click();
await new Promise(r=>setTimeout(r,450));
goTo('rnm'); await new Promise(r=>setTimeout(r,450));
/* Put the dashboard back into its REPAIR shape. The block below asks goTo('rnm')
   for it, and goTo is a no-op when you are already there — so without this the
   repair geometry would be measured against the assessment's rows. */
jobKind='repair'; enterRnm();
await new Promise(r=>setTimeout(r,60));

/* ── RnM dashboard — Figma 2470:40192 and 2470:40826 ────────────────────────
   The restructured screen puts every block on a stated line in the 844 frame and
   moves four of them when the open-tasks sheet comes up, so this is the one place
   in the flow where the measurements ARE the design. Measured from the screen's
   own top-left, not the viewport, and widths against the screen so the suite does
   not care what the harness sized the frame to.

   Wrapped, because a null selector in here does not fail — getBoundingClientRect
   on null throws and the harness reports a JSON decode error with no failure list
   at all. See src/MAP.md. */
try {
  jobKind='repair'; goTo('rnm');
  await new Promise(r=>setTimeout(r,120));
  /* The dashboard now rests with the open-tasks sheet UP, so the commands-visible
     geometry below has to be asked for. Same measurements as before — that state
     still exists, it is just no longer the one you arrive on. The sheet-up block
     further down raises it again and is unchanged. */
  rnmShowCommands();
  await new Promise(r=>setTimeout(r,120));
  const S = () => R('#scrRnm');
  const at = s => { const b=R(s), o=S();
    return {x:Math.round(b.left-o.left), y:Math.round(b.top-o.top),
            w:Math.round(b.width), h:Math.round(b.height)}; };
  const W = () => Math.round(S().width);

  /* Absolute y was the brittle half of this suite. Every one of those numbers sat
     downstream of a decision above it, so moving the hero 15px failed six
     assertions that had nothing to do with the hero, and changing which state the
     screen rests in failed five more. Sizes, insets and the gaps between
     neighbours are the contract and stay exact; where a thing SITS is asserted
     against the thing above it, or against the frame edge it anchors to. */
  ok('the gradient starts at the top and the readings straddle its bottom edge',
     (()=>{const h=at('#scrRnm .hero'), v=at('#scrRnm .vcard');
       return h.y===0 && v.h===68 && v.x===24 && v.w===W()-48
         && v.y < h.h && v.y + v.h > h.h;})(),
     JSON.stringify(at('#scrRnm .hero'))+' / '+JSON.stringify(at('#scrRnm .vcard')));
  ok('the vitals card carries the frame’s 2px border and radius 16',
     (()=>{const c=getComputedStyle(document.querySelector('#scrRnm .vcard'));
       return c.borderTopWidth==='2px' && c.borderTopColor==='rgb(232, 232, 232)'
         && c.borderTopLeftRadius==='16px';})(),
     getComputedStyle(document.querySelector('#scrRnm .vcard')).border);
  /* Inline, not behind a tab: 342 on the 24 inset, three 124px cards over an 80px
     row, sitting 24px under the readings — 2875:23253, where it was 8. */
  ok('the commands grid is inline, 24px under the readings and 208 tall',
     (()=>{const c=at('#scrRnm .commands'), v=at('#scrRnm .vcard');
       return c.y - (v.y + v.h) === 24 && c.h===208 && c.x===24;})(),
     JSON.stringify(at('#scrRnm .commands')));
  ok('row one is three 124px cards, row two is Seat over two columns and View all',
     (()=>{const g=at('#scrRnm .commands');
       const c=[...document.querySelectorAll('#scrRnm .cmd--stack')].map(e=>{
         const b=e.getBoundingClientRect(), o=S();
         return {x:Math.round(b.left-o.left), y:Math.round(b.top-o.top), h:Math.round(b.height)};});
       const seat=at('#scrRnm .cmd--wide'), va=at('#scrRnm .cmd--viewall');
       return c.length===3 && c.every(k=>k.y===g.y && k.h===124)
         && c[1].x-c[0].x===Math.round((W()-48+4)/3)
         && seat.y - (g.y + 124) === 4 && seat.h===80
         && va.y===seat.y && va.h===80
         && Math.round(seat.w) > Math.round(va.w)*1.9;})(),
     JSON.stringify(at('#scrRnm .cmd--wide')));
  ok('Power lights as an outlined ring on the card’s own grey, not a filled disc',
     (()=>{document.getElementById('btnPower').click();
       const c=getComputedStyle(document.getElementById('btnPower'));
       const lit=c.boxShadow.includes('1.5px') && c.backgroundColor==='rgb(247, 247, 247)';
       document.getElementById('btnPower').click();
       return lit;})(),
     getComputedStyle(document.getElementById('btnPower')).boxShadow);
  /* Put the screen in its resting state before measuring. Earlier blocks reach
     this dashboard too, and a tab is sticky — whichever one they left selected is
     the one that is still up. Asserting from wherever the suite happens to arrive
     made three assertions read the hidden panel and report zeros. */
  document.getElementById('rnTabTasks').click();
  await new Promise(r=>setTimeout(r,400));

  /* Measured off the frame's floor, which is what the CSS actually pins them to —
     and the floor is the viewport's when that is shorter than the design's 844. */
  ok('the tab bar is 88px flush with the frame\u2019s bottom edge',
     (()=>{const f=at('#scrRnm .rntabbar');
       return f.h===88 && f.y + f.h === Math.round(S().height)
         && getComputedStyle(document.querySelector('#scrRnm .rntabbar')).backgroundColor==='rgb(255, 255, 255)';})(),
     JSON.stringify(at('#scrRnm .rntabbar')));
  ok('two equal tabs split by a 48px hairline, each a 24px glyph over its label',
     /* The VISIBLE rule. There are two in the DOM and the first belongs to the
        assessment's Bike Info tab, which is display:none on a repair — so the
        bare selector measured a hidden hairline and read 0. */
     (()=>{const a=at('#rnTabTasks'), b=at('#rnTabBike');
       const rb=[...document.querySelectorAll('#scrRnm .rntabbar__rule')]
                  .filter(e=>e.offsetParent!==null)[0].getBoundingClientRect();
       const r={h:Math.round(rb.height)};
       return a.w===b.w && r.h===48
         && at('#rnTabTasks .rntabbar__glyph').w===24
         && at('#rnTabBike .rntabbar__glyph').w===24;})(),
     JSON.stringify(at('#rnTabTasks'))+' / '+JSON.stringify(at('#rnTabBike')));
  ok('the marker is 2px on the bar\u2019s top edge, the width of the live label',
     (()=>{const k=at('#rnTabInk'), f=at('#scrRnm .rntabbar');
       const lbl=at('#rnTabTasks span');
       return k.h===2 && Math.abs(k.y - f.y) <= 1 && Math.abs(k.w - lbl.w) <= 1;})(),
     JSON.stringify(at('#rnTabInk'))+' / '+JSON.stringify(at('#rnTabTasks span')));
  /* On BOTH tabs, and inside the frame on both. The marker summed the button's
     offset with the label's, and since the tabs are position:static the label's
     was already bar-relative — so the second tab doubled 195px and the marker
     left the frame. A one-tab assertion could not see it. */
  document.getElementById('rnTabBike').click();
  await new Promise(r=>setTimeout(r,400));
  ok('and it sits over the second label too, still inside the frame',
     (()=>{const k=R('#rnTabInk'), lbl=R('#rnTabBike span'), f=S();
       return Math.abs(k.left - lbl.left) <= 1 && Math.abs(k.width - lbl.width) <= 1
         && k.left >= f.left && k.right <= f.right;})(),
     JSON.stringify(at('#rnTabInk'))+' / '+JSON.stringify(at('#rnTabBike span')));
  document.getElementById('rnTabTasks').click();
  await new Promise(r=>setTimeout(r,400));

  // ── Open tasks panel — 2620:29006.
  ok('the heading sits on the 26px inset above the rows',
     (()=>{const h=at('#rnTasksHead'), r=at('#rowChecks');
       return h.x===26 && r.y > h.y + h.h;})(),
     JSON.stringify(at('#rnTasksHead')));
  ok('three 60px rows on a 76px pitch, the first on the 24px inset',
     (()=>{const y=['#rowChecks','#rowElec','#rowMech'].map(q=>at(q));
       /* The row is full-bleed and carries its own 24px padding, so its box
          starts at 0 — the tile inside it is what sits on the inset, asserted
          in the next check. */
       return y.every(k=>k.h===60) && y[0].x===0
         && y[1].y-y[0].y===76 && y[2].y-y[1].y===76;})(),
     ['#rowChecks','#rowElec','#rowMech'].map(q=>at(q).y).join(' / '));
  /* ── The assessment's shape of this panel ──────────────────────────────────
     Four rows instead of three, the last of them Penalty, then the CTA, then 24
     to the bar. The rows keep the repair's 76px pitch — the same component — so
     what is asserted here is only what differs. The screen is put back to the
     repair shape afterwards, or every assertion below inherits the change.
     ───────────────────────────────────────────────────────────────────────── */
  {
    const wasKind = jobKind;
    jobKind = 'assessment'; enterRnm();
    /* THREE rows, in the order the work is done. The checklist is step 1 rather
       than a button below the list; the two fault rows are one; and the penalty
       row is gone, because the penalties are the checklist's second tab. Same
       76px pitch as the repair's. */
    const FLOW_ROWS = ['#rowAssess','#rowFaults','#rowChecks'];
    ok('three rows on the same 76px pitch, in working order',
       (()=>{const y = FLOW_ROWS.map(q=>at(q));
         return y.every(k=>k.h===60)
           && y.slice(1).every((k,i)=>k.y-y[i].y===76);})(),
       FLOW_ROWS.map(q=>at(q).y).join(' / '));
    /* Every row wears the state of its step, not a chevron: a dashed ring or a
       filled disc, on the same 24px far inset the chevron had. */
    /* The VISIBLE rows: the panel also holds the repair's two fault rows, hidden
       on this side, and a hidden element measures 0. */
    ok('and each carries a 24px state mark on the far inset, no chevron',
       (()=>{const rows = [...document.querySelectorAll('#rnPanelTasks .trow')]
               .filter(r => r.offsetParent !== null);
         return rows.length===3
           && rows.every(r=>r.querySelector('.trow__tick').getBoundingClientRect().width===24)
           && rows.every(r=>r.querySelector('.trow__go').offsetParent===null)
           && Math.round(S().right - R('#rowAssess .trow__tick').right)===24;})(),
       Math.round(S().right - R('#rowAssess .trow__tick').right)+' from the edge');
    /* THE FOOTER IS ONLY UP WHILE THE ASSESSMENT IS UNTOUCHED — it slides out
       once the work is in flight and comes back at the end as the primary Task
       done, so the two measurements below need a known state. Earlier blocks
       leave parts judged, which counts as started. Saved and put back, because
       everything after this block inherits whatever it leaves. */
    const wasParts = PARTS.map(p => [p.status, p.penalty]);
    PARTS.forEach(p => { p.status = 'pending'; p.penalty = null; });
    RnM.resetAssessFlow(); enterRnm();
    ok('the CTA is 318x64 on the 36px inset, 24 under the last row',
       (()=>{const b = R('#btnAssessStep'), last = R('#rowChecks'), Sc = S();
         return Math.round(b.width)===318 && Math.round(b.height)===64
           && Math.round(b.left - Sc.left)===36
           && Math.round(b.top - last.bottom)===24;})(),
       Math.round(R('#btnAssessStep').width)+'x'+Math.round(R('#btnAssessStep').height)
         +' @'+Math.round(R('#btnAssessStep').left - S().left)
         +', '+Math.round(R('#btnAssessStep').top - R('#rowChecks').bottom)+' under');
    ok('and 24 from the CTA down to the tab bar',
       Math.round(R('#scrRnm .rntabbar').top - R('#btnAssessStep').bottom)===24,
       Math.round(R('#scrRnm .rntabbar').top - R('#btnAssessStep').bottom));
    PARTS.forEach((p, i) => { p.status = wasParts[i][0]; p.penalty = wasParts[i][1]; });
    enterRnm();
    /* Three tabs share the bar's width equally, and the third's divider matches
       the first's — the bar was built for two and had to take a third without
       either of them moving off centre. */
    ok('three tabs, evenly split, each with its own divider',
       (()=>{const t = [...document.querySelectorAll('#rnTabBar .rntabbar__tab')]
             .map(e=>e.getBoundingClientRect());
         const rules = [...document.querySelectorAll('#rnTabBar .rntabbar__rule')]
             .filter(e=>e.offsetParent !== null);
         const w = Math.round(t[0].width);
         return t.length===3 && rules.length===2
           && t.every(x=>Math.abs(Math.round(x.width)-w)<=1);})(),
       [...document.querySelectorAll('#rnTabBar .rntabbar__tab')]
         .map(e=>Math.round(e.getBoundingClientRect().width)).join('/'));
    /* The bike is Bike essentials' now. Asserted as a pair, because the point is
       the difference between the two panels and not that the footage can be
       hidden. The gradient has to survive both — the app bar and the timer are
       drawn on it either way. */
    const heroShown = () => document.querySelector('#scrRnm .hero-media').offsetParent !== null;
    ok('no bike over Tasks added, and the gradient stays',
       !heroShown() && R('#scrRnm .hero').height > 0,
       'media '+heroShown()+', hero '+Math.round(R('#scrRnm .hero').height));
    document.getElementById('rnTabBike').click();
    ok('the bike is back on Bike essentials',
       heroShown(), 'media '+heroShown());
    /* Back to Tasks added before leaving: the tab is not reset on entry, so
       every assertion after this one would arrive on the wrong panel. */
    document.getElementById('rnTabTasks').click();
    jobKind = wasKind; enterRnm();
  }
  /* The mechanic keeps the bike on both tabs — this screen is signed off. */
  ok('the repair shows the bike on both of its tabs',
     (()=>{const shown = () =>
             document.querySelector('#scrRnm .hero-media').offsetParent !== null;
       const a = shown();
       document.getElementById('rnTabBike').click();
       const b = shown();
       document.getElementById('rnTabTasks').click();
       return a && b;})(),
     'ok');
/* Named row, not the first `.trow__art` in the document: the first one now
   belongs to #rowAssess, which is the assessment's step 1 and display:none on a
   repair — so the bare selector measured a hidden element and read 0. */
  ok('the tile is 60px on the 24px inset and the chevron is 24px on the far one',
     at('#rowChecks .trow__art').x===24 && at('#rowChecks .trow__art').w===60
     && Math.round(S().right - R('#rowChecks .trow__go').right)===24
     && at('#rowChecks .trow__go').w===24,
     at('#rowChecks .trow__art').w+' / '+Math.round(S().right - R('#rowChecks .trow__go').right));

  // ── the hero on Tasks done — 2621:29546. The part-exchange summary.
  ok('the summary card is 280x145, centred where the bike sits',
     (()=>{const c=at('#scrRnm .pxcard');
       return c.w===280 && c.h===145 && Math.abs((c.x + c.w/2) - W()/2) <= 1
         && c.y===211;})(),
     JSON.stringify(at('#scrRnm .pxcard')));
  /* The whole card is the control, so the assertion is its internal rhythm:
     20 header, 20, hairline, 20, 40 barcode, 20 = 145 — the 24 / 52 rhythm
     scaled down with the card. */
  ok('header, rule and barcode keep the frame\u2019s rhythm inside it',
     (()=>{const c=at('#scrRnm .pxcard'), h=at('#scrRnm .pxcard__head'),
             r=at('#scrRnm .pxcard__rule'), b=at('#scrRnm .pxcard__code');
       /* Measured off each block's BOTTOM edge, and to the nearest pixel: the
          hairline is 1px tall and the barcode window lands on a half pixel, so
          exact equality here fails on rounding rather than on layout. */
       const near = (a, b) => Math.abs(a - b) <= 1;
       return near(h.y - c.y, 20) && h.h === 24
         && near(r.y - (h.y + h.h), 20)
         && near(b.y - (r.y + r.h), 20) && near(b.h, 40)
         && near((c.y + c.h) - (b.y + b.h), 20)
         && !document.querySelector('#scrRnm .pxcard__counts');})(),
     [at('#scrRnm .pxcard__head').y, at('#scrRnm .pxcard__rule').y,
      at('#scrRnm .pxcard__code').y].join(' / '));
  ok('the title leads and a 24px chevron takes the far edge',
     (()=>{const c=at('#scrRnm .pxcard'), t=at('#scrRnm .pxcard__title'),
             g=at('#scrRnm .pxcard__go');
       return t.x - c.x === 20 && g.w === 24
         && (c.x + c.w) - (g.x + g.w) === 20;})(),
     JSON.stringify(at('#scrRnm .pxcard__go')));

  // ── Bike essentials panel — 2621:29241.
  document.getElementById('rnTabBike').click();
  await new Promise(r=>setTimeout(r,60));
  ok('the readings and the grid sit on the frame\u2019s inset, 24 apart',
     (()=>{const v=at('#scrRnm .vcard'), g=at('#scrRnm .commands');
       return v.x===24 && v.h===68 && g.x===24
         && g.y - (v.y + v.h) === 24;})(),
     JSON.stringify(at('#scrRnm .vcard'))+' / '+JSON.stringify(at('#scrRnm .commands')));
  document.getElementById('rnTabTasks').click();
  await new Promise(r=>setTimeout(r,60));
} catch(e) {
  ok('RnM dashboard geometry', false, 'THREW '+(e && e.message)+' — '+String(e && e.stack).split('\n')[1]);
}

document.title='RESULT'+JSON.stringify(out);
"""
doc = html + "\n<script>window.addEventListener('load',async()=>{" + CHECKS + "});</script>"
with tempfile.NamedTemporaryFile("w",suffix=".html",dir=pathlib.Path(__file__).parent,delete=False) as t:
    t.write(doc); p=pathlib.Path(t.name)
try:
    d=subprocess.run([CHROME,"--headless=new","--disable-gpu","--window-size=460,1000",
        "--virtual-time-budget=15000","--dump-dom",f"file://{p}"],
        capture_output=True,text=True,timeout=180).stdout
finally:
    p.unlink(missing_ok=True)
i=d.find("RESULT")
res=json.loads(H.unescape(d[i+6:d.find("</title>",i)]))
for r in res: print(("PASS " if r["pass"] else "FAIL ")+r["t"]+("" if r["pass"] else f"   → {r['got']}"))
print(f"\n{sum(r['pass'] for r in res)}/{len(res)} passed")
