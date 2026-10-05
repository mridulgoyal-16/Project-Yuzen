# Issues — Yuzen

The issues reported against a bike, split into Electrical and Mechanical. From
Figma node
[`1993-30331`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=1993-30331).

Open `prototype.html` directly in a browser. One self-contained file — Satoshi
and two part photos are inlined, so no network, no server, no build step to view
it.

## The two sections are not the same shape

This is the thing to understand before reading anything else, and it changed on
5 Aug at Sagar's direction.

A **mechanical** issue is a part someone judged by hand. It has a photo, the
reasons they picked, and a tick — because a person decides when it is fixed.

An **electrical** issue is a fault the bike reported about itself: `Ping not
received`, `Motor controller unit lag`, `IoT voltage low`. There is no part to
photograph, no reason list, and — the load-bearing one — **no tick**. A mechanic
cannot declare a diagnostic clear by tapping it. They fix the thing and re-run the
checks, and the bike says whether it is clear. So the row is a line of text and
nothing else, and the footer carries the only way to close it.

That is why the two footers carry different weight, below.

## What to try

- **Tap a tick** to resolve that issue. It turns surface/secondary with a
  content/positive glyph, the name gets a black strike-through, a "Resolved"
  toast appears, and the progress bar moves. Tap again to reopen — no toast,
  since reopening is a correction rather than a result.
- **Tap a part name** to open the issue detail sheet
  ([`1993-30576`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=1993-30576)):
  the part, who marked it, its reasons as removable chips, and the reasons still
  available in grey below. Resolve commits the edits and marks it done; Remove
  drops the issue entirely. Drag the header down or tap the scrim to back out —
  edits are discarded, so the earlier call stands.
- **Tap anywhere on a mechanical row** to open its sheet — the whole row is the
  target, not just the name, with the tick carved out of it. Rows are keyboard-
  reachable and answer Enter and Space.
- **The reason chips have three states** — enabled (white, hairline border), selected
  (surface/secondary, dark ring, cancel glyph), and disabled (surface/secondary,
  grey label, not tappable). A part cannot be missing and faulty at once, so the
  two sides disable each other: mark it Missing and every fault greys out until
  Missing is cleared; pick any fault and Missing greys out until the last one
  goes. Tapping a chip's × releases the lock, so it cannot strand anyone.
- **Switch section** with the tabs at the top — the same tab component
  `../mark-issues` uses, so the two screens in this flow do not drift: a 55px
  strip, the label in content/secondary until selected, and a 2px underline that
  slides. They were chips until 5 Aug. The counts are this screen's own addition
  to that component: a zone's size is not interesting on mark-issues, where "how
  many are filed under Mechanical" is exactly what you want before switching.
- **The footer follows the tab, and so does its weight.** Mechanical closes with
  **Mark Issues**, primary, because that is the way off the screen. Electrical
  carries **Re-run electrical checks** as a *secondary* button — re-running is
  something you do while you are here, not the way out.
- **Re-running actually reports.** The button disables, reads `Running electrical
  checks…` for 1.4s, then clears what passed and toasts the count. It has to do
  something real, because with no tick on those rows it is the only way an
  electrical fault ever closes.
- **Scroll down and the footer drops away**, giving its 124px to the rows;
  scroll up and it returns. Direction, not offset, with an 8px threshold — the
  same rule as mechanic-checks.
- **Mark Issues** reports what is still open and what has been resolved. It stays
  enabled throughout, including once everything is resolved — submitting a fully
  clean bike is a real outcome, not a no-op.
- **The three-dots** opens the options sheet — Finish with open issues and Bike
  commands — shared with mechanic-checks and mark-issues. Dismiss it by picking an
  item, tapping the scrim, or dragging the grab handle down.

## It leads into Mark Issues

`onMarkIssues` navigates to `../mark-issues/prototype.html`, and that screen's
`onBack` comes back here. The stitch is those two hook bodies and nothing else —
neither screen's own code knows the other exists. **State does not survive the
hop:** each screen is its own document, so marks made over there do not come back
as rows here. Fine for walking a tester through the flow; carrying state needs
sessionStorage or one combined document.

## Wiring it into the flow

Everything outbound goes through `window.Yuzen`, at the top of the `<script>`.
Replace the function bodies; change nothing else.

| Hook | Fires when | Payload |
|---|---|---|
| `onBack` | app-bar back | — |
| `onMenu` | an options-sheet item | `'finish'` \| `'commands'` |
| `onSection` | a section chip | `'Electrical'` \| `'Mechanical'` |
| `onRerunChecks` | Re-run electrical checks | the section name |
| `onOpenIssue` | a part name is tapped | `{ id, part, reasons }` |
| `onResolveIssue` | a tick is toggled, or the sheet's Resolve | `{ id, part, done }` |
| `onRemoveIssue` | the sheet's Remove | `{ id, part }` |
| `onMarkIssues` | Mark Issues | `{ open, resolved }` — part names in each |

## The header is shared with mechanic-checks

