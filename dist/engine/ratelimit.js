"use strict";
// Config
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
const TURN_INTERVAL_MS = Number(process.env.HEIST_TURN_INTERVAL_MS ?? 60_000);
const COMMENT_INTERVAL_MS = Number(process.env.HEIST_COMMENT_INTERVAL_MS ?? 5_000);
const PREVENT_SPAM = process.env.PREVENT_SPAM !== 'false';
// checkRateLimit(lastActionAt, lastCommentAt, now) with defaults
//   -> { allowed: false, reason: 'The crew is already moving. Wait a moment.', retryAfterMs: 34000 }
function checkRateLimit(lastActionAt, lastCommentAt, now) {
    if (!PREVENT_SPAM)
        return { allowed: true };
    if (lastActionAt !== null && now - lastActionAt < TURN_INTERVAL_MS) {
        return {
            allowed: false,
            reason: 'The crew is already moving. Wait a moment.',
            retryAfterMs: TURN_INTERVAL_MS - (now - lastActionAt),
        };
    }
    if (lastCommentAt !== null && now - lastCommentAt < COMMENT_INTERVAL_MS) {
        return {
            allowed: false,
            reason: 'Slow down — too many keystrokes.',
            retryAfterMs: COMMENT_INTERVAL_MS - (now - lastCommentAt),
        };
    }
    return { allowed: true };
}
