# Mark faults — interactive prototype

Single-file prototype of the Quality-associate "Mark faults" screen.
Open `prototype.html` in a browser, or serve the folder and open it on a phone.

Source of truth: Figma `Yuzen-Profiles` → `Mark faluts 1` / `Mark faults 2` / `Mark faults 3` / `Mark faults 4`
(node `2009:15704`). Tokens, type, spacing and assets were pulled from the file, not eyeballed.

## Tokens in use

| Token | Value |
|---|---|
| Content/Primary · Secondary · Tertiary | `#222222` · `#717171` · `#919191` |
| Surface/Inverse · Secondary · Primary | `#ffffff` · `#f7f7f7` · `#222222` |
| Border/Primary · Selected | `#e8e8e8` (1px) · `#222222` (1.5px) |
| Label/Medium · Label/XSmall · Label/Medium700 | Satoshi 500 16/20 · 500 12/16 · 700 16/20 |
| Body/Small | Satoshi 500 14/20 |
| Spacers | 8 / 16 / 24 / 36 |
| Radii | pill 100 · photo card 15.284 · part thumb 8 |
| `--content-success` (**not** in the library) | `#12874a` |

Satoshi loads from the Fontshare CDN — needs network on first load.

## Behaviour

**List** — accordion, one part expanded at a time. Three row states:
*done* (collapsed + `Penalty | Damage` subtext), *active* (expanded, `#f7f7f7` band, white part thumb),
*upcoming* (collapsed, title only). Tapping the open row collapses it.

Default state: part 1 open, nothing selected anywhere.

**Per part** — Penalty `Yes/No`, Damage `Major/Minor/Missing`, Photos (optional, max 3).
Tapping a selected chip clears it. A part counts as done once penalty **and** damage are set —
at that moment a 20px green tick pops in between the part name and the accordion chevron
(8px from the chevron) and stays there whether the row is open or closed. Clearing a chip
removes the tick again.

**Camera** — the card fires a real `capture="environment"` input on touch devices. On desktop it
drops in a sample shot so the flow can be demoed without a camera. See `CONFIG.CAMERA_MODE`.

**Customer's photos** — header icon button toggles the carousel; the button turns dark while it's open.
The carousel sits between header and list, so opening it pushes the list down and it stays pinned
while the list scrolls. Swipe or tap the dots. 4 slides.

**Submit** — the footer slides up only when every part is done. It sits **in flow**, not as an
overlay: it claims 124px of layout height and the scrolling list shrinks to match, so nothing
is ever hidden behind it. Tapping it logs the payload to the console.

## Config

Top of the `<script>` in `prototype.html`:

- `AUTO_ADVANCE` (default `false`) — jump to the next incomplete part the moment penalty + damage are set.
  Off because photos are optional and usually added after the damage call.
- `CAMERA_MODE` — `'auto' | 'camera' | 'sample'`.
- `MAX_PHOTOS` — 3 (4 thumbnails + the add card overflow the 342px row).

Parts list lives in `PARTS`; in production it comes from the previous step's selection.

## Known gaps

- The carousel slides are placeholders derived from the two photos in the Figma file. Needs the
  real 4 customer photos.
- The active state of the header photo button isn't specified in Figma — implemented as
  `Surface/Primary` fill with a white glyph.
- No success/positive colour exists in the Figma library (searched — nothing). The tick uses
  `#12874a`, a placeholder that clears 3:1 against both `#ffffff` and `#f7f7f7`. Needs a real token.
- The tick is a Material Symbols `check_circle` drawn in code, since there's no such icon in the
  file yet. Swap it for the real asset once it's added.
- Status bar is a hand-rolled approximation of the iOS light bar (device chrome, not product UI).
