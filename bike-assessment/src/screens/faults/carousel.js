/* ── Customer photos carousel ─────────────────────────────────────────────── */
const carouselEl = document.getElementById("carousel");
const trackEl    = document.getElementById("track");
const dotsEl     = document.getElementById("dots");
let slide = 0;

trackEl.innerHTML = CUSTOMER_PHOTOS.map((v,i) =>
  `<div class="slide" role="img" aria-label="Customer photo ${i+1}" style="background-image:var(${v})"></div>`).join("");
dotsEl.innerHTML = CUSTOMER_PHOTOS.map((_,i) =>
  `<button type="button" data-slide="${i}" aria-label="Photo ${i+1}" aria-current="${i===0}"></button>`).join("");

/* Opened by enterFaults and never closed by a person: the pill that used to
   close it is gone. The parameter stays because the two states are still what
   the component is — the geometry suites measure both, and the screen arrives by
   moving from one to the other. */
function setCarousel(open){
  carouselEl.classList.toggle("is-open", open);
  carouselEl.setAttribute("aria-hidden", String(!open));
  /* Opening puts the page in its scrolled state: the title collapses and the
     header takes over, so the carousel is not competing with it for space. */
  scrFaults.classList.toggle("photos-open", open);
  syncFaultsHeading();
  if (open) trackEl.scrollLeft = slide * trackEl.clientWidth;
}

trackEl.addEventListener("scroll", () => {
  const w = trackEl.clientWidth || 1;
  const i = Math.round(trackEl.scrollLeft / w);
  if (i === slide) return;
  slide = i;
  [...dotsEl.children].forEach((d,n) => d.setAttribute("aria-current", String(n === i)));
}, {passive:true});

dotsEl.addEventListener("click", e => {
  const b = e.target.closest("[data-slide]");
  if (b) trackEl.scrollTo({left: Number(b.dataset.slide) * trackEl.clientWidth, behavior:"smooth"});
});

