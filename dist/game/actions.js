"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHack = resolveHack;
exports.resolveBribe = resolveBribe;
exports.resolveCrack = resolveCrack;
exports.resolveEscape = resolveEscape;
exports.resolveStart = resolveStart;
const generator_1 = require("./generator");
// hack
// resolveHack({ resources: { brute_force: 1 } }, { target: 'cctv' })
//   -> { success: true, heatDelta: -5, bruteForceDelta: -1, ... }
function resolveHack(state, command) {
    if (!command.target) {
        return {
            success: false,
            heatDelta: 5,
            moneyDelta: 0,
            message: 'No target specified. The sysadmin notices your keystrokes.',
        };
    }
    if (state.resources.brute_force < 1) {
        return {
            success: false,
            heatDelta: 10,
            moneyDelta: 0,
            message: `Brute force exhausted. ${command.target} holds.`,
        };
    }
    return {
        success: true,
        heatDelta: -5,
        moneyDelta: 0,
        bruteForceDelta: -1,
        message: `Accessing ${command.target}... BYPASSING ENCRYPTION... SUCCESS.`,
    };
}
// bribe
// bribe guard   with corruptGuards=0 -> costs $50,000, heat -10
// bribe guard   with corruptGuards=2 -> costs $100,000, heat -10
// bribe insider with 1 skeleton key   -> key -1, phase advances, no money
// bribe insider with 0 skeleton keys  -> rejected, heat +5
// bribe intern                        -> rejected, heat +5
function resolveBribe(state, command) {
    if (!command.target) {
        return {
            success: false,
            heatDelta: 5,
            moneyDelta: 0,
            message: 'No contact specified. The crew mutters.',
        };
    }
    const target = command.target.toLowerCase();
    if (target === 'insider') {
        if (state.resources.skeleton_keys < 1) {
            return {
                success: false,
                heatDelta: 5,
                moneyDelta: 0,
                message: 'No skeleton key to spend. The insider ghosts you.',
            };
        }
        if (state.phase === 'getaway') {
            return {
                success: false,
                heatDelta: 0,
                moneyDelta: 0,
                message: 'The insider has no further doors to open.',
            };
        }
        const nextPhase = state.phase === 'infiltration' ? 'vault' : 'getaway';
        return {
            success: true,
            heatDelta: 0,
            moneyDelta: 0,
            skeletonKeysDelta: -1,
            phaseChange: nextPhase,
            unlockVault: nextPhase === 'vault',
            message: nextPhase === 'vault'
                ? 'Insider swipes you into the vault chamber. Vault unlocked.'
                : 'Insider routes you to the service exit. Phase: getaway.',
        };
    }
    if (target !== 'guard') {
        return {
            success: false,
            heatDelta: 5,
            moneyDelta: 0,
            message: `Unknown contact: ${command.target}. Try "guard" or "insider".`,
        };
    }
    const layout = (0, generator_1.generateVault)(state.issue_number);
    const cost = Math.floor(50_000 * (1 + layout.corruptGuards * 0.5));
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
// crack
// resolveCrack({ issue_number: 42, turn: 7 }, { target: 'safe' })
//   -> success pays Math.floor(layout.vaultMoney / 10), always grants +1 brute force
//   -> alarm roll scales with layout.alarmDoors
function resolveCrack(state, command) {
    if (!command.target) {
        return {
            success: false,
            heatDelta: 5,
            moneyDelta: 0,
            message: 'No target specified.',
        };
    }
    const layout = (0, generator_1.generateVault)(state.issue_number);
    const roll = (state.turn * 7919) % 100;
    const alarmChance = 30 + layout.alarmDoors * 10;
    if (roll < alarmChance) {
        return {
            success: false,
            heatDelta: 20,
            moneyDelta: 0,
            message: '01101000 01100101 01101100 01110000 — POLICE DISPATCHED.',
        };
    }
    return {
        success: true,
        heatDelta: 5,
        moneyDelta: Math.floor(layout.vaultMoney / 10),
        bruteForceDelta: 1,
        message: `${command.target} cracked. Loot secured, and the shrapnel yields a brute-force charge.`,
    };
}
// escape
// resolveEscape({ money: 1500000 }, {}) -> { success: true, escapeVault: true, ... }
function resolveEscape(state, _command) {
    if (state.money < 1_000_000) {
        return {
            success: false,
            heatDelta: 25,
            moneyDelta: 0,
            message: `Not enough loot. Need $1M, have $${state.money.toLocaleString()}.`,
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
// resolveStart({ turn: 1 }, { flags: [] })          -> grants 2 brute force, 1 key
// resolveStart({ turn: 1 }, { flags: ['--hard'] })  -> same kit, +25 starting heat
function resolveStart(state, command) {
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
        bruteForceDelta: 2,
        skeletonKeysDelta: 1,
        difficulty: hard ? 'hard' : 'normal',
        message: hard
            ? 'HARD MODE. 2 brute force, 1 skeleton key issued. The crew curses your name.'
            : 'Heist online. 2 brute force, 1 skeleton key issued.',
    };
}
