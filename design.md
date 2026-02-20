# DESIGN.md — Turn-Based Startup Simulation

## Architecture

**Monolith on Next.js App Router** — I kept this as a single deployable Next.js app on Vercel. It’s cheap, simple, and easy to reason about in a take-home setting. Supabase provides auth, Postgres, and realtime channels. HuggingFace Inference API powers optional AI-generated founder bios.

```
Client (React 19 + Framer Motion)
  │
  ├─ Auth pages (login / signup)          ──► Supabase Auth (email/password)
  ├─ Homepage (scorecard + game list)     ──► Supabase Postgres (games, profiles)
  ├─ Game dashboard (decisions + KPIs)    ──► Next.js API Routes
  ├─ Onboarding modal + Tutorial overlay  │        │
  └─ Profile page                         │        ├─ Simulation Engine (pure functions)
                                          │        ├─ Bot Strategies (context-aware)
                                          │        ├─ HuggingFace AI (zephyr-7b-beta)
                                          │        └─ Cache layer (SWR pattern)
                                          │
                                          └─ Supabase Realtime (presence + broadcasts)
```

**Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Supabase (Auth + Postgres + Realtime), HuggingFace Inference API, Vitest, Vercel

## Design priorities

- server-authoritative state transitions
- deterministic simulation + testability
- secure persistence with RLS and ownership checks
- optional extras (realtime/caching/AI) that stay out of the critical path

---

## Data Model

| Table | Purpose |
|---|---|
| `profiles` | User metadata + optional AI-generated founder bio/avatar |
| `games` | Core game state: cash, headcount, quality, cumulative profit, version lock |
| `turns` | Append-only log of decisions + outcomes per quarter |
| `participants` | Human or bot players attached to a game |
| `external_cache` | Key-value store with `fetched_at` for SWR caching |

### Concurrency Control
`games.version` (integer) — every advance increments version. The API checks `WHERE version = expected_version` so two simultaneous advances cannot both succeed. I also surface this as `turnVersion` on the client to trigger bot refresh.

### Row-Level Security (RLS)
- I allow anyone to read Games / Turns / Participants (this is what enables spectator mode)
- I restrict writes to the game owner via `auth.uid()`
- I restrict profile read/write to the owning user
- `external_cache` stays read-only for anon; writes go through the service role

---

