"""
Build the Yuzen Bike Assessment flow into one self-contained HTML file.

Two stages:
  1. Inline every asset (Satoshi, part photos, customer photos) as base64 —
     no network calls, so it works offline on a phone in a service centre.
  2. Pre-render screen 1's checklist with headless Chrome and ship the
     resulting DOM, so the screen is fully visible even where scripts are
     sandboxed (preview panes, embedded viewers). The inline script survives
     the dump and re-renders identically wherever JS *is* allowed.

The source references assets by RELATIVE PATH — `url(assets/part_mcu.png)` — and
this inlines them by reading the path. It used to use `__IMG_MCU__` placeholder
tokens instead, which meant the source rendered as a complete, working prototype
with every image missing. That is the one broken state that looks like a working
one, and it cost several rounds of "the images are gone" before anyone noticed the
file was simply the wrong one. Relative paths cannot fail that way: the source
renders exactly like the build, so opening either is safe, and no JavaScript guard
is needed to tell them apart. Satoshi is vendored into `assets/fonts/` for the same
reason — and so the build no longer requires it installed system-wide.
"""
import base64, hashlib, mimetypes, pathlib, re, shutil, subprocess, sys, tempfile

SP     = pathlib.Path(__file__).parent
O      = SP / "assets"
def _find_chrome():
    """Chrome, wherever it is. Hard-coding the macOS bundle path meant the build
    silently degraded to a JS-only ship on any other machine, and the two test
    suites crashed outright. Order: an explicit CHROME env var, then the usual
    macOS and Linux locations, then whatever is on PATH."""
    import os, shutil
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    for p in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "/Applications/Chromium.app/Contents/MacOS/Chromium",
              "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
              "/usr/bin/chromium", "/usr/bin/chromium-browser",
              "/opt/google/chrome/chrome"):
        if os.path.exists(p):
            return p
    for n in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        w = shutil.which(n)
        if w:
            return w
    return ""

CHROME = _find_chrome()

