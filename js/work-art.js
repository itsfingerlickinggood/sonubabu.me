/* Art is still until the reader asks to inspect it. No animation runtime at idle. */
(() => {
  "use strict";
  const links = [...document.querySelectorAll("[data-art]")];
  if (!links.length) return;

  const root = document.documentElement;
  let activeTheme = "";
  let refreshViewer = () => {};
  // Blend the palette actually decoded, not the requested palette. This avoids a
  // white flash if the reader switches theme while the next image is loading.
  function markPalette(image) {
    const source = image.currentSrc || image.src;
    image.dataset.artPalette = /-dark(?:-\d+)?\.webp(?:$|[?#])/.test(source) ? "dark" : "light";
  }
  links.forEach(link => {
    const image = link.querySelector("img");
    image.addEventListener("load", () => markPalette(image));
    if (image.complete && image.naturalWidth) markPalette(image);
  });
  function syncTheme() {
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    if (theme === activeTheme) return;
    activeTheme = theme;
    links.forEach(link => {
      const source = link.querySelector("[data-art-dark-source]");
      if (source) source.media = theme === "dark" ? "all" : "not all";
      const full = theme === "dark" ? link.dataset.artDark : link.dataset.artLight;
      if (full) link.setAttribute("href", full);
    });
    refreshViewer();
  }
  syncTheme();
  new window.MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  const dialog = document.createElement("dialog");
  if (typeof dialog.showModal !== "function") return; // Plain image links still work.
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  dialog.className = "art-dialog";
  dialog.setAttribute("aria-labelledby", "art-dialog-title");
  dialog.setAttribute("aria-describedby", "art-dialog-caption");
  dialog.innerHTML = `
    <div class="art-dialog-bar">
      <span>Painted study</span>
      <button type="button" class="art-close" aria-label="Close illustration" autofocus>Close <span aria-hidden="true">×</span></button>
    </div>
    <div class="art-dialog-image"><img width="1200" height="1200" alt="" /></div>
    <div class="art-dialog-copy">
      <h2 id="art-dialog-title"></h2>
      <p id="art-dialog-caption"></p>
    </div>`;
  document.body.appendChild(dialog);
  const picture = dialog.querySelector("img");
  const title = dialog.querySelector("h2");
  const caption = dialog.querySelector("#art-dialog-caption");
  const closeButton = dialog.querySelector(".art-close");
  let trigger = null;
  let closeTimer = 0;
  let enterFrame = 0;
  let previousOverflow = "";
  let pageLocked = false;
  let requestVersion = 0;
  let pointerStartedOutside = false;
  picture.addEventListener("load", () => markPalette(picture));

  function loadArtwork(link) {
    const full = link.getAttribute("href");
    const version = ++requestVersion;
    const highResolution = new Image();
    highResolution.onload = () => {
      if (dialog.open && version === requestVersion) {
        picture.src = full;
        markPalette(picture);
      }
    };
    highResolution.src = full;
  }
  refreshViewer = () => {
    if (dialog.open && trigger && !dialog.hasAttribute("data-closing")) loadArtwork(trigger);
  };

  function finishClose() {
    window.clearTimeout(closeTimer);
    closeTimer = 0;
    window.cancelAnimationFrame(enterFrame);
    if (dialog.open) dialog.close();
    restorePage();
  }
  function restorePage() {
    // Native close events are queued. An old event must not hide a newly opened
    // illustration or overwrite the next viewer's scroll/focus state.
    if (dialog.open || !pageLocked) return;
    pageLocked = false;
    window.clearTimeout(closeTimer);
    closeTimer = 0;
    window.cancelAnimationFrame(enterFrame);
    requestVersion++;
    dialog.removeAttribute("data-visible");
    root.style.overflow = previousOverflow;
    trigger?.focus({ preventScroll: true });
  }
  function close(instant = false) {
    if (!dialog.open) return;
    if (dialog.hasAttribute("data-closing")) {
      if (instant || motion.matches) finishClose();
      return;
    }
    window.clearTimeout(closeTimer);
    closeTimer = 0;
    window.cancelAnimationFrame(enterFrame);
    dialog.setAttribute("data-closing", "");
    dialog.removeAttribute("data-visible");
    requestVersion++;
    if (instant || motion.matches || dialog.hasAttribute("data-instant")) finishClose();
    else closeTimer = window.setTimeout(finishClose, 180);
  }

  function open(event, link) {
    // Preserve open-in-new-tab and the native no-JS fallback.
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
    const full = link.getAttribute("href");
    if (!full?.startsWith("/assets/work/")) return;
    event.preventDefault();
    window.clearTimeout(closeTimer);
    closeTimer = 0;
    window.cancelAnimationFrame(enterFrame);
    trigger = link;
    dialog.dataset.artStyle = link.dataset.artStyle || 'cutout';
    const thumbnail = link.querySelector("img");
    // The thumbnail is already decoded. Never open on an empty image stage.
    picture.src = thumbnail.currentSrc || thumbnail.src;
    picture.dataset.artPalette = thumbnail.dataset.artPalette || "light";
    picture.alt = thumbnail.alt;
    title.textContent = link.dataset.artTitle;
    caption.textContent = link.dataset.artCaption;
    const instant = motion.matches || event.detail === 0;
    const alreadyOpen = dialog.open;
    dialog.toggleAttribute("data-instant", instant);
    dialog.removeAttribute("data-closing");
    if (!alreadyOpen) dialog.removeAttribute("data-visible");
    if (!dialog.open) {
      previousOverflow = document.documentElement.style.overflow;
      pageLocked = true;
      document.documentElement.style.overflow = "hidden";
      dialog.showModal();
    }
    closeButton.focus({ preventScroll: true });
    if (instant || alreadyOpen) dialog.setAttribute("data-visible", "");
    else {
      // One layout read starts the CSS transition; no per-frame layout work.
      dialog.getBoundingClientRect();
      enterFrame = window.requestAnimationFrame(() => {
        if (dialog.open) dialog.setAttribute("data-visible", "");
      });
    }
    loadArtwork(link);
  }

  links.forEach(link => {
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", event => open(event, link));
  });
  closeButton.addEventListener("click", event => close(event.detail === 0));
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(true); });
  dialog.addEventListener("pointerdown", event => { pointerStartedOutside = event.target === dialog; });
  dialog.addEventListener("click", event => {
    if (event.target === dialog && pointerStartedOutside) close();
    pointerStartedOutside = false;
  });
  dialog.addEventListener("close", restorePage);
  motion.addEventListener("change", () => {
    if (motion.matches && dialog.open) {
      dialog.setAttribute("data-instant", "");
      if (closeTimer) finishClose();
      else dialog.setAttribute("data-visible", "");
    }
  });
})();
