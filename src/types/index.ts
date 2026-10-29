// Shapes

export interface HeistResources {
  skeleton_keys: number;
  brute_force: number;
}

export type HeistPhase = 'infiltration' | 'vault' | 'getaway';
export type VaultStatus = 'locked' | 'unlocked' | 'escaped' | 'busted';
export type Difficulty = 'normal' | 'hard';
export type Verb = 'hack' | 'bribe' | 'crack' | 'escape' | 'start';

export interface HeistState {
  issue_number: number;
  vault_status: VaultStatus;
  money: number;
  heat: number;
  turn: number;
  phase: HeistPhase;
  difficulty: Difficulty;
  last_action_at: string;
  resources: HeistResources;
}

export interface Command {
  verb: Verb;
  target?: string;
  flags: string[];
}

export interface TurnResult {
  success: boolean;
  heatDelta: number;
  moneyDelta: number;
  message: string;
  bruteForceDelta?: number;
  skeletonKeysDelta?: number;
  phaseChange?: HeistPhase;
  difficulty?: Difficulty;
  unlockVault?: boolean;
  escapeVault?: boolean;
}

// Defaults

export const DEFAULT_STATE: HeistState = {
  issue_number: 0,
  vault_status: 'locked',
  money: 0,
  heat: 0,
  turn: 1,
  phase: 'infiltration',
  difficulty: 'normal',
  last_action_at: new Date(0).toISOString(),
  resources: {
    skeleton_keys: 0,
    brute_force: 0,
  },
};
