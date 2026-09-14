// Runs synchronously before first paint to avoid a theme flash. CSP forbids
// inline scripts, so this lives in a separate file (D15).
(function () {
  var theme = "system";
  try {
    var stored = localStorage.getItem("ecv-theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      theme = stored;
    }
  } catch (e) {
    /* localStorage unavailable: keep default */
  }
  var dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) {
    document.documentElement.classList.add("dark");
  }
})();
