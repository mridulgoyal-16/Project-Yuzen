# Bike Assessment flow — Yuzen

> **Bike Assessment** is the check you run on a bike when it comes back in. You go
> through every part on the list one at a time and mark it Good or Faulty — swipe
> right for good, left for faulty. Once the whole list is done, you go through just
> the faulty parts and record how bad each one is and whether the customer should
> be charged for it.

Seven screens, one self-contained HTML file (390×844 mobile frame):

  **Home** — the mechanic's landing screen. Tapping **Bike assessment** opens…
  **Tokens** — Barun's token queue, opened from Home's Active tokens card.
  **Bike Assessment** — the queue of bikes waiting. Picking one opens…
  **Repairable bikes** — a second listing off Home, in three sections. Picking one opens…
  **The repair task** — the same task page, with its own four steps. Its first opens…
  **Feedbacks** — what the rider recorded and the captain wrote down.
  **The job** — what this bike needs: the assessment, then remove battery, then drop. Step one leads into…

0. **Start** — what the task is, who it is assigned to, and `Start now`.
1. **Assessment** — a mechanic swipes each part of the checklist **Good** or **Faulty**.
2. **Mark faults** — details every part that came back faulty: penalty, damage,
   optional photos.
3. **Bike photos** — the whole vehicle from four sides, then `Checklist done`,
   which ticks the step and returns to the job.

Screens 1 and 2 are assembled from the two prototypes already in this repo:
[`assessment-flow`](../archive/assessment-flow/) (Barun Sethi) supplies screen 1,
[`mark-faults`](../archive/mark-faults/) (Sagar Malik) supplies screen 2. Screen 0 is
built from Figma `2108:27680`.

## Run it

Open the published build at https://mridulgoyal-16.github.io/Project-Yuzen/yuzen-flow/,
or the local copy `../yuzen-flow/index.html`. It needs no server and no network,
because Satoshi and every photo are embedded.

> **Open it in an actual browser.** Inline preview panes sandbox JavaScript, and
> some ignore the frame's `overflow:hidden`, which makes the Submit button look
> permanently visible when it is not. AirDrop it to a phone to feel the swipe.

How to build, test and change it is in [`src/MAP.md`](src/MAP.md). This README
covers what the flow does and why.

## The flow

Screens sit in order `home → task → repair → tokens → job → feedback → assess → faults → photos`, so the one behind the
current screen parks to the left and the one ahead parks to the right. Direction of
travel falls out of the index rather than being passed in.

### Home

Built from Figma `2137:29516`. Shift-status bar with an `On Duty` tag, a 2×2 grid
of task counts, and a 3×2 grid of workbench shortcuts, over a fixed 100px bottom
nav. Only **Bike assessment** is wired — every other card, shortcut, `View all`
and nav item reports and stops, the same way the task list upstream does.

The nav is **Home · Performance · Profile**. `Performance` replaced `Tasks`, which
was competing with the `My Tasks` grid directly above it and with the task queues
those cards open — three things called tasks on one screen. Its icon is three
rising bars rather than a speedometer: the tab is how much a mechanic got through,
not how fast they went. They are 3px pill bars, drawn to carry the same weight as
the outlined icons either side — solid square bars read heavier than their
neighbours at 24px.

The buttons are `min-width:64px` rather than a fixed 64: `Performance` is 70px at
`Label/XSmall` and hung 3px out of a fixed box. Sizing to content leaves every
centre where it was — with `space-between` and three items the middle one is
centred by symmetry whatever its width, and the outer two are pinned to the padding
edges. Measured at **86 / 195 / 304** before and after, gaps even at 42.

The **shift bar is pinned chrome**, not content: it sits above the scroller, so it
neither slides down with the page's top padding nor scrolls away with the list.

The scroller carries **48px of top padding**. Without it the shortcut captions
landed at 734–750 against a visible area ending at 744 — every label sliced through
the middle of its own text, which reads as broken rather than as "more below". The
push leaves the `Workbench shortcuts` heading clear and about half of each tile
showing, so the row reads as a deliberate peek. The padding scrolls away, so it
costs nothing past the first screen.

**The airiness at the top is the cost of that peek.** 48px of padding plus the
existing 94px `.hm__gap` puts 142px between the shift bar and `My Tasks`. The peek
exists *because* of that height — trimming the gap moves the cards back up. Worth
deciding as a pair rather than one at a time.

### Bike Assessment (the queue)

Built from Figma `2139:29694`, with the filter chips from `2139:30088`. Two-line app
bar — title plus the average wait for whatever you are filtered to — a search
action, three chips, 96px rows, and a `Filters` / `Sort by` bar.

Chips are **All** (default), **Revive**, **Assessment** — 16px above and below,
closed by a hairline so the row reads as a band rather than floating. Row dividers
are inset 24px either side.

Each row leads with the **wait time**, with the bike number and model beneath
(`5080407 • DeX 3.0`) and the battery on the right.

A **scan FAB** sits bottom-right above the `Filters` / `Sort by` bar.

Scrolling down clears the screen for the list: the chip row slides up under the app
bar and the bar drops below the fold, while the **FAB stays put**, moving down into
the space the bar vacated. Scrolling up brings both back. There is 8px of slack so
finger noise cannot flicker them — the threshold `qc-task-list` settled on.

Both the chip row and the dock are **overlays**, not flex items, and the list keeps
its full height with 80px / 128px padding instead. That matters: collapsing an
in-flow band hands its height to the list, which can clamp `scrollTop` and read as
an upward scroll — the oscillation Vaishnavi has to absorb with a timer. Nothing
resizes here, so the direction signal stays clean and needs no guard. A test asserts
the list's height is identical with both hidden.

The list is **sorted by wait time, longest first**, in every filter — a queue is
served in the order it formed. `FLEET` keeps its own order; the sort is applied to
a copy, so the data never depends on what you last looked at. Each row carries the
**bike number, model, wait time and battery**. `Revive` is not a separate list: it
is the bikes whose battery has reached **0%**, so a bike moves between filters by
its own state and Revive + Assessment always add up to All. The header average
recomputes per filter.

Model names (`Miracle 2.5`, `Miracle 3.0`, `DeX 2.5`, `DeX 3.0`) and the bike-number
scheme are Vaishnavi's from [`qc-task-list`](../archive/qc-task-list/), so a bike reads the
same in both prototypes.

**Picking a bike is what enters the flow** — it sets `BIKE` and opens Start, so the
number and battery you chose follow through every screen. That is the
`{ id, battery }` hand-off `onTaskOpen` describes.

### Tokens

**Barun's `token-task-list`, moved in here rather than kept alongside.** There is
one copy now — the standalone folder is gone — so his queue and this prototype
cannot drift.

His stylesheet and logic are near enough verbatim. What changed, and only this:

- **No bottom nav.** It is a screen reached from Home's card and left by a back
  button; a nav would be a second, contradictory way out. His nav markup, CSS and
  handler are gone.
- **No status bar or phone frame of his** — the app owns those.
- **A back button**, which meant his app bar had to go from `justify-content:
  flex-end` (right for a lone Search) to `space-between`.
