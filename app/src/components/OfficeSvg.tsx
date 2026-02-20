import Image from 'next/image';

interface Props {
  engineers: number;
  sales: number;
}

/**
 * Office floor visualisation split into Engineering and Sales wings.
 * Uses PNG icons from /public and a responsive CSS grid that grows
 * dynamically with headcount instead of capping at a fixed desk count.
 */
export default function OfficeSvg({ engineers, sales }: Props) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5"
      data-tutorial="office-floor"
      role="img"
      aria-label={`Office with ${engineers} engineers and ${sales} sales people`}
    >
      <h2 className="font-mono font-semibold text-sm text-white tracking-wider mb-4">
        OFFICE FLOOR
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Engineering wing */}
        <FloorSection
          title="Engineering"
          count={engineers}
          icon="/engineer.png"
          accentClass="border-blue-500/30 bg-blue-500/5"
          badgeClass="bg-blue-500/20 text-blue-400"
          cellClass="bg-blue-500/15 border-blue-500/20"
        />

        {/* Sales wing */}
        <FloorSection
          title="Sales"
          count={sales}
          icon="/sales.png"
          accentClass="border-emerald-500/30 bg-emerald-500/5"
          badgeClass="bg-emerald-500/20 text-emerald-400"
          cellClass="bg-emerald-500/15 border-emerald-500/20"
        />
      </div>

      {/* Total headcount footer */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
          Total Headcount
        </span>
        <span className="font-mono text-xs font-bold text-white">
          {engineers + sales}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface FloorSectionProps {
  title: string;
  count: number;
  icon: string;
  accentClass: string;
  badgeClass: string;
  cellClass: string;
}

function FloorSection({ title, count, icon, accentClass, badgeClass, cellClass }: FloorSectionProps) {
  // Show a few empty desks so capacity / growth room is always visible.
  const capacity = Math.max(count + 4, 8);
  const empty = capacity - count;

  return (
    <div className={`rounded-lg border p-3 ${accentClass}`}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          {title}
        </span>
        <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
          {count}
        </span>
      </div>

      {/* Desk grid — filled desks followed by empty placeholders */}
      <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={`filled-${i}`}
            className={`relative aspect-square rounded border flex items-center justify-center ${cellClass}`}
          >
            <Image
              src={icon}
              alt={title}
              width={24}
              height={24}
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
              unoptimized
            />
          </div>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="relative aspect-square rounded border border-dashed border-white/10 flex items-center justify-center"
          />
        ))}
      </div>
    </div>
  );
}
