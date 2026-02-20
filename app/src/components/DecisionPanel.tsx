'use client';

import { useState, useRef, useEffect } from 'react';
import type { Decisions, BotRecommendation } from '@/lib/types';

interface Props {
  gameId: string;
  disabled: boolean;
  onAdvance: (decisions: Decisions) => Promise<void>;
}

export default function DecisionPanel({ gameId, disabled, onAdvance }: Props) {
  const [price, setPrice] = useState(100);
  const [engineersToHire, setEngineersToHire] = useState(1);
  const [salesToHire, setSalesToHire] = useState(1);
  const [salaryPct, setSalaryPct] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [recommendations, setRecommendations] = useState<BotRecommendation[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);
  const [appliedStrategy, setAppliedStrategy] = useState<string | null>(null);
  const [applyFlash, setApplyFlash] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onAdvance({
      price,
      engineers_to_hire: engineersToHire,
      sales_to_hire: salesToHire,
      salary_pct: salaryPct,
    });
    setSubmitting(false);
    setAppliedStrategy(null);
  }

  async function fetchRecommendations() {
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
        setRecommendations(Array.isArray(data) ? data : [data]);
      }
    } catch (err) {
      console.error('Bot recommend fetch error:', err);
    }
    setLoadingBots(false);
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
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5" data-tutorial="bot-advisors">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono font-semibold text-sm text-white tracking-wider">BOT ADVISORS</h2>
          <button
            type="button"
            onClick={fetchRecommendations}
            disabled={disabled || loadingBots}
            className="font-mono text-[10px] uppercase tracking-wider border border-white/10 bg-white/5 text-slate-400 px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {loadingBots ? 'ANALYZING...' : 'GET ADVICE'}
          </button>
        </div>

        {recommendations.length === 0 ? (
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
