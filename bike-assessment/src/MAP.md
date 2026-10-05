# Where things live

This is the developer guide for the main flow: how to build it, test it, find
things and avoid the known traps. Read it before grepping; it exists because a
small change used to take six searches to find the three files it touched. For
what the flow does and why it's designed that way, see `../README.md`. For
how the repo is laid out and published, see the root `README.md`.

## The loop

```bash
cd bike-assessment
python3 src/build.py          # ~4s   → src/prototype.dev.html + ../yuzen-flow/index.html
python3 tests/flowtest.py     # ~5s   behaviour assertions
python3 tests/geomtest.py     # ~4s   measured-geometry assertions
```

Both suites must end with `N/N passed`. Then serve the repo root and open the
dev build:

```bash
python3 -m http.server 8412   # from the repo root
# http://localhost:8412/bike-assessment/src/prototype.dev.html
```

**Serve it; don't open the file directly.** On a `file://` URL the page renders,
but scripts don't run in most preview panes, so nothing responds to a tap.

**Work in `src/prototype.dev.html`.** It's the same page with assets loaded by
path, about 1.1 MB instead of about 7.2 MB, and it isn't committed. Selecting
an element for review costs a few hundred tokens there, while one `<video>` in
the shipped build costs about 145k. The dev build has to stay inside `src/`,
next to `assets/`, or every image 404s.

`../yuzen-flow/index.html` is the self-contained deliverable: one file, every
asset inlined. **Never edit it by hand**, because each build overwrites it.

### If Chrome is missing

`build.py` and both suites find Chrome through `_find_chrome()`. They try the
`CHROME` env var first, then the usual macOS and Linux paths, then `PATH`.
Without Chrome:

- **build.py still works**, but prints `WARNING pre-render failed, shipping
  JS-only build`. The flow works in a browser, but without pre-rendered static
  markup it won't render in a viewer that blocks JS.
- **Neither suite can run.** Both drive the built file in headless Chrome.

## The build is an explicit list

`src/build.py` holds `CSS_ORDER`, `HTML_ORDER` and `JS_ORDER`. **A new file has to
be listed in the right one.** A file on disk that no list mentions fails the build.
Order matters twice over. One bundle means one global scope, so a `const` used
at load time must be declared by an earlier file. Two files declaring the same
name is a SyntaxError that kills everything after it.

Assets are referenced by relative path (`url(assets/…)`, `src="assets/…"`, or a
quoted `"assets/…"` in JS) and inlined by reading that path. Anything under
`assets/` that nothing references isn't shipped. The build refuses to write a
deliverable that still points at the filesystem. The rationale is in the
`build.py` docstring.

## Screens

Each screen is `src/screens/<name>/`, with `markup.html`, `style.css` and
`script.js`. The router (`shared/router.js`) maps a route name to a
`<section>` id.

**24 routes, 18 elements.** `ORDER` in `shared/router.js` is the source of truth.

| Route | Element | Notes |
|---|---|---|
| `home`, `shift`, `start` | own | entry points |
| `task`, `qc`, `repair`, `assessdone`, `allocation`, `allocated` | `#scrQueue` | **one screen, SIX routes**, see below |
| `job`, `token` | `#scrJob` | one screen, two routes; keep the aliases adjacent in `ORDER` |
| `rnm` | `#scrRnm` | the repair dashboard |
| `checklists`, `visit` | own | opened from `rnm`, return to it; adjacent to it in `ORDER` |
| `checks`, `issues`, `markissues` | own | the two issue screens |
| `assess`, `faults` | own | the assessment flow |
| `alloc`, `alloctime` | own | allocation |
| `feedback`, `complaint`, `tokens` | own | |

There's no `photos` route or screen. It was moved to `../archive/`, and that
README explains how to restore it.

Two roles share the shell:

- **Mechanic**: home → a task queue → `job` → `assess` → `faults`. For a repair,
  it's `job` → `rnm` dashboard → `checks` / `issues` → `markissues`.
- **Captain**: home → `tokens` queue → tap a row → `token` detail → Start →
  `complaint`.

`#scrJob` is the one screen behind "Assessment details", "Task details" and
"RnM details". The design team refers to screens by these user-facing names,
not by their ids.

### Four screens were ported in from separate prototypes

