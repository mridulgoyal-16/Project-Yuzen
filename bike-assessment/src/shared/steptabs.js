/* ═══════════════════════════════════════════════════════════════════════════
   ASSESSMENT / PENALTIES — one step, two tabs, two screens
   ═══════════════════════════════════════════════════════════════════════════
   The checklist and Mark penalties were two rows on the dashboard and two stops
   in the sequence. They are one of each now, split by a tab strip — the same
   move the two fault sections got, and for the same reason: penalties are marked
   against what the checklist finds, so two doors into one piece of work made the
   dashboard longer without making it clearer.

   Unlike the fault sections, these two are separate SCREENS — one carries a
   swipeable carousel and a morph, the other a photo strip and expanding cards —
   so the strip switches by navigating rather than by swapping a panel. They are
   adjacent in the router's ORDER, so the move reads as the lateral one a tab
   switch should be. Rebuilding them as panels of one screen is a much larger
   change for the same result and would put both screens' scroll machinery in
   one place.

   One function paints both copies, so the two cannot come out different.
   ═══════════════════════════════════════════════════════════════════════════ */
const STEP_TABS = [
  {id:"assess",  label:"Assessment", route:"assess",
   /* JUDGED / TOTAL — "9/17". The bare total said how long the checklist is,
      which a QCA works out by scrolling it; the pair says how far through they
      are, which is the thing the strip is in a position to tell them. Judged is
      any part that is no longer pending — good and faulty both count, because
      both are answers. */
   count:() => PARTS.filter(p => p.status !== "pending").length + "/" + PARTS.length},
  {id:"penalty", label:"Penalties",  route:"faults",
   /* What there is to price, which is the only number this tab is about — and
      also whether the tab is reachable at all. A penalty is marked against a
      fault; with none found there is nothing on the other side, and a live tab
      onto an empty screen is a tap that teaches a QCA the flow is broken. */
   /* PRICED / FOUND — "0/1" — not a bare total. The tab is the only place the
      two numbers appear together, and the pair is what says whether there is
      still work behind it: 3 alone reads as three things done.

      "No penalty" counts as UNPRICED here, on Sagar's call. It is a decision the
      QCA has made, so the step's own tick treats it as answered (see
      penaltyOutstanding in screens/rnm) — which means an assessment where every
      fault drew "No penalty" shows 0/3 on the tab and a ticked step. The tab is
      counting penalties applied, not questions answered. */
   count:() => PARTS.filter(p => p.penalty === "minor" || p.penalty === "major").length
             + "/" + PARTS.filter(p => p.status === "faulty").length,
   enabled:() => PARTS.some(p => p.status === "faulty")},
];

/* ONE listener, on the document, bound at load.

   Not "bind it the first time the strip is painted", which is the obvious shape
   and is broken here: build.py pre-renders the page with headless Chrome and
   writes the resulting DOM back into the file, so both strips ship with their
   buttons already in them. `if (!el.firstElementChild)` is false on the very
   first call at runtime and the handler is never attached — the tabs render
   perfectly and do nothing. Anything that lazily binds INSIDE a paint has the
   same hole; lazily filling content does not, which is why the banner's version
   of this is safe.

   Keyed on the is-on class rather than a captured id, so it needs to know
   nothing about which strip it is looking at. */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-steptab]");
  if (!b || b.classList.contains("is-on")) return;
  /* Nothing to price yet — see paintStepTabs. */
  if (b.getAttribute("aria-disabled") === "true") return;
  const t = STEP_TABS.find(x => x.id === b.dataset.steptab);
  /* Instant: these two are tabs, not pages, and a slide between them says the
     opposite of what the strip says. */
  if (t) goToInstant(t.route);
});

function paintStepTabs(el, activeId){
  if (!el) return;
  if (!el.firstElementChild){
    el.innerHTML = STEP_TABS.map(t => `
      <button class="steptab" type="button" role="tab" data-steptab="${t.id}">
        <span class="t-label-md">${t.label}</span>
        <span class="t-label-md steptab__n"></span>
      </button>`).join("");
  }
  el.querySelectorAll("[data-steptab]").forEach(b => {
    const t  = STEP_TABS.find(x => x.id === b.dataset.steptab);
    const on = b.dataset.steptab === activeId;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-selected", String(on));
    /* Never the tab you are standing on: a QCA who marked a part faulty, went to
       price it and then un-marked it would otherwise be locked onto a tab the
       strip says does not exist. aria-disabled rather than the attribute, so it
       is still announced — see the same choice on the locked checklists. */
    const live = on || !t || !t.enabled || t.enabled();
    b.setAttribute("aria-disabled", String(!live));
    b.querySelector(".steptab__n").textContent = t ? t.count() : "";
  });
}
