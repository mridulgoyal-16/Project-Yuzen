# Yuzen Project

A combination of two repos, copied on 5 Oct 2026:

- **[yulusagar/Project-Zero](https://github.com/yulusagar/Project-Zero)** at `eaa9f64`: the source. It's everything at this folder's root, and the main flow is in `bike-assessment/`.
- **[yulusagar/yuzen-flow](https://github.com/yulusagar/yuzen-flow)** at `ad5d46e`: the published build behind https://yulusagar.github.io/yuzen-flow/. It's in `yuzen-flow/`.

This copy starts its own git history and has no remotes, so nothing here pushes to the original repos.

## How the two halves relate

`yuzen-flow/` isn't separate work. It's a snapshot of `bike-assessment/`:
`yuzen-flow/index.html` is `bike-assessment/prototype.html` renamed, and its
sidecar files (`version.txt`, `manifest.webmanifest`, `sw.js` and the icons) are
copied as they are. To refresh the build after you change the source:

```bash
S=bike-assessment; D=yuzen-flow
cp "$S/prototype.html" "$D/index.html"
cp "$S/version.txt" "$S/manifest.webmanifest" "$S/sw.js" \
   "$S/icon-192.png" "$S/icon-512.png" "$S/icon-maskable-512.png" \
   "$S/apple-touch-icon.png" "$D/"
```

Commit `index.html` and every sidecar together. The page compares its built-in
id with `version.txt`, so if they ship separately, installed copies either
show an old version or keep reloading.

See `bike-assessment/README.md` and `bike-assessment/HANDOFF.md` for the source,
the build (`bike-assessment/src/build.py`) and the tests.
