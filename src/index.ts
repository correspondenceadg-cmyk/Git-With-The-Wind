import * as core from '@actions/core';
import * as github from '@actions/github';
import { parseState, replaceState } from './engine/state';
import { parseCommand } from './engine/parser';
import { resolveTurn } from './engine/resolver';
import { renderFlavor } from './engine/flavor';
import { checkRateLimit } from './engine/ratelimit';
import { HEAT_LIMIT, isTerminal, isVictory } from './game/mechanics';
import { generateVault } from './game/generator';
import {
  parseLeaderboard,
  recordWin,
  replaceLeaderboardBlock,
} from './game/leaderboard';
import {
  DEFAULT_STATE,
  type HeistState,
  type TurnResult,
  type VaultLayout,
} from './types';

type Octokit = ReturnType<typeof github.getOctokit>;
type Repo = { owner: string; repo: string };

// Entry

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    core.setFailed('GITHUB_TOKEN missing');
    return;
  }

  const octokit = github.getOctokit(token);
  const { eventName, repo, payload } = github.context;

  if (eventName === 'issues' && payload.action === 'opened') {
    await onIssueOpened(octokit, repo, payload.issue);
    return;
  }

  if (eventName === 'issue_comment' && payload.action === 'created') {
    await onComment(octokit, repo, payload.issue, payload.comment);
    return;
  }
}

// Issue opened -> seed vault

function labelNames(issue: typeof github.context.payload.issue): string[] {
  const raw: Array<string | { name?: string }> = issue?.labels ?? [];
  return raw.map((l) => (typeof l === 'string' ? l : (l.name ?? '')));
}

function isLeaderboard(issue: typeof github.context.payload.issue): boolean {
  if (!issue) return false;
  if (labelNames(issue).includes('leaderboard')) return true;
  return (issue.body ?? '').includes('<!-- LEADERBOARD_START -->');
}

async function onIssueOpened(
  octokit: Octokit,
  repo: Repo,
  issue: typeof github.context.payload.issue
): Promise<void> {
  if (!issue) return;
  if (isLeaderboard(issue)) {
    core.info('Leaderboard issue — not seeding a vault.');
    return;
  }
  const layout = generateVault(issue.number);
  const initialState: HeistState = {
    ...DEFAULT_STATE,
    issue_number: issue.number,
    layout,
  };
  const body = renderVaultBody(initialState, layout);
  await octokit.rest.issues.update({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
    body,
  });
  core.info(`Vault seeded: ${JSON.stringify(layout)}`);
}

// Comment -> turn

async function onComment(
  octokit: Octokit,
  repo: Repo,
  issue: typeof github.context.payload.issue,
  comment: typeof github.context.payload.comment
): Promise<void> {
  if (!issue || !comment) return;
  if (comment.user?.type === 'Bot') return;
  if (isLeaderboard(issue)) return;

  const command = parseCommand(comment.body ?? '');
  if (!command) return;

  const body = issue.body ?? '';
  const state = parseState(body);
  if (!state) {
    core.info('No state block on issue, skipping.');
    return;
  }

  if (isTerminal(state)) {
    await reply(octokit, repo, issue.number, terminalMessage(state));
    return;
  }

  const login = comment.user?.login ?? 'anonymous';
  const now = Date.now();
  const userLast = state.users[login] ?? null;
  const verdict = checkRateLimit(userLast, now);
  if (!verdict.allowed) {
    await reply(octokit, repo, issue.number, verdict.reason ?? 'Rate limited.');
    return;
  }

  const result = resolveTurn(state, command);
  const nextState = applyResult(state, result, login, now);
  if (nextState.heat >= HEAT_LIMIT) {
    nextState.vault_status = 'busted';
  }

  const nextBody = replaceState(body, nextState);
  await octokit.rest.issues.update({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
    body: nextBody,
  });

  if (nextState.vault_status === 'busted') {
    await reply(octokit, repo, issue.number, renderBusted(nextState));
    return;
  }

  await reply(octokit, repo, issue.number, renderFlavor(result));

  if (isVictory(nextState)) {
    await recordVictory(octokit, repo, login, nextState);
  }
}

// State application

