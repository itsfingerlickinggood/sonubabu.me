(function () {
  var reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initCoverflow(stage) {
    stage.classList.add("coverflow-3d");
    var cards = Array.from(stage.querySelectorAll(".coverflow-card"));
    var prev = stage.querySelector("[data-coverflow-prev]");
    var next = stage.querySelector("[data-coverflow-next]");
    var idx = 0;
    var n = cards.length;

    function render() {
      cards.forEach(function (card, i) {
        var d = i - idx;
        var ad = Math.abs(d);
        var x = d * 115;
        var rot = Math.max(-34, Math.min(34, d * -25));
        var z = -ad * 29;
        var sc = d === 0 ? 1 : ad === 1 ? 0.91 : 0.82;
        var op =
          ad > 2 ? 0.08 : d === 0 ? 1 : ad === 1 ? 0.38 : 0.2;

        card.style.transform =
          "translate3d(" +
          x +
          "px,0," +
          z +
          "px) rotateY(" +
          rot +
          "deg) scale(" +
          sc +
          ")";

        card.style.opacity = String(op);
        card.style.zIndex = String(20 - ad);
        card.classList.toggle("is-focused", d === 0);
        card.setAttribute("aria-hidden", d === 0 ? "false" : "true");
        card.setAttribute("data-depth", String(Math.min(ad, 3)));

        var art = card.querySelector(".coverflow-card-art");
        if (art) {
          art.style.filter = "none";
          if (reduceMotion || d === 0) {
            art.style.transform = d === 0 ? "scale(1)" : "scale(1.012)";
          } else {
            art.style.transform = "scale(1.02)";
          }
        }
      });
      if (prev) prev.disabled = idx <= 0;
      if (next) next.disabled = idx >= n - 1;
    }

    if (prev) {
      prev.addEventListener("click", function () {
        if (idx > 0) {
          idx--;
          render();
        }
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        if (idx < n - 1) {
          idx++;
          render();
        }
      });
    }
    render();
    stage.setAttribute("data-coverflow-ready", "");
  }

  document.querySelectorAll("[data-coverflow]").forEach(initCoverflow);
})();
