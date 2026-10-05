# Token queue — Yuzen

The token view of **My tasks**: the token currently being served, and the queue
behind it. Built from Figma node
[`1831-13062`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=1831-13062).

Open `prototype.html` directly in a browser. No build step, no server. The
`assets/` folder has to sit beside it.

## What to try

- **Skip for now** promotes the next token into the active card and puts the
  skipped one **next in line**, not at the back — a captain skipping someone is
  usually waiting a minute for them, not writing them off. The active card
  minimises into the queue slot while the one below grows into its place, so you
  can see where the token went.
- **The bell** notifies a queued user, then goes quiet for **10 seconds**: it
  fills, lights up, shakes, and a pie drains behind it. It is not tappable again
  until the pie clears — the same idea as an OTP resend, so a captain cannot
  ring someone's phone six times in a row. Each token has its own timer, and
  they survive a re-render.
- **Filter chips** (All / Service / Attach / Enquiry / RSA) filter the queue
  live. The row scrolls horizontally, since it overflows 390px, and selecting a
  chip that starts off-screen scrolls it into frame rather than snapping the row
  back to the start.
- **Scroll down** — the chips pin under the tabs and stay reachable however far
  into the queue you are. They pick up a shadow only while pinned.
- **Ongoing** cards carry a **progress ring** around the token number instead of
  a bell: there is nobody to call while the bike is in the workshop, so the
  question that tab answers is *how far along is it*. The arc is flat-capped at
  12 o'clock so you can see where it starts, and it turns **green at full
  strength** once the repair is done. Finished repairs sort to the top — those
  are the ones someone can act on now.
- **All three tabs are populated** — Pending (9 waiting), Completed today (6),
  In progress (8).
- **Home and Profile are deliberately empty.** The nav switches and stays
  pinned; those screens are not built yet.

Header, tabs and bottom nav are fixed. Everything else scrolls.

## Wiring it into the full prototype

Everything outbound goes through `window.Yuzen`, at the top of the `<script>`.
Replace the function bodies; change nothing else.

| Hook | Fires when | Payload |
|---|---|---|
| `onTokenOpen` | any token row is tapped | `{ token, name, type, vehicle, tab }` |
| `onCallUser` | Call user | `{ token, name }` |
| `onSkipToken` | Skip for now | `{ token, name }` |
| `onNotifyUser` | a queued card's bell | `{ token, name }` |
| `onNavigate` | a bottom-nav item | `'home' \| 'tasks' \| 'profile'` |

The bottom nav updates its own active state and does not navigate.

## Notes and open questions

- The **bike number is on every card**, not just the active one. A captain
  matching a person to a bike needs it wherever they are looking, and it costs
  nothing on the line that was already there: `Type | Vehicle • plate`.
- **Completed** cards keep `content/primary` text with a **neutral** tick and a
  disabled token number. Greying the whole row read as *failed* rather than
  *finished*.
- Vehicles are **Dex NV** and **Dex GR** only.
- Token data is mock but deterministic — the same queue on every load.
- Completed and In progress have **no active card and no chips**: there is no
  current token to work, and nothing to filter against.
- **`Ongoing (8)` is the only tab carrying a count**, while Pending (9) and
  Completed (6) show none. That is what the design does, but it reads as
  arbitrary on screen — worth settling.
- The token badge is 20px Bold in both places. Figma reports 14.69px on the
  active badge and 21.16px on the queued ones; that 6px gap looks like a
  component quirk rather than intent, so it was not copied literally.
- Spelling to settle across prototypes: this page uses `Dex NV` (verbatim from
  its Figma frame) while the task list uses `DeX 2.5`, matching how Yulu styles
  the name elsewhere. Same product, two spellings on adjacent screens.

### Still open

- **The workshop stages are invented.** `REPAIR_STAGES` in the script is marked
  `PROVISIONAL`: five stages at 10/30/55/80/100%. Real stage names and
  weightings have not been confirmed, so the ring's position — and the sort
  order that depends on it — is a placeholder.
- **Ongoing has no third line.** The ring replaced the `stage · %` text, which
  means a captain sees *how far* but not *which stage*. If the stage name
  matters, it needs somewhere to live.
- **Skipping twice ping-pongs.** Skip sends a token to next in line, so
  skipping the new active token swaps the same two forever. Fine for a demo,
  wrong for a station — it probably needs a skip count, or a floor of two
  positions.
- **Is Ongoing actionable?** A green ring is an invitation to do something, but
  there is nothing to tap through to yet, and it is unsettled whether *ready to
  collect* belongs here or back in Pending.
- Satoshi loads from `api.fontshare.com`. On a workshop floor with no wifi this
  falls back to system sans and the screen goes off-spec. Embedding the font
  would fix it, at the cost of file size.
