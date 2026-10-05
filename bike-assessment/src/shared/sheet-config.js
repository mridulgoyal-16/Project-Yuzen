/* ═══════════════════════════════════════════════════════════════════════════
   Options sheet — WHAT IS IN IT
   The component lives in shared/sheet.js and knows nothing about the app. This
   file is the whole of its content: one catalogue of every option that exists,
   and one map of which screen offers which subset. Adding an option to a screen
   is a one-line edit here — no markup, no CSS, no handler, unless the option is
   genuinely new.
   Loaded BEFORE sheet.js, which reads both at open time.
   ═══════════════════════════════════════════════════════════════════════════ */

/* The three options, defined once. Only the issues row carries a chevron — the
   Figma draws it that way, though Bike commands leads somewhere too. */
const SHEET_ITEMS = {
  commands: {label:"Bike commands",         icon:ICON.sheetCommands, chevron:false},
  report:   {label:"Report issues on bike", icon:ICON.sheetReport,   chevron:true},
  learn:    {label:"Play to learn",          icon:ICON.play,          chevron:false},
  /* Token detail only. Calling and skipping are things you do to a PERSON in a
     queue, which is the only page that has one. Both already exist on the queue
     screen's active card — same two actions, reachable from inside the token. */
  call:     {label:"Call user",              icon:ICON.sheetCall,     chevron:false},
  skip:     {label:"Skip for now",           icon:ICON.sheetSkip,     chevron:false},
  minimise: {label:"Minimize",              icon:ICON.sheetMinimise, chevron:false},
  /* PUT THE BIKE BACK. Minimize parks a task the mechanic is coming back to —
     it holds the dock's one slot and guards the next bike against it. This is
     the other answer to the same interruption: they are not coming back to it
     today, something else matters more, and the bike should be somebody's to
     pick up rather than pinned to them.

     The bike stays exactly where it was — the listing it was opened from, in the
     same place in it. Discarding is not finishing and not failing; it is the
     task going back on the board. */
  discard:  {label:"Discard task",          icon:ICON.sheetDiscard,  chevron:false},
  /* The three the RnM dashboard gained when its tab strip went. Part exchange was
     a place on that strip, Feedbacks a step on the task page, and Finish repair
     was the Done button that only appeared once everything closed. All three are now reachable at
     any time from here, which is the point — a mechanic who wants to re-read the
     complaint should not have to finish a checklist first.
     Chevrons on the two that leave this screen, none on the one that acts. */
  /* PLACEHOLDER GLYPHS. The frame does not export icons for these three, so they
     borrow the nearest 24px ones already in the set: a customer glyph for the
     customer's words, the expand arrows for parts going out and coming back, and
     the tick for closing the job. Flagged — they want their own.
     ICON.confirm is NOT the tick to use: it is a 40px filled circle built for the
     confirm dialog and it renders as a black disc in a menu row. */
  feedbacks: {label:"Feedbacks",            icon:ICON.sheetCall,     chevron:true},
  parts:     {label:"Part exchange",        icon:ICON.swap,          chevron:true},
  bikeinfo:  {label:"Bike info",            icon:ICON.info,          chevron:true},
  finish:    {label:"Finish repair",        icon:ICON.good,          chevron:false},
  /* CLOSING A REPAIR THAT IS NOT FINISHED. A bike can be as done as it is going
     to get today — a part is not in stock, the bay is needed, the shift ends —
     and the mechanic still has to hand it back. Finish repair is for work that
     is complete; this is for work that is over. Two rows because they are two
     different claims about the same bike, and one of them wants a reason. */
  partial:   {label:"Partial repair closure", icon:ICON.faulty,      chevron:true},
  /* The Sr. Mechanic's one row, on a bike being worked on. Something turns up
     mid-repair that the assessment did not catch, and the person watching the
     board is the one who hears about it — see SHEET_FOR.alloc. */
  addfault:  {label:"Add fault",            icon:ICON.plus,          chevron:true},
};

/* Which options each screen offers. Only the checklist can raise an issue on a
   part, because it is the only screen that walks the parts. */
