document.addEventListener("DOMContentLoaded", () => {
  setActiveNavLink();
  initExternalLinks();
  initThemeToggle();
  scheduleVizLoad();
});

function scheduleVizLoad() {
  if (!document.querySelector("[data-viz]")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const run = () => {
    if (document.querySelector("script[data-sonu-viz]")) return;
    const ref = document.querySelector('link[href*="site.min.css"]');
    if (!ref || !ref.href) return;
    const url = ref.href.replace(/\/css\/site\.min\.css(\?.*)?$/i, "/js/viz.min.js$1");
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.setAttribute("data-sonu-viz", "");
    document.body.appendChild(s);
  };
  /* Hero / home: load viz immediately so the canvas (e.g. dot matrix) is not blank for hundreds of ms. */
  const vizAboveFold =
    document.querySelector(".learnings-page [data-viz]") ||
    document.querySelector(".home-main [data-viz]");
  if (vizAboveFold) {
    setTimeout(run, 0);
  } else if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 600 });
  } else {
    setTimeout(run, 16);
  }
}

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

  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored || (prefersDark ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", theme);
  updateToggleLabel(toggle, theme);

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateToggleLabel(toggle, next);
  });
}

function updateToggleLabel(toggle, theme) {
  if (!toggle) return;

  const sunIcon = toggle.querySelector(".icon-sun");
  const moonIcon = toggle.querySelector(".icon-moon");

  if (sunIcon) {
    const showSun = theme === "dark";
    sunIcon.style.display = showSun ? "block" : "none";
    sunIcon.setAttribute("aria-hidden", showSun ? "false" : "true");
  }

  if (moonIcon) {
    const showMoon = theme !== "dark";
    moonIcon.style.display = showMoon ? "block" : "none";
    moonIcon.setAttribute("aria-hidden", showMoon ? "false" : "true");
  }

  toggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
}
