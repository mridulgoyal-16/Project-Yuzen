/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN 2 — Mark faults
   Only the parts marked faulty on screen 1, one expanded at a time.
   ═══════════════════════════════════════════════════════════════════════════ */
const fscrollEl    = document.getElementById("fscroll");
const flistEl      = document.getElementById("flist");
const femptyEl     = document.getElementById("fempty");
const ffooterEl    = document.getElementById("ffooter");
const faultsNextEl = document.getElementById("faultsNext");
const faultsHeadEl = document.getElementById("faultsHead");
const faultsAppbar = document.getElementById("faultsAppbar");

/* Same hand-off as the checklist: the large title scrolls up and the app bar
   completes the breadcrumb behind it. */
/* Measured once, not read live: the block's height animates to 0 when the
   carousel opens, and a mid-transition reading would make the threshold jitter. */
let faultsHeadH = 0;

function syncFaultsHeading(){
  const open = document.getElementById("carousel").classList.contains("is-open");
  /* Learned only while the block is actually standing. It used to be measured on
     the first call whatever the page was doing, and with the photographs opening
     on arrival that call can land on a block already collapsed to 0 — which set
     the threshold to -16, made `past` true at scrollTop 0, and pinned the app bar
     collapsed for the rest of the session. The `|| 64` fallback was no help: 0 is
     falsy, so it re-measured 0 every time. */
  if (!open && faultsHeadEl.offsetHeight) faultsHeadH = faultsHeadEl.offsetHeight;
  const past = open || fscrollEl.scrollTop > (faultsHeadH || 64) - 16;
  faultsAppbar.classList.toggle("is-collapsed", past);
  faultsHeadEl.querySelector("h2").setAttribute("aria-hidden", String(past));
  faultsAppbar.querySelector(".appbar__suffix").setAttribute("aria-hidden", String(!past));
}
fscrollEl.addEventListener("scroll", syncFaultsHeading, {passive:true});

const faultyParts = () => PARTS.filter(p => p.status === "faulty");
/* The penalty alone. Damage used to be the second half of this test, which meant
   a part could carry a judgement and still read as unfinished — the screen asks
   one question now, so answering it is what finishes the part. */
const isDetailed  = p => p.penalty !== null;
const subtextFor  = p => PENALTY_LABEL[p.penalty];

/* Parts whose tick has already animated in, so it does not re-pop on every
   render (adding a photo re-renders the whole list). */
const tickSeen = new Set();

function fchip(label, value, group, id, on){
  return `<button type="button" class="fchip t-label-md" data-fact="set"
            data-group="${group}" data-id="${id}" data-value="${value}"
            aria-pressed="${on}">${label}</button>`;
}

function fphotosHTML(part){
  const thumbs = part.photos.map((src,i) => `
    <div class="fphoto" ${src.startsWith("--") ? `style="background-image:var(${src})"` : ""}>
      ${src.startsWith("--") ? "" : `<img src="${src}" alt="Photo ${i+1} of ${esc(part.name)}">`}
      <button class="fphoto__x" data-fact="unphoto" data-id="${part.id}" data-index="${i}"
              aria-label="Remove photo ${i+1}">&times;</button>
    </div>`).join("");
  const add = part.photos.length < CONFIG.MAX_PHOTOS ? `
    <button class="fadd" data-fact="photo" data-id="${part.id}" aria-label="Add photo">
      ${ICON.addPhoto}
    </button>` : "";
  return thumbs + add;
}

function faultItemHTML(part){
  const open = !collapsedFaults.has(part.id);
  const done = isDetailed(part);
  const sub  = (!open && done) ? `<p class="t-body-sm frow__sub">${esc(subtextFor(part))}</p>` : "";

  return `
  <section class="fitem${open ? " is-open" : ""}" data-id="${part.id}">
    <div class="fitem__inner">
      <div class="fpad">
        <button class="frow" data-fact="toggle" data-id="${part.id}" aria-expanded="${open}">
          <span class="frow__lhs">
            ${thumbHTML(part)}
            <span class="frow__text">
              <span class="t-label-md frow__label">${esc(part.name)}</span>
              ${sub}
            </span>
          </span>
          <span class="frow__end">
            ${ICON.fstatus(done, done && !tickSeen.has(part.id))}
          </span>
        </button>

        <div class="fdetails">
          <div>
            <div class="fdetails__body">
              <!-- The chips, with no "Penalty:" over them. The page is called Mark
                   penalties and No / Minor / Major say what they are, so the label
                   was a caption on the only question on the card. The Damage block
                   that used to follow is gone entirely — see the note on PENALTY. -->
              <div class="fchips">
                ${PENALTY.map(o => fchip(o.label, o.value, "penalty", part.id, part.penalty === o.value)).join("")}
              </div>
              ${part.penalty === "minor" || part.penalty === "major" ? `
              <div class="fphotos-row">
                <p class="t-label-md">Photos:</p>
                <div class="fphotos">${fphotosHTML(part)}</div>
              </div>` : ""}
            </div>
          </div>
        </div>
      </div>
      <div class="ftail"></div>
    </div>
    <div class="fdivider"></div>
  </section>`;
}

/* Every faulty part arrives expanded — the whole job is visible at once, rather
   than one row at a time with the rest hidden behind taps. Rows fold away as they
   are finished and the mechanic moves on; see the toggle handler. */
