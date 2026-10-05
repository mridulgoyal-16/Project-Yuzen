# Mark Issues — Yuzen

Marking faults against a bike's parts: pick a part, say what is wrong with it.
Four zones across the top; the first is a grid of the parts most likely to need
attention, the other three are lists you work down. From Figma nodes
[`2052-16043`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=2052-16043)
(grid),
[`2014-14800`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=2014-14800)
(marked tile),
[`2052-16205`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=2052-16205)
(part sheet) and
[`1993-30539`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=1993-30539)
(zone rows).

> **There is a second prototype of this screen.** `../../add-issues/` is Mridul's,
> built from the same frames and further along in places — it has the search
> screen this one only has a button for. This one is built on the shared shell so
> the app bar, hairlines and chip states match `issues` and `mechanic-checks`.
> The team still has to pick one; neither is the other's replacement yet.

Open `prototype.html` directly in a browser. One self-contained file — Satoshi,
the thirteen part photos and both glyphs are inlined, so no network, no server,
no build step to view it.

## What to try

- **Tap a tile** on Recommended to open the part sheet: the part, its faults as
  chips, Confirm. Confirm stays disabled until the selection actually differs
  from what was saved — with nothing changed there is nothing to confirm. Backing
  out via the scrim or by dragging the grabber down leaves the earlier marks
  standing.
- **A marked tile** gets a negative ring and a corner dot. Two signals, because
  the ring alone disappears against a photo with a dark edge.
- **Switch to Front, Middle or Rear** for that zone's parts as rows. The chevron
  expands a row into its chips, and a chip there marks the part on the spot — no
  sheet, no confirm, since the row is already the context. One row at a time
  stays open.
- **The chips have three states** — enabled (white, hairline border), selected
  (surface/secondary, dark ring) and disabled (surface/secondary, grey label, not
  tappable). A part cannot be missing and faulty at once, so the two sides
  disable each other: mark it Missing and every fault greys out until Missing is
  cleared; pick any fault and Missing greys out until the last one goes. Tapping
  a selected chip again releases the lock, so it cannot strand anyone. Same rule
  as the issues screen.
- **The footer counts parts, not faults.** `Update issues (3)` means three parts
  carry marks, however many each. It disables when nothing is marked.

## Wiring it into the flow

Everything outbound goes through `window.Yuzen`, at the top of the `<script>`.
Replace the function bodies; change nothing else.

| Hook | Fires when | Payload |
|---|---|---|
| `onBack` | app-bar back | — |
| `onSearch` | app-bar search | — |
| `onTab` | a zone tab | the zone name |
| `onOpenPart` | a tile is tapped | `{ id, name }` |
| `onMarkPart` | marks change, from the sheet or a row | `{ id, name, issues }` |
| `onUpdateIssues` | Update issues | `[{ id, name, issues }]` — marked parts only |

## The shell is shared with mechanic-checks and issues

`build.py` lifts the shell — device frame, tokens, type styles, status bar, app
bar, scroll region, footer, options sheet — verbatim out of
`../../mechanic-checks/prototype.html` in four ranges, exactly as `../issues` does
for the first three,
so all three screens carry one set of furniture and the flow cannot drift as more
screens land. Only this screen's own styles and markup live in `template.html`.

```bash
python3 build.py        # rewrites prototype.html
```

The build fails loudly if the sibling's section markers move, rather than
silently emitting a screen with no footer.

Three consequences worth knowing:

- **`prototype.html` is generated.** Edit `template.html` and rebuild; a direct
  edit to the built file is lost.
- **Anything this screen adds has to dodge the shell's class names.** The shell
  already defines `.row` and `.row__*` for the checklist's swipe rows, and its
  `.row{display:flex}` laid this screen's chip drawer out *beside* its row header
  instead of under it. Hence `prow`. Check before naming.
- **The photos in `assets/` are 260px webp, not the Figma exports.** Those were
  7.5MB of full-resolution PNG between them, for tiles that render at 103px. The
  originals are in Figma; re-export and re-downscale if a tile ever needs more.

## Deviations from the design, and why

- **The app bar is the flow's, not the frame's.** The frame centres `Mark Issues`
  between a back arrow and search. This keeps `543210 / Mark Issues` left-aligned
  like every other screen in the repo and gives the right edge to search, which
  is the one action the frame puts there.
- **Search is a button, not a screen.** None of these four frames contains the
  search screen, so the button fires `onSearch` and stops. `../../add-issues/` has a
  working one.
- **Three tiles are labelled "Display".** That is what the frame draws. Their
  layer names — `tail lamp1`, `Bike pic 3`, `Display unit 2` — suggest three
  different parts, so this is probably unintentional; it is left as drawn and the
  three are spread one per zone so no list shows the same label twice. **Worth
  confirming before testing:** a tester cannot tell three "Display" tiles apart.
- **The zone lists are invented.** The frame fills Front, Middle and Rear with
  five identical `Front tyre` rows, which cannot be told apart in a test. The
  twelve parts are distributed across the three zones instead.
- **Fault catalogues are invented** except the pigtail connector's, which is the
  sheet frame's (`Wear out · Cuts · Rust`), and the row frame's
  (`Rusting · Cuts · Wear out`, `Damage · Cuts`).
- **Photos are centre-cropped.** The frame positions each photo by hand inside its
  tile — twelve bespoke offsets, one of them vertically flipped. These use
  `object-fit: cover` centred, which lands close on every tile but is not
  pixel-identical to any of them.
- **The footer button is 318px wide inside 36px padding**, per this frame and the
  issue sheet's, rather than the 342 the other screens use. Left as drawn rather
  than "corrected", but it is a difference worth a look — 318 in a 342 space is
  the shape an auto-layout mistake takes.

## Still open

- **Can a zone row open the sheet?** Here it only expands inline, which is what
  the frame's row states show. Mridul's version does both. If the sheet is meant
  to be reachable from a row, the chevron and the row body need to do different
  things, which is a decision, not a detail.
- **What does Update issues do?** It reports the marked parts and stops. Whether
  it submits, advances the flow, or opens a confirmation is undecided.
- **The footer does not hide on scroll** the way mechanic-checks' does. Nothing in
  these frames asks for it, and on a screen whose content is a grid the CTA
  arguably should stay put — but it is an inconsistency across the flow.
- **"Recommended" is not derived from anything.** It shows all twelve parts in the
  frame's order. What actually earns a place there — recent faults, service
  history, the assessment that preceded this screen — is unspecified.
