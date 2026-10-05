# Archive

Screens taken out of the flow but kept whole, in case they come back. Nothing in
here is built: `src/build.py` only reads the files named in its three ORDER
arrays, and its "every file must be listed" guard only walks `src/shared/` and
`src/screens/` — so a folder under `archive/` is invisible to the build rather
than merely unlisted.

## bike-photos-screen/  (was `src/screens/photos/`)

Screen 3 of the assessment: four tiles, one photograph per side of the bike,
captured through the same camera path Mark penalties uses.

It also carried **Checklist done** — the button that advanced the job to *Remove
battery* and sent the QCA back to the task page. That job did NOT move onto Mark
penalties' footer button. Mark penalties now ends with *Done*, which returns to
the assessment dashboard, and the step is closed from the dashboard's own Done —
so the step advances in one place instead of two.

### Putting it back

1. `mv archive/bike-photos-screen src/screens/photos`
2. Add its three files back to `CSS_ORDER`, `HTML_ORDER` and `JS_ORDER` in
   `src/build.py`, in their old positions (after the `faults` entries).
3. `shared/router.js` — restore `"photos"` in `ORDER`, the `photos:` entry in the
   screen table, and the `if (name === "photos") renderBikePhotos();` hook.
4. `shared/camera.js` — restore `captureSide()` and the `pendingSide` branch in
   the change listener. It is the only other place `bikePhotos` was written.
5. `shared/sheet-config.js` — restore the `photos:` row so the screen gets a
   ⋮ menu again.
6. `screens/faults/script.js` — `submitBtn` should `goTo("photos")` instead of
   `goTo("rnm")`; `screens/faults/markup.html` — the label goes back to
   `Bike photos`. The screen's own `reviewBtn` still carries `jobAt = 1;
   goTo("job")`, so nothing has to be moved back off Mark penalties.
7. `shared/task-kinds.js` — restore the `photos` progress phase at `pct:10` and
   put `checklist` back to 35 and `faults` back to 15.
8. `screens/job/script.js` — restore the `photos` sub-task in
   `assessSubtasks()`.

`SIDES` and `bikePhotos` are declared in the screen's own script, so nothing
outside it can read them while it is archived — which is why steps 4, 7 and 8
are not optional.
