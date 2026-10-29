"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTurn = resolveTurn;
const actions_1 = require("../game/actions");
// resolveTurn(state, { verb: 'hack', target: 'cctv', flags: [] })
//   -> { success: true, heatDelta: -5, moneyDelta: 0, message: '...', bruteForceDelta: -1 }
function resolveTurn(state, command) {
    switch (command.verb) {
        case 'hack':
            return (0, actions_1.resolveHack)(state, command);
        case 'bribe':
            return (0, actions_1.resolveBribe)(state, command);
        case 'crack':
            return (0, actions_1.resolveCrack)(state, command);
        case 'escape':
            return (0, actions_1.resolveEscape)(state, command);
        case 'start':
            return (0, actions_1.resolveStart)(state, command);
    }
}
