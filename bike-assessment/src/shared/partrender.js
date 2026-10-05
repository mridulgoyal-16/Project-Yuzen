/* ═══════════════════════════════════════════════════════════════════════════
   SHARED PART RENDERING
   ═══════════════════════════════════════════════════════════════════════════ */
function thumbStyle(part){
  if (!part.photo) return "";
  const c = CROPS[part.crop];
  return `background-image:${ASSETS[part.photo]};`
       + `background-size:${c.w}px ${c.h}px;`
       + `background-position:calc(50% + ${c.dx}px) calc(50% + ${c.dy}px);`;
}
/* The same crop as thumbStyle above, but for a tile of any size and from an
   already-resolved image URL rather than the CSS variable.

   Two callers need that. thumbStyle() reads ASSETS, which holds `var(--img-mcu)`
   — fine inside a stylesheet, useless to a screen that has to put the picture in
   an `<img src>` or hand it to another screen. And CROPS is authored for this
   list's 48px tile, while the Issues screen draws parts at 56 and 64: the crop is
   a rectangle of the render, so it scales with the tile rather than being three
   sets of numbers.

   Empty string for a part with no picture or no crop, so a caller can test it. */
function cropStyle(src, cropKey, tile){
  const c = CROPS[cropKey];
  if (!src || !c) return "";
  const k = tile / 48;
  return `background-image:url('${src}');background-repeat:no-repeat;`
       + `background-size:${(c.w * k).toFixed(2)}px ${(c.h * k).toFixed(2)}px;`
       + `background-position:calc(50% + ${(c.dx * k).toFixed(2)}px) `
       + `calc(50% + ${(c.dy * k).toFixed(2)}px);`;
}

/* The `url(data:…)` behind an ASSETS entry. The renders are declared once as CSS
   custom properties on :root (base.css) so markup and renderer can share them,
   which means the only way to the actual bytes is to ask the computed style. */
function partImageURL(part){
  if (!part.photo) return "";
  const v = getComputedStyle(document.documentElement)
              .getPropertyValue("--img-" + part.photo).trim();
  const m = v.match(/url\(\s*["']?(.*?)["']?\s*\)/);
  return m ? m[1] : "";
}

function thumbHTML(part){
  return part.photo
    ? `<div class="thumb" style="${thumbStyle(part)}"></div>`
    : `<div class="thumb">${ICON.noPhoto(24)}</div>`;
}
function mediaHTML(part){
  if (!part.photo) return `<div class="card__media">${ICON.noPhoto(56)}</div>`;
  return `<div class="card__media" role="img" aria-label="${esc(part.name)}"
               style="background-image:${ASSETS[part.photo]}"></div>`;
}

