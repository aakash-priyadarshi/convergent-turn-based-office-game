'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { GameState, Turn, Decisions } from '@/lib/types';
import DecisionPanel from '@/components/DecisionPanel';
import KpiCards from '@/components/KpiCards';
import TurnHistory from '@/components/TurnHistory';
import OfficeSvg from '@/components/OfficeSvg';
import PresenceFeed from '@/components/PresenceFeed';
import Link from 'next/link';

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [game, setGame] = useState<GameState | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGame = useCallback(async () => {
    const res = await fetch(`/api/game/${id}`);
    if (!res.ok) {
      setError('Game not found');
      setLoading(false);
      return;
    }
    const data = await res.json();
    setGame(data.game as GameState);
    setTurns(data.turns as Turn[]);

    // Check ownership
    const { data: { user } } = await supabase.auth.getUser();
    setIsOwner(user?.id === data.game.owner_id);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  async function handleAdvance(decisions: Decisions) {
    const res = await fetch(`/api/game/${id}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decisions),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to advance');
      return;
    }

    await loadGame();
    setError('');
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading game…</div>;
  }

  if (error && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <Link href="/" className="text-blue-600 hover:underline">← Back to games</Link>
      </div>
    );
  }

  if (!game) return null;

  const isGameOver = game.status !== 'active';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b bg-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-gray-600">← Games</Link>
            <h1 className="font-bold text-lg">
              Y{game.current_year} Q{game.current_quarter}
            </h1>
            {!isOwner && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                Spectator
              </span>
            )}
          </div>
          <PresenceFeed gameId={id} onUpdate={loadGame} />
        </div>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto px-4 mt-2">
          <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
        </div>
      )}

      {/* Win/lose banner */}
      {isGameOver && (
        <div className={`text-center py-6 ${
          game.status === 'won' ? 'bg-blue-50' : 'bg-red-50'
        }`}>
          <h2 className={`text-3xl font-bold ${
            game.status === 'won' ? 'text-blue-600' : 'text-red-600'
          }`}>
            {game.status === 'won' ? '🎉 You Won!' : '💸 Bankrupt!'}
          </h2>
          <p className="text-gray-500 mt-1">
            {game.status === 'won'
              ? `Reached $${game.cumulative_profit.toLocaleString()} cumulative profit!`
              : 'Your company ran out of cash.'}
          </p>
          <Link href="/" className="inline-block mt-3 text-blue-600 hover:underline">
            Start a new game →
          </Link>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: decisions + bots */}
        <div className="lg:col-span-1">
          {isOwner ? (
            <DecisionPanel
              gameId={id}
              disabled={isGameOver}
              onAdvance={handleAdvance}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-2">Spectating</h2>
              <p className="text-sm text-gray-500">
                You are watching this game in read-only mode. The owner makes all decisions.
              </p>
            </div>
          )}
        </div>

        {/* Right: KPIs, history, office */}
        <div className="lg:col-span-2 space-y-4">
          <KpiCards game={game} />
          <OfficeSvg engineers={game.engineers} sales={game.sales} />
          <TurnHistory turns={turns} />
        </div>
      </div>
    </div>
  );
}