`rnm`, `checks`, `issues` and `markissues` came from the prototypes now in
`../../archive/`. That's why their class names carry prefixes (`iq-`, `mi-`,
`ck-`) and their CSS is scoped under the screen id. The porting recipe and
every failure mode are documented at the top of `screens/checks/style.css`.
Read that before porting anything else in.

## The two templates: change the config, not a screen

- **Task listings** (`Assessment pending`, `QC pending`, `Repairable bikes`,
  `Assessment done`, `Allocation`, `Allocated`) are one page, `screens/queue/`.
  What each one contains is set in `shared/queue-kinds.js`, and the bikes are in
  `shared/fleets.js`. Adding a queue means adding a config entry, not a screen.
- **Task detail** is `screens/job/`, configured by `shared/task-kinds.js`.

## Shared chrome (not inside any screen)

| File | Owns |
|---|---|
| `shared/sheet.js` | the ⋮ sheet component (open/close/drag) |
| `shared/sheet-config.js` | **what is in it, per screen**; edit here, not in a screen |
| `shared/commands.js` | the persistent Bike commands sheet |
| `shared/minitask.js` | parked task band + confirm dialog |
| `shared/morph.js` | the ghost that flies task ↔ parked card |
| `shared/icons.js` | every glyph |
| `shared/base.css` | tokens, type scale, **the screen transition** |
| `shared/config.js` | `AUTO_ADVANCE`, `CAMERA_MODE`, `MAX_PHOTOS`; see `../README.md` § Config |

## RnM dashboard, split by region

`screens/rnm/` used to be one 799-line stylesheet. It's now split into
`style.css` (shell), `hero.css`, `vitals.css`, `tasksheet.css`, `parts.css`,
`commands.css`, `footer.css`, `tabbar.css` and `bikeinfo.css`, all listed in
order in `CSS_ORDER`.

**It doesn't scroll** (Figma 2470:40192 / 2470:40826). Every block is
absolutely placed on a set line, and the whole 844 is accounted for: hero
0→476, readings 420, commands 488, progress 714, footer 720. Commands sit
inline (`commands.css`). Open tasks is a bottom sheet the footer raises, and
it's the resting state (`tasksheet.css`). Part exchange is its own overlay off
the ⋮ (`parts.css`).

The class `is-tasks` on `#scrRnm` holds the whole open-tasks state. It shrinks
the hero to 426, moves the bike and the readings up, hides the footer's text
button and stretches the pill to full width. Set it in one place
(`setTaskSheet`) and CSS moves the rest. The sheet can be swiped down from
anywhere on it once the finger has moved `DRAG_MIN` (8px) downward. The vitals
card itself is `shared/vcard.css`, the same component the Bike commands sheet
uses; only its placement and its read/alert states are defined here.

On this screen, ⋮ → Bike commands does **not** raise the shared sheet. It
calls `rnmShowCommands()`, which lowers the task sheet to show the grid this
screen already has. Raising the shared sheet would put two Power buttons on
one screen.

`script.js` is still one file. It's a single IIFE wrapping about 40 consts
that must not reach the global scope, so it can't be split without unwrapping
it.

## The PWA sidecars, and the service worker that looks like a mistake

The published folder `../../yuzen-flow/` holds `index.html` plus seven sidecars:
`version.txt` (written by each build), `manifest.webmanifest` and `sw.js`
(hand-written, only here), and four icons (made by `src/pwa/make-icons.py` from
`src/pwa/source-icon.png`). The build checks that the sidecars are present but
doesn't copy them, so each one exists exactly once.

**`index.html` and `version.txt` must be committed together.** The page
compares its built-in build id with `version.txt`. If they're committed
separately, field testers either see an old version or the page keeps
reloading. Use `git add -A`, never `commit -am`: `-am` only stages files git
already tracks, so a new sidecar gets left out without any warning.

**`sw.js` ships on purpose. Don't delete it.** It's registered in
`shared/install.js`, and it is *not* a caching worker:

- no Cache Storage, no precache, no stale-while-revalidate
- its only `fetch` handler is a bare network pass-through for navigations
- `skipWaiting()` on install, `clients.claim()` on activate
- registered with `updateViaCache: "none"`

