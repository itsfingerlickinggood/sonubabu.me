// A small, deterministic environment. No pathfinder or pretrained policy.
export const MAZE = Object.freeze([
  '###############',
  '#S....#......o#',
  '#.##..#.###.#.#',
  '#....o........#',
  '#.###.###.###.#',
  '#.............#',
  '#.#.###.#.##..#',
  '#o......#.....#',
  '###############',
]);
export const WIDTH = MAZE[0].length;
export const HEIGHT = MAZE.length;
export const ACTIONS = Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);
export const cell = (x, y) => y * WIDTH + x;
export const coordinates = p => [p % WIDTH, Math.floor(p / WIDTH)];
export const walkable = p => Number.isInteger(p) && p >= 0 && p < WIDTH * HEIGHT && MAZE[Math.floor(p / WIDTH)][p % WIDTH] !== '#';
export const START = cell(1, 1);
export const PELLETS = Object.freeze([cell(13, 1), cell(5, 3), cell(1, 7)]);
export const PATROL = Object.freeze([[9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [13, 4], [13, 5], [12, 5], [11, 5], [10, 5], [9, 5], [9, 4]].map(([x, y]) => cell(x, y)));
export const MAX_STEPS = 220;
export const ALPHA = .35;
export const GAMMA = .97;
export const REWARDS = Object.freeze({step: -.04, wall: -.12, pellet: 2, caught: -5, clear: 5});
export const STATE_COUNT = WIDTH * HEIGHT * 8 * PATROL.length;

export function random(seed = 73) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let t = value;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const initialState = () => ({position: START, mask: 7, phase: 0, steps: 0, total: 0, terminal: false, truncated: false, outcome: '', action: 1});
// Food identity and hazard phase are part of the state, not hidden history.
export const stateId = state => (state.position * 8 + state.mask) * PATROL.length + state.phase;
export const finished = state => state.terminal || state.truncated;

export function transition(state, action) {
  if (finished(state)) return {state, reward: 0};
  if (!Number.isInteger(action) || action < 0 || action > 3) throw new RangeError('Unknown maze action');
  const [x, y] = coordinates(state.position);
  const [dx, dy] = ACTIONS[action];
  const candidate = cell(x + dx, y + dy);
  const position = walkable(candidate) ? candidate : state.position;
  const phase = (state.phase + 1) % PATROL.length;
  const caught = position === PATROL[phase] || (position === PATROL[state.phase] && state.position === PATROL[phase]);
  let mask = state.mask;
  let reward = position === state.position ? REWARDS.wall : REWARDS.step;
  if (caught) reward += REWARDS.caught;
  else PELLETS.forEach((p, i) => {
    if (p === position && mask & 1 << i) { mask &= ~(1 << i); reward += REWARDS.pellet; }
  });
  const won = !caught && mask === 0;
  if (won) reward += REWARDS.clear;
  const steps = state.steps + 1;
  const terminal = caught || won;
  // This is an administrative rollout cutoff, not an unobserved terminal state.
  // Q-learning still bootstraps at truncation; only catch/clear zero the target.
  const truncated = !terminal && steps >= MAX_STEPS;
  return {reward, state: {position, mask, phase, steps, total: state.total + reward, terminal, truncated, outcome: caught ? 'caught' : won ? 'clear' : truncated ? 'limit' : '', action}};
}

export class Learner {
  constructor(seed = 73) { this.seed = seed; this.reset(); }
  reset() {
    this.rng = random(this.seed);
    this.q = new Float32Array(STATE_COUNT * 4);
    this.visits = new Uint32Array(STATE_COUNT * 4);
    this.episodes = 0;
    this.recent = [];
  }
  get epsilon() { return Math.max(.06, .85 * Math.exp(-this.episodes / 800)); }
  values(state) { const offset = stateId(state) * 4; return this.q.subarray(offset, offset + 4); }
  greedy(state, rng = this.rng) {
    const values = this.values(state);
    const best = Math.max(...values);
    const ties = [0, 1, 2, 3].filter(a => Math.abs(values[a] - best) < 1e-7);
    return ties[Math.floor(rng() * ties.length)];
  }
  action(state, rng = this.rng, epsilon = this.epsilon) {
    return rng() < epsilon ? Math.floor(rng() * 4) : this.greedy(state, rng);
  }
  update(before, action, reward, after) {
    const index = stateId(before) * 4 + action;
    const target = reward + (after.terminal ? 0 : GAMMA * Math.max(...this.values(after)));
    this.q[index] += ALPHA * (target - this.q[index]);
    this.visits[index]++;
  }
  record(state) {
    this.episodes++;
    this.recent.push(state.outcome === 'clear' ? 1 : 0);
    if (this.recent.length > 50) this.recent.shift();
  }
  step(state) {
    if (finished(state)) throw new Error('Start a new round before training');
    const action = this.action(state);
    const result = transition(state, action);
    this.update(state, action, result.reward, result.state);
    if (finished(result.state)) this.record(result.state);
    return result.state;
  }
  train(episodes) {
    let state;
    for (let n = 0; n < episodes; n++) {
      state = initialState();
      while (!finished(state)) state = this.step(state);
    }
    return state;
  }
}
