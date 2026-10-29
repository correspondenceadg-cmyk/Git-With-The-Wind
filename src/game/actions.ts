import type { Command, HeistState, TurnResult } from '../types';
import { escapeThreshold } from './mechanics';

// hack

// turn 1 roll 19 < 80           -> success, -5 heat, -1 BF
// turn 5 roll 95 >= 80          -> fail,   +10 heat, -1 BF
// target 'supply'               -> +2 BF, +10 heat, no cost
// target 'keyring'              -> +1 key, +15 heat, no cost
// target missing                -> +5 heat, no cost
// BF < 1                        -> +10 heat, no cost
export function resolveHack(state: HeistState, command: Command): TurnResult {
  if (!command.target) {
    return {
      success: false,
      heatDelta: 5,
      moneyDelta: 0,
      message: 'No target specified. The crew mutters.',
    };
  }
  const target = command.target.toLowerCase();

  if (target === 'supply') {
    return {
      success: true,
      heatDelta: 10,
      moneyDelta: 0,
      bruteForceDelta: 2,
      message: 'A supply crate falls off a truck. Two brute-force charges recovered.',
    };
  }

  if (target === 'keyring') {
    return {
      success: true,
      heatDelta: 15,
      moneyDelta: 0,
      skeletonKeysDelta: 1,
      message: 'A locksmith owes you a favor. One skeleton key acquired.',
    };
  }

  if (state.resources.brute_force < 1) {
    return {
      success: false,
      heatDelta: 10,
      moneyDelta: 0,
      message: `Brute force exhausted. Try /heist hack supply.`,
    };
  }

  const roll = (state.turn * 7919) % 100;
  if (roll < 80) {
    return {
      success: true,
      heatDelta: -5,
      moneyDelta: 0,
      bruteForceDelta: -1,
      message: `Accessing ${command.target}... BYPASSING ENCRYPTION... SUCCESS.`,
    };
  }
  return {
    success: false,
    heatDelta: 10,
    moneyDelta: 0,
    bruteForceDelta: -1,
    message: `Accessing ${command.target}... FIREWALL HARDENS. Charge spent.`,
  };
}

// bribe

// bribe guard   in getaway phase        -> refused, +0 heat, no money
// bribe guard   with $50k, 0 corrupt    -> $50k spent, -10 heat
// bribe guard   with $75k, 1 corrupt    -> $75k spent, -10 heat
// bribe guard   with $10k               -> refused, +10 heat, no money
// bribe insider turn 7 roll 13 < 15     -> double agent: -1 key, +10 heat, no phase advance
// bribe insider turn 8 roll 72 >= 15    -> -1 key, phase advances
// bribe insider in getaway              -> refused, no key
// bribe insider with 0 keys             -> refused, +5 heat, no key
export function resolveBribe(state: HeistState, command: Command): TurnResult {
  if (!command.target) {
    return {
      success: false,
      heatDelta: 5,
      moneyDelta: 0,
      message: 'No contact specified.',
    };
  }
  const target = command.target.toLowerCase();

  if (target === 'insider') {
    if (state.phase === 'getaway') {
      return {
        success: false,
        heatDelta: 0,
        moneyDelta: 0,
        message: 'The insider has no further doors to open.',
      };
    }
    if (state.resources.skeleton_keys < 1) {
      return {
        success: false,
        heatDelta: 5,
        moneyDelta: 0,
        message: 'No skeleton key to spend. Try /heist hack keyring.',
      };
    }
    const roll = (state.turn * 4259) % 100;
    if (roll < 15) {
      return {
        success: false,
        heatDelta: 10,
        moneyDelta: 0,
        skeletonKeysDelta: -1,
        message: 'The insider is a double agent. Key burned, no door opened.',
      };
    }
    const nextPhase: HeistState['phase'] =
      state.phase === 'infiltration' ? 'vault' : 'getaway';
    return {
      success: true,
      heatDelta: 0,
      moneyDelta: 0,
      skeletonKeysDelta: -1,
      phaseChange: nextPhase,
      unlockVault: nextPhase === 'vault',
      message:
        nextPhase === 'vault'
          ? 'Insider swipes you into the vault chamber.'
          : 'Insider routes you to the service exit. Phase: getaway.',
    };
  }

  if (target === 'guard') {
    if (state.phase === 'getaway') {
      return {
        success: false,
        heatDelta: 0,
        moneyDelta: 0,
        message: 'No guards between you and the exit. Try /heist escape.',
      };
    }
    const cost = Math.floor(50_000 * (1 + state.layout.corruptGuards * 0.5));
    if (state.money < cost) {
      return {
        success: false,
        heatDelta: 10,
        moneyDelta: 0,
        message: `Cannot afford the guard. Need $${cost.toLocaleString()}, have $${state.money.toLocaleString()}.`,
      };
    }
    return {
      success: true,
      heatDelta: -10,
      moneyDelta: -cost,
      message: `Guard looks the other way. Paid $${cost.toLocaleString()}.`,
    };
  }

  return {
    success: false,
    heatDelta: 5,
    moneyDelta: 0,
    message: `Unknown contact: ${command.target}. Try "guard" or "insider".`,
  };
}

