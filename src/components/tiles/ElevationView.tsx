'use client';

import { useMemo, useState } from 'react';
import type { TilePlanConfig } from '@/types/tiles';
import { fitTilesAcross } from '@/lib/tilePlanner';

interface ElevationViewProps {
  config: TilePlanConfig;
}

type LayDirection = 'bottomUp' | 'topDown';

export function ElevationView({ config }: ElevationViewProps) {
  const [layDir, setLayDir] = useState<LayDirection>('bottomUp');

  return (
    <div className="bg-card rounded-2xl border border-gray-2 shadow-1">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-2">
        <div>
          <p className="text-sm font-semibold">Wall elevations</p>
          <p className="text-xs text-muted-foreground">
            Vertical tile courses + waterline alignment
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs bg-muted rounded-full p-0.5">
          <button
            onClick={() => setLayDir('bottomUp')}
            className={`px-3 py-1 rounded-full transition-colors ${
              layDir === 'bottomUp' ? 'bg-card text-primary font-semibold' : 'text-muted-foreground'
            }`}
          >
            Bottom-up
          </button>
          <button
            onClick={() => setLayDir('topDown')}
            className={`px-3 py-1 rounded-full transition-colors ${
              layDir === 'topDown' ? 'bg-card text-primary font-semibold' : 'text-muted-foreground'
            }`}
          >
            Top-down
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-2">
        <PoolElevation
          title="Hot pool — long wall"
          config={config}
          poolKey="hot"
          axis="long"
          layDir={layDir}
        />
        <PoolElevation
          title="Cold pool — long wall"
          config={config}
          poolKey="cold"
          axis="long"
          layDir={layDir}
        />
        <PoolElevation
          title="Hot pool — end wall"
          config={config}
          poolKey="hot"
          axis="short"
          layDir={layDir}
        />
        <PoolElevation
          title="Cold pool — end wall"
          config={config}
          poolKey="cold"
          axis="short"
          layDir={layDir}
        />
      </div>
    </div>
  );
}

