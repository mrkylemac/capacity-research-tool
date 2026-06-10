'use client';

import type { TilePlanConfig, TileStats } from '@/types/tiles';

interface StatsPanelProps {
  stats: TileStats;
  config: TilePlanConfig;
}

export function StatsPanel({ stats, config }: StatsPanelProps) {
  const totalArea = stats.total * config.tileSize * config.tileSize;
  const usedAreaPct = 100 - stats.wastePercent;
  const tileM2 = (config.tileSize * config.tileSize) / 1_000_000;
  const m2Needed = stats.total * tileM2;

  const cutPercent =
    stats.total === 0 ? 0 : (stats.cut / stats.total) * 100;

  return (
    <div className="bg-card rounded-2xl border border-gray-2 shadow-1 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold">Deck tile count</p>
        <p className="text-xs text-muted-foreground">Top horizontal surface only</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <KPI label="Full tiles" value={stats.full} tone="good" />
        <KPI label="Cut tiles" value={stats.cut} tone={cutPercent > 25 ? 'warn' : 'neutral'} hint={`${cutPercent.toFixed(1)}%`} />
        <KPI label="Total tiles" value={stats.total} />
        <KPI label="Coverage m²" value={m2Needed.toFixed(2)} hint="add 10% wastage" />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Material yield
          </p>
          <p className="text-xs tabular-nums">
            <span className="font-semibold text-fg-4">{usedAreaPct.toFixed(1)}%</span>
            <span className="text-muted-foreground"> used</span>
          </p>
        </div>
        <div className="h-2 bg-gray-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${usedAreaPct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {stats.wastePercent.toFixed(1)}% of purchased tile area becomes offcut waste.
        </p>
      </div>

      {stats.cutSizes.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Cut sizes
          </p>
          <ul className="space-y-1">
            {stats.cutSizes.slice(0, 6).map(c => (
              <li key={c.label} className="flex items-center justify-between text-sm">
                <span className="font-mono text-muted-foreground">{c.label} mm</span>
                <span className="tabular-nums font-medium">×{c.count}</span>
              </li>
            ))}
            {stats.cutSizes.length > 6 && (
              <li className="text-[11px] text-muted-foreground italic">
                + {stats.cutSizes.length - 6} more sizes
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'good' | 'warn' | 'neutral';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-green-4'
      : tone === 'warn'
        ? 'text-red-4'
        : 'text-fg-4';
  return (
    <div className="bg-gray-1 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums leading-tight ${toneClass}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
