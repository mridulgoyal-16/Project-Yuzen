/* ═══════════════════════════════════════════════════════════════════════════
   VERSION CHECK — the installed app must never be older than the last push
   ═══════════════════════════════════════════════════════════════════════════
   Added to the home screen, this stops being a page and becomes an app, and an
   app is RESUMED rather than relaunched. That is the whole problem: a resumed
   web app performs no navigation, so it re-fetches nothing and can sit on a
   build from last week for as long as it stays in the app switcher. Nobody
   would know — it looks like the push never happened.

   Two smaller things make it worse. GitHub Pages serves the document with
   `cache-control: max-age=600` and there is no way to change that from the repo,
   so even a cold launch can be answered from the HTTP cache. And a service
   worker would not help: its fetch handler only runs when something fetches,
   and on resume nothing does. (A caching worker would make it strictly worse —
   it is exactly what pins an installed app to a stale build.)

   So the page asks. version.txt is a dozen bytes; the id in it is the same
   content hash build.py stamped into <meta name="build-id"> in the shell. They
   disagree only when someone has pushed. location.reload() runs with the
   navigation cache mode set to `reload`, which bypasses that 600s max-age, so
   the reload genuinely lands the new document rather than the cached one.

   Everything is guarded to a no-op rather than an error, because this same
   script ships inside prototype.html — the file that gets emailed, and the one
   headless Chrome pre-renders over file:// at build time. Neither has a
   version.txt beside it and neither should try to reload.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  /* file:// — the emailed deliverable, and the build's own pre-render pass. */
  if (!/^https?:$/.test(location.protocol)) return;

  const meta = document.querySelector('meta[name="build-id"]');
  const MINE = meta && meta.content;
  /* Unstamped: someone opened src/shell.html directly. Nothing to compare to. */
  if (!MINE || MINE.indexOf("{{") === 0) return;

  const MIN_GAP   = 60000;   /* never ask more than once a minute */
  const HIDDEN_MS = 20000;   /* a real resume, not a glance at a notification */
  const KEY       = "yz-reloaded-at";

  let asking = false, lastAsk = 0, hiddenAt = 0, stopped = false;

  async function check(){
    if (stopped || asking || Date.now() - lastAsk < MIN_GAP) return;
    asking = true;
    lastAsk = Date.now();
    try {
      const r = await fetch("version.txt?t=" + Date.now(), {cache: "no-store"});
      if (!r.ok) return;
      const theirs = (await r.text()).trim();
      if (!theirs || theirs === MINE) return;

      /* One reload per mismatch. If we come back and it STILL disagrees — the
         push landed half-done, or an edge is still serving yesterday's document
         — stop asking, because the alternative is reloading 7 MB in a loop on
         somebody else's phone. The cost is that a second push inside two
         minutes waits for the next launch, which is the right way round. */
      if (Date.now() - +(sessionStorage.getItem(KEY) || 0) < 120000){
        stopped = true;
        return;
      }
      sessionStorage.setItem(KEY, String(Date.now()));

      if (typeof toast === "function") toast("Newer build — reloading");
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      /* Offline, or no version.txt beside us. Both mean: carry on. */
    } finally {
      asking = false;
    }
  }

  /* On load nothing is in progress, so a reload costs nobody their place. */
  addEventListener("load", () => setTimeout(check, 1500));

  /* And on resume, which is the only "launch" an installed app usually gets.
     Deliberately NOT on a foreground timer: reloading out from under a mechanic
     mid-assessment would throw away every answer they had given. */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden"){ hiddenAt = Date.now(); return; }
    if (Date.now() - hiddenAt > HIDDEN_MS) check();
  });
})();
