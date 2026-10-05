/* ══════════════════════════════════════════════════════════════════════════
   NOTE COMPLAINT — two fields and a keyboard

   The mic is the field's one control and it has three jobs, in this order:
     empty          → mic. Dictate, because there is nothing to commit.
     dictating      → mic, filled. Tap to stop.
     any text in it → tick. Commit what is there and drop the keyboard.

   That is why it is one button rather than a mic beside a send: at any moment
   there is exactly one thing worth doing to the field, and the button is it.
   ══════════════════════════════════════════════════════════════════════════ */

const CP_MIC  = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v5.5A3.5 3.5 0 0 0 12 15Zm6-3.5a6 6 0 0 1-5 5.916V21h-2v-3.584A6 6 0 0 1 6 11.5h2a4 4 0 0 0 8 0h2Z" fill="currentColor"/></svg>`;
const CP_TICK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.55 17.1 4.4 11.95l1.32-1.32 3.83 3.83 8.73-8.73 1.32 1.33z" fill="currentColor"/></svg>`;

const cpBodyEl = document.getElementById("cpBody");
const CP_FIELDS = [
  {input: "cpCustomerInput", mic: "cpCustomerMic"},
  {input: "cpCaptainInput",  mic: "cpCaptainMic"},
];

/* Which input the keyboard is typing into. null when it is down. */
let cpFocused = null;
/* Dictation is per-field and only one can run at a time — two mics live at once
   would be two microphones open at once. */
let cpDictating = null;
/* Fields whose note has been committed. Saving locks the field: the text greys
   out, the box stops taking the caret and the button stops answering. A note the
   captain has just told the app to keep should not still look like a draft. */
const cpSaved = new Set();

function cpEl(id){ return document.getElementById(id); }

function cpPaintField(f){
  const input = cpEl(f.input), mic = cpEl(f.mic);
  const live  = cpDictating === f.mic;
  const has   = input.value.trim().length > 0;
  const saved = cpSaved.has(f.mic);

  /* Text beats dictation for the glyph: if there are words in the box, the thing
     to do is keep them. */
  mic.innerHTML = has ? CP_TICK : CP_MIC;
  /* Saved keeps the tick — it is what happened — but drops the filled treatment
     and stops answering, so the check reads as a record rather than a button. */
  mic.classList.toggle("is-submit", has && !saved);
  mic.classList.toggle("is-live", !has && live);
  mic.classList.toggle("is-saved", saved);
  mic.disabled = saved;

  input.disabled = saved;
  input.closest(".fb__field").classList.toggle("is-saved", saved);

  mic.setAttribute("aria-label",
    saved ? "Saved"
    : has  ? "Save this note"
    : live ? "Stop dictating"
    : (f.input === "cpCustomerInput" ? "Dictate the customer's feedback" : "Dictate your feedback"));
}

function cpPaint(){ CP_FIELDS.forEach(cpPaintField); }

/* ── The keyboard ─────────────────────────────────────────────────────────── */
/* Drawn rather than borrowed: a desktop browser raises nothing, and on a phone
   the real keyboard covers the footer anyway. This one behaves the same way —
   it overlays, it does not reflow — so what the demo shows is what the device
   would do. */
const CP_KEYS = [
  "qwertyuiop".split(""),
  "asdfghjkl".split(""),
  ["⇧", ..."zxcvbnm".split(""), "⌫"],
  ["123", "space", "return"],
];

/* Idempotent, because the build ships the PRE-RENDERED DOM: this file runs once
   in headless Chrome at build time and again in the browser, so without the
   clear the page carries two keyboards. The first is the dead pre-rendered copy
   — it has no listeners — and it is the one document.querySelector finds, so the
   keys did nothing and the strip never came up. Fifth screen in this bundle to
   hit this; the tab strips all carry the same guard. */
document.querySelectorAll("#scrComplaint .cp-kb").forEach(k => k.remove());

const cpKb = document.createElement("div");
cpKb.className = "cp-kb";
cpKb.setAttribute("aria-hidden", "true");
cpKb.innerHTML = CP_KEYS.map(row => `<div class="cp-kbRow">` + row.map(k => {
  const wide  = k.length > 1;
  const space = k === "space";
  const cls = ["cp-key", wide ? "cp-key--wide" : "", space ? "cp-key--space" : ""]
                .filter(Boolean).join(" ");
  return `<button type="button" class="${cls}" data-key="${k}">${space ? "" : k}</button>`;
}).join("") + `</div>`).join("");
document.getElementById("scrComplaint").appendChild(cpKb);

