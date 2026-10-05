# Add Issues Flow — Yuzen Mechanic

A self-contained HTML prototype (390×844 mobile frame) of the issue-marking screen
from the Yuzen ops app: a mechanic inspects bike parts and records what faults each
one has. Parts are organized by zone (Recommended, Front, Middle, Rear) and faults are
marked with exclusive issue chips — selecting "Missing" clears all other issues, and
selecting any other issue clears "Missing".

Built for real-device user testing with mechanics.

## Run it

Open `prototype.html` in a browser — double-click, or:

```bash
open prototype.html
```

No build step, no server, no network. Satoshi and the part photograph are
embedded, so it works offline on a phone in a service centre.

> **Open it in an actual browser.** Inline preview panes (Slack, Notion,
> GitHub's own file viewer, chat tools) sandbox JavaScript. The screen will
> render — it is pre-rendered into static markup on purpose — but nothing will
> respond to touch. AirDrop it to a phone to feel the interaction properly.

## The flow

### Screen layout

**Tabs:** A row of tabs selects which zone to view — "Recommended", "Front", "Middle",
"Rear". The tab indicator is an underline that hugs the label text.

**Recommended tab:** A 3-column grid of part tiles. Each tile is a photo with a label
overlay. Tapping a tile opens the issue-marking sheet for that part.

**Zone tabs (Front / Middle / Rear):** A list of parts, one per row. Each row shows a
photo thumbnail, the part name, and any issues already marked (displayed as tags with
dot separators). A chevron on the right can be tapped to expand the row and show the
issue chips inline. Tapping the row also opens the issue-marking sheet.

### Marking issues

**Bottom sheet:** Tapping a part opens a bottom sheet titled with the part name and a
thumbnail. Below that, a row of issue chips — each tap toggles that chip.

**Issue chips:** `["Missing", "Cuts", "Makes noise", "Rusting", "Worn", "Dented"]`

**Exclusivity:** "Missing" is mutually exclusive with all other issues. Selecting it
clears any other selected chips. Selecting any non-Missing chip clears "Missing" if it
was selected.

**Dirty state:** The CTA button (`Update issues` or `Update issues (n)`) starts disabled
when the sheet opens with existing marks. It becomes enabled only when the selection
differs from what was saved — either added issues, removed issues, or toggled any chip.
If the user reverts all changes back to the saved state, the button returns to disabled.

**Search:** A search button in the top app bar opens a search screen. The user can type
to filter parts by name (case-insensitive substring matching). Matching text is
highlighted. Selecting a search result navigates back to the "Add issues" screen,
scrolls that part into view, and opens the issue chips — so it feels like the app is
"travelling" to that part.

### Header interactions

**Tab indicator:** A thin underline slides between tabs, hugging each label's text width
(not the full tab padding width).

**Top app bar:** Shows "Add issues" as the title. A circular search button sits to the
right.

**Back button (search only):** When in the search screen, a back button appears. Tapping
it returns to the "Add issues" screen.

## Design decisions worth knowing

**"Missing" exclusivity is bidirectional.** Figma's exclusivity was uni-directional
(selecting "Missing" greys out others, but others don't disable "Missing"). Here both
directions work: pick "Missing" and everything else clears; pick anything else and
"Missing" clears. No trap — a mechanic can always reach any state.

**Dirty state enables the CTA.** The button is disabled when the sheet opens with saved
marks, and remains disabled until any change is made — or until the user reverts to the
exact same state. This prevents accidental "Update" clicks when nothing changed, and
gives the mechanic confidence that they only save when they actually edited.

**Search highlighting is bold, not a colour.** Figma specifies matched substrings in
Label/Medium700 (16px, 700 weight), while the rest is Label/Medium (16px, 500 weight).
This keeps the text readable on the light background without needing a background tint.

**Accordion smooth animation.** Zone list rows expand in place, pushing content below.
The animation measures the actual content height in JavaScript and animates explicit
pixel values — `grid-template-rows: 0fr → 1fr` does not interpolate in Chrome.

**Row flash after search navigation.** When selecting a search result, the part row
flashes (background fade animation) for ~1.8 seconds. This gives the mechanic visual
feedback that "you are here — this is the part you selected."

**All parts use the same tyre image.** This is intentional for now. The prototype is
testing the flow, not displaying real part photography. When real part renders arrive,
`src/assets/` will hold individual part images.

## Placeholder content

All 34 parts use the same tyre image because the flow is being tested, not the
photography. The part list is illustrative; in production it comes from the vehicle's
inspection template.

## Still open

- **On-screen keyboard.** The prototype includes a keyboard UI, but it is rendered static
  (the browser's native keyboard input still works). In a real app, the keyboard would be
  interactive.
- **Navigation after "Update."** Tapping the CTA currently just closes the sheet and
  re-renders the list with updated marks. It doesn't navigate anywhere yet.
- **Search suggestion history.** The default search state shows all parts grouped by
  zone. Adding a search history of recently viewed parts could speed up re-access.

## Source

`prototype.html` is generated — edit `src/template.html`, not the built file.

```
prototype.html      the deliverable; self-contained, open this
src/template.html   source markup, styles and behaviour
src/build.py        inlines assets, then re-outputs
src/assets/         part photography (currently: tyre.png placeholder)
tests/              functional and interaction tests
```

### Rebuilding

```bash
python3 src/build.py
```

Requires macOS with [Satoshi](https://fontshare.com/fonts/satoshi) installed in
`~/Library/Fonts` (the build embeds it so the prototype needs no network). The build
does one thing:

- **Inlines every asset** as base64 — the font and tyre image are embedded in `:root`
  CSS variables once, so they are not duplicated in the output.

### Tests

```bash
python3 tests/functest.py
python3 tests/clicktest.py
python3 tests/flowtest.py
```

Tests cover: part grid and list selection, chip toggling, "Missing" exclusivity in both
directions, dirty-state button logic, accordion expand/collapse, search filtering and
navigation, bottom sheet open/close. Two things they cannot check, because headless
Chrome does not tick CSS transitions under virtual time: how the motion actually *feels*,
and anything measured mid-transition. **Judging the feel needs a real device.**

## Figma

File [`HHciUbgAzmterprGPdJJbW`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles) — Yuzen-Profiles

Key design specs:
- Part tile labels: Satoshi Medium 12px, 16px line height
- Issue tags: Satoshi Medium 16px, 20px line height
- Tab indicator: 2px underline, hugs label width (not full tab width)
- Semantic colors: `content/primary` (#222222), `content/secondary` (#717171),
  `surface/secondary` (#F7F7F7), `surface/disabled` (#DDDDDD), `border/primary` (#E8E8E8)
- Spacing: 4/8/16/24/36px scale

Tokens come from the Yulu design system: Satoshi throughout, the `content/*`,
`surface/*` and `border/*` semantic colours, and the 4/8/16/24/36 spacing scale.
