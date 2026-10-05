
/* ========================================================================
   ISSUES — ported from mechanic-rnm-flow/
   Wrapped, so none of her consts reach this app's globals; enterIssues() is the
   only export. Her hook table is window.YuzenIQIQ — the token queue and the
   RnM dashboard both define window.YuzenIQ, and the RnM one lost that race silently.
   ======================================================================== */
let enterIssues = () => {};
let issuesByPart = () => ({});
/* The write direction of the same bridge — see the definition at the foot of this
   file. Add issues and the servicing checklist both file against this record. */
let applyMarkedIssues = () => {};
let issuesAllResolved = () => false;
let issuesTally = () => ({done:0, total:0});
/* The same figures split by section, for the dashboard's two issue rows. */
let issuesTallyBy = () => ({done:0, total:0});
/* Open the list on a named section. The dashboard has a row per section now, so
   tapping one has to land on it rather than on whichever was last looked at. */
let issuesShowSection = () => {};
/* Which flow the record is being read by. A repair arrives at a bike that already
   has mechanical issues filed against it; an assessment is the visit that decides
   whether it has any. So the two mechanical rows this file seeds belong to the
   repair, and the dashboard says which flow it is before it paints. */
let prepareIssuesFor = () => {};
/* Read by the Part exchange screen. Every mechanical issue that could take a
   spare, and whether that spare is in the mechanic's hands yet — which is the
   whole of what separates its two bands. */
let spareQueue = () => [];
/* The faults the BIKE reported about itself, by name. Read by the Sr. Mechanic's
   allocation page, which lists them beside the ones a QCA marked by hand — see
   screens/alloc. Names only: that page shows them, it cannot settle them, and
   handing it the rows would let it think it could. */
