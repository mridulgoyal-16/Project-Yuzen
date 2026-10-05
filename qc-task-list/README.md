# Task List — Yuzen

The screen a Yuzen user lands on: every task waiting for them, grouped across
four tabs. **This is the entry point to the other flows in this repo** — each row
opens a task flow, so Assessment and Mark Faults sit downstream of this list.

Open `prototype.html` directly in a browser. No build step, no server.

Design: Figma `Yuzen Profiles`, node [`1826-13598`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=1826-13598).

## What to try

Open it on a phone if you can — the gestures and haptics only really read there.
AirDrop the folder, or serve it and hit your machine's IP from the phone.

- **Scroll the list down even slightly.** The Scan bike button drops away in a
  "go down" motion. Scroll up even slightly and it comes straight back — mid-list,
  not just at the top. Direction-based, with an 8px threshold so it never jitters.
- **Swipe horizontally** across the list to change tabs, or tap the tab labels.
- **Scroll the tab strip left** to reach RTD, which sits past the right edge.
- **Tap a row.** Open the console to see the payload it hands off.

Header, tab strip and bottom nav are fixed. Only the rows scroll.

## Tabs

| Tab | Tasks |
|---|---|
| Revive | 2 |
| Assessment | 14 |
| QC | 14 |
| RTD | 14 |

Row counts always match the number on the badge. Revive has only 2 rows, so
there's nothing to scroll there and the scan button stays put — that's correct,
not a bug.

Task data is mock but deterministic: the same rows on every load, so a screenshot
taken later still matches what a participant saw.

## Wiring it into the full prototype

The page's entire outbound surface is `window.Yuzen`, declared at the top of the
`<script>` block. Replace the three function bodies; change nothing else.

| Hook | Fires when | Payload |
|---|---|---|
| `onTaskOpen` | A task row is tapped | `{ id, name, battery, tab }` |
| `onScanTapped` | Scan bike is tapped | `{ tab }` |
| `onNavigate` | A bottom-nav item is tapped | `'home' \| 'tasks' \| 'profile'` |

The bottom nav updates its own active state and does not navigate — routing is
the caller's job.

> **Note for @Barun** — the `Assessment • 14` tab is the front door to your
> assessment flow: tapping a row here is what should open it. `onTaskOpen` hands
> you `{ id, name, battery, tab }`, where `id` is the vehicle number shown on the
> row. If your flow needs anything else to start (task ID, part list, mechanic),
> tell me and I'll widen the payload rather than have you re-fetch it.

> **Note for @Sagar** — same for QC, if Mark Faults is meant to be entered from
> the `QC` tab rather than only from Assessment. Worth confirming which tab owns
> that entry point, since right now the tabs are just groupings and any of them
> can route anywhere.

## Not built

The search icon in the header is present and pressable but intentionally does
nothing — no filtering. There's no pull-to-refresh, and no destination screen for
any tap: every tap reports through `window.Yuzen` and stops there.

## Known rough edges

- The **Tasks** icon in the bottom nav reads visually heavier than Home and
  Profile. The three source SVGs come from different icon families in Figma; it's
  an asset issue, not a CSS one, and needs fixing on the design side.
- No `aria-current` on the active nav item.
- Tab changes fade the new rows in rather than cross-fading. Deliberate — a true
  cross-fade adds ~140ms before new rows appear on every tab tap, which isn't
  worth it for users in a hurry.

## Design notes

Row height is exactly 72px (24px padding, 24px content, 24px padding), matching
Figma. Dividers sit on the row boundary via an inset shadow so they add no
height. All hairlines are `#e8e8e8` — Figma draws the list dividers as `#d9d9d9`,
deliberately unified here so the page reads as one system.

Tokens: `--content-primary #222`, `--content-secondary #717171`,
`--content-tertiary #919191`, `--border-primary #e8e8e8`. Satoshi via Fontshare.