const SHEET_FOR = {
  /* No `learn`. The Learn pill was removed from this screen at Sagar's request,
     and leaving `Play to learn` in the ⋮ of the same page would have kept the
     feature alive one tap further in — the same walkthrough, on the page it was
     just taken off. The start screen's Watch video still points at it, which is
     where it now lives alone. */
  /* Minimize then Discard, in that order: they are the two ways to put a task
     down and they escalate — park it and keep it, or let it go. The house rule
     is that the dismissive row goes last, and of these two Discard is the more
     final, so it takes the place Minimize holds on every other screen. */
  job:      ["commands", "minimise", "discard"],
  assess:   ["commands", "report", "minimise"],
  faults:   ["commands", "minimise"],
  /* Feedbacks is read-only, but it is still somewhere a mechanic can be standing
     at the bike when they get called away — so it needs Minimize like the rest,
     and it resumes straight back here because minimiseTask() records `current`. */
  feedback: ["commands", "report", "minimise"],
  /* `commands` is back, and `report` is still gone — the two came off together on
     the same argument and only one of them still holds.

     The argument was that a menu row pointing at something already on screen costs
     a tap to learn nothing. Add Issues is still a button in this screen's footer,
     so `report` stays off.

     `commands` and `feedbacks` came off too. Bike commands is a tab on this
     screen now — a ⋮ row that reveals a tab the tab bar already offers is a
     second door to one room. Feedbacks went with it: what a customer said is
     read before you start work, not from the dashboard you are working on.

     What is left is only what you do TO this repair, then the generic pair, with
     the dismissive Minimize last as everywhere else. */
  /* Computed, because this screen is two screens. The repair keeps all three of
     the rows it gained when the tab strip went; the ASSESSMENT offers none of
     them, and each for its own reason:

       Part exchange   the repair's paperwork. An assessment does not swap parts,
                       which is why its carousel card is hidden too.
       Bike info       a real tab on the assessment now. A ⋮ row that opens what
                       the tab bar already offers is a second door to one room —
                       the same argument that took `commands` off this list.
       Finish repair   named for the other job, and it does the other job's
                       sign-off.

     ── FLAGGED ────────────────────────────────────────────────────────────────
     Finish repair was the assessment's ONLY way to close its dashboard step.
     Nothing has replaced it: Back returns to the task page without advancing, so
     a QCA who finishes the checklist lands on step one again. The repair is
     unaffected — it still has the row. This needs a decision, not a guess: the
     honest candidates are a Done on the dashboard itself (its own row, named for
     an assessment) or closing the step from Back once every part is judged.
     ────────────────────────────────────────────────────────────────────────── */
  /* FINISH OR PARTIAL, never both. Finish repair claims the bike is done, and
     it only appears once every issue on it is closed — offering it over an open
     fault invites a mechanic to sign off work they have not finished, which is
     the one thing a sign-off must not allow. Until then the row in that place
     is Partial repair closure: the honest version of the same action, for a
     bike that is as done as it is going to get today.

     issuesAllResolved is the whole-bike rule the fault record already uses —
     mechanical ticked, electrical confirmed by a re-run — so the menu and that
     screen cannot disagree about whether this bike is finished. */
  rnm:      () => rnmKind === "assessment"
              ? ["learn", "minimise"]
              : ["parts", "bikeinfo",
                 issuesAllResolved() ? "finish" : "partial",
                 "learn", "minimise"],
  /* The two issue screens. Neither offers `Report issues on bike` — raising an
     issue is what you are already doing on them, so it would point at the screen
     you are on. Issues drops `Bike commands` too: you arrive here from the RnM
     dashboard, which IS the bike commands, so it is a route back to where you just
     came from. Mark Issues keeps it for now — flagged, since the two reading
     differently is hard to defend. */
  issues:     ["learn", "minimise"],
  markissues: ["commands", "minimise"],
  checks:     ["commands", "minimise"],
  /* Call and Skip sit below Bike commands and above Minimize, per Sagar — the
     dismissive action stays last. */
  token:      ["commands", "call", "skip", "minimise"],
  /* ONE ROW, and only on a bike somebody is working on — see the ⋮ in
     screens/alloc, which is hidden on every other state. No `commands`: the Sr.
     Mechanic is not at the bike, the mechanic is. No `minimise`: this page is
     not a task and there is nothing to park. */
  alloc:      ["addfault"],
};

/* What an option DOES, when that differs by screen. The default behaviour lives
   in sheet.js and is right nearly everywhere; this table is for the screens where
   an option already has a home of its own and raising the generic thing would
   point at what is on screen already.

   The component still names no screen — it looks the current one up here and
   falls through to its own defaults when there is no entry, so adding a case is
   one line and no change to the sheet. */
const SHEET_ACTIONS = {
  rnm: {
    /* No `commands` or `feedbacks` handler: both rows are off this screen's sheet
       (see SHEET_FOR above). rnmShowCommands() is still exported and still used
       by the Bike commands TAB — the row is gone, the behaviour is not.

       Still no `report` override — the only route into Mark Issues from here is the
       footer's + Add Issues, which returns to the dashboard rather than to the issue
       list; see screens/rnm/script.js. */
    parts:     () => rnmShowParts(),
    /* The same screen the vitals strip's arrow opens. Two ways in is deliberate:
       the strip is where you notice a reading looks wrong, the ⋮ is where you go
       looking for one you cannot see. */
    bikeinfo:  () => rnmShowVitals(),
    /* Finish is the old Done, and it has to be the old Done's behaviour too:
       YuzenRnM.onDone(), not a bare goTo("job"). That hook forces jobKind back to
       'repair' — #scrJob is one screen serving two task types — and advances the
       task past its RnM step. Sending the mechanic to the task page without it
       landed them on whichever kind was last set, standing on the step they had
       just finished.
       It is offered whether or not the work is closed, because a mechanic can be
       genuinely done with a bike they could not fully close — and the task page,
       not this menu, is where that gets reconciled. */
    finish:    () => window.YuzenRnM.onDone(),
    /* Reports and stops. Closing a repair short needs a reason recorded against
       the bike — which fault is being left, and why — and there is no screen
       for that. Wiring it to onDone() would make it Finish repair under a
       second name, which is the one thing it must not be. */
    partial:   () => toast("Partial repair closure — not wired yet"),
  },
  alloc: {
    /* Reports and stops. Adding a fault means a part, its reasons and a photo —
       the whole Mark issues flow — and that flow belongs to the MECHANIC, whose
       screens this board is not allowed to open. It needs a Sr. Mechanic's own
       version, and nobody has drawn one. */
    addfault: () => toast("Add fault — not wired yet"),
  },
};
