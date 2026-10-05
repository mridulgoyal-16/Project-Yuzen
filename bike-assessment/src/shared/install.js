/* ═══════════════════════════════════════════════════════════════════════════
   INSTALL CHIP — Chrome's own prompt, asked for at a moment we choose
   ═══════════════════════════════════════════════════════════════════════════
   Two halves.

   1. Register the pass-through worker (src/pwa/sw.js, published beside
      index.html). It caches nothing; it exists because Chrome only fires
      beforeinstallprompt for a page that has a fetch handler. See that file.

   2. Show a chip when Chrome tells us the app is installable, and hand the tap
      back to Chrome. beforeinstallprompt fires ONCE per page load and the event
      must be kept — prompt() cannot be called later without it — and it must be
      called from a real user gesture, which is why this is a button and not
      something fired on load.

   Deliberately quiet: it does not appear once installed (display-mode is
   standalone, and Chrome stops firing the event anyway), it does not appear on
   iOS at all (no such API — an iPhone needs Share → Add to Home Screen, which no
   page can automate), and dismissing it sticks for the session so it cannot
   nag through a demo.

   Guarded to a no-op on file://: the emailed prototype.html has no worker beside
   it, and the build pre-renders over file:// with headless Chrome.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  if (!/^https?:$/.test(location.protocol)) return;

  /* ---- the worker ------------------------------------------------------- */
  /* updateViaCache:'none' so the worker script itself is never served from the
     HTTP cache — the one place a stale copy could outlive a push. */
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js", {updateViaCache: "none"})
        .catch(() => {});   /* no sw.js beside us: nothing to install from */
    });
  }

  /* ---- the chip -------------------------------------------------------- */
  const chip = document.getElementById("pwaInstall");
  if (!chip) return;

  /* Already installed, or launched from the home screen: nothing to offer. */
  if (matchMedia("(display-mode: standalone)").matches) return;
  if (sessionStorage.getItem("yz-install-dismissed")) return;

  let deferred = null;

  addEventListener("beforeinstallprompt", (e) => {
    /* Suppress Chrome's own mini-infobar so there is one offer, not two. */
    e.preventDefault();
    deferred = e;
    chip.hidden = false;
  });

  chip.querySelector("[data-install-go]").addEventListener("click", async () => {
    if (!deferred) return;
    chip.hidden = true;
    deferred.prompt();
    await deferred.userChoice;
    /* The event is single-use whatever the answer. If they declined, Chrome
       will offer again on a later visit; re-prompting now would be nagging. */
    deferred = null;
  });

  chip.querySelector("[data-install-no]").addEventListener("click", () => {
    chip.hidden = true;
    sessionStorage.setItem("yz-install-dismissed", "1");
  });

  /* Installed from the ⋮ menu instead of the chip: take the offer away. */
  addEventListener("appinstalled", () => {
    chip.hidden = true;
    deferred = null;
  });
})();
