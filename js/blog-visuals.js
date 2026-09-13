/* Small, deterministic essay figures. No autoplay, timers, network or dependencies. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const figures = [...document.querySelectorAll('[data-blog-visual]')];

  function syncArtwork() {
    const dark = root.dataset.theme === 'dark';
    document.querySelectorAll('[data-blog-dark]').forEach(source => {
      const media = dark ? 'all' : 'not all';
      if (source.media !== media) source.media = media;
    });
  }
  syncArtwork();
  new MutationObserver(syncArtwork).observe(root, {attributes: true, attributeFilter: ['data-theme']});

  function select(figure, name, announce = true) {
    figure.querySelectorAll('[data-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.choice === name)));
    figure.querySelectorAll('[data-panel]').forEach(panel => {
      const inactive = panel.dataset.panel !== name;
      panel.setAttribute('aria-hidden', String(inactive));
      panel.inert = inactive;
    });
    const selected = figure.querySelector(`[data-panel="${name}"]`);
    if (announce && selected) figure.querySelector('.bv-live').textContent = selected.textContent.trim();
  }

  const scenarios = { specialist: [4, 'narrow'], uneven: [1, 'general'], strong: [3, 'general'] };
  const handlers = {
    breadth(figure, name) {
      const [level, breadth] = scenarios[name];
      figure.querySelectorAll('[data-cell]').forEach(marker => marker.classList.toggle('is-current', marker.dataset.cell === `${level}-${breadth}`));
    },
    voices(figure, name) {
      figure.querySelectorAll('[data-voice]').forEach(voice => voice.classList.toggle('is-current', voice.dataset.voice === name));
      figure.querySelectorAll('[data-pair]').forEach(path => path.classList.toggle('is-quiet', name !== 'all' && !path.dataset.pair.split(' ').includes(name)));
    },
    timeline() {},
    process(figure, name) {
      const stage = {explore: 0, connect: 1, test: 2}[name];
      figure.querySelectorAll('[data-edge]').forEach(edge => edge.classList.toggle('is-quiet', Number(edge.dataset.edge) > stage));
      figure.querySelectorAll('[data-node]').forEach(node => {
        const index = Number(node.dataset.node);
        node.classList.toggle('is-quiet', stage > 0 && ![1, 4].includes(index));
        // A small emphasis preserves both identity and the connection endpoints.
        node.style.transform = `scale(${stage > 0 && [1, 4].includes(index) ? 1.4 : 1})`;
      });
      figure.querySelectorAll('[data-phase]').forEach(node => { node.style.opacity = Number(node.dataset.phase) <= stage ? '1' : '.2'; });
    },
    experiment(figure, name) {
      let delayed = 0;
      figure.querySelectorAll('[data-message]').forEach(message => {
        const id = message.dataset.message;
        const later = name !== 'combine' && (['comment', 'update'].includes(id) || (name === 'trial' && id === 'deadline'));
        message.classList.toggle('is-later', later);
        message.querySelector('.bv-route-label').textContent = later ? 'Digest at 16:00' : 'Notify now';
        if (later) delayed++;
      });
      figure.querySelector('[data-routing-count]').textContent = `${4 - delayed} now · ${delayed} in the digest`;
    }
  };

  function initLoss(figure) {
    let step = 0;
    const limit = 12;
    const advance = figure.querySelector('[data-step]');
    const reset = figure.querySelector('[data-reset]');
    const history = figure.querySelector('.bv-loss-history');
    const position = n => {
      const w = 1 - 3 * Math.pow(.6, n);
      return {w, loss: Math.pow(w - 1, 2), x: 40 + (w + 2) / 6 * 400, y: 220 - Math.pow(w - 1, 2) * 170 / 9};
    };
    // Discrete, calculated positions. No invented samples or animated counters.
    const dots = Array.from({length: limit}, (_, n) => {
      const {x, y} = position(n);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(x)); dot.setAttribute('cy', String(y)); dot.setAttribute('r', '3.5');
      history.append(dot);
      return dot;
    });
    function render(announce = false) {
      const {w, loss, x, y} = position(step);
      dots.forEach((dot, n) => { dot.style.display = n < step ? '' : 'none'; });
      figure.querySelector('.bv-loss-dot').style.transform = `translate(${x}px, ${y}px)`;
      figure.querySelector('[data-update-equation]').textContent = step === limit
        ? '12 updates complete. Reset to try again.'
        : `${w.toFixed(3)} − 0.2 × (${(2 * (w - 1)).toFixed(3)}) = ${position(step + 1).w.toFixed(3)}`;
      figure.querySelector('[data-step-value]').textContent = String(step);
      figure.querySelector('[data-weight]').textContent = w.toFixed(3);
      figure.querySelector('[data-loss]').textContent = loss.toFixed(4);
      advance.disabled = step === limit;
      advance.textContent = step === limit ? '12 steps complete' : 'Take one step';
      reset.disabled = step === 0;
      if (announce) figure.querySelector('.bv-live').textContent = `Step ${step}. Parameter ${w.toFixed(3)}. Loss ${loss.toFixed(4)}.${step === limit ? ' Example complete. You can reset it.' : ''}`;
    }
    advance.addEventListener('click', () => { step = Math.min(step + 1, limit); render(true); });
    reset.addEventListener('click', () => { step = 0; render(true); });
    render();
  }

  figures.forEach(figure => {
    const type = figure.dataset.blogVisual;
    // Initial and keyboard states are instant. Pointer actions get a single short transition.
    figure.setAttribute('data-instant', '');
    figure.addEventListener('pointerdown', () => figure.toggleAttribute('data-instant', reduced.matches));
    figure.addEventListener('keydown', () => figure.setAttribute('data-instant', ''));
    // Assistive-technology activation may dispatch a click without a key event.
    figure.addEventListener('click', event => { if (event.detail === 0) figure.setAttribute('data-instant', ''); }, true);
    const live = document.createElement('span');
    live.className = 'bv-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    figure.append(live);
    if (type === 'loss') initLoss(figure);
    else {
      const update = name => { select(figure, name); handlers[type](figure, name); };
      figure.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => update(button.dataset.choice)));
      const initial = figure.querySelector('[data-choice][aria-pressed="true"]').dataset.choice;
      select(figure, initial, false);
      handlers[type](figure, initial);
    }
    figure.classList.add('bv-enhanced');
    figure.querySelectorAll('.bv-controls').forEach(control => { control.hidden = false; });
  });
  reduced.addEventListener('change', () => figures.forEach(figure => figure.setAttribute('data-instant', '')));
})();
