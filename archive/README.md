# Archive: earlier prototypes

These are the standalone prototypes that came before the main flow. Each one
either gave a screen to `bike-assessment/` or was replaced by it. They're kept
as they were, so they still repeat some of the main flow's images, icons and
videos. Nothing here is built, tested or linked from the landing page. Each
folder's own README covers that prototype.

| Folder | What it is | Author |
|---|---|---|
| `assessment-flow/` | Assessment checklist, which became the main flow's screen 1 | Barun Sethi |
| `token-details/` | A token's detail page | Barun Sethi |
| `token-flow-captain/` | The captain's token flow | Barun Sethi |
| `mechanic-checks/` | Mechanic checks | Vaishnavi |
| `qc-task-list/` | Task list | Vaishnavi |
| `wynn-xp/` | Wynn XP vehicle control | Vaishnavi |
| `add-issues/` | Add issues flow | Mridul Goyal |
| `quality-associate-flow/` | Quality Associate (QC) flow | Mridul Goyal |
| `mark-faults/` | Mark faults, which became the main flow's screen 2 | Sagar Malik |
| `RnM-home-page/` | RnM home, ported into the main flow's `rnm` screen | shared |
| `token-task-list/` | Token queue | shared |
| `mechanic-rnm-flow/` | Mechanic RnM flow | shared |
| `stitched-flow/` | An early stitch of the screens above | shared |

Each prototype can be opened at `archive/<folder>/prototype.html`, both locally
and on the published site. `mechanic-rnm-flow/` is the exception: it has one
prototype per subfolder. Links between them still work because they're
still in the same folder as each other. `mechanic-rnm-flow/issues/build.py`
reads photos from `../../bike-assessment/src/assets`; its path was updated
when it moved here.