- **His `:root` and `*` reset dropped.** Ours already declare the same token names,
  including the `--content-disabled` / `--surface-disabled` he had to add. His
  `--space-8/16/24` map to our `--s2/--s4/--s6`.
- **Three class renames**: `.appbar` `.track` `.body` → `.tqbar` `.tqtrack`
  `.tqbody`. Those are the only three names our stylesheet also claims, so nothing
  is scoped and nothing leaks either way. Neither side has a bare `.is-*` rule, so
  the state classes cannot cross.
- **His JS is wrapped in an IIFE.** Unwrapped it declares `toast`, `toastTimer`,
  `S` and `setTab` at top level, and this build concatenates every screen into ONE
  script — a second `function toast` is a redeclaration SyntaxError that takes the
  whole app down. Wrapping also lets his `toast(...)` calls fall through to ours,
  so there is one toast in the app rather than two.
- **`renderTabs()` clears before it appends.** His original appended into an empty
  strip, which is right for a page loaded once — but this build ships a
  pre-rendered DOM, so his init has already run and the tabs already exist.
  Appending again gave six. Same trap as the icon stamping.

**One bug the port surfaced, and it was ours to fix.** His `setTab()` brought the
active tab into view with `scrollIntoView({inline:'nearest'})`. That walks up
*every* scrollable ancestor — and `.phone` was `overflow:hidden`, which still makes
an element a scroll container. So on load, before any interaction, the frame
scrolled 99px and **the entire UI sat 99px left**: status bar, every screen, all of
it. Standalone his page had no such ancestor, which is why it never showed there.

Fixed at both ends. His code now scrolls the tab strip directly rather than asking
the browser to walk ancestors. And `.phone` is **`overflow:clip`**, which clips
without creating a scroll container — so no future `scrollIntoView`, autofocus or
anchor jump anywhere in the app can move the frame. A test asserts the frame stays
put when a screen deliberately calls `scrollIntoView`.

`window.Yuzen` is left exactly as he wrote it: that is the contract the other
prototypes plug into, and it still reports every tap.

`build.py` now also inlines `src="assets/…"`, not just CSS `url()` — his icons are
`<img>`, and a deliverable that reaches for the filesystem works only on the
machine that built it.

### Repairable bikes

Opened from Home's **Repairable bikes** card, and deliberately the assessment
queue's twin: it **reuses** `.tkscroller`, `.tkchips`, `.tklist`, `.tkrow` and
`.tkdock` rather than cloning them, so the two listings cannot drift apart. Only
the differences live in `screens/repair/`.

Three differences from that screen:

- **One-line header.** Title and search, no average line — so it uses the standard
  `.appbar__titles`, not the queue's two-line `.tk__title`.
- **No `Filters` / `Sort by` bar**, so the dock is the FAB alone. That changes the
  scroll behaviour: on the queue the FAB drops into the space the bar vacates, but
  with no bar there is nowhere to drop to, so here only the chips slide away and
  the FAB stays put. Same 8px of slack.
- **Rows are one line** — `5081300 • DeX 3.0` — at 72px rather than the queue's 96,
  since 24 + 20 + 24 needs no more.

Sections are **Live** (default), **In-flow** and **Stock**. **Live carries an 8px
red dot**, and only Live — the other two are bikes that are not going anywhere, so
a status light there would say nothing.

Sections are **Live** (default), **In-flow** and **Stock**. Battery shows on Live
only: it is the only section where the charge is actionable, since a bike in Stock
is not going anywhere on it. That is a call worth checking — it means the same bike
appears to lose its battery reading when it moves section.

**Two bikes are `Assigned to me`** — one in Live, one in In-flow, so the behaviour
shows up in more than one section. They carry a `content/tertiary` second line and
**sort to the top**. With no Sort control on this screen that ordering is the only
one there is, so it is a rule rather than a default.

`REPAIR` holds 12 bikes, matching the count on Home's card — a test asserts the two
agree, since a listing that disagrees with the card that opened it is the kind of
thing nobody notices until a demo.

Tapping a row reports and stops: there is no repair flow yet.

### The job page

**One page, two kinds of task.** The assessment queue and the repairable list both
open this screen; `jobKind` decides which. Everything visible is shared — hero,
collapsing header, `Learn`, progress strip, stepper, `⋮` — and only the title, the
steps and the button labels differ:

| | Assessment | Repair |
|---|---|---|
| Title | Bike Assessment | Repairable bike |
| Steps | Assessment checklist · Remove battery · Drop in Repairable Bike Area | Feedback · RnM Dashboard · Part exchange · Park in repaired bikes |
| Progress | weighted, 35/15/10/25/15 | equal shares, 25 each |
| `×` returns to | the assessment queue | the repairable list |

It is parameterised rather than copied because a second copy of the collapse
logic is exactly the thing that drifts — the two FABs had already proved that.

A step may declare its own `cta`, which is how **`Feedback` shows `View Feedbacks`**
instead of naming itself. Later steps fall back to their label. The assessment's
first step stays the exception, since `Start task` / `Resume task` depends on
whether the checklist has been started.

The assessment sub-heading (`Assess bike parts 9/17 done`) is assessment-only — it
reads `PARTS`, which says nothing about a repair — so it is gated on the kind as
well as the step.

**The repair progress is equal shares, and that is a placeholder,** not a claim
that Feedback costs as much as a part exchange. Nothing behind those four steps is
built, so there is nothing to measure yet.

**Four steps do not fit above the footer.** The list scrolls and the fourth step is
reachable, but at rest it is clipped mid-label — the same thing that read as broken
on Home. Worth deciding: shorten the hero, or accept the clip on this kind.



Built from Figma `2144:30682`. A gradient hero with the day's **task number**
behind the vehicle, `×` and `⋮` as circular actions, then the task title with the
bike's model and number, then the steps the job is made of.

The bike render sits over the task number with **`mix-blend-mode: darken`**, per
Figma — the render's near-white backdrop drops out against the gradient so the
number reads through it while the bike stays solid. The asset is cropped to this
page's full width; it was shared with the summary card before that screen was
removed, which is why it is a wide crop the hero fills with `cover`.

**The header collapses.** The whole page is one scroller — hero, title and steps
travel together — with `×` and `⋮` in a bar that is always there, transparent over
the hero. Scroll far enough that the title block passes fully behind the bar and
the bar turns solid and takes the title in beside them, its background reaching up
over the status strip. The steps ride up into the space the image occupied. It
triggers on the title clearing the bar, not touching it: on contact you would see
the title twice.

**`Learn`** sits beside the title, from Figma `2149:31380` — 88x36 on
`surface/secondary`, fully rounded, `play_circle` at 20px, centred against the
two-line block. The padding is lopsided by 8/16 because the source is: the icon's
frame carries space its glyph does not fill, so even padding would read
right-heavy. It points at the same walkthrough the start screen's `Watch video`
does, so there is one video to supply rather than two — neither is wired.

It does **not** follow the title into the collapsed header. The bar already
carries `×`, the title and `⋮`; a fourth control there would crowd the row, and
the reference only shows `Learn` in the expanded state. Say if it should persist.

