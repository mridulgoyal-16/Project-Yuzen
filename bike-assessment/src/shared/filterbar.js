/* ═══════════════════════════════════════════════════════════════════════════
   FILTER BAR — the standard filtering control
   ═══════════════════════════════════════════════════════════════════════════
   One 72px band: All, then a run of quick chips, then the button that opens the
   rest of the groups in a sheet. It was written into the queue template and is
   a COMPONENT now, so a second screen can have the same control by handing it a
   container and a list of groups — the Sr. Mechanic's Unallocated board is the
   first caller that is not the queue itself.

   WHAT A CALLER OWNS: the groups, the selection, and what to do when it changes.
   This file owns the markup, the All chip, the pressed states, the scrolling
   run and the sheet hand-off. It stores nothing about any one screen.

   USAGE

     paintFilterBar(el, {
       groups,                 // [{id, label, quick?, chips:[{id,label,of,dot?}]}]
       selection,              // {groupId: [chipId, …]}  — the caller's state
       data,                   // the rows the counts are taken against
       onChange(selection),    // called with the NEW selection on every tap
       sorts,                  // [{id, label, of(bike)}] — omit for no Sort button
       sort,                   // {id, dir:"asc"|"desc"} or null — the caller's state
       onSort(sort),           // called with the NEW order, or null for the default
     });

   SORT IS OPTIONAL AND PER LISTING. A queue that declares no `sorts` gets no
   Sort button at all, rather than one that opens an empty sheet — the same rule
   the filter band already follows for a kind with no filters.

   Counts are taken against `data`, not against the filtered view: a count that
   fell to nothing as you narrowed would report what you had already done rather
   than what is still there to reach for. All carries data.length, not the sum of
   the chips beside it — the chips overlap and a row can match neither.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Not a chip id anybody declares. Prefixed so it cannot collide with one. */
const FBAR_ALL = "__all";

/* Per-element wiring, so the one delegated listener below can find the caller's
   groups and callback from whichever bar was tapped. A WeakMap rather than a
   property on the node: the node is rebuilt from innerHTML on most renders and
   the map key — the container — is the thing that survives. */
const FBAR = new WeakMap();

function paintFilterBar(el, opts){
  if (!el) return;
  const {groups = [], selection = {}, data = [], onChange,
         sorts = [], sort = null, sortDefault = null, onSort} = opts || {};
  FBAR.set(el, {groups, selection, onChange, sorts, sort, sortDefault, onSort});

  el.classList.add("qfilters");
  const quick = groups.find(g => g.quick);

  /* ALL, first in the run and pressed when nothing else in its group is. It was
     taken off a build ago on the grounds that All is what deselecting gives you;
     it came back because the row otherwise has no resting state you can point
     at — with nothing pressed the chips read as available rather than as already
     showing you everything. Tapping it clears the group rather than selecting
     anything. */
  const allOn = !(selection[quick && quick.id] || []).length;
  const chips = !quick ? "" :
    `<button class="qquickchip" type="button" data-qchip="${FBAR_ALL}"
             aria-pressed="${allOn}">All &bull; ${data.length}</button>`
    + quick.chips.map(c => {
        const n  = data.filter(c.of).length;
        const on = (selection[quick.id] || []).includes(c.id);
        return `<button class="qquickchip" type="button" data-qchip="${c.id}"
                 aria-pressed="${on}">${
          c.dot ? '<span class="qdot" aria-hidden="true"></span>' : ""
        }${esc(c.label)} &bull; ${n}</button>`;
      }).join("");

  /* THE BUTTON IS THE LAST CHIP, and inside the scroller with them: it opens the
     rest of the same list of filters, so it is one of the set rather than a
     control standing beside it — and a set where one item does not move is two
     things again. It is a plain chip until a filter is set BEHIND it, in a group
     the run does not show; the quick chips light themselves, and lighting the
     button for them too would say the same thing twice. */
  const lit = groups.some(g => !g.quick && (selection[g.id] || []).length > 0);
  /* The two ids are the queue's, kept because half the suite reaches for them
     and because one filter bar is on screen at a time in this app — the queue
     template is shared by six listings and the Sr. Mechanic's board is one of
     them. A second bar alongside the first would need them dropped; nothing
     here depends on them. */
  /* THE SORT BUTTON IS THE LAST CHIP, after Filters and inside the same
     scroller, for the reason Filters is inside it: both open the rest of what
     the band is for, so they belong to the run rather than standing beside it.
     IT NEVER LIGHTS, and that is the one place it parts company with Filters.
     A lit Filters button means rows are being hidden — a fact you cannot see by
     looking at the list, and worth a mark. Sort hides nothing: one order is
     always in force, the list in front of you IS the answer, and a ring that
     was on whenever anything was chosen would be on for a state that is not
     unusual. So it stays a plain chip whatever is picked. */
  el.innerHTML =
    `<div class="qquick" id="qQuick" role="group" aria-label="Quick filters">${chips}`
    + `<button class="qfbtn${lit ? " is-on" : ""}" id="qFilterBtn" type="button"
               data-fbar-more data-icon="filter" aria-label="Filters"
               aria-haspopup="dialog" aria-expanded="false">${ICON.filter}</button>`
    + (sorts.length
        ? `<button class="qfbtn" id="qSortBtn" type="button"
                   data-fbar-sort data-icon="sort" aria-label="Sort"
                   aria-haspopup="dialog" aria-expanded="false">${ICON.sort}</button>`
        : "")
    + `</div>`;
}

/* ONE listener, on the document, bound at load.

   Not "bind it when the bar is first painted": build.py pre-renders the page
   with headless Chrome and writes the resulting DOM back into the file, so a bar
   can ship already populated and a bind-on-first-paint never runs. The tab strip
   was caught by exactly this. See shared/steptabs.js, which carries the same
   warning. */
document.addEventListener("click", e => {
  const bar = e.target.closest(".qfilters");
  if (!bar) return;
  const wired = FBAR.get(bar);
  if (!wired) return;

  if (e.target.closest("[data-fbar-more]")){
    openFilterSheet(wired.groups);
    return;
  }

  /* Same delegated listener, bound at load, for the same pre-render reason the
     note above gives: a band can ship already populated, so a bind-on-paint
     would never run for it. */
  if (e.target.closest("[data-fbar-sort]")){
    openSortSheet(wired.sorts, wired.sort, wired.onSort, wired.sortDefault);
    return;
  }

  const b = e.target.closest("[data-qchip]");
  if (!b) return;
  const quick = wired.groups.find(g => g.quick);
  if (!quick) return;
  const sel = {...wired.selection};
  const on  = sel[quick.id] || [];
  /* All is not a filter — it is the absence of one. Tapping it empties the
     group, and it cannot be un-tapped: deselecting the last real chip is what
     brings it back on, which is the same gesture. */
  if (b.dataset.qchip === FBAR_ALL){
    if (!on.length) return;
    sel[quick.id] = [];
  } else {
    sel[quick.id] = on.includes(b.dataset.qchip)
      ? on.filter(x => x !== b.dataset.qchip)
      : on.concat([b.dataset.qchip]);
  }
  if (wired.onChange) wired.onChange(sel);
});