/* The customer's photographs are open when this screen arrives. They are the
   evidence the penalty is being judged against, so hiding them behind a tap made
   the first thing a QCA has to do here be "go and find the photos" — Sagar's
   call.

   On EVERY arrival, not just the first. A first-time-only version was tried and
   is worse in two ways: which state the screen opens in then depends on whether
   you have been here before in this session, and the one route back in is from
   the checklist — where you went to change a verdict, which is exactly when you
   want another look at the evidence. The cost is that closing them does not
   survive a trip to the checklist and back. That is the right way round. */
function enterFaults(){
  renderFaults();
  /* Re-measured on every entry: the pill's resting offset depends on the app
     bar's layout, and the screen is off-canvas until now — measuring at load
     would read a rect that has not been laid out yet.

     BEFORE the carousel opens, and that order is load-bearing. Opening it
     collapses the title, so measuring after would read the pill's drop against a
     title that has already given up its height — which put the pill 69px off the
     line the moment it is closed again. Measure the uncollapsed layout, then
     open. */
  setCarousel(true);
}

function renderFaults(){
  const parts = faultyParts();

  /* A part flipped back to good on screen 1 leaves the list; drop it from the
     fold set too, or it would arrive collapsed if it is ever marked faulty
     again. Every id in the set must name a row that exists. */
  const live = new Set(parts.map(p => p.id));
  [...collapsedFaults].forEach(id => { if (!live.has(id)) collapsedFaults.delete(id); });

  const scroll = fscrollEl.scrollTop;
  flistEl.innerHTML = parts.map(faultItemHTML).join("");
  fscrollEl.scrollTop = scroll;
  parts.forEach(p => isDetailed(p) ? tickSeen.add(p.id) : tickSeen.delete(p.id));

  const empty = parts.length === 0;
  femptyEl.hidden = !empty;
  fscrollEl.style.display = empty ? "none" : "";
  syncFaultsHeading();
  /* Every fault judged, or none to judge. The label is read fresh each time
     because the next step moves as the QCA works — see RnM.nextStepLabel. */
  paintStepTabs(document.getElementById("faultsTabs"), "penalty");
  faultsNextEl.querySelector("span").textContent = RnM.nextStepLabel();
  paintStepBanner(document.getElementById("faultsBanner"), "penalty");
  ffooterEl.classList.toggle("is-shown", empty || parts.every(isDetailed));
}


function nextUndetailedAfter(id){
  const parts = faultyParts();
  const i = parts.findIndex(p => p.id === id);
  for (let n = 1; n <= parts.length; n++){
    const cand = parts[(i + n) % parts.length];
    if (!isDetailed(cand)) return cand.id;
  }
  return null;
}

fscrollEl.addEventListener("click", e => {
  const el = e.target.closest("[data-fact]");
  if (!el) return;
  const {fact, id} = el.dataset;
  const part = PARTS.find(p => p.id === id);

  if (fact === "toggle"){
    /* Tapping a row tidies the list: every OTHER part that is already finished
       folds away, so what stays open is what still needs doing. The row you
       tapped opens — unless it is finished and already open, in which case you
       are folding it deliberately. */
    const wasOpen = !collapsedFaults.has(id);
    faultyParts().forEach(p => { if (p.id !== id && isDetailed(p)) collapsedFaults.add(p.id); });
    if (wasOpen && isDetailed(part)) collapsedFaults.add(id);
    else collapsedFaults.delete(id);
    renderFaults();
    return;
  }
  if (fact === "set"){
    const {group, value} = el.dataset;
    part[group] = part[group] === value ? null : value;         /* tap again to clear */
    /* Photos only exist to evidence a penalty, so dropping to No (or clearing)
       takes the row away — and any shots already on it, or the summary would keep
       counting evidence for a charge that is no longer being made. */
    if (group === "penalty" && part.penalty !== "minor" && part.penalty !== "major")
      part.photos.length = 0;
    const justDone = isDetailed(part);
    renderFaults();
    if (CONFIG.AUTO_ADVANCE && justDone){
      const next = nextUndetailedAfter(id);
      if (next) setTimeout(() => {
        collapsedFaults.add(id); collapsedFaults.delete(next); renderFaults();
      }, 260);
    }
    return;
  }
  if (fact === "photo"){ capturePhoto(part); return; }
  if (fact === "unphoto"){
    part.photos.splice(Number(el.dataset.index), 1);
    renderFaults();
  }
});

/* THE DASHBOARD, whichever door was used. Mark penalties has two — the end of
   the checklist, and the dashboard's own Penalty row — and for one build the
   back arrow remembered which, so the checklist's door led back to the
   checklist. That is gone: the dashboard is now a sequence of five steps and
   this is one of them, so backing out of a step returns to the list of steps
   rather than to whatever screen happened to hand over. Sagar's rule, and it
   holds on every screen in this flow: assess, issues, checklists and here. */
document.getElementById("faultsBack").addEventListener("click", () => goTo("rnm"));

/* On to the next outstanding step, or off the job if there is none. A "Done"
   button stood here once: it went where the back arrow went and closed nothing,
   which is why it was taken off. This one moves the assessment along. */
faultsNextEl.addEventListener("click", () => { RnM.advance(); });

