/* ═══════════════════════════════════════════════════════════════════════════
   TIME DETAILS — the whole clock on one repair
   ═══════════════════════════════════════════════════════════════════════════
   Opened by the chevron on the allocation page's footer. Reads the bike it was
   handed and derives everything from the one stored moment — see allocAt and
   allocStartedAt in shared/fleets.js — so this page and the footer behind it
   cannot disagree about the same repair.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){

  let atBike = null;

  function openAllocTime(bike){
    atBike = bike;
    render();
    goTo("alloctime");
  }
  window.openAllocTime = openAllocTime;

  const row = (label, value, total) =>
    `<div class="at-row${total ? " at-row--total" : ""}">
       <span class="at-rowl t-label-md">${esc(label)}</span>
       <span class="at-rowv t-label-md">${esc(value)}</span>
     </div>`;

  function render(){
    const b = atBike;
    if (!b) return;

    document.getElementById("atCrumb").textContent = `${b.model} • ${b.id}`;
    document.getElementById("atTitle").textContent = mechName(b.mech) || "Allocated";
    document.getElementById("atSub").innerHTML = allocStateHTML(b);
    const face = document.getElementById("atFace");
    if (!face.firstElementChild) face.innerHTML = ICON.face;

    /* A dash, not a blank, for a moment that has not happened: an empty value
       reads as a figure that failed to load, and the whole point of this page
       is that the reader trusts the clock. */
    const started  = allocStartedAt(b);
    const finished = allocFinishedAt(b);
    document.getElementById("atMoments").innerHTML =
        row("Allocated at",  fmtClock(b.allocAt))
      + row("Work started",  started  == null ? "—" : fmtClock(started))
      + row("Finished at",   finished == null ? "—" : fmtClock(finished));

    /* The gaps. `mins` is the state's own figure — how long it has waited, been
       in hand, or taken — so a bike still waiting has no time on it yet, and
       one being worked on has a figure that is still growing. The live one is
       stamped rather than ticked: this page is opened to be read, not watched,
       and a second clock running here would be the board's job done twice. */
    const inHand = b.state === "pending" ? "0m"
                 : b.state === "done"    ? fmtWaitFlat(b.mins)
                 : fmtWaitFlat(Math.round((Date.now() - allocLiveFrom(b)) / 60000));
    document.getElementById("atSpans").innerHTML =
        row("Waiting to be started", fmtWaitFlat(b.waitMins))
      + row(b.state === "done" ? "Time on the bike" : "Time on the bike so far", inHand)
      + row("Total, handover to now",
            fmtWaitFlat(b.waitMins + (b.state === "pending" ? 0
              : b.state === "done" ? b.mins
              : Math.round((Date.now() - allocLiveFrom(b)) / 60000))), true);
  }

  /* Back to the bike, not to the board: this page is a level under the
     allocation page and the reader came through it. */
  document.getElementById("atBack").addEventListener("click", () => goTo("alloc"));

})();
