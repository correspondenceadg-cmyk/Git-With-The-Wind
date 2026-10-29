import type { TurnResult } from '../types';

// renderFlavor(result) -> multi-line string for the reply comment
export function renderFlavor(result: TurnResult): string {
  const lines: string[] = [];
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
