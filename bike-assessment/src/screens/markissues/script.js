
/* ========================================================================
   MARK ISSUES — ported from mechanic-rnm-flow/
   Wrapped, so none of her consts reach this app's globals; enterMarkIssues() is the
   only export. Her hook table is window.YuzenMIMI — the token queue and the
   RnM dashboard both define window.YuzenMI, and the RnM one lost that race silently.
   ======================================================================== */
let enterMarkIssues = () => {};

/* Where this screen goes when it is finished with, set by whoever opened it.
   Two callers want two different answers: the ⋮'s "Report issues on bike" is a
   detour into the issue list, so it ends there; the dashboard's "+ Add Issues"
   is a thing you do while standing at the bike, so it ends back at the bike.
   Reset on the way out, so a route can never be inherited by the next opener. */
let markIssuesFrom = "issues";
(function(){

"use strict";

/* ══════════════════════════════════════════════════════════════════════════
   STITCHING CONTRACT — this screen's whole outbound surface.
   Replace the function bodies to wire it into the flow; change nothing else.
   ══════════════════════════════════════════════════════════════════════════ */
window.YuzenMI = {
  /* STITCHED: back returns to the issues screen, which is where Mark Issues
     came from. history.back() would be wrong on a cold open — nothing to go
     back to — so this navigates explicitly. */
  onBack()                        { miLeave(); },
  /* The search screen is not in these frames — this fires where it would open. */
  onSearch()                      { console.log("[YuzenMI] onSearch"); },
  /* 'commands' — the options sheet's only item. The three dots open the sheet
     locally, so the tap itself is not an event anyone downstream needs. */
  onMenu(which)                   { console.log("[YuzenMI] onMenu", which); },
  onTab(zone)                     { console.log("[YuzenMI] onTab", zone); },
  onOpenPart({id, name})          { console.log("[YuzenMI] onOpenPart", {id, name}); },
  /* Every change to a part's marks, from a tile sheet or an expanded row. */
  onMarkPart({id, name, reasons}) { console.log("[YuzenMI] onMarkPart", {id, name, reasons}); },
  /* STITCHED: the marks are filed against the Issues screen's record — one record
     seen from two screens — and with them filed this screen's job is over, so it
     hands back to the list that shows them. */
  onUpdateIssues(marked)          { applyMarkedIssues(marked); miLeave(); },
};

/* Both exits agree — updating and backing out land in the same place, because
   "I added two faults" and "I changed my mind" are the same journey home.

   To the issue list, it is Mechanical explicitly: every part marked here files as
   a Mechanical issue (see applyMarkedIssues), so landing on whichever section was
   last shown could drop a mechanic on Electrical — an empty-handed return from
   the screen they just used to add something. */
function miLeave(){
  const to = markIssuesFrom;
  markIssuesFrom = "issues";
  if (to === "rnm"){ goTo("rnm"); return; }
  goTo("issues");
  issuesShowSection("Mechanical");
}

const PHOTOS = {"air-nozzle": "assets/extracted/d18cc9d487.webp", "battery-bucket": "assets/extracted/f80c849910.webp", "bike-pic": "assets/extracted/4be590abc0.webp", "brake": "assets/extracted/94d64ffc77.webp", "display-unit": "assets/extracted/70f5c842b7.webp", "front-shocker": "assets/extracted/224e5eb4c9.webp", "front-tyre": "assets/extracted/545fb6c8e9.webp", "iot": "assets/extracted/2077f10637.webp", "pigtail": "assets/extracted/7689c1957f.webp", "rear-shocker": "assets/extracted/fc70c77c84.webp", "swingarm": "assets/extracted/d83a4c49f1.webp", "tail-lamp": "assets/extracted/8de66d6800.webp", "tyre-rim": "assets/extracted/464f333fec.webp", "r-mcu": "assets/extracted/91b0921c4b.png", "r-throttle": "assets/extracted/695bef4721.png", "r-front-wheel": "assets/extracted/7ea0db2dd2.png", "r-tyre": "assets/extracted/8cb24b3a8a.png", "r-pigtail": "assets/extracted/d8e0aea0c3.png"};
const CHEVRON = "M11.6635 14.6192C11.5597 14.5807 11.4609 14.5147 11.3673 14.4212L6.873 9.927C6.73467 9.7885 6.66383 9.61442 6.6605 9.40475C6.65733 9.19525 6.72817 9.018 6.873 8.873C7.018 8.72817 7.19367 8.65575 7.4 8.65575C7.60633 8.65575 7.782 8.72817 7.927 8.873L12 12.9462L16.073 8.873C16.2115 8.73467 16.3856 8.66383 16.5953 8.6605C16.8048 8.65733 16.982 8.72817 17.127 8.873C17.2718 9.018 17.3443 9.19367 17.3443 9.4C17.3443 9.60633 17.2718 9.782 17.127 9.927L12.6328 14.4212C12.5391 14.5147 12.4403 14.5807 12.3365 14.6192C12.2327 14.6577 12.1205 14.677 12 14.677C11.8795 14.677 11.7673 14.6577 11.6635 14.6192Z";
const MISSING = "Missing";

/* ── The parts ──────────────────────────────────────────────────────────────
   Recommended is the frame's twelve tiles, in its order, with its labels — three
   of which read "Display" (see the README). The zone lists are drawn from the
   same parts: the frame fills all three with five identical "Front tyre" rows,
   which cannot be told apart in a test.

   `reasons` is the fault catalogue offered for that part; `marked` is what has
   been recorded so far. "Missing" is appended to every catalogue, not listed.

   Reasons, not issues: a part carries ONE issue, and the reasons are what is
   wrong with it — the same shape the issues screen lists (`Rusting · Cuts · Wear
   out` on one row). Three marks on a part is one issue with three reasons, never
   three issues.
   ────────────────────────────────────────────────────────────────────────── */
const FAULTS = ["Rusting", "Cuts", "Wear out"];
const P = (name, photo, zone, reasons, marked) =>
  ({name, photo, zone, reasons: reasons || FAULTS, marked: marked || []});

/* The Recommended mosaic shows everything, so this list is also its running order.
   The first block is the five part renders the Assessment checklist and Mark faults
   already use, brought in at Sagar's request so a mechanic meets the same picture
   of a part wherever they meet the part — they are cut-outs on white where the rest
   are photographs on the bike, which is a difference worth deciding about rather
   than smoothing over.

   Zones still come from the part, so the Front / Middle / Rear lists are unaffected
   by where a tile lands in the mosaic. */
/* The Recommended mosaic shows everything, so this list is also its running order,
   and the order is what the size pattern reads — see TILE_SIZE.

   The pigtail group leads: the large tile with two stacked beside it. The five part
   renders the Assessment checklist and Mark faults already use follow it, brought
   in at Sagar's request so a mechanic meets the same picture of a part wherever
   they meet the part. They are grey cut-outs where the rest are photographs on the
   bike — a difference worth deciding about rather than smoothing over.

   Nothing arrives marked. Three parts used to (Front tyre, Battery bucket, Brake),
   which put red rings on the grid before anyone had touched it.

   Zones still come from the part, so the Front / Middle / Rear lists are unaffected
   by where a tile lands in the mosaic. */
/* The Recommended mosaic shows everything, so this list is also its running order,
   and TILE_SIZE below reads that order position by position.

   The five part renders the Assessment checklist and Mark faults already use are
   in here, brought in at Sagar's request so a mechanic meets the same picture of a
   part wherever they meet the part. They are grey cut-outs where the rest are
   photographs on the bike — a difference worth deciding about rather than
   smoothing over.

   Nothing arrives marked. Three parts used to (Front tyre, Battery bucket, Brake),
   which put red rings on the grid before anyone had touched it.

   Zones still come from the part, so the Front / Middle / Rear lists are unaffected
   by where a tile lands in the mosaic. */
const PARTS = [
  P("Pigtail light",     "r-pigtail",      "Rear",   ["Rusting","Cuts","Wear out"]),
  P("Pigtail connector", "pigtail",        "Front",  ["Wear out","Cuts","Rust"]),
  P("Air nozzle",        "air-nozzle",     "Front",  ["Leaking","Cuts","Damage"]),

  P("MCU",               "r-mcu",          "Middle", ["Water ingress","Error code","Burnt"]),
  P("Throttle",          "r-throttle",     "Front",  ["Sticky","Cuts","No response"]),
  P("Front wheel",       "r-front-wheel",  "Front",  ["Damage","Bent","Wobble"]),

  /* The two small ones lead and the large follows, so this row mirrors the pigtail
     row at the top instead of repeating it. */
  P("Front tyre",        "tyre-rim",       "Front",  ["Worn out","Cuts","Puncture"]),
  P("Display",           "tail-lamp",      "Rear",   ["Not lighting","Cracked","Loose"]),
  P("IOT",               "iot",            "Middle", ["No signal","Water ingress","Loose"]),

  P("Tyre",              "r-tyre",         "Rear",   ["Worn out","Cuts","Puncture"]),

  P("Shocker",           "front-shocker",  "Front",  ["Oil leak","Bent","Noise"]),
  P("Swing arm",         "swingarm",       "Middle", ["Bent","Rusting","Play"]),
  P("Display",           "bike-pic",       "Middle", ["Blank","Flickering","Cracked"]),

  P("Battery bucket",    "battery-bucket", "Middle", ["Rusting","Lock broken","Dented"]),

  P("Rear shocker",      "rear-shocker",   "Rear",   ["Oil leak","Bent","Noise"]),
  P("Brake",             "brake",          "Rear",   ["Not holding","Worn out","Noise"]),
  /* The frame's three tiles all read "Display" (see the README). They are spread
     one per zone so no list ever shows the same label twice — in a zone list,
     with no photo differences to go on, two identical rows are untestable. */
  P("Display",           "display-unit",   "Front",  ["Blank","Cracked","Loose"]),
].map((p, i) => ({id:"p" + i, ...p}));

const ZONES = ["Recommended", "Front", "Middle", "Rear"];
const S = {zone:"Recommended", open:null, sheet:null};

const tabsEl     = document.getElementById("miTabs");
const underlineEl = document.getElementById("miTabsUnderline");
const paneEl   = document.getElementById("miPane");
const scrollEl = document.getElementById("miScroll");
const updateBtn = document.getElementById("miUpdateBtn");
const footerEl  = document.getElementById("miFooter");

const esc = s => String(s).replace(/[&<>"']/g,
  c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function tap(){ if (navigator.vibrate) navigator.vibrate(10); }


const partById = id => PARTS.find(p => p.id === id);
const markedParts = () => PARTS.filter(p => p.marked.length);

/* What the bike already had filed when this screen opened. Three parts arrive with
   issues on them — that is the point of the red dots — so counting every marked
   part would put "Update issues (3)" on screen before the mechanic has touched
   anything, and the footer would be up from the start.

   Sagar's rule is that the button appears once an issue is ADDED, so what counts is
   the difference from this baseline: parts whose marks are not what they were when
   the screen opened. Removing a pre-existing issue counts too — that is also a
   change to commit. Frozen as a string per part, since the arrays are mutated in
   place. */
const BASELINE = new Map(PARTS.map(p => [p.id, p.marked.slice().sort().join("|")]));
const changedParts = () =>
  PARTS.filter(p => p.marked.slice().sort().join("|") !== BASELINE.get(p.id));
/* A part either has an issue against it or it does not; the reasons are that one
   issue's detail. So this is 0 or 1, never the number of reasons — and the row
   badge and the footer count the same thing as each other. */
const issueCount = p => p.marked.length ? 1 : 0;

/* ══════════════════════════════════════════════════════════════════════════
   Chips — enabled or selected. Nothing here is ever disabled.

   A part cannot be missing and faulty at once, but the way to express that is to
   let each side TAKE OVER from the other, not to grey one out: pick Missing and
   the faults clear, pick a fault and Missing clears. The faults stay multi-select
   among themselves.

   The disabled version meant a mechanic who picked Damage by mistake had to
   deselect it before Missing would even accept a tap — the rule was enforced by
   taking the control away rather than by resolving the conflict. This screen was
   the last one still doing that; the issues screen's detail sheet and the
   checklist's part sheet already work this way, so all three now agree.
   ══════════════════════════════════════════════════════════════════════════ */
function chipsHTML(part, marked){
  /* One wrapping run with Missing last, as mechanic-checks lays its chips out.
     The frames break the line before Missing; a single run that wraps on its own
     keeps the two screens' chips identical, which matters more. */
  return part.reasons.concat(MISSING).map(r => {
    const on = marked.includes(r);
    return `<button type="button" class="mi-chip${on ?" is-selected" : ""}"
              data-reason="${esc(r)}" aria-pressed="${on}"
              aria-label="${on ? "Remove" : "Add"} ${esc(r)}">${esc(r)}</button>`;
  }).join("");
}

/* The exclusive rule lives here, not in a disabled attribute. Tapping Missing
   drops every fault; tapping a fault drops Missing. Tapping either again just
   releases it, so there is no state you can get stranded in. */
function toggleReason(picked, r){
  if (r === MISSING) return picked.includes(MISSING) ? [] : [MISSING];
  return (picked.includes(r) ? picked.filter(x => x !== r) : picked.concat(r))
         .filter(x => x !== MISSING);
}

/* ── Tabs ─────────────────────────────────────────────────────────────────────
   Built once, then only their classes change and the underline slides. Rebuilding
   them on every render would restart the slide from wherever the new node happens
   to sit. */
function buildTabs(){
  /* Idempotent, because the build ships the PRE-RENDERED DOM: this runs once in
     headless Chrome at build time and again in the browser, and without the clear
     the strip ends up with two of every tab. The token queue port hit exactly this
     and showed six. */
  tabsEl.querySelectorAll(".mi-tab").forEach(t => t.remove());
  ZONES.forEach(z => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mi-tab";
    b.setAttribute("role", "tab");
    b.dataset.zone = z;
    b.textContent = z;
    tabsEl.insertBefore(b, underlineEl);
  });
}

function moveUnderline(){
  const active = tabsEl.querySelector(".mi-tab.mi-is-active");
  if (!active) return;
  underlineEl.style.width = active.offsetWidth + "px";
  underlineEl.style.transform = `translateX(${active.offsetLeft}px)`;
}

function paintTabs(){
  tabsEl.querySelectorAll(".mi-tab").forEach(b => {
    const on = b.dataset.zone === S.zone;
    b.classList.toggle("mi-is-active", on);
    b.setAttribute("aria-selected", String(on));
  });
  moveUnderline();
  /* A tab scrolled off the strip cannot show it is selected. */
  tabsEl.querySelector(".mi-tab.mi-is-active")
        .scrollIntoView({behavior:"smooth", block:"nearest", inline:"nearest"});
}

/* ── Recommended: tiles ───────────────────────────────────────────────────── */
/* The mosaic, position by position, against the order of PARTS above. It was a
   repeating nine-tile cycle; it is a designed arrangement now, because Sagar placed
   specific rows — so it is written out rather than derived, and reordering PARTS
   without reordering this will put the sizes on the wrong tiles.

   Reading down: a large with two stacked right, a row of three, two stacked LEFT
   with a large right (the mirror), a full-width, a row of three, a full-width, a
   row of three. Seventeen entries for seventeen parts. */
const TILE_SIZE = [
  "--large", "", "",                     /* Pigtail light + connector, nozzle   */
  "", "", "",                            /* MCU, Throttle, Front wheel          */
  "--stack", "--stack", "--largeR",      /* Front tyre, Display | IOT           */
  "--wide",                              /* Tyre                                */
  "", "", "",                            /* Shocker, Swing arm, Display         */
  "--wide",                              /* Battery bucket                      */
  "", "", "",                            /* Rear shocker, Brake, Display        */
];

function tileHTML(p, i){
  const marked = p.marked.length > 0;
  const size = TILE_SIZE[i] || "";      /* beyond the arrangement: small */
  return `<button class="mi-tile${size ?" mi-tile" + size : ""}${marked ? " is-marked" : ""}" data-part="${p.id}"
            aria-label="${esc(p.name)}${marked ? ", issue marked: " + esc(p.marked.join(", ")) : ""}">
      <img src="${PHOTOS[p.photo]}" alt="">
      <span class="tile__scrim"></span>
      <span class="tile__dot"></span>
      <span class="tile__name">${esc(p.name)}</span>
    </button>`;
}

/* ── Zones: rows with an inline chip drawer ───────────────────────────────── */
/* A row is a tap target for the sheet, not an accordion. The inline drawer meant
   two ways to mark a part — the drawer here and the sheet from a tile — which drift
   the moment either changes; and it put the reasons behind a disclosure when they
   are the most useful thing about the row. No chevron either: it promised an
   expand that no longer happens. */
/* The status mark on a row. Two states, and they are the assessment checklist's
   own icons rather than lookalikes — a part that is done should read identically
   wherever it is shown.

   resolved → ICON.rowGood, the filled green disc with a white check, verbatim from
              the checklist's "marked good".
   open     → an outlined circled check. NOT the checklist's pending icon, which is
              a dashed ring with nothing in it: that says "not started", and a row
              only carries this mark once an issue HAS been filed against it. The
              outline says filed-but-not-fixed, which is the state it is in.

   rowGood carries its own #00654F fill, so the .prow__state colour rule does not
   reach it — only the open outline follows currentColor. */
const OPEN_CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.0017 21.5C10.6877 21.5 9.45267 21.2507 8.2965 20.752C7.14033 20.2533 6.13467 19.5766 5.2795 18.7218C4.42433 17.8669 3.74725 16.8617 3.24825 15.706C2.74942 14.5503 2.5 13.3156 2.5 12.0017C2.5 10.6877 2.74942 9.45267 3.24825 8.2965C3.74692 7.14033 4.42375 6.13467 5.27875 5.2795C6.13375 4.42433 7.13917 3.74725 8.295 3.24825C9.45083 2.74942 10.6858 2.5 12 2.5C12.832 2.5 13.6384 2.60608 14.4193 2.81825C15.2001 3.03042 15.9469 3.33717 16.6598 3.7385C16.8519 3.84617 16.9775 4.00133 17.0365 4.204C17.0955 4.4065 17.0609 4.59558 16.9327 4.77125C16.8046 4.94692 16.635 5.05683 16.424 5.101C16.2132 5.14517 16.0097 5.11342 15.8135 5.00575C15.2288 4.67892 14.6137 4.42958 13.9682 4.25775C13.3227 4.08592 12.6667 4 12 4C9.78333 4 7.89583 4.77917 6.3375 6.3375C4.77917 7.89583 4 9.78333 4 12C4 14.2167 4.77917 16.1042 6.3375 17.6625C7.89583 19.2208 9.78333 20 12 20C14.2167 20 16.1042 19.2208 17.6625 17.6625C19.2208 16.1042 20 14.2167 20 12C20 11.8065 19.9927 11.619 19.978 11.4375C19.9632 11.256 19.9378 11.0698 19.902 10.8788C19.8687 10.6659 19.9052 10.4624 20.0115 10.2682C20.118 10.0741 20.2782 9.94817 20.492 9.8905C20.6935 9.83267 20.8804 9.85767 21.0527 9.9655C21.2252 10.0732 21.3282 10.2282 21.3615 10.4307C21.4077 10.6832 21.4422 10.9388 21.4652 11.1973C21.4884 11.4556 21.5 11.7232 21.5 12C21.5 13.3142 21.2507 14.5492 20.752 15.705C20.2533 16.8608 19.5766 17.8663 18.7218 18.7213C17.8669 19.5763 16.8617 20.2531 15.706 20.7518C14.5503 21.2506 13.3156 21.5 12.0017 21.5ZM10.5808 14.1463L19.9193 4.79225C20.0578 4.65392 20.2292 4.58058 20.4337 4.57225C20.6381 4.56392 20.8186 4.638 20.9753 4.7945C21.1186 4.938 21.1903 5.11292 21.1903 5.31925C21.1903 5.52558 21.1178 5.70125 20.973 5.84625L11.2135 15.6212C11.0327 15.8019 10.8218 15.8922 10.5808 15.8922C10.3398 15.8922 10.1288 15.8019 9.948 15.6212L7.20375 12.877C7.06542 12.7385 6.99458 12.5658 6.99125 12.359C6.98792 12.1522 7.05875 11.9769 7.20375 11.8327C7.34875 11.6884 7.52458 11.6163 7.73125 11.6163C7.93792 11.6163 8.11358 11.6884 8.25825 11.8327L10.5808 14.1463Z"/></svg>`;

function rowHTML(p){
  return `<div class="prow" data-prow="${p.id}" data-open="${p.id}"
               role="button" tabindex="0" aria-label="Add issues on ${esc(p.name)}">
      <span class="prow__thumb"><img src="${PHOTOS[p.photo]}" alt=""></span>
      <span class="prow__main">
        <span class="t-label-md prow__name">${esc(p.name)}</span>
        ${p.marked.length
          ? `<span class="t-label-md prow__reasons">${reasonsHTML(p.marked)}</span>`
          : ""}
      </span>
      ${p.marked.length ? `<span class="prow__state${p.resolved ? " is-resolved" : ""}"
             aria-label="${p.resolved ? "Resolved" : "Issue added"}">
        ${p.resolved ? ICON.rowGood : OPEN_CHECK}
      </span>` : ""}
    </div>`;
}

/* The issues on a part, dot-separated — the same line the Issues screen shows
   under a part name, so a part reads the same on both screens. */
function reasonsHTML(list){
  return list.map(r => `<span>${esc(r)}</span>`)
             .join('<span class="prow__dot" aria-hidden="true"></span>');
}


function render(){
  paintTabs();
  const inZone = PARTS.filter(p => p.zone === S.zone);
  paneEl.innerHTML = S.zone === "Recommended"
    ? `<div class="grid">${PARTS.map(tileHTML).join("")}</div>`
    : `<div class="rows">${inZone.map(rowHTML).join("")}</div>`;

  paintFooter();
}

/* The footer is not there until there is something to update — it used to sit
   there disabled, which spends 124px of a 844px screen on a button that cannot be
   pressed and reads as broken rather than as not-yet. Mark anything and it rises;
   clear the last one and it goes. */
function paintFooter(){
  const n = changedParts().length;
  /* "Update 3 issues", not "Update issues (3)" — the count reads as part of the
     sentence rather than as a badge bolted onto it. Singular when it is one. */
  updateBtn.textContent = n
    ? `Update ${n} issue${n === 1 ? "" : "s"}`
    : "Update issues";
  updateBtn.disabled = n === 0;
  footerEl.classList.toggle("is-hidden", n === 0);
  scrollEl.classList.toggle("footer-hidden", n === 0);
}

/* The footer ships hidden in the markup, not shown-then-hidden by the first paint.
   It used to render up and slide away on every refresh — a panel appearing from the
   bottom and dismissing itself, which reads as something having gone wrong. There
   is nothing to animate away if it was never up. */

/* ── Scrolled state ───────────────────────────────────────────────────────────
   Direction, not depth. It used to collapse past 24px and only come back within
   8px of the top, which meant that once you were down the grid the app bar was
   gone until you scrolled all the way up again — the bike number and the search
   were unreachable from anywhere in the middle of a two-fold list.

   Now any upward gesture brings it straight back: the header follows the direction
   you are travelling, the way the footer already does on the issues screen.

   Accumulated with a small threshold rather than acting on each scroll event,
   because a single frame of a flick can carry a pixel the other way and would
   otherwise flip the header. The accumulator resets when the direction changes, so
   8px of committed movement is what counts, not 8px of net drift. */
const phoneEl = document.querySelector(".phone");
const SCROLL_THRESHOLD = 8;
let scrolled = false, sLastY = 0, sAccum = 0;

function setScrolled(next){
  if (next === scrolled) return;
  scrolled = next;
  phoneEl.classList.toggle("is-scrolled", scrolled);
}

scrollEl.addEventListener("scroll", () => {
  const y = scrollEl.scrollTop;
  const delta = y - sLastY;
  sLastY = y;
  if (delta === 0) return;

  if ((delta > 0) !== (sAccum > 0)) sAccum = 0;      /* direction flipped */
  sAccum += delta;

  if (sAccum > SCROLL_THRESHOLD)       { setScrolled(true);  sAccum = 0; }
  else if (sAccum < -SCROLL_THRESHOLD) { setScrolled(false); sAccum = 0; }

  if (y <= 0) setScrolled(false);                    /* always open at the top */
}, {passive:true});

/* A new zone starts at the top, so the chrome comes back with it. */
function resetScroll(){
  scrollEl.scrollTop = 0;
  sLastY = 0; sAccum = 0;
  setScrolled(false);
}

/* ── Tab switching ────────────────────────────────────────────────────────── */
tabsEl.addEventListener("click", e => {
  const t = e.target.closest("[data-zone]");
  if (!t || t.dataset.zone === S.zone) return;
  S.zone = t.dataset.zone;
  resetScroll();
  S.open = null;                     /* a drawer left open in another zone is
                                        not something you can see or close */
  tap();
  render();
  scrollEl.scrollTop = 0;
  window.YuzenMI.onTab(S.zone);
});

/* ── Tiles and rows ───────────────────────────────────────────────────────── */
paneEl.addEventListener("click", e => {
  const tile = e.target.closest("[data-part]");
  if (tile){
    const p = partById(tile.dataset.part);
    tap();
    openSheet(p);
    window.YuzenMI.onOpenPart({id:p.id, name:p.name});
    return;
  }

  /* The inline chip drawer this used to handle went when the row became a plain
     tap target for the sheet (see the comment above rowHTML). Nothing renders
     .prow__chips any more, and the handler that read it was dead — it reached for
     a [data-chips] element no markup has produced since. */

  const row = e.target.closest("[data-open]");
  if (row){
    tap();
    openSheet(partById(row.dataset.open));
  }
});

/* Surgical repaints, so marking never disturbs an open drawer. */
function paintRowCount(p){
  const row = paneEl.querySelector(`[data-prow="${p.id}"]`);
  if (!row) return;
  const main = row.querySelector(".prow__main");
  const n = issueCount(p);
  main.querySelectorAll(".prow__sep,.prow__count").forEach(el => el.remove());
  if (n) main.insertAdjacentHTML("beforeend",
    `<span class="prow__sep"></span><span class="prow__count">${n}</span>`);
}
/* ══════════════════════════════════════════════════════════════════════════
   Part sheet — Figma 2052:16205

   Edits live in the sheet until Confirm, so backing out leaves the earlier
   marks standing. Confirm is disabled until the selection differs from what was
   saved: with nothing changed there is nothing to confirm.
   ══════════════════════════════════════════════════════════════════════════ */
const partScrim   = document.getElementById("miPartScrim");
const partSheet   = document.getElementById("miPartSheet");
const partThumb   = document.getElementById("miPartThumb");
const partNameEl  = document.getElementById("miPartName");
const partChips   = document.getElementById("miPartChips");
const partConfirm = document.getElementById("miPartConfirm");
const partDelete  = document.getElementById("miPartDelete");

let sheet = null;                     /* {id, picked:[]} */

const same = (a, b) =>
  a.length === b.length && a.every(x => b.includes(x));

/* What the footer offers depends on whether the part already carries issues.

   A clean part gets one button, "Add issue", which files what has been picked.

   A part that already has issues gets two — the same pair the issues screen's
   detail sheet puts against the same record: "Update issue" commits the edited
   chips, and "Delete" throws the issue away. That replaces the single "Remove
   issues" button, under which there was no way to EDIT a filed part's reasons:
   you removed them and added them again. Either action counts as a change, so
   the screen's own footer then offers "Update N issues" as the way back. */
function paintSheet(){
  if (!sheet) return;
  const p = partById(sheet.id);
  const had = p.marked.length > 0;
  partChips.innerHTML = chipsHTML(p, sheet.picked);
  partConfirm.textContent = had ? "Update issue" : "Add issue";
  /* Committing with nothing picked would file an issue with no reason on it, or
     strip the last reason off one already filed. Delete is what that second one
     means, and it is the button next to this one. */
  partConfirm.disabled = sheet.picked.length === 0;
  partDelete.hidden = !had;
}


function openSheet(p){
  sheet = {id:p.id, picked:p.marked.slice()};
  /* The sibling's .thumb carries its photo as a background, so this does too —
     one element, one rule, and no <img> to size against it. */
  partThumb.style.backgroundImage = `url("${PHOTOS[p.photo]}")`;
  partThumb.style.backgroundSize = "cover";
  partThumb.style.backgroundPosition = "center";
  partNameEl.textContent = p.name;
  paintSheet();
  partScrim.classList.add("mi-is-open");
  partSheet.classList.add("mi-is-open");
}

function closeSheet(){
  sheet = null;
  partScrim.classList.remove("mi-is-open");
  partSheet.classList.remove("mi-is-open");
  partSheet.style.transform = "";
}

partScrim.addEventListener("click", closeSheet);

partChips.addEventListener("click", e => {
  const chip = e.target.closest("[data-reason]");
  if (!chip || !sheet) return;
  sheet.picked = toggleReason(sheet.picked, chip.dataset.reason);
  tap();
  paintSheet();
});

/* Both footer buttons land here — they differ only in what they leave on the
   part. Delete passes nothing, which is the same shape as clearing every chip. */
function commitPart(marked){
  const p = partById(sheet.id);
  p.marked = marked;
  const n = p.marked.length, name = p.name, id = p.id;
  tap();
  closeSheet();
  render();
  /* No toast on adding. The sheet closing and the row appearing with its reasons
     already say it landed — a banner over the top repeated that, and repeated it
     on every part while filing several in a row. Deleting says nothing either,
     for the same reason: the row is gone, which is the whole message. */
  window.YuzenMI.onMarkPart({id, name, reasons:p.marked.slice()});
}

partConfirm.addEventListener("click", () => commitPart(sheet.picked.slice()));
partDelete.addEventListener("click",  () => commitPart([]));

/* Drag the grabber down to dismiss. */
(() => {
  const zone = document.getElementById("miPartGrab");
  let d = null;
  zone.addEventListener("pointerdown", e => {
    d = {y0:e.clientY, dy:0};
    zone.setPointerCapture(e.pointerId);
    partSheet.classList.add("sheet-part--dragging");
  });
  zone.addEventListener("pointermove", e => {
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    partSheet.style.transform = `translateY(${d.dy}px)`;
  });
  const end = () => {
    if (!d) return;
    const far = d.dy > 60; d = null;
    partSheet.classList.remove("sheet-part--dragging");
    partSheet.style.transform = "";
    if (far) closeSheet();
  };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);
})();

document.getElementById("miBackBtn").addEventListener("click", () => {
  tap(); window.YuzenMI.onBack();
});
document.getElementById("miSearchBtn").addEventListener("click", () => {
  tap(); window.YuzenMI.onSearch();
});

/* Her options sheet is gone — this app has one, shared across every screen,
   and her ⋮ is marked [data-opt-more] so it opens that one instead. A second
   sheet here is exactly the drift her own README warns about. */
updateBtn.addEventListener("click", () => {
  tap();
  window.YuzenMI.onUpdateIssues(changedParts().map(p => ({
    id:p.id, name:p.name, reasons:p.marked.slice(),
    /* Everything the Issues screen needs to file a part it has never listed: the
       whole reason catalogue, so its detail sheet can offer the ones that were not
       picked, and the photo itself rather than a key — the two screens keep
       separate image tables and only this one has this part's picture. */
    catalogue:p.reasons.slice(), photoSrc:PHOTOS[p.photo],
  })));
});

buildTabs();
render();
/* Satoshi lands after first paint and the labels change width with it, so the
   underline is measured again once the font is in. */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveUnderline);

  enterMarkIssues = function(){
    /* Pull what the Issues screen has on record before painting. A part it lists
       is a part that already carries issues here, so Add issues shows them and
       offers Remove rather than Add. BASELINE is re-taken with them, or every one
       would count as a change the moment this screen opened. */
    const filed = issuesByPart();
    PARTS.forEach(p => {
      const f = filed[p.name];
      if (f){ p.marked = f.reasons.slice(); p.resolved = f.done; }
    });
    PARTS.forEach(p => BASELINE.set(p.id, p.marked.slice().sort().join("|")));
    /* Always Front, every entry — Sagar's call. The screen does not remember where
       it was left: coming in from Add issues is the start of a new pass over the
       bike, and resuming on Rear because that is where the last pass ended would
       be the screen holding state the mechanic is not thinking about. Reset with
       it: any half-picked sheet and open row belong to the visit that ended. */
    S.zone = "Front";
    S.open = null;
    closeSheet();
    render();
    resetScroll();
  };
})();
