/* ========================================================================
   SERVICING CHECKS — ported from mechanic-checks/
   Wrapped, so none of Barun's consts reach this app's globals; enterChecks() is
   the only export. His hook table is window.YuzenCK — three other screens in this
   file define window.Yuzen and the last one loaded wins, silently.
   ======================================================================== */
let enterChecks = () => {};
/* What this checklist has got through, for the RnM dashboard's Checks card. Same
   arrangement the Issues screen already has with issuesTally(): the card asks the
   screen that owns the record rather than keeping a copy that can drift. */
let checksTally = () => ({done:0, total:0});
(function(){


/* ═══════════════════════════════════════════════════════════════════════════
   DATA
   Each part carries its own faulty reasons. Per Barun: reasons differ by part,
   the reasons are multi-select among themselves, and "Missing" is mutually
   exclusive with all of them.

   PHOTOS: Figma only supplied four real part photos. Parts that genuinely look
   alike reuse one (front/rear tyre, front/rear brake). The rest are realistic
   dummy entries carrying a placeholder, so the list is long enough to test the
   swipe rhythm and produce a believable progress ratio. Swap `thumb` to a real
   asset as photography arrives.
   ═══════════════════════════════════════════════════════════════════════════ */
const ASSETS = {
  display : "var(--ck-img-display)",
  pigtail : "var(--ck-img-pigtail)",
  tyre    : "var(--ck-img-tyre)",
  brake   : "var(--ck-img-brake)",
};

/* Thumbnail crops for the 48px tile. `pigtail` is verbatim from the current
   Figma frame (2024:33880); the others are the earlier 44px crops scaled by
   the same 48/44 factor Figma used. */
const CROPS = {
  display : {w:54.71, h:53.40, dx:0,     dy:0},
  pigtail : {w:45.89, h:60.505,dx:1.97,  dy:-2.01},
  brake   : {w:84.00, h:46.91, dx:-4.91, dy:-1.64},
  /* No tyre tile in Figma — sized to fill the box at the photo's 1.78 aspect,
     nudged onto the wheel. */
  tyre    : {w:85.30, h:48,    dx:-7.6,  dy:-2.2},
};

/* `action` and `note` are deliberately two fields, not one. `action` is the verb
   and nothing else, because it is also the label on the good button — a whole
   sentence there would be unreadable and would blow the button's width. `note` is
   the same job written as an instruction, and it is what the line under the part
   name shows. Sagar's call: "Clean" said what to do without saying how, and the
   line had room for the how.

   Kept to roughly forty characters so each one holds a single line in the card at
   its new size. Longer than that and the card grows a line, which the row/card
   morph would then have to absorb. */
const PARTS = [
  {name:"Hub motor",                   action:"Clean",     photo:"tyre",    crop:"tyre",
   note:"Clean the hub after removing the axle",
   reasons:["Not on vehicle","Wrong variant fitted","Removed for repair"]},
  {name:"Front wheel",                 action:"Check",     photo:"tyre",    crop:"tyre",
   note:"Check the wheel for wobble and play",
   reasons:["Wobble","Bearing noise","Spokes loose","Rim bent"]},
  {name:"MCU",                         action:"Adjust",    photo:"display", crop:"display",
   note:"Adjust mapping and reseat connector",
   reasons:["Throttle mapping off","Error code","Connector loose","Water ingress"]},
  {name:"Rear Brake shoe lining wear", action:"Replace",   photo:"brake",   crop:"brake",
   note:"Replace the lining if it is below limit",
   reasons:["Lining below limit","Uneven wear","Glazed","Cracked"]},
  {name:"Rear Brake cam",              action:"Lubricate", photo:"brake",   crop:"brake",
   note:"Lubricate the cam and check its travel",
   reasons:["Dry","Stiff travel","Rusting","Squealing"]},
  {name:"Battery & its mounting",      action:"Tighten",   photo:"pigtail", crop:"pigtail",
   note:"Tighten the bolts and check the strap",
   reasons:["Bolts loose","Rubber pad worn","Rattle","Strap frayed"]},
].map((p,i) => ({id:"p"+i, status:"pending", reasons_selected:[],
                 section:"Periodic maintenance", ...p}));

/* Section order comes from PARTS itself, so adding a part to a new section is a
   one-line data change and cannot desync from the headers. */
const SECTIONS = PARTS.reduce((a,p) => a.includes(p.section) ? a : a.concat(p.section), []);

const MISSING = "Missing";

/* Index of the part currently expanded into the assessment card. */
let activeIndex = 0;

/* Part names this checklist has filed an issue against. Only these may be
   withdrawn again — see settle(). */
const FILED = new Set();

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */
const ICON = {
  /* Row status — filled discs, per Assessment_complete (2030:35821). Outlined
     grey gave good and faulty the same weight, so a failed part did not read
     when scanning back up a long list. */
  rowGood:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#00654F"/><path d="M10.6 16.2 6.4 12l1.4-1.4 2.8 2.8 6-6L18 8.8z" fill="#fff"/></svg>`,
  rowFaulty:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#C13515"/><path d="M12 13.06l-3.06 3.06-1.06-1.06L10.94 12 7.88 8.94 8.94 7.88 12 10.94l3.06-3.06 1.06 1.06L13.06 12l3.06 3.06-1.06 1.06z" fill="#fff"/></svg>`,
  rowPending:`<svg width="21.5" height="21.5" viewBox="0 0 21.5 21.5" fill="none"><circle cx="10.75" cy="10.75" r="10" stroke="#B0B0B0" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="4 4"/></svg>`,
  /* Card actions — semantic colour */
  faulty:`<svg viewBox="0 0 24 24" fill="none"><path d="M12 13.0537L15.073 16.127C15.2115 16.2653 15.3856 16.3362 15.5952 16.3395C15.8047 16.3427 15.982 16.2718 16.127 16.127C16.2718 15.982 16.3443 15.8063 16.3443 15.6C16.3443 15.3937 16.2718 15.218 16.127 15.073L13.0538 12L16.127 8.927C16.2653 8.7885 16.3362 8.61442 16.3395 8.40475C16.3427 8.19525 16.2718 8.018 16.127 7.873C15.982 7.72817 15.8063 7.65575 15.6 7.65575C15.3937 7.65575 15.218 7.72817 15.073 7.873L12 10.9462L8.927 7.873C8.7885 7.73467 8.61442 7.66383 8.40475 7.6605C8.19525 7.65733 8.018 7.72817 7.873 7.873C7.72817 8.018 7.65575 8.19367 7.65575 8.4C7.65575 8.60633 7.72817 8.782 7.873 8.927L10.9462 12L7.873 15.073C7.73467 15.2115 7.66383 15.3856 7.6605 15.5952C7.65733 15.8047 7.72817 15.982 7.873 16.127C8.018 16.2718 8.19367 16.3443 8.4 16.3443C8.60633 16.3443 8.782 16.2718 8.927 16.127L12 13.0537ZM12.0017 21.5C10.6877 21.5 9.45267 21.2507 8.2965 20.752C7.14033 20.2533 6.13467 19.5766 5.2795 18.7218C4.42433 17.8669 3.74725 16.8617 3.24825 15.706C2.74942 14.5503 2.5 13.3156 2.5 12.0017C2.5 10.6877 2.74933 9.45267 3.248 8.2965C3.74667 7.14033 4.42342 6.13467 5.27825 5.2795C6.13308 4.42433 7.13833 3.74725 8.294 3.24825C9.44967 2.74942 10.6844 2.5 11.9982 2.5C13.3122 2.5 14.5473 2.74933 15.7035 3.248C16.8597 3.74667 17.8653 4.42342 18.7205 5.27825C19.5757 6.13308 20.2528 7.13833 20.7518 8.294C21.2506 9.44967 21.5 10.6844 21.5 11.9982C21.5 13.3122 21.2507 14.5473 20.752 15.7035C20.2533 16.8597 19.5766 17.8653 18.7218 18.7205C17.8669 19.5757 16.8617 20.2528 15.706 20.7518C14.5503 21.2506 13.3156 21.5 12.0017 21.5Z" fill="#C13515"/></svg>`,
  good:`<svg viewBox="0 0 24 24" fill="none"><path d="M10.5808 14.1463L8.25775 11.823C8.11925 11.6847 7.94517 11.6138 7.7355 11.6105C7.526 11.6073 7.34875 11.6782 7.20375 11.823C7.05892 11.968 6.9865 12.1437 6.9865 12.35C6.9865 12.5563 7.05892 12.732 7.20375 12.877L9.948 15.6212C10.1288 15.8019 10.3398 15.8922 10.5808 15.8922C10.8218 15.8922 11.0327 15.8019 11.2135 15.6212L16.777 10.0577C16.9153 9.91925 16.9862 9.74517 16.9895 9.5355C16.9927 9.326 16.9218 9.14875 16.777 9.00375C16.632 8.85892 16.4563 8.7865 16.25 8.7865C16.0437 8.7865 15.868 8.85892 15.723 9.00375L10.5808 14.1463ZM12.0017 21.5C10.6877 21.5 9.45267 21.2507 8.2965 20.752C7.14033 20.2533 6.13467 19.5766 5.2795 18.7218C4.42433 17.8669 3.74725 16.8617 3.24825 15.706C2.74942 14.5503 2.5 13.3156 2.5 12.0017C2.5 10.6877 2.74933 9.45267 3.248 8.2965C3.74667 7.14033 4.42342 6.13467 5.27825 5.2795C6.13308 4.42433 7.13833 3.74725 8.294 3.24825C9.44967 2.74942 10.6844 2.5 11.9982 2.5C13.3122 2.5 14.5473 2.74933 15.7035 3.248C16.8597 3.74667 17.8653 4.42342 18.7205 5.27825C19.5757 6.13308 20.2528 7.13833 20.7518 8.294C21.2506 9.44967 21.5 10.6844 21.5 11.9982C21.5 13.3122 21.2507 14.5473 20.752 15.7035C20.2533 16.8597 19.5766 17.8653 18.7218 18.7205C17.8669 19.5757 16.8617 20.2528 15.706 20.7518C14.5503 21.2506 13.3156 21.5 12.0017 21.5Z" fill="#00654F"/></svg>`,
  /* Skip — "do this one later": a dot with an arrow coming back round to it. */
  skip:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.0531 17.9462C9.51773 17.411 9.25006 16.762 9.25006 15.9992C9.25006 15.2363 9.51773 14.5873 10.0531 14.0522C10.5882 13.5168 11.2372 13.2492 12.0001 13.2492C12.7629 13.2492 13.4119 13.5168 13.9471 14.0522C14.4824 14.5873 14.7501 15.2363 14.7501 15.9992C14.7501 16.762 14.4824 17.411 13.9471 17.9462C13.4119 18.4815 12.7629 18.7492 12.0001 18.7492C11.2372 18.7492 10.5882 18.4815 10.0531 17.9462ZM4.63281 11.7492C4.91748 9.96449 5.7489 8.47666 7.12706 7.28566C8.50523 6.09466 10.1212 5.49916 11.9751 5.49916C13.2046 5.49916 14.3327 5.77066 15.3596 6.31366C16.3866 6.85666 17.2379 7.58199 17.9136 8.48966V5.44141H19.4136V11.7492H13.1058V10.2492H17.3251C16.8174 9.27866 16.095 8.49432 15.1578 7.89616C14.2206 7.29816 13.1681 6.99916 12.0001 6.99916C10.5719 6.99916 9.31231 7.45016 8.22131 8.35216C7.13031 9.25399 6.44248 10.3863 6.15781 11.7492H4.63281Z" fill="currentColor"/></svg>`,
  /* Reveal confirmation — 40px filled disc, colour inherited from the reveal */
  confirm:`<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="currentColor"/><path d="M17.4 26.3 10.9 19.8l2-2 4.5 4.5 9.6-9.6 2 2z" fill="#fff"/></svg>`,
  /* Placeholder for parts whose photography has not been shot yet */
  noPhoto:size=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2v9.2l3.6-3.6 2.7 2.7 3.4-3.4L19 15.5V7H5Z" fill="currentColor" opacity=".55"/><circle cx="9" cy="10" r="1.4" fill="currentColor" opacity=".55"/></svg>`,
};

/* Skipped parts wear the pending ring: skipping is not a verdict, the part is
   still owed, and the row already says Pending under its name. */
const statusIcon = s => s === "good" ? ICON.rowGood : s === "faulty" ? ICON.rowFaulty
                      : ICON.rowPending;

/* Judged = a verdict was given. Skipping is NOT one: the row says "Pending" and it
   is gathered at the top of its section precisely because it is still owed, so
   counting it as finished would have the counter claim 6/6 over rows that read
   Pending. It follows that a skipped part also holds the Done button back — which
   is the honest reading of "when all the checks are done". */
const judged = p => p.status === "good" || p.status === "faulty";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════════════════════ */
const listEl     = document.getElementById("ckList");
/* ══════════════════════════════════════════════════════════════════════════
   STITCHING CONTRACT — replace these bodies to wire the screen into the flow.
   ══════════════════════════════════════════════════════════════════════════ */
window.YuzenCK = {
  onBack()      { goTo("rnm"); },
  /* 'add' | 'commands' — the two options-sheet items. */
  onMenu(which) { /* the host's ⋮ sheet handles this */ },
  onDone()      { goTo("rnm"); },
};

const scrollEl   = document.getElementById("ckScroll");
const scrimEl    = document.getElementById("ckScrim");
const sheetEl    = document.getElementById("ckSheet");
const chipsEl    = document.getElementById("ckIssueChips");
const confirmBtn = document.getElementById("ckSheetConfirm");

function thumbStyle(part){
  if (!part.photo) return "";
  const c = CROPS[part.crop];
  return `background-image:${ASSETS[part.photo]};`
       + `background-size:${c.w}px ${c.h}px;`
       + `background-position:calc(50% + ${c.dx}px) calc(50% + ${c.dy}px);`;
}

/* The Issues screen files a row with an <img src>, and this screen's photos are
   CSS custom properties holding url(data:…) — so the value has to be read off the
   screen element and unwrapped before it can travel. Empty for a part with no
   photograph yet; the receiving side falls back to its own table. */
function photoDataURL(part){
  if (!part.photo) return "";
  const v = getComputedStyle(screenEl)
              .getPropertyValue("--ck-img-" + part.photo).trim();
  const m = v.match(/url\(\s*["']?(.*?)["']?\s*\)/);
  return m ? m[1] : "";
}

function thumbHTML(part){
  return part.photo
    ? `<div class="ck-thumb" style="${thumbStyle(part)}"></div>`
    : `<div class="ck-thumb">${ICON.noPhoto(24)}</div>`;
}

function mediaHTML(part){
  if (!part.photo)
    return `<div class="ck-card__media">${ICON.noPhoto(56)}</div>`;
  return `<div class="ck-card__media" role="img" aria-label="${esc(part.name)}"
               style="background-image:${ASSETS[part.photo]}"></div>`;
}

/* The prescribed action for a part, from Figma 10-1382. "Missing" is a fault
   already found rather than a job queued, so it takes the negative colour the
   design gives it; the rest are jobs to do and read tertiary. */
function actionHTML(part, cls){
  /* Two different things can sit on this line. `fault` is a problem already
     recorded against the part and reads negative; `action` is the job the
     mechanic still has to do and reads tertiary. Hub motor carries both — it is
     missing, and the job is to clean — and the fault is the more urgent of the
     two, so it wins the line. */
  const text = part.fault || part.note || part.action;
  if (!text) return "";
  return `<p class="${cls || "ck-row__action"}${part.fault ? " ck-is-missing" : ""}">`
       + `${esc(text)}</p>`;
}

function collapsedHTML(part, index){
  /* A skipped row says "Pending" instead of repeating the instruction — the
     instruction is what to do, and the row's job here is to report that it is
     still owed. The status stays `skipped` internally: it is how the part got
     here, and it is what the ordering and the counts key off. */
  const reasons = part.status === "faulty" && part.reasons_selected.length
    ? `<p class="ck-row__reasons">${esc(part.reasons_selected.join(", "))}</p>`
    : part.status === "skipped" ? `<p class="ck-row__action">Pending</p>` : "";
  return `<div class="ck-item ck-item--collapsed ck-item--tappable"
        data-id="${part.id}" data-index="${index}">
      <div class="ck-row">
        <div class="ck-row__lhs">
          ${thumbHTML(part)}
          <div class="ck-row__text">
            <p class="t-label-md ck-row__label">${esc(part.name)}</p>
            ${reasons || actionHTML(part)}
          </div>
        </div>
        <div class="ck-row__status">${statusIcon(part.status)}</div>
      </div>
    </div>`;
}

/* The dashed frame is an SVG rather than `border:3px dashed`, because CSS
   cannot express Figma's 4-on / 6-off dash. The 3px stroke sits inside, so the
   panel stays exactly the card's 342x344; rx is 12 less the 1.5 stroke inset. */
function revealHTML(kind, label){
  return `<div class="ck-reveal reveal--${kind}" data-reveal="${kind}">
      <svg class="ck-reveal__frame" preserveAspectRatio="none" viewBox="0 0 342 344" aria-hidden="true">
        <rect x="1.5" y="1.5" width="339" height="341" rx="10.5" fill="none"
              stroke="currentColor" stroke-width="3" stroke-dasharray="4 6"/>
      </svg>
      <div class="ck-reveal__body">${ICON.confirm}<p class="t-label-md">${esc(label)}</p></div>
    </div>`;
}

function expandedHTML(part){
  return `<div class="ck-item ck-item--expanded" data-id="${part.id}">
      <div class="ck-swipe">
        ${revealHTML("good",   part.name + " marked done")}
        ${revealHTML("faulty", part.name + " marked Faulty")}
        <div class="ck-card" data-card="${part.id}">
          <div class="ck-card__head">
            <div class="ck-card__headRow">
              <div class="ck-card__headText">
                <p class="t-label-md700">${esc(part.name)}</p>
                ${actionHTML(part, "ck-card__action")}
              </div>
              <!-- Skip sits with the name and the instruction, not with Faulty and
                   Done, because it is not an outcome for the part — it is a decision
                   not to judge it now. Grouping it with the other two would read as
                   a third verdict. -->
              <button class="ck-btn-skip" data-action="skip" aria-label="Skip">${ICON.skip}</button>
            </div>
            ${mediaHTML(part)}
          </div>
          <div class="ck-card__actions">
            <button class="ck-btn-faulty" data-action="faulty">
              <span class="ck-btn-label">${ICON.faulty}<span class="t-label-md ck-txt-negative">Faulty</span></span>
            </button>
            <!-- The same 1px rule the RnM tab bar puts between its two tabs. -->
            <span class="ck-card__rule" aria-hidden="true"></span>
            <button class="ck-btn-good" data-action="good">
              <span class="ck-btn-good__inner">
                <!-- "Good", the verdict opposite Faulty, not the part's verb. The
                     verb is on the instruction line under the name, and a fixed
                     word keeps the button the same width from part to part. -->
                <span class="ck-btn-label">${ICON.good}<span class="t-label-md ck-txt-positive">Good</span></span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ── Tabs ─────────────────────────────────────────────────────────────────────
   The two checklists were stacked, one under the other, each behind its own
   heading. They are side by side now: one is on screen at a time and the strip
   says which. The headings are gone with the stacking — a title above a list that
   is already named by its selected tab says it twice. */
let activeSection = SECTIONS[0];

/* ONE CHECKLIST, ONE HEADING. The tab strip went with Monsoon: with a single
   list there is nothing to switch between, so its name and count are a heading
   at the top of the list instead, and it scrolls away with the rows. */
function headingHTML(){
  const inSec = PARTS.filter(p => p.section === activeSection);
  return `<h2 class="ck-heading">${esc(activeSection)} <span class="ck-heading__n">${
    inSec.filter(judged).length}/${inSec.length}</span></h2>`;
}

/* PARTS stays in its authored order — activeIndex, the advance order and every
   data-index point into it, so reordering the array itself would break all three.
   What is reordered is the VIEW: within the section on screen, the parts sent back
   to be done later float to the top, so the work still owed is gathered where the
   mechanic looks first. */
function displayOrder(){
  const inSec = PARTS.map((p,i) => ({p,i})).filter(x => x.p.section === activeSection);
  return inSec.filter(x => x.p.status === "skipped")
         .concat(inSec.filter(x => x.p.status !== "skipped"));
}

/* The first part in this section still waiting for a verdict, or -1. Used when a
   tab is opened and when a verdict finishes a card. */
function firstPending(section){
  return PARTS.findIndex(p => p.section === section && p.status === "pending");
}

/* Switching lists. Reached two ways — a tab press, and the footer's Next — so it
   lives outside the tab handler rather than inside it. */
function selectSection(sec){
  if (sec === activeSection) return;
  activeSection = sec;
  /* Open the first part still owed in this list, so switching tabs lands on work
     rather than on whatever index happened to be active in the other one. */
  activeIndex = firstPending(activeSection);
  render();
  scrollEl.scrollTop = 0;
  setScrolled(false);
}

function render(){
  /* The section on screen, skipped rows first. No headers in the list any more —
     the tab is the heading. */
  listEl.innerHTML = headingHTML() + displayOrder()
    .map(({p,i}) => i === activeIndex ? expandedHTML(p) : collapsedHTML(p,i))
    .join("");
  const done = PARTS.filter(judged).length;
  document.getElementById("ckProgressFill").style.width = (done / PARTS.length * 100) + "%";
  /* Progress spans every section — the task is not finished until both checklists
     are. Each tab carries its own count, and the footer reads whichever of the
     two it is: Next while one list is owed, Done when none is. */
  showFooter();                /* showFooter decides; see footerMode() */

  bindCard();
}

/* The card is the list item expanded in place, so it is never forced to a
   fixed position — it is only scrolled far enough to sit comfortably in view,
   clamping naturally at either end of the list. */
function revealActive(behavior){
  const el = listEl.querySelector(".ck-item--expanded");
  if (!el) return;
  const target = el.offsetTop - (scrollEl.clientHeight - el.offsetHeight) / 2;
  const max = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
  scrollEl.scrollTo({top: Math.min(Math.max(0, target), max), behavior: behavior || "auto"});
}

/* ═══════════════════════════════════════════════════════════════════════════
   SWIPE
   Right → good, left → faulty. The card tracks the finger and the reveal
   behind it brightens with distance; past the threshold it flies off.
   ═══════════════════════════════════════════════════════════════════════════ */
const COMMIT_RATIO   = 0.30;   /* of card width */
const FLICK_VELOCITY = 0.65;   /* px per ms */
let drag = null;
let busy = false;              /* an outcome is animating — ignore new input */

function bindCard(){
  const card = listEl.querySelector(".ck-card");
  if (!card) return;
  card.addEventListener("pointerdown", onDown);
  card.querySelector('[data-action="good"]')
      .addEventListener("click", e => { e.stopPropagation(); if (!busy) flyOut("good"); });
  card.querySelector('[data-action="faulty"]')
      .addEventListener("click", e => { e.stopPropagation(); if (!busy) flyOut("faulty"); });
  /* No fly-out for Skip. The swipe animation is the confirmation of a verdict, and
     skipping is not one — the card just closes and the list moves on. */
  card.querySelector('[data-action="skip"]')
      .addEventListener("click", e => { e.stopPropagation(); if (!busy) settle("skipped"); });
}

function paint(card, dx){
  const w   = card.offsetWidth;
  const rot = Math.max(-10, Math.min(10, dx * 0.045));
  card.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;
  const p = Math.min(1, Math.abs(dx) / (w * COMMIT_RATIO));
  const swipe = card.parentElement;
  swipe.querySelector('[data-reveal="good"]').style.opacity   = dx > 0 ? p : 0;
  swipe.querySelector('[data-reveal="faulty"]').style.opacity = dx < 0 ? p : 0;
}

function onDown(e){
  if (busy || e.button > 0) return;
  const card = e.currentTarget;
  card.classList.remove("ck-card--settling");
  /* Deliberately no pointer capture yet — capturing here would swallow a
     vertical drag that the list should be scrolling with. */
  drag = {card, id:e.pointerId, x0:e.clientX, y0:e.clientY,
          dx:0, t:e.timeStamp, vx:0, axis:null};
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerup", onUp);
  card.addEventListener("pointercancel", onUp);
}

function onMove(e){
  if (!drag) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;

  /* Decide once whether this gesture is a horizontal swipe or a vertical
     scroll, so the list still scrolls normally under the finger. Only take
     pointer capture once it is definitely a swipe. */
  if (!drag.axis){
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (drag.axis === "y"){ endDrag(); return; }
    try { drag.card.setPointerCapture(drag.id); } catch (_) {}
  }
  const dt = Math.max(1, e.timeStamp - drag.t);
  drag.vx = (dx - drag.dx) / dt;
  drag.dx = dx; drag.t = e.timeStamp;
  paint(drag.card, dx);
}

function onUp(){
  if (!drag || drag.axis !== "x"){ endDrag(); return; }
  const {card, dx, vx} = drag;
  const past  = Math.abs(dx) >= card.offsetWidth * COMMIT_RATIO;
  const flick = Math.abs(vx) >= FLICK_VELOCITY && Math.abs(dx) > 24;
  endDrag();

  if (past || flick) flyOut(dx > 0 ? "good" : "faulty");
  else springBack(card);
}

function endDrag(){
  if (!drag) return;
  drag.card.removeEventListener("pointermove", onMove);
  drag.card.removeEventListener("pointerup", onUp);
  drag.card.removeEventListener("pointercancel", onUp);
  drag = null;
}

function springBack(card){
  card.classList.add("ck-card--settling");
  card.style.transform = "translateX(0) rotate(0deg)";
  const swipe = card.parentElement;
  swipe.querySelectorAll(".ck-reveal").forEach(r => r.style.opacity = 0);
  setTimeout(() => card.classList.remove("ck-card--settling"), 320);
}

function flyOut(kind){
  const card = listEl.querySelector(".ck-card");
  if (!card || busy) return;
  busy = true;

  const dir   = kind === "good" ? 1 : -1;
  const swipe = card.parentElement;
  swipe.querySelector(`[data-reveal="${kind}"]`).style.opacity = 1;
  swipe.querySelector(`[data-reveal="${kind === "good" ? "faulty" : "good"}"]`).style.opacity = 0;

  card.classList.remove("ck-card--settling");
  card.classList.add("ck-card--flying");
  card.style.transform = `translateX(${dir * (card.offsetWidth + 120)}px) rotate(${dir * 12}deg)`;
  card.style.opacity = "0";

  /* Let the confirmation sit long enough to be read, then resolve. */
  setTimeout(() => {
    if (kind === "good") settle("good");
    else openSheet(activeIndex, "mark", "faulty");
  }, 400);
}

/* Commit the outcome, collapse this item and open the next pending one. */
function settle(status, reasons){
  const part = PARTS[activeIndex];
  part.status = status;
  part.reasons_selected = reasons || [];

  /* A part marked faulty here IS a mechanical issue, and the Issues screen is
     where those live — one record seen from several screens rather than a second
     copy that drifts.

     Judging good only withdraws what THIS checklist filed. It is the way back from
     a mis-swipe, and nothing more: the Issues screen carries rows other people
     filed against parts this list also checks, and a mechanic ticking "Front wheel
     — check for wobble" was not asking to delete John Doe's damage report on the
     same wheel. Without FILED that is exactly what happened.

     Skipping files nothing either way: it is not a verdict, so there is no claim to
     record and nothing to withdraw. */
  if (status === "faulty"){
    FILED.add(part.name);
    applyMarkedIssues([{
      name: part.name, reasons: (reasons || []).slice(),
      catalogue: part.reasons.slice(), photoSrc: photoDataURL(part),
    }]);
  } else if (status === "good" && FILED.has(part.name)){
    FILED.delete(part.name);
    applyMarkedIssues([{name: part.name, reasons: []}]);
  }

  /* Advance within the open tab only. Jumping to a pending part in the other
     checklist would switch the list out from under the mechanic mid-swipe; when
     this one runs out the card simply closes and the tabs show what is left. */
  const next = PARTS.findIndex((p,i) =>
    i > activeIndex && p.section === activeSection && p.status === "pending");
  activeIndex = next !== -1 ? next : firstPending(activeSection);   /* wrap within the tab */

  busy = false;
  render();
  if (activeIndex !== -1) revealActive("smooth");
}

/* Restore the card when the mechanic backs out of the reason sheet. */
function cancelOutcome(){
  busy = false;
  render();
  revealActive();
}

/* ═══════════════════════════════════════════════════════════════════════════
   PART SHEET
   One sheet does two jobs: it collects the reasons when a part is swiped
   faulty, and it re-opens later to change any call already made. The Good /
   Faulty toggle lives in its header, so a part can be re-judged in place.

   Reasons multi-select among themselves. "Missing" is mutually exclusive with
   every reason, enforced by *switching* rather than locking both directions.
   Figma greys "Missing" out once any reason is picked, but taken literally
   that is a dead end: a mechanic who taps "Cuts", then finds the part is
   actually gone, cannot reach "Missing" without first clearing every reason.
   So "Missing" always stays tappable and takes over when tapped; the reasons
   grey out while it is active and are one tap away again. Same rule, no trap.
   ═══════════════════════════════════════════════════════════════════════════ */
const sheetThumb  = document.getElementById("ckSheetThumb");
const sheetNameEl = document.getElementById("ckSheetName");
const collapseEl  = document.getElementById("ckSheetCollapse");

/* {index, mode:'mark'|'edit', mark:'good'|'faulty', picked:Set} */
let sheetState = null;

/* One job now: pick the issues on a part the mechanic has just called faulty.
   `mode` and `mark` are gone with the toggle — every opening is a fresh mark and
   the verdict is always faulty, because Faulty is the only thing that opens it.
   Reasons already recorded come back pre-selected, so pressing Faulty again on a
   part you marked earlier edits that call rather than starting from nothing. */
function openSheet(index){
  const part = PARTS[index];
  sheetState = {index, picked: new Set(part.reasons_selected || [])};

  sheetThumb.setAttribute("style", thumbStyle(part));
  sheetThumb.innerHTML = part.photo ? "" : ICON.noPhoto(24);
  sheetNameEl.textContent = part.name;

  const chip = r => `<button type="button" class="ck-chip" data-reason="${esc(r)}">${esc(r)}</button>`;
  chipsEl.innerHTML = part.reasons.concat(MISSING).map(chip).join("");

  /* Settle the collapsed region before the sheet slides up, otherwise the
     good state visibly folds shut on the way in. */
  collapseEl.classList.add("ck-no-anim");
  paintSheet();
  collapseEl.offsetHeight;                       /* flush the layout */
  requestAnimationFrame(() => collapseEl.classList.remove("ck-no-anim"));

  scrimEl.classList.add("ck-is-open");
  sheetEl.classList.add("ck-is-open");
}

function closeSheet(committed){
  scrimEl.classList.remove("ck-is-open");
  sheetEl.classList.remove("ck-is-open");
  sheetEl.style.transform = "";
  sheetState = null;
  /* Backing out undoes the press that opened the sheet — the card comes back and
     the part is left as it was. Marking faulty without saying what is wrong is not
     a state this screen holds. */
  if (!committed) setTimeout(cancelOutcome, 220);
}

function paintSheet(){
  if (!sheetState) return;
  const {picked} = sheetState;

  /* The issues block is always open now: there is no good state to fold it away
     for. Kept as a class rather than deleted so the sheet's entry animation is
     unchanged. */
  collapseEl.classList.remove("ck-is-collapsed");
  collapseEl.setAttribute("aria-hidden", "false");

  /* Nothing is ever disabled: every chip stays tappable and simply takes over
     from the other side. Tapping a reason drops "Missing"; tapping "Missing"
     drops the reasons. Symmetric, and no state you can get stranded in. */
  chipsEl.querySelectorAll(".ck-chip").forEach(c => {
    c.classList.toggle("ck-is-selected", picked.has(c.dataset.reason));
    c.disabled = false;
  });

  confirmBtn.disabled = picked.size === 0;
}

function toggleReason(value){
  const picked = sheetState.picked;
  if (value === MISSING){
    sheetState.picked = picked.has(MISSING) ? new Set() : new Set([MISSING]);
  } else {
    picked.delete(MISSING);                 /* a reason rules Missing out */
    picked.has(value) ? picked.delete(value) : picked.add(value);
  }
  paintSheet();
}

sheetEl.addEventListener("click", e => {
  if (!sheetState) return;
  const chip = e.target.closest(".ck-chip");
  if (chip && !chip.disabled) toggleReason(chip.dataset.reason);
});

confirmBtn.addEventListener("click", () => {
  const {picked} = sheetState;
  const reasons = [...picked];
  closeSheet(true);
  setTimeout(() => settle("faulty", reasons), 220);
});

scrimEl.addEventListener("click", () => closeSheet(false));

/* Any row can be opened at any time — the flow suggests an order, it does not
   impose one. Every row opens the same way now, judged or not: it becomes the
   expanded card. A finished part used to jump straight into the reason sheet,
   which meant you could not simply look at it again — opening it was already
   halfway to changing it. From the card the mechanic can leave it alone, or press
   Faulty or Done again and the usual outcome follows. Sagar's call. */
listEl.addEventListener("click", e => {
  if (busy || sheetState) return;
  const row = e.target.closest("[data-index]");
  if (!row) return;
  activeIndex = Number(row.dataset.index);
  render();
  revealActive("smooth");
});

/* Drag the grabber down to dismiss. */
(() => {
  const zone = document.getElementById("ckSheetGrab");
  let d = null;
  zone.addEventListener("pointerdown", e => {
    d = {y0:e.clientY, dy:0};
    zone.setPointerCapture(e.pointerId);
    sheetEl.classList.add("ck-sheet--dragging");
  });
  zone.addEventListener("pointermove", e => {
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    sheetEl.style.transform = `translateY(${d.dy}px)`;
  });
  const end = () => {
    if (!d) return;
    const far = d.dy > 80; d = null;
    sheetEl.classList.remove("ck-sheet--dragging");
    if (far) closeSheet(false);
    else sheetEl.style.transform = "translateY(0)";
  };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);
})();

/* ── FEEDBACK 1: the heading migrates into the header ─────────────────────── */
/* Copied from bike-assessment. The bike number never leaves the app bar; the
   screen name fades in only once the big heading has scrolled up past it, so
   the title is never on screen twice. The 16px lead-in makes the swap land just
   before the last of the heading clears the bar. */
/* Scoped to this screen, not the document. Every screen in this flow has an
   .appbar and a .ck-footer would have been unique, but .appbar is not — a bare
   document.querySelector(".appbar") returned the HOME screen's bar, and the
   suffix lookup under it came back null, which threw inside paintTabs() and took
   the rest of the bundle's scripts down with it. */
const screenEl  = document.getElementById("scrChecks");
const appbarEl  = screenEl.querySelector(".appbar");


/* ── Header collapse ──────────────────────────────────────────────────────────
   Scroll down and the app bar row folds away; scroll back up and it returns.

   Direction, not absolute position: the bar comes back the moment you head
   upward, rather than making you scroll all the way to the top for it. The
   accumulator resets whenever the direction flips, so it takes 8px of committed
   movement one way — not 8px of net drift — and a jittery finger cannot flap it.
   Same rule and same threshold as Add issues in the flow. */
const SCROLL_THRESHOLD = 8;
let scrolled = false, sLastY = 0, sAccum = 0;
/* The build ships the pre-rendered DOM, and the pre-render can leave the bar
   folded. `scrolled` starts false, so the class has to start that way too or
   setScrolled(false) no-ops and the bar never comes back. */
screenEl.classList.remove("ck-is-scrolled");

function setScrolled(next){
  if (next === scrolled) return;
  scrolled = next;
  screenEl.classList.toggle("ck-is-scrolled", scrolled);
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

/* ── Footer reveal ────────────────────────────────────────────────────────── */
/* Direction-based, like the scan button on the task list: any downward scroll
   sends the footer away, any upward scroll brings it back — mid-list, not only
   at the top. Once the checklist is complete it stays put regardless, because
   Next is then the only thing left to do and hiding it would be perverse.

   Releasing the list's bottom inset grows its viewport, which makes the browser
   clamp scrollTop when you are near the bottom. That clamp looks exactly like an
   upward scroll and would flip the footer straight back, oscillating — so
   deltas are absorbed while the transition runs. */
const footerEl = screenEl.querySelector(".ck-footer");
const FOOTER_THRESHOLD = 8;
const FOOTER_ANIM_MS = 260;

let fLastY = 0, fAccum = 0, footerShown = true, fBanding = false, fTimer = 0;

function allDone(){
  return PARTS.every(judged);
}

const sectionDone = sec => PARTS.filter(p => p.section === sec).every(judged);

/* The list Next should hand over to, or null when there is none. The search runs
   forward from the open tab and wraps, so the checklists can be finished in
   either order: from the last one Next comes back round to whichever earlier list
   is still owed. */
function nextSection(){
  const from = SECTIONS.indexOf(activeSection);
  for (let n = 1; n <= SECTIONS.length; n++){
    const sec = SECTIONS[(from + n) % SECTIONS.length];
    if (!sectionDone(sec)) return sec;
  }
  return null;
}

/* "done" | "next" | null.

   Done outranks Next and is deliberately not tied to the open tab: once every
   part in every list is judged, the button reads Done on both tabs, because the
   task is over whichever list you happen to be looking at.

   Next is the in-between state — this list is finished, another is not — and it
   is the only thing the mechanic can usefully do from a completed tab, so it
   takes the same slot rather than sitting next to Done. */
function footerMode(){
  if (allDone()) return "done";
  if (sectionDone(activeSection) && nextSection()) return "next";
  return null;
}

const doneBtn = document.getElementById("ckDoneBtn");

/* The footer is no longer scroll-driven. It holds one button, and that button has
   no meaning until the list on screen is finished — so the footer is purely a
   function of completion: absent through the work, then it arrives. The scroll
   handler still calls this; the first line makes those calls a no-op. */
function showFooter(){
  const mode = footerMode();
  /* Label first, and before the early return: the mode can go from next to done
     without the footer ever leaving, and the return below would skip it. */
  /* "next" here means the next section of THIS checklist. "done" means the
     checklist is finished — at which point the word depends on the rest of the
     repair, not on this screen: Next while mechanical or electrical issues are
     still open, Done only when nothing is. See shared/open-tasks.js. */
  if (mode) doneBtn.textContent =
    mode === "next" ? "Next" : endOfTaskCTA("checks").label;
  const visible = mode !== null;
  if (visible === footerShown) return;
  footerShown = visible;
  footerEl.classList.toggle("ck-is-hidden", !visible);
  scrollEl.classList.toggle("ck-footer-hidden", !visible);

  fBanding = true;
  fAccum = 0;
  clearTimeout(fTimer);
  /* A timer rather than transitionend: transitionend does not fire when the
     value is already at its target, which would strand fBanding at true. */
  fTimer = setTimeout(() => { fBanding = false; fLastY = scrollEl.scrollTop; },
                      FOOTER_ANIM_MS + 40);
}

function onFooterScroll(){
  const y = scrollEl.scrollTop;
  const delta = y - fLastY;
  fLastY = y;
  if (delta === 0) return;
  if (fBanding) return;                 // resize-induced, not the user's finger

  if ((delta > 0) !== (fAccum > 0)) fAccum = 0;   // direction flipped
  fAccum += delta;

  if (fAccum > FOOTER_THRESHOLD)       { showFooter(); fAccum = 0; }
  else if (fAccum < -FOOTER_THRESHOLD) { showFooter(); fAccum = 0; }

  if (y <= 0) showFooter();             // always present at the very top
}
scrollEl.addEventListener("scroll", onFooterScroll, {passive:true});


document.getElementById("ckBackBtn").addEventListener("click", () => window.YuzenCK.onBack());
/* One button, two jobs — see footerMode(). Next hands over to the list that still
   owes work. Done is the way out of a finished checklist, and the way out is back
   to the dashboard the Checks card launched it from — same destination as Back,
   because there is nowhere else this screen leads yet. */
doneBtn.addEventListener("click", () => {
  if (busy || sheetState) return;
  if (footerMode() === "next"){
    const sec = nextSection();
    if (sec) selectSection(sec);
    return;
  }
  /* The checklist is finished. Carry on to whatever is still open rather than
     returning to the dashboard for the mechanic to pick it themselves. */
  endOfTaskCTA("checks").go();
});

/* ═══════════════════════════════════════════════════════════════════════════ */
render();
revealActive();

document.getElementById("ckCmdBtn").addEventListener("click", () => setCommandsSheet(true));

  enterChecks = function(){
    /* Repaint on entry so the heading's count is current. */
    const h = listEl.querySelector(".ck-heading");
    if (h) h.outerHTML = headingHTML();
  };

  /* Parts, not checklists. The dashboard card said 0/2 and 2 is the number of
     TABS in here — but a tab is a list, and the thing a mechanic finishes is a
     row on it. 8 rows, so the card counts the same units the tabs do.

     judged, not "not pending": a skipped part is still owed, which is the same
     rule the tab counters use. */
  checksTally = function(){
    return {done: PARTS.filter(judged).length, total: PARTS.length};
  };
})();
