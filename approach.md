# Approach and System Design Notes

Reviewer summary — 1) Server-authoritative game loop
2) Deterministic, testable simulation engine
3) Product judgement: tradeoffs + additive enhancements

This repo started as a simple turn based business simulation, but I treated it like a real product slice. The assignment asks for a vertical slice where the client submits decisions, the server runs the model, state is persisted, and the dashboard updates. I built the core loop first and then added a few extras that demonstrate product judgment.

## What I built

Core loop:
- Email and password auth with Supabase, session persists across reloads.
- Quarterly decision panel with price, engineers to hire, sales to hire, and salary percent.
- A single server authoritative advance endpoint that validates input, loads state, runs the simulation, persists results, and returns updated state.
- A dashboard that shows cash, revenue, net income, headcount by role, quarter, and the last four quarters of history.
- An office visualization that updates with headcount growth.
- Win and lose states that match the assignment spec.

Extras that I added on purpose:
- Deterministic bot advisors that recommend decisions and explain why.
- A spectator friendly read only mode so you can share a game link.
- A lightweight tutorial overlay that can be restarted via a button.
- Optional founder bio generation using a free AI API.
- A small global leaderboard.

These extras are intentionally optional and non-blocking. The game remains fully playable if AI, realtime, or bots are unavailable.

I kept these extras as additive features. They do not move simulation authority to the client.

## Key technical decisions I stand behind

### Server authoritative simulation
I did not compute outcomes on the client. The client only submits player intent. The server reads the current game row, runs the pure function simulation, writes the updated state, and appends a turn log. This keeps the system debuggable, prevents client tampering, and lets me unit test the simulation without involving HTTP.

### Pure function core
The simulation engine is a pure function that takes (state, decisions) and returns (newState, outcomes). This separation is what makes testing and iteration easy. It also allows me to introduce enhancements like a market factor without breaking the core game state transitions.

### Concurrency control using optimistic locking
Even in a single player game, double clicks and retries can happen. I used a version integer on the game row and update with a version check. If two requests race, one fails with a conflict response. This is simple, cheap, and works well with a Postgres backend.

### RLS for the domain model
Supabase row level security is a good fit for this assignment. I opened reads for games and turns to support spectators and locked writes to the owner. That keeps the data model honest and removes a lot of custom authorization code.

## Issues I hit and how I solved them

### Spec alignment on the simulation model
I initially had a more game like model with extra tuning and a profit threshold win condition. When I re audited the assignment, I switched to the spec model and aligned the win condition.

I fixed this by:
- Updating initial state to $1,000,000 cash, 4 engineers, 2 sales, quality 50.
- Implementing the spec formulas exactly for quality, demand, units, payroll, hiring cost, and cash update.
- Changing win logic to be “survive through Year 10 with positive cash” and keeping cash less than or equal to zero as the loss condition.
- Updating tests to assert the formulas and the Year 10 win rule.
- Updating the tutorial and docs so the UI matches the rules.

A note on the spec itself: price has a coefficient of 0.0001 in the demand equation, so price barely affects demand. That makes high prices overly strong. I kept it anyway because the assignment explicitly says to use the model as provided.

### Making the advisors reflect the win condition
Once the win condition became “survive to Year 10,” the bot logic needed to shift from “maximize profit now” to “avoid bankruptcy until the finish line.” I added late game survival mode to the bots so they freeze hiring near the end and focus on keeping cash positive.

## Why the UI uses SVG and code driven assets
I intentionally used SVG for the office visualization and some UI elements. SVG is light, scales cleanly across screen sizes, and avoids shipping heavy image assets. In a small game UI, this is a practical tradeoff.

If I had more time and creative freedom, I would add richer assets, but I would still keep them performance aware. I would lean on vector assets where possible and treat raster images as something that needs CDN level caching.

## How I would scale this to 10M users per day

I built this on Vercel and Supabase because the maintenance cost is low and the free tiers are good for a take home project. If traffic grew, my plan would be to preserve the same architecture shape, but upgrade the bottlenecks.

### 1. Split reads from writes
Most traffic becomes read heavy once spectators exist.
- Keep write endpoints server rendered and protected.
- Cache read endpoints like leaderboard and game snapshots.
- Consider a read replica or a dedicated read optimized storage path for public game state.

### 2. Add an explicit caching layer
For scale, Postgres should not serve every public read.
- Cache hot endpoints in Redis. For Vercel, I would use a managed Redis like Upstash.
- Cache keys could be game snapshot by id, leaderboard results, and computed market factors.
- Use short TTL plus background refresh.

About username and email availability:
- If I needed availability checks at scale, I would not query Postgres on every keystroke.
- I would maintain Redis hash maps or sets for “taken usernames” and “seen emails” that are updated by signup events.
- The UI could call a lightweight API that checks Redis first and only falls back to Postgres if needed.

### 3. Queue paid AI work
AI bio generation is optional here, but if it were paid and rate limited, I would not handle it synchronously in the request path.
- Put bio generation requests on a durable queue.
- Serve an immediate response like “bio requested” and update the profile once complete.
- Apply tier based quotas. For example, if my plan included 1M requests per day, I would enforce that limit and queue overflow for the next day.
- Add caching for repeated prompts. Many users choose similar onboarding answers.

If I needed embeddings for similarity:
- Store embeddings for onboarding answers and bios.
- Use a vector store such as Pinecone or an alternative to reuse similar completions.
- This would reduce paid LLM calls.

On model choice:
- I would keep a provider abstraction.
- Default to a cheap fast model for non critical creative text. Gemini Flash is a reasonable example.
- Fall back to a template only mode if the budget is exhausted.

### 4. Use Cloudflare Workers and R2 for static heavy assets
If I had freedom to add heavier assets like high resolution art or audio:
- Put static assets on R2.
- Use Workers as the edge layer for caching and request shaping.
- Serve the Next.js app through a CDN with good caching headers.

This keeps origin load down and reduces the cost of bandwidth.

### 5. Observability and limits
At 10M users per day, you do not guess. You measure.
- Add request tracing and structured logs.
- Add rate limits per IP and per user on public endpoints.
- Add abuse controls for spectators and bot endpoints.
- Add alerts on database connection pool saturation and queue backlogs.

### 6. Database and connection pooling
Supabase is Postgres. The main scaling pain is connections.
- Use pooling.
- Avoid chatty patterns.
- Batch reads.
- Keep payloads small.

Leaderboard is a good example. Right now it is acceptable for a top 20 list. At scale I would precompute it or compute it in a scheduled job and serve it from cache.

## What I would do differently with more time

- Make the leaderboard computation and profile name lookups O(1) by pre joining or materializing.
- Add a proper job queue for AI work.
- Add a dedicated caching layer and more aggressive CDN caching.
- Add better failure UI for advance turn conflicts and transient network errors.
- Add more balancing work on top of the spec model. I would not change the model for the assignment submission, but I would if I was shipping a real game.
