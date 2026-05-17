'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type { Bench, WallId } from '@/types/saunaMaterials';

// ─── Constants ───────────────────────────────────────────────────────────────

const WALL_LABEL: Record<WallId, string> = {
  north: 'NORTH', south: 'SOUTH', east: 'EAST', west: 'WEST',
};

const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// SVG viewport
const VW = 820;
const VH = 420;

// Drawing area padding (px)
const PAD_L = 82;   // left  – height dimension chain
const PAD_R = 52;   // right – AFF labels
const PAD_T = 44;   // top   – tier callouts
const PAD_B = 78;   // bottom – length dim chain + title block

const DX = PAD_L;
const DY = PAD_T;
const DW = VW - PAD_L - PAD_R;
const DH = VH - PAD_T - PAD_B;

// Technical ink palette
const INK    = '#111111';  // main structural outlines
const INK_D  = '#3a3a3a';  // dimension lines & text
const INK_H  = '#5c5c5c';  // hatch lines
const INK_SB = '#6e6e6e';  // secondary (title block)

// Line weights
const LW_CUT    = 2.4;   // cut/section boundary
const LW_VIS    = 1.4;   // visible edges
const LW_DIM    = 0.55;  // dimension lines
const LW_DETAIL = 0.4;   // internal detail / hatch

// Structural thicknesses (px – fixed visual representations, not to scale)
const WALL_THK  = 20;   // wall section
const SLAB_THK  = 14;   // ceiling / floor slab
const SLAT_THK  = 9;    // top slat (NTS – exaggerated for visibility)

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Slash-style tick mark for dimension chain endpoints */
function DimTick({ x, y, vertical = false }: { x: number; y: number; vertical?: boolean }) {
  const size = 4.5;
  return vertical
    ? <line x1={x - size} y1={y + size} x2={x + size} y2={y - size} stroke={INK_D} strokeWidth={0.9} />
    : <line x1={x - size} y1={y + size} x2={x + size} y2={y - size} stroke={INK_D} strokeWidth={0.9} />;
}

/** Circle with letter — section / tier marker */
function Bubble({ cx, cy, label, r = 9 }: { cx: number; cy: number; label: string; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="white" stroke={INK} strokeWidth={1.0} />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fill={INK} fontSize={8.5} fontWeight="700"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {label}
      </text>
    </g>
  );
}

// ─── Single wall elevation ────────────────────────────────────────────────────

interface WallElevationProps {
  wall: WallId;
  benches: Bench[];
  ceilingHeight: number;
  wallLength: number;
  sectionLetter: string;
  projectName: string;
}

