'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type { Bench, WallId } from '@/types/saunaMaterials';

const WALL_LABEL: Record<WallId, string> = {
  north: 'North wall',
  south: 'South wall',
  east:  'East wall',
  west:  'West wall',
};

interface WallElevationProps {
  wall: WallId;
  benches: Bench[];
  ceilingHeight: number;
  wallLength: number;
}

const VIEW_W = 720;
const VIEW_H = 320;
const PAD_X = 60;
const PAD_TOP = 30;
const PAD_BOTTOM = 60;

function WallElevation({ wall, benches, ceilingHeight, wallLength }: WallElevationProps) {
  const innerW = VIEW_W - PAD_X * 2;
  const innerH = VIEW_H - PAD_TOP - PAD_BOTTOM;
  const xScale = innerW / wallLength;
  const yScale = innerH / ceilingHeight;

  const floorY = PAD_TOP + innerH;
  const ceilY = PAD_TOP;

  // Tallest bench tops set the visual stack ordering.
  const sorted = [...benches].sort((a, b) => a.topHeight - b.topHeight);

  // Resolve front height per tier (matches benches.ts logic).
  const lowerTops = (b: Bench) =>
    benches.filter(x => x.topHeight < b.topHeight).map(x => x.topHeight);
  const frontHeight = (b: Bench) => {
    const lowers = lowerTops(b);
    return lowers.length === 0 ? b.topHeight : b.topHeight - Math.max(...lowers);
  };

  return (
    <div className="rounded-xl border border-gray-2 bg-card p-4">
      <p className="text-sm font-semibold text-fg-4 mb-2">{WALL_LABEL[wall]}</p>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto">
        {/* Ceiling line */}
        <line
          x1={PAD_X}
          y1={ceilY}
          x2={PAD_X + innerW}
          y2={ceilY}
          stroke="var(--gray-3)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text
          x={PAD_X + innerW + 6}
          y={ceilY + 4}
          className="fill-muted-foreground"
          style={{ fontSize: 10 }}
        >
          FCL · {ceilingHeight}mm
        </text>

        {/* Floor */}
        <line x1={PAD_X} y1={floorY} x2={PAD_X + innerW} y2={floorY} stroke="var(--gray-4)" strokeWidth={1.5} />
        <text
          x={PAD_X + innerW + 6}
          y={floorY + 4}
          className="fill-muted-foreground"
          style={{ fontSize: 10 }}
        >
          AFF 0
        </text>

        {/* Wall hatch */}
        <pattern id={`hatch-${wall}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--gray-3)" strokeWidth={1} />
        </pattern>
        <rect
          x={PAD_X - 16}
          y={ceilY}
          width={16}
          height={innerH}
          fill={`url(#hatch-${wall})`}
          opacity={0.7}
        />

        {/* Benches */}
        {sorted.map((b, i) => {
          const startMm = b.startOffset ?? Math.max(0, (wallLength - b.length) / 2);
          const bx = PAD_X + startMm * xScale;
          const bw = b.length * xScale;
          const topY = floorY - b.topHeight * yScale;
          const fh = frontHeight(b);
          const fhPx = fh * yScale;
          const slatThicknessPx = 6;
          const fillColour = ['var(--purple-3)', 'var(--sky-3)', 'var(--green-3)', 'var(--pink-3)'][i % 4];

          return (
            <g key={b.id}>
              {/* Front fascia */}
              <rect
                x={bx}
                y={topY}
                width={bw}
                height={fhPx}
                fill={fillColour}
                opacity={b.closedFront ? 0.55 : 0.25}
                stroke={fillColour}
                strokeWidth={1}
                rx={2}
              />
              {/* Slat lines on the front */}
              {Array.from({ length: Math.max(2, Math.floor(fh / 90)) }).map((_, k) => {
                const yPos = topY + (fhPx / Math.max(2, Math.floor(fh / 90))) * (k + 0.5);
                return (
                  <line
                    key={k}
                    x1={bx + 2}
                    y1={yPos}
                    x2={bx + bw - 2}
                    y2={yPos}
                    stroke="var(--background)"
                    strokeWidth={0.6}
                    opacity={0.7}
                  />
                );
              })}
              {/* Top slat */}
              <rect
                x={bx}
                y={topY - slatThicknessPx}
                width={bw}
                height={slatThicknessPx}
                fill={fillColour}
                stroke="var(--gray-4)"
                strokeWidth={0.5}
                rx={1.5}
              />
              {/* End caps */}
              {(b.hasEndCap === 'left' || b.hasEndCap === 'both') && (
                <line x1={bx} y1={topY} x2={bx} y2={topY + fhPx} stroke="var(--gray-4)" strokeWidth={2} />
              )}
              {(b.hasEndCap === 'right' || b.hasEndCap === 'both') && (
                <line x1={bx + bw} y1={topY} x2={bx + bw} y2={topY + fhPx} stroke="var(--gray-4)" strokeWidth={2} />
              )}
              {/* Backrest */}
              {b.hasBackrest && (
                <rect
                  x={bx}
                  y={topY - slatThicknessPx - b.backrestHeight * yScale}
                  width={Math.min(bw, 30)}
                  height={b.backrestHeight * yScale}
                  fill={fillColour}
                  opacity={0.6}
                  rx={2}
                />
              )}
              {/* Top-of-bench dimension callout */}
              <line
                x1={PAD_X - 4}
                y1={topY}
                x2={bx}
                y2={topY}
                stroke="var(--purple-4)"
                strokeWidth={0.5}
                strokeDasharray="2 2"
              />
              <text
                x={PAD_X - 8}
                y={topY + 3}
                textAnchor="end"
                className="fill-fg-3"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {b.topHeight}
              </text>

              {/* Tier label */}
              <text
                x={bx + bw / 2}
                y={topY - slatThicknessPx - 4}
                textAnchor="middle"
                className="fill-fg-4"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {b.tier}
              </text>
            </g>
          );
        })}

        {/* Wall length tick at bottom */}
        <line
          x1={PAD_X}
          y1={floorY + 22}
          x2={PAD_X + innerW}
          y2={floorY + 22}
          stroke="var(--gray-4)"
          strokeWidth={0.6}
        />
        <line x1={PAD_X} y1={floorY + 18} x2={PAD_X} y2={floorY + 26} stroke="var(--gray-4)" strokeWidth={0.6} />
        <line
          x1={PAD_X + innerW}
          y1={floorY + 18}
          x2={PAD_X + innerW}
          y2={floorY + 26}
          stroke="var(--gray-4)"
          strokeWidth={0.6}
        />
        <text
          x={PAD_X + innerW / 2}
          y={floorY + 35}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 10 }}
        >
          Wall length · {wallLength}mm
        </text>
      </svg>
    </div>
  );
}

export function BenchConstructionDiagram() {
  const { project } = useSaunaMaterials();

  const wallsWithBenches = useMemo(() => {
    const set = new Set<WallId>();
    for (const b of project.benches) set.add(b.wall);
    return [...set] as WallId[];
  }, [project.benches]);

  if (project.benches.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bench construction — side elevation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Side view of each wall, showing tier heights, fronts, end caps, and backrests. Use this to confirm bench geometry before pricing.
        </p>
        {wallsWithBenches.map(wall => {
          const benches = project.benches.filter(b => b.wall === wall);
          const wallLen = wall === 'north' || wall === 'south' ? project.room.length : project.room.width;
          return (
            <WallElevation
              key={wall}
              wall={wall}
              benches={benches}
              ceilingHeight={project.room.ceilingHeight}
              wallLength={wallLen}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