**The scroll ends flush with the header.** The scroller's tail padding is
measured, not fixed — `sizeJobScroll()` sets it to whatever is left of the
viewport once the steps are parked on the bar's bottom edge, so the list cannot
ride up underneath. It shrinks as steps are added and disappears entirely once
they fill the page; the floor is the footer's own height, or the last step would
sit trapped behind it.

**Progress is weighted by phase, not counted by click.** How many faults a bike
has is unknown until the checklist is done, so a click-count denominator would
move under the mechanic mid-task — the bar would go *backwards* on finding a
fault. Instead each phase owns a fixed share and reports only how far through
itself it is, so the total only ever rises:

| Phase | Share | Measured from |
|---|---|---|
| Assess bike parts | 35% | parts judged / 17 |
| Marking faults | 15% | faulty parts detailed / faulty parts found |
| Take bike pictures | 10% | sides shot / 4 |
| Remove battery | 25% | whole step |
| Drop in Repairable Bike Area | 15% | whole step |

Shares are the rough effort each phase costs, not its step count — the checklist
is 17 swipes and takes the largest share, dropping the bike is one walk and takes
the smallest. **These numbers are a guess and should be argued with.** Battery is
one lump until its own steps are specified.

The bar makes the same handoff the title does: in the page under the subtitle
while the header is transparent, then **docked directly beneath the header** once
it takes over. In the page it carries the figure (`29%`); docked it is the line
alone.

It is *under* the bar, not inside it. Sitting on the bar's bottom edge it crowded
the 72px row and doubled up with the divider — a 1px hairline over a 6px track in
the same `border/primary` reads as one 7px band. So the bar drops its hairline and
the strip separates instead. `--jb-bar-h` keeps the two in step.

Everything that asks "where does the header end" now means the bottom of *both* —
`jbStackBottom()`. That covers the collapse trigger and the tail padding, so the
list still stops flush, and the title's last 6px hides behind the strip's own
opaque track rather than peeking under the bar.

Steps are **done / active / idle**. Idle steps are `content/disabled` with a grey
dot and are not tappable; the active step gets a 72px `surface/secondary` band and
a `content/positive` dot; a done step gets the same filled check disc
the rest of the flow uses. A dashed rail joins them, measured dot-centre to
dot-centre rather than hard-coded.

**Step one is the whole assessment flow**, and it has three sub-tasks of its own:
`Assess bike parts x/17 done` → `Marking faults x/y done` → `Take bike pictures
x/4`. Untouched the step is a heading and nothing else. Once it is under way —
read from `PARTS`, not tracked separately — the **sub-heading names the sub-task
in hand**, being the first of the three not yet finished. That one line is all of
it: the step briefly listed the other two underneath, and that came out — the step
only needs to answer "what am I doing now". A bike with no faults skips straight
to `Take bike pictures`, so `Marking faults — none found` only ever appears if
that sub-task is somehow the current one. The
CTA changes `Start task` → `Resume task`. Finishing ticks the step and hands the
band to **Remove battery**, whose label becomes the CTA. The other two are stubs.

### Minimising a task

Built from Figma `2191:24126`. **`Minimize` in the ⋮ sheet parks the task on the
listing it came from** and drops the mechanic back there; tapping the parked band
resumes at the exact step they left. An assessment parks on the Bike Assessment
queue, a repair on Repairable bikes — the band knows which list it belongs to.

**A full-bleed band at the foot of the screen**: 390×84 on canvas, text inset
**24**, a bare 24px expand icon inset **24**, and a 6px progress bar riding the top
edge edge to edge. 16 above the first line and 24 below the second — the source is
asymmetric. The band is 90 tall in the build (6 + 84) where Figma's group measures
89, because the file overlaps the bar onto the band's `border/primary` hairline;
the bar is opaque and full width, so that hairline is never visible and is not
drawn here. **The bar *is* the band's top edge.**

Type is `Label/Medium700` on `content/primary` for the bike number with the model
in `content/tertiary`, and `Label/Small` in `content/tertiary` for the step.

**Both the FAB and the Filters / Sort bar stand down while a task is parked.** The
band is not a card floating above the dock furniture — it occupies exactly where
that furniture sat, so it replaces it. Two things competing for the same corner
would both lose, and getting back to your own work beats starting a scan or
re-sorting the queue. On Repairable bikes, where the FAB is the whole dock, the
band simply takes its place.

**And it does not hide on scroll.** The dock collapses by the *bar's* height (104),
which is more than the band is tall, so collapsing would take it clean off the
frame. With the bar already gone there is nothing left to collapse, and the one
thing on the screen that must stay reachable is the way back into the work.

Both listings give up list padding — 114 = band 90 + 24 — or their last rows would
sit underneath it.

#### This replaced a floating pill, and the reason was the bar

The first build was Figma `2191:25878`: a floating 342×80 pill on
`surface/primary`, fully rounded, lifted by `shadow-1`, text inset 32 and a 40px
translucent expand button inset 24. Two earlier attempts before that are worth
keeping:

- Inside the dock but transparent *with the FAB still showing*, list rows showed
  through beside it and it read as a card adrift mid-list.
- As an opaque band with a hairline **and no progress bar**, it read as chrome —
  something the screen owns rather than something you tap to pick up where you left
  off.

What changed the answer was adding progress. **Inside a pill the bar has to be
inset**, because a 40px radius swallows the first and last ~12% of the track — so
its scale drops 16% of the dock's width (286 of 342), and the low percentages that
matter most read worst. A barely-started task is the one you forget. On a boundary,
edge to edge, 8% looks like 8%, and the bar needs no contrast of its own.

The band costs the pill's "your work, liftable" read, and it costs the Filters /
Sort bar its place. Both were judged worth it. The four treatments that lost —
including filling the pill's background, which was the only option where the card
gets *visually weaker* as the risk of forgetting it gets higher — are recorded side
by side at five percentages in [`../dockcmp.html`](../dockcmp.html).

**Resuming returns to the screen it was minimised from**, not to the task page.
The ⋮ is on the checklist, Mark faults and Bike photos as well, so minimising
mid-swipe has to come back mid-swipe. Nothing is restored to do it: the screens
stay mounted, so the part they were on, the rows they had open and their scroll
position are all still there — only re-shown.

**One parked task per kind, not one overall.** An assessment and a repair are two
different jobs on two different queues, and parking one must not lock the other:
stepping away from an assessment to look at a repairable bike is ordinary, not
something that deserves a warning. So `minimised` is a slot per kind, each listing
shows only its own, and both can be docked at once.

This was one task *globally* until Sagar corrected it. The two kinds are safe to
run in parallel here for a concrete reason: an assessment carries its state in the
checklist, Mark faults and Bike photos, and a repair touches none of them. Two
tasks of the *same* kind would collide over that state, which is exactly what the
dialog still guards.

Leaving a live task by the back button abandons it without asking — only *parked*
tasks are protected. That is unchanged, and consistent, but it means a live repair
can be lost by resuming a parked assessment. Flagged below.

#### Progress on the parked band

