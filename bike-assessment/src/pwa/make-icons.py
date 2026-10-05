#!/usr/bin/env python3
"""Home-screen icons, from Sagar's source render.

Run by hand, not by build.py — the outputs are committed. `python3 make-icons.py`
from this directory after replacing source-icon.png.

The source is a 1254x1254 render of a rounded orange tile with a drop shadow,
floating on white. Three things have to happen before that is an app icon:

  1. CROP to the tile. The white surround and the shadow are presentation, not
     the icon. iOS and Android both draw their own shadow.

  2. FILL THE CORNERS. The tile's own rounded corners leave white outside them,
     and iOS applies its own mask on top — so a pre-rounded icon shows white
     triangles poking out around the platform's radius. Flood-filling from the
     four corners repaints exactly that white and leaves the gear alone, because
     the gear's white is not connected to the edge.

  3. INSET THE MASKABLE ONE. Android may crop an icon to a circle. The gear fills
     ~89% of the tile height, which a circular mask would clip, so the maskable
     variant sits the whole tile at 80% on an orange ground — the platform can
     then cut any shape it likes and only ever remove flat colour.

The plain `any` icons are NOT inset: on a home screen they are drawn as given,
and padding them would leave the icon visibly smaller than its neighbours.
"""

import pathlib
from PIL import Image, ImageDraw

HERE   = pathlib.Path(__file__).parent
SOURCE = HERE / "source-icon.png"
OUT    = HERE.parents[2] / "yuzen-flow"   # the published app, the icons' only home
ORANGE = (254, 182, 64)          # sampled from the tile face


def is_orange(p):
    r, g, b = p
    return r > 200 and 110 < g < 210 and b < 110


def tile_from(src):
    """The orange face alone, corners repainted, as a full-bleed square."""
    im = src.convert("RGB")
    px = im.load()
    xs, ys = [], []
    for y in range(0, im.height, 3):
        for x in range(0, im.width, 3):
            if is_orange(px[x, y]):
                xs.append(x)
                ys.append(y)
    if not xs:
        raise SystemExit("make-icons: no orange tile found in source-icon.png")

    tile = im.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    # A tolerant threshold: the corner white carries anti-aliasing and a hint of
    # the shadow, and anything left behind reads as a bright fringe once the
    # platform rounds the icon.
    for corner in ((0, 0), (tile.width - 1, 0),
                   (0, tile.height - 1), (tile.width - 1, tile.height - 1)):
        ImageDraw.floodfill(tile, corner, ORANGE, thresh=60)
    return tile


def main():
    if not SOURCE.exists():
        raise SystemExit(f"make-icons: {SOURCE.name} is missing")

    tile = tile_from(Image.open(SOURCE))
    print(f"tile {tile.width}x{tile.height}, corners filled")

    # Full bleed. 180 is the apple-touch-icon size; iOS rounds it itself.
    for size, name in ((180, "apple-touch-icon.png"),
                       (192, "icon-192.png"),
                       (512, "icon-512.png")):
        out = tile.resize((size, size), Image.LANCZOS)
        out.save(OUT / name, "PNG", optimize=True)
        print(f"  {name}  {size}x{size}")

    # Maskable: the tile at 80% on its own colour, so a circular mask can only
    # ever eat flat orange.
    canvas = Image.new("RGB", (512, 512), ORANGE)
    inner  = tile.resize((410, 410), Image.LANCZOS)
    canvas.paste(inner, ((512 - 410) // 2, (512 - 410) // 2))
    canvas.save(OUT / "icon-maskable-512.png", "PNG", optimize=True)
    print("  icon-maskable-512.png  512x512 (tile at 80%)")


if __name__ == "__main__":
    main()
