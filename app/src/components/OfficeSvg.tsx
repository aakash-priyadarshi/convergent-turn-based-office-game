interface Props {
  engineers: number;
  sales: number;
  maxDesks?: number;
}

const COLS = 6;
const DESK_SIZE = 36;
const GAP = 8;

/**
 * Office floor plan SVG: fixed grid of desks.
 * Engineers (blue) fill first, then sales (green), rest empty (gray).
 */
export default function OfficeSvg({ engineers, sales, maxDesks = 30 }: Props) {
  const rows = Math.ceil(maxDesks / COLS);
  const width = COLS * (DESK_SIZE + GAP) + GAP;
  const height = rows * (DESK_SIZE + GAP) + GAP + 30; // +30 for legend

  const desks: { type: 'engineer' | 'sales' | 'empty'; index: number }[] = [];
  for (let i = 0; i < maxDesks; i++) {
    if (i < engineers) desks.push({ type: 'engineer', index: i });
    else if (i < engineers + sales) desks.push({ type: 'sales', index: i });
    else desks.push({ type: 'empty', index: i });
  }

  const colors = {
    engineer: '#3B82F6',
    sales: '#10B981',
    empty: '#334155',
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5" data-tutorial="office-floor">
      <h2 className="font-mono font-semibold text-sm text-white tracking-wider mb-3">OFFICE FLOOR</h2>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Office with ${engineers} engineers and ${sales} sales people`}
      >
        {/* Floor */}
        <rect x={0} y={0} width={width} height={height - 28} rx={6} fill="#0f172a" stroke="#1e293b" />

        {desks.map((desk) => {
          const col = desk.index % COLS;
          const row = Math.floor(desk.index / COLS);
          const x = GAP + col * (DESK_SIZE + GAP);
          const y = GAP + row * (DESK_SIZE + GAP);

          return (
            <g key={desk.index}>
              <rect
                x={x}
                y={y}
                width={DESK_SIZE}
                height={DESK_SIZE}
                rx={4}
                fill={colors[desk.type]}
                opacity={desk.type === 'empty' ? 0.3 : 0.85}
              />
              {desk.type !== 'empty' && (
                <text
                  x={x + DESK_SIZE / 2}
                  y={y + DESK_SIZE / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={14}
                  fill="white"
                >
                  {desk.type === 'engineer' ? '🛠' : '📞'}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <rect x={GAP} y={height - 24} width={12} height={12} rx={2} fill={colors.engineer} />
        <text x={GAP + 16} y={height - 14} fontSize={10} fill="#94a3b8" fontFamily="monospace">Eng ({engineers})</text>

        <rect x={GAP + 80} y={height - 24} width={12} height={12} rx={2} fill={colors.sales} />
        <text x={GAP + 96} y={height - 14} fontSize={10} fill="#94a3b8" fontFamily="monospace">Sales ({sales})</text>

        <rect x={GAP + 160} y={height - 24} width={12} height={12} rx={2} fill={colors.empty} opacity={0.3} />
        <text x={GAP + 176} y={height - 14} fontSize={10} fill="#94a3b8" fontFamily="monospace">Empty ({Math.max(0, maxDesks - engineers - sales)})</text>
      </svg>
    </div>
  );
}
