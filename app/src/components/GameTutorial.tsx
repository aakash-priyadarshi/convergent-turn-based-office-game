'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: 'kpi-cards',
    title: 'KEY PERFORMANCE INDICATORS',
    description:
      "Track your startup's vital signs here. Cash keeps you alive, Quality drives sales, Engineers improve your product, and Sales people push revenue. Keep cash above $0!",
    position: 'bottom',
  },
  {
    target: 'decision-form',
    title: 'QUARTERLY DECISIONS',
    description:
      'Every quarter, set 4 key parameters: Product Price (affects demand), Engineers & Sales to hire (grow your team), and Salary level (higher = better retention but more cost).',
    position: 'right',
  },
  {
    target: 'advance-btn',
    title: 'ADVANCE QUARTER',
    description:
      "Click this button to simulate the next quarter once you've set your decisions. The market responds to your pricing, and your team affects product quality and sales.",
    position: 'right',
  },
  {
    target: 'bot-advisors',
    title: 'AI STRATEGY ADVISORS',
    description:
      'Click "GET ADVICE" for AI analysis. Three bots analyze your startup and suggest strategies. Click "APPLY" on any recommendation to load those values into your decision form.',
    position: 'right',
  },
  {
    target: 'office-floor',
    title: 'OFFICE VISUALIZATION',
    description:
      'Watch your team grow! Blue desks = Engineers (improve quality), Green desks = Sales (drive revenue). Plan hiring carefully — you have 30 desks total!',
    position: 'top',
  },
  {
    target: 'turn-history',
    title: 'QUARTER HISTORY',
    description:
      'Review past quarter results here. Track revenue, costs, units sold, and profit trends to make better decisions going forward.',
    position: 'top',
  },
];

const STRATEGY_INFO = [
  {
    name: 'CFO',
    icon: '💰',
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    description:
      'Conservative: Protects cash, hires slowly, mid-high pricing. Best when cash is low or market is uncertain.',
  },
  {
    name: 'GROWTH',
    icon: '🚀',
    color: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    description:
      'Aggressive: Low prices for market share, hires aggressively. Best when you have cash to burn and need volume.',
  },
  {
    name: 'QUALITY',
    icon: '⭐',
    color: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    description:
      'Premium: High salaries attract top engineers, premium pricing. Best for sustainable long-term growth.',
  },
];

interface Props {
  onComplete: () => void;
}

export default function GameTutorial({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showStrategies, setShowStrategies] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const totalSteps = TUTORIAL_STEPS.length + 1; // +1 for strategy overview

  const updateTargetRect = useCallback(() => {
    if (showStrategies) {
      setTargetRect(null);
      return;
    }
    const step = TUTORIAL_STEPS[currentStep];
    if (!step) return;
    const el = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setTargetRect(null);
    }
  }, [currentStep, showStrategies]);

  useEffect(() => {
    // Small delay to let DOM render
    const t = setTimeout(updateTargetRect, 150);
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [updateTargetRect]);

  function handleNext() {
    if (showStrategies) {
      onComplete();
      return;
    }
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowStrategies(true);
    }
  }

  function handlePrev() {
    if (showStrategies) {
      setShowStrategies(false);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  const step = TUTORIAL_STEPS[currentStep];
  const padding = 10;

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = { position: 'fixed' };
  if (targetRect && step && !showStrategies) {
    const { position } = step;
    if (position === 'bottom') {
      tooltipStyle = {
        position: 'fixed',
        top: Math.min(targetRect.bottom + 14, window.innerHeight - 250),
        left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 160, window.innerWidth - 336)),
      };
    } else if (position === 'top') {
      tooltipStyle = {
        position: 'fixed',
        top: Math.max(16, targetRect.top - 200),
        left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 160, window.innerWidth - 336)),
      };
    } else if (position === 'right') {
      tooltipStyle = {
        position: 'fixed',
        top: Math.max(16, Math.min(targetRect.top, window.innerHeight - 250)),
        left: Math.min(targetRect.right + 14, window.innerWidth - 336),
      };
    } else if (position === 'left') {
      tooltipStyle = {
        position: 'fixed',
        top: Math.max(16, Math.min(targetRect.top, window.innerHeight - 250)),
        left: Math.max(16, targetRect.left - 334),
      };
    }
  }

  const stepNumber = showStrategies ? totalSteps : currentStep + 1;

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'auto' }}>
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && !showStrategies && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx={14}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.80)"
          mask="url(#tutorial-mask)"
          style={{ pointerEvents: 'all' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Highlight border around target */}
      {targetRect && !showStrategies && (
        <motion.div
          layoutId="tutorial-highlight"
          className="absolute border-2 border-blue-500 rounded-xl pointer-events-none z-10"
          style={{
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow:
              '0 0 20px rgba(59, 130, 246, 0.4), inset 0 0 20px rgba(59, 130, 246, 0.1)',
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        />
      )}

      {/* Tooltip card for element steps */}
      <AnimatePresence mode="wait">
        {!showStrategies && step && (
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="z-20 w-80 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-5 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]"
            style={tooltipStyle}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-blue-400">
                Step {stepNumber} of {totalSteps}
              </span>
              <button
                onClick={onComplete}
                className="font-mono text-[10px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
              >
                SKIP TOUR
              </button>
            </div>

            <h3 className="font-mono font-bold text-sm text-white mb-2">{step.title}</h3>
            <p className="font-mono text-[11px] text-slate-400 leading-relaxed mb-5">
              {step.description}
            </p>

            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="font-mono text-[10px] text-slate-500 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
              >
                &larr; PREV
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === stepNumber - 1 ? 'bg-blue-500 w-4' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                className="font-mono text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                {currentStep === TUTORIAL_STEPS.length - 1 ? 'STRATEGIES' : 'NEXT'} &rarr;
              </button>
            </div>
          </motion.div>
        )}

        {/* Strategy overview screen */}
        {showStrategies && (
          <motion.div
            key="strategies"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-8 shadow-[0_0_60px_-12px_rgba(59,130,246,0.3)]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-blue-400">
                Step {totalSteps} of {totalSteps}
              </span>
              <button
                onClick={onComplete}
                className="font-mono text-[10px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
              >
                SKIP
              </button>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white mb-1">
              AI STRATEGIES
            </h3>
            <p className="font-mono text-[11px] text-slate-400 mb-6">
              Three AI advisors offer different approaches. Use their advice or
              forge your own path.
            </p>

            <div className="space-y-3">
              {STRATEGY_INFO.map((s) => (
                <div
                  key={s.name}
                  className={`rounded-lg border p-4 ${s.color}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-mono text-sm font-bold">
                      {s.name} STRATEGY
                    </span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed opacity-80">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="font-mono text-[10px] text-slate-500 text-center">
                💡 <strong className="text-slate-400">WIN:</strong> Reach $50,000
                cumulative profit &nbsp;|&nbsp;{' '}
                <strong className="text-slate-400">LOSE:</strong> Run out of cash
                ($0)
              </p>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={handlePrev}
                className="font-mono text-[10px] text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                &larr; PREV
              </button>
              <button
                onClick={handleNext}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-mono text-xs font-bold tracking-wider text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] cursor-pointer"
              >
                START PLAYING &rarr;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
