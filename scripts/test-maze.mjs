import assert from 'node:assert/strict';
import {Learner, MAZE, WIDTH, HEIGHT, START, PELLETS, PATROL, STATE_COUNT, MAX_STEPS, ALPHA, GAMMA, REWARDS, cell, walkable, stateId, initialState, transition, finished, random} from '../js/maze-engine.mjs';

let assertions = 0;
function test(name, fn) { fn(); assertions++; console.log(`✓ ${name}`); }
function rollout(learner, rng) {
  let s = initialState();
  while (!finished(s)) s = transition(s, learner.greedy(s, rng)).state;
  return s;
}
test('Rectangular map, legal start, rewards and contiguous closed patrol', () => {
  assert(MAZE.every(r => r.length === WIDTH));
  assert(walkable(START));
  assert(PELLETS.every(walkable));
  PATROL.forEach((p, i) => {
    assert(walkable(p));
    const next = PATROL[(i + 1) % PATROL.length];
    assert([1, WIDTH].includes(Math.abs(p - next)));
  });
});
test('All walkable cells are connected', () => {
  const seen = new Set([START]), queue = [START];
  while (queue.length) {
    const p = queue.shift();
    for (const d of [-WIDTH, 1, WIDTH, -1]) if (walkable(p + d) && !seen.has(p + d)) { seen.add(p + d); queue.push(p + d); }
  }
  assert.equal(seen.size, [...MAZE.join('')].filter(c => c !== '#').length);
});
test('Wall collisions leave the agent in place and advance the ghost', () => {
  const {state, reward} = transition(initialState(), 0);
  assert.equal(state.position, START); assert.equal(state.phase, 1); assert.equal(reward, REWARDS.wall);
});
test('A pellet rewards exactly once', () => {
  const s = {...initialState(), position: cell(4, 3)};
  const first = transition(s, 1);
  assert.equal(first.state.mask, 5); assert.equal(first.reward, REWARDS.step + REWARDS.pellet);
  const again = transition(transition(first.state, 3).state, 1);
  assert.equal(again.reward, REWARDS.step);
});
test('Last pellet terminates with a clear bonus', () => {
  const {state, reward} = transition({...initialState(), position: cell(4, 3), mask: 2}, 1);
  assert(state.terminal); assert(!state.truncated); assert.equal(state.outcome, 'clear'); assert.equal(state.mask, 0);
  assert.equal(reward, REWARDS.step + REWARDS.pellet + REWARDS.clear);
});
test('Same-cell ghost collision terminates the round', () => {
  const {state} = transition({...initialState(), position: cell(11, 3)}, 3);
  assert.equal(state.outcome, 'caught');
});
test('Crossing swaps with the ghost also count as collisions', () => {
  const {state} = transition({...initialState(), position: cell(10, 3)}, 3);
  assert.equal(state.outcome, 'caught');
});
test('Step limit truncates instead of inventing a terminal state', () => {
  const {state} = transition({...initialState(), steps: MAX_STEPS - 1}, 1);
  assert(!state.terminal); assert(state.truncated); assert.equal(state.outcome, 'limit');
});
test('Terminal states are immutable and invalid live actions fail', () => {
  const s = {...initialState(), terminal: true};
  assert.equal(transition(s, 2).state, s);
  assert.throws(() => transition(initialState(), 4), RangeError);
  assert.throws(() => new Learner().step(s));
});
test('All encoded positions, masks and patrol phases are distinct and bounded', () => {
  const ids = new Set();
  for (let position = 0; position < WIDTH * HEIGHT; position++) for (let mask = 0; mask < 8; mask++) for (let phase = 0; phase < PATROL.length; phase++) ids.add(stateId({position, mask, phase}));
  assert.equal(ids.size, STATE_COUNT); assert.equal(Math.max(...ids), STATE_COUNT - 1);
});
test('One-step Q update uses the max next-state value', () => {
  const l = new Learner(), before = initialState(), {state: after, reward} = transition(before, 1);
  l.q[stateId(before) * 4 + 1] = .5;
  l.q[stateId(after) * 4] = 3;
  l.update(before, 1, reward, after);
  assert(Math.abs(l.q[stateId(before) * 4 + 1] - (.5 + ALPHA * (reward + GAMMA * 3 - .5))) < 1e-6);
  assert.equal(l.visits[stateId(before) * 4 + 1], 1);
});
test('True terminal updates do not bootstrap', () => {
  const l = new Learner(), before = initialState(), after = {...initialState(), position: cell(2, 1), terminal: true};
  l.q[stateId(after) * 4] = 99;
  l.update(before, 1, -5, after);
  assert.equal(l.q[stateId(before) * 4 + 1], ALPHA * -5);
});
test('Truncated updates retain the next-state value', () => {
  const l = new Learner(), before = initialState(), after = {...initialState(), position: cell(2, 1), truncated: true};
  l.q[stateId(after) * 4] = 2;
  l.update(before, 1, 1, after);
  assert(Math.abs(l.q[stateId(before) * 4 + 1] - ALPHA * (1 + GAMMA * 2)) < 1e-6);
});
test('Seeded training is repeatable and starts with empty weights', () => {
  const a = new Learner(7), b = new Learner(7);
  assert(a.q.every(v => v === 0));
  a.train(100); b.train(100); assert.deepEqual(a.q, b.q); assert.deepEqual(a.recent, b.recent);
});
test('Epsilon decays to a nonzero floor', () => {
  const l = new Learner(); assert.equal(l.epsilon, .85);
  l.episodes = 1000; assert(l.epsilon < .3 && l.epsilon > .06);
  l.episodes = 10000; assert.equal(l.epsilon, .06);
});
test('Greedy ties and fully exploratory actions cover all directions', () => {
  const l = new Learner(), rng = random(12);
  assert.equal(new Set(Array.from({length: 200}, () => l.greedy(initialState(), rng))).size, 4);
  l.q[stateId(initialState()) * 4] = 99;
  assert.equal(new Set(Array.from({length: 200}, () => l.action(initialState(), rng, 1))).size, 4);
  assert.equal(l.action(initialState(), rng, 0), 0);
});
test('Frozen-policy watch and manual transitions leave all learning untouched', () => {
  const l = new Learner(); l.train(500);
  const q = l.q.slice(), visits = l.visits.slice(), episodes = l.episodes, recent = [...l.recent];
  rollout(l, random(1)); transition(initialState(), 1);
  assert.deepEqual(l.q, q); assert.deepEqual(l.visits, visits); assert.equal(l.episodes, episodes); assert.deepEqual(l.recent, recent);
});
test('Real training improves greedy performance across four independent seeds', () => {
  for (const seed of [1, 7, 73, 2026]) {
    const l = new Learner(seed), rng = random(900);
    const before = Array.from({length: 30}, () => rollout(l, rng)).filter(s => s.outcome === 'clear').length;
    l.train(1000);
    const after = Array.from({length: 30}, () => rollout(l, rng)).filter(s => s.outcome === 'clear').length;
    assert(after >= 27 && after > before, `seed ${seed}: ${before} → ${after}`);
    console.log(`  seed ${seed}: ${before}/30 → ${after}/30 clears after 1,000 episodes`);
  }
});
test('Statistics stay bounded; reset restores the reproducible blank model', () => {
  const l = new Learner(); l.train(1000);
  assert.equal(l.episodes, 1000); assert.equal(l.recent.length, 50);
  l.reset(); assert.equal(l.episodes, 0); assert.equal(l.recent.length, 0);
  assert(l.q.every(v => v === 0)); assert(l.visits.every(v => v === 0));
  const other = new Learner(); l.train(20); other.train(20); assert.deepEqual(l.q, other.q);
});
console.log(`${assertions} maze tests passed.`);
