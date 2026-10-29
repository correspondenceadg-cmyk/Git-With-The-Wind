"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLeaderboard = parseLeaderboard;
exports.serializeLeaderboard = serializeLeaderboard;
exports.replaceLeaderboardBlock = replaceLeaderboardBlock;
exports.recordWin = recordWin;
// Markers
const LB_START = '<!-- LEADERBOARD_START -->';
const LB_END = '<!-- LEADERBOARD_END -->';
const MAX_ENTRIES = 100;
// Parse
function parseLeaderboard(body) {
    const start = body.indexOf(LB_START);
    const end = body.indexOf(LB_END);
    if (start === -1 || end === -1 || end <= start)
        return { entries: [] };
    const json = body.slice(start + LB_START.length, end).trim();
    try {
        const parsed = JSON.parse(json);
        return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
    }
    catch {
        return { entries: [] };
    }
}
// Serialize
function serializeLeaderboard(lb) {
    return `${LB_START}\n${JSON.stringify(lb)}\n${LB_END}`;
}
function replaceLeaderboardBlock(body, lb) {
    const start = body.indexOf(LB_START);
    const end = body.indexOf(LB_END);
    const block = serializeLeaderboard(lb);
    if (start === -1 || end === -1)
        return `${body}\n\n${block}\n`;
    return `${body.slice(0, start)}${block}${body.slice(end + LB_END.length)}`;
}
// score({ money: 1_000_000, difficulty: 'hard'   }) -> 2_000_000
// score({ money: 1_000_000, difficulty: 'normal' }) -> 1_000_000
function score(entry) {
    return entry.money * (entry.difficulty === 'hard' ? 2 : 1);
}
// recordWin({ entries: [] }, { money: 1M, difficulty: 'hard' }) -> entries sorted by score desc
function recordWin(lb, entry) {
    const merged = [...lb.entries, entry]
        .sort((a, b) => score(b) - score(a))
        .slice(0, MAX_ENTRIES);
    return { entries: merged };
}