# ── 0. assemble the source ──────────────────────────────────────────────────
# The prototype is authored as one folder and shipped as one file. Screens are
# split by FEATURE, not by language: to change the job page you open
# screens/job/, not three regions 800 lines apart in a 2,700-line document.
#
# Order is declared here rather than encoded in filenames because it is load-
# bearing in two different ways, and the two disagree. CSS order is cascade
# order; JS order is execution order, and some of it is parse-time (a screen's
# script grabs elements the markup must already have declared). Filenames could
# only carry one of those, so both live here where they can be seen and argued
# with.
CSS_ORDER = [
    "shared/base.css",              # tokens, type scale, chrome every screen uses
    "shared/morph.css",             # the ghost that flies task ↔ parked card
    "shared/sheet.css",             # the shared ⋮ sheet
    "shared/filtersheet.css",       # the task listing's filter sheet + its chips
    "shared/sortsheet.css",         # the task listing's sort sheet + its rows
    "shared/issuesheet.css",        # the checklist's fault sheet
    "shared/minitask.css",          # parked task + confirm dialog
    "shared/commands.css",          # the persistent Bike commands sheet
    "shared/vcard.css",             # the bike vitals card — sheet AND dashboard
    "screens/start/style.css",
    "screens/home/style.css",
    "screens/shift/style.css",
    "shared/filterbar.css",
    "screens/queue/style.css",      # the one task listing page
    "screens/job/style.css",
    "screens/feedback/style.css",
    "screens/tokens/style.css",
    "screens/complaint/style.css",
    "screens/rnm/style.css",
    "screens/rnm/hero.css",
    "screens/rnm/vitals.css",
    "screens/rnm/tasksheet.css",
    "screens/rnm/tabbar.css",
    "screens/rnm/parts.css",
    "screens/rnm/commands.css",
    "screens/rnm/footer.css",
    "screens/rnm/bikeinfo.css",     # the Bike info overlay — Figma 2695:32811
    "screens/checklists/style.css",
    "screens/visit/style.css",
    "screens/alloc/style.css",
    "screens/alloctime/style.css",
    "screens/checks/style.css",
    "screens/issues/style.css",
    "screens/markissues/style.css",
    "screens/assess/style.css",
    "screens/faults/style.css",
    "shared/standalone.css",        # LAST: it overrides selectors declared in the
                                    # screen files above — see the file header
]
HTML_ORDER = [
    "shared/frame.html",            # phone frame + status bar, wraps everything
    "screens/home/markup.html",
    "screens/shift/markup.html",
    "screens/tokens/markup.html",
    "screens/queue/markup.html",
    "screens/job/markup.html",
    "screens/feedback/markup.html",
    "screens/complaint/markup.html",
    "screens/rnm/markup.html",
    "screens/checklists/markup.html",
    "screens/visit/markup.html",
    "screens/alloc/markup.html",
    "screens/alloctime/markup.html",
    "screens/checks/markup.html",
    "screens/issues/markup.html",
    "screens/markissues/markup.html",
    "screens/start/markup.html",
    "screens/assess/markup.html",
    "screens/faults/markup.html",
    "shared/sheet.html",         # shared ⋮ menu, outside every screen
    "shared/filtersheet.html",   # the listing's filter sheet, likewise outside
    "shared/sortsheet.html",     # the listing's sort sheet, likewise outside
    "shared/issuesheet.html",    # the checklist's fault sheet, likewise outside
    "shared/minitask.html",      # confirm dialog
    "shared/commands.html",      # persistent Bike commands sheet, outside every screen
    "shared/frame-close.html",   # closes #phone; must be last
]
JS_ORDER = [
    "shared/config.js",             # CONFIG + the vehicle constant
    "shared/data.js",               # PARTS, FLEET, the fault vocabulary
    "shared/icons.js",
    "shared/partrender.js",
    "shared/router.js",             # goTo() — every screen script depends on it
    # BEFORE the task detail page, which reads TASK_KINDS at load. A const in a
    # later file is in the temporal dead zone when an earlier one runs, and the
    # throw takes every script after it down with it.
    "shared/fleets.js",             # the bikes every queue lists
    "shared/queue-kinds.js",        # WHAT each task LISTING page contains
    "shared/task-kinds.js",         # WHAT each task detail page contains
    # BEFORE the screens, not after: they call endOfTaskCTA() during their first
    # render, and a `const` in a later file is in the temporal dead zone then.
    # It only reaches for checksTally / issuesTallyBy inside function bodies, so
    # those can still be defined further down.
    "shared/open-tasks.js",         # the three open tasks, as a sequence
    "screens/assess/script.js",
    "screens/assess/morph.js",     # setActivePart() — used by swipe.js
    "screens/assess/swipe.js",
    "screens/queue/script.js",
    "screens/job/script.js",
    "screens/feedback/script.js",
    "screens/complaint/script.js",
    # BEFORE rnm, which reads activeChecklistCount() for its Active checklist
    # row. Only from a handler, so this is for reading rather than the TDZ.
    "screens/checklists/script.js",
    # BEFORE rnm: its Bike Info tab calls openRepairVisit() from a handler.
    "screens/visit/script.js",
    "screens/alloc/script.js",
    "screens/alloctime/script.js",
    "screens/rnm/script.js",
    "screens/checks/script.js",
    "screens/issues/script.js",
    "screens/markissues/script.js",
    "screens/tokens/script.js",   # Barun's queue, wrapped — see the file header
    "screens/home/script.js",
    "screens/shift/script.js",
    "screens/start/script.js",
    "screens/faults/script.js",
    "screens/faults/carousel.js",
    # AFTER screens/rnm/script.js, which publishes window.RnM, and after
    # screens/assess/swipe.js, which owns fileAssessmentFault. Both are called
    # from its function bodies only, so this is for reading rather than the TDZ.
    "shared/stepbanner.js",         # paintStepBanner — the step screens
    "shared/steptabs.js",           # Assessment / Penalties, across two screens
    "shared/assessment-record.js",
    "shared/stamp.js",
    "shared/camera.js",
    "shared/toast.js",
    "shared/commands.js",           # the persistent sheet; sheet.js opens it
    "shared/sheet-config.js",       # WHAT is in the ⋮ sheet — read by sheet.js below
    "shared/sheet.js",              # needs toast(); binds every [data-opt-more]
    # After screens/queue/script.js, which defines queueFilters and
    # applyQueueFilters. Both are function/const at module top level and only
    # called from handlers, so the order is for reading, not for the TDZ.
    "shared/filtersheet.js",     # the filter sheet component
    "shared/sortsheet.js",       # the sort sheet component
    "shared/filterbar.js",       # the filter BAR; calls openFilterSheet()
    # After the assessment screen, which is what opens it. Nothing here is read
    # at load — the screen calls openIssueSheet() from a handler.
    "shared/issuesheet.js",         # the fault sheet component
    "shared/morph.js",              # morph() — used by minitask.js below
    "shared/minitask.js",           # minimise / resume + the confirm dialog
    "shared/boot.js",               # first render; must be last
    "shared/version-check.js",      # after boot: it only reads a <meta> and may
                                    # reload the page, so nothing may depend on it
    "shared/install.js",            # registers the pass-through worker; the chip
]

