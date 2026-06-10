'use client';

import { useMemo } from 'react';
import type { DeckGeometry, Fitting, TileCell, TilePlanConfig } from '@/types/tiles';

interface PlanViewProps {
  config: TilePlanConfig;
  geometry: DeckGeometry;
  cells: TileCell[];
  showGrid: boolean;
  showCuts: boolean;
  showDimensions: boolean;
  showFittings: boolean;
}

const COLORS = {
  deck: '#f5f5f5',
  deckBorder: '#181925',
  poolHot: '#ffe5d6',
  poolCold: '#dff1ff',
  poolBorderHot: '#ff7a3a',
  poolBorderCold: '#2c78fc',
  skimmer: '#fff8eb',
  skimmerBorder: '#ffa600',
  tileFull: 'rgba(145, 141, 246, 0.18)',
  tileFullStroke: 'rgba(145, 141, 246, 0.6)',
  tileCut: 'rgba(255, 47, 0, 0.18)',
  tileCutStroke: 'rgba(255, 47, 0, 0.7)',
  fitting: '#33c758',
  fittingStroke: '#1f8a3f',
  centreLine: 'rgba(0,0,0,0.18)',
  dim: '#666',
};

export function PlanView({
  config,
  geometry,
  cells,
  showGrid,
  showCuts,
  showDimensions,
  showFittings,
}: PlanViewProps) {
  const pad = 220;
  const vbW = geometry.bounds.width + pad * 2;
  const vbH = geometry.bounds.height + pad * 2;

  const fittingsOnDeck = useMemo(
    () => config.fittings.filter(f => f.surface === 'deck'),
    [config.fittings],
  );

  const fittingsAroundPool = useMemo(
    () => config.fittings.filter(f => f.surface !== 'deck' && f.surface !== 'floor'),
    [config.fittings],
  );

  return (
    <div className="bg-card rounded-2xl border border-gray-2 shadow-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-2">
        <div>
          <p className="text-sm font-semibold">Plan view</p>
          <p className="text-xs text-muted-foreground">
            Top-down, {geometry.bounds.width} × {geometry.bounds.height} mm overall
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Legend swatch={COLORS.tileFullStroke} fill={COLORS.tileFull}>Full</Legend>
          <Legend swatch={COLORS.tileCutStroke} fill={COLORS.tileCut}>Cut</Legend>
          <Legend swatch={COLORS.skimmerBorder} fill={COLORS.skimmer}>Skimmer</Legend>
        </div>
      </div>

      <div className="w-full overflow-auto bg-gray-1">
        <svg
          viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`}
          className="w-full h-auto block"
          style={{ aspectRatio: `${vbW} / ${vbH}`, minHeight: 380 }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <clipPath id="deck-clip">
              <rect
                x={0}
                y={0}
                width={geometry.bounds.width}
                height={geometry.bounds.height}
              />
            </clipPath>
          </defs>

          <rect
            x={0}
            y={0}
            width={geometry.bounds.width}
            height={geometry.bounds.height}
            fill={COLORS.deck}
            stroke={COLORS.deckBorder}
            strokeWidth={4}
          />

          <rect
            x={geometry.centre.x}
            y={geometry.centre.y}
            width={geometry.centre.width}
            height={geometry.centre.height}
            fill="rgba(0,0,0,0.025)"
            stroke="none"
          />
          <line
            x1={geometry.centre.x}
            y1={geometry.centre.y}
            x2={geometry.centre.x}
            y2={geometry.centre.y + geometry.centre.height}
            stroke={COLORS.centreLine}
            strokeDasharray="14 10"
            strokeWidth={2}
          />
          <line
            x1={geometry.centre.x + geometry.centre.width}
            y1={geometry.centre.y}
            x2={geometry.centre.x + geometry.centre.width}
            y2={geometry.centre.y + geometry.centre.height}
            stroke={COLORS.centreLine}
            strokeDasharray="14 10"
            strokeWidth={2}
          />

          {showGrid && (
            <g clipPath="url(#deck-clip)">
              {cells.map(t => {
                if (t.status === 'cut' && !showCuts) return null;
                return (
                  <rect
                    key={`${t.col}:${t.row}`}
                    x={t.x}
                    y={t.y}
                    width={t.width}
                    height={t.height}
                    fill={t.status === 'cut' ? COLORS.tileCut : COLORS.tileFull}
                    stroke={t.status === 'cut' ? COLORS.tileCutStroke : COLORS.tileFullStroke}
                    strokeWidth={1.5}
                  />
                );
              })}
            </g>
          )}

          <PoolRect rect={geometry.coldPool} fill={COLORS.poolCold} stroke={COLORS.poolBorderCold} label="COLD" />
          <PoolRect rect={geometry.hotPool} fill={COLORS.poolHot} stroke={COLORS.poolBorderHot} label="HOT" />

          <SkimmerBox
            rect={geometry.coldSkimmer}
            body={geometry.coldSkimmerBody}
            facing={config.coldSkimmer.facing}
            lidType={config.coldSkimmer.lidType}
            label={`Cold ${config.coldSkimmer.lidType === 'hide' ? 'HIDE' : 'lid'} ${config.coldSkimmer.width}×${config.coldSkimmer.depth}`}
          />
          <SkimmerBox
            rect={geometry.hotSkimmer}
            body={geometry.hotSkimmerBody}
            facing={config.hotSkimmer.facing}
            lidType={config.hotSkimmer.lidType}
            label={`Hot ${config.hotSkimmer.lidType === 'hide' ? 'HIDE' : 'lid'} ${config.hotSkimmer.width}×${config.hotSkimmer.depth}`}
          />

          {showFittings && (
            <g>
              {fittingsOnDeck.map(f => (
                <FittingMark key={f.id} fitting={f} />
              ))}
              {fittingsAroundPool.map(f => (
                <PoolWallFittingMark key={f.id} fitting={f} geometry={geometry} />
              ))}
            </g>
          )}

          {showDimensions && (
            <Dimensions config={config} geometry={geometry} />
          )}
        </svg>
      </div>
    </div>
  );
}

function Legend({
  children,
  swatch,
  fill,
}: {
  children: React.ReactNode;
  swatch: string;
  fill: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span
        className="inline-block w-3 h-3 rounded-[3px] border"
        style={{ background: fill, borderColor: swatch }}
      />
      {children}
    </span>
  );
}

function PoolRect({
  rect,
  fill,
  stroke,
  label,
}: {
  rect: { x: number; y: number; width: number; height: number };
  fill: string;
  stroke: string;
  label: string;
}) {
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={fill}
        stroke={stroke}
        strokeWidth={5}
      />
      <text
        x={rect.x + rect.width / 2}
        y={rect.y + rect.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={130}
        fontWeight={700}
        fill={stroke}
        opacity={0.45}
      >
        {label}
      </text>
    </g>
  );
}

function SkimmerBox({
  rect,
  body,
  facing,
  lidType,
  label,
}: {
  rect: { x: number; y: number; width: number; height: number };
  body: { x: number; y: number; width: number; height: number };
  facing: 'left' | 'right';
  lidType: 'standard' | 'hide';
  label: string;
}) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const tipX = facing === 'left' ? body.x - 30 : body.x + body.width + 30;
  const isHide = lidType === 'hide';

  return (
    <g>
      <defs>
        <marker id="arrowLeft" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 10 0 L 0 5 L 10 10 z" fill={COLORS.skimmerBorder} />
        </marker>
        <marker id="arrowRight" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.skimmerBorder} />
        </marker>
      </defs>

      {/* Megaskim body footprint */}
      <rect
        x={body.x}
        y={body.y}
        width={body.width}
        height={body.height}
        fill="none"
        stroke={COLORS.skimmerBorder}
        strokeOpacity={0.45}
        strokeWidth={2.5}
        strokeDasharray="10 8"
        rx={8}
      />

      {/* Deck-level lid: HIDE = recessed frame only (tiles flow over), Standard = solid fill */}
      {isHide ? (
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="none"
          stroke={COLORS.skimmerBorder}
          strokeWidth={3}
          strokeDasharray="6 4"
          rx={4}
        />
      ) : (
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={COLORS.skimmer}
          stroke={COLORS.skimmerBorder}
          strokeWidth={4}
          rx={4}
        />
      )}

      <line
        x1={cx}
        y1={cy}
        x2={tipX}
        y2={cy}
        stroke={COLORS.skimmerBorder}
        strokeWidth={4}
        markerEnd={facing === 'left' ? 'url(#arrowLeft)' : 'url(#arrowRight)'}
      />

      <text
        x={cx}
        y={rect.y - 18}
        textAnchor="middle"
        fontSize={42}
        fill={COLORS.skimmerBorder}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

function FittingMark({ fitting }: { fitting: Fitting }) {
  return (
    <g>
      <rect
        x={fitting.x}
        y={fitting.y}
        width={fitting.width}
        height={fitting.height}
        fill={COLORS.fitting}
        fillOpacity={0.4}
        stroke={COLORS.fittingStroke}
        strokeWidth={3}
        rx={6}
      />
      {fitting.label && (
        <text
          x={fitting.x + fitting.width / 2}
          y={fitting.y + fitting.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={28}
          fill={COLORS.fittingStroke}
          fontWeight={600}
        >
          {fitting.label}
        </text>
      )}
    </g>
  );
}

function PoolWallFittingMark({
  fitting,
  geometry,
}: {
  fitting: Fitting;
  geometry: DeckGeometry;
}) {
  const pool = fitting.pool === 'hot' ? geometry.hotPool : geometry.coldPool;
  let x = pool.x + fitting.x;
  let y = pool.y + fitting.y;
  let w = fitting.width;
  let h = fitting.height;

  if (fitting.surface === 'wallNorth') {
    y = pool.y - h / 2;
  } else if (fitting.surface === 'wallSouth') {
    y = pool.y + pool.height - h / 2;
  } else if (fitting.surface === 'wallWest') {
    x = pool.x - w / 2;
  } else if (fitting.surface === 'wallEast') {
    x = pool.x + pool.width - w / 2;
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={COLORS.fitting}
        fillOpacity={0.45}
        stroke={COLORS.fittingStroke}
        strokeWidth={3}
        rx={4}
      />
      {fitting.label && (
        <text
          x={x + w / 2}
          y={y - 18}
          textAnchor="middle"
          fontSize={32}
          fill={COLORS.fittingStroke}
          fontWeight={600}
        >
          {fitting.label}
        </text>
      )}
    </g>
  );
}

function Dimensions({
  config,
  geometry,
}: {
  config: TilePlanConfig;
  geometry: DeckGeometry;
}) {
  const dimOffset = 120;
  const dimSize = 36;
  return (
    <g stroke={COLORS.dim} fill={COLORS.dim} fontSize={dimSize}>
      <DimLine
        x1={geometry.coldPool.x}
        x2={geometry.coldPool.x + geometry.coldPool.width}
        y={geometry.bounds.height + dimOffset}
        label={`${config.coldPool.length} mm`}
      />
      <DimLine
        x1={geometry.centre.x}
        x2={geometry.centre.x + geometry.centre.width}
        y={geometry.bounds.height + dimOffset}
        label={`${config.centreWidth} mm`}
      />
      <DimLine
        x1={geometry.hotPool.x}
        x2={geometry.hotPool.x + geometry.hotPool.width}
        y={geometry.bounds.height + dimOffset}
        label={`${config.hotPool.length} mm`}
      />
      <DimLine
        x1={0}
        x2={geometry.bounds.width}
        y={geometry.bounds.height + dimOffset + 110}
        label={`Overall ${geometry.bounds.width} mm`}
        strong
      />
      <VertDimLine
        y1={geometry.coldPool.y}
        y2={geometry.coldPool.y + geometry.coldPool.height}
        x={-dimOffset}
        label={`${config.coldPool.width} mm`}
      />
      <VertDimLine
        y1={0}
        y2={geometry.bounds.height}
        x={-dimOffset - 110}
        label={`${geometry.bounds.height} mm`}
        strong
      />
    </g>
  );
}

function DimLine({ x1, x2, y, label, strong }: { x1: number; x2: number; y: number; label: string; strong?: boolean }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} strokeWidth={strong ? 2.5 : 1.5} />
      <line x1={x1} y1={y - 14} x2={x1} y2={y + 14} strokeWidth={1.5} />
      <line x1={x2} y1={y - 14} x2={x2} y2={y + 14} strokeWidth={1.5} />
      <text
        x={(x1 + x2) / 2}
        y={y - 18}
        textAnchor="middle"
        stroke="none"
        fontWeight={strong ? 700 : 500}
      >
        {label}
      </text>
    </g>
  );
}

function VertDimLine({ y1, y2, x, label, strong }: { y1: number; y2: number; x: number; label: string; strong?: boolean }) {
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} strokeWidth={strong ? 2.5 : 1.5} />
      <line x1={x - 14} y1={y1} x2={x + 14} y2={y1} strokeWidth={1.5} />
      <line x1={x - 14} y1={y2} x2={x + 14} y2={y2} strokeWidth={1.5} />
      <text
        x={x - 18}
        y={(y1 + y2) / 2}
        textAnchor="end"
        dominantBaseline="middle"
        stroke="none"
        fontWeight={strong ? 700 : 500}
      >
        {label}
      </text>
    </g>
  );
}
