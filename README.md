# STARTUP.SIM — Turn-Based Startup Simulation

I built a turn-based business simulation where you play a startup founder making quarterly decisions on pricing, hiring, and salaries across 10 years (40 quarters). Survive to Year 10 with positive cash to win.

For the design notes and tradeoffs, see [approach.md](approach.md).

**Live:** [convergent-turn-based-office-game.vercel.app](https://convergent-turn-based-office-game-aakash-priyadarshis-projects.vercel.app)

## TL;DR for reviewers

- **Server-authoritative simulation** — the client submits decisions; the server advances the quarter and persists the result
- **Optimistic locking** — `games.version` prevents double-advances and handles retries safely
- **Pure deterministic engine + unit tests** — the simulation lives in a side-effect-free function with Vitest coverage
- **RLS + spectators** — Supabase Postgres with Row-Level Security; owners can write, anyone can view a game in read-only mode
- **Postgres SWR cache (market factor)** — returns cached values immediately and refreshes in the background; safe because it’s a bounded (0.8–1.2×) multiplier and non-blocking by design

## Documentation Guide

I kept three short documents to make evaluation faster:

- **[README.md](./README.md)** — product overview, setup, feature list, and architecture decisions.
- **[DESIGN.md](./design.md)** — system architecture, data model, concurrency control, and risk mitigation.
- **[approach.md](./approach.md)** — implementation story, tradeoffs, spec-alignment decisions, and scaling plan.

If you’re short on time, reading the TL;DR and the “Architecture Decisions” section in this README is enough to understand the core design.

I made sure the core game is fully playable without AI, realtime, or bots; those are additive and non-blocking by design.

---

## Features

### Gameplay
- **Quarterly decision-making** — set product price, hire engineers & sales, adjust salary competitiveness
- **Deterministic simulation engine** — implements the spec model as-provided (see Simulation Model below)
- **Win condition**: survive 10 years with positive cash | **Lose condition**: go bankrupt (cash ≤ $0)
- **Market factor system** — daily sine-wave variation (0.8–1.2×) cached with SWR pattern

### AI Bot Advisors
- **3 deterministic strategy bots**: CFO (cash-first), Growth (hire-first), Quality (premium-first)
- **State-aware output** — advice changes based on cash, quality, team size, and quarters remaining
- **Situation alerts** — short post-turn brief (cash critical, near win, etc.)
- **Auto-refresh** — advice re-runs after each quarter advance
- **One-click apply** — apply a recommendation into the decision form

### Global Leaderboard
- **Ranked table** of all players sorted by best cumulative profit (top 20)
- Top 3 get medals; the current player is highlighted
- Per-player stats: high score, wins, games played

### Homepage — 3-Column Layout
| Left | Middle | Right |
|------|--------|-------|
| Your high score | Launch new venture | 🏆 Global leaderboard |
| Founder's story | Recent ventures list | Ranked player table |

Responsive: stacks vertically on mobile, 3-column grid on desktop.

### Onboarding & Identity
- **First-time wizard** — name capture + 3 personality questions (risk, priority, leadership)
- **AI-generated founder bio** via HuggingFace Inference API (zephyr-7b-beta)
- **Profile page** — view/regenerate bio with ScrambleButton animation

### Game Dashboard
- **KPI cards** — Cash, Revenue, Net Income, Quality, Engineers, Sales, Cumulative Profit, Period
- **Office floor** — engineering + sales wings with dynamic grids (uses PNG icons)
- **Turn history** — last 4 quarters with revenue, costs, profit breakdown
- **Spectator mode** — anyone with the game link can watch in read-only
- **Realtime presence** — "You + N spectators" with live/polling status indicator

### Interactive Tutorial
- **7-step guided overlay** with SVG spotlight mask highlighting each UI element
- **Auto-shown on first visit**, re-triggerable via "HOW TO PLAY" button
- **Strategy overview finale** with win/lose conditions

### Visual Design
- **Dark dashboard theme** — slate background, glassy cards, monospace typography
- **Particle background** — lightweight canvas effect
- **Framer Motion** — used for feedback on state changes
- Small UI flourishes on auth pages (glitch wrapper, ticker SVG, ScrambleButton)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, Framer Motion |
| Auth | Supabase Auth (email/password) |
| Database | Supabase Postgres (5 tables, RLS) |
| Realtime | Supabase Realtime (presence + broadcasts) |
| AI | HuggingFace Inference API (zephyr-7b-beta, free tier) |
| Validation | Zod v4 |
| Testing | Vitest (17 tests) |
| Deployment | Vercel (auto-deploy from `main`) |

---

## Architecture Decisions

- **Spec model as-provided** — I use the exact formulas from the assignment spec (`quality += engineers * 0.5`, `demand = quality * 10 - price * 0.0001`, etc.) with no constant modifications
- **Optimistic locking** — I use a `games.version` column to prevent double-advances
- **Pure simulation engine** — `advanceQuarter()` is a pure function with no side effects; deterministic and testable
- **RLS everywhere** — I use Supabase Row-Level Security on all 5 tables; writes restricted to owner, reads open for spectators
- **SWR cache** — I cache market factor in Postgres with a `fetched_at` timestamp; serve stale while refreshing
- **No paid APIs** — I used HuggingFace free tier for AI bios, with a template fallback
- **Polling fallback** — realtime presence drops back to 5s polling if Supabase channels fail

---

## Scope control

I kept everything beyond the core loop additive and non-blocking:

- **Single mutation path** — only one endpoint (`/api/game/[id]/advance`) mutates game state. Bots, realtime, leaderboard, and AI bios are read-only or out-of-band.
- **Graceful degradation** — if AI, realtime, or the bot tick is unavailable, the game is still fully playable with no code changes.
- **No spec modifications** — extras layer on top of the spec model; they never alter the simulation formulas or initial state.
- **Deliberate cuts** — no multiplayer competition, no undo/replay, no paid APIs. Each was considered and descoped.

## Spec alignment notes

Three places where I had to interpret the spec:

1. **Market factor** — a daily sine-wave multiplier (0.8–1.2×) on units sold. It defaults to 1.0, so when the cache is empty or stale the simulation matches the raw spec exactly.
2. **Integer units** — the spec says units sold should be an integer. I use `Math.round()` on the computed value. `Math.floor()` would also be valid; rounding is closer to the arithmetic intent.
3. **Competitors constant** — the spec mentions `competitors = 2` in the initial state. It is unused in any formula, so I omit it from the persisted game state rather than storing a dead column.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- Optional: [HuggingFace](https://huggingface.co) API token (free) for AI bio generation

### Setup

```bash
# Setup in 5 commands
git clone https://github.com/aakash-priyadarshi/convergent-turn-based-office-game.git
cd convergent-turn-based-office-game/app
npm install
cp .env.local.example .env.local
npm run dev
```

Then:
- Fill in `.env.local` with your Supabase keys
- Run the SQL migration at `app/supabase/migrations/001_schema.sql` in Supabase Dashboard → SQL Editor

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
HF_API_TOKEN=optional-free-huggingface-token
CRON_SECRET=optional-secures-bot-tick-endpoint
```

### Database Setup

Run the migration SQL in your Supabase Dashboard → SQL Editor:

```bash
# The schema file is at:
app/supabase/migrations/001_schema.sql
```

This creates 5 tables (`profiles`, `games`, `turns`, `participants`, `external_cache`) with RLS policies and an auto-profile trigger.

### Run

```bash
npm run dev     # Development server at http://localhost:3000
npm run build   # Production build
npm run test    # Run 17 unit tests
npm run lint    # ESLint
```

---

## Project Structure

```
app/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage (3-column layout)
│   │   ├── login/page.tsx              # Login with email validation
│   │   ├── signup/page.tsx             # Signup with dedup detection
│   │   ├── profile/page.tsx            # Founder profile
│   │   ├── game/[id]/page.tsx          # Game dashboard
│   │   └── api/
│   │       ├── game/new/               # Create game
│   │       ├── game/[id]/              # Get game state
│   │       ├── game/[id]/advance/      # Advance quarter
│   │       ├── game/[id]/bot/recommend/# Bot recommendations
│   │       ├── leaderboard/            # Global leaderboard
│   │       ├── profile/generate/       # AI bio generation
│   │       ├── external/market-factor/ # Cached market factor
│   │       └── bots/tick/              # Cron bot auto-play
│   ├── components/
│   │   ├── DecisionPanel.tsx           # Decision form + bot advisors
│   │   ├── KpiCards.tsx                # 8 KPI metric cards
│   │   ├── TurnHistory.tsx             # Last 4 quarters log
│   │   ├── OfficeSvg.tsx              # Office floor visualization
│   │   ├── PresenceFeed.tsx           # Realtime presence + events
│   │   ├── OnboardingModal.tsx        # First-time onboarding wizard
│   │   ├── GameTutorial.tsx           # Interactive tutorial overlay
│   │   └── login/                     # Background, GlitchWrapper, etc.
│   └── lib/
│       ├── engine/
│       │   ├── simulation.ts          # Core simulation (pure function)
│       │   └── bots.ts                # Bot strategies + reasoning
│       ├── types.ts                   # TypeScript domain types
│       ├── validation.ts              # Zod schemas
│       ├── api-helpers.ts             # Auth + response helpers
│       └── supabase/                  # Client + server Supabase clients
├── supabase/migrations/001_schema.sql # Database schema + RLS
├── vercel.json                        # Security headers
└── vitest.config.ts                   # Test configuration
```

---

## API Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/game/new` | Required | Create game |
| GET | `/api/game/[id]` | Optional | Load game state + turns |
| POST | `/api/game/[id]/advance` | Owner | Submit decisions, run sim |
| POST | `/api/game/[id]/bot/recommend` | Owner | Bot recommendations + situation brief |
| GET | `/api/leaderboard` | None | Top 20 players by best score |
| GET | `/api/external/market-factor` | None | Cached market factor |
| POST | `/api/profile/generate` | Required | AI founder bio |
| POST | `/api/bots/tick` | Cron | Auto-advance bot games |

---

## Simulation Model

I implemented the model exactly as specified in the assignment:

| Variable | Formula |
|----------|--------|
| Initial cash | $1,000,000 |
| Initial engineers | 4 |
| Initial sales | 2 |
| Initial quality | 50 |
| Salary cost / person | `salary_pct / 100 * 30,000` |
| Product quality | `quality += engineers * 0.5` (cap 100) |
| Market demand | `quality * 10 - price * 0.0001` (floor 0) |
| Units sold | `demand * sales_staff * 0.5` (integer) |
| Revenue | `price * units` |
| Total payroll | `salary_cost * (engineers + sales)` |
| Net income | `revenue - total_payroll` |
| Cash | `cash + net_income - hiring_cost` |
| New hire cost | `new_hires * 5,000` one-time |

**Win**: Survive through Year 10 (40 quarters) with positive cash.  
**Lose**: Cash reaches $0 or below.

No constants have been adjusted from the spec. The `marketFactor` (daily sine-wave 0.8–1.2× on units sold) is an enhancement, not a spec modification.

---

## Tradeoffs & Descopes

**What was built beyond the spec:**
- Bot advisors (3 deterministic strategies with context-aware reasoning)
- Realtime spectator mode with presence tracking
- AI-generated founder bios (HuggingFace free tier)
- Global leaderboard
- Interactive 7-step tutorial
- Animated dark-theme UI with framer-motion
- Market factor system (SWR-cached daily variation)

**What was cut:**
- Multi-player mode — only single-player + spectators (no simultaneous competing founders)
- Replay / time-travel — turn history is read-only, no undo
- Mobile-optimized touch targets — responsive layout works on mobile but inputs are desktop-sized
- Comprehensive error recovery UI — basic error banners only, no retry logic on failed advances

**Known issues:**
- The spec’s price coefficient (0.0001) makes price essentially irrelevant to demand; the game is very easy to win by setting high prices. This is the spec model as-provided.
- Leaderboard fetches user metadata one-by-one (N+1); acceptable for the top-20 ceiling
- New games require running the migration SQL manually in Supabase Dashboard
