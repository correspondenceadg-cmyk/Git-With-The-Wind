// Config

const TURN_INTERVAL_MS = Number(process.env.HEIST_TURN_INTERVAL_MS ?? 60_000);
const PREVENT_SPAM = process.env.PREVENT_SPAM !== 'false';

export interface RateLimitVerdict {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
}

// checkRateLimit(now - 30_000, now)  -> { allowed: false, retryAfterMs: 30_000 }
// checkRateLimit(now - 90_000, now)  -> { allowed: true }
// checkRateLimit(null,        now)  -> { allowed: true }
export function checkRateLimit(
  lastActionAt: number | null,
  now: number
): RateLimitVerdict {
  if (!PREVENT_SPAM) return { allowed: true };

  if (lastActionAt !== null && now - lastActionAt < TURN_INTERVAL_MS) {
    const retryAfterMs = TURN_INTERVAL_MS - (now - lastActionAt);
    return {
      allowed: false,
      reason: `The crew is already moving. Wait ${Math.ceil(retryAfterMs / 1000)}s.`,
      retryAfterMs,
    };
  }

  return { allowed: true };
}
