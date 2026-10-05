import subprocess, pathlib, json, re
SP=pathlib.Path(__file__).parent
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE=(SP.parent/"prototype.html").read_text()
TEST=r"""
<script>
const log=[]; const ok=(n,c,g)=>log.push({t:n,pass:!!c,got:g});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const Q=s=>document.querySelector(s);
const nSel=()=>document.querySelectorAll('#issueChips .chip.is-selected').length;
(async()=>{
  // set up: part0 good, part1 faulty with 2 reasons
  PARTS[0].status='good';
  PARTS[1].status='faulty'; PARTS[1].reasons_selected=[PARTS[1].reasons[0],PARTS[1].reasons[1]];
  activeIndex=2; render(); await sleep(50);

  ok('every collapsed row is tappable',
     document.querySelectorAll('.item--tappable').length===PARTS.length-1,
     document.querySelectorAll('.item--tappable').length);

  // jump forward to a pending part far down the list
  const far=PARTS.length-1;
  document.querySelector(`[data-index="${far}"]`).click(); await sleep(400);
  ok('tapping a pending row opens it as the card', activeIndex===far, activeIndex);
  ok('jumped part is the expanded one',
     Q('.item--expanded .t-label-md700').textContent===PARTS[far].name,
     Q('.item--expanded .t-label-md700').textContent);
  ok('tapping a pending row does NOT open the sheet',
     !Q('#sheet').classList.contains('is-open'), true);
  // and jump back
  document.querySelector('[data-index="2"]').click(); await sleep(400);
  ok('can jump backwards too', activeIndex===2, activeIndex);
  // marking still advances to the next pending, not back to the top
  Q('.btn-good').click(); await sleep(700);
  ok('marking after a jump advances forward', activeIndex===3, activeIndex);
  PARTS[2].status='pending'; activeIndex=2; render(); await sleep(50);

  // ── edit a GOOD part
  document.querySelector('[data-index="0"]').click(); await sleep(400);
  ok('edit opens sheet', Q('#sheet').classList.contains('is-open'), true);
  ok('good edit: tick is on', Q('.tog--good').classList.contains('is-on'), true);
  ok('good edit: issues collapsed', Q('#sheetCollapse').classList.contains('is-collapsed'),
     Q('#sheetCollapse').className);
  ok('good edit: confirm enabled', !Q('#sheetConfirm').disabled, true);
  ok('sheet shows the part name', Q('#sheetName').textContent===PARTS[0].name, Q('#sheetName').textContent);

  // flip good -> faulty inside the sheet
  Q('.tog--faulty').click(); await sleep(50);
  ok('toggle to faulty reveals issues', !Q('#sheetCollapse').classList.contains('is-collapsed'),
     Q('#sheetCollapse').className);
  ok('faulty with no reason blocks confirm', Q('#sheetConfirm').disabled, true);
  document.querySelectorAll('#issueChips .chip')[0].click();
  Q('#sheetConfirm').click(); await sleep(500);
  ok('edit converts good -> faulty', PARTS[0].status==='faulty', PARTS[0].status);
  ok('edit did NOT move the active card', activeIndex===2, activeIndex);

  // ── edit a FAULTY part: existing reasons must be pre-filled
  document.querySelector('[data-index="1"]').click(); await sleep(400);
  ok('faulty edit: cross is on', Q('.tog--faulty').classList.contains('is-on'), true);
  ok('faulty edit pre-fills reasons', nSel()===2, nSel());

  // flip faulty -> good, reasons should be dropped
  Q('.tog--good').click(); await sleep(50);
  Q('#sheetConfirm').click(); await sleep(500);
  ok('edit converts faulty -> good', PARTS[1].status==='good', PARTS[1].status);
  ok('reasons cleared on becoming good',
     PARTS[1].reasons_selected.length===0, JSON.stringify(PARTS[1].reasons_selected));

  // ── dismissing an EDIT must not change anything
  const before=JSON.stringify([PARTS[1].status,PARTS[1].reasons_selected]);
  document.querySelector('[data-index="1"]').click(); await sleep(400);
  Q('.tog--faulty').click();                       // change mind...
  Q('#scrim').click(); await sleep(500);           // ...then back out
  ok('dismissing an edit changes nothing',
     JSON.stringify([PARTS[1].status,PARTS[1].reasons_selected])===before,
     JSON.stringify([PARTS[1].status,PARTS[1].reasons_selected]));
  ok('dismissing an edit keeps active card', activeIndex===2, activeIndex);

  // ── row icons are filled, not outlined
  const svg=document.querySelector('.item--tappable .row__status svg').innerHTML;
  ok('row status icon is a filled disc', svg.includes('<circle'), svg.slice(0,40));

  document.title='RESULTS'+JSON.stringify(log);
})();
</script>"""
f=SP/"_e.html"; f.write_text(BASE+TEST)
out=subprocess.run([CHROME,"--headless=new","--disable-gpu","--hide-scrollbars",
 "--window-size=390,900","--virtual-time-budget=25000","--dump-dom",f"file://{f}"],
 capture_output=True,text=True).stdout
f.unlink()
m=re.search(r'<title>RESULTS(.*?)</title>',out,re.S)
if not m: print("harness failed"); print(out[:400]); raise SystemExit(1)
res=json.loads(m.group(1)); bad=[r for r in res if not r['pass']]
for r in res: print(("  PASS  " if r['pass'] else "  FAIL  ")+r['t']+("" if r['pass'] else f"   got={r['got']!r}"))
print(f"\n{len(res)-len(bad)}/{len(res)} passed")
