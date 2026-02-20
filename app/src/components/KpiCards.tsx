import type { GameState } from '@/lib/types';

interface Props {
  game: GameState;
}

export default function KpiCards({ game }: Props) {
  const cards = [
    { label: 'Cash', value: `$${game.cash.toLocaleString()}`, color: game.cash < 2000 ? 'text-red-600' : 'text-green-600' },
    { label: 'Quality', value: `${game.quality.toFixed(1)}%`, color: game.quality > 60 ? 'text-blue-600' : 'text-yellow-600' },
    { label: 'Engineers', value: game.engineers.toString(), color: 'text-purple-600' },
    { label: 'Sales', value: game.sales.toString(), color: 'text-indigo-600' },
    { label: 'Profit', value: `$${game.cumulative_profit.toLocaleString()}`, color: game.cumulative_profit >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'Period', value: `Y${game.current_year} Q${game.current_quarter}`, color: 'text-gray-600' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-xs text-gray-500 uppercase">{c.label}</div>
          <div className={`text-lg font-bold ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
