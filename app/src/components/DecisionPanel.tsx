'use client';

import { useState } from 'react';
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
      setRecommendations(Array.isArray(data) ? data : [data]);
    } catch {
      // Non-blocking: bots are advisory
    }
    setLoadingBots(false);
  }

  function applyRecommendation(rec: BotRecommendation) {
    setPrice(rec.decisions.price);
    setEngineersToHire(rec.decisions.engineers_to_hire);
    setSalesToHire(rec.decisions.sales_to_hire);
    setSalaryPct(rec.decisions.salary_pct);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-4">
        <h2 className="font-mono font-semibold text-sm text-white tracking-wider">QUARTERLY DECISIONS</h2>

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
          className="group relative w-full overflow-hidden rounded-lg bg-blue-600 py-3 font-mono text-sm font-bold tracking-wider text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] disabled:opacity-50 cursor-pointer"
        >
          <span className="relative z-10">{submitting ? 'SIMULATING...' : 'ADVANCE QUARTER'}</span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700" />
        </button>
      </form>

      {/* Bot Advisor Panel */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono font-semibold text-sm text-white tracking-wider">BOT ADVISORS</h2>
          <button
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
            {recommendations.map((rec) => (
              <div key={rec.strategy} className="rounded-lg border border-white/10 bg-slate-900/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-white">
                    {rec.strategy === 'cfo' ? 'CFO' : rec.strategy === 'growth' ? 'GROWTH' : 'QUALITY'}
                  </span>
                  <button
                    onClick={() => applyRecommendation(rec)}
                    disabled={disabled}
                    className="font-mono text-[10px] border border-blue-500/30 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md hover:bg-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    APPLY
                  </button>
                </div>
                <p className="font-mono text-[10px] text-slate-400 mt-1.5 leading-relaxed">{rec.reasoning}</p>
                <div className="font-mono text-[10px] text-slate-600 mt-1.5">
                  Price: ${rec.decisions.price} | Eng: +{rec.decisions.engineers_to_hire} |
                  Sales: +{rec.decisions.sales_to_hire} | Salary: {rec.decisions.salary_pct}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
