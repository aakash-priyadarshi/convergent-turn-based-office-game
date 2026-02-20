'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { GameState } from '@/lib/types';

export default function HomePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [games, setGames] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      setGames((data as GameState[]) ?? []);
      setLoading(false);
    })();
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Startup Simulator</h1>
            <p className="text-gray-500">{user?.email}</p>
          </div>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700">
            Sign out
          </button>
        </div>

        <button
          onClick={createGame}
          disabled={creating}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
        >
          {creating ? 'Creating…' : '+ New Game'}
        </button>

        {games.length === 0 ? (
          <p className="text-center text-gray-400">No games yet. Create one to start!</p>
        ) : (
          <div className="space-y-3">
            {games.map((g) => (
              <button
                key={g.id}
                onClick={() => router.push(`/game/${g.id}`)}
                className="w-full text-left bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">Y{g.current_year} Q{g.current_quarter}</span>
                    <span className={`ml-3 text-sm px-2 py-0.5 rounded ${
                      g.status === 'active' ? 'bg-green-100 text-green-700' :
                      g.status === 'won' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {g.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">${g.cash.toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
