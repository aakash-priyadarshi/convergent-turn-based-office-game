import { json } from '@/lib/api-helpers';
import { createServiceClient } from '@/lib/supabase/server';
import { advanceQuarter } from '@/lib/engine/simulation';
import { getRecommendation } from '@/lib/engine/bots';
import type { GameState } from '@/lib/types';

/**
 * Demo auto-play: advance one quarter for all active demo games.
 * Triggered by Vercel Cron or manual button.
 */
export async function POST() {
  const service = createServiceClient();

  // Find active demo games (bot participants, no human owner action needed)
  const { data: demoGames, error } = await service
    .from('games')
    .select('*, participants(*)')
    .eq('status', 'active')
    .not('participants.strategy', 'is', null);

  if (error || !demoGames?.length) {
    return json({ message: 'No active demo games', advanced: 0 });
  }

  let advanced = 0;
  for (const game of demoGames) {
    const botParticipant = game.participants?.find(
      (p: { type: string }) => p.type === 'bot'
    );
    if (!botParticipant) continue;

    const strategy = botParticipant.strategy as 'cfo' | 'growth' | 'quality';
    const rec = getRecommendation(strategy, game as GameState);

    // Read market factor
    const { data: cached } = await service
      .from('external_cache')
      .select('value_json')
      .eq('key', 'market_factor')
      .single();
    const marketFactor = cached?.value_json?.value ?? 1.0;

    const { newState, outcomes } = advanceQuarter(
      game as GameState,
      rec.decisions,
      marketFactor
    );

    const { error: updateError } = await service
      .from('games')
      .update({
        ...newState,
        version: game.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', game.id)
      .eq('version', game.version);

    if (!updateError) {
      await service.from('turns').insert({
        game_id: game.id,
        year: game.current_year,
        quarter: game.current_quarter,
        decisions: rec.decisions,
        outcomes,
      });
      advanced++;
    }
  }

  return json({ message: `Advanced ${advanced} demo games`, advanced });
}
