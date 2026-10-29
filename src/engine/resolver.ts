import type { Command, HeistState, TurnResult } from '../types';
import {
  resolveHack,
  resolveBribe,
  resolveCrack,
  resolveEscape,
  resolveStart,
} from '../game/actions';

// resolveTurn(state, { verb: 'hack', target: 'cctv', flags: [] })
//   -> { success: true, heatDelta: -5, moneyDelta: 0, message: '...', bruteForceDelta: -1 }
export function resolveTurn(state: HeistState, command: Command): TurnResult {
  switch (command.verb) {
    case 'hack':
      return resolveHack(state, command);
    case 'bribe':
      return resolveBribe(state, command);
    case 'crack':
      return resolveCrack(state, command);
    case 'escape':
      return resolveEscape(state, command);
    case 'start':
      return resolveStart(state, command);
  }
}
