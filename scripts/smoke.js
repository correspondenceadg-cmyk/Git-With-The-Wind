const assert = require('node:assert/strict');
const { parseCommand } = require('../dist/engine/parser');
const { parseState, replaceState } = require('../dist/engine/state');
const { resolveTurn } = require('../dist/engine/resolver');
const { generateVault } = require('../dist/game/generator');
const {
  isTerminal,
  isVictory,
  escapeThreshold,
} = require('../dist/game/mechanics');
const { checkRateLimit } = require('../dist/engine/ratelimit');
const { DEFAULT_STATE } = require('../dist/types');

function fresh(overrides = {}) {
  return {
    ...DEFAULT_STATE,
    issue_number: 42,
    layout: { vaultMoney: 750_000, corruptGuards: 1, alarmDoors: 1 },
    resources: { ...DEFAULT_STATE.resources },
    users: {},
    ...overrides,
  };
}

let pass = 0;
function it(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
    pass++;
  } catch (err) {
    console.log(`  FAIL ${name}`);
    console.log(`       ${err.message}`);
    process.exitCode = 1;
  }
}

// Parser

it('parseCommand /heist hack cctv', () => {
  const c = parseCommand('/heist hack cctv');
  assert.equal(c.verb, 'hack');
  assert.equal(c.target, 'cctv');
  assert.deepEqual(c.flags, []);
});

it('parseCommand /heist start --hard', () => {
  const c = parseCommand('/heist start --hard');
  assert.equal(c.verb, 'start');
  assert.equal(c.target, undefined);
  assert.deepEqual(c.flags, ['--hard']);
});

it('parseCommand rejects junk', () => {
  assert.equal(parseCommand('hello'), null);
  assert.equal(parseCommand('/heist nope'), null);
});

// State round-trip preserves layout and users

it('parseState / replaceState round-trip preserves layout and users', () => {
  const state = fresh({
    money: 500_000,
    heat: 40,
    users: { alice: 1_700_000_000_000 },
  });
  const body = `text\n${replaceState('', state).trim()}\ntext`;
  const parsed = parseState(body);
  assert.equal(parsed.money, 500_000);
  assert.deepEqual(parsed.layout, state.layout);
  assert.equal(parsed.users.alice, 1_700_000_000_000);
});

// Generator

it('generateVault deterministic on seed', () => {
  assert.deepEqual(generateVault(42), generateVault(42));
  assert.notDeepEqual(generateVault(42), generateVault(43));
});

// Start kit

it('start grants 6 BF and 3 keys', () => {
  const r = resolveTurn(fresh(), { verb: 'start', flags: [] });
  assert.equal(r.bruteForceDelta, 6);
  assert.equal(r.skeletonKeysDelta, 3);
  assert.equal(r.heatDelta, 0);
});

it('start --hard grants same kit, +25 heat', () => {
  const r = resolveTurn(fresh(), { verb: 'start', flags: ['--hard'] });
  assert.equal(r.bruteForceDelta, 6);
  assert.equal(r.skeletonKeysDelta, 3);
  assert.equal(r.heatDelta, 25);
  assert.equal(r.difficulty, 'hard');
});

// Hack roll

it('hack success at turn 1 (roll 19)', () => {
  const state = fresh({ turn: 1, resources: { skeleton_keys: 0, brute_force: 5 } });
  const r = resolveTurn(state, { verb: 'hack', target: 'cctv', flags: [] });
  assert.equal(r.success, true);
  assert.equal(r.bruteForceDelta, -1);
  assert.equal(r.heatDelta, -5);
});

it('hack fail at turn 5 (roll 95), consumes BF', () => {
  const state = fresh({ turn: 5, resources: { skeleton_keys: 0, brute_force: 5 } });
  const r = resolveTurn(state, { verb: 'hack', target: 'cctv', flags: [] });
  assert.equal(r.success, false);
  assert.equal(r.bruteForceDelta, -1);
  assert.equal(r.heatDelta, 10);
});

// Recovery

it('hack supply grants 2 BF, +10 heat', () => {
  const r = resolveTurn(fresh(), { verb: 'hack', target: 'supply', flags: [] });
  assert.equal(r.success, true);
  assert.equal(r.bruteForceDelta, 2);
  assert.equal(r.heatDelta, 10);
});

it('hack keyring grants 1 key, +15 heat', () => {
  const r = resolveTurn(fresh(), { verb: 'hack', target: 'keyring', flags: [] });
  assert.equal(r.success, true);
  assert.equal(r.skeletonKeysDelta, 1);
  assert.equal(r.heatDelta, 15);
});

// Crack roll

it('crack fail at turn 1 (roll 19 < 40), consumes BF', () => {
  const state = fresh({ turn: 1, resources: { skeleton_keys: 0, brute_force: 3 } });
  const r = resolveTurn(state, { verb: 'crack', target: 'safe', flags: [] });
  assert.equal(r.success, false);
  assert.equal(r.bruteForceDelta, -1);
  assert.equal(r.heatDelta, 20);
});

