# Handoff — Yuzen flow, continuing session

Paste this whole file as the opening prompt of a new Claude Code session on
Sagar's laptop. Everything below is verified as of the end of the last session.

---

## 1. Read this first — SUPERSEDED 21 Sep 2026

**This section is out of date. There is no longer uncommitted work on disk.**
Everything below was pushed on 10 Sep 2026 and the tree is level with both
remotes (`Project-Zero` `d2e173b6`, `yuzen-flow` `af70f36a`, live Pages
`version.txt` `6aaa39838090`). Kept for the rationale only.

The original note read: five files modified locally and not pushed, finished,
both suites green, held back only because Sagar asked to build and stop.

```
src/screens/rnm/script.js      the RnM dashboard's new resting state
src/shared/sheet-config.js     Bike commands back in the RnM ⋮
tests/flowtest.py              assertions rewritten + loosened
tests/geomtest.py              RnM geometry made relative
prototype.html                 rebuilt from the above
```

Before anything else, confirm they are still there and still green:

```bash
cd "/Users/sagarmalik/Claude/Project Zero/bike-assessment"
python3 src/build.py && python3 tests/flowtest.py && python3 tests/geomtest.py
```

Expect **305/305** and **158/158**. If either number is lower, stop and read
§6 before touching a test.

---

## 2. Where things are, and how to run them

Project root: **`/Users/sagarmalik/Claude/Project Zero/`**, working copy only —
**there is no `.git` here.** See §5 for how to publish.

```bash
cd "/Users/sagarmalik/Claude/Project Zero/bike-assessment"
python3 src/build.py          # writes prototype.html AND prototype.dev.html
python3 tests/flowtest.py     # 305 behaviour assertions
python3 tests/geomtest.py     # 158 measured-geometry assertions
```

`.claude/launch.json` defines one server, **`prototypes`** — `python3 -m
http.server 8412` from the project root. Start it with the preview tool, then:

```
http://localhost:8412/bike-assessment/prototype.html
```

**Always serve it.** On a `file://` URL the page renders but scripts do not run
in the preview pane, so nothing responds to a tap.

`prototype.dev.html` (~680 KB, assets by path) is the one to open while
working; `prototype.html` (~7 MB, everything inlined) is the deliverable.

### The public link

**https://yulusagar.github.io/yuzen-flow/** — no login, any device. It serves
`index.html` from a **separate public repo**, `yulusagar/yuzen-flow`, which
holds only the built file. See §5.

---

## 3. What this session changed

All of it is in the two repos except the five files in §1.

**Home**
- The workbench shortcut row now rests half behind the global nav on every
  profile. The spacer above My Tasks is **computed per profile**, not fixed —
  see `paintHomePeek()` in `screens/home/script.js`. A Quality Associate's
  three task cards wrap to a second row and start 184px lower than a
  Mechanic's one, so a single tuned number would push their shortcuts off the
  scroller entirely.
- QA home: Bike assessment takes row one alone; QC and RTD pair on row two
  with RTD on the right. Done with `grid-column:1` on the QC card, **not** by
  reordering the markup — so the DOM still reads in pipeline order and tab
  order still follows what you see.

**Every screen — short viewports**
- The frame was a fixed 844 tall and overflowed on anything shorter, taking
  each screen's bottom bar below the fold. It is now `min(844px, 100dvh)`.
  A `max-width:430px` rule already handled narrow viewports; **short and wide**
  ones — 560×640, a landscape phone, a small laptop window — never matched it.
- Four bars were pinned by `top:` offset, which only lands on the floor while
  the frame is exactly 844: the RnM footer, the progress strip riding it, and
  the start screen's author strip and footer. All four now measure up from the
  bottom.
- Verified at 560×640, 380×420 and full height: every bottom bar across all
  eighteen screens sits flush at 0px from the frame floor.

**RnM dashboard**
- The open-tasks sheet can now be swiped down from **anywhere on it**, not just
  the grabber. Nothing moves until the finger has travelled `DRAG_MIN` (8px)
  downward and the gesture is more vertical than horizontal, so a tap still
  opens the row; once it has moved, the click is suppressed. A press on the
  grabber still closes with no threshold.
- **The sheet is now the resting state** — the screen opens on Checklist /
  Mechanical / Electrical, with the command grid covered underneath. *(This is
  in the uncommitted set.)*
