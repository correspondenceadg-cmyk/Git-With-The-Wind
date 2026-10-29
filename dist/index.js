"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const state_1 = require("./engine/state");
const parser_1 = require("./engine/parser");
const resolver_1 = require("./engine/resolver");
const flavor_1 = require("./engine/flavor");
const ratelimit_1 = require("./engine/ratelimit");
const mechanics_1 = require("./game/mechanics");
const generator_1 = require("./game/generator");
const leaderboard_1 = require("./game/leaderboard");
const types_1 = require("./types");
// Entry
async function main() {
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
function labelNames(issue) {
    const raw = issue?.labels ?? [];
    return raw.map((l) => (typeof l === 'string' ? l : (l.name ?? '')));
}
async function onIssueOpened(octokit, repo, issue) {
    if (!issue)
        return;
    if (labelNames(issue).includes('leaderboard')) {
        core.info('Leaderboard issue — not seeding a vault.');
        return;
    }
    const layout = (0, generator_1.generateVault)(issue.number);
    const initialState = { ...types_1.DEFAULT_STATE, issue_number: issue.number };
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
async function onComment(octokit, repo, issue, comment) {
    if (!issue || !comment)
        return;
    if (comment.user?.type === 'Bot')
        return;
    if (labelNames(issue).includes('leaderboard'))
        return;
    const command = (0, parser_1.parseCommand)(comment.body ?? '');
    if (!command)
        return;
    const body = issue.body ?? '';
    const state = (0, state_1.parseState)(body);
    if (!state) {
        core.info('No state block on issue, skipping.');
        return;
    }
    if ((0, mechanics_1.isTerminal)(state)) {
        await reply(octokit, repo, issue.number, terminalMessage(state));
        return;
    }
    const now = Date.now();
    const lastActionAt = new Date(state.last_action_at).getTime();
    const verdict = (0, ratelimit_1.checkRateLimit)(lastActionAt, null, now);
    if (!verdict.allowed) {
        await reply(octokit, repo, issue.number, verdict.reason ?? 'Rate limited.');
        return;
    }
    const result = (0, resolver_1.resolveTurn)(state, command);
    const nextState = applyResult(state, result);
    if (nextState.heat >= mechanics_1.HEAT_LIMIT) {
        nextState.vault_status = 'busted';
    }
    const nextBody = (0, state_1.replaceState)(body, nextState);
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
    await reply(octokit, repo, issue.number, (0, flavor_1.renderFlavor)(result));
    if ((0, mechanics_1.isVictory)(nextState)) {
        await recordVictory(octokit, repo, comment.user?.login ?? 'unknown', nextState);
    }
}
// State application
// applyResult({ money: 50000, heat: 20, turn: 1 }, { moneyDelta: 100000, heatDelta: 5, turn + 1 })
//   -> { money: 150000, heat: 25, turn: 2, last_action_at: <now> }
function applyResult(state, result) {
    const next = {
        ...state,
        money: Math.max(0, state.money + result.moneyDelta),
        heat: Math.min(mechanics_1.HEAT_LIMIT, Math.max(0, state.heat + result.heatDelta)),
        turn: state.turn + 1,
        last_action_at: new Date().toISOString(),
        resources: {
            skeleton_keys: Math.max(0, state.resources.skeleton_keys + (result.skeletonKeysDelta ?? 0)),
            brute_force: Math.max(0, state.resources.brute_force + (result.bruteForceDelta ?? 0)),
        },
    };
    if (result.difficulty)
        next.difficulty = result.difficulty;
    if (result.phaseChange)
        next.phase = result.phaseChange;
    if (result.unlockVault)
        next.vault_status = 'unlocked';
    if (result.escapeVault)
        next.vault_status = 'escaped';
    return next;
}
// Leaderboard
async function recordVictory(octokit, repo, username, state) {
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
    const lb = (0, leaderboard_1.parseLeaderboard)(lbIssue.body ?? '');
    const updated = (0, leaderboard_1.recordWin)(lb, {
        username,
        money: state.money,
        turns: state.turn,
        wonAt: new Date().toISOString(),
    });
    await octokit.rest.issues.update({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: lbIssue.number,
        body: (0, leaderboard_1.replaceLeaderboardBlock)(lbIssue.body ?? '', updated),
    });
}
// Reply
async function reply(octokit, repo, issueNumber, body) {
    await octokit.rest.issues.createComment({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: issueNumber,
        body,
    });
}
// Terminal rendering
// renderBusted({ heat: 100, money: 350000, turn: 18 }) -> police banner + crew in custody
function renderBusted(state) {
    return [
        '```',
        '🚨 POLICE ARRIVED 🚨',
        '```',
        '',
        `> Heat: ${state.heat}/${mechanics_1.HEAT_LIMIT}`,
        `> Loot secured: $${state.money.toLocaleString()}`,
        `> Turns survived: ${state.turn}`,
        '',
        'The crew is in custody. Open a new issue to run another job.',
    ].join('\n');
}
function terminalMessage(state) {
    if (state.vault_status === 'busted') {
        return '🚔 The crew is in custody. Open a new issue to run another job.';
    }
    if (state.vault_status === 'escaped') {
        return '🏁 The job is done. Open a new issue to run another heist.';
    }
    return 'The job is over.';
}
// Vault body
function renderVaultBody(state, layout) {
    return [
        '# 🏦 The Vault',
        '',
        '```',
        '        _______________________',
        '       /                       \\',
        '      |   [##]  [##]  [##]  [##] |',
        '      |   [##]   SAFE   [##]  [##] |',
        '      |   [##]  [##]  [##]  [##] |',
        '       \\_______________________/',
        '```',
        '',
        `**Layout preview:** $${layout.vaultMoney.toLocaleString()} behind the safe · ${layout.corruptGuards} corrupt guard(s) · ${layout.alarmDoors} alarm door(s)`,
        '',
        (0, state_1.replaceState)('', state).trim(),
        '',
        'Comment `/heist <verb> <target>` to act. Start with `/heist start` or `/heist start --hard`.',
    ].join('\n');
}
main().catch((err) => {
    core.setFailed(err instanceof Error ? err.message : String(err));
});
