// Marks <html data-pointer="mouse"> while a real mouse is in use, which switches
// on the site's hover styles (see the hover variant in src/index.css).
// Media queries can't be trusted for this: some touchscreen laptops report
// (hover: none) and (any-hover: none) even with a mouse or trackpad attached.
// A touch or pen press clears it, so tapping never leaves a card stuck lit.
(function () {
  var root = document.documentElement
  function track(e) {
    if (e.pointerType === 'mouse') root.dataset.pointer = 'mouse'
    else delete root.dataset.pointer
  }
  window.addEventListener('pointermove', track, { passive: true })
  window.addEventListener('pointerdown', track, { passive: true })
})()
