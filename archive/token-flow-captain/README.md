# Token flow (captain) — Yuzen

The captain's whole loop in one prototype: the token queue, and what happens
inside a token. Tap a card, work the token, come back — the queue has moved on.

**Nothing lives here.** Both screens are lifted from their own folders at build
time, so this folder cannot drift from them:

| | |
|---|---|
| [`token-details`](../token-details) | the token screen, and its sources |
| [`token-task-list`](../token-task-list) | the queue |

That split is deliberate. The token screen is built to stand on its own so the
mechanic's and QC's flows can wrap it in *their* lists later — this folder is the
captain's wrapper, not the screen's owner.

Screens from
[Token 2349:26167, Expanded view 2349:26389, Others 2367:26652, Reason for
unserviceability 2367:26917, Customer feedback 2347-26022](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=2151-21039).

## Run it

`prototype.html` is self-contained — fonts, icons and the bike inlined. Open it by
double-clicking. To rebuild after a change:

```bash
python3 stitch.py     # re-lift the queue from ../token-task-list
python3 build.py      # ask ../token-details to compose the two together
```

`stitch.py` only needs re-running when the queue changes upstream. `build.py`
needs re-running whenever either screen changes — it reads both siblings, so
there is no copy here to forget.

## What to try

It opens on the **queue**, because that is where a captain starts.

- **Ongoing already has one fewer card than you would expect.** A repair the
  captain has to act on does not belong in Ongoing — Ongoing means someone else
  has it. The moment a bike is Ready the next move is his, so the card returns to
  Pending. That runs on load and again every time a token reports in.
- **Tap a token.** It loads into the details screen with its own name, badge and a
  fresh checklist.
- **Drag the sheet up.** The badge, name and subtext travel from the card into the
  app bar and dock there; the progress bar goes with them and turns into the strip
  under the bar.
- **Get feedback** opens the customer feedback page. Record — with pause, because
  the captain is holding a conversation and people stop to think — and the clip
  arrives with a written summary. Your own note can be typed or recorded; both
  end up as the same component.
- **Mark parked**, then watch the workshop run: In queue → Assessment → Faults
  marked → Under repair → Quality check → Ready. The footer stays disabled
  throughout, because there is nothing for the captain to do but wait.
- **Tap any checklist row with a chevron** for that step's own page. The row is
  status; the page is what happened.
- **Puncture** records what the captain fixed himself, then closes the token.
- **Others** offers unserviceable or a swap. A swap changes the token's type and
  closes it once the replacement is handed over; **Bike Unavailable** closes it as
  unserviceable instead, since there is nothing to hand over.
- **Go back** and the queue reflects all of it.

## How the two screens share one file

They are merged, not iframed. `stitch.py` lifts the queue out of
`token-task-list/prototype.html`, and `assemble.py` composes it with the details
screen and Sagar's stylesheet.

The two were written independently and share **57 class names** — `appbar`,
`body`, `header`, `chip`, `is-active`, `phone`. Merged raw, each restyles the
other. Sagar hit this porting the issues screen into `stitched-flow` and his
stylesheet says how he settled it: *"prefixing keeps her declarations off this
app's elements, scoping keeps this app's off hers."* So `stitch.py` does both:
every class in the queue gains a `tl-` prefix, every id a `tl` prefix, and every
rule is scoped under `#scrList`.

**If you touch `stitch.py`, read its comments first.** Renaming class names in
JavaScript looks trivial and is not. Three approaches failed before the one in
there worked:

- matching `.name` anywhere renamed property access — `S.chip` became `S.tl-chip`
- guarding that with a lookbehind then skipped the second class of every compound
  selector, so `.tab.is-active` kept an unprefixed half and matched nothing
- scanning for string literals to confine the rewrite desynchronised on nested
  template literals inside `${}` holes, where a `}` in a nested template's text
  ended the hole early

It now rewrites four narrow forms only — `class="..."`, `classList.*('name')`,
the `querySelector` family, and `className =` — and treats `${}` holes as code
rather than text. Two more traps worth knowing: the queue's `* { box-sizing }`
reset has to be **scoped, not dropped** (without it the chips compute to 78px
tall and overflow their row), and id renames must be restricted to where ids are
actually used, or `class="chips"` inside a template literal becomes
`class="tlChips"` and the row loses every rule that styled it.

## The contract between them

The queue owns the data. The details screen reports into it through
`window.TokenQueue`, three calls wide:

| call | direction | when |
|---|---|---|
| `TokenQueue.onOpen(token)` | queue → details | a card is tapped |
| `TokenQueue.progress(p)` | details → queue | every step or stage change |
| `TokenQueue.show()` | details → queue | returning to the list |

`progress` carries `{token, step, done, of, stage, percent}` and moves the card
between Pending, Ongoing and Completed. Everything else each screen still emits
on its own `window.Yuzen` hooks, unchanged, so either can be pulled back out.

## Notes

- **The identity is one node that travels**, not two that cross-fade. Two copies
  is the obvious build and it renders the name twice. It is glue plus a clamp
  rather than an interpolation: the card and the identity travel nearly the same
  distance, so any blend leaves the name in mid-air.
- **One progress bar, and it travels too.** A docked strip fading in while the
  card still showed its own row put two progress bars on screen at once, which is
  what read as an abrupt transition.
- **Progress never goes backwards once a token has swapped.** Converting discards
  the workshop fraction the token had earned — 53% became 50% — and a ring that
  steps back reads as a bug to whoever is watching the queue. Before a conversion
  it can still fall, which is correct: deleting the recording really does undo
  that step.
- **A chevron only appears once a step has something to show.** An empty page that
  explains it is empty is worse than no affordance.
- **One recorder component**, used on the feedback page and in the step rows.
  Only the trailing control differs.
- The workshop stages are duplicated in both screens deliberately and kept
  identical, so the same bike cannot report two different states.

## Open questions

- **Sheet titles.** The live app says *Select action for Unserviceable*; the Figma
  frame says *Reason for unserviceability*. The frame's copy is used here.
- **Chips or radio rows** for the reasons. The frame uses chips, the live app uses
  radios. Chips here.
- The workshop stages and the two faults are still mock. The real faults live in
  [`mechanic-rnm-flow/issues`](../mechanic-rnm-flow).
- The captain's recording is not yet visible to the mechanic in
  [`stitched-flow`](../stitched-flow). Deliberate for now — each profile is being
  shown its own flow, so the content can differ while they are demoed separately.
