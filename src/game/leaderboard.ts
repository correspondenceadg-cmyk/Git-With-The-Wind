// Shapes

export interface LeaderboardEntry {
  username: string;
  money: number;
  turns: number;
  wonAt: string;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
}

// Markers

const LB_START = '<!-- LEADERBOARD_START -->';
const LB_END = '<!-- LEADERBOARD_END -->';
const MAX_ENTRIES = 100;

// Parse

// parseLeaderboard('...<!-- LEADERBOARD_START -->{"entries":[]}<!-- LEADERBOARD_END -->...')
//   -> { entries: [] }
export function parseLeaderboard(body: string): Leaderboard {
  const start = body.indexOf(LB_START);
  const end = body.indexOf(LB_END);
  if (start === -1 || end === -1 || end <= start) return { entries: [] };
  const json = body.slice(start + LB_START.length, end).trim();
  try {
    const parsed = JSON.parse(json) as Partial<Leaderboard>;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

// Serialize

export function serializeLeaderboard(lb: Leaderboard): string {
  return `${LB_START}\n${JSON.stringify(lb)}\n${LB_END}`;
}

// replaceLeaderboardBlock(body, lb) -> body with the hidden block overwritten
export function replaceLeaderboardBlock(body: string, lb: Leaderboard): string {
  const start = body.indexOf(LB_START);
  const end = body.indexOf(LB_END);
  const block = serializeLeaderboard(lb);
  if (start === -1 || end === -1) return `${body}\n\n${block}\n`;
  return `${body.slice(0, start)}${block}${body.slice(end + LB_END.length)}`;
}

// recordWin({ entries: [{ money: 500000 }] }, { money: 1000000 }) -> sorted, entry inserted
export function recordWin(lb: Leaderboard, entry: LeaderboardEntry): Leaderboard {
  const merged = [...lb.entries, entry]
    .sort((a, b) => b.money - a.money)
    .slice(0, MAX_ENTRIES);
  return { entries: merged };
}
