import { requireAuth, json, errorResponse } from '@/lib/api-helpers';
import { getAllRecommendations, getRecommendation, assessSituation } from '@/lib/engine/bots';
import { botRecommendSchema } from '@/lib/validation';
import { NextRequest } from 'next/server';
import type { GameState } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, supabase, error } = await requireAuth();
  if (!user) return errorResponse(error!, 401);

  // Load game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (gameError || !game) return errorResponse('Game not found', 404);
  if (game.owner_id !== user.id) return errorResponse('Not your game', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = botRecommendSchema.safeParse(body);
  const strategy = parsed.success ? parsed.data?.strategy : undefined;

  const state = game as GameState;
  const situationBrief = assessSituation(state);

  if (strategy) {
    return json({ recommendation: getRecommendation(strategy, state), situationBrief });
  }
  return json({ recommendations: getAllRecommendations(state), situationBrief });
}