## API Contract

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/game/new` | Required | Create game, return id |
| GET | `/api/game/[id]` | Optional* | Load game state + last 4 turns |
| POST | `/api/game/[id]/advance` | Required (owner) | Submit decisions, run sim, broadcast event |
| POST | `/api/game/[id]/bot/recommend` | Required (owner) | Get bot recommendations + situation brief |
| GET | `/api/external/market-factor` | None | Read/refresh cached market factor |
| POST | `/api/bots/tick` | Cron/manual | Advance demo bot game one quarter |
| POST | `/api/profile/generate` | Required | Generate AI founder bio via HuggingFace |
| GET | `/api/leaderboard` | None | Global leaderboard — top 20 players by best score |

*Spectators can GET game state without being the owner (read-only).

---

## Features

This section is intentionally a checklist so reviewers can map visible behavior to code quickly.

### Authentication & Identity
- **Email/password auth** via Supabase — login + signup with distinct flows
- **Real-time email validation** — regex check on blur and as-you-type (after 3 chars) with amber hint text
- **Contextual error handling** — distinct messages for invalid credentials, unconfirmed email, already-registered; inline links to switch between register/login
- **Identity deduplication** — detects Supabase's fake-user response (empty `identities`) on duplicate registration
- **Auto-confirmed fast path** — if Supabase returns a session on sign-up, skips confirmation and redirects immediately
- **Welcome toast** — animated green confirmation banner on login with 1.2s delay before redirect
- **Middleware session refresh** — `proxy.ts` refreshes auth cookies on every request
- **Auto-profile creation** — Postgres trigger `handle_new_user()` inserts a `profiles` row on sign-up

### First-Time Onboarding
- **Multi-step onboarding modal** — shown on homepage when user has no bio and no display name
- **4-step animated wizard** with progress bar: Name → 3 personality questions → AI generating → done
- **Personality questions**: Risk approach (conservative/balanced/aggressive), Startup priority (engineering/market/finance), Leadership style (visionary/analytical/hands-on)
- **Display name capture** — saved to Supabase `user_metadata.display_name`
- **AI bio generation** — calls `/api/profile/generate` with name + personality answers
- **HuggingFace Inference API** — `zephyr-7b-beta` model for creative founder bios; template fallback on failure
- **Personality-to-trait mapping** — converts answers into descriptive phrases for prompt engineering

### Homepage — 3-Column Responsive Layout
- **Auth-guarded dashboard** — redirects to `/login` if not authenticated
- **Top bar** — display name + email (email hidden on mobile), Profile link, Sign Out button
- **Responsive 3-column grid** (`lg:grid-cols-12`) — stacks vertically on mobile, side-by-side on desktop:

**Left Column (3/12) — Player Scorecard:**
- **High Score card** — best `cumulative_profit` across all games, win count, total games, best progress (Y/Q)
- **Founder's Story card** — AI-generated bio with `line-clamp-6`, or prompt to create one with link to profile page; founder name attribution

**Middle Column (5/12) — Ventures:**
- **"+ Launch New Venture" button** — creates game via POST `/api/game/new`
- **"Recent Ventures" section** with total count header
- **Scrollable games list** (`max-h-[60vh]`) — all user games sorted by `updated_at`, each showing Year/Quarter, color-coded status badge (active/won/lost), and cash amount

**Right Column (4/12) — Global Leaderboard:**
- **🏆 Leaderboard header** with founder count
- **Ranked table** (top 20) — rank (🥇🥈🥉 for top 3), founder name, high score (green/red), wins (W), games played (GP)
- **Current player highlighted** with blue left border + "YOU" badge
- **Sticky column headers** with scrollable rows (`max-h-[60vh]`)
- **API endpoint** `GET /api/leaderboard` — aggregates all players' best scores using service client + auth admin for display names

- **Animated entry** — Framer Motion staggered fade-in with directional slide (left/up/right per column)
- **Bio refresh on onboarding complete** — scorecard updates without page reload

### Game Dashboard
- **3-column responsive layout** — decisions + advisors (left), KPIs + history (right), office floor full-width below
- **Ownership detection** — checks authenticated user vs `game.owner_id`
- **Spectator mode** — non-owners see "SPECTATING" read-only panel; badge in top bar
- **Error banner** — animated red alert for submission failures
- **Win/Lose banners** — full-width celebration/failure banner with cumulative profit or bankruptcy message + "LAUNCH NEW VENTURE" link
- **Top bar** — back link, Year/Quarter display, "HOW TO PLAY" button, presence feed

### Decision Panel
- **4-input quarterly decision form**: Price ($1–$1000), Engineers to Hire (0–20), Sales to Hire (0–20), Salary % of market (50–200%)
- **Advance Quarter button** — submits decisions, shows "SIMULATING..." loading state
- **Strategy-aware submit** — button turns green with strategy name when bot recommendation applied (e.g., "ADVANCE WITH CFO")
- **Apply flash effect** — blue border glow + shadow animation on recommendation apply
- **Applied indicator badge** — pulsing "CFO APPLIED" badge, auto-clears after 3s
- **Auto-scroll to form** when recommendation is applied

### Bot Advisor System (Context-Aware)
- **3 deterministic strategies**: CFO (💰 protect cash), Growth (🚀 aggressive hiring), Quality (⭐ premium product)
- **Context-aware reasoning** — each bot generates dynamic text based on:
  - Cash level (critical / low / moderate / strong)
  - Quality level (poor / moderate / excellent)
  - Team size and composition
  - Quarters remaining to Year 10 finish
- **Situation assessment** (`assessSituation()`) — multi-part briefing with emoji-tagged warnings (⚠️ cash critical, 📉 quality poor, 🏆 near win, etc.)
- **Auto-refresh on turn change** — bot advice automatically re-fetched 800ms after `turnVersion` changes
- **Situation alert banner** — animated amber-glow alert at top of decision panel after each turn; auto-dismisses after 8s
- **"UPDATED" badge** — pulses on bot advisor header when new recommendations arrive
- **Manual "REFRESH ADVICE" button** with loading spinner
- **One-click apply** — loads bot's recommended values directly into the decision form
- **API response format** — `{ recommendations: [...], situationBrief: string }`

### Simulation Engine
Pure function: `advanceQuarter(state, decisions, marketFactor) → { newState, outcomes }`

Implements the assignment spec model as-provided:
- **Quality**: `quality += engineers * 0.5` (cap 100)
- **Demand**: `quality * 10 - price * 0.0001` (floor 0)
- **Units sold**: `demand * sales_staff * 0.5` (integer)
- **Revenue**: `price * units`
- **Salary cost**: `salary_pct / 100 * 30,000` per person per quarter
- **Total payroll**: `salary_cost * (engineers + sales)`
- **Net income**: `revenue - total_payroll`
- **Cash**: `cash + net_income - hiring_cost`
- **Hiring cost**: `new_hires * 5,000` (one-time)
- **Win condition**: survive through Year 10 (40 quarters) with positive cash
- **Lose condition**: cash ≤ $0 (bankruptcy)
- **Quarter/year progression**: Q1→Q4 then year increments
- **Deterministic**: same inputs always produce the same outputs
- **Market factor**: optional enhancement (daily sine-wave 0.8–1.2× on units sold, cached via SWR)

### Market Factor System
- **SWR cache pattern** — serves cached value from `external_cache` table; refreshes async if stale (>24h)
- **Deterministic daily variation** — sine wave over the year producing a factor between 0.8–1.2
- **Integrated into advance endpoint** — market factor read before each simulation run

### Realtime Presence & Activity Feed
- **Supabase Realtime channel** per game (`game:{id}`)
- **Presence tracking** — shows "You" when solo, "You + N spectators" when others are watching
- **Player excluded from viewer count** — current player is not counted as a spectator
- **Connection status indicator** — green dot (LIVE) or amber dot (POLLING)
- **Activity event feed** — `quarter_advanced` and `bot_applied` events with timestamps, capped at 10
- **Server-side broadcast** — advance endpoint broadcasts realtime event after each turn
- **Polling fallback** — 5s interval if realtime subscription fails

### Interactive Tutorial
- **7-step guided tutorial** with full-screen SVG spotlight overlay
- **Auto-shown on first visit** — checks `localStorage` for `tutorial_completed`
- **Re-triggerable** via "HOW TO PLAY" button in game top bar
- **SVG mask cutout** — highlights each UI element with blue glowing border and darkened overlay
- **Responsive tooltip positioning** — dynamically positioned (top/bottom/left/right) based on target element
- **Auto-scroll** — scrolls each highlighted element into view
- **Step navigation** — prev/next buttons, dot indicators, skip tour
- **6 element-targeted steps**: KPI cards → decision form → advance button → bot advisors → office floor → turn history
- **Strategy overview finale** — describes CFO, Growth, Quality strategies with icons and colors; win/lose conditions

### KPI Cards
- **8 metrics displayed**: Cash, Revenue, Net Income, Quality, Engineers, Sales, Cumulative Profit, Period (Year/Quarter)
- **Color-coded thresholds** — red for low cash (<$2K), amber for low quality (<60%), green for positive values
- **Tutorial-targeted** via `data-tutorial` attribute

### Turn History
- **Last 4 quarters** in reverse chronological order
- **Per-turn breakdown**: Year/Quarter, profit (color-coded ±), revenue, costs, units sold, price
- **Server-side limiting** — API returns only the 4 most recent turns

### Office Floor Visualization
- **Two wings** — Engineering and Sales shown as separate sections
- **Dynamic grids** — no fixed desk cap; renders one icon per employee
- **Icons** — uses lightweight PNG assets from `/public` for engineers and sales
- **Responsive** — full-width section below the main dashboard grid
- **Accessible** — `role="img"` with descriptive `aria-label`

### Profile Page
- **Dedicated view** at `/profile` — founder name, email, and bio (read-only)
- **Regenerate bio** — ScrambleButton calls AI profile endpoint, updates inline
- **Navigation** — back link to ventures

---

## Visual Design System

- **Dark command-center theme** — slate background + glassy cards for a consistent "ops dashboard" feel
- **Monospace-forward UI** — terminal-like typography to match the simulation/control-room vibe
- **Motion used as feedback** — subtle transitions for state changes (advance, alerts, modals), not as core functionality
- **Lightweight visuals** — vector/canvas-style backgrounds and small icon assets to keep payloads small
- **Clear affordances** — color-coded statuses (win/lose, cash warnings) and readable hierarchy under stress

---

## Testing

| Suite | File | Tests |
|---|---|---|
| Simulation | `simulation.test.ts` | 8 tests — valid outcomes, year rollover, bankruptcy, win detection, market factor, quality drift, determinism |
| Bot Strategies | `bots.test.ts` | 6 tests — CFO conservative, Growth aggressive, Quality premium, cash-aware scaling, all-3 count, determinism |

Framework: **Vitest** with TypeScript

---

## Risk Controls

| Risk | Mitigation |
|---|---|
| Double advance | Optimistic locking via `version` column |
| Simulation on client | Engine only importable from server code path |
| Spectator mutation | RLS + API checks `owner_id` on writes |
| Cache stampede | SWR pattern — serve stale, refresh async |
| AI API failure | Bio is optional; template fallback if HuggingFace unavailable |
| Realtime unavailable | Polling fallback every 5s |
| Cron abuse | `CRON_SECRET` header required for bot tick |

---

## Deployment

- **Vercel** — auto-deploys from `main` branch; security headers (X-Content-Type-Options: nosniff, X-Frame-Options: DENY)
- **Supabase** — Auth, Postgres (5 tables with RLS), Realtime channels
- **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `HF_API_TOKEN`, `CRON_SECRET`

---

## Descopes & Non-Goals

- No head-to-head multiplayer (single-player sim with spectator support + global leaderboard)
- No chat interface
- No Redis — Postgres cache is sufficient at this scale
- No microservices — single Next.js app
- No paid AI APIs — uses free HuggingFace Inference tier with local fallback