The bar is the snapshot of how far through the task the mechanic was. 6px is
`--progress-h`, the same strip the job page wears, so the same number wears the
same form in both places. Fill on `surface/primary` over a `surface/secondary`
track, square, full width.

The percentage is **snapshotted when the task is parked**, not recomputed on
render. `jobProgress()` reads the live `PARTS` / `bikePhotos` globals, and those
belong to whatever task is open *now*, so a parked band asked later would report
the current bike's progress.

**There is no `55%` numeral on the step line.** An interim build had one, to back
up an inset bar that was hard to read at the low end. Edge to edge the bar carries
it alone, which is what the reference draws — and the step label gets its full
width back. It is still in the band's `aria-label` for screen readers.

#### The confirm dialog

Starting a different bike while one is parked asks first. A **centred modal**, not
a bottom sheet: the sheet is for choosing among actions, this is a question with a
consequence. Same scrim, so the two read as one system. `surface/inverse`, radius
16, inset 24, `Headings/Small` title, `Body/Medium` copy, and two full-width 64px
pills stacked — primary dark, secondary on `surface/secondary`.

**The copy changed from the brief, and the change is the point.** The draft read
*"Do you really want to start a new task, you'll loose progress on your previous
task"* with **Continue** / **Cancel**. Two problems: `Continue` is ambiguous —
continue the old task, or continue with the new one? — and "your previous task"
makes the mechanic remember which bike that was. So:

> **Start a new task?**
> You are partway through **5080407 • DeX 3.0**. Starting another bike assessment
> discards that progress — only one can be open at a time.
>
> `Discard and start new` · `Cancel`

The body names the *kind*, because the guard is scoped to it: "another bike
assessment" or "another repairable bike task". Saying "another task" would be a
lie now that a repair can be parked at the same time. **Discard clears only the
conflicting slot** — a parked task of the other kind is none of this dialog's
business.

The destructive button names what it does, and the body names the bike at risk.
The destructive action stays *primary* because it is what the mechanic asked for by
tapping another bike; `Cancel` is the way back, not the recommendation.

**Reopening the parked bike never asks** — that is a resume, not a new task.

### Feedbacks

Built from Figma `1993:30144`, opened from the repair task's **Feedback** step.
Read-only: everything is a 342-wide block inset 24, and the frame's y positions
reduce to one rhythm — 8 above the first heading, 36 from a heading to its content,
48 either side of the divider.

The app bar **centres its title** rather than running a breadcrumb, so the back
button is absolutely placed. Centring it against a flex sibling would push the
title off-centre by the button's width.

The **waveform is drawn, not an asset** — 31 bars on a fixed height pattern, so it
survives the row being any other width and looks the same in every screenshot. The
recording has no audio behind it, so play and `1 X` report and stop.

**Emphasis in the transcript is the source's**, and it is doing work: the phrases a
mechanic acts on are `content/primary` against `content/secondary` for the rest, so
*stopping*, *difficult to start again* and *makes noise, brake is loose* carry.

`Okay` ticks the Feedback step and hands back to the task, where the CTA becomes
**`Start RnM`**. The step stays **tappable after it is done** — `revisit: true` on
the step — because the feedback is what the rest of the repair is judged against,
so it has to stay readable. The later steps stay locked.

### Screen 0 — Start

Gradient hero, the task title in Satoshi Black 56/56, the description clamped to
four lines, an inert `Watch video` pill, the assignee, and `Start now`.

**This screen is currently off the path.** The job page is now the flow's doorway,
and `Start task` there goes straight to the checklist — routing through this as
well would be two intros back to back. The screen is built and intact; nothing
navigates to it. Delete it, or put it back between the job page and the checklist,
but it should not stay orphaned.

### Screen 1 — Assessment

The list is headed **Assessment Checklist** at 20/24 Bold. At the top
the app bar carries only the bike number, `543210`; as the large heading scrolls
up the rest of the breadcrumb slides in behind it, giving `543210 / Assessment
Checklist`, and retreats again when you return to the top. The bike number never
leaves. The threshold is measured off the heading block, not hard-coded.

The **progress bar** sits directly under the app bar, so how far along you are
reads without looking to the bottom of the screen.

The **⋮ button** in the header opens an options sheet with `Report issues on bike` and
`Bike commands` — drag the grabber down or tap the scrim to dismiss.

The footer **does not exist until every part is judged**. There is no disabled
`Next` to look at: when the checklist is finished the footer slides up carrying
one primary action, and the list gives up exactly its height so no row is
covered, and the button names its destination — **Mark Faults**. `Add issues` has
moved off the footer into the ⋮ sheet as `Report issues on bike`.

| Gesture | Result |
|---|---|
| **Swipe right** | Marks the part **Good** |
| **Swipe left** | Marks it **Faulty** |
| **Tap Good / Faulty** | Same as the matching swipe |
| **Tap any row** | Opens that part as the card. A part already judged opens with that call shown as the selected side |

The card tracks your finger and tilts; the tinted dashed panel behind it
brightens with distance. Past 30% of the card width — or a fast flick — it flies
off, the confirmation holds for 400ms, the row collapses with its status disc,
and the next pending part opens. Below the threshold it springs back. A vertical
drag scrolls the list instead of swiping.

The button reads **Mark Faults**, naming where it goes rather than just "next".

**The reason sheet is gone.** In the original prototype a left swipe opened a
bottom sheet to collect per-part reasons. Reasons are no longer collected here —
severity is captured on screen 2 instead. A left swipe now commits immediately,
same as a right swipe.

### Screen 2 — Mark faults

Titled **Mark Faults**, with the same hand-off: the app bar starts as `543210`
and completes to `543210 / Mark Faults` as the title scrolls up.

**Customer photos** sits in the app bar throughout. While the page title is still
on the page it is a labelled pill — icon plus Label/Small — and once the title
moves up into the app bar it gives that width back and collapses to the icon
alone, then returns when you scroll back. Pressing it opens the carousel **and**
puts the page into its scrolled state: the title block collapses to nothing so the
carousel is not competing with it for space. Closing brings the title back.

Only the parts marked faulty appear, as an accordion — one open at a time,
carrying the same part photo it had on screen 1. Arriving on the screen opens
the first part with no details yet.

Per part, spaced 16px apart:

| Field | Options |
|---|---|
| **Penalty** | `No` · `Minor` · `Major` — least to most severe |
| **Damage** | `Wear out` · `Cuts` · `Rust` · `Missing` — multi-select, `Missing` exclusive |
| **Photos** | optional, max 3 |

Penalty carries the severity and is single-select. Damage carries what is actually
wrong and is **multi-select** — a part can be worn *and* rusted. `Missing` is
mutually exclusive against the other three, and the exclusivity **switches rather
than locks, in both directions**: tapping `Missing` drops everything else, and
tapping any of the other three drops `Missing`. Nothing is ever disabled, so a
mechanic who marks `Cuts` and then finds the part is gone reaches `Missing` in one
tap. Tapping a selected chip clears just that one.

A collapsed row reads `Minor penalty | Wear out, Cuts` — listed in chip order, not
tap order, so the same combination always reads the same way.

