'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Profile } from '@/lib/types';

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(data as Profile);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateProfile() {
    setGenerating(true);
    try {
      const res = await fetch('/api/profile/generate', { method: 'POST' });
      const data = await res.json();
      if (data.bio) {
        setProfile((prev) => prev ? { ...prev, founder_bio: data.bio } : prev);
      }
    } catch {
      // Non-blocking
    }
    setGenerating(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="text-blue-600 hover:underline text-sm">← Back to games</Link>

        <div className="bg-white rounded-lg shadow p-6 mt-4">
          <h1 className="text-2xl font-bold mb-4">Founder Profile</h1>

          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Email</span>
              <p className="font-medium">{profile?.email}</p>
            </div>

            <div>
              <span className="text-sm text-gray-500">Founder Bio</span>
              {profile?.founder_bio ? (
                <p className="text-gray-700 mt-1">{profile.founder_bio}</p>
              ) : (
                <p className="text-gray-400 mt-1 italic">No bio generated yet</p>
              )}
            </div>

            <button
              onClick={generateProfile}
              disabled={generating}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'Generating…' : profile?.founder_bio ? 'Regenerate Bio' : 'Generate Bio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