// crack

// alarmDoors 1: turn 1 roll 19 < 40     -> alarm, +20 heat, -1 BF
// alarmDoors 1: turn 3 roll 57 >= 40    -> success, +5 heat, -1 BF, +vaultMoney/3
// payout uses state.layout.vaultMoney, not a fresh generateVault()
export function resolveCrack(state: HeistState, command: Command): TurnResult {
  if (!command.target) {
    return {
      success: false,
      heatDelta: 5,
      moneyDelta: 0,
      message: 'No target specified.',
    };
  }
  if (state.resources.brute_force < 1) {
    return {
      success: false,
      heatDelta: 10,
      moneyDelta: 0,
      message: `Brute force exhausted. Try /heist hack supply.`,
    };
  }
  const roll = (state.turn * 7919) % 100;
  const alarmChance = 30 + state.layout.alarmDoors * 10;
  if (roll < alarmChance) {
    return {
      success: false,
      heatDelta: 20,
      moneyDelta: 0,
      bruteForceDelta: -1,
      message: '01101000 01100101 01101100 01110000 — POLICE DISPATCHED.',
    };
  }
  return {
    success: true,
    heatDelta: 5,
    moneyDelta: Math.floor(state.layout.vaultMoney / 3),
    bruteForceDelta: -1,
    message: `${command.target} cracked. Loot secured.`,
  };
}

// escape

// normal + $1M + getaway     -> escapeVault
// hard   + $750k + getaway   -> escapeVault
// any phase != getaway       -> refused, +10 heat
// insufficient loot          -> refused, +25 heat
export function resolveEscape(state: HeistState, _command: Command): TurnResult {
  if (state.phase !== 'getaway') {
    return {
      success: false,
      heatDelta: 10,
      moneyDelta: 0,
      message: 'No exit planned. Get to the getaway phase first.',
    };
  }
  const threshold = escapeThreshold(state.difficulty);
  if (state.money < threshold) {
    return {
      success: false,
      heatDelta: 25,
      moneyDelta: 0,
      message: `Not enough loot. Need $${threshold.toLocaleString()}, have $${state.money.toLocaleString()}.`,
    };
  }
  return {
    success: true,
    heatDelta: 0,
    moneyDelta: 0,
    escapeVault: true,
    message: 'Engaging escape route. The wind is with you.',
  };
}

// start

// start              -> 6 BF, 3 keys, 0 heat
// start --hard       -> 6 BF, 3 keys, +25 heat, escape goal $750k
export function resolveStart(state: HeistState, command: Command): TurnResult {
  if (state.turn > 1) {
    return {
      success: false,
      heatDelta: 0,
      moneyDelta: 0,
      message: 'Heist already in progress.',
    };
  }
  const hard = command.flags.includes('--hard');
  return {
    success: true,
    heatDelta: hard ? 25 : 0,
    moneyDelta: 0,
    bruteForceDelta: 6,
    skeletonKeysDelta: 3,
    difficulty: hard ? 'hard' : 'normal',
    message: hard
      ? 'HARD MODE. 6 BF, 3 keys. Escape goal drops to $750k. +25 heat.'
      : 'Heist online. 6 BF, 3 keys.',
  };
}
