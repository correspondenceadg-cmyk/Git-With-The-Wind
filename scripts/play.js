#!/usr/bin/env node
const { parseCommand } = require('../dist/engine/parser');
const { resolveTurn } = require('../dist/engine/resolver');
const { generateVault } = require('../dist/game/generator');
const {
  escapeThreshold,
  HEAT_LIMIT,
  isVictory,
  isTerminal,
} = require('../dist/game/mechanics');
const { DEFAULT_STATE } = require('../dist/types');

// Mirrors index.ts:applyResult + the busted flip in onComment

function applyResult(state, result, login, now) {
  const next = {
    ...state,
    money: Math.max(0, state.money + result.moneyDelta),
    heat: Math.min(HEAT_LIMIT, Math.max(0, state.heat + result.heatDelta)),
    turn: state.turn + 1,
    last_action_at: new Date(now).toISOString(),
    users: { ...state.users, [login]: now },
    resources: {
      skeleton_keys: Math.max(
        0,
        state.resources.skeleton_keys + (result.skeletonKeysDelta ?? 0)
      ),
      brute_force: Math.max(
        0,
        state.resources.brute_force + (result.bruteForceDelta ?? 0)
      ),
    },
  };
  if (result.difficulty) next.difficulty = result.difficulty;
  if (result.phaseChange) next.phase = result.phaseChange;
  if (result.unlockVault) next.vault_status = 'unlocked';
  if (result.escapeVault) next.vault_status = 'escaped';
  if (next.heat >= HEAT_LIMIT) next.vault_status = 'busted';
  return next;
}

function usd(n) {
  return '$' + n.toLocaleString();
}

function run(seed, script) {
  const layout = generateVault(seed);
  let state = { ...DEFAULT_STATE, issue_number: seed, layout };
  let now = Date.now();

  console.log(`\n-- GIT WITH THE WIND | seed ${seed} --`);
  console.log(
    `vault ${usd(layout.vaultMoney)} · ${layout.corruptGuards} corrupt guard(s) · ${layout.alarmDoors} alarm door(s)`
  );
  console.log(`goal  ${usd(escapeThreshold('normal'))}\n`);

  for (const line of script) {
    if (isTerminal(state)) {
      console.log(`> ${line}`);
      console.log(`  ${state.vault_status === 'busted' ? 'X' : '-'} terminal (${state.vault_status})\n`);
      continue;
    }
    const command = parseCommand(line);
    if (!command) {
      console.log(`> ${line}\n  X unparsed\n`);
      continue;
    }
    const turnBefore = state.turn;
    const result = resolveTurn(state, command);
    state = applyResult(state, result, 'player', now);
    now += 60_000;

    console.log(`> ${line}`);
    console.log(`  ${result.success ? '+' : 'X'} ${result.message}`);
    console.log(
      `  turn ${turnBefore} · ${usd(state.money)} · heat ${state.heat} · ${state.phase} · BF ${state.resources.brute_force} · keys ${state.resources.skeleton_keys}`
    );
    console.log('');

    if (isVictory(state)) {
      console.log(
        `>> WIN — ${state.turn - 1} turns · ${usd(state.money)} · heat ${state.heat}\n`
      );
      return;
    }
    if (state.vault_status === 'busted') {
      console.log(
        `>> BUSTED — ${state.turn - 1} turns · ${usd(state.money)} · heat ${state.heat}\n`
      );
      return;
    }
  }
  console.log(`>> RUN ENDED WITHOUT WIN OR LOSS\n`);
}

const SEQUENCE = [
  '/heist start',
  '/heist bribe insider',
  '/heist crack safe',
  '/heist crack safe',
  '/heist crack safe',
  '/heist bribe insider',
  '/heist crack safe',
  '/heist crack safe',
  '/heist escape',
];

const seed = process.env.SEED ? parseInt(process.env.SEED, 10) : 42;
run(seed, SEQUENCE);
