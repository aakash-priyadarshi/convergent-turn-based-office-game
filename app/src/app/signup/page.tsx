'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Background from '@/components/login/Background';
import GlitchWrapper from '@/components/login/GlitchWrapper';
import MarketTicker from '@/components/login/MarketTicker';
import ScrambleButton from '@/components/login/ScrambleButton';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('This email is already registered. Try signing in instead.');
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // If Supabase requires email confirmation, session will be null
    if (data.session) {
      // Auto-confirmed — go straight to dashboard
      router.push('/');
      router.refresh();
    } else {
      // Email confirmation required
      setSuccess(
        'Account created! Check your inbox for a confirmation link, then sign in.'
      );
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <Background />

      <GlitchWrapper>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl shadow-[0_0_60px_-12px_rgba(59,130,246,0.3)]"
        >
          {/* Header */}
          <div className="mb-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-bold tracking-tighter text-white"
            >
              STARTUP<span className="text-blue-500">.</span>SIM
            </motion.h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '4rem' }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="mx-auto mt-2 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500"
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-3 font-mono text-xs tracking-widest text-slate-400 uppercase"
            >
              Register your startup entity
            </motion.p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-xs text-red-400"
            >
              <span className="mr-2 text-red-500">&#9632;</span>
              {error}
            </motion.div>
          )}

          {/* Success */}
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-mono text-xs text-emerald-400"
            >
              <span className="mr-2 text-emerald-500">&#10003;</span>
              {success}
              <Link
                href="/login"
                className="mt-2 block text-center font-semibold text-blue-400 hover:text-blue-300"
              >
                Go to Sign In &rarr;
              </Link>
            </motion.div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Founder ID
                </label>
                <input
                  type="email"
                  placeholder="ceo@startup.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-3 font-mono text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Encryption Key
                </label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-3 font-mono text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
                <p className="mt-1.5 ml-1 text-[10px] text-slate-600 font-mono">
                  MIN_LENGTH: 6 &middot; ENCRYPTION: AES-256
                </p>
              </div>

              <ScrambleButton
                label="REGISTER ENTITY"
                loadingLabel="ENCRYPTING..."
                loading={loading}
              />
            </form>
          )}

          {/* Footer links */}
          <div className="mt-8 flex items-center justify-center text-xs">
            <span className="text-slate-600">Already incorporated?</span>
            <Link
              href="/login"
              className="ml-2 font-semibold text-blue-400 transition-colors hover:text-blue-300"
            >
              Bootstrap Session &rarr;
            </Link>
          </div>

          {/* Terminal-style status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 border-t border-white/5 pt-4 font-mono text-[10px] text-slate-600 text-center"
          >
            <span className="text-emerald-500/60">&#9679;</span> SYSTEM ONLINE &middot; SECURE REGISTRATION &middot; v1.0.0
          </motion.div>
        </motion.div>
      </GlitchWrapper>

      <MarketTicker />
    </main>
  );
}
