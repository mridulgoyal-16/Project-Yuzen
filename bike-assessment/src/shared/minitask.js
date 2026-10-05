
/* ═══════════════════════════════════════════════════════════════════════════
   MINIMISED TASK — Figma 2191:25878
   Minimize parks the task on the listing it came from and drops the mechanic
   back there. Tapping the parked card resumes exactly where they left off.

   One parked task PER KIND, not one overall. An assessment and a repair are two
   different jobs on two different queues, and parking one should not lock the
   other queue — a mechanic who steps away from an assessment to look at a
   repairable bike is doing something ordinary, not something that needs a
   warning. The queues only collide within themselves, so the confirm dialog
   fires only when the parked task and the new one are the same kind.

   The kinds are genuinely independent here because they touch different screens:
   an assessment carries state in the checklist, Mark faults and Bike photos,
   and a repair touches none of them.
   ═══════════════════════════════════════════════════════════════════════════ */
/* kind → {bike:{id,model,battery}, at, step, screen}. One slot each. */
const minimised = {assessment:null, repair:null};

/* Where a parked task of each kind belongs, and what to call it in the dialog. */
const MINI_HOME = {assessment:"task",            repair:"repair"};
const MINI_NOUN = {assessment:"bike assessment", repair:"repairable bike task"};

function minimiseTask(){
  const step = jobSteps()[jobAt];
  /* Where the info is NOW, captured before anything moves. The title block is
     what the ghost flies from — it holds the same two facts the card will. */
  const from = taskMorphRect(document.getElementById("jbTitle"));
  minimised[jobKind] = {
    bike: {id:BIKE.id, model:BIKE.model, battery:BIKE.battery},
    at:   jobAt,
    /* The label is captured now rather than looked up later: it is what the
       mechanic last saw, and the step list is per kind. */
    step: step ? step.label : "Task complete",
    /* Snapshotted, not recomputed on render. jobProgress() reads the live
       PARTS/photos globals, and those belong to whatever task is open now — a
       parked task asked later would report the CURRENT bike's progress. */
    pct:  jobProgress(),
    /* Where they actually were, which is not always the task page — ⋮ is on the
       checklist, Mark faults and Bike photos too. Resuming has to put them back
       mid-swipe, not at the top of the task. */
    screen: current,
  };
  /* A kind with no parked slot has nowhere to fold into, so the chevron simply
     goes back to its list rather than parking into a card that is never drawn. */
  if (!MINI_HOME[jobKind]){
    minimised[jobKind] = null;
    goTo(jobDef().back);
    return;
  }

  goTo(MINI_HOME[jobKind]);
  renderMinis();

  /* The card exists now, so it can be measured. It is held invisible for the
     flight and revealed on landing — see .is-arriving. */
  const card = document.querySelector(`[data-resume="${jobKind}"]`);
  if (card) card.classList.add("is-arriving");
  taskMorph(from, taskMorphRect(card),
        [`${BIKE.id} • ${BIKE.model}`, step ? step.label : "Task complete"],
        () => { if (card) card.classList.remove("is-arriving"); });

  toast("Task minimised — tap it to pick up where you left off");
}

function resumeMinimised(kind){
  const m = minimised[kind];
  if (!m) return;
  /* The card's rectangle, read before renderMinis() takes it off the page. */
  const from = taskMorphRect(document.querySelector(`[data-resume="${kind}"]`));
  minimised[kind] = null;
  BIKE.id = m.bike.id; BIKE.model = m.bike.model; BIKE.battery = m.bike.battery;
  stampBike();
  jobKind = kind; jobAt = m.at;
  renderMinis();
  /* Back to the screen it was minimised from. The screens stay mounted, so the
     part they were on, the rows they had open and their scroll position are all
     still there — nothing has to be restored, only re-shown. */
  goTo(m.screen || "job");

  /* Out to the title block, the reverse of the way in. Only when the task page
     itself is what opened — resuming into the checklist or Mark faults lands on
     a screen with no title block to grow into, and a ghost with nowhere to go is
     worse than none. */
  if (current === "job"){
    taskMorph(from, taskMorphRect(document.getElementById("jbTitle")),
          [`${m.bike.id} • ${m.bike.model}`, m.step], null, "from");
  }
}

/* One slot, on the one listing template. Which parked task shows there is the
   queue's own business — QUEUE_KINDS.mini — so a repair parked on the repairable
   list does not surface on the assessment queue, and QC (which parks nothing)
   shows no band at all. Rendered on every queue render, because switching queue
   changes the answer. */