- **Bike commands is back in the ⋮**, first in the list. On this screen only it
  does **not** raise the shared persistent sheet — it calls `rnmShowCommands()`,
  which lowers the task sheet to reveal the grid this screen already owns.
  Raising a second copy would put two Power buttons on one screen. *(Also
  uncommitted.)*

**Test suites**
- Both harnesses moved from a 460×900 Chrome window to **460×1000**. At 900 the
  usable viewport is 813, so the new frame clamp shrank the frame *inside the
  suite* and three RnM assertions failed on shifted y-positions.
- The RnM geometry block was rewritten from absolute positions to
  **relationships** — see §6.

---

## 4. Open items

Nothing is half-built. These are decisions and known gaps.

1. **The commands sheet does not share state with the RnM dashboard's tiles.**
   Open it on top of the dashboard and the two Power tiles will disagree.
   Nothing reads the bike back, so syncing them would invent a truth the
   prototype cannot honour. Which one is authoritative is a product call.
2. **`markissues` still offers Bike commands in its ⋮ while `issues` does not.**
   Flagged in `sheet-config.js` as hard to defend. Unresolved.
3. **On a genuinely short viewport, content above a bottom bar is clipped**, not
   scrolled — on RnM at 640 the command tiles are cut off behind the footer.
   Deliberate trade: the bar you need stays reachable. Making those screens
   scroll instead is a bigger change.
4. **The Issues screen has a second, incompatible design** by another designer,
   published alongside this one. Do not reconcile without asking — it is an
   open product decision, not an unfinished merge.
5. **A saved note on the complaint screen cannot be unlocked.** By design, but a
   typo is permanent for that token.
6. **None of the design work is measured.** No usability study, no telemetry, no
   mechanic interviews. Every "this is better" is design rationale. If asked to
   write anything presentational, keep that distinction explicit — see
   `HANDOFF-presentation.md`, which is **local only and deliberately never
   committed** (it discusses Sagar's promotion case and the whole team commits
   to this repo).

---

## 5. Git — two repos now

**No `.git` in the project directory.** To publish, clone, rsync, commit there.

### `yulusagar/Project-Zero` — private, the real repo

Source, both suites, rationale, and fifteen prototypes. Shared: the whole team
commits straight to `main`. **Always fetch and inspect before pushing, and
never force-push** — history has been rewritten here before and a colleague's
commit was destroyed by it.

```bash
rm -rf /tmp/pz && git clone git@github.com:yulusagar/Project-Zero.git /tmp/pz
cd /tmp/pz
rsync -a --delete --exclude docs --exclude prototype.dev.html \
      --exclude .DS_Store --exclude __pycache__ \
      --exclude HANDOFF-presentation.md \
      "/Users/sagarmalik/Claude/Project Zero/bike-assessment/" bike-assessment/
git add -A
git -c user.name="Sagar Malik" -c user.email="sagar.malik@yulu.bike" commit -m "…"
git push origin HEAD:main
```

**Anything outside `bike-assessment/` belongs to someone else.** Folder authors:
Vaishnavi (`mechanic-checks`, `qc-task-list`, `wynn-xp`), Barun Sethi
(`assessment-flow`, `token-details`, `token-flow-captain`), Mridul Goyal
(`add-issues`, `quality-associate-flow`), shared (`RnM-home-page`,
`token-task-list`, `mechanic-rnm-flow`, `stitched-flow`), Sagar (`mark-faults`).

Sagar asked to "remove the side flows". **Nothing was deleted.** The landing
page now lists only the main flow, and `build-index.py` carries the rest in a
`SET_ASIDE` list with their authors — restoring one is moving a name back up.
Retiring someone else's prototype is their call.

### `yulusagar/yuzen-flow` — public, the link

Holds the built file as `index.html`, plus **seven sidecars**
(`version.txt`, `manifest.webmanifest`, `sw.js`, three icons, the Apple touch
icon), `.nojekyll` and a README. Pages serves it off `gh-pages`. **It is a
snapshot, not a mirror** — republish by hand.

**`index.html` and ALL its sidecars must ship in ONE commit.** The page polls
`version.txt` against a build id baked into itself, so a split commit leaves
field testers stale or reload-looping. Use `git add -A`, never `commit -am` —
`-am` stages only already-tracked files, so a new sidecar is dropped silently
and produces exactly that split commit. `sw.js` ships on purpose; it is a
pass-through worker for the install prompt, not a cache (see `src/MAP.md`).

