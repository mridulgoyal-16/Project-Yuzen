# Mechanic RnM flow — Yuzen

Two screens, stitched: the issues filed against a bike, and the screen for marking
new ones.

| Folder | Screen | Figma |
|---|---|---|
| [`issues`](issues/) | Issues on a bike, split Electrical / Mechanical, tick to resolve | `1993-30331`, `1993-30576` |
| [`mark-issues`](mark-issues/) | Mark Issues — part grid, zone lists, chip sheet | `2052-16043`, `2014-14800`, `2052-16205`, `1993-30539` |

## Walking the flow

```bash
python3 -m http.server        # from the repo root
# then open http://localhost:8000/mechanic-rnm-flow/issues/prototype.html
```

On **issues**, the Mechanical section's footer reads **Mark Issues** and opens
`mark-issues`; its back arrow returns. That is the whole stitch — two hook bodies
in `window.Yuzen`, one per screen, and neither screen's own code knows the other
exists.

Both `prototype.html` files also open by double-clicking, with no server: fonts,
photos and glyphs are inlined. Serving them is only needed to follow the links
between the two.

**State does not survive the hop.** Each screen is its own document, so marks made
in `mark-issues` do not come back as rows in `issues`. That is fine for walking a
tester through the flow, and wrong if the point is to demonstrate the data moving
— which would need sessionStorage or one combined document.

## Both are generated

`prototype.html` in each folder is built. Edit `template.html` and run that
folder's `build.py`; a direct edit to the built file is lost on the next build.

Both lift their shell — frame, tokens, type, status bar, app bar, scroll region,
progress bar, footer, options sheet, and (in `mark-issues`) the part sheet and its
chips — verbatim out of `../mechanic-checks/prototype.html`, so the three screens
carry one set of furniture and cannot drift apart. The build fails loudly if that
file's section markers move.

Editing `mechanic-checks` therefore leaves both of these stale until rebuilt:

```bash
python3 mechanic-rnm-flow/issues/build.py
python3 mechanic-rnm-flow/mark-issues/build.py
```

Each folder's own README carries what to try, the hook table, the deviations from
the frames, and what is still open. Read those before testing —
`mark-issues/README.md` in particular flags that three tiles are labelled
"Display", which a tester cannot tell apart.

## Note on mark-issues

`../add-issues/` is Mridul's prototype of the same screen, built from the same
frames. Neither replaces the other yet; the team has to pick. `mark-issues` is the
one on this shell, with the shared app bar, hairlines and chip states.
