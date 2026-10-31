# 🏦 Git With The Wind

A serverless multiplayer heist game. No web server. No database. **GitHub Issues are the DB, GitHub Actions are the backend.**

![Build Status](https://github.com/correspondenceadg-cmyk/git-with-the-wind/actions/workflows/heist-engine.yml/badge.svg)
![Active Heists](https://img.shields.io/github/issues/correspondenceadg-cmyk/git-with-the-wind?style=flat-square&label=Active%20Heists)
![Last Commit](https://img.shields.io/github/last-commit/correspondenceadg-cmyk/git-with-the-wind?style=flat-square)
![Language](https://img.shields.io/github/languages/top/correspondenceadg-cmyk/git-with-the-wind?style=flat-square)

## How to Play

1. Open a new issue (any title, empty body). The engine overwrites it with the vault.
2. Comment `/heist start` — or `/heist start --hard` for New Game+.
3. Every subsequent comment is a turn. Execute your heist and `/heist escape` before **Heat hits 100**.

One turn per 60 seconds **per user** per issue.

## Starting Kit

| Mode | BF | Keys | Starting Heat | Target Loot |
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
| `/heist escape` | — | **Win.** Ends the heist immediately. Score = your current loot |

## Exit Strategies

You can type `/heist escape` at any time. How you leave determines your flavor text and how the crew remembers you:

1. **Clean Escape:** You are in the getaway phase, you hit the target loot, and Heat is under 50. *"Clean getaway. The wind is with you."*
2. **Messy Escape:** You are in the getaway phase and you hit the target loot, but Heat is 50 or higher. You got the cash, but the sirens are deafening. *"You made it out with $X, but the sirens are deafening."*
3. **Wimpy Escape:** You bail before hitting the target loot, or before reaching the getaway phase. You survive, but the score is low. *"Wimpy escape. The crew will remember this."*

All three outcomes are technically a "Win" (you escaped prison), but only a Clean escape is a perfect run.

## Loss

Heat hits 100 → **🚨 POLICE ARRIVED 🚨**. Any subsequent `/heist` in that issue returns the custody banner without mutating state. Open a new issue to try again.

## How it Works

```
Issue body  ──▶  hidden JSON state  ──▶  heist-engine.yml  ──▶  dist/index.js  ──▶  reply comment
```

- **State** lives in the issue body between `<!-- HEIST_STATE_START -->` and `<!-- HEIST_STATE_END -->`.
- **Engine** is pre-built to `dist/`, checked out on every trigger. No `npm install` at runtime.
- **Vault layout** is seeded from `issue_number` and frozen into state on issue open.
- **Concurrency** is serialized at the workflow level.
- **Per-user rate limit** lives in `state.users[<login>]`.
