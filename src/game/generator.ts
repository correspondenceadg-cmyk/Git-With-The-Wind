import type { VaultLayout } from '../types';

// generateVault(42) -> { vaultMoney: ~620k, corruptGuards: 1, alarmDoors: 2 }
// generateVault(42) -> same, always
export function generateVault(seed: number): VaultLayout {
  const rng = mulberry32(seed);
  return {
    vaultMoney: Math.floor(rng() * 500_000) + 500_000,
    corruptGuards: Math.floor(rng() * 3),
    alarmDoors: Math.floor(rng() * 3) + 1,
  };
}

// mulberry32 — compact seeded PRNG so every issue is replayable
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