It can't serve a stale response. It exists only because Chrome won't show the
**install prompt** for a page without a `fetch()` handler, so without it field
testers get no install banner. (The `⋮ → Install` menu item dropped that
requirement in v108, but the prompt still has it.)

The trade-off: **there's no offline mode.** With no signal, the app fails
exactly as it would with no worker. `version.txt` is the only way it picks up
new versions.

Say "no *caching* service worker by design". The shorter version of that
sentence once sent a session looking for a bug that didn't exist.

## Tests

The suites check **relationships rather than absolute positions** where they
can. Sizes, insets and the gaps between neighbours are exact. Where something
sits is checked against the thing above it, or the frame edge it anchors to.
Both harnesses run in a 460×1000 window. At 900 the frame shrinks to fit, so
those checks have to hold at both sizes. When a layout changes, fix the CSS
rather than loosening an assertion. If an assertion encodes a *decision*
rather than a *contract*, loosening it is fine. A few absolute x and y pins
remain in geomtest outside the RnM block; relax them as they break.

- `flowtest.py` asserts an **exact** embedded-image count. Adding or removing
  artwork changes it. The exact count catches an asset that failed to inline
  without any error, so update the number rather than loosening the check.
- **`flowtest.py` writes `⋮` in two ways.** Some lines have the six literal
  characters `⋮` and others have the real glyph. They look the same in
  an editor. Find both with `grep -n '\u22ee'` and `grep -n '⋮'` before
  editing, and check bytes with
  `python3 -c "s=open('tests/flowtest.py').read().split(chr(10)); print(repr(s[805]))"`.
- Prefer line-index edits to string matching in the suites, and re-print the
  region after any splice.
- A browser only dispatches `focus` when its window has focus, so `.focus()`
  in a preview pane sets the caret but fires no event. Bind the tap instead.
- In a live preview pane, `getComputedStyle` at t=0 returns pre-transition
  values, and rAF and timers freeze between tool calls. Take a screenshot to
  wake the pane, and turn off transitions before measuring geometry.

**Animation rule: nothing about a resting state may depend on an animation
finishing.** Prefer CSS transitions to rAF loops, and use `setTimeout` to
guarantee where things end up. rAF is throttled to nothing in a background tab.

## Traps that have cost real time

1. **Pre-render idempotency.** The build ships the *rendered* DOM, so any
   load-time DOM change runs twice: once in headless Chrome at build time and
   once in the browser. Anything that appends or stamps nodes must clear first
   (`el.innerHTML = ""`), or you get two of every tab. Setting `textContent`,
   `innerHTML` or a style is safe to repeat; appending isn't. This has caused
   bugs at least five times.
2. **`http://` anywhere fails the build.** Strip `xmlns` from exported SVGs.
3. **No base64 in source.** It once lived in three script and style files, a
   megabyte on one line, which made them unreadable and the dev build
   pointless. Extract to `assets/extracted/` and reference by path. Reuse an
   existing file rather than extracting a second copy of it.
4. **geomtest crashes rather than fails** when a measured selector is null.
   The harness reports a JSON decode error, not a failure list, so a passing
   run only counts if it printed a number. Wrap CHECKS in try/catch to see the
   stack.
5. **Don't assert a mid-transition `transform` in a test.** Headless virtual
   time doesn't tick CSS transitions reliably. Assert `data-pos` and the
   z-layer, which are set synchronously.
6. **`.screen` is already `position:absolute`.** Don't add `position:relative`
   to `#scrRnm`. It puts the screen back in flow, so it sizes to its content
   instead of the 844 frame. That cost an hour.
7. **A sheet parked with `translateY(100%)` only clears its own height.** The
   RnM task sheet is drawn 264 tall but sized to the frame's bottom for exactly
   this reason. At 264 it only cleared 714, so on any frame taller than 844 its
   last rows sat below the footer in plain view.
8. **`document.querySelector(".appbar")` returns the first one in the
   document,** not the screen's. Scope bare queries to the screen element.
   Getting this wrong once threw inside one screen's init and took down every
   later script in the bundle.
9. **`tap()` isn't a global.** Screens that use one declare it inside their
   IIFE. An unwrapped screen calling `tap()` throws mid-handler and leaves
   state changed but the DOM stale.
10. **`screens/assess/style.css` is unscoped.** Its `.card`, `.item` and `.row`
    rules leak onto anything that shares those names.
