// Apply the saved theme before first paint to avoid a flash.
try {
  var t = localStorage.getItem("es-theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch {
  /* storage unavailable */
}
