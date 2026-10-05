# RnM Home — Yuzen

The bike screen for Repair & Maintenance: the bike itself, its vitals, the four
controls, and the repair work waiting on it. Rebuilt from Figma node
[`2207-30576`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=2207-30576),
which replaces the older `2101-20496` frame this folder was first built from.

## Run it

Two ways, and the second is the one to hand to a tester.

```bash
# 1. the working copy — needs a server, reads assets/ and ../wynn-xp/videos/
python3 -m http.server        # from the repo root
# then open http://localhost:8000/RnM-home-page/prototype.html

# 2. one self-contained file — no server, no companion folder
python3 RnM-home-page/build.py
# writes RnM-home-page/rnm-home.html (~1.7MB), which opens by double-clicking
```

`build.py` inlines Satoshi, the twelve glyphs and the four bike clips as data
URIs. That is what makes the built file portable — and it is worth using, because
on a workshop floor with no signal the working copy silently falls back to system
sans and loses the bike.

## What to try

- **Drag the sheet down** (or tap the handle) to reach the controls; drag up for
  the repair cards. It is one screen with two states, not two screens. Expanded,
  the cards clear the bottom of the screen by 48px; collapsed, the sheet's top
  edge sits at 756px, where the frame draws it.
- **Tap Power.** The bike plays the matching clip and holds its last frame, so it
  stays in the state you left it in.
- **Drag the Seat control** up to open, down to close. It springs back to centre
  on release, and the label passes through Opening or Closing until the clip
  finishes. See the open question below — this control is not settled.
- **Tap Lock.** The title is the *action*, not the state: it reads "Lock" when the
  bike is open and "Unlock" when it is shut. The shackle swings to show where the
  lock is now; nothing changes colour.
- **Tap Beep.** It runs for 10s then stops itself, the card draining left to right
  for as long as it has left. The title reads "Beeping" while it sounds. A second
  tap cuts it short.
- **Tap any vital.** Each of the three reads independently, with a reveal that
  suits what it measures: the battery fills across, the IoT arcs light outward
  from their dot, the bluetooth rune blooms from the middle. The number counts up
  with the glyph and lands exactly on the reading.
- **Tap the arrow** at the right of the strip for the all-vitals screen. It is a
  placeholder — see below.

## Wiring it into the full prototype

Everything outbound goes through `window.Yuzen`, at the top of the `<script>`.
Replace the function bodies; change nothing else.

| Hook | Fires when | Payload |
|---|---|---|
| `onBack` / `onHelp` | app-bar buttons | — |
| `onViewAll` | the arrow in the vitals strip | — |
| `onOpenChecks` / `onOpenIssues` | the two repair cards | — |
| `onControl(action, state)` | `power` / `lock` / `seat` / `beep` | the new state |
| `onConnect(state)` | bluetooth | `connecting` \| `connected` \| `disconnected` |
| `onRead(key, value)` | one vital was re-read | `charge` \| `iot`, and its value |

## Notes

- **The command cards are cards, not buttons.** Only the control inside each one
  is pressable, so a stray tap on a label cannot cut the bike's power.
- **The bike clips are shared from `../wynn-xp/videos/`**, not duplicated — 1.1MB
  stays in one place and Amitesh's prototype keeps its own copy untouched. If
  `wynn-xp/` ever moves, re-point the four `src` paths.
- **The bike's placement is measured, not eyeballed.** It sits at x 155–640,
  y 283–595 inside its own 780x840 clip — nowhere near centred — so the clip is
  scaled 0.402 into a 314x338 box and offset from there. Two traps are worth
  knowing before touching it: `cover` over the whole hero draws the bike at nearly
  twice the size the frame does and runs it off the right edge; and sizing it down
  correctly exposes the clips' studio backdrop, which is pale grey rather than
  white, as a hard-edged box wherever the gradient has gone white. The fix is to
  feather the clip's edges, which dissolves the backdrop instead of hiding it.
- **The clip and the frame's render are different camera angles** — 485x312 against
  195x152. Only one dimension can match. Width won, which keeps the bike inside
  the 24px margins and leaves it slightly shallower than the frame's render.
- **The vitals glyphs are CSS masks over a gradient**, not `<img>`. That is what
  lets a state recolour them with a token instead of shipping a red copy of every
  icon, and what makes the reveals possible: moving the gradient's hard stop
  uncovers the glyph progressively.
- **The fill is a CSS transition on a registered `--fill`, not a rAF loop.** A loop
  stops dead wherever the browser is not producing animation frames — a
  backgrounded tab, an embedded viewer — and leaves the glyph frozen mid-fill.
- **The command glyphs live inline** in an SVG sprite at the top of the body,
  inheriting `currentColor`. The lock needs its shackle as a separate node so it
  can swing rather than cut between two images.
- **The closed-lock glyph is not the library's.** `icon/lock` exists in the design
  system but the MCP only returns a component key for it, not an exportable node,
  so the closed shackle reuses the `lock_open` export's own body and keyhole with a
  symmetric arch redrawn at the same 1.5px weight. Swap in the real export when it
  is reachable.
- Only Satoshi Medium and Bold are embedded. Nothing on screen uses another
  weight now that the task number is gone.

## Open questions

- **The seat control is not settled.** A drag with auto-reset was chosen so the
  command cannot fire by accident, but it does not feel right. The real problem
  underneath it is that the command sometimes does not take, so people tap
  repeatedly — whatever replaces it has to *say* "didn't open, try again" rather
  than leave someone guessing. Options on the table: press-and-hold with a
  filling ring, a full-width segmented Open | Close, or a plain tap that is honest
  about failure.
- **Can charge and IoT be read without a bluetooth link?** They are independent
  here, which is what makes each one individually tappable. That assumes the
  readings come from the IoT unit over the network. If they actually need the
  local link, both should be inert until bluetooth is up.
- **The all-vitals screen is a placeholder.** Nine rows wired to the same state as
  the strip, so it cannot drift out of step — but the real layout is still to be
  designed, and the readings past the first three are invented.
- The hero gradient and the 402px hero height come from the frame; the expanded
  sheet is not in the frame at all and was sized to leave 48px under the cards.