function WallElevation({ wall, benches, ceilingHeight, wallLength, sectionLetter, projectName }: WallElevationProps) {
  const xS = DW / wallLength;
  const yS = DH / ceilingHeight;

  const floorY = DY + DH;
  const ceilY  = DY;
  const wallL  = DX;
  const wallR  = DX + DW;

  // Front height per tier (same logic as benches.ts frontHeightMm)
  const frontHeight = (b: Bench) => {
    const lowers = benches.filter(x => x.topHeight < b.topHeight).map(x => x.topHeight);
    return lowers.length === 0 ? b.topHeight : b.topHeight - Math.max(...lowers);
  };

  const sorted = [...benches].sort((a, b) => a.topHeight - b.topHeight);
  const benchHeights = sorted.map(b => b.topHeight);

  const uid = wall;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #c8c8c8' }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-auto select-none"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', display: 'block' }}
      >
        {/* ── Pattern library ─────────────────────────────────────────── */}
        <defs>
          {/* Masonry: 45° diagonal – walls, floor, ceiling slab */}
          <pattern id={`mas-${uid}`} x="0" y="0" width="5.5" height="5.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5.5" stroke={INK_H} strokeWidth="0.45" />
          </pattern>
          {/* Timber face grain: near-vertical fine lines (long-grain face) */}
          <pattern id={`grn-${uid}`} x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={INK_H} strokeWidth="0.3" />
          </pattern>
          {/* Timber end grain: cross-hatch (cut end of slat) */}
          <pattern id={`end-${uid}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke={INK_H} strokeWidth="0.35" />
            <line x1="0" y1="2" x2="4" y2="2" stroke={INK_H} strokeWidth="0.2" opacity="0.55" />
          </pattern>
          {/* Insulation: sine-wave batting */}
          <pattern id={`ins-${uid}`} x="0" y="0" width="12" height="7" patternUnits="userSpaceOnUse">
            <polyline points="0,7 3,0 6,7 9,0 12,7" fill="none" stroke={INK_H} strokeWidth="0.45" />
          </pattern>
          {/* Clip path for each bench to contain hatching */}
          {sorted.map((b) => {
            const startMm = b.startOffset ?? Math.max(0, (wallLength - b.length) / 2);
            const bx = DX + startMm * xS;
            const bw = b.length * xS;
            const fh = frontHeight(b);
            const fhPx = fh * yS;
            const topY = floorY - b.topHeight * yS;
            return (
              <clipPath key={`clip-${uid}-${b.id}`} id={`clip-${uid}-${b.id}`}>
                <rect x={bx} y={topY} width={bw} height={fhPx} />
              </clipPath>
            );
          })}
        </defs>

        {/* ── White background ─────────────────────────────────────────── */}
        <rect x={0} y={0} width={VW} height={VH} fill="white" />

        {/* ── Ceiling slab (cut section — heavy) ──────────────────────── */}
        <rect x={wallL} y={ceilY - SLAB_THK} width={DW} height={SLAB_THK}
          fill={`url(#mas-${uid})`} opacity={0.65} />
        <rect x={wallL} y={ceilY - SLAB_THK} width={DW} height={SLAB_THK}
          fill="none" stroke={INK} strokeWidth={LW_CUT} />

        {/* ── Floor slab (cut section — heavy) ────────────────────────── */}
        <rect x={wallL} y={floorY} width={DW} height={SLAB_THK}
          fill={`url(#mas-${uid})`} opacity={0.65} />
        <rect x={wallL} y={floorY} width={DW} height={SLAB_THK}
          fill="none" stroke={INK} strokeWidth={LW_CUT} />

        {/* ── Left wall section ────────────────────────────────────────── */}
        <rect x={wallL - WALL_THK} y={ceilY} width={WALL_THK} height={DH}
          fill={`url(#mas-${uid})`} opacity={0.65} />
        <rect x={wallL - WALL_THK} y={ceilY} width={WALL_THK} height={DH}
          fill="none" stroke={INK} strokeWidth={LW_CUT} />

        {/* ── Right wall section ───────────────────────────────────────── */}
        <rect x={wallR} y={ceilY} width={WALL_THK} height={DH}
          fill={`url(#mas-${uid})`} opacity={0.65} />
        <rect x={wallR} y={ceilY} width={WALL_THK} height={DH}
          fill="none" stroke={INK} strokeWidth={LW_CUT} />

        {/* ── Ceiling / floor face lines (inner surface) ──────────────── */}
        <line x1={wallL} y1={ceilY}  x2={wallR} y2={ceilY}  stroke={INK} strokeWidth={LW_CUT} />
        <line x1={wallL} y1={floorY} x2={wallR} y2={floorY} stroke={INK} strokeWidth={LW_CUT} />

        {/* ── Benches ──────────────────────────────────────────────────── */}
        {sorted.map((b, i) => {
          const startMm  = b.startOffset ?? Math.max(0, (wallLength - b.length) / 2);
          const bx       = DX + startMm * xS;
          const bw       = b.length * xS;
          const topY     = floorY - b.topHeight * yS;
          const fh       = frontHeight(b);
          const fhPx     = fh * yS;
          const slatRows = Math.max(2, Math.round(fh / 90));
          const backH    = b.hasBackrest ? b.backrestHeight * yS : 0;

          return (
            <g key={b.id}>
              {/* Front face — grain hatch fill */}
              <rect x={bx} y={topY} width={bw} height={fhPx}
                fill={`url(#grn-${uid})`} opacity={0.4} />
              {/* Slat division lines */}
              {Array.from({ length: slatRows - 1 }).map((_, k) => (
                <line key={k}
                  x1={bx} y1={topY + (fhPx / slatRows) * (k + 1)}
                  x2={bx + bw} y2={topY + (fhPx / slatRows) * (k + 1)}
                  stroke={INK} strokeWidth={LW_DETAIL} />
              ))}
              {/* Front outline (visible edge) */}
              <rect x={bx} y={topY} width={bw} height={fhPx}
                fill="none" stroke={INK} strokeWidth={LW_VIS} />

              {/* Top slat — end grain (cut in section) */}
              <rect x={bx} y={topY - SLAT_THK} width={bw} height={SLAT_THK}
                fill={`url(#end-${uid})`} opacity={0.65} />
              <rect x={bx} y={topY - SLAT_THK} width={bw} height={SLAT_THK}
                fill="none" stroke={INK} strokeWidth={LW_VIS} />

              {/* End caps (bold visible edge) */}
              {(b.hasEndCap === 'left' || b.hasEndCap === 'both') && (
                <line x1={bx} y1={topY - SLAT_THK} x2={bx} y2={topY + fhPx}
                  stroke={INK} strokeWidth={LW_CUT} />
              )}
              {(b.hasEndCap === 'right' || b.hasEndCap === 'both') && (
                <line x1={bx + bw} y1={topY - SLAT_THK} x2={bx + bw} y2={topY + fhPx}
                  stroke={INK} strokeWidth={LW_CUT} />
              )}

              {/* Leg lines (hidden / beyond) */}
              {bw > 50 && [0.12, 0.5, 0.88].map((frac, k) => (
                <line key={k}
                  x1={bx + bw * frac} y1={topY + fhPx * 0.05}
                  x2={bx + bw * frac} y2={topY + fhPx}
                  stroke={INK} strokeWidth={LW_DETAIL} strokeDasharray="2.5 2"
                  opacity={0.35} />
              ))}

              {/* Backrest */}
              {b.hasBackrest && (
                <>
                  <rect
                    x={bx} y={topY - SLAT_THK - backH}
                    width={Math.min(bw, 22)} height={backH}
                    fill={`url(#grn-${uid})`} opacity={0.5} />
                  <rect
                    x={bx} y={topY - SLAT_THK - backH}
                    width={Math.min(bw, 22)} height={backH}
                    fill="none" stroke={INK} strokeWidth={LW_VIS} />
                </>
              )}

              {/* ── Tier callout bubble above bench ──────────────── */}
              {(() => {
                const cx = bx + bw / 2;
                const topmost = topY - SLAT_THK - backH;
                const leaderBot = topmost - 6;
                const bubbleCy = leaderBot - 10;
                return (
                  <g>
                    <line x1={cx} y1={leaderBot} x2={cx} y2={bubbleCy + 10}
                      stroke={INK} strokeWidth={LW_DIM} />
                    <Bubble cx={cx} cy={bubbleCy} label={String(i + 1)} r={9} />
                    <text x={cx} y={bubbleCy - 12} textAnchor="middle"
                      fill={INK} fontSize={7.5} fontWeight="600" letterSpacing="0.4">
                      {b.tier.toUpperCase()}
                    </text>
                    <text x={cx} y={bubbleCy - 22} textAnchor="middle"
                      fill={INK_D} fontSize={6.5}>
                      L={b.length}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* ── Section marker (left) ────────────────────────────────────── */}
        <Bubble cx={wallL - WALL_THK - 20} cy={ceilY + DH / 2} label={sectionLetter} r={11} />
        <line
          x1={wallL - WALL_THK - 9}
          y1={ceilY + DH / 2}
          x2={wallL - WALL_THK}
          y2={ceilY + DH / 2}
          stroke={INK} strokeWidth={LW_DIM} />

        {/* ── Left dimension chain — heights ───────────────────────────── */}
        {/* Vertical chain spine */}
        <line x1={wallL - 46} y1={ceilY} x2={wallL - 46} y2={floorY}
          stroke={INK_D} strokeWidth={LW_DIM} />

        {/* FCL (ceiling) */}
        <line x1={wallL - 3} y1={ceilY} x2={wallL - 50} y2={ceilY}
          stroke={INK_D} strokeWidth={LW_DIM} />
        <DimTick x={wallL - 46} y={ceilY} />
        <text x={wallL - 53} y={ceilY + 4} textAnchor="end" fill={INK} fontSize={8} fontWeight="700">FCL</text>
        <text x={wallL - 53} y={ceilY + 13} textAnchor="end" fill={INK_D} fontSize={7}>
          {ceilingHeight}mm
        </text>

        {/* AFF 0 (floor) */}
        <line x1={wallL - 3} y1={floorY} x2={wallL - 50} y2={floorY}
          stroke={INK_D} strokeWidth={LW_DIM} />
        <DimTick x={wallL - 46} y={floorY} />
        <text x={wallL - 53} y={floorY + 4} textAnchor="end" fill={INK} fontSize={8} fontWeight="700">AFF 0</text>

        {/* Per-bench heights */}
        {benchHeights.map((h) => {
          const yPos = floorY - h * yS;
          return (
            <g key={h}>
              <line x1={wallL - 3} y1={yPos} x2={wallL - 50} y2={yPos}
                stroke={INK_D} strokeWidth={LW_DIM} strokeDasharray="3 2" />
              <DimTick x={wallL - 46} y={yPos} />
              <text x={wallL - 53} y={yPos + 3.5} textAnchor="end" fill={INK} fontSize={7.5}>
                {h}
              </text>
            </g>
          );
        })}

        {/* ── Bottom dimension chain — wall length ─────────────────────── */}
        <line x1={wallL} y1={floorY + 33} x2={wallR} y2={floorY + 33}
          stroke={INK_D} strokeWidth={LW_DIM} />
        {/* Extension lines */}
        <line x1={wallL} y1={floorY + 14} x2={wallL} y2={floorY + 37}
          stroke={INK_D} strokeWidth={LW_DIM} />
        <line x1={wallR} y1={floorY + 14} x2={wallR} y2={floorY + 37}
          stroke={INK_D} strokeWidth={LW_DIM} />
        {/* Ticks */}
        <DimTick x={wallL} y={floorY + 33} />
        <DimTick x={wallR} y={floorY + 33} />
        {/* Measurement label */}
        <rect x={(wallL + wallR) / 2 - 22} y={floorY + 24} width={44} height={12}
          fill="white" />
        <text x={(wallL + wallR) / 2} y={floorY + 34} textAnchor="middle"
          fill={INK} fontSize={8.5} fontWeight="700">
          {wallLength}mm
        </text>

        {/* ── Title block ──────────────────────────────────────────────── */}
        <line x1={DX} y1={VH - 20} x2={VW - 8} y2={VH - 20}
          stroke={INK_SB} strokeWidth={0.5} />
        <text x={DX} y={VH - 7} fill={INK_SB} fontSize={7.5} letterSpacing="0.3">
          SECTION {sectionLetter}–{sectionLetter} · {WALL_LABEL[wall]} WALL ELEVATION · 1:50
        </text>
        <text x={VW - 8} y={VH - 7} textAnchor="end" fill={INK_SB} fontSize={7.5} letterSpacing="0.3">
          {projectName.toUpperCase()}
        </text>

        {/* ── "NTS" note on top slat ───────────────────────────────────── */}
        <text x={wallR + 4} y={DY + DH * 0.08} fill={INK_SB} fontSize={6.5}>
          ↑ slat
        </text>
        <text x={wallR + 4} y={DY + DH * 0.08 + 8} fill={INK_SB} fontSize={6}>
          NTS
        </text>
      </svg>

      {/* Legend strip below SVG */}
      <div style={{
        borderTop: '1px solid #ddd',
        padding: '6px 12px',
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        fontSize: 10,
        color: '#555',
        background: '#fafafa',
      }}>
        <LegendItem pattern="diagonal" label="Wall / slab section" />
        <LegendItem pattern="grain" label="Timber face" />
        <LegendItem pattern="endgrain" label="Timber end grain" />
        {sorted.map((b, i) => (
          <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 14, height: 14, borderRadius: '50%', border: '1px solid #111',
              fontSize: 8, fontWeight: 700, color: '#111',
            }}>{i + 1}</span>
            {b.tier}
          </span>
        ))}
      </div>
    </div>
  );
}

function LegendItem({ pattern, label }: { pattern: string; label: string }) {
  const size = 14;
  const swatchId = `legend-${pattern}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <svg width={size} height={size}>
        <defs>
          {pattern === 'diagonal' && (
            <pattern id={swatchId} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="#5c5c5c" strokeWidth="0.5" />
            </pattern>
          )}
          {pattern === 'grain' && (
            <pattern id={swatchId} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
              <line x1="0" y1="0" x2="0" y2="3" stroke="#5c5c5c" strokeWidth="0.3" />
            </pattern>
          )}
          {pattern === 'endgrain' && (
            <pattern id={swatchId} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="3" stroke="#5c5c5c" strokeWidth="0.35" />
              <line x1="0" y1="1.5" x2="3" y2="1.5" stroke="#5c5c5c" strokeWidth="0.2" opacity="0.5" />
            </pattern>
          )}
        </defs>
        <rect x="0" y="0" width={size} height={size} fill={`url(#${swatchId})`} opacity={0.7} />
        <rect x="0" y="0" width={size} height={size} fill="none" stroke="#888" strokeWidth="0.6" />
      </svg>
      {label}
    </span>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

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
        <CardTitle className="text-base">Bench construction — wall elevation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Side elevation per wall · bench tiers, heights, end caps and backrests · 1:50 · dimensions in mm
        </p>
        {wallsWithBenches.map((wall, i) => {
          const wallBenches = project.benches.filter(b => b.wall === wall);
          const wallLen = wall === 'north' || wall === 'south'
            ? project.room.length
            : project.room.width;
          return (
            <WallElevation
              key={wall}
              wall={wall}
              benches={wallBenches}
              ceilingHeight={project.room.ceilingHeight}
              wallLength={wallLen}
              sectionLetter={SECTION_LETTERS[i] ?? String(i + 1)}
              projectName={project.name}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
