document.addEventListener("DOMContentLoaded", () => {
  setActiveNavLink();
  initExternalLinks();
  initThemeToggle();
});

function setActiveNavLink() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const segments = path.split("/").filter(Boolean);
  const page = segments.pop() || "";

  document.querySelectorAll(".site-nav a:not(.nav-name)").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const linkPage = href.replace(".html", "").replace("./", "");

    if (
      linkPage === page ||
      linkPage === page.replace(".html", "") ||
      (page === "" && linkPage === "index") ||
      (page === "index" && linkPage === "index") ||
      (page === "index.html" && linkPage === "index")
    ) {
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
  const sunIcon = toggle.querySelector(".icon-sun");
  const moonIcon = toggle.querySelector(".icon-moon");
  if (sunIcon && moonIcon) {
    sunIcon.style.display = theme === "dark" ? "block" : "none";
    moonIcon.style.display = theme === "dark" ? "none" : "block";
  }
  toggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
}
