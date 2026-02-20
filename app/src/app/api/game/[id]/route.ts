import { createServerSupabase } from '@/lib/supabase/server';
import { json, errorResponse } from '@/lib/api-helpers';
import { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  // Game is readable by anyone (spectators) — enforced by RLS
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (gameError || !game) return errorResponse('Game not found', 404);

  // Last 4 turns
  const { data: turns } = await supabase
    .from('turns')
    .select('*')
    .eq('game_id', id)
    .order('created_at', { ascending: false })
    .limit(4);

  // Participants
  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('game_id', id);

  return json({ game, turns: turns ?? [], participants: participants ?? [] });
}
