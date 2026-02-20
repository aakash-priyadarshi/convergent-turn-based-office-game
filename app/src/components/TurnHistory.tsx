import type { Turn } from '@/lib/types';

interface Props {
  turns: Turn[];
}

export default function TurnHistory({ turns }: Props) {
  if (turns.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-2">Recent Quarters</h2>
        <p className="text-sm text-gray-400">No turns yet — make your first decision!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold mb-3">Last 4 Quarters</h2>
      <div className="space-y-2">
        {turns.map((t) => (
          <div key={t.id} className="border rounded p-3 text-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium">Y{t.year} Q{t.quarter}</span>
              <span className={t.outcomes.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {t.outcomes.profit >= 0 ? '+' : ''}${t.outcomes.profit.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-500">
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
