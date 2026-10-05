/* ═══════════════════════════════════════════════════════════════════════════
   BIKE COMMANDS — the persistent sheet
   Opened from the ⋮ on any screen whose SHEET_FOR list carries `commands`. It
   stays where it is put: it is chrome, not a screen, so goTo() never touches it.
   A 30% scrim dims the screen behind it; tapping the scrim or sliding the
   grabber down sends it away.

   NOT shared state with the RnM dashboard's identical-looking controls. The two
   sets of tiles show what each was last told to do, and nothing here reads the
   bike back, so keeping one in step with the other would be inventing a
   synchronisation the prototype cannot honour. Worth knowing before someone
   opens the sheet on top of the dashboard and expects the two Power tiles to
   agree — they will not. Flagged rather than fixed: which one is authoritative
   is a product question, and neither is talking to a real vehicle yet.
   ═══════════════════════════════════════════════════════════════════════════ */
const cmdSheet = document.getElementById("cmdSheet");
const cmdBikeEl = document.getElementById("cmdBike");

const cmdScrim = document.getElementById("cmdScrim");

function setCommandsSheet(open){
  cmdSheet.classList.toggle("is-open", open);
  cmdScrim.classList.toggle("is-open", open);
  cmdSheet.setAttribute("aria-hidden", String(!open));
  /* Named on open, because the sheet outlives the screen it was opened from and
     "which bike am I sending this to" stops being obvious the moment you
     navigate. */
  if (open) cmdBikeEl.textContent = BIKE.id || "";
}

/* ── Controls ────────────────────────────────────────────────────────────────
   Latching where the bike holds a state (power, wheel) and momentary where it
   does not (beep, seat) — the same division the dashboard makes. */
const csPower = document.getElementById("csPower");
const csLock  = document.getElementById("csLock");
const csBeep  = document.getElementById("csBeep");

let csPowerOn = false, csLocked = false, csBeeping = 0;

csPower.addEventListener("click", () => {
  csPowerOn = !csPowerOn;
  csPower.classList.toggle("is-lit", csPowerOn);
  csPower.setAttribute("aria-pressed", String(csPowerOn));
  document.getElementById("csStatePower").textContent = csPowerOn ? "On" : "Off";
  toast("Power " + (csPowerOn ? "on" : "off") + " · " + BIKE.id);
});

csLock.addEventListener("click", () => {
  csLocked = !csLocked;
  /* is-unlocked is the swung-open shackle, so it is the INVERSE of locked. */
  csLock.classList.toggle("is-unlocked", !csLocked);
  csLock.classList.toggle("is-lit", csLocked);
  csLock.setAttribute("aria-pressed", String(csLocked));
  document.getElementById("csStateLock").textContent = csLocked ? "Locked" : "Unlocked";
  toast("Wheel " + (csLocked ? "locked" : "unlocked") + " · " + BIKE.id);
});

/* Momentary: the tile lights for as long as the beep would sound and then lets
   go on a timer, not on an animation ending — a backgrounded tab throttles rAF
   to nothing and the tile would stay lit for ever. */
csBeep.addEventListener("click", () => {
  csBeep.classList.add("is-lit");
  document.getElementById("csStateBeep").textContent = "Beeping";
  clearTimeout(csBeeping);
  csBeeping = setTimeout(() => {
    csBeep.classList.remove("is-lit");
    document.getElementById("csStateBeep").textContent = "—";
  }, 1200);
  toast("Beep sent · " + BIKE.id);
});

[["csSeatOpen", "Open"], ["csSeatClose", "Closed"]].forEach(([id, state]) => {
  document.getElementById(id).addEventListener("click", () => {
    document.getElementById("csStateSeat").textContent = state;
    toast("Seat " + state.toLowerCase() + " · " + BIKE.id);
  });
});

/* View all opens Bike info, which lives on the RnM dashboard. From any other
   screen the app goes there first, and Bike info's back comes home again. */
document.getElementById("csViewAll").addEventListener("click", () => {
  setCommandsSheet(false);
  const from = current;
  if (from !== "rnm") goTo("rnm");
  rnmShowVitals(from);
});

/* Tapping the dimmed screen behind the sheet closes it. */
cmdScrim.addEventListener("click", () => setCommandsSheet(false));

/* ── Drag the grabber down to dismiss ────────────────────────────────────────
   The same gesture the options sheet uses.
   Downward only: dragging up would suggest the sheet expands, and it does not. */
(() => {
  const zone = document.getElementById("cmdGrab");
  let d = null;
  zone.addEventListener("pointerdown", e => {
    if (!cmdSheet.classList.contains("is-open")) return;
    d = {y0:e.clientY, dy:0};
    zone.setPointerCapture(e.pointerId);
    cmdSheet.classList.add("cmdsheet--dragging");
  });
  zone.addEventListener("pointermove", e => {
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    cmdSheet.style.transform = `translateY(${d.dy}px)`;
  });
  /* The release position decides, not the last move seen. A fast flick can go
     down and up with no pointermove in between — and so can a synthetic drag —
     which left d.dy at 0 and the sheet sitting there through a gesture that
     plainly asked it to go. */
  const end = e => {
    if (!d) return;
    const dy = e && typeof e.clientY === "number"
      ? Math.max(d.dy, e.clientY - d.y0)
      : d.dy;
    d = null;
    cmdSheet.classList.remove("cmdsheet--dragging");
    cmdSheet.style.transform = "";
    if (dy > 60) setCommandsSheet(false);
  };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);
})();
