"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderFlavor = renderFlavor;
// renderFlavor(result) -> multi-line string for the reply comment
function renderFlavor(result) {
    const lines = [];
    lines.push(result.success ? '> SUCCESS.' : '> FAILURE.');
    lines.push(`> ${result.message}`);
    if (result.heatDelta !== 0) {
        lines.push(`> Heat ${result.heatDelta > 0 ? '+' : ''}${result.heatDelta}`);
    }
    if (result.moneyDelta !== 0) {
        lines.push(`> Loot ${result.moneyDelta > 0 ? '+' : ''}${result.moneyDelta}`);
    }
    return lines.join('\n');
}
