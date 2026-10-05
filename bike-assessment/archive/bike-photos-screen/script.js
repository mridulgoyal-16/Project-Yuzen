/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN 3 — Bike photos
   Four sides, one photo each, captured through the same camera path Mark faults
   uses so the two behave identically on a phone and on a desk.
   ═══════════════════════════════════════════════════════════════════════════ */
const SIDES = [
  {key:"front", label:"Front"},
  {key:"back",  label:"Back"},
  {key:"left",  label:"Left"},
  {key:"right", label:"Right"},
];
const bikePhotos = {front:null, back:null, left:null, right:null};

const ptgridEl = document.getElementById("ptgrid");

function renderBikePhotos(){
  ptgridEl.innerHTML = SIDES.map(s => {
    const src = bikePhotos[s.key];
    const bg = !src ? "" : src.startsWith("--")
      ? `style="background-image:var(${src})"` : `style="background-image:url('${src}')"`;
    return `
      <button class="pttile${src ? " is-filled" : ""}" ${bg}
              data-side="${s.key}" aria-label="${src ? "Retake" : "Take"} ${s.label} photo">
        <span class="pttile__scrim"></span>
        <span class="pttile__cam">${ICON.addPhoto}</span>
        <span class="t-label-sm pttile__label">${s.label}</span>
        <span class="pttile__x" role="button" data-clear="${s.key}"
              aria-label="Remove ${s.label} photo">&times;</span>
      </button>`;
  }).join("");
}

ptgridEl.addEventListener("click", e => {
  const clear = e.target.closest("[data-clear]");
  if (clear){
    bikePhotos[clear.dataset.clear] = null;
    renderBikePhotos();
    return;
  }
  const tile = e.target.closest("[data-side]");
  if (tile) captureSide(tile.dataset.side);
});

document.getElementById("photosBack").addEventListener("click", () => goTo("faults"));
document.getElementById("reviewBtn").addEventListener("click", () => {
  console.log("Checklist done →", {
    bike: BIKE.id,
    faults: faultyParts().map(p => p.name),
    sides: SIDES.filter(s => bikePhotos[s.key]).map(s => s.key),
  });
  /* The checklist step is finished, so the job advances and the mechanic lands
     back on the task with Remove battery live. There is no summary screen: the
     job page already carries the progress and what is left, so a separate
     "here is what you did" page was a step between the work and the next step. */
  jobAt = 1;
  goTo("job");
  toast("Assessment dashboard done — remove the battery next");
});
