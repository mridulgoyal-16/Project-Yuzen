import subprocess, pathlib, json, re
SP=pathlib.Path(__file__).parent
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE=(SP.parent/"prototype.html").read_text()
TEST=r"""
<script>
const log=[]; const ok=(n,c,g)=>log.push({t:n,pass:!!c,got:g});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* A real tap = pointerdown on the card (the button is inside it), then click. */
function tap(sel){
  const el=document.querySelector(sel); const r=el.getBoundingClientRect();
  const x=r.left+r.width/2, y=r.top+r.height/2;
  const card=document.querySelector('.card');
  card.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:x,clientY:y,bubbles:true,cancelable:true,button:0,isPrimary:true,pointerType:'touch'}));
  card.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:x,clientY:y,bubbles:true,cancelable:true,button:0,isPrimary:true,pointerType:'touch'}));
  el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
}
(async()=>{
  // tap "Good"
  const n0=PARTS[0].name;
  tap('.btn-good'); await sleep(900);
  ok('tap Good marks good', PARTS[0].status==='good', PARTS[0].status);
  ok('tap Good advances', activeIndex===1, activeIndex);

  // tap "Faulty"
  tap('.btn-faulty'); await sleep(900);
  ok('tap Faulty opens sheet', document.getElementById('sheet').classList.contains('is-open'), true);
  ok('tap Faulty not committed yet', PARTS[1].status==='pending', PARTS[1].status);
  document.querySelectorAll('#issueChips .chip')[0].click();
  document.getElementById('sheetConfirm').click();
  await sleep(800);
  ok('tap Faulty commits after Confirm', PARTS[1].status==='faulty', PARTS[1].status);
  ok('advances after faulty', activeIndex===2, activeIndex);

  // a tap must never leave the card mid-drag
  const c=document.querySelector('.card');
  ok('card not left transformed', !c.style.transform||c.style.transform.includes('0px')||c.style.transform==='' ,
     c.style.transform||'(none)');

  // double-tap guard: second tap while animating must be ignored
  tap('.btn-good'); tap('.btn-good');
  await sleep(1000);
  ok('double tap marks only one part',
     PARTS.filter(p=>p.status!=='pending').length===3,
     PARTS.filter(p=>p.status!=='pending').length);

  document.title='RESULTS'+JSON.stringify(log);
})();
</script>"""
f=SP/"_c.html"; f.write_text(BASE+TEST)
out=subprocess.run([CHROME,"--headless=new","--disable-gpu","--hide-scrollbars",
 "--window-size=390,900","--virtual-time-budget=20000","--dump-dom",f"file://{f}"],
 capture_output=True,text=True).stdout
f.unlink()
m=re.search(r'<title>RESULTS(.*?)</title>',out,re.S)
if not m: print("harness failed"); raise SystemExit(1)
res=json.loads(m.group(1)); bad=[r for r in res if not r['pass']]
for r in res: print(("  PASS  " if r['pass'] else "  FAIL  ")+r['t']+("" if r['pass'] else f"   got={r['got']!r}"))
print(f"\n{len(res)-len(bad)}/{len(res)} passed")
