# Token details — Yuzen

What a captain sees inside a token, and the work he does there. **This folder is
the screen on its own, with nothing in front of it.** It is meant to be wrapped:
the captain's version is [`token-flow-captain`](../token-flow-captain), which puts
his queue in front of it, and the mechanic's and QC's flows can do the same with
their own lists without touching anything here.

From [Token 2349:26167, Expanded view 2349:26389, Others 2367:26652, Reason for
unserviceability 2367:26917, Customer feedback 2347-26022](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=2151-21039).

## Run it

`prototype.html` is self-contained — fonts, icons and the bike inlined — so it
opens by double-clicking.

```bash
python3 assemble.py     # rebuild after editing _flow.js or the markup
```

`assemble.py` composes `_job.css` and `_flow.js` into the page. It is also
importable: `build(with_queue=True, list_dir=...)` is what the captain's flow
calls to compose a queue alongside the screen.

## What to try

Opens on token 08, Service tab, step one.

- **Drag the sheet up.** The badge, name and subtext travel from the card into the
  app bar and dock; the progress bar travels with them and becomes the strip under
  the bar. Scroll back and they return.
- **Get feedback** opens the customer feedback page. The recorder has three
  states: a mic to start, pause and stop while running, then the clip with a
  written summary. Pause matters — the captain is mid-conversation and people stop
  to think. Your own note can be typed or recorded; recording replaces the field
  with the same component the customer's uses.
- **Mark parked**, then watch the workshop: In queue → Assessment → Faults marked
  → Under repair → Quality check → Ready. The footer stays disabled throughout,
  because there is nothing for the captain to do but wait.
- **Any row with a chevron** opens that step's own page. The row is status; the
  page is what actually happened. A chevron only appears once there is something
  to read.
- **Puncture** records what the captain fixed himself, then closes the token.
- **Others** offers unserviceable or a swap. A swap keeps the token alive and
  changes its type from Service to Swap: assign a replacement, hand it over, and
  *that* is what closes it — a swap is not finished until the driver has a bike.
  **Bike Unavailable** is the exception: with nothing to hand over there is no
  swap to complete, so it takes the unserviceable route out and closes the token
  there. Unserviceable closes it directly, and picking *Others* as a reason asks
  for a comment, holding Submit until it is at least 5 characters.

## Wiring it into a flow

Everything outbound goes through `window.Yuzen` at the top of `_flow.js`.

| Hook | Fires when |
|---|---|
| `onBack` / `onMore` / `onLearn` | app bar and overflow sheet |
| `onTab(tab)` | Service / Puncture / Others |
| `onOpenFeedback` / `onOpenStep(id)` | a page opens |
| `onRecord(state, seconds)` | `start` · `pause` · `resume` · `stop` · `delete` |
| `onDictate(on)` | the mic in the captain's field |
| `onStage(stage, pct)` | the workshop moves on |
| `onOutcome(kind, reason)` | puncture, swap or unserviceable is confirmed |
| `onProgress(p)` | **every** step or stage change |

`onProgress` carries `{token, step, done, of, stage, percent}` and is the one a
list needs: it drives a progress ring. It fires 25 → 50 → 53 → 57 → 64 → 70 → 75
→ 100, folding the workshop stage into the 50→75 stretch on purpose, so a ring
does not freeze for the whole repair.

**To put a list in front of this screen**, there are two seams and nothing else:

- `openToken(t)` loads a token and resets the flow. Call it from your list.
- `window.TokenQueue` — if it exists, the screen reports progress into
  `TokenQueue.progress(p)` and returns to it on back. If it does not exist, the
  screen runs perfectly well alone and the back arrow just fires `onBack`.

`token-flow-captain` is the worked example.

## Notes

- **Everything visual is lifted verbatim.** `_job.css` is Sagar's entire
  `stitched-flow` stylesheet, unedited — the hero, collapsing bar, title block,
  step rows, rail, footer, and the whole `.screen--feedback` component set.
  Additions sit in a marked block after it. Taking a stylesheet **whole** is the
  only approach that has worked here; extracting the rules I thought I needed
  rendered the screen black with a serif fallback.
- **The identity is one node that travels**, not two that cross-fade. Two copies
  is the obvious build and it renders the name twice. It is glue plus a clamp
  rather than an interpolation, because the card and the identity travel nearly
  the same distance and any blend leaves the name in mid-air.
- **One progress bar, and it travels too.** A docked strip fading in while the
  card still showed its own row put two progress bars on screen at once, which is
  what read as an abrupt transition.
- **`.jb__prog` needs `display:block` in the dock.** It is a flex item in the
  card's row, which blockifies it; the dock's parent is a plain div, so the span
  stayed inline — and an inline box whose only child is a block paints its
  background nowhere. It measured 390×6 and drew nothing.
- **The rails live outside the rows.** `render()` replaces the rows wholesale, and
  a node inserted and sized in the same tick has no previous height to transition
  from, so the fill jumped to the next dot instead of travelling to it.
- **One recorder component**, on the feedback page and in the step rows. Only the
  trailing control differs: playback speed, or delete.
- **Progress cannot fall once a token has swapped.** Converting discards the
  workshop fraction it had earned; a ring that steps backwards reads as a bug.
  Before a conversion it can still fall, which is correct — deleting the recording
  really does undo that step.
- **Testing note:** in headless Chrome under `--virtual-time-budget`, setting
  `scrollTop` fires no `scroll` event and CSS transitions do not advance. Dispatch
  `new Event('scroll')`, and assert assigned inline styles rather than computed
  ones.

## Settled

- **A swap closes the token, but on handover, not on approval.** The live app
  closes it the moment the reason is submitted; here the token stays open through
  assigning and handing over the replacement, because until the driver actually
  has a bike the work is not done. It ends with the same confirmation either way.
- **Bike Unavailable is not a swap**, it is the absence of one, so it closes the
  token as unserviceable rather than converting to a swap that could never be
  completed.

## Open questions

- **Sheet titles and controls.** The live app says *Select action for
  Unserviceable* with radio rows; the Figma frame says *Reason for
  unserviceability* with chips. The frame is followed here.
- The workshop stages and the two faults are mock. The real faults live in
  [`mechanic-rnm-flow/issues`](../mechanic-rnm-flow).