```bash
cd /tmp/yuzen-public
S="/Users/sagarmalik/Claude/Project Zero/bike-assessment"
cp "$S/prototype.html" index.html
cp "$S/version.txt" "$S/manifest.webmanifest" "$S/sw.js" \
   "$S/icon-192.png" "$S/icon-512.png" "$S/icon-maskable-512.png" \
   "$S/apple-touch-icon.png" .
git add -A
git -c user.name="Sagar Malik" -c user.email="sagar.malik@yulu.bike" commit -m "…"
git push origin main && git push origin main:gh-pages
```

If `/tmp/yuzen-public` is gone, re-clone `git@github.com:yulusagar/yuzen-flow.git`.

`git ls-remote` works over SSH as `yulusagar` (re-verified 21 Sep 2026 on the
new Mac; home is `/Users/sagarmalik`). There is **no `gh` CLI and no
API token**, so repos cannot be created and Pages cannot be toggled from a
session — that needs the web UI. Do not ask Sagar to paste a token.

---

## 6. Traps that cost real time here

**The test suites now assert relationships, not absolute positions.** The RnM
block was rewritten this session. Sizes, insets and gaps between neighbours are
the contract and stay exact — 52 of those. Where a thing *sits* is asserted
against the thing above it, or the frame edge it anchors to. Verified by
running the suite at 460×900, where the frame shrinks to 813: **158/158 at both
window sizes**, where three assertions used to fail. When you change a layout,
prefer fixing the CSS to loosening an assertion — but if an assertion encodes a
*decision* rather than a *contract*, loosening it is now the house style.

**`flowtest.py` writes `⋮` two different ways.** Some lines carry the six
literal characters `\u22ee`; others carry the real glyph `⋮`. They look
identical in an editor and in a terminal. Three string-replacement attempts failed
on this before it was spotted. Find both forms before you edit either suite:

```bash
grep -n '\u22ee' tests/flowtest.py    # the escaped form
grep -n '⋮' tests/flowtest.py         # the real glyph
```

**Dump the bytes before pattern-matching** either suite — `repr()` is the only
thing that tells the two apart:

```bash
python3 -c "s=open('tests/flowtest.py').read().split(chr(10)); print(repr(s[805]))"
```

**Prefer line-index edits over string matching in the suites** — and after any
index-based splice, re-print the region. Two files were broken this session by
dropping one line too many, once losing a closing paren.

**The build ships the pre-rendered DOM**, so any load-time DOM mutation runs
twice — once in headless Chrome at build time, once in the browser. Anything
that appends or stamps nodes must clear first. Setting `textContent`,
`innerHTML` or a style is idempotent and safe; appending is not.

**geomtest crashes rather than fails** when it measures a deleted node —
`getComputedStyle(null)` throws and kills the harness before it emits JSON. A
green run only counts if it printed a number.

**Headless does not tick CSS transitions under virtual time**, and the preview
pane freezes timers between tool calls. Screenshot to wake the pane before
measuring, and disable transitions before any geometry probe — a mid-transition
read reported the faults footer overflowing by 124px when it was flush.

**`document.querySelector('.appbar')` returns the first one in the document**,
not the screen's. Scope bare queries to the screen element.

---

## 7. How to work with Sagar

- **Push back — do not be a yes-man.** If a claim overreaches, say so.
- **Decision-first, terse replies. No long recaps.**
- **Never push, open a PR, or do anything outward-facing unless asked in that
  same message.** "Go ahead" covers one action, then expires.
- **Verify in the browser yourself; do not ask him to check.**

**On pace — he raised this directly and it matters.** A five-line change cost
far too many turns last session. What he asked for:

- Match comment length to the size of the change, not to the file's house
  style. A 5-line change does not need a 12-line rationale.
- One verification pass, not three screenshots of the same thing.
- Do not write extra test assertions to defend a change he asked for.
- Byte-check before string replacement, so an edit lands first time.

He accepted loosening brittle assertions over maintaining them exactly. That
work is done for the RnM block; the same treatment has **not** been applied to
the rest of geomtest — 6 absolute-x pins and a handful of y pins remain
elsewhere. Do them opportunistically when one breaks, not as a project.