Each row carries the **same status slot as the checklist**, using literally the
same two icons: `rowPending`, the dashed ring, while a part still has no details,
and `rowGood`, the filled disc, once penalty *and* damage are both set — at which
point the collapsed row also reads `Penalty | Major damage`. There are **no
chevrons**; rows are still tappable, exactly as they are on the checklist.

The carousel itself is four swipeable slides that push the list down and stay
pinned there until closed. The header button turns dark while it is open.

**Bike photos** slides up once every faulty part is detailed. It sits **in flow**, not
as an overlay: it claims 124px and the list shrinks to match, so nothing is ever
hidden behind it.

`Back` returns to the checklist. Details already entered survive the trip — and
survive a part being flipped good and faulty again.

If every part comes back good, screen 2 shows an empty state and the button is
available immediately.

### Screen 3 — Bike photos

Built from Figma `2137:28918`. Four 163×200 dashed tiles in a 2×2 grid, 16px
apart, one per side — Front, Back, Left, Right — under the prompt
*Take bike photos from 4 sides:*.

An empty tile carries a 32px camera in its centre — the same `add_a_photo` glyph
and colour as the Mark faults camera card, so both read as "tap to capture". It
fades out once that side is taken.

Tapping a tile captures that side through the **same camera path Mark faults
uses**, so both behave identically on a phone and on a desk. A captured side fills
its tile with the photo, keeps its label readable on a bottom scrim borrowed from
the customer-photos carousel, and offers a remove control. Captures survive going
back to Mark faults and returning.

**`Checklist done`** closes the step out: it reports the bike, the faults and
which sides were shot to the console, ticks the Assessment checklist step, and
returns to the job page with **Remove battery** live.

**There is no summary screen.** It used to sit here — a Done badge, the vehicle
card, `Yeah!!` — and it was a page between the work and the next piece of work.
The job page already carries the progress and what is left, so finishing now lands
you there. Removing it also fixed a real bug: the summary's `Yeah!!` reset every
part *before* advancing the step, which zeroed all three assessment phases and
sent the whole-task progress bar back to **0% just as the mechanic reached Remove
battery**. Progress now runs 0 → 60 → 85 → 100 across the three steps.

**The flow is bracketed by the job page.** It is entered by `Start task` and every
way out of it — the checklist's back, `Checklist done` — returns there. The
listing is one step further back, Home two.

**Breadcrumb headers are one component across Assessment, Mark faults and Bike
photos** — 72px row, back button 4px in, breadcrumb at 52px, one hairline. A test
asserts all three agree, measured against each screen's own edge rather than the
phone's, since parked screens are translated.

The suffix (`/ Mark Faults`) is the fiddly part, and two of its rules exist only
because of how inline-blocks behave:

- It collapses to **zero width**, not zero opacity. Hidden with opacity alone it
  still occupied its width on a `nowrap` + `ellipsis` line, which truncated the
  bike number and left a gap after it.
- Its separator is an **`&nbsp;` inside the span**, not a plain space before it.
  Inside, so it collapses along with the rest; non-breaking, because a leading
  ordinary space is stripped at the start of an inline-block and the slash ran
  straight into the number.
- It is **`vertical-align:top`**, because an inline-block with `overflow:hidden`
  takes its baseline from its bottom margin edge. That grew the line box to 24px
  and lifted the breadcrumb 2px above the same line on Bike photos, which has no
  suffix.

**Bike photos shows its breadcrumb in full at all times**, where the other two
reveal theirs on scroll. That follows from Bike photos having no large page title
to hand off from — but it does mean the three bars behave differently even though
they look identical at rest. Flagged below.

**The bike now follows the whole way through.** Picking it from the queue sets
`BIKE` and every breadcrumb and the job title read from it. Those
breadcrumbs had been hardcoded to `543210` since the first screen was built — the
job page showing the real bike is what exposed it.

## Config

`src/shared/config.js`:

- `AUTO_ADVANCE` (default `false`) — on screen 2, open the next part without
  details as soon as penalty and damage are set. Off because photos are optional
  and usually added after the damage call.
- `CAMERA_MODE` — `'auto' | 'camera' | 'sample'`. `auto` fires a real
  `capture="environment"` input on touch devices and drops in a sample photo on
  desktop, so the flow can be demoed without a camera.
- `MAX_PHOTOS` — 3. A fourth thumbnail plus the add card overflows the 342px row.

The 17-part checklist lives in `PARTS` — the five with renders first, then the
twelve awaiting photography. In production it comes from the vehicle's inspection
template.

## Decisions worth pushing back on

**Opening a part morphs the row into the card.** The thumbnail grows into the
card's image, the title travels with it and the buttons land just behind — 300ms on
an ease-out, so it is most of the way there by halfway. The same morph runs after a
swipe, since that also changes which part is open.

**The card rests a little above centre**, at a third of the free space rather than
half. Dead-centre pushed `Faulty` / `Good` into the bottom quarter of the screen —
a reach on a phone held one-handed. Biased up, the image is at eye level and the
buttons sit at about 61% of the height instead of 74%.

**The scroll runs on the morph's clock.** `scrollTo({behavior:"smooth"})` picks its
own duration and curve, so the page was still travelling after the card had finished
growing and the two read as separate events. It is now hand-animated over the same
300ms on an easeOutCubic — close enough to the morph's bezier to be
indistinguishable, and matching it exactly would cost a solver for nothing. Measured
frame by frame it runs 628 → 565 → 531 → 517 → 514 and stops with the morph.

The reveal is called from inside the morph rather than from the callers, so the
scroll starts on the same frame as everything else and reads as one movement.

**Nothing animates height, and that is what keeps the list still.** `render()` swaps
a 96px row for a 392px card and a 392px card back for a 96px row in the same pass,
so the two deltas cancel: every row below the pair is already where it belongs and
the layout never moves.

An earlier cut animated the *incoming* card's height from 96 to 392, which meant
holding open a 296px hole the layout had already closed. Measured on a row below the
pair, content-space y:

| | row below | `scrollHeight` |
|---|---|---|
| before the press | 1112 | 1976 |
| first frame | **816** | **1680** |
| settled | 1112 | 1976 |

So the list jumped up 296px on the first frame and slid back over 300ms — the
bounce. The shrunken `scrollHeight` was the second half of it: near the foot of the
list the browser clamps `scrollTop` to the shorter content and releases it when the
height returns, which is the snap on the end. Both numbers are now flat across all
three moments.

The growth the eye actually wants is the **image** growing, and that is the ghost's
job — it was never the container's. Removing the height animation also made the
ghost land more accurately: its destination was always computed from the card's
final layout box, which the height animation had been contradicting.

The card's box now just **fades in over 140ms**, on the item rather than on `.card`,
because `swipe.js` owns that element's opacity and transform while a swipe is in
flight. `fill:"none"`, because a filling WAAPI animation out-ranks an inline style
and would quietly beat `flyOut()`'s `card.style.opacity = "0"`.

**Only the arriving card moves.** The card being left closes with no animation at
all: no image shrinking back into its row. It used to fly back up, and that upward
movement pulled the eye away from the very thing the mechanic needs next. Judging a
part is a rhythm of look-decide-swipe, and the only thing that should move is the
part arriving.

