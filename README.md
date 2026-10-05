# Project Yuzen

An interactive prototype of the Yulu partner app: the flow a mechanic works
through at the bike, and the one a captain runs a service token through.

**Live:** https://mridulgoyal-16.github.io/Project-Yuzen/yuzen-flow/

**Mechanic only:** https://mridulgoyal-16.github.io/Project-Yuzen/mechanic/ opens
the same app as the Mechanic profile, with no other profile to pick.

## What's where

Each kind of content lives in one place only.

| Path | What it is | Read |
|---|---|---|
| `bike-assessment/` | The source of the flow, with its tests and design reasoning | `bike-assessment/README.md` (what it does and why), `bike-assessment/src/MAP.md` (how to build, test and change it) |
| `yuzen-flow/` | The published app: the built `index.html`, `version.txt`, and the files that make it installable | `yuzen-flow/README.md` (opening and installing it) |
| `archive/` | Earlier standalone prototypes that fed into or were replaced by the main flow | `archive/README.md` |
| `index.html` | The site root, which redirects to `yuzen-flow/` | |
| `mechanic/` | Redirects to `yuzen-flow/?role=mechanic`. Any profile works the same way: `?role=sr-mechanic`, `quality-associate` or `captain` | `bike-assessment/src/screens/shift/script.js` |

`bike-assessment/src/build.py` writes `yuzen-flow/index.html` and
`yuzen-flow/version.txt` directly, so there is no second copy of the build to
keep in sync.

## Publishing

GitHub Pages serves this repo from `main`, so pushing is publishing. After a
change to the flow:

```bash
cd bike-assessment
python3 src/build.py && python3 tests/flowtest.py && python3 tests/geomtest.py
cd ..
git add -A && git commit -m "…" && git push
```

`yuzen-flow/index.html` and `yuzen-flow/version.txt` must be in the **same
commit**, and `git add -A` makes sure they are. The reason is in
`bike-assessment/src/MAP.md` § The PWA sidecars.

## Origin

This repo combines [yulusagar/Project-Zero](https://github.com/yulusagar/Project-Zero)
(source, `eaa9f64`) and [yulusagar/yuzen-flow](https://github.com/yulusagar/yuzen-flow)
(published build, `ad5d46e`), copied on 5 Oct 2026, with its own history from
there.
