// Applies the saved or system theme before first paint; see src/lib/theme.ts.
// Loaded as a blocking script by every HTML page so no page flashes the wrong theme.
(function () {
  var theme
  try { theme = localStorage.getItem('theme') } catch (e) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  document.documentElement.dataset.theme = theme
})()