let issuesElectrical = () => [];
(function(){

"use strict";

/* ══════════════════════════════════════════════════════════════════════════
   STITCHING CONTRACT — this screen's whole outbound surface.
   Replace the function bodies to wire it into the flow; change nothing else.
   ══════════════════════════════════════════════════════════════════════════ */
window.YuzenIQ = {
  onBack()                          { goTo("rnm"); },
  /* 'finish' | 'commands' — the two options-sheet items. Replaces onMore: the
     three-dots opens a sheet locally now, so the tap itself is not an event
     anyone downstream needs. */
  onMenu(which)                     { console.log("[YuzenIQ] onMenu", which); },
  /* 'Electrical' | 'Mechanical' — which section is being looked at. */
  onSection(type)                   { console.log("[YuzenIQ] onSection", type); },
  /* The Electrical section's footer action: the bike diagnosed these, so the way
     to clear them is to have it check again. */
  onRerunChecks(type)               { console.log("[YuzenIQ] onRerunChecks", type); },
  onOpenIssue({id, part, reasons})  { console.log("[YuzenIQ] onOpenIssue", {id, part, reasons}); },
  onResolveIssue({id, part, done})  { console.log("[YuzenIQ] onResolveIssue", {id, part, done}); },
  /* Remove, from the detail sheet — the issue was logged in error, which is a
     different event from resolving it. */
  onRemoveIssue({id, part})         { console.log("[YuzenIQ] onRemoveIssue", {id, part}); },
  /* STITCHED: every issue on the bike is resolved, so this screen is finished
     with. Back to the dashboard that sent you here — the same place Back goes,
     because there is nowhere else it leads. */
  onDone()                          { goTo("rnm"); },
  /* STITCHED: Mark Issues opens the marking screen. A hook body is the whole
     stitch — nothing else in this file knows the other screen exists. */
  onMarkIssues({open, resolved})    {
    /* One document now, so the section no longer has to ride in the URL the way it
       did between the two standalone files. */
    goTo("markissues");
  },
};

/* Two, not five. The three electrical rows carry no photo, so pigtail, mcu and
   throttle went with them — the built file is smaller for it. */
const PHOTOS = {
  wheel:    "assets/part_front_wheel.png",
  tyre:     "assets/part_tyre.png",
};

/* A row filed from Add issues or the checklist brings its own picture: the three
   screens keep separate image tables and only the sender has a photo of the part
   in question. PHOTOS still covers everything this screen shipped with. */
const photoSrc = it => it.photoSrc || PHOTOS[it.photo];

/* A tile, at whatever size the caller draws them. A row filed from a checklist
   brings its own render AND the crop of it that the rest of the app shows, so it
   is painted as a background at that crop; the rows this screen shipped with are
   pre-extracted squares and stay an `<img>` under object-fit:cover.

   Without this every filed row showed the front wheel: the sender was handing
   over `var(--img-mcu)` — a CSS variable, not an image — the regex looking for a
   data URI found nothing, and the row fell through to this screen's own default
   picture. Same part, different picture on each of the two lists. */
function issueThumb(it, tile){
  const style = cropStyle(photoSrc(it), it.crop, tile);
  return style
    ? `<div class="issue__crop" style="${style}"></div>`
    : `<img src="${photoSrc(it)}" alt="">`;
}
const ARROW = "M10.705 15.771C10.5825 15.771 10.476 15.7296 10.3855 15.6467C10.2952 15.5639 10.25 15.4547 10.25 15.3192V8.68075C10.25 8.54525 10.2957 8.43608 10.387 8.35325C10.4782 8.27042 10.5846 8.229 10.7063 8.229C10.7368 8.229 10.8423 8.27575 11.023 8.36925L14.174 11.5202C14.2465 11.5926 14.2994 11.6674 14.3327 11.7448C14.3661 11.8221 14.3828 11.9072 14.3828 12C14.3828 12.0928 14.3661 12.1779 14.3327 12.2552C14.2994 12.3326 14.2465 12.4074 14.174 12.4798L11.023 15.631C10.9795 15.6743 10.9309 15.7085 10.8772 15.7335C10.8237 15.7585 10.7663 15.771 10.705 15.771Z";
const TICK  = "M12.0017 21.5C10.6877 21.5 9.45267 21.2507 8.2965 20.752C7.14033 20.2533 6.13467 19.5766 5.2795 18.7218C4.42433 17.8669 3.74725 16.8617 3.24825 15.706C2.74942 14.5503 2.5 13.3156 2.5 12.0017C2.5 10.6877 2.74942 9.45267 3.24825 8.2965C3.74692 7.14033 4.42375 6.13467 5.27875 5.2795C6.13375 4.42433 7.13917 3.74725 8.295 3.24825C9.45083 2.74942 10.6858 2.5 12 2.5C12.832 2.5 13.6384 2.60608 14.4193 2.81825C15.2001 3.03042 15.9469 3.33717 16.6598 3.7385C16.8519 3.84617 16.9775 4.00133 17.0365 4.204C17.0955 4.4065 17.0609 4.59558 16.9327 4.77125C16.8046 4.94692 16.635 5.05683 16.424 5.101C16.2132 5.14517 16.0097 5.11342 15.8135 5.00575C15.2288 4.67892 14.6137 4.42958 13.9682 4.25775C13.3227 4.08592 12.6667 4 12 4C9.78333 4 7.89583 4.77917 6.3375 6.3375C4.77917 7.89583 4 9.78333 4 12C4 14.2167 4.77917 16.1042 6.3375 17.6625C7.89583 19.2208 9.78333 20 12 20C14.2167 20 16.1042 19.2208 17.6625 17.6625C19.2208 16.1042 20 14.2167 20 12C20 11.8065 19.9927 11.619 19.978 11.4375C19.9632 11.256 19.9378 11.0698 19.902 10.8788C19.8687 10.6659 19.9052 10.4624 20.0115 10.2682C20.118 10.0741 20.2782 9.94817 20.492 9.8905C20.6935 9.83267 20.8804 9.85767 21.0527 9.9655C21.2252 10.0732 21.3282 10.2282 21.3615 10.4307C21.4077 10.6832 21.4422 10.9388 21.4652 11.1973C21.4884 11.4556 21.5 11.7232 21.5 12C21.5 13.3142 21.2507 14.5492 20.752 15.705C20.2533 16.8608 19.5766 17.8663 18.7218 18.7213C17.8669 19.5763 16.8617 20.2531 15.706 20.7518C14.5503 21.2506 13.3156 21.5 12.0017 21.5ZM10.5808 14.1463L19.9193 4.79225C20.0578 4.65392 20.2292 4.58058 20.4337 4.57225C20.6381 4.56392 20.8186 4.638 20.9753 4.7945C21.1186 4.938 21.1903 5.11292 21.1903 5.31925C21.1903 5.52558 21.1178 5.70125 20.973 5.84625L11.2135 15.6212C11.0327 15.8019 10.8218 15.8922 10.5808 15.8922C10.3398 15.8922 10.1288 15.8019 9.948 15.6212L7.20375 12.877C7.06542 12.7385 6.99458 12.5644 6.99125 12.3548C6.98808 12.1453 7.05892 11.968 7.20375 11.823C7.34875 11.6782 7.52442 11.6057 7.73075 11.6057C7.93708 11.6057 8.11275 11.6782 8.25775 11.823L10.5808 14.1463Z";

/* Five issues, one per available part photo. The design draws four identical
   "Pigtail connector" rows against a header count of 5; the parts and reasons
   here are varied so rows are tellable apart, and the first keeps the three
   reasons the frame shows. */
/* `reasons` is what was reported and is what the row shows; `catalogue` is every
   reason this part can carry, so the detail sheet can offer the ones that were
   not picked. "Missing" is appended to every catalogue rather than listed. */
/* Two kinds of thing on one screen, and they are not the same shape.

   A MECHANICAL issue is a part someone judged by hand: it has a photo, the
   reasons they picked, and a tick, because a person decides when it is fixed.

   An ELECTRICAL issue is a fault the bike reported about itself. There is no part
   to photograph, no reason list to show, and — the important one — no tick. A
   mechanic cannot declare a diagnostic clear by tapping it; they fix the thing and
   re-run the checks, and the bike says whether it is clear. So the row is a line
   of text and nothing else, and the footer carries the only way to close it. */
/* `survives` is how many re-runs a fault outlasts before the bike stops reporting
   it — the scripted answer to "does this still exist?". It has to be scripted:
   nothing here knows what a real bike would say, and a run that cleared everything
   every time gave the check nothing to report. Two clear on the first run and one
   holds out until the second, so the reverting case is reachable in a demo without
   stranding anyone on a fault that never closes. */
const ISSUES = [
  {fault:"Ping not received",        type:"Electrical", survives:0},
  {fault:"Motor controller unit lag", type:"Electrical", survives:0},
  {fault:"IoT voltage low",          type:"Electrical", survives:1},
  /* seeded:true — the REPAIR's two. A mechanic is sent to a bike someone has
     already reported, and these are those reports; an assessment is the visit
     that produces reports, so it starts with none and fills up from its own
     checklist. prepareIssuesFor() installs or withdraws them per flow. */
  {part:"Front wheel", photo:"wheel", by:"John Doe",  type:"Mechanical", seeded:true,
   reasons:["Damage"],              catalogue:["Damage","Bent","Wobble"]},
  {part:"Rear tyre",   photo:"tyre",  by:"Ramesh K.", type:"Mechanical", seeded:true,
   reasons:["Worn out","Cuts"],     catalogue:["Worn out","Cuts","Puncture"]},
/* locked = the bike has confirmed it clear. `done` alone is a mechanic's claim and
   stays reversible; locked is a result, so the control goes grey and stops
   answering. Only a re-run can set it. */
].map((o, i) => ({id:"i" + i, done:false, locked:false, outcome:null, ...o}));

/* Ids for rows filed after load, by Add issues or the checklist. Continuing the
   series rather than reusing indices, because a row can be deleted and the index
   would then hand its id to something else. */
let nextId = ISSUES.length;

const MISSING = "Missing";

/* How a mechanical issue was closed, which is a different question from whether
   it was. Fixed and Replaced are the part working again; No spare is the
   mechanic having done all they can and the bike still not being right.

   All three close the issue — `done` stays the single flag everything else
   counts — but only the first two strike the fault through, because a struck-out
   line means "not a fault any more" and a missing spare has not made it so. The
   row's mark carries the difference: a green tick, or a red cross that says
   closed-but-not-solved. */
/* `allow` is what the reasons on the record permit. A part that is Missing cannot
   have been Fixed — there is nothing there to have repaired — so that one outcome
   goes away while Missing is picked. Replaced and No spare both still make sense:
   you either put a new one on or you could not.

   The rule lives on the outcome rather than as a case in the paint, so a second
   incompatible pair is one predicate and nothing else changes. */
const OUTCOMES = [
  {id: "fixed",    label: "Fixed",    positive: true,
   allow: (picked, it) => {
     /* A missing part cannot be repaired — there is nothing there to work on. */
     if (picked.has(MISSING)) return false;
     /* Nor can it once the old part has gone back to stores: Fixed means putting
        THAT part back on the bike, and it is no longer here to put. */
     if (it && it.journey && it.journey.oldBack) return false;
     return true;
   },
   why: it => (it && it.journey && it.journey.oldBack)
                ? "the part is already back with stores"
                : "a missing part cannot be fixed"},
  {id: "replaced", label: "Replaced", positive: true,
   /* Replacing needs something to replace it WITH. Not offered before a spare is
      received, and withdrawn once that spare has gone back — the mechanic has
      nothing in hand either way. */
   allow: (picked, it) => !!(it && spareAvailable(it) &&
                             it.journey && it.journey.spare && !it.journey.newBack),
   /* Three different reasons wear the same grey chip, and a mechanic deserves to
      know which: the shelf is empty, the spare is not fetched yet, or it has
      already gone back. */
   why: it => !spareAvailable(it)        ? "no spare available"
            : !it.journey.spare          ? "no spare in hand yet"
            :                              "the spare has gone back"},
  /* Not offered as a chip. Whether a spare exists is the inventory system's
     answer, not the mechanic's — they should be told, not asked. It stays in the
     table because the CLOSURE is still real: setting outcome to "nospare" from
     wherever that information arrives still marks the row with a red cross and
     still leaves the fault un-struck, because the part was never made good.
     Sagar is designing how that information appears. */
  {id: "nospare",  label: "No spare", positive: false, offered: false},
];
/* What the sheet offers, as against what the record can hold. */
const OFFERED = OUTCOMES.filter(o => o.offered !== false);
const outcomeOf  = it => OUTCOMES.find(o => o.id === it.outcome) || null;
const isPositive = it => !!(outcomeOf(it) || {}).positive;

/* The three marks a row can carry. Drawn here rather than in CSS because each is
   a different glyph, not a different colour of one. */
/* ── The part journey ───────────────────────────────────────────────────────
   Two objects with two histories that swap places on the bike. The lists are
   DERIVED from three facts, never stored as text — so they cannot describe a
   state the record does not hold:

     spare      has a replacement been fetched from stores
     oldBack    has the part that came off gone back
     newBack    has the unused spare gone back
     it.outcome what the mechanic did: fixed or replaced

   The rules, in Sagar's words:
     - the old part always starts On-bike (faulty)
     - fetching a spare makes the new part Received, and the old part "With me" —
       once it is off the bike we cannot keep claiming it is on it
     - Fixed puts the old part back on and sends the spare home
     - Replaced puts the spare on and sends the old part home

   TERMINAL is the settled end of a journey and the only step that earns a tick.
   Everything before it is somewhere the part has been. */
const TERMINAL = ["On-bike (fixed)", "On bike", "Returned to IA"];

/* What stores actually has. A part missing from the shelf changes what a mechanic
   can do about it, so it is a fact about the PART rather than about the issue —
   every issue raised against a Pigtail connector inherits it.

   Absent from this table means available; only the exceptions are listed. Real
   stock will come from the inventory system, and this is the shape it plugs
   into. */
const SPARE_STOCK = {
  "Pigtail connector": false,
};
const spareAvailable = it => SPARE_STOCK[it.part] !== false;

/* The spare's own journey, shared by both paths: a missing part needs one just as
   much as a broken one does. */
function newSideOf(it, j, act){
  const step = label => ({label, done: TERMINAL.indexOf(label) !== -1});
  const out = [];
  /* Nothing on the shelf, so there is no new part and no journey for one. */
  if (!spareAvailable(it)) return out;
  if (!j.spare) return out;
  out.push(step("Received"));
  if (act === "replaced") out.push(step("On bike"));
  if (act === "fixed"){
    out.push(j.newBack ? step("Return to IA")
                       : {label:"Return to IA", done:false, act:"newBack"});
    if (j.newBack) out.push(step("Returned to IA"));
  }
  return out;
}

function journeyOf(it, picked){
  const j = it.journey || (it.journey = {spare:false, oldBack:false, newBack:false});
  const act = it.outcome;
  const step = label => ({label, done: TERMINAL.indexOf(label) !== -1});
  const reasons = picked || new Set(it.reasons);

  /* A missing part has no journey. It was never on the bike to come off, it is
     not with the mechanic, and it cannot go back to stores — so the column states
     the one true thing and stops. No ring either: an empty circle says "a step
     that has not happened yet", and nothing is going to happen to it.
     The new part still has its own journey; a missing part is exactly the case
     that needs a replacement. */
  if (reasons.has(MISSING)){
    return {
      old: {steps: [{label: MISSING, bare: true}]},
      new: {lead: leadFor(it), steps: newSideOf(it, j, act)},
    };
  }

  const oldSteps = [step("On-bike (faulty)")];
  if (j.spare) oldSteps.push(step("With me"));
  if (act === "fixed")    oldSteps.push(step("On-bike (fixed)"));
  if (act === "replaced"){
    /* `act` is what makes the row a control, and it is only set while the return
       is still to happen. Once it has, the row is history like any other step. */
    oldSteps.push(j.oldBack ? step("Return to IA")
                            : {label:"Return to IA", done:false, act:"oldBack"});
    if (j.oldBack) oldSteps.push(step("Returned to IA"));
  }

  const newSteps = newSideOf(it, j, act);
  return {
    old: {steps: oldSteps},
    /* The lead is the ACT of going to stores, which produces the new part rather
       than happening to it — so it carries no step of its own. It is also the
       control that fetches one while there is nothing to show. */
    new: {lead: leadFor(it), steps: newSteps},
  };
}

/* The lead is either an offer or an answer. "Get spare..." is something to do;
   "No spare available" is stores telling you there is nothing to do — a statement,
   not a control, so it is not underlined and not tappable. */
function leadFor(it){
  return spareAvailable(it)
    ? {text: "Get spare...", action: "spare"}
    : {text: "No spare available", action: null};
}

/* A side turns purple only once its part has settled — a green tick on that
   side. Grey until then, and the two sides are entirely independent. */
const sideSettled = col => col.steps.some(st => st.done);

const MARK_OPEN = '<svg viewBox="0 0 21.5 21.5" aria-hidden="true">' +
  '<circle cx="10.75" cy="10.75" r="10" fill="none" stroke="#B0B0B0" stroke-width="1.5"' +
  ' stroke-linecap="round" stroke-dasharray="4 4"/></svg>';
const MARK_GOOD = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="10" fill="#00654F"/>' +
  '<path d="M10.6 16.2 6.4 12l1.4-1.4 2.8 2.8 6-6L18 8.8z" fill="#fff"/></svg>';
const MARK_BAD  = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="10" fill="#C13515"/>' +
  '<path d="M12 13.06l-3.06 3.06-1.06-1.06L10.94 12 7.88 8.94 8.94 7.88 12 10.94l3.06-3.06' +
  ' 1.06 1.06L13.06 12l3.06 3.06-1.06 1.06z" fill="#fff"/></svg>';
const markFor = it => !it.done ? MARK_OPEN : (isPositive(it) ? MARK_GOOD : MARK_BAD);

/* Two sections, each with its own closing action: an electrical fault is
   diagnosed by the bike, so the way to clear it is to run the checks again;
   a mechanical one is judged by hand, so the way on is to mark it. */
/* Mechanical leads. It is the section a mechanic acts on — the one with a part to
   look at and a way to add more — where Electrical is the bike reporting on itself
   and is closed by re-running the checks rather than by hand. */
const SECTIONS = [
  {type:"Mechanical", cta:"Add issues"},
  {type:"Electrical", cta:"Run electrical checks"},
];
/* Electrical unless we are being handed back a section — see onMarkIssues, and
   mark-issues' onBack, which returns the one it was given. An unknown value falls
   through to Electrical rather than showing an empty list. */
const SECTION_PARAM = new URLSearchParams(location.search).get("section");
const S = {section: SECTION_PARAM === "Electrical" ? "Electrical" : "Mechanical"};

const iqTabsEl = document.getElementById("iqTabs");
const iqActionEl = document.getElementById("iqAction");
const iqConfirmEl = document.getElementById("iqConfirm");
const footContentEl = document.querySelector("#iqFooter .footer__content");
const listEl  = document.getElementById("iqList");
const suffixEl  = document.getElementById("iqBarSuffix");
const headEl    = document.getElementById("iqHead");
const headTitle = document.getElementById("iqHeadTitle");
const barEl     = document.querySelector("#scrIssues .appbar");
const fillEl  = document.getElementById("iqProgressFill");
const markBtn   = document.getElementById("iqMarkBtn");
const markFill  = document.getElementById("iqMarkFill");
const markLabel = document.getElementById("iqMarkLabel");
const doneBtn   = document.getElementById("iqDoneBtn");
/* Scoped, because .appbar and .iq-footer are not unique in this document — a bare
   querySelector for either returns whichever screen happens to come first. */
const screenEl  = document.getElementById("scrIssues");
const footerEl = document.getElementById("iqFooter");
const scrollEl = document.getElementById("iqScroll");

const inSection = () => ISSUES.filter(i => i.type === S.section);

/* ══════════════════════════════════════════════════════════════════════════
   Footer reveal — the same rule as mechanic-checks, and the same trap.

   Direction, not offset: any downward scroll hides the footer, any upward one
   brings it back, mid-list, with an 8px threshold against jitter. Hiding also
   releases the list's bottom inset so the rows gain the space.

   That inset release is what makes this delicate. Growing the list makes the
   browser clamp scrollTop near the bottom, which arrives as an upward scroll and
   flips the state straight back — so deltas are absorbed while the transition
   runs. The absorb window is a timer, not transitionend: transitionend never
   fires when the value is already at its target, which would strand the flag.
   ══════════════════════════════════════════════════════════════════════════ */
const FOOTER_THRESHOLD = 8;
const FOOTER_ANIM_MS   = 260;
let fLastY = 0, fAccum = 0, footerShown = true, fBanding = false, fTimer = 0;

function showFooter(visible){
  if (visible === footerShown) return;
  footerShown = visible;
  footerEl.classList.toggle("is-hidden", !visible);
  scrollEl.classList.toggle("footer-hidden", !visible);

  fBanding = true;
  fAccum = 0;
  clearTimeout(fTimer);
  fTimer = setTimeout(() => { fBanding = false; fLastY = scrollEl.scrollTop; },
                      FOOTER_ANIM_MS + 40);
}

/* Measured once, not read live: the block does not resize, and a reading taken
   mid-transition would make the threshold jitter. */
let headH = 0;
function syncHeading(){
  /* No heading on the assessment — the tabs above the list name the section and
     carry its count, and a title repeating both was the third place on one screen
     saying "Mechanical". So there is nothing to hand off: the bar stays as it is
     and the breadcrumb stays down. */
  if (forAssessment){
    barEl.classList.remove("is-collapsed");
    suffixEl.setAttribute("aria-hidden", "true");
    return;
  }
  if (!headH) headH = headEl.offsetHeight || 64;
  const past = scrollEl.scrollTop > headH - 16;
  barEl.classList.toggle("is-collapsed", past);
  headTitle.setAttribute("aria-hidden", String(past));
  suffixEl.setAttribute("aria-hidden", String(!past));
}

scrollEl.addEventListener("scroll", () => {
  syncHeading();
  const y = scrollEl.scrollTop;
  const delta = y - fLastY;
  fLastY = y;
  if (delta === 0 || fBanding) return;

  if ((delta > 0) !== (fAccum > 0)) fAccum = 0;      /* direction flipped */
  fAccum += delta;

  if (fAccum > FOOTER_THRESHOLD)       { showFooter(false); fAccum = 0; }
  else if (fAccum < -FOOTER_THRESHOLD) { showFooter(true);  fAccum = 0; }

  if (y <= 0) showFooter(true);                      /* always up at the top */
}, {passive:true});

const esc = s => String(s).replace(/[&<>"']/g,
  c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function tap(){ if (navigator.vibrate) navigator.vibrate(10); }


function reasonsHTML(list){
  return list.map(r => `<span>${esc(r)}</span>`)
             .join('<span class="issue__dot" aria-hidden="true"></span>');
}

function rowHTML(it){
  /* An electrical fault is a line of text: no thumbnail, no reasons, no tick, and
     nothing to open — there is no detail behind it that this screen holds. */
  if (it.type === "Electrical"){
    const cls = "issue issue--plain" + (it.done ? " iq-is-done" : "")
                                     + (it.locked ? " iq-is-locked" : "");
    /* The subheading is keyed on `locked`, not `done` — on the CHECK having
       confirmed it, not on a mechanic having pressed Resolve. Pressing Resolve is a
       claim, and the button going green already says that claim was made; printing
       "Resolved" under the fault as well would state it as fact before the bike has
       agreed. Once a run confirms it, the word is earned. Sagar's call. */
    return `<div class="${cls}" data-id="${it.id}">
        <span class="issue__plainMain">
          <span class="t-label-md issue__name">${esc(it.fault)}</span>
          ${it.locked ? `<span class="t-label-md issue__status">Resolved</span>` : ""}
        </span>
        ${forAssessment ? "" : `<button class="issue__tick" data-tick="${it.id}"
                aria-pressed="${it.done}"${it.locked ? " disabled" : ""}
                aria-label="${it.locked ? "Cleared by the last check: " + esc(it.fault)
                                        : (it.done ? "Reopen" : "Resolve") + " " + esc(it.fault)}">
          ${it.done
            ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${TICK}"/></svg>`
            : "Resolve"}
        </button>`}
      </div>`;
  }
  /* A mechanical one opens its sheet from anywhere on the row, not just the name —
     the whole row is the target, with the tick carved out of it below. */
  /* No chevron and no Resolve button. The chevron pointed at a row that is
     already a button end to end, and the button was a second target inside that
     one — tapping 8px to its left opened the sheet instead, which is a coin toss
     a mechanic should not have to win. The mark on the right is a STATE, not a
     control: how the issue closed is chosen in the sheet, where the reasons it
     closed against are visible. */
  const closed = it.done ? " iq-is-done" : "";
  const struck = isPositive(it) ? " iq-is-struck" : "";
  return `<div class="issue${closed}${struck}" data-id="${it.id}"
               data-open="${it.id}" role="button" tabindex="0"
               aria-label="Open ${esc(it.part)}">
      <div class="issue__thumb">${issueThumb(it, 56)}</div>
      <div class="issue__main">
        <span class="issue__head">
          <span class="t-label-md issue__name">${esc(it.part)}</span>
        </span>
        <div class="t-label-md issue__reasons">${reasonsHTML(it.reasons)}</div>
      </div>
      ${forAssessment ? "" : `<span class="issue__mark" role="img"
            aria-label="${it.done ? esc((outcomeOf(it) || {}).label || "Resolved") : "Open"}"
      >${markFor(it)}</span>`}
    </div>`;
}

/* The chip count is every issue in that section, resolved or not — it says how
   much is filed under the chip, which is what a filter's count is for. */
function render(){
  const rows = inSection();
  listEl.innerHTML = rows.length
    ? rows.map(rowHTML).join("")
    : `<p class="iq-empty">No ${S.section.toLowerCase()} issues reported.</p>`;

  /* The bar tracks the whole bike, not the visible section — it is one job of
     work however it is filed. */

  /* The breadcrumb names the SECTION, not "Issues", and counts only that section.
     It used to read "543210 / Issues 0/5" whatever you had opened — a whole-bike
     figure that disagreed with the card you tapped to get here, which read 0/3.
     Two numbers for one thing, and the smaller one was the true answer to "how
     much of THIS is left". The screen shows one section now, so the header says
     which and counts what is on screen: the dashboard row and this title are the
     same sentence twice.

     The bar underneath stays whole-bike deliberately — it is the repair's
     progress, not this list's, and it is the same bar the dashboard draws. */
  const secRows = inSection();
  const secDone = secRows.filter(i => i.done).length;

  /* THIS SECTION, not the whole bike. The bar sits under a header that names one
     section and counts one section; drawing the bike's total there made the only
     graphic on screen disagree with the two numbers beside it. Whole-bike
     progress is the dashboard's bar, over the vitals, where all three rows —
     checklist, mechanical, electrical — are in view at once and summing them
     means something. */
  /* The bar is the same score in another form, so it goes with the numerator:
     a strip pinned at 0% over a list nobody can close reads as work outstanding.
     Hidden rather than emptied — an empty track is still a claim. */
  screenEl.classList.toggle("iq-no-progress", forAssessment);
  fillEl.style.width =
    (secRows.length ? secDone / secRows.length * 100 : 0) + "%";
  const label   = S.section + " issues";
  /* HOW MANY, not how many of how many. An assessment READS this record — the
     Resolve buttons and the open/closed marks are gone from it (see above), so
     there is nothing a QCA can do to move a numerator and "0/3" would be a score
     they are being given for work that is not theirs. The repair still closes
     faults here and still counts them. */
  const tally   = forAssessment ? String(secRows.length) : secDone + "/" + secRows.length;

  /* The same words in both places, so the title collapsing into the bar reads as
     one thing moving rather than two labels swapping. */
  headTitle.innerHTML =
    esc(label) + ' <span class="iq-head__count">' + tally + '</span>';
  suffixEl.textContent = " / " + label + " " + tally;

  const sec = SECTIONS.find(s => s.type === S.section);
  markLabel.textContent = sec.cta;
  /* The tabs, and the band that holds them. Assessment only — a repair reaches
     each section from its own dashboard row, and tabs as well would be a third
     door into one record. */
  iqTabsEl.hidden = !forAssessment;
  screenEl.classList.toggle("has-tabs", forAssessment);
  /* And the heading goes with them — see syncHeading. */
  headEl.hidden = forAssessment;
  /* The section's own action moves out of the footer and under the tabs. It
     belongs to the LIST rather than to the way off the screen — adding an issue
     or re-running the checks is something you do here, not something you leave
     by — and under the tab it reads as part of the section it acts on. Moved,
     not copied: a second copy is two buttons to keep in step. */
  const actionHome = forAssessment ? iqActionEl : footContentEl;
  if (markBtn.parentElement !== actionHome) actionHome.appendChild(markBtn);
  iqActionEl.hidden = !forAssessment;
  screenEl.classList.toggle("has-action", forAssessment);
  iqTabsEl.querySelectorAll("[data-iqtab]").forEach(t => {
    const on = t.dataset.iqtab === S.section;
    t.classList.toggle("is-on", on);
    t.setAttribute("aria-selected", String(on));
    /* Every fault in that section, open or not — the same denominator the
       heading under it shows, so the tab and the title cannot disagree. */
    t.querySelector(".iq-tab__n").textContent =
      ISSUES.filter(i => i.type === t.dataset.iqtab).length;
  });
  /* The section CTA is secondary in both tabs now — see the markup. Neither
     adding an issue nor re-running the checks takes you off this screen, and
     Done, which does, is the primary that arrives once the bike is clear. */
  paintDone();
}

/* Done is not tied to the open tab: the bike is finished with whichever section
   you happen to be looking at, so it shows in both. It is the way back to the
   dashboard that sent you here. */
/* Which of the three open tasks this screen is currently standing in. */
const openTaskId = () => S.section === "Mechanical" ? "mech" : "elec";

function paintDone(){
  /* This SECTION cleared, not the whole bike: the button belongs to the list on
     screen, and holding it back until the other section is also clear made a
     finished list look unfinished. What it SAYS still depends on the whole
     repair — Next while anything is open, Done only when nothing is.

     What "cleared" means differs by section, because who is entitled to say so
     differs. A mechanical fault is judged by hand: the mechanic looks at the
     part and resolves it, and `done` is the whole answer. An electrical one is
     diagnosed by the bike, so a mechanic ticking it is a claim, not a result —
     the way on is to run the checks and let the bike agree. `locked` is that
     agreement, and only a run can set it (see the re-run handler).

     So the way out of Electrical needs all three: resolved by the mechanic, the
     check run, and the bike reporting it clear. Anything less and the button
     would be offering to move on from a fault nothing has confirmed is gone. */
  /* An ASSESSMENT does not close faults here — it reads them. There is no
     "cleared" to wait for: a QCA looking at a list of what the bike has wrong
     with it may add to it, may not, and either way is finished with the screen
     when they say so. So the button is always there and always live, and it is
     the step CTA rather than this screen's own Done. Sagar's call, and the
     reason is that the condition below has no meaning on this side: a bike with
     three unresolved electrical faults is a perfectly complete assessment. */
  /* No banner on this screen. Every other step screen reports its step as
     finished; this one has to ASK, because nothing here can be measured — so the
     confirmation and the CTA share a row instead. See #iqConfirm. */
  document.getElementById("iqBanner").hidden = true;
  const confirmed = forAssessment && RnM.faultsConfirmed();
  iqConfirmEl.hidden = !forAssessment;
  iqConfirmEl.setAttribute("aria-checked", String(confirmed));
  screenEl.classList.toggle("has-confirm", forAssessment);
  if (forAssessment){
    /* "Next", not the name of the step it leads to. This screen has two tabs and
       a confirmation of its own in the same footer; a button that also named the
       destination made three things in one strip competing to say where the QCA
       is in the flow. The dashboard names the steps — this one just moves on.
       Sagar's call. */
    doneBtn.textContent = "Next";
    doneBtn.hidden = false;
    /* Until the QCA says they are done with this list, there is no next step to
       go to — the sequence is standing on this one. */
    doneBtn.disabled = !RnM.faultsConfirmed();
    /* One button in the footer on this side — the other went under the tabs — so
       it is the short footer, not the tall one. */
    screenEl.classList.remove("iq-footer-tall");
    return;
  }
  const rows = inSection();
  const cleared = S.section === "Electrical"
    ? i => i.done && i.locked
    : i => i.done;
  const on = rows.length > 0 && rows.every(cleared);
  doneBtn.textContent = endOfTaskCTA(openTaskId()).label;
  doneBtn.hidden = !on;
  doneBtn.disabled = false;
  /* The footer is 64px taller with two buttons in it, and the list's bottom inset
     has to follow or it scrolls underneath. */
  screenEl.classList.toggle("iq-footer-tall", on);
}

listEl.addEventListener("click", e => {
  const tick = e.target.closest("[data-tick]");
  if (tick){
    const it = ISSUES.find(i => i.id === tick.dataset.tick);
    it.done = !it.done;
    tap();
    render();
    /* Only on the way to resolved. Reopening is a correction, not a result, and
       a toast for it would just be noise. */
    if (it.done) toast("Resolved");
    window.YuzenIQ.onResolveIssue({id:it.id, part:it.part, done:it.done});
    return;
  }
  const head = e.target.closest("[data-open]");
  if (head){
    const it = ISSUES.find(i => i.id === head.dataset.open);
    tap();
    openDetail(it);
    window.YuzenIQ.onOpenIssue({id:it.id, part:it.part, reasons:it.reasons});
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   Issue detail sheet — Figma 1993:30576

   Every reason this part can carry, in a fixed order with "Missing" last. A chip
   has three states:

     enabled    white, hairline border — available to pick
     selected   surface/secondary, dark ring, cancel glyph — on the record
     disabled   surface/secondary, grey label — ruled out, not tappable

   A part cannot be both missing and faulty, so the two sides disable each other:
   mark it Missing and every fault greys out until Missing is cleared; pick any
   fault and Missing greys out until the last one is cleared. Either side is
   released by unpicking it — the cancel glyph makes that one tap — so the lock
   cannot strand anyone.

   Note this is deliberately NOT the rule mechanic-checks uses. That screen
   switches instead of locking, because its chips have no cancel glyph and
   clearing a pick means hunting for it. Here the × is on the chip, so the
   stricter rule costs nothing and states the constraint outright.
   ══════════════════════════════════════════════════════════════════════════ */
const dtlScrim = document.getElementById("iqDtlScrim");
const dtlSheet = document.getElementById("iqDtlSheet");
const dtlThumbWrap = document.querySelector("#iqDtlSheet .sheet-dtl__thumb");
const dtlName  = document.getElementById("iqDtlName");
const dtlReasons = document.getElementById("iqDtlReasons");
const dtlEdit    = document.getElementById("iqDtlEdit");
const dtlEditWrap = document.getElementById("iqDtlEditWrap");
const dtlActWrap  = document.getElementById("iqDtlActWrap");
const dtlFootWrap = document.getElementById("iqDtlFootWrap");
const dtlJrnWrap  = document.getElementById("iqDtlJrnWrap");
const dtlJrnCols  = document.getElementById("iqDtlJrnCols");
const dtlGlow     = {old: document.getElementById("iqDtlGlowOld"),
                     new: document.getElementById("iqDtlGlowNew")};
const dtlJourney  = document.getElementById("iqDtlJourney");
const dtlChips = document.getElementById("iqDtlChips");
const dtlActions = document.getElementById("iqDtlActions");
const dtlRemove  = document.getElementById("iqDtlRemove");
const CANCEL = "M12.0001 13.0634L8.7539 16.3096C8.60903 16.4545 8.43339 16.5253 8.22697 16.5221C8.02057 16.5189 7.84494 16.4449 7.70007 16.3C7.5552 16.1551 7.48277 15.9779 7.48277 15.7683C7.48277 15.5587 7.5552 15.3815 7.70007 15.2366L10.9366 12L7.69044 8.77884C7.54558 8.63397 7.47475 8.45673 7.47797 8.24711C7.48117 8.0375 7.5552 7.86025 7.70007 7.71539C7.84494 7.57052 8.02218 7.49809 8.23179 7.49809C8.44139 7.49809 8.61863 7.57052 8.76349 7.71539L12.0001 10.9616L15.2212 7.71539C15.3661 7.57052 15.5418 7.49809 15.7482 7.49809C15.9546 7.49809 16.1302 7.57052 16.2751 7.71539C16.4302 7.87052 16.5077 8.05033 16.5077 8.25481C16.5077 8.4593 16.4302 8.63397 16.2751 8.77884L13.0385 12L16.2847 15.2462C16.4296 15.3911 16.502 15.5667 16.502 15.7731C16.502 15.9795 16.4296 16.1551 16.2847 16.3C16.1296 16.4551 15.9498 16.5327 15.7453 16.5327C15.5408 16.5327 15.3661 16.4551 15.2212 16.3L12.0001 13.0634Z";

/* {id, picked:Set} — edits stay here until Resolve, so backing out leaves the
   original call standing. */
let dtl = null;

function paintDetail(){
  if (!dtl) return;
  const it = ISSUES.find(i => i.id === dtl.id);
  const picked = dtl.picked;
  const all = it.catalogue.concat(MISSING);

  /* Nothing is ever disabled. A part cannot be both missing and faulty, but the way
     to express that is to let each side TAKE OVER from the other, not to grey one
     out: pick Missing and the faults clear, pick a fault and Missing clears. The
     faults stay multi-select among themselves.

     The disabled version meant a mechanic who picked Damage by mistake had to
     deselect it before Missing would even accept a tap — the rule was enforced by
     taking the control away rather than by resolving the conflict. This is the
     same rule mark-issues and the checklist sheet already use. */
  dtlChips.innerHTML = all.map(r => {
    const on = picked.has(r);
    return `<button class="rchip${on ?" rchip--on" : ""}" data-reason="${esc(r)}"
              aria-pressed="${on}"
              aria-label="${on ? "Remove" : "Add"} ${esc(r)}">${esc(r)}</button>`;
  }).join("");

  /* The label is the ACTION, not the state — the same rule the RnM lock follows.
     It used to read "Resolved" on an already-resolved issue, which is the one
     place it broke its own rule: a past-tense label on a live button says the tap
     will resolve something, when in fact it reopens it. Reopening is the only
     thing left to do to a resolved issue, so that is what it now offers, and the
     sheet and the row read the same state either way. */
  /* The action chips. Tapping one closes the issue; tapping the live one again
     reopens it, which is the only way back and is the same gesture as un-picking
     a reason — nothing on this sheet is a one-way door.

     Disabled with no reason picked, for the same argument the Resolve button
     carried: closing an issue with nothing on the record erases why it was ever
     raised. An issue with no reasons left should be deleted, not resolved. */
  /* The header line follows the chips as they are picked, so the two halves of
     the sheet never disagree while it is open. Em dash when nothing is left —
     an empty line would collapse the header by 20px mid-edit. */
  const order = it.catalogue.concat(MISSING).filter(r => picked.has(r));
  dtlReasons.textContent = order.length ? order.join(" \u00b7 ") : "\u2014";

  dtlActions.innerHTML = OFFERED.map(o => {
    /* Two ways to be unavailable: nothing on the record to close against, or the
       reasons ruling this outcome out. */
    const off = picked.size === 0 || (o.allow && !o.allow(picked, it));
    /* Never both live and unavailable. An issue closed as Fixed that is then
       marked Missing shows the chip greyed and unselected — the record only
       changes when an action is chosen, so nothing contradictory is stored. */
    const on  = it.outcome === o.id && !off;
    const why = off && o.why
      ? " — " + (typeof o.why === "function" ? o.why(it) : o.why) : "";
    return `<button class="rchip${on ? " rchip--on" : ""}" data-outcome="${o.id}"
              aria-pressed="${on}"${off ? " disabled" : ""}
              aria-label="${on ? "Reopen — undo" : "Close as"} ${esc(o.label)}${esc(why)}"
            >${esc(o.label)}</button>`;
  }).join("");
}

/* One flag, two states. The wrap animates its own height (see the grid rule in
   style.css) so nothing here measures anything. */
/* A row is its label and nothing else. `step.done` still exists and still drives
   the wash — it just no longer draws a mark of its own. */
function jrnRowHTML(step){
  const text = `<span class="pjrn__label">${esc(step.label)}</span>`;
  if (step.bare) return `<div class="pjrn__step">${text}</div>`;
  /* A step that has not happened yet AND the way to make it happen — tapping it
     is handing the part over. Once it has happened the flag is gone and the row
     goes back to being a plain line of history. */
  if (step.act){
    return `<button class="pjrn__step pjrn__step--go" data-jrn="${step.act}">${text}</button>`;
  }
  return `<div class="pjrn__step">${text}</div>`;
}

/* What the section is SHOWING right now — the collapsed line of each column,
   which is the last child of that column whether it is a step or a lead. Read
   before a repaint and again after, it says which side actually moved. */
function jrnShown(){
  const read = side => {
    const el = dtlJrnCols.querySelector(`.pjrn__col--${side}`);
    const last = el && el.lastElementChild;
    return last ? last.textContent.trim() : "";
  };
  return {old: read("old"), new: read("new")};
}

function paintJourney(before){
  const it = ISSUES.find(i => i.id === (dtl || {}).id);
  if (!it) return;
  /* Follows the chips being edited, not just the committed record, so the two
     halves of an open sheet never disagree — the same rule the header line uses. */
  const J = journeyOf(it, dtl && dtl.picked);

  const col = (side) => {
    const c = J[side];
    return `<div class="pjrn__col pjrn__col--${side}">` +
      /* Tappable only while it is the next thing that can happen — this is the
         prototype's stand-in for walking to stores. */
      (c.lead
        ? (c.lead.action
            ? `<button class="pjrn__lead" data-jrn="${c.lead.action}"${it.journey.spare ? " disabled" : ""}
                 >${esc(c.lead.text)}</button>`
            : `<p class="pjrn__lead pjrn__lead--none">${esc(c.lead.text)}</p>`)
        : "") +
      c.steps.map(jrnRowHTML).join("") +
    `</div>`;
  };
  dtlJrnCols.innerHTML = col("old") + col("new");

  /* Flip only the columns whose visible line changed. `before` is absent on an
     ordinary repaint — opening the sheet, editing chips — because a line that
     was never on screen has not moved. */
  if (before){
    const after = jrnShown();
    ["old", "new"].forEach(side => {
      if (before[side] === after[side]) return;
      const last = dtlJrnCols.querySelector(`.pjrn__col--${side}`).lastElementChild;
      if (!last) return;
      last.classList.add(last.classList.contains("pjrn__lead")
        ? "pjrn__lead--flip" : "pjrn__step--flip");
    });
  }

  /* Each side raises its own glow over its own grey, so one side settling never
     tints the other. See .pjrn__glow in style.css. */
  dtlGlow.old.style.opacity = sideSettled(J.old) ? "1" : "0";
  dtlGlow.new.style.opacity = sideSettled(J.new) ? "1" : "0";
}

/* The two things a mechanic does to a part that are not an outcome: fetch a
   spare, and hand one back. Both are steps in the journey rather than buttons of
   their own, so the row IS the control while it is the next possible move. */
dtlJrnCols.addEventListener("click", e => {
  const btn = e.target.closest("[data-jrn]");
  if (!btn || btn.disabled || !dtl) return;
  const it = ISSUES.find(i => i.id === dtl.id);
  const j = it.journey;
  if (btn.dataset.jrn === "spare")   j.spare = true;
  if (btn.dataset.jrn === "oldBack") j.oldBack = true;
  if (btn.dataset.jrn === "newBack") j.newBack = true;
  tap();
  paintJourney();
  paintDetail();          /* the returns change which outcomes are still open */
  render();
});

/* Collapsed shows the current state of each part; expanded shows how it got
   there. The rows are laid out bottom-up (see the CSS), so collapsing hides the
   history ABOVE the live row rather than clipping the answer. */
function setJourneyOpen(open){
  dtlJourney.classList.toggle("is-open", open);
}

/* Swipe anywhere on the sheet: up reveals the history, down folds it away.
   Deliberately not a tap — the band is a heading, and a heading that is secretly
   a button is the kind of control nobody finds.

   The header is excluded because it already owns a gesture: dragging it down
   dismisses the whole sheet. Two meanings for one drag in one place would make
   both unreliable, so the handle keeps its own. */
(() => {
  const DRAG_MIN = 12;
  let d = null;
  dtlSheet.addEventListener("pointerdown", e => {
    if (e.target.closest("#iqDtlGrab")) return;       /* the dismiss handle */
    if (!dtlJrnWrap.classList.contains("is-open")) return;  /* editing: nothing to fold */
    d = {y0: e.clientY, moved: false};
  });
  dtlSheet.addEventListener("pointermove", e => {
    if (!d || d.moved) return;
    const dy = e.clientY - d.y0;
    if (Math.abs(dy) < DRAG_MIN) return;
    d.moved = true;
    setJourneyOpen(dy < 0);          /* up opens, down closes */
    tap();
  });
  const end = () => { d = null; };
  dtlSheet.addEventListener("pointerup", end);
  dtlSheet.addEventListener("pointercancel", end);
})();

function setDetailEdit(open){
  /* Editing and acting are alternatives, not layers. Mark issues and Delete come
     in together — both are judgements about whether the fault is right — and Your
     action goes, because you cannot close an issue you are still describing. */
  dtlEditWrap.classList.toggle("is-open", open);
  dtlActWrap.classList.toggle("is-open", !open);
  dtlFootWrap.classList.toggle("is-open", open);
  dtlJrnWrap.classList.toggle("is-open", !open);
  dtlEdit.classList.toggle("is-on", open);
  dtlEdit.setAttribute("aria-expanded", String(open));
}
dtlEdit.addEventListener("click", e => {
  e.stopPropagation();          /* the header is the sheet's drag handle */
  tap();
  setDetailEdit(!dtlEditWrap.classList.contains("is-open"));
});

/* Which flow is reading this record — set by prepareIssuesFor(). The detail sheet
   is the one place the two flows want different things from the same screen:

     a REPAIR opens on "what did you do about it". The fault is somebody else's
     report and the mechanic's job is to close it, so the sheet leads with the
     outcome chips and the part's journey, and the fault itself is behind a pencil
     for the rarer case of the report being wrong.

     an ASSESSMENT opens on "what is wrong with it". The QCA is the person filing
     the fault — it came from their own checklist — so the thing they came to
     change is the one thing on screen. No pencil, because there is nothing to
     reveal; no outcome chips and no journey, because nothing has been done about
     this yet; and no sub-line under the name, because it would restate the chips
     sitting directly beneath it (Sagar's call, and it is also the line that
     needed an em dash to stop the header collapsing mid-edit).
   ─────────────────────────────────────────────────────────────────────────── */
let forAssessment = false;

function openDetail(it){
  clearExit();
  dtl = {id:it.id, picked:new Set(it.reasons)};
  /* 64 here, 56 in the row — one crop, scaled. The <img> and the cropped div are
     alternatives, so whichever is not in use is emptied rather than left behind
     under the other. */
  dtlThumbWrap.innerHTML = issueThumb(it, 64);
  dtlName.textContent = it.part;
  /* The repair opens collapsed every time — the sheet leads with the one question
     a mechanic has at this point, and leaving it expanded because the last part
     needed editing would make the common case pay for the rare one. The
     assessment has only the one question, so it opens on it. */
  setDetailEdit(forAssessment);
  /* Expanded. The whole journey is what a mechanic opens this for, and with the
     chevron gone a shut section would have no visible way back open. Nothing to
     expand in an assessment — setDetailEdit has already shut it. */
  if (!forAssessment) setJourneyOpen(true);
  paintJourney();
  paintDetail();
  dtlScrim.classList.add("iq-is-open");
  dtlSheet.classList.add("iq-is-open");
}

function closeDetail(){
  clearTimeout(foldT);
  foldT = null;
  dtlJourney.classList.remove("is-settling");
  dtl = null;
  dtlScrim.classList.remove("iq-is-open");
  dtlSheet.classList.remove("iq-is-open");
  dtlSheet.style.transform = "";
  /* The halves are restored only once the sheet is off screen — resetting them
     now would snap the white back into view under the sliding band. */
  setTimeout(clearExit, 320);
  /* Dismissing by hand does not cancel the hand-off, it brings it forward — the
     action was already committed to the record, and swallowing the toast would
     make it look otherwise. runSettle clears the callback before invoking it, so
     the closeDetail inside it finds nothing pending and stops here. */
  runSettle();
}

dtlScrim.addEventListener("click", closeDetail);

dtlSheet.addEventListener("click", e => {
  if (!dtl) return;
  const chip = e.target.closest("[data-reason]");
  if (!chip) return;
  /* The exclusive rule lives here now, not in a disabled attribute. Tapping
     Missing drops every fault; tapping a fault drops Missing. Tapping either again
     just releases it, so there is no state you can get stranded in. */
  const r = chip.dataset.reason;
  if (r === MISSING){
    dtl.picked = dtl.picked.has(MISSING) ? new Set() : new Set([MISSING]);
  } else {
    dtl.picked.delete(MISSING);
    dtl.picked.has(r) ? dtl.picked.delete(r) : dtl.picked.add(r);
  }
  tap();
  paintDetail();
  paintJourney();   /* Missing collapses the old part's journey — see journeyOf */
});

/* Picking an outcome IS resolving, so this is the whole closing path now.
   Choosing the one already set clears it — the issue reopens and the mark goes
   back to the dashed ring. */
dtlActions.addEventListener("click", e => {
  const btn = e.target.closest("[data-outcome]");
  if (!btn || !dtl || btn.disabled) return;
  const it = ISSUES.find(i => i.id === dtl.id);
  /* Chip edits commit with the action, so the row and the sheet cannot disagree. */
  it.reasons  = it.catalogue.concat(MISSING).filter(r => dtl.picked.has(r));
  const undo  = it.outcome === btn.dataset.outcome;
  it.outcome  = undo ? null : btn.dataset.outcome;
  it.done     = it.outcome !== null;
  const done = it.done, part = it.part, id = it.id;
  tap();
  /* Collapsed, because the transition is the point: one line a side, so the flip
     and the glow are the only things moving. */
  setJourneyOpen(false);
  const before = jrnShown();
  dtlJourney.classList.add("is-settling");
  paintJourney(before);       /* the lists follow the outcome */
  /* Closing is what SELECTING an outcome does — the issue is settled, so the
     sheet has said its piece. Deselecting is the opposite: the mechanic has just
     reopened the issue and is still deciding, and dismissing the sheet under them
     would take away the very chips they are choosing between. Stay put and
     repaint in place. */
  if (undo){
    paintDetail();
    render();
    window.YuzenIQ.onResolveIssue({id, part, done});
    return;
  }
  /* The sheet used to leave on the tap, which threw away the one thing the tap
     produced: the part moving and the section lighting up. It stays for the
     length of that transition and then withdraws on its own — and the mechanic
     can still dismiss it early, which cancels the timer rather than racing it. */
  paintDetail();
  render();
  settleThen(() => {
    foldWhiteAway();
    /* Named, not just "Resolved" — No spare closes the issue without solving it,
       and a mechanic who taps it should see the app say so back. */
    if (done) toast((outcomeOf(it) || {}).label);
    window.YuzenIQ.onResolveIssue({id, part, done});
  });
});

/* One pending withdrawal at a time. Re-tapping an action restarts it; closing the
   sheet by hand runs it at once, so the toast and the hand-off still happen and
   nothing is left half-committed. */
let settleT = null, settleFn = null;
function settleThen(fn){
  clearTimeout(settleT);
  settleFn = fn;
  settleT = setTimeout(runSettle, SETTLE_MS);
}
function runSettle(){
  clearTimeout(settleT);
  settleT = null;
  const fn = settleFn;
  settleFn = null;
  if (fn) fn();
}
/* 720 glow + a beat to read the line it belongs to. */
const SETTLE_MS = 1100;
/* Matches the height transition in style.css, plus a pause on the bare journey
   band before the sheet itself goes. The pause is the point of the whole
   sequence — without it the fold and the slide read as one movement and the
   section that just changed is gone before it has been looked at. */
const FOLD_MS = 340, BEAT_MS = 180;
let foldT = null;

/* Two moves out. The white half folds to nothing — which walks the sheet's top
   edge down and leaves the journey band exactly where it was — then the band
   slides away. See the .iq-is-exiting rules in style.css. */
function foldWhiteAway(){
  const parts = [dtlSheet.querySelector(".sheet-dtl__header"),
                 dtlSheet.querySelector(".sheet-dtl__body")];
  /* `height` transitions from a definite value only, and these are content-sized.
     Write the measurement, force a reflow, then let the class take it to zero. */
  parts.forEach(el => { el.style.height = el.offsetHeight + "px"; });
  void dtlSheet.offsetHeight;
  dtlSheet.classList.add("iq-is-exiting");
  /* Zeroed inline, not by the class: the measurement above is an inline style,
     and no stylesheet rule outranks one. The class still carries the padding and
     the fade. */
  parts.forEach(el => { el.style.height = "0px"; });
  clearTimeout(foldT);
  foldT = setTimeout(closeDetail, FOLD_MS + BEAT_MS);
}
/* Whatever ends the sheet — the sequence above or a hand on the scrim — puts the
   two halves back before the next issue opens on them. */
function clearExit(){
  clearTimeout(foldT);
  foldT = null;
  dtlSheet.classList.remove("iq-is-exiting");
  dtlSheet.querySelector(".sheet-dtl__header").style.height = "";
  dtlSheet.querySelector(".sheet-dtl__body").style.height = "";
}

dtlRemove.addEventListener("click", () => {
  const i = ISSUES.findIndex(x => x.id === dtl.id);
  const it = ISSUES[i];
  ISSUES.splice(i, 1);
  tap();
  closeDetail();
  render();
  toast("Removed");
  window.YuzenIQ.onRemoveIssue({id:it.id, part:it.part});
});

/* Drag the header down to dismiss — this sheet has no grabber, so its titled
   header is the handle. */
(() => {
  const zone = document.getElementById("iqDtlGrab");
  let d = null;
  zone.addEventListener("pointerdown", e => {
    /* The edit button lives in the drag zone and owns its own press. Without this
       the zone captured the pointer on pointerdown and every later event went to
       it — including pointerup — so the button never received a click at all and
       the stopPropagation on its click handler was dead code. */
    if (e.target.closest("#iqDtlEdit")) return;
    d = {y0:e.clientY, dy:0};
    zone.setPointerCapture(e.pointerId);
    dtlSheet.classList.add("sheet-dtl--dragging");
  });
  zone.addEventListener("pointermove", e => {
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    dtlSheet.style.transform = `translateY(${d.dy}px)`;
  });
  const end = () => {
    if (!d) return;
    const far = d.dy > 60; d = null;
    dtlSheet.classList.remove("sheet-dtl--dragging");
    dtlSheet.style.transform = "";
    if (far) closeDetail();
  };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);
})();

document.getElementById("iqBackBtn").addEventListener("click", () => {
  tap(); window.YuzenIQ.onBack();
});
doneBtn.addEventListener("click", () => {
  if (doneBtn.disabled) return;
  tap();
  /* Two jobs behind one button, split by flow — see paintDone. A repair closes
     the task out; an assessment moves on to its next step. */
  if (forAssessment) { RnM.advance(); return; }
  endOfTaskCTA(openTaskId()).go();
});
/* Her options sheet is gone — this app has one, shared across every screen,
   and her ⋮ is marked [data-opt-more] so it opens that one instead. A second
   sheet here is exactly the drift her own README warns about. */
/* One button, two jobs — which one depends on the section. Only Mechanical leads
   into the marking screen; Electrical hands back to the bike's own checks. */
/* The bike re-reads itself and answers, and its answer OVERRULES the mechanic's.
   A run is not a way to close things — it is a re-read of every electrical fault,
   and each one comes back present or gone:

     gone     → done + locked. Struck through, the control greys out and stops
                answering; it is a result now, not a judgement to be revised.
     present  → done = false, whatever the row said before. A fault marked resolved
                by hand that the bike still reports reverts, because the hand mark
                was a claim and this is the check that tests it.

   That second case is the reason the run exists. Sagar's earlier call — no tick on
   electrical rows at all — said the same thing more strictly; the tick came back,
   so the run has to be the thing that can take it away again.

   WHICH faults come back present is scripted, see `survives` on ISSUES. */
let rerunning = false;
/* The check runs for CHECK_MS and shows its progress in the button itself — a bar
   filling behind the label rather than a spinner beside it, because the button is
   the thing you are waiting on. It stays pressable throughout: mid-run the label
   reads "Cancel electrical check" and pressing it stops the run and clears nothing.
   The fill is a CSS transition, not a rAF loop, and the timeout ends the run. */
const CHECK_MS = 4000;
let checkTimer = 0;
/* Counted, not a flag: `survives` is measured in runs, so the second run has to be
   distinguishable from the first. */
let runs = 0;

function paintRun(){
  const sec = SECTIONS.find(x => x.type === S.section);
  markLabel.textContent = rerunning ? "Cancel electrical check" : sec.cta;
  markBtn.classList.toggle("is-running", rerunning);
}

function stopRun(){
  clearTimeout(checkTimer);
  rerunning = false;
  markFill.style.transition = "none";
  markFill.style.width = "0%";
  paintRun();
}

function rerunElectrical(){
  rerunning = true;
  paintRun();
  markFill.style.transition = "none";
  markFill.style.width = "0%";
  void markFill.offsetWidth;
  markFill.style.transition = `width ${CHECK_MS}ms linear`;
  markFill.style.width = "100%";
  clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    runs++;
    const elec = ISSUES.filter(i => i.type === "Electrical");
    const cleared = [], present = [];
    elec.forEach(i => {
      /* Already locked stays locked — the bike does not re-report what it has
         already stopped seeing, and re-running must not un-clear a result. */
      const gone = i.locked || runs > i.survives;
      const was  = i.done;
      i.done = gone;
      i.locked = gone;
      (gone ? cleared : present).push(i);
      if (gone !== was) window.YuzenIQ.onResolveIssue({id:i.id, fault:i.fault, done:gone});
    });
    stopRun();
    render();
    /* Both halves, always. "2 cleared" alone reads as a clean run when one fault
       just came back — and the one that came back is the thing to act on. */
    toast(present.length
      ? cleared.length + " cleared · " + present.length + " still present"
      : "All electrical faults cleared");
  }, CHECK_MS);
}

markBtn.addEventListener("click", () => {
  tap();
  if (S.section === "Electrical"){
    /* Pressing mid-run cancels it — nothing is cleared and the bar resets. */
    if (rerunning){ stopRun(); toast("Electrical check cancelled"); return; }
    window.YuzenIQ.onRerunChecks(S.section);
    rerunElectrical();
    return;
  }
  window.YuzenIQ.onMarkIssues({
    /* part on a mechanical row, fault on an electrical one — the two kinds do not
       share a name field, and mapping i.part over both handed out undefineds. */
    open:     ISSUES.filter(i => !i.done).map(i => i.part || i.fault),
    resolved: ISSUES.filter(i =>  i.done).map(i => i.part || i.fault),
  });
});

/* Enter and Space on a row, since the row is the target now and a div is not a
   button however it is labelled. */
listEl.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const row = e.target.closest("[data-open]");
  if (!row) return;
  e.preventDefault();
  row.click();
});

render();

  /* Tapping a tab is the same act as being handed a section from the dashboard,
     so it goes through the same function. */
  iqTabsEl.addEventListener("click", e => {
    const t = e.target.closest("[data-iqtab]");
    if (!t || t.dataset.iqtab === S.section) return;
    tap();
    issuesShowSection(t.dataset.iqtab);
  });

  /* Ticking it finishes the step, which re-labels this screen's own CTA and the
     dashboard's — so the whole screen repaints rather than just the box. */
  iqConfirmEl.addEventListener("click", () => {
    tap();
    RnM.confirmFaults(!RnM.faultsConfirmed());
    render();
  });

  enterIssues = function(){ render(); scrollEl.scrollTop = 0; syncHeading(); };

  issuesShowSection = function(type){
    if (!SECTIONS.some(x => x.type === type)) return;
    S.section = type;
    render();
    /* A section you have just opened starts at its own title, not at whatever
       scroll position the previous one was left on. */
    scrollEl.scrollTop = 0;
    syncHeading();
  };

  /* What this screen has filed against the bike, by part name. Add issues reads it
     so a part that already carries issues shows them there too — they are one
     record seen from two screens, and seeding the other screen with its own copy
     would let the two drift the moment either changed. */
  /* The same figure the app bar and the progress bar show, for the RnM dashboard's
     Issues card. It was a hardcoded 0/13 there; two numbers for one thing is a
     drift waiting to happen, so the dashboard asks this screen rather than keeping
     a copy. Whole-bike, both sections — the card does not know about sections. */
  issuesTally = function(){
    return {done: ISSUES.filter(i => i.done).length, total: ISSUES.length};
  };

  /* Per section, for the dashboard's Mechanical and Electrical rows. Derived from
     the same array as the whole-bike figure above rather than counted separately,
     so the three can never disagree. */
  issuesTallyBy = function(type){
    const rows = ISSUES.filter(i => i.type === type);
    /* Counted the way the section is CLOSED, not the way it is ticked — the same
       rule issuesAllResolved() and the section's own CTA use. An electrical fault
       the mechanic has ticked but the bike has not confirmed is still open, so it
       must still count as open here: otherwise the dashboard row reads 3/3 while
       the screen behind it refuses to let you leave, and the Next sequence skips
       a task that is not finished. */
    const closed = type === "Electrical" ? i => i.done && i.locked : i => i.done;
    return {done: rows.filter(closed).length, total: rows.length};
  };

  issuesElectrical = function(){
    return ISSUES.filter(i => i.type === "Electrical").map(i => i.fault);
  };

  spareQueue = function(){
    return ISSUES
      .filter(i => i.type === "Mechanical" && spareAvailable(i))
      .map(i => {
        const j = i.journey || {};
        return {
          part: i.part, art: photoSrc(i),
          got: !!j.spare,          /* a spare is in the mechanic's hands */
          oldBack: !!j.oldBack,    /* the faulty one has gone to stores */
          newBack: !!j.newBack,    /* the spare has gone back instead */
          /* Which physical part stores gets is decided by the outcome, not by
             this screen: Replaced puts the spare on the bike so the faulty one
             goes back; Fixed repairs the original so the spare is surplus. Until
             an outcome exists, both are still possible. */
          outcome: i.outcome,
        };
      });
  };

  issuesByPart = function(){
    const out = {};
    /* Resolved ones come through too, flagged — Add issues shows a green check
       against them rather than dropping them, which would read as never filed. */
    ISSUES.filter(i => i.type === "Mechanical")
          .forEach(i => { out[i.part] = {reasons: i.reasons.slice(), done: i.done}; });
    return out;
  };

  /* The write direction. Two screens file mechanical issues — Add issues, which
     hands over the parts it changed when Update is pressed, and the servicing
     checklist, which files one part at a time as it is marked faulty. Both arrive
     here as {name, reasons, catalogue, photoSrc}.

     An entry is always a decision: reasons on it means file or amend, none means
     whoever sent it cleared the part and the row should go. Matching is by part
     NAME, which is what issuesByPart() keys on — the other screens work from their
     own part lists and their ids mean nothing here. */
  applyMarkedIssues = function(marked){
    (marked || []).forEach(m => {
      const at = ISSUES.findIndex(i => i.type === "Mechanical" && i.part === m.name);
      if (!m.reasons || !m.reasons.length){
        if (at !== -1) ISSUES.splice(at, 1);
        return;
      }
      if (at !== -1){
        ISSUES[at].reasons = m.reasons.slice();
        if (m.catalogue) ISSUES[at].catalogue = m.catalogue.slice();
        /* The sender may know the part better than the row does — a seeded row
           carries this screen's own stock photo, and a checklist filing against
           the same part name brings the render the rest of the app uses. */
        if (m.photoSrc){ ISSUES[at].photoSrc = m.photoSrc; ISSUES[at].crop = m.crop; }
        /* Reasons filed against it again means it is not fixed after all. A locked
           issue is the bike's own verdict, not a mechanic's, so an edit elsewhere
           does not reopen it. */
        if (!ISSUES[at].locked) ISSUES[at].done = false;
        return;
      }
      ISSUES.push({
        id:"i" + (nextId++), part:m.name, by:"You", type:"Mechanical",
        reasons: m.reasons.slice(),
        catalogue: (m.catalogue || m.reasons).slice(),
        /* The sender carries the picture. This screen's own table holds two
           photos and neither is likely to be the right one for a part it has
           never listed — photoSrc is how a new row gets a real thumbnail. */
        photoSrc: m.photoSrc, crop: m.crop, photo:"wheel",
        done:false, locked:false,
      });
    });
    render();
  };

  /* Whole-bike, both sections, and false on an empty record: "nothing left to
     resolve" and "nothing was ever filed" are not the same state, and only the
     first should put a Done button on screen.

     The two sections are held to different standards, because the two kinds of
     issue are settled by different authorities. A MECHANICAL issue is judged by
     hand, so the mechanic's tick — done — is the answer.

     An ELECTRICAL one is not. The bike reported it, and only the bike can say it
     has stopped: the mechanic ticks it to say they have worked on it, then re-runs
     the checks, and the fault is settled only if it fails to come back. That
     result is `locked`, which rerunElectrical() is the only thing that sets. So
     Done waits on locked here, not on done — otherwise ticking three faults you
     have not fixed puts the way out of the screen on the table. */
  issuesAllResolved = function(){
    return ISSUES.length > 0
        && ISSUES.every(i => i.type === "Electrical" ? i.locked : i.done);
  };

  /* ── Whose record is this? ───────────────────────────────────────────────────
     The seeded mechanical rows are the repair's brief: someone reported this bike
     and a mechanic was sent. An assessment is the other way round — it is the
     visit that decides whether the bike has anything wrong with it, so it opens
     on an empty mechanical record and everything in it arrives from its own
     checklist through applyMarkedIssues().

     Kept as one array with the rows moving in and out, rather than two records,
     for the reason this file already gives for issuesTallyBy: a second copy is a
     drift waiting to happen. A row is matched by id, and a snapshot of each is
     held so the repair gets its brief back verbatim after an assessment has been
     through — including, deliberately, any ticks the assessment left on it, since
     re-seeding a resolved issue as open would be inventing a fault.

     Electrical is untouched. Those three are the bike reporting itself, and it
     reports to whoever is standing in front of it — a QCA reads the same faults a
     mechanic would. Only the mechanical rows are somebody's claim about the bike,
     and only a claim can belong to one flow rather than the other. */
  const SEEDED = ISSUES.filter(i => i.seeded).map(i => ({row: i, at: ISSUES.indexOf(i)}));

  prepareIssuesFor = function(kind){
    /* Recorded as well as acted on: the detail sheet is a different sheet in an
       assessment (see openDetail) and the screen wears the flow as a class so
       the stylesheet can answer too. */
    forAssessment = kind === "assessment";
    screenEl.classList.toggle("is-assessment", forAssessment);
    const wanted = kind !== "assessment";
    SEEDED.forEach(({row, at}) => {
      const has = ISSUES.indexOf(row);
      if (wanted && has === -1) ISSUES.splice(Math.min(at, ISSUES.length), 0, row);
      if (!wanted && has !== -1) ISSUES.splice(has, 1);
    });
  };
})();