it('crack uses state.layout.vaultMoney, not regenerated', () => {
  const state = fresh({
    layout: { vaultMoney: 900_000, corruptGuards: 0, alarmDoors: 0 },
    turn: 3,
    resources: { skeleton_keys: 0, brute_force: 2 },
  });
  const r = resolveTurn(state, { verb: 'crack', target: 'safe', flags: [] });
  assert.equal(r.success, true);
  assert.equal(r.moneyDelta, 300_000);
});

// Bribe insider roll

it('bribe insider double agent at turn 7 (roll 13 < 15)', () => {
  const state = fresh({
    turn: 7,
    phase: 'infiltration',
    resources: { skeleton_keys: 2, brute_force: 0 },
  });
  const r = resolveTurn(state, { verb: 'bribe', target: 'insider', flags: [] });
  assert.equal(r.success, false);
  assert.equal(r.skeletonKeysDelta, -1);
  assert.equal(r.heatDelta, 10);
});

it('bribe insider succeeds at turn 8 (roll 72)', () => {
  const state = fresh({
    turn: 8,
    phase: 'infiltration',
    resources: { skeleton_keys: 2, brute_force: 0 },
  });
  const r = resolveTurn(state, { verb: 'bribe', target: 'insider', flags: [] });
  assert.equal(r.success, true);
  assert.equal(r.phaseChange, 'vault');
  assert.equal(r.skeletonKeysDelta, -1);
});

it('bribe insider refused in getaway, no key consumed', () => {
  const state = fresh({
    phase: 'getaway',
    resources: { skeleton_keys: 2, brute_force: 0 },
  });
  const r = resolveTurn(state, { verb: 'bribe', target: 'insider', flags: [] });
  assert.equal(r.success, false);
  assert.equal(r.skeletonKeysDelta, undefined);
});

// Bribe guard

it('bribe guard refused in getaway, no money spent', () => {
  const state = fresh({ phase: 'getaway', money: 500_000 });
  const r = resolveTurn(state, { verb: 'bribe', target: 'guard', flags: [] });
  assert.equal(r.success, false);
  assert.equal(r.heatDelta, 0);
  assert.equal(r.moneyDelta, 0);
});

it('bribe guard scales with layout.corruptGuards', () => {
  const state = fresh({
    layout: { vaultMoney: 750_000, corruptGuards: 2, alarmDoors: 1 },
    money: 200_000,
  });
  const r = resolveTurn(state, { verb: 'bribe', target: 'guard', flags: [] });
  assert.equal(r.success, true);
  assert.equal(r.moneyDelta, -100_000);
});

// Escape branches

it('clean escape: getaway, loot, low heat', () => {
  const r = resolveTurn(
    fresh({ money: 1_500_000, phase: 'getaway', heat: 10 }),
    { verb: 'escape', flags: [] }
  );
  assert.equal(r.success, true);
  assert.equal(r.escapeVault, true);
  assert.match(r.message, /Clean getaway/);
});

it('messy escape: getaway, loot, high heat', () => {
  const r = resolveTurn(
    fresh({ money: 1_500_000, phase: 'getaway', heat: 60 }),
    { verb: 'escape', flags: [] }
  );
  assert.equal(r.success, true);
  assert.equal(r.escapeVault, true);
  assert.match(r.message, /Messy escape/);
});

it('wimpy escape: wrong phase', () => {
  const r = resolveTurn(
    fresh({ money: 2_000_000, phase: 'vault', heat: 10 }),
    { verb: 'escape', flags: [] }
  );
  assert.equal(r.success, true);
  assert.equal(r.escapeVault, true);
  assert.match(r.message, /Wimpy escape/);
});

it('wimpy escape: insufficient loot', () => {
  const r = resolveTurn(
    fresh({ money: 200_000, phase: 'getaway', heat: 10 }),
    { verb: 'escape', flags: [] }
  );
  assert.equal(r.success, true);
  assert.equal(r.escapeVault, true);
  assert.match(r.message, /Wimpy escape/);
});

it('escape threshold: normal $1M, hard $750k', () => {
  assert.equal(escapeThreshold('normal'), 1_000_000);
  assert.equal(escapeThreshold('hard'), 750_000);
});

it('isVictory on any escape', () => {
  assert.equal(isVictory(fresh({ vault_status: 'escaped', money: 0 })), true);
  assert.equal(isVictory(fresh({ vault_status: 'escaped', money: 1_000_000 })), true);
});

// Rate limit

it('checkRateLimit 30s ago rejected', () => {
  const now = Date.now();
  const r = checkRateLimit(now - 30_000, now);
  assert.equal(r.allowed, false);
  assert.ok((r.retryAfterMs ?? 0) > 0);
});

it('checkRateLimit 90s ago allowed', () => {
  const r = checkRateLimit(Date.now() - 90_000, Date.now());
  assert.equal(r.allowed, true);
});

it('checkRateLimit null allowed', () => {
  assert.equal(checkRateLimit(null, Date.now()).allowed, true);
});

// Terminal

it('isTerminal busted', () => {
  assert.equal(isTerminal(fresh({ vault_status: 'busted' })), true);
});

console.log(`\n${pass} checks passed`);