# Two shapes reach for an asset: CSS `url(assets/…)` and markup `src="assets/…"`.
# The second arrived with the ported token queue, which uses <img> for its icons.
REF     = re.compile(r"url\((assets/[^)\s\"']+)\)")
REF_SRC = re.compile(r'src="(assets/[^"]+)"')
# The third shape: a bare quoted path in a JS string literal. Screens that keep a
# table of photos (issues, mark issues) reach for assets this way, and before this
# existed those tables held the base64 itself — a megabyte of it on one line, in a
# source file. Extracted to assets/extracted/ and matched here instead.
REF_STR = re.compile(r"""["'](assets/[^"']+)["']""")

def _join(order):
    out = []
    for rel in order:
        f = SP / rel
        if not f.exists():
            sys.exit(f"build: {rel} is listed in build.py but does not exist.")
        out.append(f.read_text())
    return "".join(out)

# Anything on disk but not listed would be silently dropped — say so loudly.
_listed = set(CSS_ORDER) | set(HTML_ORDER) | set(JS_ORDER)
_found  = {str(f.relative_to(SP)) for d in ("shared", "screens")
           for f in (SP / d).rglob("*") if f.suffix in (".css", ".js", ".html")}
if _found - _listed:
    sys.exit(f"build: not listed in build.py, so never shipped: "
             f"{', '.join(sorted(_found - _listed))}")

html = (SP / "shell.html").read_text()
for slot, body in (("{{STYLES}}",  _join(CSS_ORDER)),
                   ("{{MARKUP}}",  _join(HTML_ORDER)),
                   ("{{SCRIPTS}}", _join(JS_ORDER))):
    if slot not in html:
        sys.exit(f"build: shell.html has no {slot} slot.")
    html = html.replace(slot, body)

# ── 0. syntax-check every script before assembling ──────────────────────────
# One bundle means one scope, so a syntax error anywhere kills every file after
# it — and the symptom is a stray "X is not defined" from an unrelated screen,
# which is a slow thing to diagnose. `node --check` names the file and the line.
# Skipped silently if node is not installed; it is a convenience, not a gate.
if shutil.which("node"):
    for rel in JS_ORDER:
        bad = subprocess.run(["node", "--check", str(SP / rel)],
                             capture_output=True, text=True)
        if bad.returncode:
            sys.exit(f"build: {rel} has a syntax error\n{bad.stderr.strip()}")

# ── 0.6 stamp a build id ────────────────────────────────────────────────────
# The installed home-screen app compares this against version.txt and reloads on
# a mismatch — see shared/version-check.js for why a resumed web app otherwise
# never learns that anything was pushed.
#
# A hash of the CONTENT, not a timestamp: a timestamp would differ on every
# rebuild and reload every installed phone whether or not anything had changed.
#
# The chicken-and-egg is avoided by hashing the document with the PLACEHOLDER
# still in it. The placeholder is a constant, so the digest covers every byte
# that matters and nothing that depends on the digest. Asset BYTES are folded in
# separately: at this point they are still relative paths, so re-exporting a
# photo would not otherwise move the hash and no phone would hear about it.
_h = hashlib.sha1(html.encode())
for _rel in sorted(set(REF.findall(html)) | set(REF_SRC.findall(html))
                   | set(REF_STR.findall(html))):
    _f = SP / _rel
    if _f.exists():
        _h.update(_rel.encode() + hashlib.sha1(_f.read_bytes()).digest())
BUILD_ID = _h.hexdigest()[:12]
if "{{BUILD_ID}}" not in html:
    sys.exit("build: shell.html has no {{BUILD_ID}} slot — without it the "
             "installed app can never learn that a newer build exists.")
html = html.replace("{{BUILD_ID}}", BUILD_ID)

# ── 0. the dev build ────────────────────────────────────────────────────────
# The same assembly, written BEFORE the assets are inlined, so every image, font
# and video is still a relative path. Identical to look at; ~30x smaller.
#
# Why it exists: the published index.html is 90% base64 by weight, and the Browser pane
# sends an element's outerHTML — plus its siblings — when one is selected for
# review. Selecting anything in the RnM hero therefore shipped four <video> tags
# carrying ~1.8M characters of base64, which is more than every source file in
# the project put together. Developing against the dev build makes that cost
# vanish; yuzen-flow/index.html stays the single self-contained file you send people.
#
# It is written INSIDE src/, beside assets/, because that is the only place the
# relative paths resolve from. Do not move it out next to the published index.html — the
# assets would 404 and it would render as the prototype with every image missing,
# which is the exact failure mode the source/build split already caused once.
dev_out = SP / "prototype.dev.html"
dev_out.write_text(html, encoding="utf-8")

