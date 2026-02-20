# DESIGN.md — Turn-Based Startup Simulation

## Architecture

**Monolith on Next.js App Router** — all API routes, UI, and simulation logic live in one deployable unit on Vercel. Supabase provides auth, Postgres, and realtime channels.

```
Client (React) ──► Next.js API Routes ──► Supabase Postgres
                         │                      │
                         ├─ Simulation Engine    ├─ RLS (row-level security)
                         ├─ Bot Strategies       ├─ Realtime broadcasts
                         └─ Cache layer          └─ external_cache table
```

## Data Model

| Table | Purpose |
|---|---|
| `profiles` | User metadata + optional AI-generated founder bio/avatar |
| `games` | Core game state: cash, headcount, KPIs, version lock |
| `turns` | Append-only log of decisions + outcomes per quarter |
| `participants` | Human or bot players attached to a game |
| `external_cache` | Key-value store with `fetched_at` for SWR caching |

### Concurrency Control
`games.version` (integer) — every advance increments version. The API checks `WHERE version = expected_version` so two simultaneous advances cannot both succeed.

## API Contract

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/game/new` | Required | Create game, return id |
| GET | `/api/game/[id]` | Optional* | Load game state + last 4 turns |
| POST | `/api/game/[id]/advance` | Required (owner) | Submit decisions, run sim, persist |
| POST | `/api/game/[id]/bot/recommend` | Required (owner) | Get bot strategy recommendations |
| GET | `/api/external/market-factor` | None | Read/refresh cached market factor |
| POST | `/api/bots/tick` | Cron/manual | Advance demo bot game one quarter |
| POST | `/api/profile/generate` | Required | Generate AI founder bio |

*Spectators can GET game state without being the owner (read-only).

## Simulation Engine

Pure function: `advanceQuarter(state, decisions, marketFactor) → { newState, outcomes }`

Key formulas:
- Revenue = units_sold × price
- Units sold = f(quality, sales_force, price, market_factor)
- Costs = salaries + hiring costs
- Quality drifts based on engineer ratio and salary competitiveness
- Win: cumulative_profit ≥ target; Lose: cash ≤ 0

## Bot Strategies (Deterministic)

| Bot | Behavior |
|---|---|
| CFO | Minimize burn: conservative hiring, mid-high price |
| Growth | Maximize headcount: aggressive hiring, low price |
| Quality | Maximize quality: high salary %, engineer-heavy |

All implemented as pure functions — no LLM, no external calls. Optional LLM commentary has template fallback.

## Risk Controls

| Risk | Mitigation |
|---|---|
| Double advance | Optimistic locking via `version` column |
| Simulation on client | Engine only importable from server code path |
| Spectator mutation | RLS + API checks `owner_id` on writes |
| Cache stampede | SWR pattern — serve stale, refresh async |
| AI API failure | Founder profile is optional; bio falls back to null |
| Realtime unavailable | Polling fallback every 5s |

## Descopes & Non-Goals

- No multiplayer competitive mode (single-player sim)
- No chat interface
- No Redis — Postgres cache is sufficient at this scale
- No microservices — single Next.js app
- UI is functional, not pixel-polished

## Why Each Enhancement is Non-Blocking

- **Spectators**: Read-only GET on existing endpoint; no new write paths
- **Realtime**: Supabase channel subscription; falls back to polling
- **Cache**: Separate table; simulation defaults to `1.0` if missing
- **Bot advisor**: Pure functions called on-demand; user can ignore recommendations
- **AI profile**: Isolated POST endpoint; game works without it
- **Demo mode**: Separate cron endpoint; pauses gracefully if cron fails
