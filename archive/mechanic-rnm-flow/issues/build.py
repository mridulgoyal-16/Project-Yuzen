"""
Build the Issues screen into one self-contained HTML file.

The shell — device frame, tokens, type styles, app bar, status bar, footer
rhythm — is lifted verbatim from ../mechanic-checks/prototype.html so the two
screens are the same screen furniture and the flow stitches without drift. Only
the tokens/frame/typography prelude is reused; everything below it is this
screen's own.

Fonts come out of that sibling already base64'd. The five part photos are read
from ../bike-assessment/src/assets and inlined, so the built file has no
external references and no dependency on any sibling folder at runtime.

    python3 build.py        # writes prototype.html
"""
import base64, pathlib, re, sys

HERE = pathlib.Path(__file__).parent
FLOW = HERE.parent            # mechanic-rnm-flow/
REPO = FLOW.parent            # the repo root, where the sibling screens live
SIB  = REPO / "mechanic-checks/prototype.html"
PICS = REPO.parent / "bike-assessment/src/assets"   # REPO is archive/ since the move

if not SIB.exists():
    sys.exit(f"build: {SIB} not found — the shell is lifted from it.")

src = SIB.read_text()

# ── the shared furniture, in two ranges ─────────────────────────────────────
# A: type styles, device frame, status bar, app bar, scroll region.
# B: progress bar and footer — these sit *after* the sibling's own screen styles,
#    so a single split point silently drops them and the footer never renders.
# A few checklist-only rules (.item, .row*, .thumb) ride along inside A's last
# block; they are unused here and harmless, and cutting mid-block would break
# the next time that file is edited.
RANGES = [
    ("<style>",                              "/* ── Swipe stage"),
    # C: the three-dots options sheet, so both screens share one definition and
    #    an edit to it on either lands on both.
    ("/* ── Options sheet (three dots)",     "/* ── Section header (mechanic checklist)"),
    ("/* ── Progress bar",                   '/* ── "Mark issue" bottom sheet'),
]
chunks = []
for start, end in RANGES:
    if start not in src or end not in src:
        sys.exit(f"build: sibling markers moved — {start!r} .. {end!r} not both found.")
    i = src.index(start) + (len(start) if start == "<style>" else 0)
    chunks.append(src[i: src.index(end, i)])
shell_css = "\n".join(chunks)

fonts = re.findall(r"url\(data:font/otf;base64,([A-Za-z0-9+/=]+)\)", src)
if len(fonts) != 2:
    sys.exit(f"build: expected 2 embedded fonts in the sibling, found {len(fonts)}")

# Only the two the mechanical rows use. The electrical faults are diagnostics the
# bike reported about itself — there is no part to photograph — so pigtail, mcu and
# throttle are no longer referenced and are no longer carried.
#
# .png, not .webp: bike-assessment re-exported these when its build started
# inlining by path, and the .webp files this used to read are gone. Extension is
# derived rather than hardcoded so the next re-export does not break the build.
PHOTO_FILES = {
    "wheel": "part_front_wheel",
    "tyre":  "part_tyre",
}
MIME = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg"}
photos = {}
for key, stem in PHOTO_FILES.items():
    found = next((PICS / (stem + e) for e in MIME if (PICS / (stem + e)).exists()), None)
    if not found:
        sys.exit(f"build: no {stem}.* in {PICS} — tried {', '.join(MIME)}")
    photos[key] = ("data:" + MIME[found.suffix] + ";base64,"
                   + base64.b64encode(found.read_bytes()).decode())

# ── glyphs, exported from Figma rather than hand-drawn ──────────────────────
def glyph(name):
    f = HERE / f"{name}.svg"
    if not f.exists():
        sys.exit(f"build: {f} missing — re-export it from Figma.")
    m = re.search(r'<path[^>]*\sd="([^"]+)"', f.read_text())
    if not m:
        sys.exit(f"build: no path found in {f}")
    return m.group(1)

ARROW  = glyph("arrow")
TICK   = glyph("task_alt")
BOLT   = glyph("bolt")
CANCEL = glyph("cancel")           # close_small, from the issue detail sheet

html = (HERE / "template.html").read_text()
subs = {
    "__SHELL_CSS__": shell_css,
    "__PHOTO_WHEEL__":    photos["wheel"],
    "__PHOTO_TYRE__":     photos["tyre"],
    "__ARROW_PATH__": ARROW,
    "__TICK_PATH__":  TICK,
    "__BOLT_PATH__":  BOLT,
    "__CANCEL_PATH__": CANCEL,
}
for key, val in subs.items():
    if key not in html:
        sys.exit(f"build: placeholder {key} not in template.html")
    html = html.replace(key, val)

left = re.findall(r"__[A-Z_]+__", html)
if left:
    sys.exit(f"build: unsubstituted placeholders: {sorted(set(left))}")

out = HERE / "prototype.html"
out.write_text(html)
print(f"built {out.relative_to(REPO)} — {len(html):,} bytes")
print(f"  shell from {SIB.relative_to(REPO)}, {len(fonts)} fonts, {len(photos)} photos inlined")
