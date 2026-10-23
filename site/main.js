// Reveal-on-scroll with stagger. Content stays visible without JS (see .no-js fallback below).
(function () {
  var els = document.querySelectorAll("[data-reveal]");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    els.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  els.forEach(function (el) {
    var siblings = el.parentElement ? [].indexOf.call(el.parentElement.children, el) : 0;
    el.style.setProperty("--i", Math.min(siblings, 7));
    io.observe(el);
  });
  // Safety net: never leave content hidden if the observer cannot fire.
  setTimeout(function () {
    els.forEach(function (el) { el.classList.add("is-in"); });
  }, 2500);
})();
