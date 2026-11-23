// Light/dark toggle. The initial theme is set inline in head.html to avoid a flash.
(() => {
  const root = document.documentElement;
  const system = matchMedia("(prefers-color-scheme: dark)");
  let chosen = false;
  try { chosen = ["dark", "light"].includes(localStorage.getItem("theme")); } catch {}

  function set(theme) {
    root.dataset.theme = theme;
    document.dispatchEvent(new Event("themechange"));
  }

  document.querySelector(".theme-toggle")?.addEventListener("click", () => {
    const theme = root.dataset.theme === "dark" ? "light" : "dark";
    chosen = true;
    try { localStorage.setItem("theme", theme); } catch {}
    set(theme);
  });

  // Follow the system until the visitor picks a theme.
  system.addEventListener("change", (e) => {
    if (!chosen) set(e.matches ? "dark" : "light");
  });
})();