It is a **ghost, not a FLIP scale.** The thumbnail is 48×48 and the card's image is
310×220 — scaling one box into the other turns 1:1 into 1.4:1, so the picture
visibly squashes on the way. The ghost animates width and height instead, and
`background-size:cover` re-crops every frame, so the image genuinely grows.

Three things had to be got right, and each was wrong first:

- **The ghost rides in the scroller, not the frame.** `revealActive()` smooth-scrolls
  the list at the same moment, so a ghost anchored to the frame sailed away from its
  destination — on the first cut it flew up over the app bar.
- **The content delays are short.** At 60/110ms the card was a white panel for the
  first third of the move: the image had left the row and nothing had arrived yet.
- **Nothing may depend on an animation finishing.** A missed `finish` leaves the
  real image invisible for good; a stalled height animation holds the card at its
  *first* keyframe, which is the collapsed height, so an open card looks shut. Both
  are force-cleaned on a timeout, and any ghost still in the air is cancelled when
  the next part opens. Tapping quickly down the list used to stack them — four
  after two taps.

Honoured `prefers-reduced-motion`: the render happens with no animation at all.

**A mis-swipe is corrected by re-swiping.** Removing the sheet removed the only
way to change a call, so tapping any judged row re-opens it as the card, with the
earlier call filled in — `Faulty` on `--reveal-negative`, `Good` on
`--reveal-positive`, the same two tints the swipe reveal uses behind the card.
Swipe or tap the other way to change it. There is no undo toast.

To carry that fill, `Faulty` gained the same inner pill `Good` already had. Both
are transparent at rest, so the resting card is untouched and still 342×344.

**Screen 2's filled status is `rowGood`** — the same green disc screen 1 uses for
"good", now shared deliberately rather than approximated. It does mean a green
disc can appear on a row that is *faulty*, where it means "details complete", not
"part is fine". That ambiguity is now stronger, not weaker, since the two screens
use the identical asset. Worth a look on device before mechanic testing.

**Removing the chevrons removed the only visible cue that a row expands.** The
status slot took its place, which is consistent with the checklist — rows there are
tappable with just a status disc too — but on Mark faults the row genuinely opens
in place, and nothing signals that until you tap.

**Both screens now inset their dividers 24px.** Mark faults ran them full-bleed,
faithful to `Mark faluts 1`; the checklist insets them per `2024:33875`. That
inconsistency is resolved in favour of the inset, so the Figma frame for Mark
faults is now the one that is out of step.

**The open Mark faults row is white, not `surface/secondary`.** Nothing but the
dividers and the expanded content now marks which item you are working on — the
grey band was doing that job. Worth checking on device that the open row still
reads at a glance in a long list. Two knock-ons: the part tile and the camera card
were white *because* the row was grey, so both moved to `surface/secondary` or
they would have disappeared.

### The ⋮ options sheet

Built from Figma `2186:22468`, and **shared by four screens** — the job page, the
checklist, Mark faults and Bike photos. 24px top corners, a 44x4 grabber 8px down,
72px rows with the content inset 24, a 24px Material Symbol, 16 to the label, and
dividers **inset 24** so they read as list rules rather than full-bleed bands. 36px
tail below the last row.

The dividers are a `background-image` gradient, not a border: the rows are spec'd
at exactly 72 and a border would add a pixel to that.

**The list is per screen, and rebuilt on open** rather than at load — so it always
matches where you are, not where you last opened it:

| Screen | Options |
|---|---|
| The job page | Bike commands · Minimize |
| Assessment checklist | Bike commands · Report issues on bike · Minimize |
| Mark faults | Bike commands · Minimize |
| Bike photos | Bike commands · Minimize |

Only the checklist offers `Report issues on bike`, since it is the only screen that
walks the parts. A screen opts in by marking its button `[data-opt-more]`; the job
page reuses the circular `⋮` it already had in its floating bar.

Getting there meant lifting the sheet out of the Assessment screen into shared
chrome. A sheet nested inside a screen renders wherever that screen is, so while it
lived in `#scrAssess` only the checklist could show it — opening it from anywhere
else would have drawn it off-canvas. Its CSS moved to `shared/sheet.css` for the
same reason.

**All three options report and stop.** `Bike commands` is almost certainly
Amitesh's vehicle-control screen; `Minimize` wants to park the task and drop back
to the queue, which needs somewhere to park it first.

**`Play to learn`** is on the task page only — both kinds of it — and sits above
`Minimize` so the dismissive action stays last. It shares `ICON.play` with the
start screen's `Watch video` and the job page's `Learn` pill: all three point at
the same walkthrough, so all three draw one glyph.

Icons that appear in static markup on more than one screen are stamped from `ICON`
via `[data-icon]` rather than pasted into each. **That stamp has to be idempotent**,
which is not obvious: `build.py` ships the *pre-rendered* DOM, so it runs once
before the file is written and again on every open. Without the guard every stamped
button carried two glyphs — the `Learn` pill measured 115px instead of 88.

**Three wording differences from the Figma, deliberately.** The frame reads
`Mark issues on bike`, `Minimise` and shows a chevron on `Bike commands`. This uses
`Report issues on bike` (the rename asked for earlier, and repeated in the brief),
`Minimize` as the brief spells it, and follows the frame on the chevron — only the
issues row has one, even though Bike commands also navigates. All three are
one-line fixes if the Figma should win.

**Every faulty part arrives expanded.** The screen opens showing the whole job
rather than one row with the rest folded behind taps — a mechanic can see how much
there is before starting. Rows fold as the work moves on: **tapping any row folds
away every *other* row that is already finished**, so what stays open is what still
needs doing. The row you tap opens; the exception is a finished row that is already
open, which folds, so there is still a way to put one away by hand. An unfinished
row never folds itself.

State is a `collapsedFaults` set of folded ids rather than one `openFaultId`, so
"all open" is the empty set and therefore the arrival state for free. Ids of parts
flipped back to good on screen 1 are pruned on every render, or a part marked
faulty a second time would arrive folded.

**Both progress bars are now the same component.** The Assessment checklist's
strip and the job page's docked strip are both 390x6, `border/primary` track,
`surface/primary` fill, square corners. They did not *look* the same: the checklist
kept the app bar's 1px hairline directly above its track, and since the hairline is
also `border/primary` the two merged into a single **7px** grey band against the job
page's 6px. The hairline is gone on that bar for the same reason the job page's
solid header drops its own; `--header-h` is 116 rather than 117 to match.

**The open item is padded 24 top and bottom.** `.ftail` used to grow from 24 to 36
when a row opened, which made the expanded card visibly bottom-heavy against the
24px above the thumbnail — the asymmetry was the first thing anyone noticed about
it. The divider already separates one item from the next, so the extra 12px bought
nothing. Open items are now 353px rather than 365px.

**Screen 1's status bar is now shared chrome** hoisted above both screens, and
screen 2 uses a flex column rather than screen 1's absolute skeleton — the
carousel and Submit both have to push the list, which absolute positioning
cannot do. Screen 1's own geometry is untouched: 96 collapsed / 392 expanded.

