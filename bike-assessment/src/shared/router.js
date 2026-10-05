/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN ROUTER
   ═══════════════════════════════════════════════════════════════════════════ */
/* start → assess → faults. Screens sit in order, so a screen behind the
   current one parks to the left and one ahead parks to the right — the
   direction of travel falls out of the index rather than being passed in. */
/* `token` sits directly beside `job` because they ARE the same element. An alias
   split across the list puts one copy of the screen behind a page and the other
   ahead of it, and the later iteration wins — which parked the task page off to
   the right the moment it opened Feedback, exactly the movement the transition is
   supposed to have removed. Keep aliases adjacent. */
const ORDER   = ["home", "shift", "task", "assessdone", "qc", "repair", "allocation", "allocated", "tokens", "job", "token", "feedback", "complaint", "rnm", "checklists", "visit", "checks", "issues", "markissues", "start", "assess", "faults", "alloc", "alloctime"];
const SCREENS = {
  home:   document.getElementById("scrHome"),
  /* Three routes, one element. The task listings are all the same page — see
     screens/queue. The route name survives because it is also the queue's key in
     QUEUE_KINDS, and because SHEET_FOR keys off the route. */
  task:   document.getElementById("scrQueue"),
  repair: document.getElementById("scrQueue"),
  tokens: document.getElementById("scrTokens"),
  job:    document.getElementById("scrJob"),
  feedback: document.getElementById("scrFeedback"),
  rnm:    document.getElementById("scrRnm"),
  /* The picker, not the parts — see screens/checklists. It sits beside rnm in
     ORDER because that is the only place it is opened from and the only place
     it returns to. */
  checklists: document.getElementById("scrChecklists"),
  /* One repair, a level under the Bike Info tab. Beside rnm for the same
     reason the picker is: opened from there, returns there. */
  visit:      document.getElementById("scrVisit"),
  issues:     document.getElementById("scrIssues"),
  markissues: document.getElementById("scrMarkIssues"),
  checks:     document.getElementById("scrChecks"),
  /* The token detail page IS the task detail page — `token` is a kind of task,
     not a screen of its own. The route name survives because the token queue's
     stitching contract calls goTo('token'), and because SHEET_FOR keys off the
     route: a captain's \u22ee offers Call user and Skip, a mechanic's does not. */
  token:      document.getElementById("scrJob"),
  complaint:  document.getElementById("scrComplaint"),
  shift:      document.getElementById("scrShift"),
  qc:         document.getElementById("scrQueue"),
  /* Two more listings on the same element — see the note on `task` above. */
  assessdone: document.getElementById("scrQueue"),
  allocation: document.getElementById("scrQueue"),
  allocated:  document.getElementById("scrQueue"),
  start:  document.getElementById("scrStart"),
  assess: document.getElementById("scrAssess"),
  faults: document.getElementById("scrFaults"),
  alloc:  document.getElementById("scrAlloc"),
  alloctime: document.getElementById("scrAllocTime"),
};
let current = "home";

/* The assessment's step CTA, borrowed by four screens. It lives in the RnM
   dashboard — that is where ASSESS_FLOW and the visited set are — and this is
   the shim, for one reason: two of the four screens (the checklist and the
   picker) are loaded BEFORE screens/rnm/script.js and paint themselves once at
   load, so a bare window.RnM.nextStepLabel() throws before the dashboard exists.
   The label is repainted on every entry, so the fallback is never seen. */
const stepLabel = () => window.RnM ? window.RnM.nextStepLabel() : "Next";

/* The same navigation with the screen transition suppressed. Used where two
   screens are two TABS of one thing — Assessment / Penalties — and sliding one
   over the other says they are separate pages, which is the opposite of what
   the strip above them claims.

   Two frames, not one: the class has to survive the layout pass that goTo's
   class and data-pos changes trigger, or the browser has already started the
   transition by the time it comes off. */
function goToInstant(name){
  const phone = document.getElementById("phone");
  phone.classList.add("no-screen-anim");
  goTo(name);
  requestAnimationFrame(() => requestAnimationFrame(() =>
    phone.classList.remove("no-screen-anim")));
}

function goTo(name){
  if (name === current || !SCREENS[name]) return;
  current = name;
  const to = ORDER.indexOf(name);
  /* Two routes can share one element (job / token). Resolve each element to a
     single state, preferring the one being navigated to — otherwise whichever
     route came last in ORDER would win and the shared screen would slide off
     the moment you opened it under its other name. */
  const claimed = new Set();
  ORDER.forEach((key, i) => {
    const el = SCREENS[key];
    if (i !== to && SCREENS[name] === el) return;   /* the active route owns it */
    if (i === to) claimed.add(el);
    el.classList.toggle("is-active", i === to);
    el.dataset.pos = i === to ? "in" : (i < to ? "left" : "right");
    el.setAttribute("aria-hidden", String(i !== to));
  });
  if (name === "faults") enterFaults();
  if (name === "tokens") enterTokens();
  /* The three bike queues are one screen; the route name says which. */
  if (QUEUE_KINDS[name]) enterQueue(name);
  if (name === "rnm")    enterRnm();
  if (name === "issues")     enterIssues();
  if (name === "markissues") enterMarkIssues();
  if (name === "checks")     enterChecks();
  if (name === "checklists") enterChecklists();
  /* The checklist repaints on arrival for one reason: its CTA names whichever
     step is still outstanding, and that moves while the QCA is off this screen.
     Nothing used to bring them back here mid-flow, so a stale label was never
     visible; the step CTA made it possible. */
  if (name === "assess")     enterAssess();
  /* enterToken takes the tapped row; goTo() passes nothing, which keeps
     whatever token was last opened. */
  if (name === "token")      enterToken();
  if (name === "job")        enterJobKind(null);
  if (name === "complaint")  enterComplaint();
  if (name === "shift")      enterShift();
  if (name === "home")       enterHome();
}