function PoolElevation({
  title,
  config,
  poolKey,
  axis,
  layDir,
}: {
  title: string;
  config: TilePlanConfig;
  poolKey: 'hot' | 'cold';
  axis: 'long' | 'short';
  layDir: LayDirection;
}) {
  const pool = poolKey === 'hot' ? config.hotPool : config.coldPool;
  const tileSize = config.tileSize;
  const grout = config.groutWidth;
  const length = axis === 'long' ? pool.length : pool.width;

  const horizontalFit = useMemo(
    () => fitTilesAcross(length, tileSize, grout),
    [length, tileSize, grout],
  );

  const vertical = useMemo(() => {
    const courses: { yBottom: number; height: number; isCut: boolean }[] = [];
    const fit = fitTilesAcross(pool.shellHeight, tileSize, grout);

    if (layDir === 'bottomUp') {
      let y = 0;
      for (let i = 0; i < fit.full; i++) {
        courses.push({ yBottom: y, height: tileSize, isCut: false });
        y += tileSize;
        if (i < fit.full - 1) y += grout;
      }
      if (fit.hasCut) {
        y += grout;
        courses.push({ yBottom: y, height: fit.cutSize, isCut: true });
      }
    } else {
      let yTop = pool.shellHeight;
      for (let i = 0; i < fit.full; i++) {
        yTop -= tileSize;
        courses.push({ yBottom: yTop, height: tileSize, isCut: false });
        if (i < fit.full - 1) yTop -= grout;
      }
      if (fit.hasCut) {
        yTop -= grout;
        yTop -= fit.cutSize;
        courses.push({ yBottom: yTop, height: fit.cutSize, isCut: true });
      }
    }
    return { courses, fit };
  }, [pool.shellHeight, tileSize, grout, layDir]);

  const waterlineCourse = vertical.courses.find(
    c => pool.waterDepth >= c.yBottom - 0.001 && pool.waterDepth <= c.yBottom + c.height + grout + 0.001,
  );
  const waterlineOffset = waterlineCourse
    ? pool.waterDepth - waterlineCourse.yBottom
    : pool.waterDepth;
  const onGroutLine = waterlineCourse
    ? Math.abs(waterlineOffset - waterlineCourse.height) < 1 || Math.abs(waterlineOffset) < 1
    : false;

  const pad = 80;
  const vbW = length + pad * 2;
  const vbH = pool.shellHeight + pad * 2;

  const tileFill = poolKey === 'hot' ? 'rgba(255, 122, 58, 0.18)' : 'rgba(44, 120, 252, 0.18)';
  const tileStroke = poolKey === 'hot' ? 'rgba(255, 122, 58, 0.7)' : 'rgba(44, 120, 252, 0.75)';
  const cutFill = 'rgba(255, 47, 0, 0.22)';
  const cutStroke = 'rgba(255, 47, 0, 0.85)';

  const yScreen = (y: number) => pool.shellHeight - y;

  return (
    <div className="bg-card p-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {length} × {pool.shellHeight} mm
        </p>
      </div>

      <div className="w-full overflow-auto">
        <svg
          viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`}
          className="w-full h-auto block"
          style={{ minHeight: 240, aspectRatio: `${vbW} / ${vbH}` }}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            x={0}
            y={0}
            width={length}
            height={pool.shellHeight}
            fill="#fafafa"
            stroke="#181925"
            strokeWidth={3}
          />

          {vertical.courses.map((course, ci) => (
            <g key={ci}>
              {horizontalFit.full > 0 &&
                Array.from({ length: horizontalFit.full }, (_, hi) => {
                  const x = hi * (tileSize + grout);
                  return (
                    <rect
                      key={hi}
                      x={x}
                      y={yScreen(course.yBottom + course.height)}
                      width={tileSize}
                      height={course.height}
                      fill={course.isCut ? cutFill : tileFill}
                      stroke={course.isCut ? cutStroke : tileStroke}
                      strokeWidth={1.5}
                    />
                  );
                })}
              {horizontalFit.hasCut && (
                <rect
                  x={horizontalFit.full * (tileSize + grout)}
                  y={yScreen(course.yBottom + course.height)}
                  width={horizontalFit.cutSize}
                  height={course.height}
                  fill={cutFill}
                  stroke={cutStroke}
                  strokeWidth={1.5}
                />
              )}
            </g>
          ))}

          <line
            x1={-pad / 2}
            y1={yScreen(pool.waterDepth)}
            x2={length + pad / 2}
            y2={yScreen(pool.waterDepth)}
            stroke="#0ea5e9"
            strokeWidth={3}
            strokeDasharray="14 8"
          />
          <text
            x={length + pad / 2}
            y={yScreen(pool.waterDepth) - 8}
            textAnchor="end"
            fontSize={36}
            fill="#0284c7"
            fontWeight={600}
          >
            Waterline {pool.waterDepth} mm
          </text>
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat
          label="Courses"
          value={`${vertical.fit.full}${vertical.fit.hasCut ? ' + cut' : ''}`}
          hint={vertical.fit.hasCut ? `${Math.round(vertical.fit.cutSize)} mm cut at ${layDir === 'bottomUp' ? 'top' : 'bottom'}` : 'whole tiles'}
        />
        <Stat
          label="Across"
          value={`${horizontalFit.full}${horizontalFit.hasCut ? ' + cut' : ''}`}
          hint={horizontalFit.hasCut ? `${Math.round(horizontalFit.cutSize)} mm cut at end` : 'whole tiles'}
        />
        <Stat
          label="Waterline lands"
          value={onGroutLine ? 'On grout line' : 'Mid-tile'}
          tone={onGroutLine ? 'good' : 'warn'}
          hint={waterlineCourse
            ? `${Math.round(waterlineOffset)} mm into course ${vertical.courses.indexOf(waterlineCourse) + 1}`
            : ''}
        />
        <Stat
          label="Lay direction"
          value={layDir === 'bottomUp' ? 'Bottom up' : 'Top down'}
          hint="Toggle above to see other option"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'good' | 'warn';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-green-4'
      : tone === 'warn'
        ? 'text-amber-4'
        : 'text-fg-4';
  return (
    <div className="bg-gray-1 rounded-lg px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${toneClass} tabular-nums`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