**The options sheet has no Figma frame.** It reuses the geometry of the reason
sheet the original prototype had — 24px top corners, 44×4 grabber,
drag-to-dismiss — and its rows are text-only. Neither option has an icon in the
design system, and a guessed glyph read worse than none.

**The page title is "Mark Faults" in title case**, as asked. The Figma frame and
the old breadcrumb use sentence case, "Mark faults". One of the two should give.

**The Mark faults title carries 16px below it, the checklist title carries none.**
The first item on Mark faults is usually the open one, and its grey band would
otherwise start directly under the title's line box. On the checklist the first
item is white, so the item's own 24px is enough.

**Part renders are PNG with alpha, and that is why the file is 1.4 MB.** Up to
65% of each render's visible crop is transparent, and the thumbnail tile is
`surface/secondary` on the checklist but `surface/inverse` on an open Mark faults
row — so the part cannot be flattened onto either colour and JPEG is out. WebP
carried the same alpha in a fifth of the bytes, but did not render from a CSS
custom property in Safari, so compatibility won over size. Colour is quantised to
192 entries at 520px, indistinguishable at 310x220 and ~35% smaller than full
RGBA. If the file ever needs to shrink, this is the first place to look.

**The card hero fills from the centre rather than using a hand-tuned crop.** The
old photographs needed `background-size:113.871% 90%` at `48.837% 0%`; these
renders are already framed around their part, so `cover`/`center` is honest and
survives new assets being dropped in.

**`Missing` exclusivity switches in both directions, which is more than was
asked.** The brief only specified that picking `Missing` clears the rest. The
reverse needed a rule too, and locking the other three would strand a mechanic who
marked `Cuts` before discovering the part was gone. This is Barun's original rule,
restored — he had argued the same case for the reason sheet.

**Damage types are a fixed list, where they used to be per-part.** Barun's
prototype gave every part its own vocabulary — `Punctured / Worn out / Cuts / Low
pressure` for a tyre, `Rusting / Pins bent / Burnt` for a connector. The four
options here apply to all 17 parts, which means `Rust` is offered for a throttle
and `Cuts` for an MCU. If the per-part lists come back, `DAMAGE` becomes a
property of the part rather than a constant.

**The two chip groups stack their label; Photos does not.** Damage's four chips
need 338 of the 342px row, so they cannot share a line with a label. Penalty
stacks too rather than leaving the two groups structurally different; Photos keeps
Figma's inline arrangement since it is one object with room to spare. The chip gap
dropped to 6px — the gap the original prototype's chip group used — to buy that
fit. Wrap is left on so a longer label degrades to a second line rather than
overflowing, and a test asserts both groups are currently one line each.

**The vehicle lives in one constant now.** `BIKE = {id, battery, assignee}` is
stamped into every place that shows it at boot, replacing the hardcoded `543210`
that used to sit in five separate places. That is exactly the shape the task list's
`onTaskOpen` hands over, so wiring the real vehicle is now assigning one object.

**Nothing resets the run any more.** `Yeah!!` used to clear every part and both
sets of photos so a facilitator could go again on a clean flow; it went with the
summary screen. Running back-to-back sessions now means reloading the page. Worth
restoring as a `⋮` action on the job page if you are demoing repeatedly.

**The bike you just assessed is still in the queue when you land back on it.** The
flow returns you to the job page and the listing is one step back, but nothing
removes the finished bike or drops the
count from 21. Left alone deliberately — repeatedly demoing the same bike is useful
during testing, and draining the queue is a data change rather than a connection.
Say the word and finishing will take it off the list.

**The chips dropped the counts the tabs carried.** The tabs read `Assessment • 15`
and `Revive • 6`; the chips are plain labels, as specified. The counts are now only
inferable from the rows. If they mattered, they belong either back on the chips or
in the header beside the average.

**Wait time leading the row costs the bike number its prominence.** The number is
what a mechanic matches against the vehicle in front of them; it is now grey and on
the second line. And because the list is already sorted by wait time, the wait time
being primary partly restates the order — the ranking already says it. Worth a look
on device: if mechanics scan for a number rather than a duration, these two should
swap back.

**A flat battery still shows a battery-shaped glyph.** Figma supplied only the one
green `battery_4_bar`, and a green part-full battery on a 0% bike reads as healthy —
the opposite of why it is in Revive. The colour switches to `content/negative` so
the state carries, but the glyph cannot. An empty-battery icon would fix it
properly.

**Bike photos has no large page title, unlike the other two content screens.**
The Figma frame puts the full breadcrumb `543210 / Bike photos` in the app bar and
gives the body a prompt line instead. That is right for this screen — the content
does not scroll, so a title that hands off on scroll would never fire — but it does
mean the app bar behaves differently here than on the two screens before it.

**`Assessment checklist done` is enabled with zero photos taken, which contradicts screens 1
and 2.** Both of those hide their footer until the step is complete, and you asked
for that explicitly on the checklist. The Figma frame for this screen draws the
button active against four empty tiles, so I followed the spec rather than the
pattern. If photos are mandatory this should gate on all four sides — one line in
`renderBikePhotos`. If they are genuinely optional, screens 1 and 2 are the odd
ones out and the button here should probably say what happens to the sides you
skipped.

**Page titles are 20/24, which is not a named style.** The Yulu scale jumps
Label/Medium 16/20 straight to Heading/Large 32/40 with nothing between, so
`.t-title-page` defines 20/24 locally. Both titles used Heading/Large until this
change. Two consequences worth a look: at 20px the title is only 4px larger than
the app-bar text it hands off to, so the collapse reads as a much quieter move
than a large-title transition; and if 20/24 is staying, it belongs in the library
rather than in this file.

**Both footers draw their divider as an inset shadow, not a border.** A border
adds a seventeenth pixel and puts the footer out of step with `--footer-h`, which
both the list's height and the slide-up offset are measured from.

**`reasons` is still in the data but unused.** Every part carries its reason
vocabulary (`Punctured`, `Worn out`, …) from the original prototype. Nothing
collects or displays it now. Kept so it is not lost if screen 2 ever shows it as
context for the severity call.

## Still open

- **The start screen's description is truncated with no way to read the rest.**
  Figma clips it at four lines and there is no "read more". `Watch video` is the
  only route to the full explanation, and no video exists. Either the copy needs
  to fit, or it needs an expand.
- **`Watch video`** — inert, no asset supplied.
- **The `×` on the start screen** goes nowhere; there is no task list above this
  flow yet. Currently toasts.
- **`Report issues on bike`** (was `Add issues`) — inert. Is it for reporting a
  fault on something *not* on the checklist?
- **The job page does not have enough content to collapse on its own.** Three steps
  are 208px against a 395px hero, so the tail padding that makes the gesture
  reachable is ~396px of white space you scroll into. The scroll now *ends* in the
  right place — the list stops flush with the header — but the emptiness under it
  is real, and it is the first thing a mechanic will hit. It resolves itself the
  moment there are more steps, or if the hero shortens. Worth deciding rather than
  padding around.
