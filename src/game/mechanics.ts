import type { Difficulty, HeistState } from '../types';

export const HEAT_LIMIT = 100;
export const NORMAL_ESCAPE = 1_000_000;
export const HARD_ESCAPE = 750_000;

// escapeThreshold('normal') -> 1_000_000
// escapeThreshold('hard')   ->   750_000
export function escapeThreshold(difficulty: Difficulty): number {
  return difficulty === 'hard' ? HARD_ESCAPE : NORMAL_ESCAPE;
}

// isGameOver({ heat: 100, vault_status: 'locked' })  -> true
// isGameOver({ heat:  40, vault_status: 'busted' })  -> true
export function isGameOver(state: HeistState): boolean {
  return state.heat >= HEAT_LIMIT || state.vault_status === 'busted';
}

// isTerminal({ vault_status: 'escaped' }) -> true
// isTerminal({ vault_status: 'busted'  }) -> true
export function isTerminal(state: HeistState): boolean {
  return isGameOver(state) || state.vault_status === 'escaped';
}

// isVictory({ vault_status: 'escaped', difficulty: 'hard', money:   750_000 }) -> true
// isVictory({ vault_status: 'escaped', difficulty: 'hard', money:   749_999 }) -> false
// isVictory({ vault_status: 'escaped', difficulty: 'normal', money: 1_000_000 }) -> true
export function isVictory(state: HeistState): boolean {
  return (
    state.vault_status === 'escaped' &&
    state.money >= escapeThreshold(state.difficulty)
  );
}