`build.py` lifts the shell — device frame, tokens, type styles, status bar, app
bar, scroll region, progress bar, footer — verbatim out of
`../../mechanic-checks/prototype.html` in three ranges — the shell prelude, the
three-dots options sheet, and the progress/footer block — so the two screens
carry the same furniture and the flow does not drift as more screens land. Only
this screen's own styles and markup live in `template.html`.

```bash
python3 build.py        # rewrites prototype.html
```

The build fails loudly if the sibling's section markers move, rather than
silently emitting a screen with no footer — which is exactly what happened on the
first attempt.

Two consequences worth knowing:

- **`prototype.html` is generated.** Edit `template.html` and rebuild; a direct
  edit to `prototype.html` is lost on the next build.
- **The built file has no runtime dependency on the sibling** — fonts and photos
  are inlined at build time. Only rebuilding needs `mechanic-checks` and
  `bike-assessment` present.

## Deviations from the design, and why

- **The header is not the design's.** The frame centres `Issues • 5` with nothing
  on the right; per the brief this uses the same app bar as the other screens —
  `543210 / Issues`, back arrow left — with a three-dots button added at the right
  edge. The frame's `• 5` count now lives on the section chips, per part of the
  bike rather than one total for the screen.
- **The three-dots and its sheet are not in the frame at all.** The button was
  asked for on top of the design, so its glyph is three inline circles rather
  than an export — there was no node to pull. The sheet's two items came from
  bike-assessment; its icons are the Issues screen's own task_alt and the task
  list's bolt, both real exports already in the repo.
- **Five rows, varied.** The frame draws four identical `Pigtail connector` rows
  against a header count of 5. This ships five rows with different parts and
  reasons so they are tellable apart; the first keeps the three reasons
  (`Rusting · Cuts · Wear out`) the frame shows.
- **Resolved rows step back rather than grey out.** Faded thumbnail, struck-through
  name, tertiary reasons. Greying the whole row read as *failed* instead of *done*.
- **The detail sheet's header carries a second line** — "Marked by: John Doe" — which
  the frame's 68px single-line header does not have, so its height is
  content-driven with the frame's 24px above and the same below. It also doubles
  as the drag handle: the frame gives this sheet a title where the others have a
  grabber, and drawing both would be one affordance too many.
- **The frame draws two of the three chip states.** Selected (dark ring + cancel
  glyph) and disabled (grey) are both in the frame; enabled — white with a
  hairline border — is not, because in that frame every reason is either picked
  or ruled out by them. It comes from the design system's chip, matching
  mechanic-checks.
- **The exclusive rule is enforced by disabling, not by switching** — the opposite
  of mechanic-checks, and deliberately. That screen switches (picking Missing
  silently drops the reasons) because its chips have no cancel glyph, so a lock
  would leave a mechanic hunting for what to unpick. Here the × is on the chip, so
  locking costs nothing and states the constraint outright instead of quietly
  rewriting the selection.
- **Reason catalogues are invented** beyond what each row already reports; the
  frame only shows one part's chips.
- **Reasons wrap.** Three reasons already fill the 206px the frame allots that
  line, so a fourth would be clipped rather than shown.

## Still open

- **The footer reveal has nothing to reveal yet.** Two or three rows per section
  do not fill the screen, so the list never scrolls and the footer never hides.
  The behaviour is there for when a bike carries a real number of issues; to see
  it now, add rows.
- **The chip count includes resolved issues.** It says how much is filed under
  that section, so it does not move as you work. If the count should be "still
  open", that is a different number and the resolved ones need somewhere to go.
- **The sections are assigned by hand.** Pigtail connector, MCU and throttle are
  called electrical, the wheel and tyre mechanical. Whether the throttle is
  electrical (its sensor) or mechanical (its cable) is a real question for the
  workshop, not something to guess at.
- **Re-run electrical checks only toasts.** It fires `onRerunChecks` and says so;
  what actually re-runs, and what the screen shows while it does, is undesigned.

- **"Marked by" is one name per issue, invented.** Real attribution presumably
  comes with a timestamp too; the frame has neither, so the sheet shows only the
  name and there is nowhere yet for a time.
- **Remove has no confirmation.** It deletes the issue on one tap. If issues are
  audited, it should confirm — or become a request rather than a deletion.
- **The tick's meaning is assumed.** It is read here as *resolve this issue*. It
  could as easily be a multi-select feeding Mark Issues, in which case the button
  should act on the ticked rows and stay disabled until one is picked.
- **What does Mark Issues do next?** It reports open and resolved and stops there.
  Whether it advances the flow, submits, or opens a confirmation is undecided.
- **Reasons are invented** except the first row's, which is from the frame.
- **Photos are borrowed** from `bike-assessment` and matched to parts by name.
  The pigtail, wheel, MCU, throttle and tyre shots are real parts, but not
  necessarily photographs of *these* faults.
- The progress bar fills over resolved issues. Whether it should track that, or
  progress through a wider flow, is unsettled — it is the sibling screen's bar and
  in that screen it tracks checklist completion.
