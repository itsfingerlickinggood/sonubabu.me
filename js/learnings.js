/* Covers are static; titles remain readable even when an image is unavailable. */
(() => {
  document.querySelectorAll(".shelf-cover").forEach(cover => {
    const img = cover.querySelector("img");
    if (!img) return;
    const update = () => cover.toggleAttribute("data-cover-error", img.complete && img.naturalWidth === 0);
    img.addEventListener("load", update);
    img.addEventListener("error", update);
    update();
  });
})();