- **Filters / Sort are unreachable while a task is parked.** *Settled, but worth a
  second look on device.* The band takes the foot of the screen, which is where
  that bar sat, so it stands down — as the FAB already did. Defensible: with your
  own half-finished bike on screen, getting back to it beats re-sorting the queue,
  and the queue's default sort is the one you want anyway. But it is a capability
  that disappears rather than greys out, and nothing on screen says why.
- **A live task can be lost by resuming a parked one.** Park an assessment, start
  a repair, then go back and tap the parked assessment: the repair's progress goes
  without a dialog. It is consistent — leaving a live task by the back button has
  always abandoned it — but "one per kind" makes the collision reachable in a way
  it was not when only one task could exist. Either the guard should also cover
  live tasks, or resuming should offer to park what is open.
- **A repair's progress weights are four equal shares**, which is a placeholder,
  not a claim. Nothing on `RnM Dashboard`, `Part exchange` or `Park in repaired
  bikes` is built, so there is nothing to measure yet.
- **The progress weights are a guess.** 35/15/10 across the assessment phases,
  25 for the battery, 15 for the drop. Nobody has timed these. If Remove battery
  is really a two-minute job next to a seventeen-part sweep, 25% is too generous
  and the bar will feel like it stalls and then jumps.
- **Bike photos' breadcrumb never collapses, the other two do.** Assessment and
  Mark faults hide `/ Assessment Checklist` and `/ Mark Faults` until you scroll,
  handing the page title into the bar. Bike photos has no large page title, so its
  breadcrumb is simply always full. The three bars are pixel-identical at rest and
  then behave differently, which is the kind of thing that reads as a bug. Either
  give Bike photos a page title like the other two content screens, or accept it
  deliberately.
- **The Live dot is `surface/negative`, the system's red.** That red means *fault*
  everywhere else in this app — a flagged part, a flat battery. On a chip it reads
  as the broadcast convention instead, which is probably what you want, but it does
  sit two rows above green battery percentages on the same screen. Worth a look on
  device before it settles.
- **`Learn` is on the page title only.** The brief said "alongside headings",
  plural, but the Figma reference shows one — on the title row. If each step is
  meant to carry its own (a video for `Remove battery`, one for the checklist),
  that is a different and arguably better idea, but it needs three videos. Worth
  settling before it is built out — the step rows now have a free right edge.
- **`⋮` on the job page** is inert. It probably wants the same options sheet the
  checklist has, which currently lives inside that screen and would need lifting out.
- **Remove battery** and **Drop in Repairable Bike Area** are labels only.
- The Figma names the model `Dex NV`; the queue supplies the real one from the
  fleet, so it reads `DeX 3.0` here.
- **`Filters`, `Sort by`**, the queue's **search** and the **scan FAB** are inert.
  `Sort by` is now slightly misleading — the list already has a default sort it
  cannot change.
- The queue duplicates a lot of [`qc-task-list`](../archive/qc-task-list/) — tabs with
  counts, rows, the same models and id scheme. Vaishnavi's `Assessment • 14` tab and
  this `Assessment • 15` are arguably the same screen at two depths. Worth settling
  with her which one owns it before both grow.
- **`Missing`** is a damage severity on screen 2. It was also a reason on screen 1
  before the sheet was removed, so the collision is dormant rather than resolved —
  it returns the moment reasons come back.
- Whether penalty is genuinely a separate person's call from the good/faulty one.
  The flow currently walks one user through both screens.
- **Photography: 5 of 17 parts.** MCU, Pigtail Light, Throttle controller, Front
  wheel and Tyre have renders (Figma `2123:27951`) and sit at the top of the list.
  The twelve below carry the "photo pending" tile. Adding one is now three lines:
  drop the file in `src/assets/`, add a `--img-*` variable in `src/shared/base.css`
  pointing at it, and give the part a `photo`/`crop` pair. `build.py` picks it up
  by path — there is no manifest to keep in sync any more.
- The four customer photos are two real Figma photos plus two crops of one of
  them. Needs the real set of four.
- **The commands sheet doesn't share state with the RnM dashboard's tiles.**
  If you open it on top of the dashboard, the two Power tiles can disagree.
  Nothing reads the bike's state back, so syncing them would show a state the
  prototype doesn't actually know. Which one is authoritative is a product
  call.
- **`markissues` still offers Bike commands in its ⋮ while `issues` doesn't.**
  `sheet-config.js` flags this as hard to defend. Unresolved.
- **On a genuinely short viewport, content above a bottom bar is clipped, not
  scrolled.** On RnM at 640 the command tiles are cut off behind the footer.
  This is deliberate, so the bar you need stays reachable. Making those screens
  scroll would be a bigger change.
- **QC pending and RTD pending have no home-card icon.** The Figma frame only
  covers the four original cards.
- **A saved note on the complaint screen can't be unlocked.** This is by
  design, but it means a typo is permanent for that token.
- **Editing an existing issue on Add issues has no way to save the change.** A
  part that already has issues gets "Remove issues", so changing its reasons
  means removing them and adding them again.
- **The Issues screen has a second, incompatible design** by another designer
  on the team. Don't reconcile them without asking. It's an open product
  decision, not a merge that hasn't happened yet.
- **None of the design work is measured.** There's been no usability study, no
  telemetry and no mechanic interviews. Every "this is better" is design
  reasoning. Keep that distinction explicit in anything written for
  presentation.

## Source

Authored as a folder under `src/` and shipped as one file. Build, tests,
file layout and traps are in [`src/MAP.md`](src/MAP.md).

This replaced a single 2,680-line `template.html` on 2026-08-04. The split was
checked by rebuilding and confirming the output was **byte-identical** to the
single file's (same SHA-256, same 1,657,549 bytes), so it changed how the source
is organised and nothing about what ships.

## Figma

File [`HHciUbgAzmterprGPdJJbW`](https://www.figma.com/design/HHciUbgAzmterprGPdJJbW/Yuzen-Profiles) — Yuzen-Profiles

| Node | Frame |
|---|---|
| `2024:33715` | Assessment — screen and list rhythm (96 / 392) |
| `2024:33875` / `2024:34767` | collapsed row · expanded item + swipe reveal |
| `2024:33964`–`34426`, `2024:34799`–`35420` | swipe progressions |
| `2030:35821` | Assessment_complete — filled status discs |
| `2009:15704` | Mark faults — frames 1 through 4 |
| `2137:28918` | Bike photos — four-side capture grid |
| `2137:29516` | Home/mechanic — shift status, task counts, shortcuts, nav |
| `2139:29694` | Bike Assessment — queue, tabs, wait times, battery |
| `2144:30682` | Job — hero, task number, step list |
| `2123:27951` | Part renders — five 56px tiles, crops taken from here |
| `2108:27680` | Start — gradient hero, assignee, Start now |

Tokens are the Yulu design system throughout: Satoshi, the `content/*`,
`surface/*` and `border/*` semantic colours, and the 4/8/16/24/36 spacing scale.
The two swipe tints are the only derived values — `content/positive` and
`content/negative` at 10% over white (`#e5f0ed`, `#f8eae7`).
