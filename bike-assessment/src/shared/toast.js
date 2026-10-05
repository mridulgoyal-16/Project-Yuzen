/* ── Toast ────────────────────────────────────────────────────────────────── */
const toastEl = document.getElementById("toast");
let toastTimer;
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-shown"), 1800);
}

