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
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">Quarterly Decisions</h2>

        <label className="block">
          <span className="text-sm text-gray-600">Price ($)</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full border rounded px-3 py-1.5 mt-1"
            disabled={disabled}
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Engineers to Hire</span>
          <input
            type="number"
            min={0}
            max={20}
            value={engineersToHire}
            onChange={(e) => setEngineersToHire(Number(e.target.value))}
            className="w-full border rounded px-3 py-1.5 mt-1"
            disabled={disabled}
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Sales to Hire</span>
          <input
            type="number"
            min={0}
            max={20}
            value={salesToHire}
            onChange={(e) => setSalesToHire(Number(e.target.value))}
            className="w-full border rounded px-3 py-1.5 mt-1"
            disabled={disabled}
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Salary (% of market)</span>
          <input
            type="number"
            min={50}
            max={200}
            value={salaryPct}
            onChange={(e) => setSalaryPct(Number(e.target.value))}
            className="w-full border rounded px-3 py-1.5 mt-1"
            disabled={disabled}
          />
        </label>

        <button
          type="submit"
          disabled={disabled || submitting}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Running simulation…' : 'Advance Quarter'}
        </button>
      </form>

      {/* Bot Advisor Panel */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">Bot Advisors</h2>
          <button
            onClick={fetchRecommendations}
            disabled={disabled || loadingBots}
            className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {loadingBots ? 'Analyzing…' : 'Get Advice'}
          </button>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-sm text-gray-400">Click &quot;Get Advice&quot; for bot recommendations</p>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div key={rec.strategy} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize text-sm">
                    {rec.strategy === 'cfo' ? '💰 CFO' : rec.strategy === 'growth' ? '🚀 Growth' : '⭐ Quality'}
                  </span>
                  <button
                    onClick={() => applyRecommendation(rec)}
                    disabled={disabled}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{rec.reasoning}</p>
                <div className="text-xs text-gray-400 mt-1">
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
