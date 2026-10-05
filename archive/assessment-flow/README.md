# Assessment Flow — Yuzen Mechanic

A self-contained HTML prototype (390×844 mobile frame) of the part-assessment
screen from the Yuzen ops app: a mechanic works down a checklist of vehicle
parts, marking each **Good** or **Faulty**, and records the reasons for anything
faulty.

Built for real-device user testing with mechanics.

## Run it

Open `prototype.html` in a browser — double-click, or:

```bash
open prototype.html
```

No build step, no server, no network. Satoshi and all part photography are
embedded, so it works offline on a phone in a service centre.

> **Open it in an actual browser.** Inline preview panes (Slack, Notion,
> GitHub's own file viewer, chat tools) sandbox JavaScript. The screen will
> render — it is pre-rendered into static markup on purpose — but nothing will
> respond to touch. AirDrop it to a phone to feel the swipe properly.

## The interaction

| Gesture | Result |
|---|---|
| **Swipe right** | Marks the part **Good** |
| **Swipe left** | Marks it **Faulty** and opens the reason sheet |
| **Tap Good / Faulty** | Same as the matching swipe |
| **Tap any row** | Pending → opens as the card. Already marked → opens the sheet to change it |

The card tracks your finger and tilts; the tinted dashed panel behind it
brightens with distance. Past 30% of the card width — or a fast flick — it
flies off, the row collapses with its status, and the next pending part opens.
Below the threshold it springs back. A vertical drag scrolls the list instead
of swiping.

### The part sheet

One sheet does two jobs: it collects reasons when a part is swiped faulty, and
it re-opens later to change any call already made. The Good/Faulty toggle lives
in its header, so a part can be re-judged without leaving the sheet — switching
to Good collapses the issues away in one motion.

Reasons are **per-part** and multi-select. **Missing** is mutually exclusive
with all of them.

## Design decisions worth knowing

These are places the prototype deliberately differs from the Figma frames, or
resolves something the frames left open. Each is a decision, not an oversight —
push back on any of them.

**Exclusivity switches, it does not lock.** Figma greys out *Missing* once any
reason is picked. Taken literally that is a dead end: a mechanic taps "Cuts",
then finds the part is actually gone, and cannot reach *Missing* without first
clearing every reason. Here nothing is ever disabled — tapping a reason drops
*Missing*, tapping *Missing* drops the reasons. Same rule, no trap.

**Backing out of a fresh mark reverts it; backing out of an edit does not.** A
faulty mark with no reason is worse data than no mark, so dismissing the sheet
after a swipe undoes the swipe. Dismissing an *edit* leaves the earlier call
standing.

**Editing does not move the active card.** You are correcting something behind
you; the flow should not jump.

**Filled status icons.** The earlier design used outlined grey for both good and
faulty, which gave them identical weight — a failed part did not read when
scanning back up a long list. Now `content/positive` and `content/negative`
discs, per `Assessment_complete`.

**The confirmation holds for 400ms** before the next card opens. Long enough to
read, short enough that it does not cost ~10 seconds across a 16-part list.

**The reveal copy is centred with a 240px max-width** so long part names
("Vehicle side pigtail connector marked good") wrap to two balanced lines
instead of running the width of the panel.

## Placeholder content

Figma supplied four real part photos. Parts that genuinely look alike reuse one
(front/rear tyre, front/rear brake). The remaining parts are **realistic dummy
entries carrying a "photo pending" placeholder** — deliberately not a
mismatched real photo, which a mechanic would notice in testing.

The 16-part checklist is illustrative, not the real one. Swap `PARTS` in
`src/template.html` for the actual list; each entry carries its own `reasons`.

## Still undecided

- **`Next`** — enabled once every part is assessed, but does nothing yet.
- **`Add issues`** — inert. Is it for reporting a fault on something *not* on
  the checklist?
- Whether a mis-swipe deserves a brief **undo**, on top of tap-to-edit.

## Source

`prototype.html` is generated — edit `src/template.html`, not the built file.

```
prototype.html      the deliverable; self-contained, open this
src/template.html   source markup, styles and behaviour
src/build.py        inlines assets, then pre-renders
src/assets/         part photography (PNG, alpha preserved)
tests/              73 behavioural tests
```

### Rebuilding

```bash
python3 src/build.py
```

Requires macOS with Google Chrome, and [Satoshi](https://fontshare.com/fonts/satoshi)
installed in `~/Library/Fonts` (the build embeds it so the prototype needs no
network). The build does two things:

1. **Inlines every asset** as base64 — fonts and photos are each stored once, in
   `:root` CSS variables, so nothing is duplicated.
2. **Pre-renders the checklist** with headless Chrome and ships the resulting
   DOM, so the screen is fully visible even where scripts are sandboxed. The
   inline script still takes over wherever JavaScript runs.

### Tests

```bash
for t in functest clicktest edittest animtest; do python3 tests/$t.py; done
```

73 tests dispatching real pointer events — swipe thresholds and axis detection,
tap paths, the edit flow, reason exclusivity in both directions, and the sheet
transition.

Two things they cannot check, because headless Chrome does not tick CSS
transitions under virtual time: how the motion actually *feels*, and anything
measured mid-transition (`getComputedStyle` returns the start value). Geometry
is asserted with transitions disabled; the transition itself is verified through
`getAnimations()`. **Judging the feel needs a real device.**

## Figma

File [`HHciUbgAzmterprGPdJJbW`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles) — Yuzen-Profiles

| Node | Frame |
|---|---|
| `2024:33715` | Assessment — screen and list rhythm (96 collapsed / 392 expanded) |
| `2024:33875` | collapsed list item |
| `2024:34767` | expanded item + swipe reveal |
| `2024:33964`, `2024:34207`, `2024:34426` | swipe-right (good) progression |
| `2024:34799`, `2024:35012`, `2024:35216`, `2024:35420` | swipe-left (faulty) progression |
| `2033:37081` | Bottom sheet — edit faulty |
| `2045:37166` | Bottom sheet — edit good |
| `2030:35821` | Assessment_complete |

Tokens come from the Yulu design system: Satoshi throughout, the `content/*`,
`surface/*` and `border/*` semantic colours, and the 4/8/16/24/36 spacing scale.
The two swipe tints are the only derived values — `content/positive` and
`content/negative` at 10% over white (`#e5f0ed`, `#f8eae7`), sampled from the
Figma renders.
