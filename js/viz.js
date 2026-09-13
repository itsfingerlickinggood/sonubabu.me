(() => {
  const vizContainers = document.querySelectorAll("[data-viz]");
  if (!vizContainers.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = prefersReducedMotion.matches;
  const vizState = new WeakMap();
  const resizeHandlers = new Set();

  window.addEventListener(
    "resize",
    () => {
      resizeHandlers.forEach((handler) => handler());
    },
    { passive: true }
  );

  function queueFrame(ctr, draw) {
    const state = vizState.get(ctr);
    if (!state) return;
    state.draw = draw;
    if (state.frame || state.single || state.paused || !state.visible || document.hidden || reducedMotion) return;
    state.frame = window.requestAnimationFrame(() => {
      state.frame = 0;
      if (!state.paused && state.visible && !document.hidden && !reducedMotion) draw();
    });
  }

  function paintStill(ctr) {
    const state = vizState.get(ctr);
    if (!state?.draw) return;
    cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.single = true;
    state.draw();
    state.single = false;
    queueFrame(ctr, state.draw);
  }

  const isDark = () =>
    document.documentElement.getAttribute("data-theme") === "dark";
  const C = () => ({
    fg: isDark() ? "rgba(168,162,158," : "rgba(120,113,108,",
    hi: isDark() ? "rgba(231,229,228," : "rgba(28,25,23,",
    ac: isDark() ? "rgba(168,162,158," : "rgba(87,83,78,",
  });

  function initCanvas(ctr) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;display:block;";
    ctr.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let w, h;
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      if (w === ctr.clientWidth && h === ctr.clientHeight && canvas.width === Math.round(w * dpr)) return;
      w = ctr.clientWidth; h = ctr.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintStill(ctr);
    }
    resize();
    resizeHandlers.add(resize);
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(ctr);
    return {
      ctx,
      W: () => w,
      H: () => h,
      cleanup: () => { resizeHandlers.delete(resize); sizeObserver.disconnect(); },
    };
  }


  // 404 grid and homepage dot field are the only live canvas views.
  function gridwalk(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const sp = 22;
    let agentI = 0, agentJ = 0, targetI = 5, targetJ = 3;
    let f = 0, trail = [];
    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / sp) + 1, rows = Math.ceil(h / sp) + 1;
      const ox = (w - (cols - 1) * sp) / 2, oy = (h - (rows - 1) * sp) / 2;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        ctx.beginPath(); ctx.arc(ox + i * sp, oy + j * sp, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = c.fg + "0.1)"; ctx.fill();
      }
      trail.forEach((t, idx) => {
        ctx.beginPath(); ctx.arc(ox + t[0] * sp, oy + t[1] * sp, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = c.ac + ((1 - idx / trail.length) * 0.2).toFixed(2) + ")"; ctx.fill();
      });
      ctx.beginPath(); ctx.arc(ox + agentI * sp, oy + agentJ * sp, 3, 0, Math.PI * 2);
      ctx.fillStyle = c.hi + "0.6)"; ctx.fill();
      ctx.beginPath(); ctx.arc(ox + targetI * sp, oy + targetJ * sp, 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = c.hi + "0.35)"; ctx.lineWidth = 1; ctx.stroke();
      if (f % 12 === 0) {
        trail.push([agentI, agentJ]); if (trail.length > 15) trail.shift();
        if (agentI < targetI) agentI++; else if (agentI > targetI) agentI--;
        else if (agentJ < targetJ) agentJ++; else if (agentJ > targetJ) agentJ--;
        else { targetI = Math.floor(Math.random() * Math.min(cols, 20)); targetJ = Math.floor(Math.random() * Math.min(rows, 10)); trail = []; }
      }
      f++; queueFrame(ctr, draw);
    })();
  }

  /* ═══ DOT MATRIX — homepage right panel ═══ */
  function dotMatrix(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const S = 13;
    let t = 0;
    const sources = [];
    let nextSpawn = 25;
    let previousTime = null;

    (function draw() {
      const now = performance.now();
      const state = vizState.get(ctr);
      const gap = previousTime === null || state.clockReset ? 0 : now - previousTime;
      const delta = state.single || state.paused || reducedMotion || gap > 100 ? 0 : gap / (1000 / 60);
      state.clockReset = false;
      previousTime = now;
      t += delta;
      for (let i = sources.length - 1; i >= 0; i--) {
        sources[i].life += delta;
        if (sources[i].life >= sources[i].maxLife) sources.splice(i, 1);
      }
      const w = W(), h = H();
      const c = C();
      ctx.clearRect(0, 0, w, h);

      const cols = Math.floor(w / S);
      const rows = Math.floor(h / S);
      /* Left-align grid so the art sits flush beside the text column (no dead band). */
      const ox = S / 2;
      const oy = (h - rows * S) / 2 + S / 2;

      if (t >= nextSpawn) {
        const mg = 3;
        sources.push({
          cx: mg + Math.random() * (cols - mg * 2),
          cy: mg + Math.random() * (rows - mg * 2),
          life: 0,
          maxLife: 160 + Math.floor(Math.random() * 100),
          spd: 0.052 + Math.random() * 0.028,
        });
        nextSpawn = t + 65 + Math.floor(Math.random() * 85);
      }

      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const x = ox + col * S;
          const y = oy + r * S;

          const a1 = Math.sin(col * 0.31 + t * 0.016 + r * 0.09) * 0.5 + 0.5;
          const a2 = Math.sin(r * 0.27 - t * 0.013 + col * 0.11) * 0.5 + 0.5;
          const ambient = a1 * a2 * 0.18 + 0.04;

          let peak = 0;
          for (const src of sources) {
            const dx = col - src.cx;
            const dy = r - src.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const waveFront = src.life * src.spd;
            const diff = dist - waveFront;
            const decay = Math.pow(1 - src.life / src.maxLife, 1.3);
            if (diff > -2.5 && diff < 0.9) {
              const ring = Math.exp(-diff * diff * 0.55) * decay * 0.88;
              if (ring > peak) peak = ring;
            }
          }

          const total = Math.min(1, ambient + peak);
          const alpha = Math.pow(total, 0.72) * 0.88;
          const rad = 0.75 + total * 0.75;

          ctx.beginPath();
          ctx.arc(x, y, rad, 0, 6.2832);
          ctx.fillStyle = c.hi + alpha.toFixed(2) + ")";
          ctx.fill();
        }
      }

      queueFrame(ctr, draw);
    })();
  }

  /* ═══ REGISTRY ═══ */
  const vizMap = { gridwalk, dotMatrix };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const state = vizState.get(e.target);
      if (!state) return;
      state.visible = e.isIntersecting;
      if (state.visible && state.draw) queueFrame(e.target, state.draw);
      else { cancelAnimationFrame(state.frame); state.frame = 0; state.clockReset = true; }
    });
  }, { threshold: 0 });

  vizContainers.forEach((ctr, index) => {
    const type = ctr.getAttribute("data-viz");
    if (!vizMap[type]) return;

    const reader = Boolean(ctr.closest(".reading-article"));
    const home = Boolean(ctr.closest(".home-main"));
    const state = { visible: true, paused: reader, frame: 0, single: false };
    vizState.set(ctr, state);
    vizMap[type](ctr);
    observer.observe(ctr);
    if (reader || home) {
      const labels = {latentField: "Idea connections", attractor: "Strange attractor", gradientDescent: "Gradient descent", lossLandscape: "Loss landscape"};
      const canvas = ctr.querySelector("canvas");
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", (labels[type] || "Conceptual") + " illustration");
      const caption = ctr.closest("figure")?.querySelector("figcaption");
      if (caption) {
        caption.id ||= "illustration-caption-" + index;
        canvas.setAttribute("aria-describedby", caption.id);
      }
      ctr.id ||= "illustration-" + index;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "viz-playback";
      button.setAttribute("aria-controls", ctr.id);
      const icon = '<svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">';
      function updateButton() {
        const reduced = reducedMotion;
        button.hidden = home && reduced;
        if (reduced) button.removeAttribute("aria-pressed");
        else button.setAttribute("aria-pressed", String(!state.paused));
        const text = reduced ? "Step illustration" : state.paused ? "Play illustration" : "Pause illustration";
        button.innerHTML = icon + (state.paused ? '<path d="M4 2.5v11l9-5.5z"/>' : '<path d="M4 3h3v10H4zm5 0h3v10H9z"/>') + '</svg><span>' + text + '</span>';
      }
      button.addEventListener("click", () => {
        if (reducedMotion) paintStill(ctr);
        else {
          state.paused = !state.paused;
          state.clockReset = true;
          if (state.paused) { cancelAnimationFrame(state.frame); state.frame = 0; }
          else queueFrame(ctr, state.draw);
        }
        updateButton();
      });
      state.updateButton = updateButton;
      updateButton();
      ctr.after(button);
    }
  });

  document.addEventListener("visibilitychange", () => {
    vizContainers.forEach(ctr => {
      const state = vizState.get(ctr);
      if (!state) return;
      if (document.hidden) { cancelAnimationFrame(state.frame); state.frame = 0; state.clockReset = true; }
      else if (state.draw) queueFrame(ctr, state.draw);
    });
  });
  prefersReducedMotion.addEventListener("change", event => {
    reducedMotion = event.matches;
    vizContainers.forEach(ctr => {
      const state = vizState.get(ctr);
      if (!state) return;
      if (state.updateButton && reducedMotion) state.paused = true;
      state.updateButton?.();
      paintStill(ctr);
    });
  });
  new MutationObserver(() => {
    vizContainers.forEach(ctr => {
      const canvas = ctr.querySelector("canvas");
      if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      paintStill(ctr);
    });
  }).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
})();
