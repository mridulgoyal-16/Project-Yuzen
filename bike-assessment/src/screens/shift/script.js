/* ══════════════════════════════════════════════════════════════════════════
   SHIFT STATUS — duty and role

   Two radio groups and one button. The button is the only interesting part:
   it appears when the page differs from what was on record when it opened, and
   goes away again if you undo your way back. That is why the committed values
   live outside the page's own state — SHIFT is the record, shDraft is what is on
   screen, and the difference between them is what Update is for.
   ══════════════════════════════════════════════════════════════════════════ */

/* The record. Home reads it for its shift tag, so it is the one place either
   screen looks.

   Quality Associate, not Mechanic. The app opens on whoever this says, and the
   assessment is what it is built out — a QCA's four cards, their two queues and
   the five-step dashboard. Opening on the Mechanic meant every look at the
   prototype started with a trip through Shift status to get to the flow being
   worked on, and in the field it would put a tester on the wrong home. */
const SHIFT = {duty: "On Duty", role: "Quality Associate"};

const SH_DUTY = ["On Duty", "Off duty"];
/* The roles the app has flows for, by SENIORITY rather than by the order the work
   runs in. It was work order once — captain takes the token, mechanic repairs, QC
   signs off — which reads well as a description of the process and badly as a
   list you pick yourself out of: the person choosing knows their own job title,
   not where it sits in a sequence. Sr. Mechanic is Mechanic plus allocation (see
   HM_FOR_ROLE in home/script.js), so the two stay adjacent either way. */
let SH_ROLES = ["Captain", "Quality Associate", "Sr. Mechanic", "Mechanic"];

/* ONE-PROFILE LINKS. `?role=mechanic` (or sr-mechanic, quality-associate,
   captain) opens the app as that profile and leaves it the only one on offer,
   so a tester handed the Mechanic link cannot wander into another profile's
   flow. The same build serves both — /mechanic/ at the site root just redirects
   here with the parameter — so there is no second copy to keep in step. */
{
  const want = new URLSearchParams(location.search).get("role");
  const role = SH_ROLES.find(r => r.toLowerCase().replace(/[^a-z]+/g, "-")
                                   .replace(/^-|-$/g, "") === want);
  if (role){ SHIFT.role = role; SH_ROLES = [role]; }
}

const SH_TICK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.55 17.1 4.4 11.95l1.32-1.32 3.83 3.83 8.73-8.73 1.32 1.33z" fill="currentColor"/></svg>`;

/* What is on screen. Seeded from the record every time the page opens, so
   backing out without pressing Update leaves nothing behind. */
let shDraft = {...SHIFT};

const shDutyEl   = document.getElementById("shDuty");
const shRoleEl   = document.getElementById("shRole");
const shFooterEl = document.getElementById("shFooter");

function shBuild(el, values, key){
  /* Idempotent: the build ships the PRE-RENDERED DOM, so this runs once in
     headless Chrome and again in the browser. Sixth screen to need this guard. */
  el.querySelectorAll(".sh-opt").forEach(o => o.remove());
  values.forEach(v => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sh-opt";
    b.setAttribute("role", "radio");
    b.dataset.key = key;
    b.dataset.value = v;
    b.innerHTML = `<span class="sh-opt__label">${v}</span>`
                + `<span class="sh-opt__mark">${SH_TICK}</span>`;
    el.appendChild(b);
  });
}

/* Anything on screen differing from the record. Not "has been touched" —
   choosing On Duty when you were already On Duty is not a change, and offering
   Update for it would be offering to do nothing. */
function shChanged(){
  return shDraft.duty !== SHIFT.duty || shDraft.role !== SHIFT.role;
}

function shPaint(){
  document.querySelectorAll("#scrShift .sh-opt").forEach(b => {
    const on = shDraft[b.dataset.key] === b.dataset.value;
    b.setAttribute("aria-checked", String(on));
  });
  shFooterEl.hidden = !shChanged();
}

document.getElementById("scrShift").addEventListener("click", e => {
  const b = e.target.closest(".sh-opt");
  if (!b) return;
  shDraft[b.dataset.key] = b.dataset.value;
  shPaint();
});

document.getElementById("shBack").addEventListener("click", () => goTo("home"));

document.getElementById("shUpdate").addEventListener("click", () => {
  /* Commit, then home. The shift tag there reads SHIFT, so it is already right
     by the time the screen arrives. */
  Object.assign(SHIFT, shDraft);
  paintShiftTag();
  toast(SHIFT.duty === "On Duty"
    ? `On duty as ${SHIFT.role}`
    : "Off duty");
  goTo("home");
});

/* Home's shift bar. Kept here rather than in the home screen because this is the
   screen that owns the record — home only displays it. */
function paintShiftTag(){
  const tag = document.querySelector("#scrHome .hm__tag");
  if (!tag) return;
  tag.textContent = SHIFT.duty;
  /* Off duty is not a positive state, so it does not get the positive fill. */
  tag.classList.toggle("hm__tag--off", SHIFT.duty !== "On Duty");
}

/* Called by the router. The draft resets to the record on every entry, so a
   half-made change abandoned last time does not come back. */
function enterShift(){
  shDraft = {...SHIFT};
  shPaint();
  document.getElementById("shBody").scrollTop = 0;
}

shBuild(shDutyEl, SH_DUTY,  "duty");
shBuild(shRoleEl, SH_ROLES, "role");
shPaint();

/* First paint of the home blocks. It has to happen HERE, not in the home screen's
   own file: home's script runs earlier in the bundle, so calling it there reads
   SHIFT before this const is initialised and throws. And it cannot wait for the
   router either — home is the screen the app opens on, so goTo("home") no-ops and
   enterHome() never fires for the first load. */
paintHomeBlocks();
