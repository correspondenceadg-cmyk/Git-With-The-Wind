"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HARD_ESCAPE = exports.NORMAL_ESCAPE = exports.HEAT_LIMIT = void 0;
exports.escapeThreshold = escapeThreshold;
exports.isGameOver = isGameOver;
exports.isTerminal = isTerminal;
exports.isVictory = isVictory;
exports.HEAT_LIMIT = 100;
exports.NORMAL_ESCAPE = 1_000_000;
exports.HARD_ESCAPE = 750_000;
// escapeThreshold('normal') -> 1_000_000
// escapeThreshold('hard')   ->   750_000
function escapeThreshold(difficulty) {
    return difficulty === 'hard' ? exports.HARD_ESCAPE : exports.NORMAL_ESCAPE;
}
// isGameOver({ heat: 100, vault_status: 'locked' })  -> true
// isGameOver({ heat:  40, vault_status: 'busted' })  -> true
function isGameOver(state) {
    return state.heat >= exports.HEAT_LIMIT || state.vault_status === 'busted';
}
// isTerminal({ vault_status: 'escaped' }) -> true
// isTerminal({ vault_status: 'busted'  }) -> true
function isTerminal(state) {
    return isGameOver(state) || state.vault_status === 'escaped';
}
// isVictory({ vault_status: 'escaped', difficulty: 'hard', money:   750_000 }) -> true
// isVictory({ vault_status: 'escaped', difficulty: 'hard', money:   749_999 }) -> false
// isVictory({ vault_status: 'escaped', difficulty: 'normal', money: 1_000_000 }) -> true
function isVictory(state) {
    return (state.vault_status === 'escaped' &&
        state.money >= escapeThreshold(state.difficulty));
}
