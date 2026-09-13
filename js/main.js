document.addEventListener("DOMContentLoaded", () => {
  initInteractionPolish();
  setActiveNavLink();
  initExternalLinks();
  initThemeToggle();
});

function normalizePathname(pathname) {
  const cleaned = pathname
    .replace(/\\/g, "/")
    .replace(/\/index(?:\.html)?$/i, "/")
    .replace(/\.html$/i, "")
    .replace(/\/+$/, "");

  return cleaned || "/";
}

function getSection(pathname) {
  const parts = normalizePathname(pathname).split("/").filter(Boolean);
  return parts[0] || "index";
}

function setActiveNavLink() {
  const currentPath = normalizePathname(window.location.pathname);
  const currentSection = getSection(currentPath);

  document.querySelectorAll(".site-nav a:not(.nav-name)").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const targetUrl = new URL(href, window.location.href);
    const linkPath = normalizePathname(targetUrl.pathname);
    const linkSection = getSection(linkPath);

    const isHomeLink = linkSection === "index";
    const isExactMatch = linkPath === currentPath;
    const isSectionMatch = !isHomeLink && linkSection === currentSection;

    if (isExactMatch || isSectionMatch || (isHomeLink && currentPath === "/")) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function initExternalLinks() {
  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    if (!link.getAttribute("rel")) {
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
}

function initThemeToggle() {
  const toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;

  let stored;
  try { stored = localStorage.getItem("theme"); } catch { /* Storage is optional. */ }
  // Light is the default; only an explicit saved choice enables dark mode.
  const theme = stored === "dark" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", theme);
  updateToggleLabel(toggle, theme);

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch { /* The in-page choice still works. */ }
    updateToggleLabel(toggle, next);
  });
}

function updateToggleLabel(toggle, theme) {
  if (!toggle) return;

  const sunIcon = toggle.querySelector(".icon-sun");
  const moonIcon = toggle.querySelector(".icon-moon");

  if (sunIcon) {
    sunIcon.setAttribute("aria-hidden", "true");
  }

  if (moonIcon) {
    moonIcon.setAttribute("aria-hidden", "true");
  }

  toggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
}

/* Shared input policy and a small enhancement of native disclosures. No idle loop. */
function initInteractionPolish() {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const active = new Map();
  root.dataset.input = "keyboard";
  function settle(details, state) {
    if (active.get(details) !== state) return;
    active.delete(details);
    state.animation.onfinish = null;
    state.animation.cancel();
    details.open = state.target;
    details.removeAttribute("data-disclosure-moving");
    details.removeAttribute("data-motion-open");
  }
  function settleAll() { active.forEach((state, details) => settle(details, state)); }
  function keyboard() { root.dataset.input = "keyboard"; settleAll(); }
  document.addEventListener("keydown", keyboard, true);
  document.addEventListener("pointerdown", () => { root.dataset.input = "pointer"; }, {capture: true, passive: true});
  document.addEventListener("pointermove", event => {
    if (event.pointerType === "mouse" && (event.movementX || event.movementY) && root.dataset.input !== "pointer") root.dataset.input = "pointer";
  }, {passive: true});
  document.addEventListener("click", event => { if (event.detail === 0) keyboard(); }, true);

  document.querySelectorAll("details.learning-item, details.expandable").forEach(details => {
    const summary = details.querySelector(":scope > summary");
    if (!summary || typeof details.animate !== "function") return;
    summary.addEventListener("click", event => {
      if (event.defaultPrevented || event.detail === 0 || reduced.matches || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      const previous = active.get(details);
      const target = !(previous ? previous.target : details.open);
      const start = details.getBoundingClientRect().height;
      if (previous) {
        previous.animation.onfinish = null;
        previous.animation.cancel();
        active.delete(details);
      }
      details.open = target;
      const end = details.getBoundingClientRect().height;
      details.open = true;
      details.dataset.motionOpen = String(target);
      details.setAttribute("data-disclosure-moving", "");
      const tokens = getComputedStyle(root);
      const animation = details.animate([{height: `${start}px`}, {height: `${end}px`}], {
        duration: parseFloat(tokens.getPropertyValue("--duration-disclosure")) || 200,
        easing: tokens.getPropertyValue("--ease-out").trim() || "cubic-bezier(0.23, 1, 0.32, 1)"
      });
      const state = {target, animation};
      active.set(details, state);
      animation.onfinish = () => settle(details, state);
    });
  });
  reduced.addEventListener("change", settleAll);
  window.addEventListener("resize", settleAll, {passive: true});
  window.addEventListener("beforeprint", settleAll);
  window.addEventListener("pagehide", settleAll);
  window.addEventListener("hashchange", () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ""; }
    const target = id && document.getElementById(id);
    if (active.has(target)) active.get(target).target = true;
    settleAll();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) settleAll(); });
}
