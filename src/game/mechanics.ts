import type { HeistState } from '../types';

const HEAT_LIMIT = 100;
const ESCAPE_THRESHOLD = 1_000_000;

// isGameOver({ heat: 100, ... }) -> true
export function isGameOver(state: HeistState): boolean {
  return state.heat >= HEAT_LIMIT;
}

// isVictory({ vault_status: 'escaped', money: 1_000_000, ... }) -> true
export function isVictory(state: HeistState): boolean {
  return state.vault_status === 'escaped' && state.money >= ESCAPE_THRESHOLD;
}
