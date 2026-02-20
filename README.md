# STARTUP.SIM — Turn-Based Startup Simulation

A full-stack turn-based business simulation game where you play as a startup founder making quarterly decisions on pricing, hiring, and salaries to hit $50K cumulative profit before running out of cash.

**Live:** [convergent-turn-based-office-game.vercel.app](https://convergent-turn-based-office-game-aakash-priyadarshis-projects.vercel.app)

---

## Features

### Gameplay
- **Quarterly decision-making** — set product price, hire engineers & sales, adjust salary competitiveness
- **Deterministic simulation engine** — revenue, costs, quality drift, and market factors calculated each quarter
- **Win condition**: reach $50,000 cumulative profit | **Lose condition**: go bankrupt (cash ≤ $0)
- **Market factor system** — daily sine-wave variation (0.8–1.2×) cached with SWR pattern

### AI Bot Advisors
- **3 strategy bots**: CFO (💰 protect cash), Growth (🚀 aggressive hiring), Quality (⭐ premium product)
- **Context-aware reasoning** — dynamic advice based on cash level, quality, team size, profit trend, and win proximity
- **Situation alerts** — animated amber banner after each turn with emoji-tagged briefing (⚠️ cash critical, 🏆 near win, etc.)
- **Auto-refresh** — bots re-analyze 800ms after each turn advance
- **One-click apply** — load a bot's recommended values directly into the decision form

### Global Leaderboard
- **Ranked table** of all players sorted by best cumulative profit (top 20)
- **🥇🥈🥉 medals** for top 3; current player highlighted with "YOU" badge
- **Stats per player**: high score, wins, games played

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
- **KPI cards** — Cash, Quality, Engineers, Sales, Cumulative Profit, Period
- **Office floor SVG** — 30 desks color-coded by role (engineers/sales/empty)
- **Turn history** — last 4 quarters with revenue, costs, profit breakdown
- **Spectator mode** — anyone with the game link can watch in read-only
- **Realtime presence** — "You + N spectators" with live/polling status indicator

### Interactive Tutorial
- **7-step guided overlay** with SVG spotlight mask highlighting each UI element
- **Auto-shown on first visit**, re-triggerable via "HOW TO PLAY" button
- **Strategy overview finale** with win/lose conditions

### Visual Design
- **Dark command-center theme** — slate-950 background, glassmorphism cards, monospace typography
- **Animated particle background** — 60 floating particles with connection lines on canvas
- **Framer Motion** — fade-in, slide, scale, AnimatePresence throughout
- **Glitch wrapper** + **market ticker SVG** + **ScrambleButton** animations on auth pages

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
| Testing | Vitest (14 tests — 8 simulation + 6 bot strategy) |
| Deployment | Vercel (auto-deploy from `main`) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- Optional: [HuggingFace](https://huggingface.co) API token (free) for AI bio generation

### Setup

```bash
# Clone
git clone https://github.com/aakash-priyadarshi/convergent-turn-based-office-game.git
cd convergent-turn-based-office-game/app

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

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
npm run test    # Run 14 unit tests
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
│   │   ├── KpiCards.tsx                # 6 KPI metric cards
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

## Architecture Decisions

- **Optimistic locking** — `games.version` column prevents double-advances
- **Pure simulation engine** — `advanceQuarter()` is a pure function with no side effects; deterministic and testable
- **RLS everywhere** — Supabase Row-Level Security on all 5 tables; writes restricted to owner, reads open for spectators
- **SWR cache** — market factor cached in Postgres with `fetched_at` timestamp; serves stale while refreshing
- **No paid APIs** — HuggingFace free tier for AI bios; template fallback if unavailable
- **Polling fallback** — realtime presence degrades to 5s polling if Supabase channels fail

---

## License

MIT
