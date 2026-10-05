/* Stamp the vehicle into every place that shows it. */
function stampBike(){
  document.querySelectorAll("[data-bike-id]").forEach(el => el.textContent = BIKE.id);
  document.querySelectorAll("[data-bike-model]").forEach(el => el.textContent = BIKE.model);
  document.querySelectorAll("[data-bike-battery]").forEach(el => el.textContent = BIKE.battery + "%");
  document.querySelectorAll("[data-assignee]").forEach(el => el.textContent = BIKE.assignee);
}
stampBike();

/* Icons that appear in static markup on more than one screen are stamped from
   ICON rather than pasted into each, so they cannot drift apart. Inserted, not
   assigned: some of these buttons carry a label beside the glyph, and replacing
   innerHTML would take the label with it. */
/* Idempotent, and it has to be: build.py ships the PRE-RENDERED DOM, so this
   already ran once before the file was written and runs again on every open.
   Without the guard every stamped button ended up with two glyphs — which the
   Learn pill showed as 115px instead of 88. */
document.querySelectorAll("[data-icon]").forEach(el => {
  if (el.querySelector("svg")) return;
  const svg = ICON[el.dataset.icon];
  if (svg) el.insertAdjacentHTML("afterbegin", svg);
});
