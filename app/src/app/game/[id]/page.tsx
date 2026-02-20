'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { GameState, Turn, Decisions, Outcomes } from '@/lib/types';
import DecisionPanel from '@/components/DecisionPanel';
import KpiCards from '@/components/KpiCards';
import TurnHistory from '@/components/TurnHistory';
import OfficeSvg from '@/components/OfficeSvg';
import PresenceFeed from '@/components/PresenceFeed';
import GameTutorial from '@/components/GameTutorial';
import Link from 'next/link';
import Background from '@/components/login/Background';

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [game, setGame] = useState<GameState | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

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

  // Auto-show tutorial for first-time players
  useEffect(() => {
    if (!loading && game && isOwner) {
      const tutorialDone = localStorage.getItem('tutorial_completed');
      if (!tutorialDone) {
        // Slight delay to let the DOM render data-tutorial elements
        const t = setTimeout(() => setShowTutorial(true), 500);
        return () => clearTimeout(t);
      }
    }
  }, [loading, game, isOwner]);

  function completeTutorial() {
    localStorage.setItem('tutorial_completed', '1');
    setShowTutorial(false);
  }

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="font-mono text-sm text-slate-400 animate-pulse">Loading simulation...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-slate-950">
        <p className="font-mono text-sm text-red-400">{error}</p>
        <Link href="/" className="font-mono text-xs text-blue-400 hover:text-blue-300">&larr; Back to ventures</Link>
      </div>
    );
  }

  if (!game) return null;

  const isGameOver = game.status !== 'active';

  return (
    <div className="relative min-h-screen">
      <Background />

      {/* Tutorial overlay */}
      {showTutorial && <GameTutorial onComplete={completeTutorial} />}

      <div className="relative z-10">
        {/* Top bar */}
        <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
                &larr; VENTURES
              </Link>
              <h1 className="font-mono font-bold text-white">
                Y{game.current_year} Q{game.current_quarter}
              </h1>
              {!isOwner && (
                <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  Spectator
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTutorial(true)}
                className="font-mono text-[10px] uppercase tracking-wider border border-white/10 bg-white/5 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                ? HOW TO PLAY
              </button>
              <PresenceFeed gameId={id} onUpdate={loadGame} />
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="max-w-6xl mx-auto px-4 mt-3">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-400">
              <span className="mr-2">&#9632;</span>{error}
            </div>
          </div>
        )}

        {/* Win/lose banner */}
        {isGameOver && (
          <div className={`text-center py-8 ${
            game.status === 'won'
              ? 'bg-emerald-500/5 border-b border-emerald-500/20'
              : 'bg-red-500/5 border-b border-red-500/20'
          }`}>
            <h2 className={`text-3xl font-bold font-mono tracking-tight ${
              game.status === 'won' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {game.status === 'won' ? 'VENTURE SUCCESSFUL' : 'VENTURE BANKRUPT'}
            </h2>
            <p className="font-mono text-xs text-slate-400 mt-2">
              {game.status === 'won'
                ? `Survived 10 years! Cumulative profit: $${Number(game.cumulative_profit).toLocaleString()}`
                : 'Company ran out of operating capital'}
            </p>
            <Link
              href="/"
              className="inline-block mt-4 font-mono text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 bg-blue-500/10 px-4 py-2 rounded-lg transition-all hover:bg-blue-500/20"
            >
              LAUNCH NEW VENTURE &rarr;
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
                turnVersion={game.version}
                onAdvance={handleAdvance}
              />
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
                <h2 className="font-mono font-semibold text-white text-sm mb-2">SPECTATING</h2>
                <p className="font-mono text-xs text-slate-500">
                  You are observing this venture in read-only mode. The founder makes all decisions.
                </p>
              </div>
            )}
          </div>

          {/* Right: KPIs, history */}
          <div className="lg:col-span-2 space-y-4">
            <KpiCards game={game} lastOutcomes={turns.length > 0 ? (turns[0].outcomes as Outcomes) : undefined} />
            <TurnHistory turns={turns} />
          </div>
        </div>

        {/* Office floor — full width below the main grid */}
        <div className="max-w-7xl mx-auto px-4 pb-6">
          <OfficeSvg engineers={game.engineers} sales={game.sales} />
        </div>
      </div>
    </div>
  );
}
