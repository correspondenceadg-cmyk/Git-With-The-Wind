import type { HeistState } from '../types';

const HEAT_LIMIT = 100;
const ESCAPE_THRESHOLD = 1_000_000;

// isGameOver({ heat: 100, vault_status: 'locked', ... })  -> true
// isGameOver({ heat:  40, vault_status: 'busted', ... })  -> true
export function isGameOver(state: HeistState): boolean {
  return state.heat >= HEAT_LIMIT || state.vault_status === 'busted';
}

// isTerminal({ vault_status: 'escaped', ... }) -> true
// isTerminal({ vault_status: 'busted',  ... }) -> true
export function isTerminal(state: HeistState): boolean {
  return isGameOver(state) || state.vault_status === 'escaped';
}

// isVictory({ vault_status: 'escaped', money: 1_000_000, ... }) -> true
export function isVictory(state: HeistState): boolean {
  return state.vault_status === 'escaped' && state.money >= ESCAPE_THRESHOLD;
}

export { HEAT_LIMIT, ESCAPE_THRESHOLD };
