# Stitched flow — Yuzen Mechanic

A self-contained HTML prototype (390×844 mobile frame) of the mechanic's flow with
the screens **joined up**, rather than as separate prototypes: Home → a task queue →
a bike → its task page → the work itself → and back.

## Two files, on purpose

| File | Whose | What is in it |
|---|---|---|
| `prototype.html` | Mridul's electrical-checks version | Electrical starts empty and faults appear only once a check has confirmed them, revealed one at a time behind a loader above the CTA. Snapshot of 5 Aug, plus his 6 Aug changes. |
| `prototype-v2.html` | Sagar's 6 Aug build | Servicing checks stitched in, RnM command cards fully tappable, and the Issues screen taking the opposite line on electrical faults — see below. |

They are not two versions of the same thing. On the **Issues** screen they answer
the same question differently, and that is an open design decision rather than a
merge that has not happened yet:

- `prototype.html` — a fault is not real until the bike reports it. The list is
  empty until you run the checks.
- `prototype-v2.html` — the faults are already filed, and running the checks
  *adjudicates* them: ones that come back clear are struck through and their
  control greys out, ones the bike still reports revert to unresolved even if a
  mechanic had marked them done by hand.

v2 was added alongside rather than over the top so neither is lost while that is
being settled. Whichever wins, the other file should go.

Snapshot of 5 Aug 2026; v2 is 6 Aug 2026.

## Run it

Open `prototype.html` in a browser — double-click, or:

```bash
open prototype.html
```

No build step, no server, no network. Satoshi, the part renders and the customer
photos are all embedded as data URIs, so it works offline on a phone in a service
centre. Nothing in the file points at the filesystem or at a CDN.

> **Open it in an actual browser.** Inline preview panes (Slack, Notion, GitHub's
> file viewer) sandbox JavaScript. The checklist will render — it is pre-rendered
> into static markup on purpose — but nothing will respond to touch. AirDrop it to
> a phone to feel the swipes and the transitions properly.

## What is stitched together

| Screen | What it does |
|---|---|
| **Home** | Shift status, 2×2 task counts, workbench shortcuts, bottom nav |
| **Bike Assessment** | The queue — chips, wait times, battery, sort by wait |
| **Repairable bikes** | Live / In-flow / Stock, `Assigned to me` sorted to the top |
| **My tasks (tokens)** | Barun's token queue, opened from Home's Active tokens card |
| **Task page** | One template, two task kinds — a stepper, a hero, a progress strip |
| **Feedbacks** | Read-only, opened from the repair task's Feedback step |
| **Assessment checklist** | Swipe right good / left faulty across 17 parts |
| **Mark faults** | Detail every part marked faulty; severity, damage, photos |
| **Bike photos** | Four sides, camera capture |

### The paths that work end to end

- **Home → Bike assessment → a bike → Start task → checklist → mark faults → photos
  → Checklist done** — returns to the task page with step one ticked and the
  progress bar advanced.
- **Home → Repairable bikes → a bike → View Feedbacks → Okay** — returns with
  Feedback done and the CTA now reading `Start RnM`. Feedback stays re-openable.
- **⋮ → Minimize** from any screen in a task — parks the task as a band at the foot
  of the listing it came from, with a progress bar across its top. Tapping it
  resumes on the exact screen it was minimised from, mid-swipe. **One task per
  kind**, so an assessment and a repair can both be parked at once; starting a
  second task of the *same* kind asks before discarding.

## Not wired

`Filters`, `Sort by`, search, the scan FAB, `Bike commands`, `Report issues on
bike`, `Play to learn`, `Watch video`, `Remove battery`, `Drop in Repairable Bike
Area`, `Dropped bikes`, the workbench shortcuts, `View all`, and the Performance /
Profile nav tabs. They all report and stop rather than failing silently.

There is **no reset** — a completed run needs a page reload before the next demo.

## Source

Not in this folder. This is a build artefact: one file assembled from a folder of
per-screen CSS / markup / JS, with every asset inlined and the checklist
pre-rendered by headless Chrome.

`bike-assessment/` in this repo holds an **earlier** source tree (3 Aug, Assessment
+ Mark Faults only, built from a single `src/template.html`). It did not produce
this file and the two have diverged — that tree predates the split into per-screen
files, the eight screens added since, and the task/minimise model. Treat
`bike-assessment/` as the older prototype, not as this one's source.
