/* ═══════════════════════════════════════════════════════════════════════════
   HOME + TASK
   Only the Assessment pending card is wired; the rest report and stop, the same way
   the task list upstream does.
   ═══════════════════════════════════════════════════════════════════════════ */
document.getElementById("hmTasks").addEventListener("click", e => {
  const b = e.target.closest("[data-task]");
  if (!b) return;
  if (b.dataset.task === "assessment") goTo("task");
  else if (b.dataset.task === "repairable") goTo("repair");
  else if (b.dataset.task === "tokens") goTo("tokens");
  else if (b.dataset.task === "qc") goTo("qc");
  else if (b.dataset.task === "assessdone") goTo("assessdone");
  else if (b.dataset.task === "allocation") goTo("allocation");
  else if (b.dataset.task === "allocated") goTo("allocated");
  else toast(b.querySelector(".l").textContent + " — not wired yet");
});
document.getElementById("hmShortcuts").addEventListener("click", e => {
  const b = e.target.closest("[data-sc]");
  if (b) toast(b.dataset.sc + " — not wired yet");
});
document.getElementById("hmViewAll").addEventListener("click", () => toast("All workbench shortcuts — not wired yet"));
document.querySelector(".hmnav").addEventListener("click", e => {
  const b = e.target.closest("[data-nav]");
  if (b && b.dataset.nav !== "home") toast(b.textContent.trim() + " — not wired yet");
});

/* The listing's back button belongs to the listing template now — see
   screens/queue/script.js. It used to be bound here because the assessment queue
   was the only list there was. */



/* The shift bar opens the shift page — duty and profile are set in one place. */
document.getElementById("hmShift").addEventListener("click", () => goTo("shift"));

/* Called by the router. The blocks follow whatever profile is on record, so
   arriving here after an Update — or on first load — shows the right set. */
function enterHome(){
  paintHomeBlocks();
  paintShiftTag();
}

/* Which blocks each profile is shown. A captain has no business in a QC queue and
   a mechanic none in a token queue, so the home screen is the role rather than a
   menu of everything with the irrelevant parts greyed. Sagar's mapping. */
const HM_FOR_ROLE = {
  "Mechanic":          ["repairable"],
  /* Allocation, and nothing else. A Sr. Mechanic is not a Mechanic with an extra
     card — the repairs are what they hand out, so Repairable bikes belongs to the
     person doing them and would be a second, contradictory way into the same
     work from here. The two cards are one number split in two. */
  "Sr. Mechanic":      ["allocation", "allocated"],
  "Captain":           ["tokens", "dropped"],
  "Quality Associate": ["assessment", "qc", "rtd"],
};

/* The two counts that MOVE. Every other card on this screen states a fixture and
   can go on stating it, but these two are one fleet split in two — a bike signed
   off leaves the first and joins the second — and a card that went on saying 16
   while the queue behind it held 15 would make the move look like it had not
   happened. Read from the arrays rather than stored, so there is one number. */
const HM_COUNT = {
  assessment: () => FLEET.length,
  assessdone: () => DONE.length,
  allocation: () => ALLOC_ALL().filter(b => !b.allocated).length,
  allocated:  () => ALLOC.length,
  /* x/y pending, not a bare total: a mechanic's card should say how much is
     LEFT, and their whole day's allocation is the denominator. Read off the
     same allocations the Sr. Mechanic's board shows — see ME in fleets.js. */
  repairable: () => `${allocPending(ME)}/${allocTotal(ME)} pending`,
};

/* What the block section is called, per role. Everyone gets "My Tasks" — a list
   of what is waiting for you — except the Sr. Mechanic, whose two blocks are the
   two halves of one yard rather than two jobs of their own. */
const HM_HEADING = {
  "Sr. Mechanic": "Repairable bikes Zone",
};

function paintHomeBlocks(){
  const allowed = HM_FOR_ROLE[SHIFT.role] || [];
  document.getElementById("hmHeading").textContent =
    HM_HEADING[SHIFT.role] || "My Tasks";
  document.getElementById("hmRole").textContent = SHIFT.role;
  document.querySelectorAll("#scrHome .hm__task").forEach(b => {
    b.hidden = !allowed.includes(b.dataset.task);
    const n = HM_COUNT[b.dataset.task];
    if (n) b.querySelector(".n").textContent = n();
  });
  paintHomePeek();
}

/* ── The workbench peek ──────────────────────────────────────────────────────
   The first row of shortcut icons is meant to rest bisected by the bottom edge
   of the scroller, so it reads as "the page carries on behind the nav" rather
   than as a row that happens to have been cut off. The README's open question
   about buying that peek back — see the note above .hm__gap — is what this
   answers.

   Computed rather than a constant, because the spacer that produces it depends
   on how many task cards the profile has. A Mechanic and a Captain both fit one
   row of cards and need 336; a Quality Associate's three wrap to a second row
   and need 152. One number tuned for the Mechanic would push the QA's shortcuts
   past the bottom of the scroller entirely — no peek at all, which is the
   opposite of what it is for. Any profile added later is handled without anyone
   re-measuring.

   Everything above the spacer is untouched, so the shift bar keeps its measured
   60, and the 36 between the task grid and the workbench heading is untouched
   below it, so the two blocks travel together. */
const HM_GAP_BASE = 72;   /* the floor, and the spacing the frame draws */
const HM_PEEK     = 24;   /* half of the 48px icon, left showing */

function paintHomePeek(){
  const gap  = document.querySelector("#scrHome .hm__gap");
  const body = document.getElementById("hmbody");
  const icon = document.querySelector("#hmShortcuts .hm__sc i");
  if (!gap || !body || !icon) return;

  /* Back to the base before measuring. Without this the second run measures a
     position that already contains the first run's answer, and the row walks a
     little further down the screen every time home is entered. */
  gap.style.height = HM_GAP_BASE + "px";

  /* In content coordinates, not viewport ones: home may be scrolled from a
     previous visit, and the answer must not depend on where it was left. */
  const top = icon.getBoundingClientRect().top
            - body.getBoundingClientRect().top
            + body.scrollTop;
  const want = body.clientHeight - HM_PEEK;

  gap.style.height = Math.max(HM_GAP_BASE, HM_GAP_BASE + (want - top)) + "px";
}

/* ── Keep the peek honest ────────────────────────────────────────────────────
   paintHomePeek answers "how tall must the spacer be for the icon row to rest
   half-visible at the bottom edge", and the answer depends on the height of the
   scroller. It was computed once, at boot, and never again — so any viewport
   change after that left it stale, and the spacer kept an answer for a screen
   size that no longer existed.

   That is what made the home screen look wrong on first launch and right after a
   refresh: the app opened at one height, the peek was measured against it, and
   the window then settled at another. A reload recomputed against the settled
   size and looked correct. Nothing about the FIRST load was special — only that
   nothing re-measured.

   Three moments can move the answer after boot, so all three re-ask:
     resize  — the toolbar retracting, an app pane settling, rotation
     load    — images decoded, so the blocks above the icons have final heights
     fonts   — Satoshi is font-display:block, and swapping it relayouts the text

   paintHomePeek resets to the base before measuring, so re-running is idempotent
   — it cannot walk the row down the screen on each call. */
addEventListener("resize", paintHomePeek);
addEventListener("load",   paintHomePeek);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintHomePeek);
