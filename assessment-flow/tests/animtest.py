import subprocess, pathlib, json, re
SP=pathlib.Path(__file__).parent
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE=(SP.parent/"prototype.html").read_text()

def run(extra_css, script):
    f=SP/"_a.html"; f.write_text(BASE+extra_css+script)
    out=subprocess.run([CHROME,"--headless=new","--disable-gpu","--hide-scrollbars",
      "--window-size=390,900","--virtual-time-budget=20000","--dump-dom",f"file://{f}"],
      capture_output=True,text=True).stdout
    f.unlink()
    m=re.search(r'<title>RESULTS(.*?)</title>',out,re.S)
    return json.loads(m.group(1)) if m else None

# ── A. geometry, transitions off (headless virtual time cannot tick them) ──
GEO=r"""
<script>
const log=[]; const ok=(n,c,g)=>log.push({t:n,pass:!!c,got:g});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const Q=s=>document.querySelector(s);
const H=()=>Math.round(Q('#sheet').getBoundingClientRect().height);
const CH=()=>Math.round(Q('#sheetCollapse').getBoundingClientRect().height);
const dividerH=()=>Q('.sheet__divider').getBoundingClientRect().height;
(async()=>{
  activeIndex=2; render(); openSheet(2,'mark','faulty'); await sleep(400);
  const hF=H(); ok('faulty shows divider', dividerH()>0, dividerH());
  Q('.tog--good').click(); await sleep(400);
  const hG=H();
  ok('good is shorter than faulty', hG<hF, `${hF} -> ${hG}`);
  ok('collapsed region fully gone (no 24px ghost)', CH()<=1, CH());
  ok('good has no divider', Q('.sheet__collapseInner').getBoundingClientRect().height<=1,
     Q('.sheet__collapseInner').getBoundingClientRect().height);
  Q('.tog--faulty').click(); await sleep(400);
  ok('returns to faulty height', Math.abs(H()-hF)<=1, `${H()} vs ${hF}`);
  ok('good sheet height matches Figma-minus-divider (256)', Math.abs(hG-256)<=2, hG);

  // colours (measured here because a live transition reports its start value)
  Q('.tog--good').click(); await sleep(80);
  ok('selected tick is surface/positive',
     getComputedStyle(Q('.tog--good')).backgroundColor==='rgb(0, 101, 79)',
     getComputedStyle(Q('.tog--good')).backgroundColor);
  ok('selected tick glyph is white',
     getComputedStyle(Q('.tog--good')).color==='rgb(255, 255, 255)',
     getComputedStyle(Q('.tog--good')).color);
  Q('.tog--faulty').click(); await sleep(80);
  ok('unselected tick glyph is content/primary',
     getComputedStyle(Q('.tog--good')).color==='rgb(34, 34, 34)',
     getComputedStyle(Q('.tog--good')).color);
  ok('unselected tick bg is surface/secondary',
     getComputedStyle(Q('.tog--good')).backgroundColor==='rgb(247, 247, 247)',
     getComputedStyle(Q('.tog--good')).backgroundColor);
  ok('selected cross is surface/negative',
     getComputedStyle(Q('.tog--faulty')).backgroundColor==='rgb(193, 53, 21)',
     getComputedStyle(Q('.tog--faulty')).backgroundColor);
  document.title='RESULTS'+JSON.stringify(log);
})();
</script>"""

# ── B. is the change actually animated, or does it snap? ──
ANIM=r"""
<script>
const log=[]; const ok=(n,c,g)=>log.push({t:n,pass:!!c,got:g});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const Q=s=>document.querySelector(s);
(async()=>{
  activeIndex=2; render(); openSheet(2,'mark','faulty'); await sleep(500);
  const el=Q('#sheetCollapse');
  ok('no stray animation while idle', el.getAnimations().length===0, el.getAnimations().length);

  Q('.tog--good').click();
  const anims=el.getAnimations();
  ok('collapsing runs a transition (does not snap)', anims.length>0, anims.length);
  const props=anims.map(a=>a.transitionProperty||'').join(',');
  ok('it is grid-template-rows that animates', props.includes('grid-template-rows'), props);
  const dur=anims.map(a=>a.effect.getTiming().duration);
  ok('duration is 320ms', dur.includes(320), dur.join());

  // opening straight into good must NOT animate on entry
  Q('#scrim').click(); await sleep(600);
  PARTS[0].status='good'; render(); openSheet(0,'edit');
  ok('good sheet does not fold shut on entry',
     Q('#sheetCollapse').getAnimations().length===0,
     Q('#sheetCollapse').getAnimations().length);

  document.title='RESULTS'+JSON.stringify(log);
})();
</script>"""

allres=[]
for label,css,js in (("geometry (transitions off)",'<style>*{transition:none!important}</style>',GEO),
                     ("animation + colour",'',ANIM)):
    r=run(css,js)
    print(f"--- {label} ---")
    if r is None: print("   harness failed"); continue
    for x in r: print(("  PASS  " if x['pass'] else "  FAIL  ")+x['t']+f"   ({x['got']})")
    allres+=r
bad=[x for x in allres if not x['pass']]
print(f"\n{len(allres)-len(bad)}/{len(allres)} passed")
