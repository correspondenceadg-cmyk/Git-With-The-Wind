// Shapes

export interface HeistResources {
  skeleton_keys: number;
  brute_force: number;
}

export type HeistPhase = 'infiltration' | 'vault' | 'getaway';
export type VaultStatus = 'locked' | 'unlocked' | 'escaped';
export type Verb = 'hack' | 'bribe' | 'crack' | 'escape' | 'start';

export interface HeistState {
  vault_status: VaultStatus;
  money: number;
  heat: number;
  turn: number;
  phase: HeistPhase;
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
}

// Defaults

export const DEFAULT_STATE: HeistState = {
  vault_status: 'locked',
  money: 0,
  heat: 0,
  turn: 1,
  phase: 'infiltration',
  resources: {
    skeleton_keys: 0,
    brute_force: 0,
  },
};
