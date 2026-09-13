import {Learner, WIDTH, HEIGHT, PATROL, PELLETS, MAX_STEPS, coordinates, walkable, stateId, initialState, transition, finished, random} from './maze-engine.mjs';

function initArcade(root) {
  const find = name => root.querySelector(`[data-arcade-${name}]`);
  const board = find('board');
  const run = find('run');
  const step = find('step');
  const train = find('train');
  const mode = find('mode');
  const policy = find('policy');
  const showPolicy = find('show-policy');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const learner = new Learner();
  const watchRandom = random(120);
  let state = initialState();
  let running = false;
  let timer = 0;
  let batchTimer = 0;
  let batchRemaining = 0;
  let visible = true;
  let active = true;
  const arrows = [];
  const facing = root.querySelector('[data-agent-facing]');
  const food = Array.from(root.querySelectorAll('[data-food]'));

  for (let p = 0; p < WIDTH * HEIGHT; p++) {
    if (!walkable(p)) continue;
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrow.setAttribute('d', 'M0 4V-4M-2.5-1.5 0-4 2.5-1.5');
    policy.appendChild(arrow);
    arrows.push({position: p, element: arrow});
  }

  function announce(text) { find('status').textContent = text; }
  function setPosition(element, position) {
    const [x, y] = coordinates(position);
    element.style.transform = `translate(${x * 24 + 12}px,${y * 24 + 12}px)`;
  }
  function renderBoard(smooth = false) {
    root.dataset.smooth = String(smooth && !reduced.matches);
    setPosition(find('agent'), state.position);
    setPosition(find('ghost'), PATROL[state.phase]);
    facing.setAttribute('transform', `rotate(${[-90, 0, 90, 180][state.action]})`);
    food.forEach((dot, i) => { dot.style.visibility = state.mask & 1 << i ? 'visible' : 'hidden'; });
    policy.style.display = showPolicy.checked ? '' : 'none';
    if (showPolicy.checked) arrows.forEach(({position, element}) => {
      const slice = {...state, position};
      const offset = stateId(slice) * 4;
      const visited = learner.visits.subarray(offset, offset + 4).some(value => value > 0);
      element.style.display = visited && position !== state.position && position !== PATROL[state.phase] && !finished(state) ? '' : 'none';
      if (!visited) return;
      const values = learner.values(slice);
      const best = values.indexOf(Math.max(...values));
      const [x, y] = coordinates(position);
      element.setAttribute('transform', `translate(${x * 24 + 12} ${y * 24 + 12}) rotate(${best * 90})`);
    });
    const collected = PELLETS.length - state.mask.toString(2).replaceAll('0', '').length;
    find('score').textContent = `${collected} / 3 blooms`;
    const result = {clear: 'Maze cleared.', caught: 'Caught by the ghost.', limit: 'Step limit reached.'}[state.outcome];
    find('round').textContent = result || (state.steps ? `Step ${state.steps} / ${MAX_STEPS}` : 'Collect all three. Avoid the ghost.');
    const [x, y] = coordinates(state.position);
    const [gx, gy] = coordinates(PATROL[state.phase]);
    board.setAttribute('aria-label', `Maze. Agent column ${x + 1}, row ${y + 1}. Ghost column ${gx + 1}, row ${gy + 1}. ${collected} of 3 blossoms. ${result || `Step ${state.steps}.`}`);
    root.dataset.steps = String(state.steps);
    root.dataset.outcome = state.outcome;
  }
  function renderControls() {
    const playing = mode.value === 'play';
    root.dataset.mode = mode.value;
    root.dataset.running = String(running);
    root.dataset.training = String(batchRemaining > 0);
    run.textContent = playing ? 'New round' : running ? 'Pause' : 'Run';
    run.disabled = batchRemaining > 0;
    step.hidden = playing;
    step.disabled = running || batchRemaining > 0;
    train.hidden = mode.value !== 'learn';
    train.textContent = batchRemaining ? `Stop · ${500 - batchRemaining}/500` : 'Train +500';
    mode.disabled = batchRemaining > 0;
    find('play').hidden = !playing;
    board.tabIndex = playing ? 0 : -1;
    find('episodes').textContent = learner.episodes.toLocaleString();
    const wins = learner.recent.reduce((a, b) => a + b, 0);
    find('wins').textContent = learner.recent.length ? `${wins} / ${learner.recent.length}` : '—';
    find('epsilon').textContent = mode.value === 'learn' ? `${Math.round(learner.epsilon * 100)}%` : mode.value === 'watch' ? '0%' : '—';
  }
  function canRun() { return active && visible && !document.hidden; }
  function stop(message) {
    running = false;
    clearTimeout(timer);
    clearTimeout(batchTimer);
    timer = batchTimer = 0;
    batchRemaining = 0;
    // Settle a partial translation to the actual logical cell, not an old target.
    root.dataset.smooth = 'false';
    renderControls();
    if (message) announce(message);
  }
  function freshRound() { state = initialState(); renderBoard(); }
  function takeStep(action = null, smooth = false) {
    if (finished(state)) { freshRound(); return; }
    if (mode.value === 'learn') state = learner.step(state);
    else state = transition(state, action === null ? learner.greedy(state, watchRandom) : action).state;
    renderBoard(smooth);
    renderControls();
    if (finished(state)) {
      const message = {clear: `All three blossoms collected in ${state.steps} steps.`, caught: `Caught after ${state.steps} steps.`, limit: 'Round ended at the 220-step limit.'}[state.outcome];
      announce(`${message} ${mode.value === 'learn' ? 'This attempt updated the Q-table.' : 'The Q-table is unchanged.'}`);
    }
  }
  function tick() {
    timer = 0;
    if (!running || !canRun()) { stop(); return; }
    takeStep(null, true);
    // No catch-up loops. A terminal round holds briefly before resetting.
    timer = setTimeout(tick, finished(state) ? 1000 : reduced.matches ? 500 : 180);
  }
  run.addEventListener('click', () => {
    if (mode.value === 'play') {
      freshRound();
      announce('New round. Focus the maze and use arrow keys, or use the direction buttons.');
      return;
    }
    if (running) { stop('Paused. Step through a move, or Run to continue.'); return; }
    running = true;
    renderControls();
    announce(mode.value === 'learn' ? 'Learning live. Exploratory choices and rewards update the Q-table.' : 'Watching the greedy policy. No exploration or training updates.');
    timer = setTimeout(tick, 180);
  });
  step.addEventListener('click', () => {
    takeStep();
    if (!finished(state)) announce(`Step ${state.steps}. ${find('score').textContent}. ${mode.value === 'learn' ? 'Q-table updated.' : 'Policy unchanged.'}`);
  });
  train.addEventListener('click', () => {
    if (batchRemaining) { stop(`Training stopped at ${learner.episodes.toLocaleString()} episodes. Completed updates are kept.`); freshRound(); return; }
    stop();
    // Complete the interrupted training round before counting the new batch.
    // The visible partial rollout's learned updates are retained, not duplicated.
    if (state.steps && !finished(state)) {
      while (!finished(state)) state = learner.step(state);
    }
    batchRemaining = 500;
    renderControls();
    announce('Training 500 new episodes. You can stop at any time.');
    function chunk() {
      if (!batchRemaining || !canRun()) { stop(); return; }
      const start = performance.now();
      // Yield every ~8ms, with a 10-episode cap even on fast machines.
      let count = 0;
      do { learner.train(1); batchRemaining--; count++; }
      while (batchRemaining && count < 10 && performance.now() - start < 8);
      renderControls();
      if (batchRemaining) batchTimer = setTimeout(chunk, 16);
      else {
        batchTimer = 0;
        freshRound();
        find('round').textContent = 'Trained. Try Watch → Run.';
        announce(`500 episodes trained. ${learner.episodes.toLocaleString()} total. Switch to Watch, then Run, to see the learned route.`);
      }
    }
    batchTimer = setTimeout(chunk, 16);
  });
  find('reset').addEventListener('click', () => {
    stop();
    learner.reset();
    freshRound();
    renderControls();
    announce('Learning reset. The Q-table and training statistics are empty again.');
  });
  mode.addEventListener('change', () => {
    stop();
    freshRound();
    renderControls();
    announce({learn: 'Learn updates the Q-table. Run live or train 500 episodes at once.', watch: learner.episodes ? 'Watch uses the learned policy without changing it. Press Run.' : 'No completed training yet. Watch will break equal action values randomly; train in Learn mode first.', play: 'Your turn. Focus the maze for arrow keys, or use the direction buttons. The ghost moves once per move. Learning is unchanged.'}[mode.value]);
  });
  function play(action) {
    if (mode.value !== 'play') return;
    if (finished(state)) { announce('Round finished. Choose New round to play again.'); return; }
    takeStep(action);
    if (!finished(state)) announce(board.getAttribute('aria-label'));
  }
  root.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => play(Number(button.dataset.direction))));
  board.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || mode.value !== 'play') return;
    const action = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(event.key);
    if (action !== -1) { event.preventDefault(); play(action); }
  });
  showPolicy.addEventListener('change', () => {
    renderBoard();
    announce(showPolicy.checked ? 'Policy arrows enabled for this blossom set and ghost position. Unvisited states have no arrow.' : 'Policy arrows hidden.');
  });
  function suspend() {
    if (!canRun() && (running || batchRemaining)) {
      const wasTraining = batchRemaining > 0;
      stop('Paused while the maze is out of view. Completed learning is kept.');
      if (wasTraining) freshRound();
    }
  }
  document.addEventListener('visibilitychange', suspend);
  window.addEventListener('pagehide', () => { active = false; suspend(); });
  window.addEventListener('pageshow', () => { active = true; });
  window.addEventListener('beforeprint', () => { active = false; suspend(); });
  window.addEventListener('afterprint', () => { active = true; });
  reduced.addEventListener('change', () => {
    if (reduced.matches) stop('Reduced motion enabled. Step for instant moves, or Run for slower, unanimated playback.');
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    suspend();
  }).observe(root);
  find('controls').hidden = false;
  root.dataset.arcadeReady = '';
  renderBoard();
  renderControls();
  if (reduced.matches) announce('Step for instant moves, or train 500 episodes without animation. Run uses slower, unanimated playback.');
}

document.querySelectorAll('[data-learning-arcade]').forEach(initArcade);
