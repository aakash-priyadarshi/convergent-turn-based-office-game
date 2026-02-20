import { json } from '@/lib/api-helpers';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServiceClient();

  // Get all games grouped by owner, picking their best cumulative_profit
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('owner_id, cumulative_profit, status, current_year, current_quarter')
    .order('cumulative_profit', { ascending: false });

  if (gamesError) {
    return json({ error: 'Failed to fetch leaderboard' }, 500);
  }

  // Aggregate per player: best score, total wins, total games
  const playerMap = new Map<
    string,
    { bestProfit: number; wins: number; totalGames: number; bestYear: number; bestQuarter: number }
  >();

  for (const g of games ?? []) {
    const profit = Number(g.cumulative_profit);
    const existing = playerMap.get(g.owner_id);
    if (!existing) {
      playerMap.set(g.owner_id, {
        bestProfit: profit,
        wins: g.status === 'won' ? 1 : 0,
        totalGames: 1,
        bestYear: g.current_year,
        bestQuarter: g.current_quarter,
      });
    } else {
      existing.totalGames++;
      if (g.status === 'won') existing.wins++;
      if (profit > existing.bestProfit) {
        existing.bestProfit = profit;
        existing.bestYear = g.current_year;
        existing.bestQuarter = g.current_quarter;
      }
    }
  }

  // Fetch display names for all players
  const ownerIds = Array.from(playerMap.keys());
  if (ownerIds.length === 0) {
    return json({ leaderboard: [] });
  }

  // Use auth admin to get user metadata (display names)
  const nameMap = new Map<string, string>();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, founder_bio')
    .in('id', ownerIds);

  // Also fetch display names from auth.users via admin API
  for (const ownerId of ownerIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(ownerId);
    const displayName = userData?.user?.user_metadata?.display_name;
    if (typeof displayName === 'string' && displayName.trim()) {
      nameMap.set(ownerId, displayName);
    }
  }

  // Build leaderboard entries
  const leaderboard = ownerIds
    .map((id) => {
      const stats = playerMap.get(id)!;
      const profile = profiles?.find((p: { id: string }) => p.id === id);
      const displayName = nameMap.get(id) || profile?.email?.split('@')[0] || 'Anonymous';
      return {
        playerId: id,
        displayName,
        highScore: stats.bestProfit,
        wins: stats.wins,
        totalGames: stats.totalGames,
        bestYear: stats.bestYear,
        bestQuarter: stats.bestQuarter,
        hasBio: !!profile?.founder_bio,
      };
    })
    .sort((a, b) => b.highScore - a.highScore)
    .slice(0, 20); // Top 20

  return json({ leaderboard });
}
