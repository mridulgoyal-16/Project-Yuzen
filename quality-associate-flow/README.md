# Quality Associate Flow — Yuzen QC

A self-contained HTML prototype (390×844 mobile frame) of the Quality Associate's flow
tailored for QC (Quality Check) operations. Built from the stitched-flow pattern with
the screens **joined up**: Home → QC task queue → a bike → its QC task page → sequential
QC workflow steps → back.

Snapshot of 5 Aug 2026 — QC prototype.

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

**Quality Associate Profile — QC Focus:**

| Screen | What it does |
|---|---|
| **Home** | Shift status, 4 QA task widgets (Revive, Assessment, QC pending, RTD pending), workbench shortcuts, bottom nav |
| **QC Task List** | The QC queue — wait times, battery, bike details, sorted by wait |
| **QC Task Detail** | Sequential workflow with 4 steps: Connect bike → Electric checks → Mechanical checks → Park bike |
| **QC Workflow Steps** | Placeholder screens for each of the 4 QC workflow steps (to be stitched from separate folders) |

### The paths that work end to end

- **Home → QC pending → a bike → Task detail page with 4 QC steps** — shows sequential
  unlock behavior: Step 1 (Connect bike) is enabled, Steps 2-4 are locked/disabled.
  Progress bar shows 0% at start (25% per completed step).
- **Navigation between workflows** — Back button returns to task detail page from any
  workflow step. Completed steps are marked with tick, unlocking the next step.
  
### Prototype scope

This prototype covers **Home → Task List → Task Detail with sequential steps**.
The actual workflow screens (Connect bike, Electric checks, etc.) will be stitched in
from separate prototype folders later. For now, clicking a locked step shows a
"not wired yet" message.

## Not wired (QC prototype scope)

The 4 QC workflow steps themselves (Connect bike, Electric checks, Mechanical checks,
Park bike in RTD pending area) are not wired — clicking a locked step shows "not wired
yet" message. These will be stitched in from separate prototype folders.

Also not wired: search, the scan FAB, workbench shortcuts, `View all`, and the
Performance / Profile nav tabs. They all report and stop rather than failing silently.

There is **no reset** — a completed run needs a page reload before the next demo.

## Source & Adaptation

This is adapted from the `stitched-flow/` prototype (5 Aug 2026). The prototype.html
file was copied and modified to:
- Change homepage task widgets from [Active tokens, Dropped bikes, Bike assessment, 
  Repairable bikes] to [Revive bikes, Bike assessment, QC pending, RTD pending]
- Add a new "qc" task kind with 4 sequential QC workflow steps
- Update task list routing to support both "assessment" and "qc" task kinds
- Implement sequential unlock behavior (only current step enabled, others locked)

The same stitched-flow architecture powers both workflows — only the task kind and
step definitions differ. Both workflows reuse the same bike fleet, navigation model,
and progress bar calculation (equal 25% per step for QC vs. weighted phases for
Assessment).
