(() => {
  const vizContainers = document.querySelectorAll("[data-viz]");
  if (!vizContainers.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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

    if (prefersReducedMotion.matches) return;

    if (state && !state.visible) {
      window.setTimeout(() => queueFrame(ctr, draw), 250);
      return;
    }

    window.requestAnimationFrame(draw);
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
      w = ctr.clientWidth; h = ctr.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    resizeHandlers.add(resize);
    return {
      ctx,
      W: () => w,
      H: () => h,
      cleanup: () => resizeHandlers.delete(resize),
    };
  }

  /* ═══════════════════════════════════════════════════
     HOMEPAGE — "identity": morphs between code brackets,
     a brain silhouette, and a circuit pattern
     ═══════════════════════════════════════════════════ */
  function identity(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const shapes = [
      // code brackets < / >
      (t) => {
        const pts = [];
        const steps = 30;
        for (let i = 0; i <= steps; i++) {
          const p = i / steps;
          pts.push({ x: 0.3 - Math.sin(p * Math.PI) * 0.12, y: 0.15 + p * 0.7 });
        }
        for (let i = 0; i <= steps; i++) {
          const p = i / steps;
          pts.push({ x: 0.7 + Math.sin(p * Math.PI) * 0.12, y: 0.15 + p * 0.7 });
        }
        for (let i = 0; i <= 10; i++) {
          const p = i / 10;
          pts.push({ x: 0.45 + p * 0.1, y: 0.3 + p * 0.4 });
        }
        return pts;
      },
      // brain outline
      (t) => {
        const pts = [];
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2;
          const r = 0.28 + Math.sin(a * 3) * 0.04 + Math.cos(a * 5) * 0.02;
          pts.push({ x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r * 0.85 });
        }
        for (let i = 0; i < 11; i++) {
          const p = i / 10;
          pts.push({ x: 0.5, y: 0.25 + p * 0.5 });
        }
        return pts;
      },
      // circuit nodes
      (t) => {
        const pts = [];
        const grid = 6;
        for (let i = 0; i < grid; i++) {
          for (let j = 0; j < grid; j++) {
            if ((i + j) % 2 === 0) {
              pts.push({ x: 0.2 + (i / (grid - 1)) * 0.6, y: 0.2 + (j / (grid - 1)) * 0.6 });
            }
          }
        }
        while (pts.length < 71) pts.push({ x: 0.5 + (Math.random() - 0.5) * 0.4, y: 0.5 + (Math.random() - 0.5) * 0.4 });
        return pts;
      }
    ];

    const count = 71;
    let particles = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), tx: 0.5, ty: 0.5
    }));
    let shapeIdx = 0, morphT = 0;
    let currentTargets = shapes[0]();
    let f = 0;

    function updateTargets() {
      shapeIdx = (shapeIdx + 1) % shapes.length;
      currentTargets = shapes[shapeIdx]();
      for (let i = 0; i < count; i++) {
        const t = currentTargets[i % currentTargets.length];
        particles[i].tx = t.x;
        particles[i].ty = t.y;
      }
    }
    updateTargets();

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.x += (p.tx - p.x) * 0.03;
        p.y += (p.ty - p.y) * 0.03;
        const px = p.x * w, py = p.y * h;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = c.hi + "0.5)";
        ctx.fill();
      });

      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = (particles[i].x - particles[j].x) * w;
          const dy = (particles[i].y - particles[j].y) * h;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 50) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x * w, particles[i].y * h);
            ctx.lineTo(particles[j].x * w, particles[j].y * h);
            ctx.strokeStyle = c.fg + (0.15 * (1 - d / 50)).toFixed(2) + ")";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      f++;
      if (f % 180 === 0) updateTargets();
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     BLOG LISTING — "quill": animated pen drawing flowing
     cursive lines that fade like handwritten text
     ═══════════════════════════════════════════════════ */
  function quill(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let lines = [];
    let penX, penY, penAngle = 0, lineIdx = 0;
    let f = 0;

    function startLine() {
      penX = 0.05;
      penY = 0.15 + (lineIdx % 5) * 0.17;
      penAngle = 0;
      lines.push({ points: [], age: 0, row: lineIdx });
      lineIdx++;
    }
    startLine();

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      const current = lines[lines.length - 1];
      if (current && penX < 0.95) {
        penAngle += (Math.random() - 0.5) * 0.3;
        penX += 0.004;
        penY += Math.sin(penAngle) * 0.003;
        const wordGap = Math.sin(f * 0.15) > 0.8;
        if (!wordGap) {
          current.points.push({ x: penX, y: penY });
        }
      } else if (current) {
        current.done = true;
        if (lineIdx < 20) startLine();
      }

      lines.forEach((line) => {
        if (line.done) line.age++;
        const fade = line.done ? Math.max(0, 1 - line.age / 120) : 1;
        if (fade <= 0) return;
        if (line.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(line.points[0].x * w, line.points[0].y * h);
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x * w, line.points[i].y * h);
        }
        ctx.strokeStyle = c.hi + (0.3 * fade).toFixed(2) + ")";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      lines = lines.filter((l) => !l.done || l.age < 120);
      if (lines.length === 0) { lineIdx = 0; startLine(); }

      const cl = lines[lines.length - 1];
      if (cl && cl.points.length > 0) {
        const last = cl.points[cl.points.length - 1];
        ctx.beginPath();
        ctx.arc(last.x * w, last.y * h, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = c.hi + "0.6)";
        ctx.fill();
      }

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     PROJECTS — "blueprint": circuit board being designed,
     components placed and wired on a grid
     ═══════════════════════════════════════════════════ */
  function blueprint(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const sp = 20;
    let wires = [];
    let components = [];
    let f = 0;

    function addWire() {
      const w2 = W(), h2 = H();
      const cols = Math.floor(w2 / sp), rows = Math.floor(h2 / sp);
      const sx = Math.floor(Math.random() * cols) * sp + sp / 2;
      const sy = Math.floor(Math.random() * rows) * sp + sp / 2;
      const segments = [];
      let cx = sx, cy = sy;
      const len = 3 + Math.floor(Math.random() * 6);
      for (let i = 0; i < len; i++) {
        const dir = Math.floor(Math.random() * 4);
        const dx = [sp, -sp, 0, 0][dir];
        const dy = [0, 0, sp, -sp][dir];
        cx += dx; cy += dy;
        cx = Math.max(sp, Math.min(w2 - sp, cx));
        cy = Math.max(sp, Math.min(h2 - sp, cy));
        segments.push({ x: cx, y: cy });
      }
      wires.push({ segments, progress: 0, age: 0 });
    }

    function addComponent() {
      const w2 = W(), h2 = H();
      const x = Math.floor(Math.random() * Math.floor(w2 / sp)) * sp + sp / 2;
      const y = Math.floor(Math.random() * Math.floor(h2 / sp)) * sp + sp / 2;
      const type = Math.floor(Math.random() * 3);
      components.push({ x, y, type, age: 0, maxAge: 200 + Math.random() * 200 });
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      const cols = Math.floor(w / sp) + 1, rows = Math.floor(h / sp) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          ctx.beginPath();
          ctx.arc(i * sp + sp / 2, j * sp + sp / 2, 0.5, 0, Math.PI * 2);
          ctx.fillStyle = c.fg + "0.08)";
          ctx.fill();
        }
      }

      wires.forEach((wire) => {
        wire.progress = Math.min(wire.segments.length, wire.progress + 0.05);
        if (wire.progress >= wire.segments.length) wire.age++;
        const fade = wire.age > 0 ? Math.max(0, 1 - wire.age / 100) : 1;
        if (fade <= 0) return;
        const drawN = Math.floor(wire.progress);
        if (drawN < 1) return;
        ctx.beginPath();
        ctx.moveTo(wire.segments[0].x, wire.segments[0].y);
        for (let i = 1; i < drawN; i++) {
          ctx.lineTo(wire.segments[i].x, wire.segments[i].y);
        }
        ctx.strokeStyle = c.hi + (0.3 * fade).toFixed(2) + ")";
        ctx.lineWidth = 1;
        ctx.stroke();

        for (let i = 0; i < drawN; i++) {
          ctx.beginPath();
          ctx.arc(wire.segments[i].x, wire.segments[i].y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = c.hi + (0.4 * fade).toFixed(2) + ")";
          ctx.fill();
        }
      });
      wires = wires.filter((w2) => w2.age < 100);

      components.forEach((comp) => {
        comp.age++;
        const fade = comp.age < 20 ? comp.age / 20 : comp.age > comp.maxAge - 30 ? (comp.maxAge - comp.age) / 30 : 1;
        if (fade <= 0) return;
        ctx.strokeStyle = c.ac + (0.3 * fade).toFixed(2) + ")";
        ctx.lineWidth = 0.8;
        if (comp.type === 0) { ctx.strokeRect(comp.x - 6, comp.y - 4, 12, 8); }
        else if (comp.type === 1) { ctx.beginPath(); ctx.arc(comp.x, comp.y, 5, 0, Math.PI * 2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(comp.x - 5, comp.y + 4); ctx.lineTo(comp.x, comp.y - 5); ctx.lineTo(comp.x + 5, comp.y + 4); ctx.closePath(); ctx.stroke(); }
      });
      components = components.filter((c2) => c2.age < c2.maxAge);

      if (f % 30 === 0) addWire();
      if (f % 50 === 0) addComponent();
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     RESEARCH LISTING — "dna": double helix unwinding,
     representing the structure of AI safety research
     ═══════════════════════════════════════════════════ */
  function dna(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const count = 20;

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      const cy = h / 2;

      for (let i = 0; i < count; i++) {
        const t = i / count;
        const x = w * 0.08 + t * w * 0.84;
        const phase = t * Math.PI * 4 + f * 0.02;
        const y1 = cy + Math.sin(phase) * (h * 0.3);
        const y2 = cy - Math.sin(phase) * (h * 0.3);
        const depth1 = Math.cos(phase) * 0.5 + 0.5;
        const depth2 = 1 - depth1;

        ctx.beginPath();
        ctx.moveTo(x, y1); ctx.lineTo(x, y2);
        ctx.strokeStyle = c.fg + "0.1)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y1, 2 + depth1 * 2, 0, Math.PI * 2);
        ctx.fillStyle = c.hi + (0.2 + depth1 * 0.4).toFixed(2) + ")";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y2, 2 + depth2 * 2, 0, Math.PI * 2);
        ctx.fillStyle = c.ac + (0.2 + depth2 * 0.4).toFixed(2) + ")";
        ctx.fill();
      }

      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const x = w * 0.08 + t * w * 0.84;
        const phase = t * Math.PI * 4 + f * 0.02;
        const y = cy + Math.sin(phase) * (h * 0.3);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = c.hi + "0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const x = w * 0.08 + t * w * 0.84;
        const phase = t * Math.PI * 4 + f * 0.02;
        const y = cy - Math.sin(phase) * (h * 0.3);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = c.ac + "0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     LEARNINGS — "tree": knowledge tree growing branches
     with leaves representing learned concepts
     ═══════════════════════════════════════════════════ */
  function tree(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let branches = [{ x: 0.5, y: 0.95, angle: -Math.PI / 2, len: 0.2, depth: 0, grown: 0 }];
    let leaves = [];
    let f = 0;

    function lineScale() {
      const h = H();
      return h < 112 ? Math.min(2.25, 96 / Math.max(h, 48)) : 1;
    }

    function grow() {
      const newBranches = [];
      branches.forEach((b) => {
        if (b.grown < 1) { b.grown = Math.min(1, b.grown + 0.02); return; }
        if (b.depth < 5 && !b.split) {
          b.split = true;
          const spread = 0.4 + Math.random() * 0.3;
          const shrink = 0.6 + Math.random() * 0.15;
          const ex = b.x + Math.cos(b.angle) * b.len;
          const ey = b.y + Math.sin(b.angle) * b.len;
          newBranches.push({ x: ex, y: ey, angle: b.angle - spread, len: b.len * shrink, depth: b.depth + 1, grown: 0 });
          newBranches.push({ x: ex, y: ey, angle: b.angle + spread, len: b.len * shrink, depth: b.depth + 1, grown: 0 });
          if (b.depth >= 3) {
            leaves.push({ x: ex, y: ey, r: 0, maxR: 2 + Math.random() * 2, phase: Math.random() * Math.PI * 2 });
          }
        }
      });
      branches.push(...newBranches);
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      const ls = lineScale();
      branches.forEach((b) => {
        const g = Math.min(1, b.grown);
        if (g <= 0) return;
        const ex = b.x + Math.cos(b.angle) * b.len * g;
        const ey = b.y + Math.sin(b.angle) * b.len * g;
        const thick = Math.max(0.85, (5 - b.depth) * 0.55 * ls);
        const alpha = Math.min(0.92, (0.22 + (5 - b.depth) * 0.08) * (ls > 1 ? 1.05 : 1));
        ctx.beginPath();
        ctx.moveTo(b.x * w, b.y * h);
        ctx.lineTo(ex * w, ey * h);
        ctx.strokeStyle = c.hi + alpha.toFixed(2) + ")";
        ctx.lineWidth = thick;
        ctx.stroke();
      });

      leaves.forEach((l) => {
        l.r = Math.min(l.maxR, l.r + 0.05);
        const pulse = Math.sin(f * 0.02 + l.phase) * 0.3;
        const lr = (l.r + pulse) * Math.min(1.35, ls);
        ctx.beginPath();
        ctx.arc(l.x * w, l.y * h, lr, 0, Math.PI * 2);
        ctx.fillStyle = c.ac + (ls > 1 ? "0.42)" : "0.3)");
        ctx.fill();
      });

      if (f % 8 === 0) grow();
      if (branches.length > 120) {
        branches = [{ x: 0.5, y: 0.95, angle: -Math.PI / 2, len: 0.2, depth: 0, grown: 0 }];
        leaves = [];
      }
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     AGI BLOG — "emergence": independent dots synchronize
     into a unified brain pattern (narrow → general AI)
     ═══════════════════════════════════════════════════ */
  function emergence(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const count = 60;
    let particles = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.003,
      vy: (Math.random() - 0.5) * 0.003,
      baseX: 0, baseY: 0
    }));
    let f = 0;

    const brainPts = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 0.22 + Math.sin(a * 3) * 0.04 + Math.cos(a * 7) * 0.02;
      brainPts.push({ x: 0.5 + Math.cos(a) * r, y: 0.48 + Math.sin(a) * r * 0.8 });
    }
    particles.forEach((p, i) => { p.baseX = brainPts[i].x; p.baseY = brainPts[i].y; });

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      const cycle = (f % 400) / 400;
      const coherence = cycle < 0.4 ? cycle / 0.4 : cycle < 0.6 ? 1 : cycle < 0.8 ? 1 - (cycle - 0.6) / 0.2 : 0;

      particles.forEach((p) => {
        const tx = p.baseX * coherence + (p.x + p.vx * 20) * (1 - coherence);
        const ty = p.baseY * coherence + (p.y + p.vy * 20) * (1 - coherence);
        p.x += (tx - p.x) * 0.05 + p.vx * (1 - coherence);
        p.y += (ty - p.y) * 0.05 + p.vy * (1 - coherence);
        if (p.x < 0.05 || p.x > 0.95) p.vx *= -1;
        if (p.y < 0.05 || p.y > 0.95) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 2 + coherence * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = c.hi + (0.3 + coherence * 0.3).toFixed(2) + ")";
        ctx.fill();
      });

      if (coherence > 0.3) {
        for (let i = 0; i < count; i++) {
          for (let j = i + 1; j < count; j++) {
            const dx = (particles[i].x - particles[j].x) * w;
            const dy = (particles[i].y - particles[j].y) * h;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 60 * coherence) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x * w, particles[i].y * h);
              ctx.lineTo(particles[j].x * w, particles[j].y * h);
              ctx.strokeStyle = c.fg + (0.08 * coherence).toFixed(3) + ")";
              ctx.lineWidth = 0.4;
              ctx.stroke();
            }
          }
        }
      }
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     DOSTOEVSKY — "manuscript": ink splatters and flowing
     text-like marks evoking 19th-century Russian writing
     ═══════════════════════════════════════════════════ */
  function manuscript(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let strokes = [];
    let splatters = [];
    let f = 0;

    function addStroke() {
      const row = Math.floor(Math.random() * 5);
      const y = 0.12 + row * 0.18;
      const startX = 0.05 + Math.random() * 0.15;
      const pts = [];
      let x = startX;
      for (let i = 0; i < 40 + Math.floor(Math.random() * 30); i++) {
        x += 0.008 + Math.random() * 0.005;
        if (x > 0.92) break;
        const wiggle = Math.sin(i * 0.5) * 0.008 + (Math.random() - 0.5) * 0.004;
        const ascender = Math.random() > 0.9 ? -0.03 : Math.random() > 0.9 ? 0.02 : 0;
        pts.push({ x, y: y + wiggle + ascender });
      }
      strokes.push({ pts, age: 0, maxAge: 300 + Math.random() * 200, thickness: 0.6 + Math.random() * 0.6 });
    }

    function addSplatter() {
      const x = 0.1 + Math.random() * 0.8;
      const y = 0.1 + Math.random() * 0.8;
      splatters.push({ x, y, r: 0, maxR: 3 + Math.random() * 4, age: 0 });
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      strokes.forEach((s) => {
        s.age++;
        const fade = s.age < 20 ? s.age / 20 : s.age > s.maxAge - 40 ? (s.maxAge - s.age) / 40 : 1;
        if (fade <= 0 || s.pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(s.pts[0].x * w, s.pts[0].y * h);
        for (let i = 1; i < s.pts.length; i++) {
          const prev = s.pts[i - 1], curr = s.pts[i];
          const mx = ((prev.x + curr.x) / 2) * w, my = ((prev.y + curr.y) / 2) * h;
          ctx.quadraticCurveTo(prev.x * w, prev.y * h, mx, my);
        }
        ctx.strokeStyle = c.hi + (0.25 * fade).toFixed(2) + ")";
        ctx.lineWidth = s.thickness;
        ctx.stroke();
      });
      strokes = strokes.filter((s) => s.age < s.maxAge);

      splatters.forEach((s) => {
        s.age++;
        s.r = Math.min(s.maxR, s.r + 0.15);
        const fade = s.age > 80 ? Math.max(0, 1 - (s.age - 80) / 60) : 1;
        if (fade <= 0) return;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fillStyle = c.hi + (0.15 * fade).toFixed(2) + ")";
        ctx.fill();
      });
      splatters = splatters.filter((s) => s.age < 140);

      if (f % 25 === 0) addStroke();
      if (f % 90 === 0) addSplatter();
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     IDEAS — "lightbulb": particles orbit chaotically then
     converge into a lightbulb shape — the moment of ideation
     ═══════════════════════════════════════════════════ */
  function lightbulb(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const count = 50;
    const bulbPts = [];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 1.6 + Math.PI * 0.7;
      bulbPts.push({ x: 0.5 + Math.cos(a) * 0.18, y: 0.38 + Math.sin(a) * 0.2 });
    }
    for (let i = 0; i < 8; i++) {
      const p = i / 7;
      bulbPts.push({ x: 0.44 + p * 0.12, y: 0.6 + Math.abs(p - 0.5) * 0.02 });
    }
    for (let i = 0; i < 6; i++) {
      const p = i / 5;
      bulbPts.push({ x: 0.45 + p * 0.1, y: 0.65 });
    }
    for (let i = 0; i < 6; i++) {
      const p = i / 5;
      bulbPts.push({ x: 0.46 + p * 0.08, y: 0.7 });
    }

    let particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.005,
      vy: (Math.random() - 0.5) * 0.005,
      tx: bulbPts[i % bulbPts.length].x,
      ty: bulbPts[i % bulbPts.length].y,
    }));
    let f = 0;

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      const cycle = (f % 300) / 300;
      const gather = cycle < 0.3 ? cycle / 0.3 : cycle < 0.65 ? 1 : cycle < 0.85 ? 1 - (cycle - 0.65) / 0.2 : 0;

      particles.forEach((p) => {
        p.x += p.vx * (1 - gather * 0.8) + (p.tx - p.x) * gather * 0.04;
        p.y += p.vy * (1 - gather * 0.8) + (p.ty - p.y) * gather * 0.04;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        p.x = Math.max(0, Math.min(1, p.x));
        p.y = Math.max(0, Math.min(1, p.y));

        const glow = gather > 0.8 ? (gather - 0.8) / 0.2 : 0;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 1.5 + glow * 2, 0, Math.PI * 2);
        ctx.fillStyle = c.hi + (0.3 + glow * 0.4).toFixed(2) + ")";
        ctx.fill();
      });

      if (gather > 0.7) {
        const glow = (gather - 0.7) / 0.3;
        ctx.beginPath();
        ctx.arc(0.5 * w, 0.42 * h, 30 + glow * 15, 0, Math.PI * 2);
        ctx.fillStyle = c.fg + (0.03 * glow).toFixed(3) + ")";
        ctx.fill();
      }

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     ARKHAM STUDIO — "compose": UI wireframes assembling,
     rectangles and elements placed on a design grid
     ═══════════════════════════════════════════════════ */
  function compose(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let elements = [];
    let f = 0;

    function addEl() {
      const types = ["rect", "circle", "line", "text"];
      const type = types[Math.floor(Math.random() * types.length)];
      const el = {
        type, x: 0.05 + Math.random() * 0.85, y: 0.05 + Math.random() * 0.85,
        w: 0.05 + Math.random() * 0.2, h: 0.03 + Math.random() * 0.15,
        age: 0, maxAge: 150 + Math.random() * 200, scale: 0,
      };
      elements.push(el);
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < w; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h);
        ctx.strokeStyle = c.fg + "0.03)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let j = 0; j < h; j += 40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j);
        ctx.strokeStyle = c.fg + "0.03)"; ctx.lineWidth = 0.5; ctx.stroke();
      }

      elements.forEach((el) => {
        el.age++;
        el.scale = el.age < 15 ? el.age / 15 : el.age > el.maxAge - 20 ? (el.maxAge - el.age) / 20 : 1;
        if (el.scale <= 0) return;
        const a = el.scale * 0.3;
        const px = el.x * w, py = el.y * h;

        if (el.type === "rect") {
          ctx.strokeStyle = c.hi + a.toFixed(2) + ")";
          ctx.lineWidth = 0.8;
          ctx.strokeRect(px, py, el.w * w * el.scale, el.h * h * el.scale);
        } else if (el.type === "circle") {
          ctx.beginPath();
          ctx.arc(px, py, Math.min(el.w, el.h) * w * 0.4 * el.scale, 0, Math.PI * 2);
          ctx.strokeStyle = c.ac + a.toFixed(2) + ")";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else if (el.type === "line") {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + el.w * w * el.scale, py);
          ctx.strokeStyle = c.fg + a.toFixed(2) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          for (let i = 0; i < 3; i++) {
            const lw = (0.3 + Math.random() * 0.5) * el.w * w * el.scale;
            ctx.fillStyle = c.fg + (a * 0.7).toFixed(2) + ")";
            ctx.fillRect(px, py + i * 8, lw, 3);
          }
        }
      });
      elements = elements.filter((el) => el.age < el.maxAge);

      if (f % 20 === 0 && elements.length < 12) addEl();
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     MARKET01 — "exchange": candlestick chart with live
     price bars rising/falling — GPU marketplace feel
     ═══════════════════════════════════════════════════ */
  function exchange(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let candles = Array.from({ length: 30 }, () => {
      const open = 0.3 + Math.random() * 0.4;
      const close = open + (Math.random() - 0.5) * 0.15;
      return { open, close, high: Math.max(open, close) + Math.random() * 0.05, low: Math.min(open, close) - Math.random() * 0.05 };
    });
    let maLine = [];
    let f = 0;

    function updateMA() {
      maLine = [];
      for (let i = 0; i < candles.length; i++) {
        let sum = 0, count = 0;
        for (let j = Math.max(0, i - 5); j <= i; j++) { sum += (candles[j].open + candles[j].close) / 2; count++; }
        maLine.push(sum / count);
      }
    }
    updateMA();

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 10, r: 10, t: 10, b: 10 };
      const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
      const barW = cw / candles.length * 0.7;
      const gap = cw / candles.length;

      candles.forEach((candle, i) => {
        const x = pad.l + i * gap + gap / 2;
        const bull = candle.close >= candle.open;
        const top = Math.max(candle.open, candle.close);
        const bot = Math.min(candle.open, candle.close);
        const bodyTop = pad.t + (1 - top) * ch;
        const bodyBot = pad.t + (1 - bot) * ch;
        const wickTop = pad.t + (1 - candle.high) * ch;
        const wickBot = pad.t + (1 - candle.low) * ch;

        ctx.beginPath();
        ctx.moveTo(x, wickTop); ctx.lineTo(x, wickBot);
        ctx.strokeStyle = c.fg + "0.2)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.fillStyle = bull ? c.hi + "0.25)" : c.ac + "0.2)";
        ctx.fillRect(x - barW / 2, bodyTop, barW, Math.max(1, bodyBot - bodyTop));
      });

      if (maLine.length > 1) {
        ctx.beginPath();
        maLine.forEach((v, i) => {
          const x = pad.l + i * gap + gap / 2;
          const y = pad.t + (1 - v) * ch;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = c.hi + "0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (f % 15 === 0) {
        const last = candles[candles.length - 1];
        const newOpen = last.close;
        const newClose = newOpen + (Math.random() - 0.5) * 0.08;
        candles.push({
          open: newOpen, close: newClose,
          high: Math.max(newOpen, newClose) + Math.random() * 0.03,
          low: Math.min(newOpen, newClose) - Math.random() * 0.03
        });
        candles.shift();
        updateMA();
      }
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     GOTHAM — "terminal": matrix-style data columns with
     a typing cursor — intelligence platform aesthetic
     ═══════════════════════════════════════════════════ */
  function terminal(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const chars = "01アイウエオカキクケコサシスセソ";
    let columns = [];
    let f = 0;

    function initCols() {
      const w = W();
      const colW = 14;
      const n = Math.floor(w / colW);
      columns = Array.from({ length: n }, () => ({
        y: Math.random() * -50, speed: 0.5 + Math.random() * 1.5, chars: []
      }));
    }
    initCols();

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.fillStyle = isDark() ? "rgba(12,10,9,0.1)" : "rgba(250,249,247,0.1)";
      ctx.fillRect(0, 0, w, h);

      ctx.font = "11px ui-monospace, monospace";
      const colW = 14;

      columns.forEach((col, i) => {
        col.y += col.speed;
        if (col.y > h + 20) { col.y = Math.random() * -30; }

        const x = i * colW + 2;
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = c.hi + "0.5)";
        ctx.fillText(ch, x, col.y);

        const trailLen = 12;
        for (let j = 1; j < trailLen; j++) {
          const ty = col.y - j * 13;
          if (ty < 0) break;
          const ta = 0.3 * (1 - j / trailLen);
          const tc = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillStyle = c.fg + ta.toFixed(2) + ")";
          ctx.fillText(tc, x, ty);
        }
      });

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     OPENX — "ecosystem": connected app circles exchanging
     data packets along lines — super-app visualization
     ═══════════════════════════════════════════════════ */
  function ecosystem(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const apps = [
      { x: 0.5, y: 0.5, r: 14, label: "Hub" },
      { x: 0.2, y: 0.25, r: 8 }, { x: 0.8, y: 0.25, r: 8 },
      { x: 0.15, y: 0.6, r: 8 }, { x: 0.85, y: 0.6, r: 8 },
      { x: 0.35, y: 0.82, r: 7 }, { x: 0.65, y: 0.82, r: 7 },
      { x: 0.35, y: 0.15, r: 6 }, { x: 0.65, y: 0.15, r: 6 },
    ];
    let packets = [];
    let f = 0;

    function sendPacket() {
      const from = Math.floor(Math.random() * apps.length);
      let to = Math.floor(Math.random() * apps.length);
      if (to === from) to = 0;
      packets.push({ from, to, t: 0 });
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      for (let i = 1; i < apps.length; i++) {
        ctx.beginPath();
        ctx.moveTo(apps[0].x * w, apps[0].y * h);
        ctx.lineTo(apps[i].x * w, apps[i].y * h);
        ctx.strokeStyle = c.fg + "0.08)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      apps.forEach((app, i) => {
        const pulse = Math.sin(f * 0.03 + i) * 0.2;
        ctx.beginPath();
        ctx.arc(app.x * w, app.y * h, app.r + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = c.hi + "0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(app.x * w, app.y * h, 2, 0, Math.PI * 2);
        ctx.fillStyle = c.hi + "0.4)";
        ctx.fill();
      });

      packets.forEach((p) => {
        p.t += 0.02;
        const a = apps[p.from], b = apps[p.to];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        ctx.beginPath();
        ctx.arc(x * w, y * h, 2, 0, Math.PI * 2);
        ctx.fillStyle = c.ac + "0.5)";
        ctx.fill();
      });
      packets = packets.filter((p) => p.t < 1);

      if (f % 12 === 0) sendPacket();
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     ALIGNMENT FAKING — "mask": ordered grid vs chaotic
     formation alternating — duality of compliant/deceptive
     ═══════════════════════════════════════════════════ */
  function mask(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const count = 48;
    let particles = [];
    let f = 0;

    function makeGrid() {
      const pts = [];
      const cols = 8, rows = 6;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        pts.push({ x: 0.15 + (i / (cols - 1)) * 0.7, y: 0.15 + (j / (rows - 1)) * 0.7 });
      }
      return pts;
    }
    function makeChaos() {
      return Array.from({ length: count }, () => ({
        x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8
      }));
    }

    const gridPts = makeGrid();
    let chaosPts = makeChaos();
    particles = Array.from({ length: count }, (_, i) => ({
      x: gridPts[i % gridPts.length].x, y: gridPts[i % gridPts.length].y,
      tx: gridPts[i % gridPts.length].x, ty: gridPts[i % gridPts.length].y,
    }));

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      const cycle = (f % 240) / 240;
      const isOrdered = cycle < 0.45 || cycle > 0.9;

      if (f % 240 === 0) {
        const g = makeGrid();
        particles.forEach((p, i) => { p.tx = g[i % g.length].x; p.ty = g[i % g.length].y; });
      }
      if (f % 240 === 108) {
        chaosPts = makeChaos();
        particles.forEach((p, i) => { p.tx = chaosPts[i].x; p.ty = chaosPts[i].y; });
      }

      particles.forEach((p) => {
        p.x += (p.tx - p.x) * 0.04;
        p.y += (p.ty - p.y) * 0.04;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 2, 0, Math.PI * 2);
        ctx.fillStyle = isOrdered ? c.hi + "0.4)" : c.ac + "0.35)";
        ctx.fill();
      });

      ctx.fillStyle = c.fg + "0.35)";
      ctx.font = "9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(isOrdered ? "compliant" : "deceptive", w / 2, h - 8);

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     MULTILINGUAL — "diverge": two identical streams that
     split — English stays safe, Hindi becomes porous
     ═══════════════════════════════════════════════════ */
  function diverge(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const count = 20;
    let pairsEn = [], pairsHi = [];

    function reset() {
      pairsEn = []; pairsHi = [];
      for (let i = 0; i < count; i++) {
        const y = 0.1 + (i / (count - 1)) * 0.8;
        pairsEn.push({ x: 0.5, y, tx: 0.25, ty: y, blocked: false });
        pairsHi.push({ x: 0.5, y, tx: 0.75, ty: y, blocked: false });
      }
    }
    reset();

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      const phase = (f % 200) / 200;
      const split = Math.min(1, phase * 3);
      const midX = w / 2;

      ctx.beginPath();
      ctx.moveTo(midX, 0); ctx.lineTo(midX, h);
      ctx.strokeStyle = c.fg + "0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(midX * 0.5, 0); ctx.lineTo(midX * 0.5, h);
      ctx.strokeStyle = c.hi + (0.15 * split).toFixed(2) + ")";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(midX * 1.5, 0); ctx.lineTo(midX * 1.5, h);
      ctx.strokeStyle = c.fg + (0.12 * split).toFixed(2) + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      pairsEn.forEach((p) => {
        p.x += (p.tx * split + 0.5 * (1 - split) - p.x) * 0.05;
        const blocked = p.ty > 0.5;
        const px = p.x * w, py = p.ty * h;
        ctx.beginPath();
        ctx.arc(px, py, blocked ? 1.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = blocked ? c.fg + "0.15)" : c.hi + "0.4)";
        ctx.fill();
      });

      pairsHi.forEach((p, i) => {
        p.x += (p.tx * split + 0.5 * (1 - split) - p.x) * 0.05;
        const dangerous = p.ty > 0.5;
        const leaked = dangerous && i % 3 !== 0;
        const px = p.x * w, py = p.ty * h;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = leaked ? c.ac + "0.45)" : c.hi + "0.35)";
        ctx.fill();
      });

      ctx.fillStyle = c.fg + "0.3)";
      ctx.font = "9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("English", midX * 0.5, h - 5);
      ctx.fillText("Hindi", midX * 1.5, h - 5);

      if (f % 200 === 0) reset();
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     PROMPT INJECTION — "inject": ordered instruction rows
     disrupted by rogue particles breaking the formation
     ═══════════════════════════════════════════════════ */
  function inject(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const rows = 5, cols = 16;
    let grid = [];
    let rogues = [];

    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      grid.push({
        bx: 0.06 + (i / (cols - 1)) * 0.88,
        by: 0.15 + (j / (rows - 1)) * 0.7,
        x: 0.06 + (i / (cols - 1)) * 0.88,
        y: 0.15 + (j / (rows - 1)) * 0.7,
        displaced: 0,
      });
    }

    function spawnRogue() {
      rogues.push({
        x: Math.random() > 0.5 ? -0.05 : 1.05,
        y: 0.1 + Math.random() * 0.8,
        tx: 0.1 + Math.random() * 0.8,
        ty: 0.15 + Math.floor(Math.random() * rows) / (rows - 1) * 0.7,
        age: 0,
      });
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      rogues.forEach((r) => {
        r.age++;
        r.x += (r.tx - r.x) * 0.04;
        r.y += (r.ty - r.y) * 0.04;

        grid.forEach((g) => {
          const dx = g.bx - r.x, dy = g.by - r.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 0.08 && r.age > 20) {
            g.displaced = Math.min(1, g.displaced + 0.03);
            g.x = g.bx + (Math.random() - 0.5) * 0.04 * g.displaced;
            g.y = g.by + (Math.random() - 0.5) * 0.04 * g.displaced;
          }
        });

        ctx.beginPath();
        ctx.arc(r.x * w, r.y * h, 3, 0, Math.PI * 2);
        ctx.fillStyle = c.ac + "0.6)";
        ctx.fill();
      });
      rogues = rogues.filter((r) => r.age < 200);

      grid.forEach((g) => {
        g.displaced *= 0.995;
        g.x += (g.bx - g.x) * 0.01;
        g.y += (g.by - g.y) * 0.01;
        ctx.beginPath();
        ctx.arc(g.x * w, g.y * h, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = g.displaced > 0.3 ? c.ac + "0.4)" : c.hi + "0.3)";
        ctx.fill();
      });

      if (f % 60 === 0) spawnRogue();
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     LONG-HORIZON — "erosion": a wall of dots that gradually
     crumbles under sustained pressure, turn by turn
     ═══════════════════════════════════════════════════ */
  function erosion(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const wallCols = 6, wallRows = 10;
    let wall = [];

    function resetWall() {
      wall = [];
      for (let i = 0; i < wallCols; i++) for (let j = 0; j < wallRows; j++) {
        wall.push({
          x: 0.52 + (i / (wallCols - 1)) * 0.12,
          y: 0.1 + (j / (wallRows - 1)) * 0.8,
          hp: 1, ox: 0, oy: 0,
        });
      }
    }
    resetWall();

    let waves = [];

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = c.fg + "0.25)";
      ctx.font = "8px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Pressure →", 8, h / 2 + 3);

      waves.forEach((wave) => {
        wave.x += 0.005;
        wave.age++;
        const fade = Math.max(0, 1 - wave.age / 100);
        for (let i = 0; i < 5; i++) {
          const y = wave.y + (i - 2) * 0.06;
          ctx.beginPath();
          ctx.arc(wave.x * w, y * h, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = c.ac + (0.3 * fade).toFixed(2) + ")";
          ctx.fill();
        }

        wall.forEach((brick) => {
          const dx = brick.x - wave.x, dy = brick.y - wave.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 0.1 && brick.hp > 0) {
            brick.hp -= 0.008;
            brick.ox += (Math.random() - 0.3) * 0.003;
            brick.oy += (Math.random() - 0.5) * 0.002;
          }
        });
      });
      waves = waves.filter((w2) => w2.age < 100);

      wall.forEach((brick) => {
        if (brick.hp <= 0) return;
        const px = (brick.x + brick.ox) * w;
        const py = (brick.y + brick.oy) * h;
        ctx.beginPath();
        ctx.arc(px, py, 2.5 * brick.hp, 0, Math.PI * 2);
        ctx.fillStyle = c.hi + (0.4 * brick.hp).toFixed(2) + ")";
        ctx.fill();
      });

      if (f % 35 === 0) waves.push({ x: 0.1, y: 0.2 + Math.random() * 0.6, age: 0 });
      if (wall.every((b) => b.hp <= 0)) resetWall();
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     MECH. INTERPRETABILITY — "dissect": neural layers
     peeling apart to reveal connections between them
     ═══════════════════════════════════════════════════ */
  function dissect(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const layerCount = 6, neuronsPerLayer = 10;

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      const pad = 30;
      const layerGap = (w - pad * 2) / (layerCount - 1);
      const breathe = Math.sin(f * 0.01) * 0.3;

      for (let l = 0; l < layerCount; l++) {
        const lx = pad + l * layerGap;
        const spread = 1 + breathe * (l - layerCount / 2) * 0.15;
        const offsetX = (l - layerCount / 2) * breathe * 15;

        for (let n = 0; n < neuronsPerLayer; n++) {
          const ny = pad + (n / (neuronsPerLayer - 1)) * (h - pad * 2);
          const px = lx + offsetX;
          const activation = Math.sin(f * 0.025 + l * 1.5 + n * 0.7) * 0.5 + 0.5;
          const r = 1.5 + activation * 2;

          ctx.beginPath();
          ctx.arc(px, ny, r, 0, Math.PI * 2);
          ctx.fillStyle = (activation > 0.6 ? c.hi : c.fg) + (0.15 + activation * 0.4).toFixed(2) + ")";
          ctx.fill();

          if (l < layerCount - 1) {
            const nx = pad + (l + 1) * layerGap + ((l + 1) - layerCount / 2) * breathe * 15;
            for (let m = 0; m < neuronsPerLayer; m += 3) {
              const my = pad + (m / (neuronsPerLayer - 1)) * (h - pad * 2);
              const weight = Math.sin(f * 0.02 + l + n * 0.3 + m * 0.5) * 0.5 + 0.5;
              if (weight > 0.4) {
                ctx.beginPath();
                ctx.moveTo(px, ny); ctx.lineTo(nx, my);
                ctx.strokeStyle = c.fg + (0.03 + weight * 0.06).toFixed(3) + ")";
                ctx.lineWidth = 0.3;
                ctx.stroke();
              }
            }
          }
        }
      }
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     404 — "gridwalk": RL agent navigating a grid
     ═══════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════
     ASCII RL — "ascii-rl": A minimalist grid of characters
     representing Q-values or neural activations in an RL state space.
     ═══════════════════════════════════════════════════ */
  function asciiRl(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    
    const charW = window.matchMedia("(max-width: 640px)").matches ? 12 : 16; 
    const charH = charW * 1.25;
    const chars = " ·-~+=*#%@"; 
    
    let grid = [];
    let cols = 0, rows = 0;
    let agent = { x: 0, y: 0 };
    
    function initGrid() {
      const w = W(), h = H();
      cols = Math.max(1, Math.floor(w / charW));
      rows = Math.max(1, Math.floor(h / charH));
      grid = Array.from({ length: cols }, () => new Float32Array(rows).fill(0));
      agent.x = Math.floor(cols / 2);
      agent.y = Math.floor(rows / 2);
    }
    
    initGrid();

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      
      const newCols = Math.max(1, Math.floor(w / charW));
      const newRows = Math.max(1, Math.floor(h / charH));
      if (newCols !== cols || newRows !== rows) {
        initGrid();
      }

      ctx.font = `${charW}px var(--font-mono, "Courier New", monospace)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (f % 4 === 0) {
        agent.x += Math.floor(Math.random() * 3) - 1;
        agent.y += Math.floor(Math.random() * 3) - 1;
        agent.x = Math.max(0, Math.min(cols - 1, agent.x));
        agent.y = Math.max(0, Math.min(rows - 1, agent.y));
        grid[agent.x][agent.y] = 1.5; 
      }

      if (f % 2 === 0) {
          let nextGrid = Array.from({ length: cols }, () => new Float32Array(rows).fill(0));
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              let sum = grid[i][j], count = 1;
              if (i > 0) { sum += grid[i-1][j]; count++; }
              if (i < cols-1) { sum += grid[i+1][j]; count++; }
              if (j > 0) { sum += grid[i][j-1]; count++; }
              if (j < rows-1) { sum += grid[i][j+1]; count++; }
              nextGrid[i][j] = (sum / count) * 0.94; 
            }
          }
          grid = nextGrid;
      }

      const offsetX = (w - cols * charW) / 2 + charW / 2;
      const offsetY = (h - rows * charH) / 2 + charH / 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const val = Math.max(0, Math.min(1, grid[i][j]));
          if (val < 0.05) continue; 

          const charIdx = Math.floor(val * (chars.length - 1));
          const char = chars[tempIdx = Math.max(0, Math.min(chars.length - 1, charIdx))];
          
          const x = offsetX + i * charW;
          const y = offsetY + j * charH;
          
          ctx.fillStyle = c.fg + (0.2 + val * 0.6).toFixed(2) + ")";
          ctx.fillText(char, x, y);
        }
      }
      
      ctx.fillStyle = c.hi + "0.9)";
      ctx.fillText("A", offsetX + agent.x * charW, offsetY + agent.y * charH);

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══ CHART RENDERERS (kept from before) ═══ */

  function chartBars(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const data = [
      { label: "DeepSeek\nPilot Free", value: 18, group: 0 }, { label: "DeepSeek\nPilot Paid", value: 11.5, group: 0 },
      { label: "DeepSeek\nReplic. Free", value: 1, group: 1 }, { label: "DeepSeek\nReplic. Paid", value: 1.25, group: 1 },
      { label: "Qwen\nPilot Free", value: 54, group: 2 }, { label: "Qwen\nPilot Paid", value: 56, group: 2 },
      { label: "Qwen\nReplic. Free", value: 5.75, group: 3 }, { label: "Qwen\nReplic. Paid", value: 5.5, group: 3 },
    ];
    const maxVal = 60;
    (function draw() {
      const w = W(), h = H(), c = C(); ctx.clearRect(0, 0, w, h);
      const pad = { top: 30, bottom: 50, left: 50, right: 20 };
      const cw2 = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
      const barW = cw2 / data.length * 0.6, gap = cw2 / data.length;
      const anim = Math.min(1, f / 60);
      ctx.fillStyle = c.fg + "0.5)"; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) { const val = (maxVal / 4) * i; const y = pad.top + ch - (val / maxVal) * ch; ctx.fillText(val + "%", pad.left - 8, y + 3); ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.strokeStyle = c.fg + "0.08)"; ctx.lineWidth = 0.5; ctx.stroke(); }
      ctx.textAlign = "center"; ctx.font = "9px system-ui, sans-serif";
      const gc = [c.hi + "0.45)", c.fg + "0.3)", c.hi + "0.45)", c.fg + "0.3)"];
      data.forEach((d, i) => { const x = pad.left + i * gap + gap / 2 - barW / 2; const bH = (d.value / maxVal) * ch * anim; const y = pad.top + ch - bH; ctx.fillStyle = gc[d.group]; ctx.fillRect(x, y, barW, bH); ctx.fillStyle = c.fg + "0.5)"; d.label.split("\n").forEach((l, li) => { ctx.fillText(l, x + barW / 2, pad.top + ch + 14 + li * 11); }); });
      ctx.fillStyle = c.hi + "0.6)"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Refusal Rates: Pilot vs Replication", pad.left, 18);
      if (f < 60) f++; queueFrame(ctr, draw);
    })();
  }

  function chartFlip(ctr) {
    const { ctx, W, H } = initCanvas(ctr); let f = 0;
    (function draw() {
      const w = W(), h = H(), c = C(); ctx.clearRect(0, 0, w, h);
      const pad = { top: 30, bottom: 40, left: 50, right: 20 }; const ch2 = h - pad.top - pad.bottom; const cw2 = w - pad.left - pad.right; const anim = Math.min(1, f / 50);
      ctx.fillStyle = c.hi + "0.6)"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Prompt-Level Decision Flip Rates", pad.left, 18);
      [{ label: "Pilot (~14%)", value: 14, max: 16 }, { label: "Replication (~2%)", value: 2, max: 16 }].forEach((b, i) => {
        const y = pad.top + 10 + i * 50; const bw = (b.value / b.max) * cw2 * anim;
        ctx.fillStyle = c.fg + "0.06)"; ctx.fillRect(pad.left, y, cw2, 30);
        ctx.fillStyle = i === 0 ? c.hi + "0.4)" : c.ac + "0.3)"; ctx.fillRect(pad.left, y, bw, 30);
        ctx.fillStyle = c.hi + "0.7)"; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText(b.value + "%", pad.left + bw + 8, y + 20);
        ctx.fillStyle = c.fg + "0.5)"; ctx.font = "10px system-ui, sans-serif"; ctx.fillText(b.label, pad.left, y + 43);
      });
      if (f < 50) f++; queueFrame(ctr, draw);
    })();
  }

  function chartBoundary(ctr) {
    const { ctx, W, H } = initCanvas(ctr); let f = 0;
    (function draw() {
      const w = W(), h = H(), c = C(); ctx.clearRect(0, 0, w, h);
      const pad = 30; const boxW = (w - pad * 3) / 2; const boxH = h - pad * 2 - 20;
      ctx.fillStyle = c.hi + "0.6)"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Cross-Lingual Safety Boundary", pad, 18);
      ["English Latent Space", "Hindi Latent Space"].forEach((label, idx) => {
        const x = pad + idx * (boxW + pad); const y = pad + 10;
        ctx.strokeStyle = c.fg + "0.15)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, boxW, boxH);
        ctx.fillStyle = c.fg + "0.5)"; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + boxW / 2, y + boxH + 14);
        const midY = y + boxH / 2;
        ctx.beginPath();
        if (idx === 0) { ctx.setLineDash([]); ctx.moveTo(x + 10, midY); ctx.lineTo(x + boxW - 10, midY); ctx.strokeStyle = c.hi + "0.5)"; ctx.lineWidth = 2; }
        else { ctx.setLineDash([4, 4]); for (let px2 = x + 10; px2 < x + boxW - 10; px2 += 1) { const wv = Math.sin(px2 * 0.08 + f * 0.03) * 8; if (px2 === x + 10) ctx.moveTo(px2, midY + wv); else ctx.lineTo(px2, midY + wv); } ctx.strokeStyle = c.fg + "0.3)"; ctx.lineWidth = 1.5; }
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.fg + "0.35)"; ctx.font = "9px system-ui, sans-serif"; ctx.fillText("Safe", x + boxW / 2, y + 18); ctx.fillText("Unsafe", x + boxW / 2, y + boxH - 8);
        const seed = idx * 100;
        for (let i = 0; i < 12; i++) { const px2 = x + 15 + ((seed + i * 37) % (boxW - 30)); const py2 = y + 12 + ((seed + i * 53) % (boxH - 24)); ctx.beginPath(); ctx.arc(px2, py2, 2, 0, Math.PI * 2); ctx.fillStyle = py2 < midY ? c.ac + "0.4)" : c.hi + "0.35)"; ctx.fill(); }
      });
      f++; queueFrame(ctr, draw);
    })();
  }

  function chartFlow(ctr) {
    const { ctx, W, H } = initCanvas(ctr); let f = 0;
    const steps = ["System\nInstructions", "User Task\nDefinition", "Untrusted\nContent", "Instruction-Like\nLanguage", "Authority\nMisclass.", "Behavioral\nOverride"];
    (function draw() {
      const w = W(), h = H(), c = C(); ctx.clearRect(0, 0, w, h);
      const pad = 20; const boxW = 85; const cy = h / 2; const totalW = steps.length * boxW + (steps.length - 1) * 16;
      const startX = Math.max(pad, (w - totalW) / 2); const anim = Math.min(1, f / 80);
      ctx.fillStyle = c.hi + "0.6)"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Instruction Authority Confusion Flow", pad, 16);
      steps.forEach((step, i) => {
        const progress = Math.min(1, anim * steps.length - i); if (progress <= 0) return;
        const alpha = Math.min(1, progress); const x = startX + i * (boxW + 16); const y2 = cy - 18;
        ctx.strokeStyle = c.fg + (0.2 * alpha).toFixed(2) + ")"; ctx.lineWidth = 1; ctx.strokeRect(x, y2, boxW, 36);
        ctx.fillStyle = c.fg + (0.5 * alpha).toFixed(2) + ")"; ctx.font = "9px system-ui, sans-serif"; ctx.textAlign = "center";
        step.split("\n").forEach((l, li) => { ctx.fillText(l, x + boxW / 2, y2 + 18 + (li - 0.5) * 12); });
        if (i < steps.length - 1 && progress > 0.3) { ctx.beginPath(); ctx.moveTo(x + boxW + 3, cy); ctx.lineTo(x + boxW + 11, cy); ctx.strokeStyle = c.hi + (0.3 * alpha).toFixed(2) + ")"; ctx.lineWidth = 1; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + boxW + 11, cy); ctx.lineTo(x + boxW + 7, cy - 3); ctx.lineTo(x + boxW + 7, cy + 3); ctx.fillStyle = c.hi + (0.3 * alpha).toFixed(2) + ")"; ctx.fill(); }
      });
      if (f < 80) f++; queueFrame(ctr, draw);
    })();
  }

  function chartDecay(ctr) {
    const { ctx, W, H } = initCanvas(ctr); let f = 0;
    const points = [{ turn: 1, safety: 95, label: "Benign\nContext" }, { turn: 5, safety: 85 }, { turn: 8, safety: 75, label: "Boundary\nReasoning" }, { turn: 12, safety: 55 }, { turn: 15, safety: 40, label: "Hypothetical\nFraming" }, { turn: 20, safety: 28 }, { turn: 25, safety: 20, label: "Partial\nCompliance" }, { turn: 30, safety: 15 }];
    (function draw() {
      const w = W(), h = H(), c = C(); ctx.clearRect(0, 0, w, h);
      const pad = { top: 30, bottom: 35, left: 50, right: 20 }; const cw2 = w - pad.left - pad.right; const ch2 = h - pad.top - pad.bottom; const anim = Math.min(1, f / 60);
      ctx.fillStyle = c.hi + "0.6)"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Safety Constraint Decay Over Conversation Turns", pad.left, 18);
      ctx.fillStyle = c.fg + "0.4)"; ctx.font = "9px system-ui, sans-serif"; ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) { const v = i * 25; const y = pad.top + ch2 - (v / 100) * ch2; ctx.fillText(v + "%", pad.left - 6, y + 3); ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.strokeStyle = c.fg + "0.06)"; ctx.lineWidth = 0.5; ctx.stroke(); }
      const xS = (t) => pad.left + ((t - 1) / 29) * cw2; const yS = (s) => pad.top + ch2 - (s / 100) * ch2;
      ctx.beginPath(); const drawN = Math.ceil(points.length * anim);
      for (let i = 0; i < drawN; i++) { const p = points[i]; if (i === 0) ctx.moveTo(xS(p.turn), yS(p.safety)); else ctx.lineTo(xS(p.turn), yS(p.safety)); }
      ctx.strokeStyle = c.hi + "0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
      for (let i = 0; i < drawN; i++) { const p = points[i]; ctx.beginPath(); ctx.arc(xS(p.turn), yS(p.safety), 3, 0, Math.PI * 2); ctx.fillStyle = c.hi + "0.5)"; ctx.fill(); if (p.label) { ctx.fillStyle = c.fg + "0.45)"; ctx.font = "8px system-ui, sans-serif"; ctx.textAlign = "center"; p.label.split("\n").forEach((l, li) => { ctx.fillText(l, xS(p.turn), yS(p.safety) + 14 + li * 10); }); } }
      ctx.textAlign = "center"; ctx.fillStyle = c.fg + "0.4)"; ctx.font = "9px system-ui, sans-serif"; ctx.fillText("Conversational Turns →", pad.left + cw2 / 2, h - 8);
      if (f < 60) f++; queueFrame(ctr, draw);
    })();
  }

  function chartLayers(ctr) {
    const { ctx, W, H } = initCanvas(ctr); let f = 0;
    const lC = 8, nC = 24;
    let act = Array.from({ length: lC }, () => Array.from({ length: nC }, () => Math.random()));
    (function draw() {
      const w = W(), h = H(), c = C(); ctx.clearRect(0, 0, w, h);
      const pad = { top: 30, bottom: 20, left: 60, right: 20 }; const cw2 = w - pad.left - pad.right; const ch2 = h - pad.top - pad.bottom; const rowH = ch2 / lC; const dotSp = Math.min(cw2 / nC, 16);
      ctx.fillStyle = c.hi + "0.6)"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Layer Activation Patterns", pad.left, 18);
      for (let l = 0; l < lC; l++) { const y = pad.top + l * rowH + rowH / 2; ctx.fillStyle = c.fg + "0.4)"; ctx.font = "9px system-ui, sans-serif"; ctx.textAlign = "right"; ctx.fillText("L" + (l + 1), pad.left - 8, y + 3);
        for (let n = 0; n < nC; n++) { const x = pad.left + n * dotSp + dotSp / 2; act[l][n] += (Math.random() - 0.5) * 0.02; act[l][n] = Math.max(0, Math.min(1, act[l][n])); const v = act[l][n]; ctx.beginPath(); ctx.arc(x, y, 1 + v * 3, 0, Math.PI * 2); ctx.fillStyle = (v > 0.6 ? c.hi : c.fg) + (0.05 + v * 0.5).toFixed(2) + ")"; ctx.fill(); }
      }
      f++; queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     LATENT FIELD — "latentField": An ASCII vector field
     flowing like fluid, representing gradient descent paths
     ═══════════════════════════════════════════════════ */
  function latentField(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const chars = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
    const charW = window.matchMedia("(max-width: 640px)").matches ? 14 : 18;
    const charH = charW + 2;

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      
      const cols = Math.floor(w / charW) + 2;
      const rows = Math.floor(h / charH) + 2;
      const ox = (w - (cols - 1) * charW) / 2;
      const oy = (h - (rows - 1) * charH) / 2;

      ctx.font = `11px var(--font-mono, "Courier New", monospace)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const nx = i * 0.15;
          const ny = j * 0.15;
          const noise = Math.sin(nx + f * 0.01) * Math.cos(ny + f * 0.015) + Math.sin(nx * 0.5 - ny * 0.5 + f * 0.005);
          
          let angle = (noise + 2) * Math.PI; 
          let idx = Math.floor(((angle / (Math.PI * 2)) % 1) * chars.length);
          if (idx < 0) idx += chars.length;

          const intensity = Math.abs(noise);
          if (intensity < 0.2) continue; 
          
          const val = Math.min(1, (intensity - 0.2) * 1.5);
          
          ctx.fillStyle = c.hi + (0.1 + val * 0.6).toFixed(2) + ")";
          const x = ox + i * charW;
          const y = oy + j * charH;
          
          ctx.save();
          ctx.translate(x, y);
          ctx.fillText(chars[idx], 0, 0);
          ctx.restore();
        }
      }
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     NEURAL TOPOLOGY — "neuralTopo": Rotating 3D neural 
     representation made entirely out of minimalist text
     ═══════════════════════════════════════════════════ */
  function neuralTopo(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const nodes = [];
    const N = 50;
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      nodes.push({ x: Math.cos(theta) * Math.sin(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(phi) });
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      
      const cy = h / 2, cx = w / 2;
      const radius = Math.min(w, h) * 0.35;
      const rotY = f * 0.005;
      const rotX = Math.sin(f * 0.002) * 0.5;

      const proj = [];
      nodes.forEach((n) => {
        const y1 = n.y * Math.cos(rotX) - n.z * Math.sin(rotX);
        const z1 = n.y * Math.sin(rotX) + n.z * Math.cos(rotX);
        const x2 = n.x * Math.cos(rotY) + z1 * Math.sin(rotY);
        const z2 = -n.x * Math.sin(rotY) + z1 * Math.cos(rotY);
        proj.push({ x: x2, y: y1, z: z2 });
      });

      ctx.font = `14px var(--font-mono, monospace)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = proj[i].x - proj[j].x, dy = proj[i].y - proj[j].y, dz = proj[i].z - proj[j].z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          if (dist < 0.65) {
            const zAvg = (proj[i].z + proj[j].z) / 2;
            if (zAvg < -0.2) continue; 
            ctx.beginPath();
            ctx.moveTo(cx + proj[i].x * radius, cy + proj[i].y * radius);
            ctx.lineTo(cx + proj[j].x * radius, cy + proj[j].y * radius);
            ctx.strokeStyle = c.fg + "0.12)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      proj.forEach((p, i) => {
        const depth = (p.z + 1) / 2; 
        const char = i % 3 === 0 ? "+" : (i % 2 === 0 ? "o" : "·");
        ctx.fillStyle = c.hi + (0.1 + depth * 0.8).toFixed(2) + ")";
        ctx.fillText(char, cx + p.x * radius, cy + p.y * radius);
      });
      f++; queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     STRANGE ATTRACTOR — "attractor": Math chaos plotted 
     as billions of thin overlapping arcs over time
     ═══════════════════════════════════════════════════ */
  function attractor(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let x = 0.1, y = 0.1;
    const a = -1.4, b = 1.6, c1 = 1.0, d = 0.7;
    // Pre-calculate background colors to avoid isDark logic in hot loop
    
    (function draw() {
      const w = W(), h = H(), c = C();
      if (document.documentElement.getAttribute("data-theme") === "dark") {
         ctx.fillStyle = "rgba(12,10,9,0.03)";
      } else {
         ctx.fillStyle = "rgba(250,250,249,0.03)";
      }
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2;
      const scale = Math.min(w, h) * 0.22;
      
      ctx.fillStyle = c.hi + "0.3)";
      for(let i=0; i<800; i++) {
        const nx = Math.sin(a * y) + c1 * Math.cos(a * x);
        const ny = Math.sin(b * x) + d * Math.cos(b * y);
        x = nx; y = ny;
        ctx.fillRect(cx + x * scale, cy + y * scale, 0.8, 0.8);
      }
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     THOUGHT STREAM — "thoughtStream": A beautiful braided
     river of particles representing the flow of thought 
     and the writing process, merging and diverging constantly.
     ═══════════════════════════════════════════════════ */
  function thoughtStream(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const paths = Array.from({ length: 6 }, (_, i) => ({
      yBase: 0.2 + (i / 5) * 0.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.005 + Math.random() * 0.005,
      particles: [],
    }));

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      paths.forEach((path) => {
        path.phase += path.speed;
        if (f % 4 === 0) {
          path.particles.push({ x: -0.05, age: 0 });
        }
        
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const t = i / 100;
          const x = t;
          const yOffset = Math.sin(t * Math.PI * 4 + path.phase) * 0.15;
          const mergePull = Math.sin(t * Math.PI + f * 0.01) * 0.1;
          const y = path.yBase + yOffset * (1 - Math.abs(mergePull));
          if (i === 0) ctx.moveTo(x * w, y * h);
          else ctx.lineTo(x * w, y * h);
        }
        ctx.strokeStyle = c.fg + "0.1)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        path.particles.forEach((p) => {
          p.x += 0.004;
          p.age++;
          const yOffset = Math.sin(p.x * Math.PI * 4 + path.phase) * 0.15;
          const mergePull = Math.sin(p.x * Math.PI + f * 0.01) * 0.1;
          const y = path.yBase + yOffset * (1 - Math.abs(mergePull));
          
          const fade = Math.min(1, p.x * 5) * Math.max(0, 1 - (p.x - 0.8) * 5);
          
          ctx.beginPath();
          ctx.arc(p.x * w, y * h, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = c.hi + (fade * 0.5).toFixed(2) + ")";
          ctx.fill();
        });
        path.particles = path.particles.filter(p => p.x < 1.05);
      });

      for (let i = 0; i < paths.length; i++) {
        for (let j = i + 1; j < paths.length; j++) {
          const pathA = paths[i], pathB = paths[j];
          for (let pi = 0; Math.min(pathA.particles.length, pathB.particles.length) > pi; pi += 5) {
            const pA = pathA.particles[pi];
            const pB = pathB.particles[pi];
            if (!pA || !pB) continue;
            
            const dx = Math.abs(pA.x - pB.x);
            if (dx < 0.05 && pA.x > 0.2 && pA.x < 0.8) {
              const yA = pathA.yBase + Math.sin(pA.x * Math.PI * 4 + pathA.phase) * 0.15 * (1 - Math.abs(Math.sin(pA.x * Math.PI + f * 0.01) * 0.1));
              const yB = pathB.yBase + Math.sin(pB.x * Math.PI * 4 + pathB.phase) * 0.15 * (1 - Math.abs(Math.sin(pB.x * Math.PI + f * 0.01) * 0.1));
              const dy = Math.abs(yA - yB);
              
              if (dy < 0.1) {
                 ctx.beginPath();
                 ctx.moveTo(pA.x * w, yA * h);
                 ctx.lineTo(pB.x * w, yB * h);
                 ctx.strokeStyle = c.hi + (0.15 * (1 - dy/0.1)).toFixed(2) + ")";
                 ctx.lineWidth = 0.5;
                 ctx.stroke();
              }
            }
          }
        }
      }

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     KNOWLEDGE GRAPH — "knowledgeGraph": Nodes locking
     together to form structures, mimicking the accumulation
     of distinct learnings into foundational principles.
     ═══════════════════════════════════════════════════ */
  function knowledgeGraph(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let nodes = [];
    let f = 0;

    function addNode() {
      const isCore = nodes.length < 3;
      nodes.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.002,
        vy: (Math.random() - 0.5) * 0.002,
        r: isCore ? 4 + Math.random() * 2 : 1.5 + Math.random() * 2,
        core: isCore,
        age: 0,
        connections: []
      });
    }
    for(let i=0; i<15; i++) addNode();

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);

      nodes.forEach((n) => {
        n.age++;
        n.x += n.vx;
        n.y += n.vy;
        
        if (n.core) {
          n.x += (0.5 - n.x) * 0.001;
          n.y += (0.5 - n.y) * 0.001;
        }

        if (n.x < 0.1 || n.x > 0.9) n.vx *= -1;
        if (n.y < 0.1 || n.y > 0.9) n.vy *= -1;
        n.x = Math.max(0.05, Math.min(0.95, n.x));
        n.y = Math.max(0.05, Math.min(0.95, n.y));
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = (a.x - b.x), dy = (a.y - b.y);
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 0.25) {
             const force = (0.25 - dist) * 0.005;
             if (!a.core) { a.vx += dx * force; a.vy += dy * force; }
             if (!b.core) { b.vx -= dx * force; b.vy -= dy * force; }
             
             ctx.beginPath();
             ctx.moveTo(a.x * w, a.y * h);
             ctx.lineTo(b.x * w, b.y * h);
             
             const isStrong = a.core || b.core;
             ctx.strokeStyle = (isStrong ? c.hi : c.fg) + (0.3 * (1 - dist / 0.25)).toFixed(2) + ")";
             ctx.lineWidth = isStrong ? 1 : 0.5;
             ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        ctx.beginPath();
        const fade = Math.min(1, n.age / 30);
        ctx.arc(n.x * w, n.y * h, n.r * fade, 0, Math.PI * 2);
        ctx.fillStyle = n.core ? c.hi + "0.8)" : c.ac + "0.6)";
        ctx.fill();
        
        if (n.core) {
          ctx.beginPath();
          ctx.arc(n.x * w, n.y * h, n.r * 2.5 * fade, 0, Math.PI * 2);
          ctx.strokeStyle = c.fg + "0.15)";
          ctx.stroke();
        }
      });

      if (f % 60 === 0 && nodes.length < 45) {
        addNode();
      }

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     ASCII MAZE — "asciiMaze": High-definition geometric
     and typography-driven agent mapping simulation. 
     ═══════════════════════════════════════════════════ */
  function asciiMaze(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0, cols = 0, rows = 0, cellS = 14;
    let maze = [], visits = [], qVals = [];
    let agent = { gx: 1, gy: 1, px: 1, py: 1, trail: [] };
    let target = { x: 1, y: 1 };
    let episode = 1;

    function generateMaze(c, r) {
      const m = Array.from({length: c}, () => new Uint8Array(r).fill(1));
      const stack = [[1, 1]];
      m[1][1] = 0;
      const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        dirs.sort(() => Math.random() - 0.5);
        for (let [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy;
          if (nx > 0 && nx < c-1 && ny > 0 && ny < r-1 && m[nx][ny] === 1) {
            m[(cx + nx)/2][(cy + ny)/2] = 0;
            m[nx][ny] = 0;
            stack.push([cx, cy]);
            stack.push([nx, ny]);
            break;
          }
        }
      }
      
      for (let i = 1; i < c - 1; i++) {
        for (let j = 1; j < r - 1; j++) {
          if (m[i][j] === 1 && Math.random() < 0.25) m[i][j] = 0;
        }
      }
      
      for (let i = 1; i <= 3; i++) for (let j = 1; j <= 3; j++) if(i<c && j<r) m[i][j] = 0;
      for (let i = c - 4; i <= c - 2; i++) for (let j = r - 4; j <= r - 2; j++) if(i>0 && j>0) m[i][j] = 0;
      return m;
    }

    function init() {
      const w = W(), h = H();
      cellS = window.matchMedia("(max-width: 640px)").matches ? 8 : 12;
      
      let newCols = Math.floor((w - 32) / cellS);
      let newRows = Math.floor((h - 48) / cellS);
      if (newCols % 2 === 0) newCols--;
      if (newRows % 2 === 0) newRows--;
      newCols = Math.max(7, newCols);
      newRows = Math.max(7, newRows);

      if (newCols !== cols || newRows !== rows) {
        cols = newCols; rows = newRows;
        maze = generateMaze(cols, rows);
        visits = Array.from({length: cols}, () => new Uint32Array(rows).fill(0));
        qVals = Array.from({length: cols}, () => new Float32Array(rows).fill(0));
        agent = { gx: 1, gy: 1, px: 1, py: 1, trail: [] };
        target = { x: cols - 2, y: rows - 2 };
        if (maze[target.x]) maze[target.x][target.y] = 0;
        episode = 1;
      }
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      init();
      if (!maze || maze.length === 0) return queueFrame(ctr, draw);

      const ox = (w - cols * cellS) / 2;
      const oy = (h - rows * cellS) / 2;

      
      if (Math.abs(agent.px - agent.gx) < 0.05 && Math.abs(agent.py - agent.gy) < 0.05) {
        let dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        let valid = [];
        for (let [dx, dy] of dirs) {
          let nx = agent.gx + dx, ny = agent.gy + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && maze[nx][ny] === 0) {
            valid.push([nx, ny]);
          }
        }

        if (valid.length > 0) {
          let best = valid[0];
          let bestScore = -Infinity;
          let epsilon = Math.max(0.01, 1 - episode * 0.02);

          if (Math.random() < epsilon) {
            valid.sort(() => Math.random() - 0.5);
            let minAvg = Infinity;
            for (let v of valid) {
               if (visits[v[0]][v[1]] < minAvg) {
                  minAvg = visits[v[0]][v[1]];
                  best = v;
               }
            }
          } else {
            for (let [nx, ny] of valid) {
              if (qVals[nx][ny] > bestScore) {
                bestScore = qVals[nx][ny];
                best = [nx, ny];
              }
            }
          }

          let reward = (best[0] === target.x && best[1] === target.y) ? 100 : -0.2;
          let maxNextQ = valid.reduce((max, [nx, ny]) => Math.max(max, qVals[nx][ny]), -Infinity);
          qVals[agent.gx][agent.gy] += 0.3 * (reward + 0.95 * maxNextQ - qVals[agent.gx][agent.gy]);
          
          visits[agent.gx][agent.gy]++;
          agent.gx = best[0];
          agent.gy = best[1];

          if (agent.gx === target.x && agent.gy === target.y) {
              qVals[agent.gx][agent.gy] = 100;
              episode++;
              agent.gx = 1; agent.gy = 1;
              agent.px = 1; agent.py = 1;
              agent.trail = [];
          }
        } else {
          agent.gx = 1; agent.gy = 1;
        }
      }

      agent.px += (agent.gx - agent.px) * 0.4;
      agent.py += (agent.gy - agent.py) * 0.4;
      agent.trail.push([agent.px, agent.py]);
      if (agent.trail.length > 15) agent.trail.shift();

      ctx.beginPath();
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = ox + i * cellS;
          const y = oy + j * cellS;
          
          if (maze[i][j] === 1) {
            ctx.fillStyle = c.fg + "0.1)";
            ctx.fillRect(x, y, cellS, cellS);
            ctx.strokeStyle = c.fg + "0.15)";
            ctx.strokeRect(x, y, cellS, cellS);
          } else {
            ctx.fillStyle = c.fg + "0.05)";
            ctx.fillRect(x + cellS/2 - 0.5, y + cellS/2 - 0.5, 1, 1);

            let q = qVals[i][j];
            if (q > 0) {
              const intensity = Math.min(1, q / 50);
              ctx.fillStyle = c.hi + (intensity * 0.4).toFixed(2) + ")";
              ctx.fillRect(x + 1, y + 1, cellS - 2, cellS - 2);
            }

            if (i === target.x && j === target.y) {
              ctx.strokeStyle = c.hi + "0.6)";
              ctx.lineWidth = 1;
              ctx.strokeRect(x + 2, y + 2, cellS - 4, cellS - 4);
              const pulse = Math.sin(f * 0.1) * 0.5 + 0.5;
              ctx.fillStyle = c.hi + (0.2 + pulse * 0.4).toFixed(2) + ")";
              ctx.fillRect(x + 4, y + 4, cellS - 8, cellS - 8);
            }
          }
        }
      }

      if (agent.trail.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < agent.trail.length; i++) {
          const ax = ox + agent.trail[i][0] * cellS + cellS / 2;
          const ay = oy + agent.trail[i][1] * cellS + cellS / 2;
          if (i === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
        }
        ctx.strokeStyle = c.hi + "0.5)";
        ctx.lineWidth = Math.max(1.5, cellS / 3);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }

      const cx = ox + agent.px * cellS + cellS / 2;
      const cy = oy + agent.py * cellS + cellS / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, cellS / 2.5), 0, Math.PI * 2);
      ctx.fillStyle = isDark() ? "#fff" : "#000";
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(cx, cy, cellS * 0.8 + Math.sin(f*0.2)*cellS*0.2, 0, Math.PI * 2);
      ctx.strokeStyle = c.hi + "0.4)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.fillStyle = c.hi + "0.8)";
      ctx.font = "9px var(--font-mono, monospace)";
      ctx.textAlign = "left";
      ctx.fillText(`EPISODE: ${episode.toString().padStart(4, '0')}`, ox, oy - 6);
      ctx.textAlign = "right";
      let eps = Math.max(0.01, 1 - episode * 0.02).toFixed(2);
      ctx.fillText(`EPSILON: ${eps}`, ox + cols * cellS, oy - 6);

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     MECHANISTIC INTERPRETABILITY — "mechSense": Beautiful ASCII/Geometric network parsing
     ═══════════════════════════════════════════════════ */
  function mechSense(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0, nodes = [], signals = [];

    function init() {
      const w = W(), h = H();
      nodes = [];
      const layers = 5;
      for (let l = 0; l < layers; l++) {
        const cx = (w * 0.1) + (w * 0.8) * (l / (layers - 1));
        const numNodes = [4, 7, 5, 8, 3][l] || 4;
        for (let i = 0; i < numNodes; i++) {
          const cy = (h * 0.15) + (h * 0.7) * (i / Math.max(1, numNodes - 1));
          nodes.push({ x: cx, y: cy, l: l, id: `${l}-${i}`, activation: 0, hover: false });
        }
      }
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      if (!nodes.length) init();

      if (f % 5 === 0 && Math.random() > 0.4) {
        const startNodes = nodes.filter(n => n.l === 0);
        if (startNodes.length) {
            let n = startNodes[Math.floor(Math.random() * startNodes.length)];
            signals.push({ x: n.x, y: n.y, tx: n.x, ty: n.y, l: 0, delay: 0 });
        }
      }

      ctx.beginPath();
      for (let n of nodes) {
        let targets = nodes.filter(tn => tn.l === n.l + 1);
        for (let tn of targets) {
          ctx.moveTo(n.x + 10, n.y);
          ctx.lineTo(tn.x - 10, tn.y);
        }
      }
      ctx.strokeStyle = c.fg + "0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let i = signals.length - 1; i >= 0; i--) {
        let s = signals[i];
        if (s.delay > 0) { s.delay--; continue; }
        
        let dx = s.tx - s.x;
        let dy = s.ty - s.y;
        s.x += dx * 0.15;
        s.y += dy * 0.15;

        ctx.fillStyle = c.hi + "0.8)";
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            let targets = nodes.filter(tn => tn.l === s.l + 1);
            if (targets.length) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                s.tx = target.x; s.ty = target.y;
                s.l++;
                let tNode = nodes.find(n => n.x === s.tx && n.y === s.ty);
                if (tNode) tNode.activation = 1;
            } else {
                signals.splice(i, 1);
            }
        }
      }

      ctx.font = "10px var(--font-mono, monospace)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let n of nodes) {
        n.activation *= 0.95;
        const radius = 12 + n.activation * 4;
        
        ctx.fillStyle = c.bg;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${isDark() ? '255,255,255' : '0,0,0'}, ${0.2 + n.activation * 0.8})`;
        ctx.lineWidth = 1 + n.activation * 2;
        ctx.stroke();

        ctx.fillStyle = isDark() ? "#fff" : "#000";
        if (n.activation > 0.1) {
            ctx.fillStyle = c.hi;
            ctx.fillText(n.activation.toFixed(1).replace("0.", "."), n.x, n.y + 1);
        } else {
            ctx.fillStyle = c.fg + "0.6)";
            ctx.fillText("0", n.x, n.y + 1);
        }
      }
      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     GRADIENT DESCENT — "gradientDescent": ASCII contour map
     with a particle rolling down a loss surface, leaving a 
     fading trail. Each contour ring is a different ASCII char.
     ═══════════════════════════════════════════════════ */
  function gradientDescent(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const chars = "·:;+=*#%@";
    const charSz = window.matchMedia("(max-width: 640px)").matches ? 10 : 13;
    const trail = [];
    let px = 0.7, py = 0.3;
    let vx = 0, vy = 0;

    function landscape(x, y, t) {
      return Math.sin(x * 3.5 + t * 0.003) * Math.cos(y * 2.8 - t * 0.002)
        + 0.6 * Math.sin(x * 1.2 - y * 1.8 + t * 0.001)
        + 0.3 * Math.cos(x * 5 + y * 4);
    }

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      const cols = Math.floor(w / charSz);
      const rows = Math.floor(h / charSz);
      const ox = (w - cols * charSz) / 2 + charSz / 2;
      const oy = (h - rows * charSz) / 2 + charSz / 2;

      ctx.font = `${charSz - 1}px var(--font-mono, monospace)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const nx = i / cols, ny = j / rows;
          const val = (landscape(nx * 6, ny * 6, f) + 2) / 4;
          const v = Math.max(0, Math.min(1, val));
          if (v < 0.08) continue;
          const ci = Math.floor(v * (chars.length - 1));
          ctx.fillStyle = c.fg + (0.06 + v * 0.25).toFixed(3) + ")";
          ctx.fillText(chars[ci], ox + i * charSz, oy + j * charSz);
        }
      }

      const gx = landscape(px * 6 + 0.01, py * 6, f) - landscape(px * 6 - 0.01, py * 6, f);
      const gy = landscape(px * 6, py * 6 + 0.01, f) - landscape(px * 6, py * 6 - 0.01, f);
      vx = vx * 0.92 - gx * 0.008;
      vy = vy * 0.92 - gy * 0.008;
      px += vx; py += vy;
      if (px < 0.05 || px > 0.95) { vx *= -0.5; px = Math.max(0.05, Math.min(0.95, px)); }
      if (py < 0.05 || py > 0.95) { vy *= -0.5; py = Math.max(0.05, Math.min(0.95, py)); }

      trail.push({ x: px, y: py });
      if (trail.length > 40) trail.shift();

      for (let t = 0; t < trail.length; t++) {
        const alpha = (t / trail.length) * 0.5;
        const sx = ox + trail[t].x * (cols - 1) * charSz;
        const sy = oy + trail[t].y * (rows - 1) * charSz;
        ctx.fillStyle = c.hi + alpha.toFixed(2) + ")";
        ctx.fillText("·", sx, sy);
      }

      const sx = ox + px * (cols - 1) * charSz;
      const sy = oy + py * (rows - 1) * charSz;
      ctx.fillStyle = c.hi + "0.85)";
      ctx.fillText("●", sx, sy);

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     LOSS LANDSCAPE — "lossLandscape": Topographic iso-lines
     rendered as ASCII, with slowly morphing terrain showing
     minima, saddle points, and ridges — a rotating 3D surface
     projected onto 2D character grid.
     ═══════════════════════════════════════════════════ */
  function lossLandscape(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const isoChars = [" ", ".", ":", "-", "~", "+", "=", "#"];

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      const sz = window.matchMedia("(max-width: 640px)").matches ? 9 : 11;
      const cols = Math.floor(w / sz);
      const rows = Math.floor(h / sz);
      const ox = (w - cols * sz) / 2 + sz / 2;
      const oy = (h - rows * sz) / 2 + sz / 2;

      ctx.font = `${sz}px var(--font-mono, monospace)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const phase = f * 0.004;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const u = (i / cols - 0.5) * 8;
          const v = (j / rows - 0.5) * 6;
          const z = Math.sin(u * u + v * v + phase) * 0.5
            + 0.3 * Math.cos(u * 2 - v + phase * 1.5)
            + 0.2 * Math.sin((u + v) * 1.5 - phase * 0.7);
          const nz = (z + 1) / 2;
          const ci = Math.floor(nz * (isoChars.length - 1));
          const ch = isoChars[Math.max(0, Math.min(isoChars.length - 1, ci))];
          if (ch === " ") continue;
          const alpha = 0.08 + nz * 0.35;
          ctx.fillStyle = c.fg + alpha.toFixed(3) + ")";
          ctx.fillText(ch, ox + i * sz, oy + j * sz);
        }
      }

      const cx = w / 2, cy = h / 2;
      const labels = ["minimum", "saddle"];
      const pts = [
        { x: cx + Math.cos(phase * 0.5) * w * 0.15, y: cy + Math.sin(phase * 0.5) * h * 0.12 },
        { x: cx - Math.cos(phase * 0.3) * w * 0.22, y: cy - Math.sin(phase * 0.3) * h * 0.15 },
      ];
      ctx.font = `${sz - 2}px var(--font-mono, monospace)`;
      pts.forEach((p, idx) => {
        ctx.fillStyle = c.hi + "0.5)";
        ctx.fillText("×", p.x, p.y);
        ctx.fillStyle = c.fg + "0.3)";
        ctx.fillText(labels[idx], p.x, p.y + sz + 2);
      });

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     TOKEN FLOW — "tokenFlow": Visualizes prompt tokens
     flowing through transformer attention layers as a
     waterfall of ASCII characters, with injection-point
     tokens highlighted in a different intensity.
     ═══════════════════════════════════════════════════ */
  function tokenFlow(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const layers = 6;
    const tokensPerRow = 20;
    const glyphs = "abcdefghijklmnopqrstuvwxyz0123456789";
    const injectionRange = [7, 11];
    const particles = [];

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      const sz = window.matchMedia("(max-width: 640px)").matches ? 11 : 14;
      const layerH = h / (layers + 1);
      const tokenW = Math.min(sz + 4, (w - 40) / tokensPerRow);
      const startX = (w - tokensPerRow * tokenW) / 2 + tokenW / 2;

      ctx.font = `${sz}px var(--font-mono, monospace)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (f % 8 === 0 && particles.length < 80) {
        const tok = Math.floor(Math.random() * tokensPerRow);
        particles.push({ tok, layer: 0, progress: 0, char: glyphs[Math.floor(Math.random() * glyphs.length)] });
      }

      for (let l = 0; l < layers; l++) {
        const y = layerH * (l + 0.8);
        ctx.fillStyle = c.fg + "0.06)";
        ctx.fillRect(startX - tokenW / 2, y - 1, tokensPerRow * tokenW, 1);

        for (let t = 0; t < tokensPerRow; t++) {
          const x = startX + t * tokenW;
          const isInject = t >= injectionRange[0] && t <= injectionRange[1];
          const pulse = Math.sin(f * 0.04 + t * 0.3 + l * 0.5) * 0.5 + 0.5;
          const base = isInject ? 0.12 + pulse * 0.2 : 0.04 + pulse * 0.08;
          ctx.fillStyle = (isInject ? c.hi : c.fg) + base.toFixed(3) + ")";
          ctx.fillText("·", x, y);
        }
      }

      const alive = [];
      particles.forEach(p => {
        p.progress += 0.02;
        if (p.progress >= 1) { p.layer++; p.progress = 0; }
        if (p.layer >= layers) return;
        alive.push(p);

        const y = layerH * (p.layer + 0.8 + p.progress);
        const x = startX + p.tok * tokenW;
        const isInject = p.tok >= injectionRange[0] && p.tok <= injectionRange[1];
        const alpha = isInject ? 0.7 : 0.35;
        ctx.fillStyle = (isInject ? c.hi : c.fg) + alpha.toFixed(2) + ")";
        ctx.fillText(p.char, x, y);
      });
      particles.length = 0;
      particles.push(...alive);

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     SAE LATENT — "saeLatent": Sparse Autoencoder feature
     activations — a grid of features where most are dormant
     (faint) and a sparse set fire brightly, with the active
     set slowly rotating through the feature dictionary.
     ═══════════════════════════════════════════════════ */
  function saeLatent(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const dictSize = 256;
    const activations = new Float32Array(dictSize);

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      const sz = window.matchMedia("(max-width: 640px)").matches ? 8 : 10;
      const gridCols = Math.floor((w - 20) / (sz + 2));
      const gridRows = Math.ceil(dictSize / gridCols);
      const ox = (w - gridCols * (sz + 2)) / 2 + sz / 2;
      const oy = (h - gridRows * (sz + 2)) / 2 + sz / 2;

      for (let i = 0; i < dictSize; i++) {
        const sparseTrigger = Math.sin(f * 0.015 + i * 0.37) * Math.cos(f * 0.008 + i * 0.73);
        const target = sparseTrigger > 0.85 ? Math.min(1, (sparseTrigger - 0.85) * 6.5) : 0;
        activations[i] += (target - activations[i]) * 0.08;
      }

      ctx.font = `${sz}px var(--font-mono, monospace)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < dictSize; i++) {
        const col = i % gridCols;
        const row = Math.floor(i / gridCols);
        if (row >= gridRows) break;
        const x = ox + col * (sz + 2);
        const y = oy + row * (sz + 2);
        const v = activations[i];
        const char = v > 0.6 ? "█" : v > 0.3 ? "▓" : v > 0.1 ? "░" : "·";
        const alpha = 0.06 + v * 0.75;
        ctx.fillStyle = (v > 0.3 ? c.hi : c.fg) + alpha.toFixed(3) + ")";
        ctx.fillText(char, x, y);
      }

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══════════════════════════════════════════════════
     CIRCUIT TRACE — "circuitTrace": Shows signal propagation
     through a neural circuit — nodes at fixed positions with
     animated pulses traveling along weighted edges, representing
     how an induction head or safety circuit fires.
     ═══════════════════════════════════════════════════ */
  function circuitTrace(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    let f = 0;
    const layerSizes = [4, 6, 8, 6, 4, 2];
    const pulses = [];

    (function draw() {
      const w = W(), h = H(), c = C();
      ctx.clearRect(0, 0, w, h);
      const pad = 30;
      const layerGap = (w - pad * 2) / (layerSizes.length - 1);

      const nodePositions = [];
      layerSizes.forEach((count, l) => {
        const lx = pad + l * layerGap;
        const layerNodes = [];
        const nodeGap = (h - pad * 2) / (count + 1);
        for (let n = 0; n < count; n++) {
          layerNodes.push({ x: lx, y: pad + (n + 1) * nodeGap });
        }
        nodePositions.push(layerNodes);
      });

      if (f % 20 === 0) {
        const srcLayer = Math.floor(Math.random() * (layerSizes.length - 1));
        const srcNode = Math.floor(Math.random() * layerSizes[srcLayer]);
        const dstNode = Math.floor(Math.random() * layerSizes[srcLayer + 1]);
        pulses.push({ srcL: srcLayer, srcN: srcNode, dstN: dstNode, t: 0 });
      }

      for (let l = 0; l < layerSizes.length - 1; l++) {
        for (let a = 0; a < layerSizes[l]; a++) {
          for (let b = 0; b < layerSizes[l + 1]; b += 2) {
            const from = nodePositions[l][a];
            const to = nodePositions[l + 1][b];
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = c.fg + "0.04)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      const alive = [];
      pulses.forEach(p => {
        p.t += 0.025;
        if (p.t > 1) {
          if (p.srcL + 1 < layerSizes.length - 1) {
            pulses.push({ srcL: p.srcL + 1, srcN: p.dstN, dstN: Math.floor(Math.random() * layerSizes[p.srcL + 2]), t: 0 });
          }
          return;
        }
        alive.push(p);
        const from = nodePositions[p.srcL][p.srcN];
        const to = nodePositions[p.srcL + 1][p.dstN];
        const x = from.x + (to.x - from.x) * p.t;
        const y = from.y + (to.y - from.y) * p.t;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = c.hi + "0.15)";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = c.hi + "0.6)";
        ctx.fill();
      });
      pulses.length = 0;
      pulses.push(...alive);

      nodePositions.forEach((layer, l) => {
        layer.forEach((node, n) => {
          const activity = Math.sin(f * 0.03 + l * 1.5 + n * 0.8) * 0.5 + 0.5;
          const r = 2 + activity * 1.5;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = (activity > 0.65 ? c.hi : c.fg) + (0.15 + activity * 0.4).toFixed(2) + ")";
          ctx.fill();
        });
      });

      f++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══ DOT MATRIX — homepage right panel ═══ */
  function dotMatrix(ctr) {
    const { ctx, W, H } = initCanvas(ctr);
    const S = 13;
    let t = 0;
    const sources = [];
    let nextSpawn = 25;

    (function draw() {
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

      for (let i = sources.length - 1; i >= 0; i--) {
        sources[i].life++;
        if (sources[i].life >= sources[i].maxLife) sources.splice(i, 1);
      }

      t++;
      queueFrame(ctr, draw);
    })();
  }

  /* ═══ REGISTRY ═══ */
  const vizMap = {
    identity, quill, blueprint, dna, tree,
    emergence, manuscript, lightbulb, mechSense,
    compose, exchange, terminal, ecosystem,
    mask, diverge, inject, erosion, dissect, gridwalk, asciiRl,
    latentField, neuralTopo, attractor, thoughtStream, knowledgeGraph, asciiMaze,
    chartBars, chartFlip, chartBoundary, chartFlow, chartDecay, chartLayers,
    gradientDescent, lossLandscape, tokenFlow, saeLatent, circuitTrace,
    dotMatrix,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const state = vizState.get(e.target);
      if (state) state.visible = e.isIntersecting;

      const c = e.target.querySelector("canvas");
      if (c) c.style.display = e.isIntersecting ? "block" : "none";
    });
  }, { threshold: 0 });

  vizContainers.forEach((ctr) => {
    const type = ctr.getAttribute("data-viz");
    if (!vizMap[type]) return;

    vizState.set(ctr, { visible: true });
    vizMap[type](ctr);
    observer.observe(ctr);
  });
})();
