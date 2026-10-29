# 🏦 Git With The Wind

A serverless multiplayer heist game. No web server. No database. **GitHub Issues are the DB. GitHub Actions are the backend.**

![Active Heists](https://img.shields.io/github/issues/correspondenceadg-cmyk/git-with-the-wind?style=flat-square&label=Active%20Heists)
![Last Commit](https://img.shields.io/github/last-commit/correspondenceadg-cmyk/git-with-the-wind?style=flat-square)
![Language](https://img.shields.io/github/languages/top/correspondenceadg-cmyk/git-with-the-wind?style=flat-square)

## How to Play

1. Open a new issue (any title, empty body). The engine overwrites it with the vault.
2. Comment `/heist start` — or `/heist start --hard` for New Game+.
3. Every subsequent comment is a turn. Reach the loot goal in a getaway phase and `/heist escape` before **Heat hits 100**.

One turn per 60 seconds **per user** per issue.

## Starting Kit

| Mode | BF | Keys | Starting Heat | Escape Goal |
|---|---|---|---|---|
| `start` | 6 | 3 | 0 | $1,000,000 |
| `start --hard` | 6 | 3 | 25 | $750,000 |

6 BF and 3 keys is enough to survive two item-consuming failures and still win. If you burn through it, `hack supply` and `hack keyring` refill — at a heat cost.

## Commands

| Command | Cost | Effect |
|---|---|---|
| `/heist hack <target>` | 1 BF | 80% success: −5 heat. 20% fail: +10 heat, BF still spent |
| `/heist hack supply` | — | +2 BF, +10 heat. Always succeeds. Recovery for out-of-BF |
| `/heist hack keyring` | — | +1 key, +15 heat. Always succeeds. Recovery for out-of-keys |
| `/heist crack <target>` | 1 BF | Success: +5 heat, `vaultMoney / 3` loot. Alarm: +20 heat, BF still spent |
| `/heist bribe guard` | $50k–$100k | −10 heat. Cost scales with `corruptGuards`. **Refused in getaway** |
| `/heist bribe insider` | 1 key | Advance phase. 15% chance double agent: key burned, +10 heat, no advance. **Refused in getaway** |
| `/heist escape` | — | Win. Requires getaway phase + loot ≥ threshold |

## Win Path

```
start → bribe insider → bribe insider → crack × N → escape
         (to vault)      (to getaway)
```

Two keys for the two phase advances. One plus of BF for a crack. Everything else is heat management. Fail a hack or crack and the BF is gone — press on, or spend a turn on `supply`.

## Loss

Heat hits 100 → **🚨 POLICE ARRIVED 🚨**. Any subsequent `/heist` in that issue returns the custody banner without mutating state. Open a new issue to try again.

## Difficulty

`start --hard` sets escape goal to **$750,000**, adds **+25 starting heat**, and **doubles your leaderboard score**. Everything else is identical.

## How it Works

```
Issue body  ──▶  hidden JSON state  ──▶  heist-engine.yml  ──▶  dist/index.js  ──▶  reply comment
```

- **State** lives in the issue body between `<!-- HEIST_STATE_START -->` and `<!-- HEIST_STATE_END -->`.
- **Engine** is pre-built to `dist/`, checked out on every trigger. No `npm install` at runtime — every Action run finishes under 15 seconds.
- **Vault layout** is seeded from `issue_number` and **frozen into state** on issue open. The vault you see is the vault you get, turn after turn.
- **Concurrency** is serialized at the workflow level (`concurrency: heist-engine`). Two comments arriving within the same second cannot race.
- **Per-user rate limit** lives in `state.users[<login>]`. Two players can act 30s apart from each other but each waits their own 60s.

## Leaderboard

Victories are recorded on the pinned **🏆 Leaderboard** issue. Entries are sorted by score, top 100 retained. Hard runs double their effective score.

## Tech Stack

TypeScript · Node 18 · `@actions/core` · `@actions/github` · GitHub Actions · GitHub Issues

## Repository Layout

```
.github/workflows/heist-engine.yml   # the only process that ever runs
src/engine/                          # parser, state, resolver, ratelimit, flavor
src/game/                            # actions, generator, mechanics, leaderboard
dist/                                # compiled — committed, because the Action runs this
scripts/smoke.js                     # zero-dep local test harness
```
