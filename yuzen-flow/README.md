# Yuzen: mechanic & captain flow

**Open it:** https://mridulgoyal-16.github.io/Project-Yuzen/yuzen-flow/

It's one self-contained HTML file, with no server, build or login needed. Every
asset is inlined, so saving the page keeps it working offline.

**Install it:** on Android Chrome, use ⋮ → *Install app*. On iPhone, open it in
Safari and use Share → *Add to Home Screen*. Once installed it runs without
browser chrome and updates itself. When it launches or resumes, it compares its
own build id with `version.txt` and reloads if they differ, so it always shows
the latest push with no cache to clear.

Everything in this folder is either written by the build or used as it is.
Don't edit `index.html` or `version.txt` by hand. The source is in
`../bike-assessment/`.
