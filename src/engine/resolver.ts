import type { Command, HeistState, TurnResult } from '../types';

// resolveTurn(state, { verb: 'hack', target: 'cctv', flags: [] })
//   -> { success: true, heatDelta: -5, moneyDelta: 0, message: '...' }
export function resolveTurn(_state: HeistState, command: Command): TurnResult {
  return {
    success: true,
    heatDelta: 0,
    moneyDelta: 0,
    message: `Command received: ${command.verb}${command.target ? ' ' + command.target : ''}`,
  };
}
