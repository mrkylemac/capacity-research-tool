'use client';

import { useMemo, useState } from 'react';
import { PlanView } from '@/components/tiles/PlanView';
import { ElevationView } from '@/components/tiles/ElevationView';
import { ControlsPanel } from '@/components/tiles/ControlsPanel';
import { StatsPanel } from '@/components/tiles/StatsPanel';
import { LayupBriefView } from '@/components/tiles/LayupBrief';
import {
  DEFAULT_CONFIG,
  computeDeckGeometry,
  computeDeckTiles,
} from '@/lib/tilePlanner';
import type { TilePlanConfig } from '@/types/tiles';

export function TilesClient() {
  const [config, setConfig] = useState<TilePlanConfig>(DEFAULT_CONFIG);
  const [showGrid, setShowGrid] = useState(true);
  const [showCuts, setShowCuts] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showFittings, setShowFittings] = useState(true);

  const geometry = useMemo(() => computeDeckGeometry(config), [config]);
  const { cells, stats } = useMemo(
    () => computeDeckTiles(config, geometry),
    [config, geometry],
  );

  return (
    <main className="min-h-screen">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-1 text-sky-4 border border-sky-2 tracking-wide uppercase">
              Build
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Tile Planner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Slow Folk pool tile layout — minimise cuts, place fittings, check waterline alignment
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6 min-w-0">
            <div className="section-animate" style={{ animationDelay: '0ms' }}>
              <LayupBriefView config={config} stats={stats} />
            </div>

            <div className="section-animate" style={{ animationDelay: '60ms' }}>
              <PlanView
                config={config}
                geometry={geometry}
                cells={cells}
                showGrid={showGrid}
                showCuts={showCuts}
                showDimensions={showDimensions}
                showFittings={showFittings}
              />
            </div>

            <div className="section-animate" style={{ animationDelay: '120ms' }}>
              <StatsPanel stats={stats} config={config} />
            </div>

            <div className="section-animate" style={{ animationDelay: '180ms' }}>
              <ElevationView config={config} />
            </div>
          </div>

          <div className="section-animate xl:sticky xl:top-4 xl:self-start" style={{ animationDelay: '90ms' }}>
            <ControlsPanel
              config={config}
              onChange={setConfig}
              showGrid={showGrid}
              setShowGrid={setShowGrid}
              showCuts={showCuts}
              setShowCuts={setShowCuts}
              showDimensions={showDimensions}
              setShowDimensions={setShowDimensions}
              showFittings={showFittings}
              setShowFittings={setShowFittings}
              onReset={() => setConfig(DEFAULT_CONFIG)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
