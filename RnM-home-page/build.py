"""
Fold RnM home into one self-contained file.

Two things make the working copy need a web server: the Satoshi stylesheet on
api.fontshare.com, and 17 relative SVGs. Both are inlined here — fonts as
base64 @font-face, glyphs as data URIs — so the result opens off the filesystem
and can be hosted anywhere with no companion folder.

Only Medium and Bold are embedded — nothing on the screen uses another weight.
(The task number used Black; add "Satoshi-Black.otf": 900 back to WEIGHTS if it
returns.)
"""
import base64, pathlib, re, sys
from urllib.parse import unquote

SP = pathlib.Path(__file__).parent
FONTS = pathlib.Path.home() / "Library/Fonts"
WEIGHTS = {"Satoshi-Medium.otf": 500, "Satoshi-Bold.otf": 700}

for f in WEIGHTS:
    if not (FONTS / f).exists():
        sys.exit(f"build: {f} not found in {FONTS} — install Satoshi (fontshare.com/fonts/satoshi)")

b64 = lambda p: base64.b64encode(p.read_bytes()).decode()

face = "\n".join(
    "  @font-face { font-family: 'Satoshi'; font-style: normal; font-weight: %d;\n"
    "    font-display: block;\n"
    "    src: url(data:font/otf;base64,%s) format('opentype'); }" % (w, b64(FONTS / f))
    for f, w in WEIGHTS.items()
)

html = (SP / "prototype.html").read_text()

# 1. the network stylesheet becomes embedded faces
html = re.sub(r'\n<link rel="stylesheet" href="https://api\.fontshare\.com[^>]*>', '', html)
html = html.replace("<style>\n", "<style>\n" + face + "\n\n", 1)

# 2. every assets/*.svg reference becomes a data URI
used = sorted(set(re.findall(r'assets/[a-z0-9-]+\.svg', html)))
for ref in used:
    p = SP / ref
    if not p.exists():
        sys.exit(f"build: {ref} is referenced but missing")
    html = html.replace(ref, "data:image/svg+xml;base64," + b64(p))

# 3. the bike clips too. They live in a sibling folder and are the only reason
#    this page ever needed a server; inlining them is what makes the built file
#    portable. They are the bulk of its size — 1.1MB of mp4, ~1.5MB once base64'd.
clips = sorted(set(re.findall(r'\.\./wynn-xp/videos/[^"]+\.mp4', html)))
for ref in clips:
    p = (SP / unquote(ref)).resolve()
    if not p.exists():
        sys.exit(f"build: {ref} is referenced but missing at {p}")
    html = html.replace(ref, "data:video/mp4;base64," + b64(p))

out = SP / "rnm-home.html"
out.write_text(html)

print(f"built {out.name}  {round(len(html)/1024)} KB  "
      f"({len(used)} glyphs + {len(clips)} clips + {len(WEIGHTS)} weights inlined)")

# Only flag things that would actually leave the document: a scheme, a
# protocol-relative URL, or a relative file path. In-document sprite references
# (#g-power) and template literals resolved at runtime are not external.
refs = re.findall(r'(?:src|href)="([^"]+)"', html) + re.findall(r'url\(([^)]+)\)', html)
left = [r for r in refs
        if not r.startswith(('data:', '#'))
        and '${' not in r
        and (re.match(r'[a-z][a-z0-9+.-]*:', r) or r.startswith('//') or '/' in r or '.' in r)]
print("  references that would leave the file:", left or "none")
