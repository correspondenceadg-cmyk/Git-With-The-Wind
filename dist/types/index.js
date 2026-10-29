"use strict";
// Shapes
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_STATE = void 0;
// Defaults
exports.DEFAULT_STATE = {
    issue_number: 0,
    vault_status: 'locked',
    money: 0,
    heat: 0,
    turn: 1,
    phase: 'infiltration',
    difficulty: 'normal',
    last_action_at: new Date(0).toISOString(),
    resources: {
        skeleton_keys: 0,
        brute_force: 0,
    },
};
