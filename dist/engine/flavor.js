"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderFlavor = renderFlavor;
// renderFlavor({ success: true, message: '...', heatDelta: -5 })
//   -> "> [SUCCESS] ... \n> Heat -5"
function renderFlavor(result) {
    const lines = [];
    if (result.success) {
        lines.push('```');
        lines.push('> ACCESS GRANTED');
        lines.push('```');
        lines.push(`> ${result.message}`);
    }
    else {
        lines.push('```');
        lines.push('> 01100101 01110010 01110010 01101111 01110010');
        lines.push('```');
        lines.push(`> ${result.message}`);
    }
    if (result.heatDelta !== 0) {
        lines.push(`> Heat ${result.heatDelta > 0 ? '+' : ''}${result.heatDelta}`);
    }
    if (result.moneyDelta !== 0) {
        lines.push(`> Loot ${result.moneyDelta > 0 ? '+' : ''}$${Math.abs(result.moneyDelta).toLocaleString()}`);
    }
    return lines.join('\n');
}
