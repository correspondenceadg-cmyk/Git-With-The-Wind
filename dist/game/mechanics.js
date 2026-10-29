"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESCAPE_THRESHOLD = exports.HEAT_LIMIT = void 0;
exports.isGameOver = isGameOver;
exports.isTerminal = isTerminal;
exports.isVictory = isVictory;
const HEAT_LIMIT = 100;
exports.HEAT_LIMIT = HEAT_LIMIT;
const ESCAPE_THRESHOLD = 1_000_000;
exports.ESCAPE_THRESHOLD = ESCAPE_THRESHOLD;
// isGameOver({ heat: 100, vault_status: 'locked', ... })  -> true
// isGameOver({ heat:  40, vault_status: 'busted', ... })  -> true
function isGameOver(state) {
    return state.heat >= HEAT_LIMIT || state.vault_status === 'busted';
}
// isTerminal({ vault_status: 'escaped', ... }) -> true
// isTerminal({ vault_status: 'busted',  ... }) -> true
function isTerminal(state) {
    return isGameOver(state) || state.vault_status === 'escaped';
}
// isVictory({ vault_status: 'escaped', money: 1_000_000, ... }) -> true
function isVictory(state) {
    return state.vault_status === 'escaped' && state.money >= ESCAPE_THRESHOLD;
}
