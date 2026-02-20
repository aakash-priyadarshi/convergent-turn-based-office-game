# Startup Simulator — Turn-Based Office Game

A server-authoritative turn-based startup simulation built with Next.js, Supabase, and TypeScript. Players make quarterly decisions (pricing, hiring, salary) and the backend runs a deterministic simulation engine, persists results, and drives a reactive dashboard.

## Quick Start

```bash
cd app
npm install
cp .env.local.example .env.local
# Fill in your Supabase project URL, anon key, and service role key
npm run dev
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_schema.sql` via the SQL editor
3. Enable **Email Auth** in Authentication settings
4. Copy the project URL and keys into `.env.local`

## Architecture

```
Client (React)  →  Next.js API Routes  →  Supabase Postgres
                        │                       │
                        ├─ Simulation Engine     ├─ RLS policies
                        ├─ Bot Strategies        ├─ Realtime channels
                        └─ Cache layer           └─ external_cache table
```

- **Monolith**: Single Next.js App Router deployment on Vercel
- **Server-authoritative**: Simulation runs only in API routes, never on client
- **Optimistic locking**: `games.version` column prevents double-advance

## Project Structure

```
app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── game/new/route.ts          POST  Create game
│   │   │   ├── game/[id]/route.ts         GET   Load game + turns
│   │   │   ├── game/[id]/advance/route.ts POST  Submit decisions
│   │   │   ├── game/[id]/bot/recommend/   POST  Bot advisor
│   │   │   ├── bots/tick/route.ts         POST  Demo auto-play
│   │   │   ├── external/market-factor/    GET   Cached market factor
│   │   │   └── profile/generate/route.ts  POST  AI founder bio
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── game/[id]/page.tsx             Game dashboard
│   │   ├── profile/page.tsx               Founder profile
│   │   └── page.tsx                       Game list / home
│   ├── components/
│   │   ├── DecisionPanel.tsx              Quarterly decisions + bot recs
│   │   ├── KpiCards.tsx                   Cash, quality, headcount
│   │   ├── TurnHistory.tsx                Last 4 quarters table
│   │   ├── OfficeSvg.tsx                  SVG office floor plan
│   │   └── PresenceFeed.tsx               Realtime presence + events
│   ├── lib/
│   │   ├── engine/
│   │   │   ├── simulation.ts              Pure simulation function
│   │   │   ├── bots.ts                    Deterministic bot strategies
│   │   │   └── __tests__/                 Unit tests
│   │   ├── supabase/
│   │   │   ├── client.ts                  Browser client
│   │   │   └── server.ts                  Server + service clients
│   │   ├── types.ts                       Domain types
│   │   ├── validation.ts                  Zod schemas
│   │   └── api-helpers.ts                 Auth + response helpers
│   └── middleware.ts                      Session refresh
├── supabase/migrations/001_schema.sql     Database schema + RLS
├── vitest.config.ts
└── package.json
```

## Features

### Core (Assessment Requirements)
- Create, load, and resume games
- Quarterly decision submission (price, hiring, salary)
- Server-only simulation with deterministic outcomes
- Postgres persistence with RLS
- KPI dashboard with last 4 quarters history
- Office SVG visual (engineers blue, sales green, empty gray)
- Win/lose detection (survive Year 10 / $0 cash)

### JD Signal Features
- **Spectators**: Anyone with the game URL can watch read-only (presence + feed)
- **Realtime**: Supabase Realtime for presence count and activity feed, with polling fallback
- **Bot Advisors**: CFO (conservative), Growth (aggressive), Quality (premium) — all deterministic
- **Daily Cache**: `external_cache` table with SWR pattern for `market_factor`
- **AI Profile**: Optional founder bio generator (OpenAI with template fallback)
- **Demo Auto-play**: `/api/bots/tick` endpoint for bot-vs-bot demo games

## Testing

```bash
npm test          # Run all tests
npm run test:watch # Watch mode
```

14 tests covering:
- Simulation engine: outcomes, quarter progression, bankruptcy, win, market factor, determinism, edge cases
- Bot strategies: each strategy's behavior, cash-sensitivity, determinism

## Deployment

1. Push to GitHub
2. Import into Vercel
3. Add environment variables
4. Deploy

Optional: Add Vercel Cron for demo auto-play:
```json
// vercel.json
{
  "crons": [{ "path": "/api/bots/tick", "schedule": "*/5 * * * *" }]
}
```

## API Reference

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/game/new` | Required | Create new game |
| GET | `/api/game/[id]` | Optional | Load game + last 4 turns |
| POST | `/api/game/[id]/advance` | Owner | Submit decisions, run sim |
| POST | `/api/game/[id]/bot/recommend` | Owner | Get bot advice |
| GET | `/api/external/market-factor` | None | Read/refresh market cache |
| POST | `/api/bots/tick` | Cron | Advance demo games |
| POST | `/api/profile/generate` | Required | Generate founder bio |

## Design Decisions

See [DESIGN.md](../DESIGN.md) for architecture, data model, risk controls, and tradeoffs.
