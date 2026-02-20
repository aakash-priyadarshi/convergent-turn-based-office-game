'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

const PERSONALITY_QUESTIONS = [
  {
    question: 'How do you approach risk?',
    options: [
      { label: 'Play it safe — protect what we have', value: 'conservative' },
      { label: 'Calculated risks — balance growth and safety', value: 'balanced' },
      { label: 'Go big or go home — maximum growth', value: 'aggressive' },
    ],
  },
  {
    question: 'What matters most in a startup?',
    options: [
      { label: 'Engineering excellence & product quality', value: 'engineering' },
      { label: 'Market domination & rapid scaling', value: 'market' },
      { label: 'Financial discipline & profitability', value: 'finance' },
    ],
  },
  {
    question: 'Your leadership style?',
    options: [
      { label: 'Visionary — inspire the team with bold ideas', value: 'visionary' },
      { label: 'Analytical — data drives every decision', value: 'analytical' },
      { label: 'Hands-on — in the trenches with the team', value: 'hands-on' },
    ],
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const supabase = createClient();
  const totalQuestions = PERSONALITY_QUESTIONS.length;
  const totalSteps = totalQuestions + 3; // name + questions + generating + done

  const [step, setStep] = useState(0); // 0=name, 1..N=questions, N+1=generating, N+2=done
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [generating, setGenerating] = useState(false);

  function handleNameSubmit() {
    if (name.trim().length < 2) return;
    setStep(1);
  }

  function handleAnswer(value: string) {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (newAnswers.length < totalQuestions) {
      setStep(step + 1);
    } else {
      generateBio(newAnswers);
    }
  }

  async function generateBio(personalityAnswers: string[]) {
    const genStep = totalQuestions + 1;
    setStep(genStep);
    setGenerating(true);

    // Save name to user metadata
    try {
      await supabase.auth.updateUser({
        data: { display_name: name.trim() },
      });
    } catch {
      // Non-blocking
    }

    // Generate bio via API
    try {
      const res = await fetch('/api/profile/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          personality: personalityAnswers,
        }),
      });
      const data = await res.json();
      setBio(data.bio || `${name.trim()} is a visionary startup founder ready to change the world.`);
    } catch {
      setBio(`${name.trim()} is a visionary startup founder with a relentless drive to build products that matter.`);
    }

    setGenerating(false);
    setStep(genStep + 1);
  }

  const questionIndex = step - 1;
  const progressFraction = Math.min(step / (totalSteps - 1), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-8 shadow-[0_0_60px_-12px_rgba(59,130,246,0.3)]"
      >
        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-white/5 mb-8 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressFraction * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Name */}
          {step === 0 && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                WELCOME<span className="text-blue-500">,</span> FOUNDER
              </h2>
              <p className="font-mono text-xs text-slate-400 mb-6">
                Let&apos;s set up your founder identity before you launch your first venture.
              </p>

              <label className="block mb-5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Full Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  placeholder="e.g. Alex Chen"
                  className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-3 mt-1.5 font-mono text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  autoFocus
                />
              </label>

              <button
                onClick={handleNameSubmit}
                disabled={name.trim().length < 2}
                className="w-full rounded-lg bg-blue-600 py-3 font-mono text-sm font-bold tracking-wider text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] disabled:opacity-30 cursor-pointer"
              >
                CONTINUE
              </button>
            </motion.div>
          )}

          {/* Steps 1-N: Personality questions */}
          {step >= 1 && step <= totalQuestions && (
            <motion.div
              key={`q-${questionIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  FOUNDER PROFILE
                </h2>
                <span className="font-mono text-[10px] text-slate-600">
                  {questionIndex + 1} / {totalQuestions}
                </span>
              </div>
              <p className="font-mono text-xs text-slate-400 mb-6">
                {PERSONALITY_QUESTIONS[questionIndex].question}
              </p>

              <div className="space-y-2.5">
                {PERSONALITY_QUESTIONS[questionIndex].options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className="w-full text-left rounded-lg border border-white/10 bg-slate-800/30 px-4 py-3.5 font-mono text-xs text-slate-300 transition-all hover:bg-white/10 hover:border-blue-500/30 hover:text-white cursor-pointer"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Generating step */}
          {step === totalQuestions + 1 && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10"
            >
              <div className="inline-block w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-5" />
              <p className="font-mono text-sm text-white">SYNTHESIZING FOUNDER PROFILE...</p>
              <p className="font-mono text-[10px] text-slate-500 mt-2">AI is crafting your identity</p>
            </motion.div>
          )}

          {/* Done step */}
          {step === totalQuestions + 2 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
                MEET {name.trim().toUpperCase().split(' ')[0]}<span className="text-blue-500">.</span>
              </h2>
              <div className="h-0.5 w-12 bg-gradient-to-r from-blue-500 to-emerald-500 mb-5" />

              <div className="rounded-lg border border-white/10 bg-slate-800/50 px-5 py-4 mb-6">
                <p className="font-mono text-xs text-slate-300 leading-relaxed">{bio}</p>
              </div>

              <button
                onClick={onComplete}
                className="group relative w-full overflow-hidden rounded-lg bg-blue-600 py-3.5 font-mono text-sm font-bold tracking-wider text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] cursor-pointer"
              >
                <span className="relative z-10">LAUNCH INTO SIMULATION</span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
