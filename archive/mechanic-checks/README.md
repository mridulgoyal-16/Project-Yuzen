# Mechanic checks — Yuzen

The servicing checklist a mechanic works through: each part carries the action it
needs — Check, Adjust, Replace, Lubricate, Tighten — and is marked Good or Faulty
as it is done. Content from Figma node
[`10-1382`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles?node-id=10-1382).

Open `prototype.html` directly in a browser. One self-contained file — Satoshi and
the part photos are embedded, so it works with no network and no build step.

## This is assessment-flow's UI, with different content

Cloned from [`assessment-flow`](../assessment-flow/) deliberately: the interaction,
layout, type, tokens, swipe behaviour and footer are Barun's, unchanged. What
changed is the content.

Built from `assessment-flow/src/template.html` with the fonts and photos lifted
out of its built `prototype.html`, so this is a standalone file rather than a
second copy of the Python build pipeline. There is no `src/` or `build.py` here —
edit `prototype.html` directly.

### What changed

- **The six parts** and their prescribed actions, from the Figma frame.
- **The confirm button carries the part's own action** — `Clean`, `Check`,
  `Adjust`, `Replace`, `Lubricate`, `Tighten` — instead of a blanket `Good`.
  `Faulty` is unchanged. The swipe-right reveal says the same thing as the
  button, and the edit sheet's icon-only tick takes the action as its accessible
  name so a screen reader hears it too.
- **A sub-line** under each part name carrying that part's action, matching the
  confirm button. Hub motor's `Missing` tag was dropped on request, so every part
  now reads as a job to do and nothing on the screen reads as a fault until a
  mechanic marks one. The renderer still supports an optional `fault` field —
  which shows negative and takes precedence over the action — if a pre-recorded
  fault needs to come back.
- **A section header** — `Servicing checklist` in the design system's
  Headings/Small (Satoshi Bold 20/28, added to the named-styles block as
  `.t-heading-sm`) with a `0/6` counter. assessment-flow has neither. The
  denominator is `PARTS.length`, so the counter can never drift from the list.
- App bar reads `543210 / Servicing checklist`.

Everything else — the expand-in-place card, Faulty/Good, the reason sheet, the
progress bar, Add issues, Next — is untouched.

## Known mismatches, kept on purpose

- **Six checks, counted as six.** Figma's frame reads `0/14` against six drawn
  rows; six is the real number here, so the counter and the progress bar agree and
  both complete together. If the 14 is real, eight parts still need writing.
- **The design's own layout was not followed.** Figma `10-1382` is a flat list with
  a `Physical faults` page title, a per-row action icon (task_alt, build,
  autorenew, water_drop, pliers) and a `00:50` timer above Continue. None of that
  is here, because the brief was to reuse assessment-flow's UI and change only the
  content. Worth deciding which of the two screens is the real target.
- **Photos are reused.** assessment-flow only had four real part photos, so they
  are mapped by resemblance: hub motor and front wheel take the tyre shot, both
  brake items take the brake shot, MCU takes the display shot, battery takes the
  pigtail shot. None is a photo of the actual part named.
- **Fault reasons are invented** — plausible per part, but not from research or
  the design.
