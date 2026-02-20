'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Profile } from '@/lib/types';
import Background from '@/components/login/Background';
import ScrambleButton from '@/components/login/ScrambleButton';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="font-mono text-sm text-slate-400 animate-pulse">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Background />

      <div className="relative z-10 max-w-lg mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            href="/"
            className="inline-block font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6"
          >
            &larr; BACK TO VENTURES
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-[0_0_60px_-12px_rgba(59,130,246,0.15)]"
        >
          <h1 className="text-2xl font-bold tracking-tighter text-white mb-1">
            FOUNDER<span className="text-blue-500">.</span>PROFILE
          </h1>
          <div className="h-0.5 w-12 bg-gradient-to-r from-blue-500 to-emerald-500 mb-6" />

          <div className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-1 block text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                Entity Email
              </label>
              <p className="font-mono text-sm text-white bg-slate-900/50 rounded-lg border border-white/10 px-4 py-2.5">
                {profile?.email}
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="mb-1 block text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                Founder Bio
              </label>
              {profile?.founder_bio ? (
                <div className="font-mono text-xs text-slate-300 leading-relaxed bg-slate-900/50 rounded-lg border border-white/10 px-4 py-3">
                  {profile.founder_bio}
                </div>
              ) : (
                <div className="font-mono text-xs text-slate-600 italic bg-slate-900/30 rounded-lg border border-dashed border-white/5 px-4 py-3 text-center">
                  No founder bio generated yet
                </div>
              )}
            </div>

            {/* Generate button */}
            <ScrambleButton
              label={profile?.founder_bio ? 'REGENERATE BIO' : 'GENERATE FOUNDER BIO'}
              loadingLabel="SYNTHESIZING..."
              loading={generating}
            />
            <p className="text-center font-mono text-[10px] text-slate-600 -mt-2">
              Powered by AI &middot; HuggingFace Inference
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center font-mono text-[10px] text-slate-700">
          <span className="text-emerald-500/60">&#9679;</span> PROFILE MODULE &middot; SECURE
        </div>
      </div>
    </div>
  );
}
