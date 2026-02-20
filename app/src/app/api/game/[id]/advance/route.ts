import { requireAuth, json, errorResponse } from '@/lib/api-helpers';
import { createServiceClient } from '@/lib/supabase/server';
import { decisionsSchema } from '@/lib/validation';
import { advanceQuarter } from '@/lib/engine/simulation';
import { NextRequest } from 'next/server';
import type { GameState } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, supabase, error } = await requireAuth();
  if (!user) return errorResponse(error!, 401);

  // Parse and validate decisions
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }
  const parsed = decisionsSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);
  const decisions = parsed.data;

  // Load game — must be owner
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (gameError || !game) return errorResponse('Game not found', 404);
  if (game.owner_id !== user.id) return errorResponse('Not your game', 403);
  if (game.status !== 'active') return errorResponse('Game is over', 400);

  // Read cached market factor (default 1.0)
  const serviceClient = createServiceClient();
  const { data: cached } = await serviceClient
    .from('external_cache')
    .select('value_json')
    .eq('key', 'market_factor')
    .single();

  const marketFactor = cached?.value_json?.value ?? 1.0;

  // Run simulation
  const { newState, outcomes } = advanceQuarter(game as GameState, decisions, marketFactor);

  // Optimistic locking: update only if version matches
  const { data: updated, error: updateError } = await supabase
    .from('games')
    .update({
      ...newState,
      version: game.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('version', game.version) // optimistic lock
    .select()
    .single();

  if (updateError || !updated) {
    return errorResponse('Concurrent update detected — please retry', 409);
  }

  // Insert turn record
  await supabase.from('turns').insert({
    game_id: id,
    year: game.current_year,
    quarter: game.current_quarter,
    decisions,
    outcomes,
  });

  // Broadcast realtime event (best-effort)
  try {
    await serviceClient.channel(`game:${id}`).send({
      type: 'broadcast',
      event: 'quarter_advanced',
      payload: {
        year: game.current_year,
        quarter: game.current_quarter,
        status: outcomes.status,
      },
    });
  } catch {
    // Realtime is non-blocking
  }

  return json({ game: updated, outcomes });
}
