/*
 * Shared data + motion helpers for the RiftCoach design concepts.
 * All numbers are the app's synthetic DEMO dataset — no real player, no real game.
 * Plain script (no modules) so pages also work when opened from disk.
 */
(function () {
  "use strict";

  var DATA = {
    player: "Joueur Démo",
    tag: "DEMO",
    games: 79,
    winrate: 49,
    kda: 2.64,
    cs: 6.5,
    duration: "28:10",
    // Rolling win rate (10 games), demo dataset, chronological.
    series: [50, 60, 70, 70, 60, 60, 70, 60, 50, 50, 60, 60, 70, 70, 60, 50, 50, 60, 50, 40, 50, 60, 50, 40, 40, 50, 50, 40, 50, 50],
    champs: [
      { name: "Annie", games: 14, wr: 57 },
      { name: "Orianna", games: 11, wr: 45 },
      { name: "Vi", games: 9, wr: 44 },
      { name: "Ahri", games: 8, wr: 50 },
      { name: "Viktor", games: 7, wr: 43 },
    ],
    insight: { metric: "Morts / 10 min", recent: 2.43, baseline: 1.77, recentN: 15, baselineN: 40, confidence: "Élevée" },
    goal: { label: "Morts / 10 min ≤ 1,77", horizon: 10, tracked: 6, current: 1.95 },
  };

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fmt(n, decimals) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  /** Animates every [data-count] element from 0 to its value when it enters the viewport. */
  function counters(root) {
    var els = (root || document).querySelectorAll("[data-count]");
    els.forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var suffix = el.getAttribute("data-suffix") || "";
      var duration = parseInt(el.getAttribute("data-duration") || "1100", 10);
      var ease = el.getAttribute("data-ease") || "out";
      if (reduced) {
        el.textContent = fmt(target, decimals) + suffix;
        return;
      }
      el.textContent = fmt(0, decimals) + suffix;
      onVisible(el, function () {
        var start = performance.now();
        function tick(now) {
          // rAF timestamps can precede `start`: clamp to [0, 1] (avoids negative counts).
          var t = Math.max(0, Math.min(1, (now - start) / duration));
          var e = ease === "step" ? Math.floor(t * 12) / 12 : 1 - Math.pow(1 - t, 3);
          el.textContent = fmt(target * e, decimals) + suffix;
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    });
  }

  /** Builds a line (and optional area) path inside every svg[data-spark]. */
  function sparks(root) {
    (root || document).querySelectorAll("svg[data-spark]").forEach(function (svg) {
      var w = parseFloat(svg.getAttribute("data-w") || "300");
      var h = parseFloat(svg.getAttribute("data-h") || "100");
      var pad = parseFloat(svg.getAttribute("data-pad") || "6");
      var smooth = svg.hasAttribute("data-smooth");
      var step = svg.hasAttribute("data-step");
      var s = DATA.series;
      var min = Math.min.apply(null, s) - 5;
      var max = Math.max.apply(null, s) + 5;
      var pts = s.map(function (v, i) {
        return [pad + (i / (s.length - 1)) * (w - pad * 2), pad + (1 - (v - min) / (max - min)) * (h - pad * 2)];
      });
      var d = "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1);
      for (var i = 1; i < pts.length; i++) {
        var p = pts[i], q = pts[i - 1];
        if (step) d += " H" + p[0].toFixed(1) + " V" + p[1].toFixed(1);
        else if (smooth) {
          var cx = ((q[0] + p[0]) / 2).toFixed(1);
          d += " C" + cx + "," + q[1].toFixed(1) + " " + cx + "," + p[1].toFixed(1) + " " + p[0].toFixed(1) + "," + p[1].toFixed(1);
        } else d += " L" + p[0].toFixed(1) + "," + p[1].toFixed(1);
      }
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      var ns = "http://www.w3.org/2000/svg";
      if (svg.hasAttribute("data-area")) {
        var area = document.createElementNS(ns, "path");
        area.setAttribute("d", d + " L" + (w - pad) + "," + (h - pad) + " L" + pad + "," + (h - pad) + " Z");
        area.setAttribute("class", "spark-area");
        svg.appendChild(area);
      }
      var line = document.createElementNS(ns, "path");
      line.setAttribute("d", d);
      line.setAttribute("class", "spark-line");
      svg.appendChild(line);
      if (svg.hasAttribute("data-dots")) {
        pts.forEach(function (p, i) {
          var c = document.createElementNS(ns, "circle");
          c.setAttribute("cx", p[0]);
          c.setAttribute("cy", p[1]);
          c.setAttribute("r", svg.getAttribute("data-dots") || "2.5");
          c.setAttribute("class", "spark-dot");
          c.style.setProperty("--i", i);
          svg.appendChild(c);
        });
      }
      var len = line.getTotalLength();
      line.style.setProperty("--len", len);
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = reduced ? 0 : len;
      onVisible(svg, function () {
        svg.classList.add("is-drawn");
      });
    });
  }

  /** Adds .is-in to [data-reveal] elements as they enter the viewport (stagger via --i). */
  function reveals(root) {
    var els = (root || document).querySelectorAll("[data-reveal]");
    els.forEach(function (el, i) {
      if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", el.getAttribute("data-reveal") || i % 8);
      if (reduced) el.classList.add("is-in");
      else onVisible(el, function () {
        el.classList.add("is-in");
      });
    });
  }

  /**
   * Runs cb once when el is visible. Safety net: content must never stay hidden if the
   * observer cannot fire (background tab, print, clip-path targets), so cb also runs after 2.5 s.
   */
  function onVisible(el, cb) {
    var done = false;
    function once() {
      if (done) return;
      done = true;
      cb();
    }
    if (!("IntersectionObserver" in window)) return once();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          io.disconnect();
          once();
        }
      });
    }, { threshold: 0.01 });
    io.observe(el);
    setTimeout(function () {
      io.disconnect();
      once();
    }, 2500);
  }

  /** Fills [data-champs] lists from DATA with the template's first child as model. */
  function champs(root) {
    (root || document).querySelectorAll("[data-champs]").forEach(function (list) {
      var tpl = list.firstElementChild;
      if (!tpl) return;
      list.innerHTML = "";
      DATA.champs.forEach(function (c, i) {
        var node = tpl.cloneNode(true);
        node.style.setProperty("--i", i);
        node.style.setProperty("--pct", (c.games / DATA.champs[0].games) * 100 + "%");
        node.querySelectorAll("[data-f]").forEach(function (f) {
          var k = f.getAttribute("data-f");
          f.textContent = k === "wr" ? c.wr + " %" : k === "games" ? c.games + " parties" : c[k];
        });
        list.appendChild(node);
      });
    });
  }

  window.RC = { DATA: DATA, reduced: reduced, fmt: fmt, init: function () { champs(); counters(); sparks(); reveals(); } };
  document.addEventListener("DOMContentLoaded", window.RC.init);
})();
