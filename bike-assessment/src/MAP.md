# Where things live

Read this before grepping. It exists because a small change was costing six
searches to find the three files it touched.

## The loop

```bash
python3 src/build.py          # ~4s   assembles → src/prototype.dev.html + prototype.html
python3 tests/flowtest.py     # ~5s   465 behaviour assertions
python3 tests/geomtest.py     # ~4s   178 measured-geometry assertions
```

**Open `src/prototype.dev.html` while working** — same page, assets by path,
~1.1 MB instead of ~7.2 MB. `prototype.html` is the self-contained file you send
people; only build it to share. Selecting an element for review in the dev build
costs a few hundred tokens; in the shipped build one `<video>` alone costs
~145k.

It must stay inside `src/`, beside `assets/`, or every image 404s.

## The build is an explicit list

`src/build.py` holds `CSS_ORDER`, `HTML_ORDER`, `JS_ORDER`. **A new file that is
not in the right list is silently absent from the build.** Order matters twice
over: one bundle means one global scope, so a `const` used at load time must be
declared by an earlier file, and two files declaring the same name is a
SyntaxError that kills everything after it.

## Screens

Each is `src/screens/<name>/` with `markup.html`, `style.css`, `script.js`.
The router (`shared/router.js`) maps a route name to a `<section>` id.

**24 routes, 18 elements.** `ORDER` in `shared/router.js` is the source of truth.

| Route | Element | Notes |
|---|---|---|
| `home`, `shift`, `start` | own | entry points |
| `task`, `qc`, `repair`, `assessdone`, `allocation`, `allocated` | `#scrQueue` | **one screen, SIX routes** — see below |
| `job`, `token` | `#scrJob` | one screen, two routes; keep the aliases adjacent in `ORDER` |
| `rnm` | `#scrRnm` | the repair dashboard |
| `checklists`, `visit` | own | opened from `rnm`, return to it; adjacent to it in `ORDER` |
| `checks`, `issues`, `markissues` | own | the two issue screens |
| `assess`, `faults` | own | the assessment flow |
| `alloc`, `alloctime` | own | allocation |
| `feedback`, `complaint`, `tokens` | own | |

There is no `photos` route or screen — it was removed. Older handoffs still
name it.

## The two templates — change the config, not a screen

- **Task listings** (`Assessment pending`, `QC pending`, `Repairable bikes`,
  `Assessment done`, `Allocation`, `Allocated`) are one page: `screens/queue/`. What each contains is `shared/queue-kinds.js`; the
  bikes are `shared/fleets.js`. Adding a queue is a config entry, not a screen.
- **Task detail** is `screens/job/`, configured by `shared/task-kinds.js`.

## Shared chrome — not inside any screen

| File | Owns |
|---|---|
| `shared/sheet.js` | the ⋮ sheet component (open/close/drag) |
| `shared/sheet-config.js` | **what is in it, per screen** — edit here, not in a screen |
| `shared/commands.js` | the persistent Bike commands sheet |
| `shared/minitask.js` | parked task band + confirm dialog |
| `shared/morph.js` | the ghost that flies task ↔ parked card |
| `shared/icons.js` | every glyph |
| `shared/base.css` | tokens, type scale, **the screen transition** |

## RnM dashboard — split by region

`screens/rnm/` was one 799-line stylesheet. Now:

`style.css` (shell) · `hero.css` · `vitals.css` · `tasksheet.css` · `parts.css` ·
`commands.css` · `footer.css` — all seven listed consecutively in `CSS_ORDER`.

**It does not scroll, and the tab strip is gone** (Figma 2470:40192 / 2470:40826).
Every block is absolutely placed on a stated line and the whole 844 is accounted
for: hero 0→476, readings 420, commands 488, progress 714, footer 720. The three
tabs became one dashboard — commands inline (`commands.css`), Open tasks a bottom
sheet the footer raises (`tasksheet.css`), Part exchange its own overlay off the
⋮ (`parts.css`). `tasksheet.css` was `tabs.css`; the strip and the scroll runway
that let it stick both went with it.

`is-tasks` on `#scrRnm` is the whole open-tasks state: it shrinks the hero to
426, rides the bike and the readings up, hides the footer's text button and grows
the pill to full width. Set it in one place (`setTaskSheet`) and CSS moves the
rest. The vitals card itself is `shared/vcard.css` — the same component the Bike
commands sheet carries; only its placement and its read/alert states are here.

`script.js` is still one file: it is a single IIFE wrapping ~40 consts that must
not reach the global scope, so it cannot be split without unwrapping it.

## The PWA sidecars — and the service worker that looks like a mistake

`build.py` writes `version.txt` plus six sidecars beside `prototype.html`:
`manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `apple-touch-icon.png`. All eight ship to the public
repo **in one commit** — the page polls `version.txt` against a build id baked
into itself, so a split commit leaves field testers stale or reload-looping.

**`sw.js` ships on purpose. Do not delete it.** It is registered at
`shared/install.js` and it is *not* a caching worker:

- no Cache Storage, no precache, no stale-while-revalidate
- its only `fetch` handler is a bare network pass-through for navigations
- `skipWaiting()` on install, `clients.claim()` on activate
- registered with `updateViaCache: "none"`

It is structurally incapable of serving a stale response. It exists solely
because Chrome still requires the presence of a `fetch()` handler to offer the
**install prompt** — no worker, no install banner for field testers. (The
`⋮ → Install` menu item lost that requirement in v108; the prompt did not.)

The stated trade: **there is no offline mode.** Off signal, the app fails
exactly as it would with no worker. `version.txt` remains the only freshness
path.

Say "no *caching* service worker by design" — the unqualified version of that
sentence has already sent one session hunting a bug that does not exist.

## Traps that have cost real time

1. **Pre-render idempotency.** The build ships the *rendered* DOM, so any
   load-time DOM mutation runs twice. Clear before you build (`el.innerHTML = ""`)
   or you get two of every tab.
2. **`http://` anywhere fails the build.** Strip `xmlns` from exported SVGs.
3. **No base64 in source.** It lived in three script/style files — a megabyte on
   one line — and made those files unreadable and the dev build pointless.
   Extract to `assets/extracted/` and reference by path; the inliner handles
   `url(…)`, `src="…"` and bare quoted `"assets/…"` literals.
4. **geomtest crashes rather than fails** when a measured selector is null — the
   harness reports a JSON decode error, not a failure list. Wrap CHECKS in
   try/catch to surface the stack.
5. **Don't assert a mid-transition `transform` in a test.** The headless virtual
   clock does not reliably tick the compositor for off-screen elements. Assert
   `data-pos` and the z-layer, which are set synchronously.
6. **`.screen` is already `position:absolute`.** Do not add `position:relative` to
   `#scrRnm` — it puts the screen back in flow, so it sizes to its content instead
   of the 844 frame. That cost an hour.
7. **A sheet parked with `translateY(100%)` only clears its own height.** The RnM
   task sheet is drawn 264 tall but sized to the frame's bottom for exactly this
   reason: at 264 it cleared 714 and no further, so on any frame taller than 844
   its last rows sat below the footer in plain view.