function renderMinis(){
  const slot = document.getElementById("qMini");
  if (!slot) return;
  /* A tab can refuse the band. The QCA's Transfer done is the case: a task in
     hand belongs to the board being worked, and that board is the other tab —
     see noMini in queue-kinds.js. */
  const def  = typeof queueDef === "function" ? queueDef() : {};
  const sec  = def.sectionsAs === "tabs" && def.sections
                 ? queueActiveSection(def.sections) : null;
  const kind = (sec && sec.noMini) ? null : (def.mini || null);
  /* A PARKED task first, then a task simply IN HAND. The band was only ever
     for something a mechanic minimised; on their own repair list the bike they
     are working on is the same thing — one job, open, reachable from the foot
     of the list — and it should be there whether or not they happened to park
     it. The queue says what that is, because only it knows; see `miniFor`. */
  const m = (kind ? minimised[kind] : null)
         || (kind && typeof def.miniFor === "function" ? def.miniFor() : null);
  slot.hidden = !m;
  /* The list has to give up the height the card occupies, or its last rows end
     up underneath it. */
  slot.closest(".screen").classList.toggle("has-mini", !!m);
  slot.innerHTML = m ? `
    <button class="minitask__card" data-resume="${kind}" style="--pct:${m.pct}%"
            aria-label="Resume ${m.bike.id} ${m.bike.model} — ${m.step}, ${m.pct}% done">
      <span class="minitask__bar" aria-hidden="true"><i></i></span>
      <span class="minitask__text">
        <span class="minitask__line1">${m.bike.id}<span class="model"> &bull; ${m.bike.model}</span></span>
        <span class="minitask__line2 t-label-sm">${m.step}</span>
      </span>
      <span class="minitask__expand" aria-hidden="true">${ICON.expand}</span>
    </button>` : "";
}

document.addEventListener("click", e => {
  const card = e.target.closest("[data-resume]");
  if (!card) return;
  /* A parked task resumes from its slot. A task that is merely in hand has no
     slot to resume from — the queue opens it the way tapping its row would. */
  if (minimised[card.dataset.resume]){ resumeMinimised(card.dataset.resume); return; }
  const def = typeof queueDef === "function" ? queueDef() : {};
  if (typeof def.openMini === "function") def.openMini();
});

/* ── Confirm before abandoning a parked task ───────────────────────────────── */
const dlgEl      = document.getElementById("dlg");
const dlgScrimEl = document.getElementById("dlgScrim");
const dlgBodyEl  = document.getElementById("dlgBody");
let dlgGo   = null;
let dlgKind = null;   /* which slot Discard clears — never both */

function setDialog(open){
  dlgEl.classList.toggle("is-open", open);
  dlgScrimEl.classList.toggle("is-open", open);
  if (!open){ dlgGo = null; dlgKind = null; }
}

/* Returns true when the caller may proceed immediately. Otherwise it opens the
   dialog and calls back on Continue — so a list only has to ask, not decide.

   Scoped to the kind being started: an assessment parked on the assessment queue
   is no reason to refuse a repairable bike. Reopening the SAME bike is a resume,
   not a new task, so it never asks. */
function guardNewTask(kind, bikeId, start){
  const m = minimised[kind];
  if (!m) return true;
  if (m.bike.id === bikeId){ resumeMinimised(kind); return false; }
  dlgBodyEl.innerHTML =
    `You are partway through <strong>${m.bike.id} &bull; ${m.bike.model}</strong>. ` +
    `Starting another ${MINI_NOUN[kind]} discards that progress — ` +
    `only one can be open at a time.`;
  dlgGo   = start;
  dlgKind = kind;
  setDialog(true);
  return false;
}

/* THE SAME DIALOG, for a task that is running rather than parked. A mechanic
   with a bike in hand cannot start another: the app allows exactly one, and the
   choice is the same one the parked-task guard offers — discard what is open,
   or cancel. Same copy, because it is the same rule; the only difference is
   where the conflicting task is sitting.

   The caller supplies what discarding MEANS — parking is undone by clearing a
   slot, and work in hand by putting the bike back to waiting — so this function
   stays the question and never the answer. */
function guardBusyTask(other, noun, start){
  if (!other) return true;
  dlgBodyEl.innerHTML =
    `You are partway through <strong>${other.id} &bull; ${other.model}</strong>. ` +
    `Starting another ${noun} discards that progress — ` +
    `only one can be open at a time.`;
  dlgGo   = start;
  dlgKind = null;      /* nothing parked to clear; the caller does the undoing */
  setDialog(true);
  return false;
}

document.getElementById("dlgCancel").addEventListener("click", () => setDialog(false));
dlgScrimEl.addEventListener("click", () => setDialog(false));
document.getElementById("dlgGo").addEventListener("click", () => {
  const go = dlgGo, kind = dlgKind;
  setDialog(false);
  /* Only the conflicting slot is discarded. A parked task of the other kind is
     none of this dialog's business and stays docked on its own listing. */
  if (kind) minimised[kind] = null;
  renderMinis();
  if (go) go();
});
