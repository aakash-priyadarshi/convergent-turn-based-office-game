import type { GameState } from '@/lib/types';

interface Props {
  game: GameState;
}

export default function KpiCards({ game }: Props) {
  const cards = [
    { label: 'Cash', value: `$${Number(game.cash).toLocaleString()}`, color: Number(game.cash) < 2000 ? 'text-red-400' : 'text-emerald-400' },
    { label: 'Quality', value: `${Number(game.quality).toFixed(1)}%`, color: Number(game.quality) > 60 ? 'text-blue-400' : 'text-amber-400' },
    { label: 'Engineers', value: game.engineers.toString(), color: 'text-purple-400' },
    { label: 'Sales', value: game.sales.toString(), color: 'text-indigo-400' },
    { label: 'Profit', value: `$${Number(game.cumulative_profit).toLocaleString()}`, color: Number(game.cumulative_profit) >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Period', value: `Y${game.current_year} Q${game.current_quarter}`, color: 'text-slate-300' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{c.label}</div>
          <div className={`mt-1 font-mono text-lg font-bold ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