function applyResult(
  state: HeistState,
  result: TurnResult,
  login: string,
  now: number
): HeistState {
  const next: HeistState = {
    ...state,
    money: Math.max(0, state.money + result.moneyDelta),
    heat: Math.min(HEAT_LIMIT, Math.max(0, state.heat + result.heatDelta)),
    turn: state.turn + 1,
    last_action_at: new Date(now).toISOString(),
    users: { ...state.users, [login]: now },
    resources: {
      skeleton_keys: Math.max(
        0,
        state.resources.skeleton_keys + (result.skeletonKeysDelta ?? 0)
      ),
      brute_force: Math.max(
        0,
        state.resources.brute_force + (result.bruteForceDelta ?? 0)
      ),
    },
  };
  if (result.difficulty) next.difficulty = result.difficulty;
  if (result.phaseChange) next.phase = result.phaseChange;
  if (result.unlockVault) next.vault_status = 'unlocked';
  if (result.escapeVault) next.vault_status = 'escaped';
  return next;
}

// Leaderboard

async function recordVictory(
  octokit: Octokit,
  repo: Repo,
  username: string,
  state: HeistState
): Promise<void> {
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner: repo.owner,
    repo: repo.repo,
    labels: 'leaderboard',
    state: 'open',
    per_page: 1,
  });
  if (issues.length === 0) {
    core.info('No leaderboard issue — skipping.');
    return;
  }
  const lbIssue = issues[0];
  const lb = parseLeaderboard(lbIssue.body ?? '');
  const updated = recordWin(lb, {
    username,
    money: state.money,
    turns: state.turn,
    difficulty: state.difficulty,
    wonAt: new Date().toISOString(),
  });
  await octokit.rest.issues.update({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: lbIssue.number,
    body: replaceLeaderboardBlock(lbIssue.body ?? '', updated),
  });
}

// Reply

async function reply(
  octokit: Octokit,
  repo: Repo,
  issueNumber: number,
  body: string
): Promise<void> {
  await octokit.rest.issues.createComment({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issueNumber,
    body,
  });
}

// Terminal rendering

function renderBusted(state: HeistState): string {
  return [
    '```',
    '🚨 POLICE ARRIVED 🚨',
    '```',
    '',
    `> Heat: ${state.heat}/${HEAT_LIMIT}`,
    `> Loot secured: $${state.money.toLocaleString()}`,
    `> Turns survived: ${state.turn}`,
    '',
    'The crew is in custody. Open a new issue to run another job.',
  ].join('\n');
}

function terminalMessage(state: HeistState): string {
  if (state.vault_status === 'busted') {
    return '🚔 The crew is in custody. Open a new issue to run another job.';
  }
  if (state.vault_status === 'escaped') {
    return '🏁 The job is done. Open a new issue to run another heist.';
  }
  return 'The job is over.';
}

// Vault body

function renderVaultBody(state: HeistState, layout: VaultLayout): string {
  const isOpen = state.vault_status === 'unlocked' || state.vault_status === 'escaped';
  
  const art = isOpen ? [
    '        _______________________',
    '       /                       \\',
    '      |   [##]  [##]  [##]  [##] |',
    '      |   [##]  \\_/    [##]  [##] |',
    '      |   [##]  [##]  [##]  [##] |',
    '       \\_______________________/',
    '         [ VAULT UNLOCKED ]'
  ] : [
    '        _______________________',
    '       /                       \\',
    '      |   [##]  [##]  [##]  [##] |',
    '      |   [##]   SAFE   [##]  [##] |',
    '      |   [##]  [##]  [##]  [##] |',
    '       \\_______________________/',
    '         [ VAULT LOCKED ]'
  ];

  return [
    '# 🏦 The Vault',
    '',
    '```',
    ...art,
    '```',
    '',
    `**Status:** ${state.vault_status.toUpperCase()} · **Phase:** ${state.phase}`,
    `**Layout:** $${layout.vaultMoney.toLocaleString()} · ${layout.corruptGuards} corrupt guard(s) · ${layout.alarmDoors} alarm door(s)`,
    '',
    replaceState('', state).trim(),
    '',
    'Comment `/heist <verb> <target>` to act. Start with `/heist start` or `/heist start --hard`.',
  ].join('\n');
}

main().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
