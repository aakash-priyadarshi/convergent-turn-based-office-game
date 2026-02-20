'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import type { GameState } from '@/lib/types';
import Background from '@/components/login/Background';
import OnboardingModal from '@/components/OnboardingModal';

interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  highScore: number;
  wins: number;
  totalGames: number;
  bestYear: number;
  bestQuarter: number;
  hasBio: boolean;
}

export default function HomePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, unknown> } | null>(null);
  const [games, setGames] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [founderBio, setFounderBio] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Check if user needs onboarding (no bio = first time)
      const { data: profile } = await supabase
        .from('profiles')
        .select('founder_bio')
        .eq('id', user.id)
        .single();

      if (!profile?.founder_bio && !user.user_metadata?.display_name) {
        setShowOnboarding(true);
      }
      if (profile?.founder_bio) {
        setFounderBio(profile.founder_bio);
      }

      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      setGames((data as GameState[]) ?? []);
      setLoading(false);
      fetchLeaderboard();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createGame() {
    setCreating(true);
    const res = await fetch('/api/game/new', { method: 'POST' });
    const game = await res.json();
    if (game.id) router.push(`/game/${game.id}`);
    setCreating(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="font-mono text-sm text-slate-400 animate-pulse">Loading systems...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Background />

      {/* Onboarding modal for first-time users */}
      {showOnboarding && (
        <OnboardingModal onComplete={() => {
          setShowOnboarding(false);
          // Refresh bio after onboarding
          (async () => {
            const { data: { user: u } } = await supabase.auth.getUser();
            if (!u) return;
            if (u.user_metadata?.display_name) {
              setUser(u);
            }
            const { data: p } = await supabase
              .from('profiles')
              .select('founder_bio')
              .eq('id', u.id)
              .single();
            if (p?.founder_bio) setFounderBio(p.founder_bio);
          })();
        }} />
      )}

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-white">
              STARTUP<span className="text-blue-500">.</span>SIM
            </h1>
            <p className="mt-1 font-mono text-xs text-slate-500">
              <span className="text-emerald-500/60">&#9679;</span>{' '}
              {user?.user_metadata?.display_name ? (
                <>
                  <span className="text-slate-300">{String(user.user_metadata.display_name)}</span>
                  <span className="text-slate-600"> &middot; </span>
                  <span className="text-slate-500">{user?.email}</span>
                </>
              ) : (
                <>
                  Logged in as <span className="text-slate-400">{user?.email}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-mono text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            >
              PROFILE
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-mono text-slate-500 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 cursor-pointer"
            >
              SIGN OUT
            </button>
          </div>
        </motion.div>

        {/* Founder Scorecard */}
        {games.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm mb-8 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: High Score */}
              <div className="p-6 border-b md:border-b-0 md:border-r border-white/10">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block mb-2">
                  HIGH SCORE
                </span>
                {(() => {
                  const bestGame = games.reduce((best, g) =>
                    Number(g.cumulative_profit) > Number(best.cumulative_profit) ? g : best
                  );
                  const highScore = Number(bestGame.cumulative_profit);
                  const isPositive = highScore >= 0;
                  const wins = games.filter(g => g.status === 'won').length;
                  const totalGames = games.length;
                  return (
                    <>
                      <div className={`font-mono text-3xl font-bold tracking-tight ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}${Math.abs(highScore).toLocaleString()}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-2 space-x-3">
                        <span>
                          <span className="text-slate-400">{wins}</span> WIN{wins !== 1 ? 'S' : ''}
                        </span>
                        <span className="text-slate-700">&middot;</span>
                        <span>
                          <span className="text-slate-400">{totalGames}</span> VENTURE{totalGames !== 1 ? 'S' : ''}
                        </span>
                        <span className="text-slate-700">&middot;</span>
                        <span>
                          BEST: <span className="text-slate-400">Y{bestGame.current_year} Q{bestGame.current_quarter}</span>
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Right: Player Story */}
              <div className="p-6">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block mb-2">
                  FOUNDER&apos;S STORY
                </span>
                {founderBio ? (
                  <p className="font-mono text-xs text-slate-300 leading-relaxed line-clamp-4">
                    {founderBio}
                  </p>
                ) : (
                  <div>
                    <p className="font-mono text-xs text-slate-600 italic">
                      No story yet — complete your profile to craft your founder narrative.
                    </p>
                    <Link
                      href="/profile"
                      className="inline-block mt-2 font-mono text-[10px] uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      CREATE YOUR STORY &rarr;
                    </Link>
                  </div>
                )}
                {typeof user?.user_metadata?.display_name === 'string' && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <span className="font-mono text-[10px] text-slate-600">
                      &mdash; {user.user_metadata.display_name}, Founder
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Global Leaderboard */}
        {leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm mb-8 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setShowLeaderboard((v) => !v)}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🏆</span>
                <span className="font-mono text-sm font-semibold text-white tracking-wider">GLOBAL LEADERBOARD</span>
                <span className="font-mono text-[10px] text-slate-500 border border-white/10 rounded-full px-2 py-0.5">
                  {leaderboard.length} FOUNDER{leaderboard.length !== 1 ? 'S' : ''}
                </span>
              </div>
              <span className={`font-mono text-xs text-slate-500 transition-transform duration-200 ${showLeaderboard ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            <AnimatePresence>
              {showLeaderboard && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-white/10">
                    {/* Header row */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                      <div className="col-span-1">#</div>
                      <div className="col-span-4">FOUNDER</div>
                      <div className="col-span-3 text-right">HIGH SCORE</div>
                      <div className="col-span-2 text-right">WINS</div>
                      <div className="col-span-2 text-right">GAMES</div>
                    </div>

                    {/* Player rows */}
                    {leaderboard.map((entry, i) => {
                      const isMe = entry.playerId === user?.id;
                      const isPositive = entry.highScore >= 0;
                      const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                      return (
                        <div
                          key={entry.playerId}
                          className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center transition-colors ${
                            isMe
                              ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
                              : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
                          }`}
                        >
                          <div className="col-span-1 font-mono text-xs text-slate-500">
                            {rankEmoji || `${i + 1}`}
                          </div>
                          <div className="col-span-4 flex items-center gap-2 min-w-0">
                            <span className={`font-mono text-xs truncate ${isMe ? 'text-blue-300 font-semibold' : 'text-slate-300'}`}>
                              {entry.displayName}
                            </span>
                            {isMe && (
                              <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className={`col-span-3 text-right font-mono text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}${Math.abs(entry.highScore).toLocaleString()}
                          </div>
                          <div className="col-span-2 text-right font-mono text-xs text-slate-400">
                            {entry.wins}
                          </div>
                          <div className="col-span-2 text-right font-mono text-xs text-slate-500">
                            {entry.totalGames}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* New game button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={createGame}
          disabled={creating}
          className="group w-full rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 py-5 font-mono text-sm font-bold tracking-wider text-blue-400 transition-all hover:border-blue-500/60 hover:bg-blue-500/10 hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] disabled:opacity-50 cursor-pointer mb-8"
        >
          {creating ? (
            <span className="animate-pulse">INITIALIZING VENTURE...</span>
          ) : (
            <span>+ LAUNCH NEW VENTURE</span>
          )}
        </motion.button>

        {/* Games list */}
        {games.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center"
          >
            <p className="font-mono text-sm text-slate-500">
              No ventures yet. Launch one to begin your simulation.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {games.map((g, i) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => router.push(`/game/${g.id}`)}
                className="group w-full text-left rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)] cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">
                      Y{g.current_year} Q{g.current_quarter}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        g.status === 'active'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : g.status === 'won'
                          ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                          : 'border-red-500/30 bg-red-500/10 text-red-400'
                      }`}
                    >
                      {g.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-slate-400">
                      ${Number(g.cash).toLocaleString()}
                    </span>
                    <span className="text-slate-600 group-hover:text-slate-400 transition-colors">
                      &rarr;
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center font-mono text-[10px] text-slate-700">
          <span className="text-emerald-500/60">&#9679;</span> {games.length} VENTURE{games.length !== 1 ? 'S' : ''} TRACKED &middot; MARKET DATA LIVE
        </div>
      </div>
    </div>
  );
}
