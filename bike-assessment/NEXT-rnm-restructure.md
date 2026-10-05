# RnM dashboard restructure — handoff

Paste this whole file as the opening prompt of a new session.

---

## The task

Restructure the RnM dashboard (`#scrRnm`) to match three Figma frames. The tab
strip is being **removed**: commands move inline onto the dashboard, open tasks
become an expanding bottom sheet, part exchange moves into the ⋮ menu.

Figma file `HHciUbgAzmterprGPdJJbW` (Yuzen-Profiles). Load the
`figma:figma-design-to-code` skill before calling `get_design_context`.

| Frame | Node | State |
|---|---|---|
| RnM home 1 | `2470:40192` | default dashboard |
| RnM home 2 | `2470:40826` | open-tasks sheet expanded |
| Bike commands | `2470:40524` | **already built — do not redo** |

## Project

Working dir `/Users/sagarmalik/Claude/Project Zero/bike-assessment`. Read
**`src/MAP.md` first** — it names every file and five traps that have cost real
time. Then this loop:

```bash
python3 src/build.py && python3 tests/flowtest.py && python3 tests/geomtest.py
```

Open `src/prototype.dev.html` (not `prototype.html`) at
`http://localhost:8412/bike-assessment/src/prototype.dev.html`. It must stay
inside `src/`, beside `assets/`, or every image 404s.

`src/build.py` holds `CSS_ORDER`, `HTML_ORDER`, `JS_ORDER`. **A file not in the
right list is silently absent from the build.**

---

## Already done — do not repeat

- **`src/shared/vcard.css`** — the bike vitals card as one shared component:
  342×60, 2px `--border-primary`, radius 16, four 64px columns over hairline
  rules, 20px glyph above a 12/500 `--content-secondary` label, 20px forward
  arrow last. Already in `CSS_ORDER` after `commands.css`. **Reuse it on the
  dashboard — do not write a second one.** Hosts supply the margin; the card
  carries none.
- **`src/shared/commands.html`** — `#csVitals` card added above the grid.
- **`src/shared/sheet-config.js`** — `SHEET_ITEMS` gained `feedbacks`, `parts`,
  `finish` (placeholder icons, flagged in a comment). `SHEET_FOR.rnm` is now
  `["commands","report","feedbacks","parts","finish","learn","minimise"]`.
  `SHEET_ACTIONS.rnm` routes them.

---

## What to build

### 1. Dashboard (`2470:40192`) — 390×844, absolute positioning

- Gradient hero `0 → 476`. Bike render centred at `y216`, 212×140.
- App bar 44→116. Title `Live repair · 543210` **16/700 `--content-primary`** at
  y60; clock `4m 15s` **14/500 `--content-tertiary`** at y84. (Current build has
  a smaller title and a 12px clock — both change.)
- **Vitals card** at `x24 y420`, 342×60. Use `.vcard`.
- **Commands grid** inline at `x24 y488`, 342×208:
  - Columns 111 / 112 / 111 at x24 / x139 / x255, 4px gaps.
  - Row 1 `y488` h124: Power, Wheel, Beep. Row 2 `y616` h80: Seat (228 wide,
    x24) and View all (111, x255).
  - Card `--surface-secondary` radius 16. Stack card: 48px circle at 16 from
    card top, title 14/500 primary at +72, state 12/500 secondary at +92.
  - **Power's circle when On** = `--surface-secondary` with a **1.5px
    `--content-primary` border**. Every other circle is white.
  - The existing `.cmd-grid` CSS in `shared/commands.css` already renders this
    closely — adapt, don't rewrite.
- **Progress bar** `y714`, 390×6, `--border-primary` track, `--surface-primary`
  fill (frame draws 120/390).
- **Footer** `y720`, 124px white:
  - Left: text button `Open tasks` — 16/500 primary, **underlined**, with a
    `keyboard_arrow_up` chevron — at `x24 y752`, 125×48.
  - Right: `+ Add Issues` primary pill at `x199 y744`, 167×64, radius 100,
    padding 36/22, label 16/700 `--content-inverse`.

### 2. Open-tasks sheet (`2470:40826`)

Tapping `Open tasks` raises a sheet and the page rearranges:

- Hero gradient shrinks `476 → 426`; bike moves `y216 → y210`.
- Vitals card rides up `y420 → y374`.
- Commands grid is covered by the sheet.
- **Sheet** `y450 → 714` (390×264), rounded top, grabber 40×4 centred at y458.
- Three rows, 76px pitch, tops at **478 / 554 / 630**: 60px tile at x24, name
  16/24 primary at x100, count 14/20 secondary beneath, 24px chevron at x342.
  Frame shows `Checklist 0/18`, `Mechanical issues 0/4`, `Electrical issues 0/2`
  — **keep the live tallies, those are placeholders.**
- **Footer becomes a single full-width `+ Add Issues`** at `x36 y744`, 318×64.
  The `Open tasks` text button is gone while the sheet is up.

Transitions should match the existing hero collapse — `320ms
cubic-bezier(.22,.61,.36,1)`.

### 3. Repoint the two exports

`src/screens/rnm/script.js` exports `rnmShowCommands` and `rnmShowParts`. Both
currently call `setRnTab(...)` and **will break the moment the tabs are
deleted**. Repoint: commands → scroll/focus the inline grid (or no-op, since it
is always visible); parts → the new Part exchange destination.

`shared/sheet-config.js` calls both from `SHEET_ACTIONS.rnm`.

### 4. Part exchange needs a new home

It is currently `#panelParts`, a tab panel, filled by `paintParts()` in
`rnm/script.js` from a `PARTS_EXCHANGE` table (received / returned, serials via
a `SERIALISED` map). `parts.css` styles it. Move it to its own sheet or screen
reachable from the ⋮ — the content and CSS carry over unchanged.

---

## Order that never breaks the build

Add the new structure **alongside** the old, switch over, delete the tabs last.
There should be no commit where the tab strip is gone but its replacement is not
wired — that state does not render.

---

## Traps (full list in `src/MAP.md`)

1. **Pre-render idempotency.** The build ships the *rendered* DOM, so load-time
   DOM mutation runs twice. Assign `innerHTML`, never append.
2. **One bundle, one global scope.** Two files declaring the same `const` is a
   SyntaxError that kills everything after it; a `const` used at load time must
   be declared by an earlier file in `JS_ORDER`.
3. **`http://` anywhere fails the build.** Strip `xmlns` from exported SVGs.
4. **No base64 in source** — extract to `assets/extracted/` and reference by
   path.
5. **geomtest crashes rather than fails** when a measured selector is null.
6. **Don't assert a mid-transition `transform`** — assert `data-pos` and z-index.
7. **`.screen` is already `position:absolute`.** Do not add `position:relative`
   to `#scrRnm` — it takes the screen out of flow, it sizes to content instead
   of the 844 frame, and scrolling silently dies. This cost an hour.

## Tests will need updating

- `tests/flowtest.py` asserts an **exact** embedded-image count (currently 44).
  Adding or removing artwork changes it. The exactness is deliberate — it catches
  an asset silently failing to inline — so update the number, don't loosen it.
- Grep both suites for `rntab`, `panelTasks`, `panelCommands`, `panelParts`,
  `rnscroll` before deleting anything.

## House rules

- Never push to a remote unless asked in that message. Commit locally and wait.
- There is no `.git` in the project — see `HANDOFF-local.md` §5 for the
  clone-rsync-commit flow. The repo is shared; never force-push.
- Push back rather than agreeing. Surface risks. Decision-first, terse replies.
