# Yuzen — mechanic & captain flow

An interactive prototype of the Yulu partner app: the flow a mechanic works
through at the bike, and the one a captain runs a service token through.

**Open it:** https://yulusagar.github.io/yuzen-flow/

**Install it:** Android Chrome — ⋮ → *Install app*. iPhone — open in Safari,
Share → *Add to Home Screen*. It then runs without browser chrome and updates
itself: the app compares its own build id against `version.txt` on launch and on
resume, and reloads when they differ. So whatever was pushed last is what you
see, with no cache to clear.

`index.html` and `version.txt` MUST be published in the same commit — they are a
matched pair, and shipping `version.txt` alone is the one thing that makes the
app reload for nothing. `sw.js` is a deliberate no-op that caches nothing; it
exists only because Chrome will not offer an install banner without a fetch
handler.

One self-contained HTML file — no server, no build, no login. Every asset is
inlined, so saving the page keeps it working offline.

The source, the two test suites and the design rationale live in the private
Project-Zero repo under `bike-assessment/`. This repo is the published build
only, so the link can be handed to anyone.
