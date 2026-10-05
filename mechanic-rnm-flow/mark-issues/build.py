"""
Build the Mark Issues screen into one self-contained HTML file.

The shell — device frame, tokens, type styles, status bar, app bar, scroll
region, footer, options sheet, and the part sheet with its chips — is lifted
verbatim from ../mechanic-checks/prototype.html, the three ranges the issues
screen takes plus a fourth for that sheet, so all three screens carry one set of
furniture and the flow cannot drift as more screens land. Satoshi rides along
inside that CSS, already base64'd.

The thirteen part photos and two glyphs in assets/ are inlined, so the built
file has no external references and no runtime dependency on any sibling.
Photos are 260px webp: a 103px tile needs no more even at 3x, and the Figma
exports they came from were 7.5MB of full-resolution PNG between them.

    python3 build.py        # writes prototype.html
"""
import base64, json, pathlib, re, sys

HERE = pathlib.Path(__file__).parent
FLOW = HERE.parent            # mechanic-rnm-flow/
REPO = FLOW.parent            # the repo root, where the sibling screens live
SIB  = REPO / "mechanic-checks/prototype.html"
PICS = HERE / "assets"

if not SIB.exists():
    sys.exit(f"build: {SIB} not found — the shell is lifted from it.")

src = SIB.read_text()

# ── the shared furniture, in three ranges ───────────────────────────────────
# A: type styles, device frame, status bar, app bar, scroll region.
# B: the three-dots options sheet.
# C: progress bar and footer — these sit *after* the sibling's own screen
#    styles, so a single split point silently drops them and no footer renders.
# D: the part sheet and its chips. This screen's issue-marking sheet IS that
#    sheet, not a lookalike, so the two cannot drift. It redefines .scrim, which
#    the sibling itself already does twice — carried over rather than patched.
RANGES = [
    ("<style>",                            "/* ── Swipe stage"),
    ("/* ── Options sheet (three dots)",   "/* ── Section header (mechanic checklist)"),
    ("/* ── Progress bar",                 '/* ── "Mark issue" bottom sheet'),
    ('/* ── "Mark issue" bottom sheet',    "/* Every collapsed row is tappable"),
]
chunks = []
for start, end in RANGES:
    if start not in src or end not in src:
        sys.exit(f"build: sibling markers moved — {start!r} .. {end!r} not both found.")
    i = src.index(start) + (len(start) if start == "<style>" else 0)
    chunks.append(src[i: src.index(end, i)])
shell_css = "\n".join(chunks)

if len(re.findall(r"url\(data:font/otf;base64,([A-Za-z0-9+/=]+)\)", src)) != 2:
    sys.exit("build: expected 2 embedded fonts in the sibling")

# ── photos, keyed the way the script refers to them ─────────────────────────
PHOTOS = ["air-nozzle", "battery-bucket", "bike-pic", "brake", "display-unit",
          "front-shocker", "front-tyre", "iot", "pigtail", "rear-shocker",
          "swingarm", "tail-lamp", "tyre-rim"]
# The five part renders the other checklists already use, pulled from
# bike-assessment rather than copied in here — one source for a part's picture, so
# re-exporting it once updates every screen that shows it. Keyed r-* so they cannot
# collide with this screen's own photographs of the same parts.
RENDERS = {
    "r-mcu":         "part_mcu",
    "r-throttle":    "part_throttle",
    "r-front-wheel": "part_front_wheel",
    "r-tyre":        "part_tyre",
    "r-pigtail":     "part_pigtail_light",
}
RENDER_PICS = REPO / "bike-assessment/src/assets"
MIME = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg"}

photos = {}
for name in PHOTOS:
    p = PICS / f"{name}.webp"
    if not p.exists():
        sys.exit(f"build: {p} missing")
    photos[name] = "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()

for key, stem in RENDERS.items():
    # Extension is derived: bike-assessment re-exported these from .webp to .png
    # when its build started inlining by path, and hardcoding either breaks on the
    # next re-export.
    f = next((RENDER_PICS / (stem + e) for e in MIME if (RENDER_PICS / (stem + e)).exists()), None)
    if not f:
        sys.exit(f"build: no {stem}.* in {RENDER_PICS} — tried {', '.join(MIME)}")
    photos[key] = ("data:" + MIME[f.suffix] + ";base64,"
                   + base64.b64encode(f.read_bytes()).decode())

# ── glyphs, exported from Figma rather than hand-drawn ──────────────────────
# Both export as a 24px frame wrapping a mask and a bounding-box rect, so the
# *last* path is the glyph — the first ones are scaffolding.
def glyph(name):
    f = PICS / f"{name}.svg"
    if not f.exists():
        sys.exit(f"build: {f} missing — re-export it from Figma.")
    paths = re.findall(r'<path[^>]*\sd="(M[^"]+)"', f.read_text())
    if not paths:
        sys.exit(f"build: no glyph path found in {f}")
    return paths[-1]

html = (HERE / "template.html").read_text()
subs = {
    "__SHELL_CSS__":   shell_css,
    "__PHOTOS__":      json.dumps(photos),
    "__SEARCH_PATH__": glyph("search"),
    "__CHEVRON_PATH__": glyph("chevron-down"),
    "__BOLT_PATH__":   glyph("bolt"),      # from qc-task-list, as on the issues sheet
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
print(f"  shell from {SIB.relative_to(REPO)}, {len(photos)} photos, 3 glyphs inlined")