# ── 1. inline assets ────────────────────────────────────────────────────────
# Every `url(assets/…)` in the source becomes a base64 data URI. Anything under
# assets/ that the source never references is simply not shipped.
# REF / REF_SRC / REF_STR are defined above _join — the build id hashes the
# assets they name, so they have to exist before stage 0.6.
refs = sorted(set(REF.findall(html)) | set(REF_SRC.findall(html)) | set(REF_STR.findall(html)))
if not refs:
    sys.exit("build: the assembled source references no assets/ — something is wrong.")

inlined = 0
for rel in refs:
    f = SP / rel
    if not f.exists():
        sys.exit(f"build: {rel} is referenced by the source but does not exist.")
    mime = mimetypes.guess_type(f.name)[0] or (
        "font/otf" if f.suffix == ".otf" else "application/octet-stream")
    data = base64.b64encode(f.read_bytes()).decode()
    uri  = f"data:{mime};base64,{data}"
    html = (html.replace(f"url({rel})", f"url({uri})")
                .replace(f'"{rel}"', f'"{uri}"')
                .replace(f"'{rel}'", f"'{uri}'"))
    inlined += 1

# ── 2. pre-render ───────────────────────────────────────────────────────────
with tempfile.NamedTemporaryFile("w", suffix=".html", dir=SP, delete=False) as tmp:
    tmp.write(html)
    tmp_path = pathlib.Path(tmp.name)

try:
    dumped = subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--window-size=390,844", "--virtual-time-budget=4000",
         "--dump-dom", f"file://{tmp_path}"],
        capture_output=True, text=True, timeout=600,
    ).stdout
finally:
    tmp_path.unlink(missing_ok=True)

# Only accept the pre-render if screen 1's list actually came back filled.
# Counting class names alone would also match the JS template literals, so
# measure the container's contents instead. Screen 2's list renders empty on
# first load (nothing is faulty yet), which is correct — so it is not checked.
start = dumped.find('<div class="list"')
body  = dumped[start:dumped.find("</main>", start)] if start != -1 else ""
n_rows  = body.count("item--collapsed")
n_cards = body.count("item--expanded")
if n_rows >= 3 and n_cards == 1:
    html   = dumped
    status = f"pre-rendered — {n_rows} rows + {n_cards} card in static markup"
else:
    status = (f"WARNING pre-render failed, shipping JS-only build "
              f"(rows={n_rows}, cards={n_cards})")

# ── 3. refuse to ship a build that still points at the filesystem ───────────
# A deliverable with a live `assets/…` reference works perfectly on this machine
# and shows nothing on anyone else's. That is the failure worth being paranoid
# about, so it is checked after the pre-render rather than trusted from stage 1.
dangling = sorted(set(REF.findall(html)) | set(REF_SRC.findall(html)))
if dangling:
    sys.exit(f"build: {len(dangling)} asset(s) never inlined: {', '.join(dangling)}\n"
             f"       The deliverable must not reference the filesystem — it is "
             f"opened on other people's machines and on phones.")

# Straight into the published folder, as the page GitHub Pages serves. There is
# no second copy beside the source: one built file, one place to find it.
SITE = SP.parents[1] / "yuzen-flow"
out = SITE / "index.html"
out.write_text(html)

# ── 4. the home-screen sidecars ─────────────────────────────────────────────
# index.html stays a complete deliverable on its own — every sidecar is
# referenced by a bare relative filename, so an emailed copy with no siblings
# just 404s them and carries on. They exist so the published copy can be
# INSTALLED: the manifest and icons are what "Add to Home Screen" reads, and
# version.txt is what the installed app polls to notice a push.
#
# They live ONLY in yuzen-flow/ — hand-written (manifest, sw.js) or generated by
# src/pwa/make-icons.py — so the build checks they are there rather than copying.
sidecars = ["manifest.webmanifest", "sw.js", "apple-touch-icon.png",
            "icon-192.png", "icon-512.png", "icon-maskable-512.png"]
missing = [n for n in sidecars if not (SITE / n).exists()]
if missing:
    sys.exit(f"build: yuzen-flow/ is missing {', '.join(missing)} — the published "
             f"app needs them to be installable. Icons: run src/pwa/make-icons.py.")
# Must ship in the same commit as index.html. Publishing this alone is the
# one way the reload check can misbehave; see shared/version-check.js.
(SITE / "version.txt").write_text(BUILD_ID + "\n")

print(f"built yuzen-flow/{out.name}  {round(len(html)/1024)} KB  — {inlined} assets inlined")
print(f"      {dev_out.name}  {round(dev_out.stat().st_size/1024)} KB  — assets by path; "
      f"open this one while working")
print(f"      {status}")
print(f"      build {BUILD_ID} — version.txt written; {len(sidecars)} sidecars present")
for probe in ("http://", "https://"):
    if probe in html:
        print(f"  ! external reference found: {probe}")
