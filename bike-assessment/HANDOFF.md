# Handoff — Yuzen mechanic + captain flow

Everything here is about **one deliverable**: the stitched flow, built from
`bike-assessment/src/` into a single self-contained `prototype.html`.

---

> **Stale as of 21 Sep 2026.** This is the oldest of three handoffs. For git,
> auth and the current screen map, read `../HANDOFF-local.md` and `src/MAP.md`
> instead — they are maintained. Kept for its rationale.

## 1. Start here

```bash
cd bike-assessment
python3 src/build.py          # writes prototype.html
python3 tests/flowtest.py     # 465/465
python3 tests/geomtest.py     # 178/178
```

Then serve and open it:

```bash
python3 -m http.server 8412   # from the repo root
# http://localhost:8412/bike-assessment/prototype.html
```

**Serve it — do not open the file directly.** As a `file://` URL it renders but
scripts do not run in most preview panes.

### If Chrome is missing

`build.py` and both suites resolve Chrome via `_find_chrome()`: the `CHROME`
env var, then the usual macOS and Linux paths, then `PATH`. Without it:

- **build.py still works** — prints `WARNING pre-render failed, shipping
  JS-only build`. The flow is fine in a browser; it just has no pre-rendered
  static markup, so it will not render in a JS-sandboxed viewer.
- **Neither test suite can run.** Both drive the built file in headless Chrome.

---

## 2. The shape of it

```
bike-assessment/
  prototype.html          generated, ~6 MB, self-contained. NEVER EDIT.
  src/
    build.py              assembles, inlines assets, pre-renders
    shell.html            the phone frame
    shared/               router, options sheet, icons, toast, base.css
    screens/<name>/       markup.html + style.css + script.js
    assets/
  tests/
    flowtest.py           465 behaviour assertions
    geomtest.py           178 pixel-geometry assertions
```

`build.py` assembles from three explicit ordered lists — `CSS_ORDER`,
`HTML_ORDER`, `JS_ORDER`. **A new screen must be added to all three or it is
silently absent from the build.**

### The one trap that keeps recurring

The build ships the **pre-rendered DOM**, so any load-time DOM mutation runs
twice — once at build time in headless Chrome, once in the browser. Anything
that appends or stamps nodes must clear first:

```js
el.querySelectorAll(".thing").forEach(t => t.remove());   // then build
```

This has bitten **five** times: icon stamping, `renderTabs()`, `buildTabs()` on
two screens, and the drawn keyboard on the complaint screen.

---

## 3. The screens

`src/shared/router.js` holds the order — **24 routes, 18 screen elements**.
`src/MAP.md` has the accurate route→element table; prefer it over this list.

```
home  task  repair  tokens  job  feedback  token  complaint
rnm   checks  issues  markissues  start  assess  faults  alloc
alloctime  shift  checklists  visit  assessdone  allocation  allocated
```

Two roles share the shell:

- **Mechanic** — home → a task queue → `job` → `assess` → `faults`.
  For a repair: `job` → `rnm` dashboard → `checks` / `issues` → `markissues`.
- **Captain** — home → `tokens` queue → tap a row → `token` detail →
  Start → `complaint`.

`#scrJob` is the single screen behind what Sagar calls "Assessment details",
"Task details" and "RnM details". He refers to screens by their user-facing
names, not their ids.

### Four screens were ported in from separate prototypes

`rnm`, `checks`, `issues`, `markissues`. That history explains why their class
names carry prefixes (`iq-`, `mi-`, `ck-`) and why their CSS is scoped under
the screen id. The recipe and every failure mode are documented at the top of
`src/screens/checks/style.css`. If you port anything else in, read that first.

Three that cost real time:

- `document.querySelector(".appbar")` returns the **first** app bar in the
  document, not the screen's. Scope bare queries to the screen element. Getting
  this wrong threw inside one screen's init and took the rest of the bundle's
  scripts down with it.
- **`tap()` is not a global.** Screens that use one declare it inside their
  IIFE. An unwrapped screen calling `tap()` throws mid-handler and leaves state
  changed with the DOM stale.
- `src/screens/assess/style.css` is **unscoped**. Its `.card`, `.item`, `.row`
  rules leak onto anything that shares those names.

---

## 4. Testing and verifying

- **geomtest crashes rather than fails** when it measures a deleted node —
  `getComputedStyle(null)` throws and kills the harness before it emits any
  JSON. A green run only counts if it printed a number.
- **Headless does not tick CSS transitions under virtual time.** An assertion
  that measures a transitioning box can only ever fail there. Assert the
  declared resting state instead — see the carousel assertion in `flowtest.py`.
- In a live preview pane, `getComputedStyle` at t=0 returns pre-transition
  values and rAF/timers freeze between tool calls. Screenshot to wake the pane
  before measuring.
- A browser only dispatches `focus` when its window has focus, so `.focus()` in
  a preview pane sets the caret but fires no event. Bind the tap instead.

**Animation rule for this codebase: nothing about a resting state may depend on
an animation completing.** Prefer CSS transitions to rAF loops; use
`setTimeout` to guarantee destinations. rAF is throttled to nothing in a
backgrounded tab.

---

## 5. Open decisions — Sagar's calls, not yours

1. **QC pending / RTD pending have no home-card icon.** The Figma frame only
   covers the four original cards.
2. **A saved note on the complaint screen cannot be unlocked.** By design, but
   a typo is permanent for that token.
3. **Editing an existing issue on Add issues has no commit path** — a part that
   already has issues gets "Remove issues", so changing its reasons means
   removing and re-adding.
4. **The token detail page duplicates the job page's collapse logic.** A
   deliberate copy — the two pages diverge in three ways — but a fix to one
   will not reach the other.
5. **The Issues screen has a second, incompatible design** by another designer
   on the team. Do not reconcile them without asking; it is an open product
   decision, not a merge that has not happened yet.

---

## 6. Working agreements

- **Never push without being asked in that message.** Commit locally, say it is
  ready, and wait. "Go ahead" covers one action, then expires. Same for
  anything else outward-facing.
- This repo is shared and the whole team commits straight to `main`. **Always
  fetch and inspect before pushing, and never force-push** — history has been
  rewritten here before and a colleague's commit was destroyed by it. Files
  outside `bike-assessment/` belong to other people.
- Push back rather than agreeing. Surface risks. Decision-first, terse replies.
- Verify in the browser yourself; do not ask Sagar to check.
