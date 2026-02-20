import { requireAuth, json, errorResponse } from '@/lib/api-helpers';

export async function POST() {
  const { user, supabase, error } = await requireAuth();
  if (!user) return errorResponse(error!, 401);

  const { data: game, error: dbError } = await supabase
    .from('games')
    .insert({
      owner_id: user.id,
      status: 'active',
      current_year: 1,
      current_quarter: 1,
      cash: 1000000,
      quality: 50,
      engineers: 4,
      sales: 2,
      cumulative_profit: 0,
      version: 0,
    })
    .select()
    .single();

  if (dbError) return errorResponse(dbError.message, 500);

  // Add owner as human participant
  await supabase.from('participants').insert({
    game_id: game.id,
    type: 'human',
    display_name: user.email ?? 'Founder',
  });

  return json(game, 201);
}