function cpShowKeyboard(input){
  cpFocused = input;
  cpKb.classList.add("is-up");
}
function cpHideKeyboard(){
  cpFocused = null;
  cpKb.classList.remove("is-up");
}

/* mousedown, not click: the field must not lose focus to the key being pressed,
   which is what a real on-screen keyboard also avoids. */
cpKb.addEventListener("mousedown", e => e.preventDefault());
cpKb.addEventListener("click", e => {
  const k = e.target.closest("[data-key]");
  if (!k || !cpFocused) return;
  const key = k.dataset.key;
  if (key === "return"){ cpHideKeyboard(); cpFocused = null; cpPaint(); return; }
  if (key === "⌫")      cpFocused.value = cpFocused.value.slice(0, -1);
  else if (key === "space") cpFocused.value += " ";
  else if (key === "⇧" || key === "123") { /* decorative — no shift state yet */ }
  else cpFocused.value += key;
  cpPaint();
});

/* ── Fields ───────────────────────────────────────────────────────────────── */
CP_FIELDS.forEach(f => {
  const input = cpEl(f.input), mic = cpEl(f.mic);

  /* The tap raises the keyboard, not the focus event. A browser only dispatches
     `focus` when its window has focus, so in a preview pane — and in any embedded
     viewer — the field would take the caret and the keyboard would stay down. The
     tap is also the literal thing being described: press the box, keys come up.
     `focus` is kept as well, for the caret arriving any other way (tab key). */
  const field = input.closest(".fb__field");
  field.addEventListener("click", () => {
    if (cpSaved.has(f.mic)) return;      /* locked — no caret, no keyboard */
    cpDictating = null;
    input.focus();
    cpShowKeyboard(input);
    cpPaint();
  });
  input.addEventListener("focus", () => {
    if (cpSaved.has(f.mic)) return;
    cpDictating = null; cpShowKeyboard(input); cpPaint();
  });
  /* Typing on a real hardware keyboard has to move the button too, or the state
     would only be right when the drawn keys are used. */
  input.addEventListener("input", cpPaint);

  mic.addEventListener("click", e => {
    /* The mic is inside the field, whose click raises the keyboard. Committing
       must not re-raise what it just put away. */
    e.stopPropagation();
    if (cpSaved.has(f.mic)) return;
    if (input.value.trim()){
      /* Commit: keep the text, drop the keyboard, lock the field. Nothing is
         cleared — the note stays where it was written so it can be read back. */
      cpSaved.add(f.mic);
      cpHideKeyboard();
      input.blur();
      cpPaint();
      toast("Noted");
      return;
    }
    /* Empty, so this is dictation. */
    cpDictating = cpDictating === f.mic ? null : f.mic;
    cpPaint();
    if (cpDictating) toast("Listening…");
  });
});

/* Tapping the page outside the keyboard and the fields puts it away. */
cpBodyEl.addEventListener("click", e => {
  if (e.target.closest(".fb__field")) return;
  cpHideKeyboard();
  CP_FIELDS.forEach(f => cpEl(f.input).blur());
  cpPaint();
});

document.getElementById("cpBack").addEventListener("click", () => goTo("token"));
document.getElementById("cpDone").addEventListener("click", () => {
  cpHideKeyboard();
  /* Done completes the step it was opened from, so the token page comes back with
     the NEXT sub-task active — the captain does not have to press Start again to
     acknowledge what he just wrote.
     This called advanceToken(), which was never defined anywhere: the click threw
     a ReferenceError before it reached goTo, so Done neither advanced nor
     navigated. */
  if (!completeJobStepTo("complaint")) goTo("token");
});

/* Called by the router. The token's own number and name, so the bar names the
   token that was opened rather than a fixture. */
function enterComplaint(){
  cpEl("cpToken").textContent = TOKEN.token;
  cpEl("cpName").textContent  = TOKEN.name;
  cpHideKeyboard();
  cpDictating = null;
  cpPaint();
  cpBodyEl.scrollTop = 0;
}

cpPaint();
