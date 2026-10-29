# 🏦 Git With The Wind

A serverless multiplayer heist game. No web server. No database. GitHub Issues are the DB, GitHub Actions is the backend.

## How to Play

1. Open an issue titled anything — the engine overwrites the body with the vault.
2. Comment `/heist <verb> <target>` to act.
3. Reach $1,000,000 in loot and `/heist escape` before Heat hits 100.

## Commands

| Command | Effect |
|---|---|
| `/heist hack cctv` | Reduce heat via Brute Force |
| `/heist bribe guard` | Skip a phase, costs money |
| `/heist crack safe` | High risk, high loot |
| `/heist escape` | Win if loot ≥ $1M |

## How it Works

```
Issue Body ──▶ hidden JSON state ──▶ heist-engine.yml ──▶ TS engine ──▶ reply comment
```

State lives in the issue body between `<!-- HEIST_STATE_START -->` and `<!-- HEIST_STATE_END -->`. Nothing is written to disk. Nothing is stored in a database.
