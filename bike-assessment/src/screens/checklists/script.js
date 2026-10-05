/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVE CHECKLISTS — which lists of parts this assessment runs
   ═══════════════════════════════════════════════════════════════════════════
   The dashboard's Active checklist row counts CHECKLISTS now, not parts: "2
   checklists", where it used to say "17 active". The two numbers answer
   different questions and the row was answering the wrong one — how many parts
   are still pending is progress, and progress belongs to the carousel that is
   making it, not to the row that opens the picker.

   Nothing here is wired to the parts themselves yet. Selecting MRE does not add
   its six parts to the carousel: PARTS is one fixed list and splitting it by
   checklist is a data change, not a screen. So this page is honest about what it
   IS today — the record of which checklists are running — and the counts below
   are chosen so it cannot lie about the ones that are.
   ═══════════════════════════════════════════════════════════════════════════ */

/* The two running checklists between them ARE the carousel, so their counts are
   derived from it rather than typed. Otherwise this page would go on saying 17
   after somebody added an eighteenth part. */
const CL_PERIODIC = 9;

/* `locked` is a checklist the bike ARRIVES with — assigned to it upstream, not
   chosen here. It shows ticked and cannot be untucked: a QCA can add to what the
   bike was sent in for, and cannot quietly decide not to do it. The other two are
   theirs to turn on and off. */
const CHECKLISTS = [
  {id:"periodic", name:"Periodic maintenance", items:CL_PERIODIC,                 on:true,  locked:true},
  {id:"monsoon",  name:"Monsoon checklist",    items:PARTS.length - CL_PERIODIC,  on:true,  locked:true},
  {id:"mre",      name:"MRE checklist",        items:6,                           on:false},
  {id:"xyz",      name:"XYZ checklist",        items:4,                           on:false},
];

/* What is SAVED, as against what is on screen. The Update button exists because
   the two can differ — a checkbox on this page is a proposal until it is
   pressed, which is why leaving by the back arrow changes nothing. */
let clSaved = CHECKLISTS.filter(c => c.on).map(c => c.id);
let clDraft = clSaved.slice();

/* Read by the dashboard. A function rather than a number because the row is
   repainted on every entry and the count moves. */
function activeChecklistCount(){ return clSaved.length; }

/* Local. Three screens have one of these and every one of them is inside an
   IIFE, so there is no global tap() to borrow — calling it as though there were
   is a ReferenceError inside the handler, which swallows the whole tap. */
function clTap(){ if (navigator.vibrate) navigator.vibrate(10); }

const clList   = document.getElementById("clList");
const clFoot   = document.getElementById("clFoot");
const clUpdate = document.getElementById("clUpdate");
const clNext   = document.getElementById("clNext");

const clDirty = () =>
  clDraft.length !== clSaved.length || clDraft.some(id => !clSaved.includes(id));

function paintChecklists(){
  clList.innerHTML = CHECKLISTS.map(c => {
    const on = clDraft.includes(c.id);
    /* The whole row is the control, not the box on the end of it — a 24px target
       for the one thing this page does, with 342px of dead text beside it, is a
       row you have to aim at. One <button> rather than a row that CONTAINS one:
       nesting a button inside a clickable div gives the same tap two owners, and
       role=checkbox on the row is what makes it announce as one thing.

       aria-disabled rather than the disabled attribute on a locked row: a
       disabled button drops out of the tab order and most screen readers stop
       announcing it, and the state of a checklist the bike came in with is worth
       reading even though it cannot be changed. The tap is refused in the
       handler instead. */
    return `<button class="cl-item" type="button" role="checkbox"
                    aria-checked="${on}"${c.locked ? ' aria-disabled="true"' : ""}
                    data-cl="${c.id}">
      <span class="cl-item__text">
        <span class="t-label-md cl-item__name">${esc(c.name)}</span>
        <span class="t-label-sm cl-item__sub">${c.items} items</span>
      </span>
      <span class="cl-check">${ICON.checkbox(on)}</span>
    </button>`;
  }).join("");
  /* Two buttons and one of them is usually absent. Clean, the page is finished
     with and the step CTA is live. Dirty, the only thing worth doing is saving
     the change, so Update appears and the primary goes disabled — offering to
     move on from an edit nobody committed is how an edit gets lost.

     There is no third state where both are live: "next" would have to choose
     between saving and discarding on the QCA's behalf, and neither answer is
     safe to guess. */
  const dirty = clDirty();
  /* A class on the footer, not `hidden` on the button: Update grows in and
     pushes the primary down, and `hidden` cannot be animated. Collapsed it is
     zero-height inside an overflow:hidden row, so it cannot be tapped, but it is
     still in the tab order — hence the two attributes below. */
  clFoot.classList.toggle("is-editing", dirty);
  clUpdate.tabIndex = dirty ? 0 : -1;
  clUpdate.setAttribute("aria-hidden", String(!dirty));
  clNext.disabled = dirty;
  clNext.querySelector("span").textContent = stepLabel();
  paintStepBanner(document.getElementById("clBanner"), "checks");
}

/* Delegated: the rows are rewritten on every repaint, so a listener bound to a
   checkbox would not survive its own click. */
clList.addEventListener("click", e => {
  const btn = e.target.closest(".cl-item");
  if (!btn) return;
  /* Locked: the bike was sent in for this one. Silently ignored rather than
     toasted — the row already looks like it cannot be pressed, and a message
     every time a thumb lands on it would be scolding. */
  if (btn.getAttribute("aria-disabled") === "true") return;
  clTap();
  const id = btn.dataset.cl;
  clDraft = clDraft.includes(id) ? clDraft.filter(x => x !== id) : clDraft.concat(id);
  paintChecklists();
});

/* Back DISCARDS, which is the other way out of a dirty page and the reason the
   primary can be disabled without trapping anyone: there is always something to
   press. It lands on the dashboard, like every back arrow in this flow. */
document.getElementById("clBack").addEventListener("click", () => { clTap(); goTo("rnm"); });

/* Update commits and STAYS. It used to save and return to the dashboard, which
   made saving and leaving the same act — so a QCA who wanted to change the
   selection and carry on had to come back in. Now the page goes clean, the
   primary lights up, and the way on is the same button it is everywhere else. */
clUpdate.addEventListener("click", () => {
  clTap();
  clSaved = clDraft.slice();
  CHECKLISTS.forEach(c => { c.on = clSaved.includes(c.id); });
  paintChecklists();
});

/* The step CTA. Disabled while the page is dirty, so this cannot fire on an
   uncommitted change. */
clNext.addEventListener("click", () => { clTap(); RnM.advance(); });

function enterChecklists(){
  /* The draft is thrown away on the way IN, not on the way out: a QCA who ticks
     MRE, backs out and returns should find the page as they last saved it, and
     doing it here means every route in gets that without each one remembering. */
  clDraft = clSaved.slice();
  paintChecklists();
}

paintChecklists();
