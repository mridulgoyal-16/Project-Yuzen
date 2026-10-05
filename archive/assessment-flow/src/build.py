"""
Build the Yuzen assessment prototype into one self-contained HTML file.

Two stages:
  1. Inline every asset (Satoshi, part photos) as base64 — no network calls.
  2. Pre-render the checklist with headless Chrome and ship the resulting DOM,
     so the screen is fully visible even where scripts are sandboxed
     (preview panes, embedded viewers). The inline script survives the dump and
     re-renders identically wherever JS *is* allowed — which is what the swipe
     layer will hook into.
"""
import base64, pathlib, subprocess, sys, tempfile

SP     = pathlib.Path(__file__).parent
O      = SP / "assets"
FONTS  = pathlib.Path.home() / "Library/Fonts"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

for _f in ("Satoshi-Medium.otf", "Satoshi-Bold.otf"):
    if not (FONTS / _f).exists():
        sys.exit(f"build: {_f} not found in {FONTS}.\n"
                 f"       Install Satoshi (fontshare.com/fonts/satoshi) first — the\n"
                 f"       prototype embeds it so it renders without a network.")

b64 = lambda p: base64.b64encode(p.read_bytes()).decode()
uri = lambda p, m: f"data:{m};base64,{b64(p)}"

ASSETS = {
    "__FONT_MEDIUM__": b64(FONTS / "Satoshi-Medium.otf"),
    "__FONT_BOLD__":   b64(FONTS / "Satoshi-Bold.otf"),
    "__IMG_DISPLAY__": uri(O / "thumb_display.png", "image/png"),
    "__IMG_PIGTAIL__": uri(O / "thumb_pigtail.png", "image/png"),
    "__IMG_BRAKE__":   uri(O / "thumb_brake.png",   "image/png"),
    "__IMG_TYRE__":    uri(O / "hero_q256.png",     "image/png"),
}

# ── 1. inline assets ────────────────────────────────────────────────────────
html = (SP / "template.html").read_text()
for key, val in ASSETS.items():
    if key not in html:
        sys.exit(f"build: placeholder {key} missing from template.html")
    html = html.replace(key, val)

# ── 2. pre-render ───────────────────────────────────────────────────────────
with tempfile.NamedTemporaryFile("w", suffix=".html", dir=SP, delete=False) as tmp:
    tmp.write(html)
    tmp_path = pathlib.Path(tmp.name)

try:
    dumped = subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--window-size=390,844", "--virtual-time-budget=4000",
         "--dump-dom", f"file://{tmp_path}"],
        capture_output=True, text=True, timeout=180,
    ).stdout
finally:
    tmp_path.unlink(missing_ok=True)

# Only accept the pre-render if the list container actually came back filled.
# Counting class names alone would also match the JS template literals, so
# measure the container's contents instead.
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

out = SP.parent / "prototype.html"
out.write_text(html)
print(f"built {out.name}  {round(len(html)/1024)} KB  — {status}")
for probe in ("http://", "https://"):
    if probe in html:
        print(f"  ! external reference found: {probe}")
