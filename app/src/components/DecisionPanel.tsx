'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Decisions, BotRecommendation } from '@/lib/types';

interface Props {
  gameId: string;
  disabled: boolean;
  turnVersion: number; // changes each turn — triggers bot auto-refresh
  onAdvance: (decisions: Decisions) => Promise<void>;
}

export default function DecisionPanel({ gameId, disabled, turnVersion, onAdvance }: Props) {
  const [price, setPrice] = useState(100);
  const [engineersToHire, setEngineersToHire] = useState(1);
  const [salesToHire, setSalesToHire] = useState(1);
  const [salaryPct, setSalaryPct] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [recommendations, setRecommendations] = useState<BotRecommendation[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);
  const [appliedStrategy, setAppliedStrategy] = useState<string | null>(null);
  const [applyFlash, setApplyFlash] = useState(false);
  const [situationBrief, setSituationBrief] = useState<string>('');
  const [showSituationAlert, setShowSituationAlert] = useState(false);
  const [isNewTurnAlert, setIsNewTurnAlert] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const advisorRef = useRef<HTMLDivElement>(null);
  const prevTurnVersion = useRef(turnVersion);

  // Clear the applied indicator after delay
  useEffect(() => {
    if (appliedStrategy) {
      const t = setTimeout(() => setAppliedStrategy(null), 3000);
      return () => clearTimeout(t);
    }
  }, [appliedStrategy]);

  useEffect(() => {
    if (applyFlash) {
      const t = setTimeout(() => setApplyFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [applyFlash]);

  const fetchRecommendations = useCallback(async (isAutoRefresh = false) => {
    setLoadingBots(true);
    try {
      const res = await fetch(`/api/game/${gameId}/bot/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) {
        console.error('Bot recommend error:', data.error);
        setRecommendations([]);
      } else {
        // New API format returns { recommendations, situationBrief }
        const recs = data.recommendations || (Array.isArray(data) ? data : [data]);
        setRecommendations(recs);
        if (data.situationBrief) {
          setSituationBrief(data.situationBrief);
          if (isAutoRefresh) {
            setShowSituationAlert(true);
            setIsNewTurnAlert(true);
          }
        }
      }
    } catch (err) {
      console.error('Bot recommend fetch error:', err);
    }
    setLoadingBots(false);
  }, [gameId]);

  // Auto-fetch bot advice when turn changes
  useEffect(() => {
    if (turnVersion !== prevTurnVersion.current) {
      prevTurnVersion.current = turnVersion;
      // Turn changed — auto-refresh advice after a brief delay for dramatic effect
      const t = setTimeout(() => {
        fetchRecommendations(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [turnVersion, fetchRecommendations]);

  // Auto-dismiss situation alert
  useEffect(() => {
    if (showSituationAlert && isNewTurnAlert) {
      const t = setTimeout(() => {
        setIsNewTurnAlert(false);
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [showSituationAlert, isNewTurnAlert]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setShowSituationAlert(false);
    setIsNewTurnAlert(false);
    await onAdvance({
      price,
      engineers_to_hire: engineersToHire,
      sales_to_hire: salesToHire,
      salary_pct: salaryPct,
    });
    setSubmitting(false);
    setAppliedStrategy(null);
  }

  function applyRecommendation(rec: BotRecommendation) {
    setPrice(rec.decisions.price);
    setEngineersToHire(rec.decisions.engineers_to_hire);
    setSalesToHire(rec.decisions.sales_to_hire);
    setSalaryPct(rec.decisions.salary_pct);
    setAppliedStrategy(rec.strategy);
    setApplyFlash(true);
    // Scroll to form
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return (
    <div className="space-y-4">
      {/* Situation Alert Banner */}
      <AnimatePresence>
        {showSituationAlert && situationBrief && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className={`rounded-xl border p-4 backdrop-blur-sm transition-all ${
              isNewTurnAlert
                ? 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)]'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {isNewTurnAlert && (
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                    {isNewTurnAlert ? 'NEW QUARTER — SITUATION BRIEF' : 'SITUATION BRIEF'}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-300 leading-relaxed">{situationBrief}</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowSituationAlert(false); setIsNewTurnAlert(false); }}
                className="font-mono text-[10px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer shrink-0 mt-0.5"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        data-tutorial="decision-form"
        className={`rounded-xl border bg-white/5 backdrop-blur-sm p-5 space-y-4 transition-all duration-500 ${
          applyFlash
            ? 'border-blue-500/60 shadow-[0_0_30px_-5px_rgba(59,130,246,0.4)]'
            : 'border-white/10'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-mono font-semibold text-sm text-white tracking-wider">QUARTERLY DECISIONS</h2>
          {appliedStrategy && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 animate-pulse">
              {appliedStrategy.toUpperCase()} APPLIED
            </span>
          )}
        </div>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Price ($)</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 mt-1 font-mono text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-40"
            disabled={disabled}
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Engineers to Hire</span>
          <input
            type="number"
            min={0}
            max={20}
            value={engineersToHire}
            onChange={(e) => setEngineersToHire(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 mt-1 font-mono text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-40"
            disabled={disabled}
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Sales to Hire</span>
          <input
            type="number"
            min={0}
            max={20}
            value={salesToHire}
            onChange={(e) => setSalesToHire(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 mt-1 font-mono text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-40"
            disabled={disabled}
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Salary (% of Market)</span>
          <input
            type="number"
            min={50}
            max={200}
            value={salaryPct}
            onChange={(e) => setSalaryPct(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 mt-1 font-mono text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-40"
            disabled={disabled}
          />
        </label>

        <button
          type="submit"
          disabled={disabled || submitting}
          data-tutorial="advance-btn"
          className={`group relative w-full overflow-hidden rounded-lg py-3 font-mono text-sm font-bold tracking-wider text-white transition-all disabled:opacity-50 cursor-pointer ${
            appliedStrategy
              ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)]'
              : 'bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)]'
          }`}
        >
          <span className="relative z-10">
            {submitting ? 'SIMULATING...' : appliedStrategy ? `ADVANCE WITH ${appliedStrategy.toUpperCase()}` : 'ADVANCE QUARTER'}
          </span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700" />
        </button>
      </form>

      {/* Bot Advisor Panel */}
      <div ref={advisorRef} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5" data-tutorial="bot-advisors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-mono font-semibold text-sm text-white tracking-wider">BOT ADVISORS</h2>
            {isNewTurnAlert && recommendations.length > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400"
              >
                UPDATED
              </motion.span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fetchRecommendations(false)}
            disabled={disabled || loadingBots}
            className="font-mono text-[10px] uppercase tracking-wider border border-white/10 bg-white/5 text-slate-400 px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {loadingBots ? 'ANALYZING...' : 'REFRESH ADVICE'}
          </button>
        </div>

        {loadingBots && recommendations.length === 0 ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="font-mono text-xs text-slate-500">Advisors analyzing new situation...</span>
          </div>
        ) : recommendations.length === 0 ? (
          <p className="font-mono text-xs text-slate-600">Request bot analysis for strategic recommendations</p>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec) => {
              const isApplied = appliedStrategy === rec.strategy;
              return (
                <div
                  key={rec.strategy}
                  className={`rounded-lg border p-3 transition-all duration-300 ${
                    isApplied
                      ? 'border-blue-500/40 bg-blue-500/10 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]'
                      : 'border-white/10 bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-white">
                      {rec.strategy === 'cfo' ? '💰 CFO' : rec.strategy === 'growth' ? '🚀 GROWTH' : '⭐ QUALITY'}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyRecommendation(rec)}
                      disabled={disabled}
                      className={`font-mono text-[10px] px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        isApplied
                          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                      } disabled:opacity-50`}
                    >
                      {isApplied ? '✓ APPLIED' : 'APPLY'}
                    </button>
                  </div>
                  <p className="font-mono text-[10px] text-slate-400 mt-1.5 leading-relaxed">{rec.reasoning}</p>
                  <div className="font-mono text-[10px] text-slate-600 mt-1.5">
                    Price: ${rec.decisions.price} | Eng: +{rec.decisions.engineers_to_hire} |
                    Sales: +{rec.decisions.sales_to_hire} | Salary: {rec.decisions.salary_pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
