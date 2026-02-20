import type { Turn } from '@/lib/types';

interface Props {
  turns: Turn[];
}

export default function TurnHistory({ turns }: Props) {
  if (turns.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
        <h2 className="font-mono font-semibold text-sm text-white tracking-wider mb-2">RECENT QUARTERS</h2>
        <p className="font-mono text-xs text-slate-600">No turns yet — make your first decision</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
      <h2 className="font-mono font-semibold text-sm text-white tracking-wider mb-3">LAST 4 QUARTERS</h2>
      <div className="space-y-2">
        {turns.map((t) => (
          <div key={t.id} className="rounded-lg border border-white/10 bg-slate-900/30 p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-mono text-xs font-bold text-white">Y{t.year} Q{t.quarter}</span>
              <span className={`font-mono text-xs font-bold ${t.outcomes.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {t.outcomes.profit >= 0 ? '+' : ''}${t.outcomes.profit.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 font-mono text-[10px] text-slate-500">
              <div>Revenue: ${t.outcomes.revenue.toLocaleString()}</div>
              <div>Costs: ${t.outcomes.costs.toLocaleString()}</div>
              <div>Units: {t.outcomes.units_sold}</div>
              <div>Price: ${t.decisions.price}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
