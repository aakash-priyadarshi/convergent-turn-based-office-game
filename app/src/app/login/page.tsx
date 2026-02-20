'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Background from '@/components/login/Background';
import GlitchWrapper from '@/components/login/GlitchWrapper';
import MarketTicker from '@/components/login/MarketTicker';
import ScrambleButton from '@/components/login/ScrambleButton';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [welcome, setWelcome] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const validateEmail = useCallback((val: string) => {
    if (!val) {
      setEmailHint('');
      return false;
    }
    if (!EMAIL_RE.test(val)) {
      setEmailHint('Invalid email format — check for typos');
      return false;
    }
    setEmailHint('');
    return true;
  }, []);

  function handleEmailChange(val: string) {
    setEmail(val);
    if (val.length > 3) validateEmail(val);
    else setEmailHint('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(email.trim())) return;

    setLoading(true);
    setError('');
    setWelcome('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      if (
        authError.message.includes('Invalid login credentials') ||
        authError.message.includes('invalid_credentials')
      ) {
        setError(
          'No account found with these credentials. Check your email/password or register a new entity.'
        );
      } else if (authError.message.includes('Email not confirmed')) {
        setError(
          'Email not yet confirmed. Check your inbox for the verification link.'
        );
      } else {
        setError(authError.message);
      }
      setLoading(false);
    } else {
      setWelcome('Welcome back, Founder!');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1200);
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
              Authenticate to access your venture
            </motion.p>
          </div>

          {/* Welcome toast */}
          <AnimatePresence>
            {welcome && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center font-mono text-sm text-emerald-400"
              >
                <span className="mr-2">&#10003;</span>{welcome}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && !welcome && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-xs text-red-400"
              >
                <span className="mr-2 text-red-500">&#9632;</span>
                {error}
                {error.includes('register') && (
                  <Link
                    href="/signup"
                    className="mt-2 block text-center font-semibold text-blue-400 hover:text-blue-300"
                  >
                    Register Entity &rarr;
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Founder ID
              </label>
              <input
                type="email"
                placeholder="ceo@startup.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => validateEmail(email)}
                className={`w-full rounded-lg border bg-slate-900/50 px-4 py-3 font-mono text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-2 ${
                  emailHint
                    ? 'border-amber-500/50 focus:ring-amber-500/20'
                    : 'border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20'
                }`}
                required
                autoComplete="email"
              />
              {emailHint && (
                <p className="mt-1.5 ml-1 font-mono text-[10px] text-amber-400">
                  &#9888; {emailHint}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Access Key
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-3 font-mono text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                required
                autoComplete="current-password"
              />
            </div>

            <ScrambleButton
              label="BOOTSTRAP SESSION"
              loadingLabel="DECRYPTING..."
              loading={loading}
            />
          </form>

          {/* Footer links */}
          <div className="mt-8 flex items-center justify-center text-xs">
            <span className="text-slate-600">New founder?</span>
            <Link
              href="/signup"
              className="ml-2 font-semibold text-blue-400 transition-colors hover:text-blue-300"
            >
              Register Entity &rarr;
            </Link>
          </div>

          {/* Terminal-style status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 border-t border-white/5 pt-4 font-mono text-[10px] text-slate-600 text-center"
          >
            <span className="text-emerald-500/60">&#9679;</span> SYSTEM ONLINE &middot; MARKET DATA STREAMING &middot; v1.0.0
          </motion.div>
        </motion.div>
      </GlitchWrapper>

      <MarketTicker />
    </main>
  );
}
