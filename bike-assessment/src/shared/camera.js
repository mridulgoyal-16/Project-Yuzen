/* ── Camera ───────────────────────────────────────────────────────────────── */
/* Part photographs only. It used to serve the Bike photos screen too — four
   sides, one shot each, through `captureSide()` and a `pendingSide` — and that
   screen is archived (see archive/README.md), so both went with it rather than
   being left as a path nothing can reach. */
const cameraInput = document.getElementById("cameraInput");
let pendingPart = null;

const useRealCamera = () => CONFIG.CAMERA_MODE === "camera"
  || (CONFIG.CAMERA_MODE === "auto" && window.matchMedia("(pointer: coarse)").matches);

function capturePhoto(part){
  if (part.photos.length >= CONFIG.MAX_PHOTOS) return;
  if (useRealCamera()){
    pendingPart = part;
    cameraInput.value = "";
    cameraInput.click();
  } else {
    part.photos.push("--img-captured");   /* sample capture, for desktop demos */
    renderFaults();
  }
}

cameraInput.addEventListener("change", () => {
  const file = cameraInput.files && cameraInput.files[0];
  if (file && pendingPart){
    pendingPart.photos.push(URL.createObjectURL(file));
    renderFaults();
  }
  pendingPart = null;
});

