import type { Command, HeistState, TurnResult } from '../types';

// applyAction(state, { verb: 'hack', target: 'cctv', flags: [] })
//   -> TurnResult merged into state by the resolver
export function applyAction(_state: HeistState, command: Command): TurnResult {
  return {
    success: true,
    heatDelta: 0,
    moneyDelta: 0,
    message: `Executed ${command.verb}`,
  };
}
