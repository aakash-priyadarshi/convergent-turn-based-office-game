# Approach and System Design Notes

Reviewer summary:
1) Server-authoritative game loop
2) Deterministic, testable simulation engine
3) Product judgement: tradeoffs + additive enhancements

This repo started as a simple turn based business simulation, but I treated it like a real product slice. The assignment asks for a vertical slice where the client submits decisions, the server runs the model, state is persisted, and the dashboard updates. I built the core loop first and then added a few extras that demonstrate product judgment.

## What I built

Core loop:
- Email and password auth with Supabase, session persists across reloads.
- Quarterly decision form with price, engineers to hire, sales to hire, and salary percent.
- A single server authoritative advance endpoint that validates input, loads state, runs the simulation, persists results, and returns updated state.
- A game state view that surfaces cash, revenue, net income, headcount by role, quarter, and the last four quarters of history.
- A simple office view that updates with headcount growth.
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
Even in a single player game, double clicks and retries can happen. I used a version integer on the game row and update with a version check. If two requests race, one fails with a conflict response.

### Idempotency and retry safety
This is not “strict idempotency” (two sequential successful calls will advance two quarters, by design). What I care about here is retry safety and not corrupting state under accidental duplicates.

Double-click: in the UI I disable the submit button while a request is in flight, but I still assume two POSTs can land close together (double click, back button, etc). If both requests observe the same game version, only one update can succeed because the database update includes a version match. The loser gets a 409 conflict instead of silently overwriting.

Network retry: if the client times out and retries, the retry either (a) hits the same version and wins (if the first never committed) or (b) hits a newer version and returns 409. Either way, the system does not attempt to merge two derived states.

Client refresh: refreshing the page is a clean reset. The client re-fetches the canonical game + turn history from the server. There is no client-side cache that can diverge permanently.

The key point is that optimistic locking makes the write conditional on “I am advancing the exact state I observed.” On 409, the correct client behavior is to refetch and let the player act on the newest state, not to try to reconcile or merge partial local results.

### Why the turn log is append-only
Each quarter advance writes one new row to the turn log. I never update past turns.

This is mainly for auditability: you can answer “what did the player choose and what outcomes did the server compute?” even if the current game snapshot changes later.

It also gives me debugging and time-travel options. If someone reports “the numbers jumped,” I can replay or inspect the exact inputs and outputs for each quarter rather than guessing from the latest aggregate state.

The other practical benefit is safety. Keeping the log append-only reduces the chance of accidental state corruption, because the only mutable thing is the current game snapshot. Historical facts are treated as immutable.

### RLS for the domain model
Supabase row level security is a good fit for this assignment. I opened reads for games and turns to support spectators and locked writes to the owner. That keeps the data model honest and removes a lot of custom authorization code.

### Realtime is optional by design
Realtime presence is nice for a demo, but it is non-critical.

I treat realtime messages as best-effort hints that “something changed.” The core loop does not depend on websockets or subscriptions. The source of truth is still the database, fetched via normal HTTP.

When realtime is unavailable (blocked websocket, flaky network, or subscription failure), the fallback is polling: a small interval triggers a refetch of the game snapshot. That keeps spectators reasonably up to date without making the advance path brittle.

### Adapting to platform constraints
I originally planned to rely on Vercel Cron to tick demo bot games in the background. On the hobby tier that is not something you can assume will always be available.

Instead of fighting the platform, I made the demo bot mode explicitly “best-effort.” If the bot tick pauses, nothing breaks. Human-owned games still advance only when the owner clicks advance, and the simulation remains server-authoritative.

## Issues I hit and how I solved them

### Spec alignment on the simulation model
I initially had a more game like model with extra tuning and a profit threshold win condition. When I re audited the assignment, I switched to the spec model and aligned the win condition.

I fixed this by:
- Updating initial state to $1,000,000 cash, 4 engineers, 2 sales, quality 50.
- Implementing the spec formulas exactly for quality, demand, units, payroll, hiring cost, and cash update.
- Changing win logic to be “survive through Year 10 with positive cash” and keeping cash less than or equal to zero as the loss condition.
- Updating tests to assert the formulas and the Year 10 win rule.
- Updating the tutorial and docs so the product matches the rules.

A note on the spec itself: price has a coefficient of 0.0001 in the demand equation, so price barely affects demand. That makes high prices overly strong. I kept it anyway because the assignment explicitly says to use the model as provided.

### Making the advisors reflect the win condition
This one was a real footgun: after I changed the win condition to “survive to Year 10,” my bot advisors were still optimizing like it was a short-term profit race.

The failure mode was obvious once I watched a few runs: the bots would keep hiring into the late game and occasionally push the player into bankruptcy right before the finish line. That was “correct” under the old goal and clearly wrong under the new one.

I fixed it by making the bots goal-aware. Near the end of the timeline they switch to a survival posture (stop aggressive hiring, prioritize cash runway), and I added targeted tests around late-game behavior so a future rule change cannot silently make the advice self-destructive.

### Realtime dependency fallback
I initially over-trusted realtime for the viewer experience. In a couple environments (websocket blocked, connection dropping), the presence channel would not stay subscribed, and spectators would sit on stale state.

I fixed this by making realtime strictly optional. The server broadcast is wrapped as best-effort, and on the client I added a polling fallback that periodically refetches game state when realtime cannot connect. The important part is that advancing a quarter never depends on realtime. It is just a notification layer.

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
- The client could call a lightweight API that checks Redis first and only falls back to Postgres if needed.

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
