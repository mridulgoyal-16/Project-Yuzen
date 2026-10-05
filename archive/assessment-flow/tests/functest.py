import subprocess, pathlib, json, re
SP=pathlib.Path(__file__).parent
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE=(SP.parent/"prototype.html").read_text()

TEST = r"""
<script>
const log=[]; const ok=(n,c,d)=>log.push({t:n,pass:!!c,got:d});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function pe(el,type,x,y,id){
  el.dispatchEvent(new PointerEvent(type,{pointerId:id||1,clientX:x,clientY:y,
    bubbles:true,cancelable:true,button:0,isPrimary:true,pointerType:'touch'}));
}
async function swipe(dx,dy,steps){
  const card=document.querySelector('.card');
  if(!card) return null;
  const r=card.getBoundingClientRect();
  const x0=r.left+r.width/2, y0=r.top+r.height/2;
  pe(card,'pointerdown',x0,y0);
  for(let i=1;i<=(steps||10);i++){
    pe(card,'pointermove',x0+dx*i/(steps||10),y0+dy*i/(steps||10));
    await sleep(16);
  }
  pe(card,'pointerup',x0+dx,y0+dy);
  return card;
}

(async ()=>{
  // 1 ── swipe right past threshold => good, advances
  const first=PARTS[0].name;
  await swipe(200,0);
  await sleep(900);
  ok('swipe right marks good', PARTS[0].status==='good', PARTS[0].status);
  ok('advances to next part', activeIndex===1, activeIndex);
  ok('marked row shows in list',
     !!document.querySelector('.item--collapsed .row__status svg'), true);

  // 2 ── short swipe below threshold => springs back, no mark
  await swipe(40,0);
  await sleep(600);
  ok('short swipe does not mark', PARTS[1].status==='pending', PARTS[1].status);
  ok('card restored', getComputedStyle(document.querySelector('.card')).opacity==='1',
     getComputedStyle(document.querySelector('.card')).opacity);

  // 3 ── vertical drag => treated as scroll, never marks
  await swipe(0,120);
  await sleep(500);
  ok('vertical drag does not mark', PARTS[1].status==='pending', PARTS[1].status);

  // 4 ── swipe left => opens the reason sheet, nothing committed yet
  await swipe(-200,0);
  await sleep(700);
  ok('swipe left opens sheet', document.getElementById('sheet').classList.contains('is-open'), true);
  ok('faulty not committed before Confirm', PARTS[1].status==='pending', PARTS[1].status);
  ok('confirm disabled with no reason', document.getElementById('sheetConfirm').disabled, true);

  // 5 ── exclusivity. Re-query every time, exactly as a real tap would hit
  //      whatever node is on screen at that moment.
  const R=i=>document.querySelectorAll('#issueChips .chip')[i];
  const M=()=>[...document.querySelectorAll('#issueChips .chip')].pop();
  // count selected REASONS only — "Missing" now shares the same container
  const nSel=()=>[...document.querySelectorAll('#issueChips .chip.is-selected')]
                  .filter(c=>c.dataset.reason!=='Missing').length;
  ok('Missing sits on the same line as the reasons',
     M().parentElement===R(0).parentElement, M().parentElement.id);
  R(0).click(); R(1).click();
  ok('two reasons multi-select', nSel()===2, nSel());
  ok('Missing stays reachable while reasons picked', !M().disabled, M().disabled);

  // switching straight to Missing must work without clearing reasons first
  M().click();
  ok('Missing takes over from reasons', M().classList.contains('is-selected'), M().className);
  ok('Missing clears reasons', nSel()===0, nSel());
  ok('nothing is ever disabled',
     [...document.querySelectorAll('#issueChips .chip')].every(c=>!c.disabled),
     [...document.querySelectorAll('#issueChips .chip')].map(c=>c.disabled).join());
  // the reverse switch: tapping a reason while Missing is on must take over
  R(0).click();
  ok('a reason takes over from Missing', nSel()===1 && !M().classList.contains('is-selected'),
     `reasons=${nSel()} missingOn=${M().classList.contains('is-selected')}`);
  M().click();

  // and back again — never a dead end
  M().click();
  ok('deselecting Missing clears everything', nSel()===0 && !M().classList.contains('is-selected'),
     `reasons=${nSel()}`);
  ok('confirm disabled again when nothing picked',
     document.getElementById('sheetConfirm').disabled, true);
  M().click();                                          // settle on Missing

  // 6 ── confirm commits with reasons
  document.getElementById('sheetConfirm').click();
  await sleep(700);
  ok('confirm commits faulty', PARTS[1].status==='faulty', PARTS[1].status);
  ok('reason stored', JSON.stringify(PARTS[1].reasons_selected)==='["Missing"]',
     JSON.stringify(PARTS[1].reasons_selected));
  ok('reason shown on collapsed row',
     [...document.querySelectorAll('.row__reasons')].some(e=>e.textContent==='Missing'),
     [...document.querySelectorAll('.row__reasons')].map(e=>e.textContent).join('|'));
  ok('sheet closed', !document.getElementById('sheet').classList.contains('is-open'), true);

  // 7 ── cancelling the sheet reverts the swipe
  await swipe(-200,0); await sleep(900);
  document.getElementById('scrim').click();
  await sleep(600);
  ok('cancel reverts to pending', PARTS[2].status==='pending', PARTS[2].status);
  ok('cancel restores card', !!document.querySelector('.card') &&
     getComputedStyle(document.querySelector('.card')).opacity==='1', true);

  // 8 ── placeholder parts still render a card
  activeIndex=PARTS.findIndex(p=>!p.photo); render();
  ok('placeholder part renders card', !!document.querySelector('.card .card__media'), true);

  // 9 ── completing everything enables Next
  PARTS.forEach(p=>p.status='good'); activeIndex=-1; render();
  ok('Next enabled when complete', !document.getElementById('nextBtn').disabled, true);
  ok('progress 100%', document.getElementById('progressFill').style.width==='100%',
     document.getElementById('progressFill').style.width);

  document.title='RESULTS'+JSON.stringify(log);
})();
</script>
"""
f=SP/"_functest.html"; f.write_text(BASE+TEST)
out=subprocess.run([CHROME,"--headless=new","--disable-gpu","--hide-scrollbars",
    "--window-size=390,900","--virtual-time-budget=30000","--dump-dom",f"file://{f}"],
    capture_output=True,text=True).stdout
f.unlink()
m=re.search(r'<title>RESULTS(.*?)</title>', out, re.S)
if not m:
    print("TEST HARNESS DID NOT COMPLETE"); print(out[:600]); raise SystemExit(1)
res=json.loads(m.group(1))
bad=[r for r in res if not r['pass']]
for r in res:
    print(("  PASS  " if r['pass'] else "  FAIL  ")+r['t']+("" if r['pass'] else f"   got={r['got']!r}"))
print(f"\n{len(res)-len(bad)}/{len(res)} passed")
