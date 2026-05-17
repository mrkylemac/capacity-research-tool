'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  benchTransform,
  columnTransform,
  heaterTransform,
  openingTransform,
  type ItemTransform,
} from '@/lib/saunaMaterials/diagramLayout';
import { useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type { Opening } from '@/types/saunaMaterials';

// ─── Layout constants ────────────────────────────────────────────────────────

const VW = 600;
const VH = 400;

// Outer margin accommodates dimension chains + north arrow
const MARGIN_T = 52;   // top    – north dimension + arrow
const MARGIN_B = 52;   // bottom – south dimension
const MARGIN_L = 58;   // left   – west dimension
const MARGIN_R = 52;   // right  – east dimension

// Architectural wall thickness representation (px — visual only)
const WALL_THK_PX = 8;

// Technical ink palette
const INK   = '#111111';
const INK_D = '#3a3a3a';
const INK_H = '#5c5c5c';
const INK_S = '#888888';

// Line weights
const LW_CUT = 2.2;
const LW_VIS = 1.2;
const LW_DIM = 0.55;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyTransform(t: ItemTransform, scale: number, ox: number, oy: number) {
  return {
    cx: ox + (t.x + t.width / 2) * scale,
    cy: oy + (t.y + t.depth / 2) * scale,
    w:  t.width * scale,
    d:  t.depth * scale,
    rot: t.rotation,
  };
}

/** Slash tick for dimension endpoints */
function DimTick({ x, y }: { x: number; y: number }) {
  return <line x1={x - 4} y1={y + 4} x2={x + 4} y2={y - 4} stroke={INK_D} strokeWidth={0.8} />;
}

/** Architectural north arrow */
function NorthArrow({ x, y }: { x: number; y: number }) {
  const r = 11;
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Outer circle */}
      <circle cx={0} cy={0} r={r} fill="white" stroke={INK} strokeWidth={0.9} />
      {/* Filled north half */}
      <path d={`M0,${-r + 2} L${r * 0.45},${r * 0.6} L0,${r * 0.25} Z`}
        fill={INK} />
      {/* Outlined south half */}
      <path d={`M0,${-r + 2} L${-r * 0.45},${r * 0.6} L0,${r * 0.25} Z`}
        fill="white" stroke={INK} strokeWidth={0.7} />
      {/* N label */}
      <text x={0} y={-r - 4} textAnchor="middle" fill={INK} fontSize={8}
        fontWeight="700" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        N
      </text>
    </g>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export function RoomDiagram() {
  const { project } = useSaunaMaterials();
  const { length, width } = project.room;

  // Available drawing area (inside margins)
  const drawW = VW - MARGIN_L - MARGIN_R;
  const drawH = VH - MARGIN_T - MARGIN_B;

  const scale = Math.min(drawW / length, drawH / width);
  const rW = length * scale;
  const rH = width  * scale;

  // Centre the room within the available area
  const ox = MARGIN_L + (drawW - rW) / 2;
  const oy = MARGIN_T + (drawH - rH) / 2;

  const uid = 'room';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sauna plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ background: '#ffffff', border: '1px solid #c8c8c8' }}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            className="w-full h-auto select-none"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif', display: 'block' }}
          >
            {/* ── Pattern library ─────────────────────────────────────── */}
            <defs>
              {/* Masonry for wall fill */}
              <pattern id={`mas-${uid}`} x="0" y="0" width="5" height="5"
                patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke={INK_H} strokeWidth="0.45" />
              </pattern>
              {/* Bench: near-vertical face grain */}
              <pattern id={`grn-${uid}`} x="0" y="0" width="4" height="4"
                patternUnits="userSpaceOnUse" patternTransform="rotate(10)">
                <line x1="0" y1="0" x2="0" y2="4" stroke={INK_H} strokeWidth="0.3" />
              </pattern>
              {/* Tile: fine grid */}
              <pattern id={`tile-${uid}`} x="0" y="0" width="5" height="5"
                patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="5" height="5"
                  fill="none" stroke={INK_H} strokeWidth="0.3" />
              </pattern>
            </defs>

            {/* ── White background ─────────────────────────────────────── */}
            <rect x={0} y={0} width={VW} height={VH} fill="white" />

            {/* ── Room outer wall (thick line — cut in plan section) ───── */}
            <rect
              x={ox - WALL_THK_PX} y={oy - WALL_THK_PX}
              width={rW + WALL_THK_PX * 2} height={rH + WALL_THK_PX * 2}
              fill={`url(#mas-${uid})`} opacity={0.6}
            />
            {/* Outer wall outline */}
            <rect
              x={ox - WALL_THK_PX} y={oy - WALL_THK_PX}
              width={rW + WALL_THK_PX * 2} height={rH + WALL_THK_PX * 2}
              fill="none" stroke={INK} strokeWidth={LW_CUT}
            />
            {/* Room interior (white over hatch) */}
            <rect x={ox} y={oy} width={rW} height={rH} fill="white" />
            {/* Inner wall face line */}
            <rect x={ox} y={oy} width={rW} height={rH}
              fill="none" stroke={INK} strokeWidth={LW_VIS} />

            {/* ── Heater zone ──────────────────────────────────────────── */}
            {project.heaterZone && (() => {
              const t = applyTransform(heaterTransform(project.heaterZone, project.room), scale, ox, oy);
              return (
                <g transform={`translate(${t.cx} ${t.cy}) rotate(${t.rot})`}>
                  <rect x={-t.w / 2} y={-t.d / 2} width={t.w} height={t.d}
                    fill={`url(#tile-${uid})`} opacity={0.8} />
                  <rect x={-t.w / 2} y={-t.d / 2} width={t.w} height={t.d}
                    fill="none" stroke={INK} strokeWidth={LW_VIS} />
                  <text x={0} y={4} textAnchor="middle" fill={INK} fontSize={6.5}
                    fontWeight="600">HTR</text>
                </g>
              );
            })()}

            {/* ── Columns ──────────────────────────────────────────────── */}
            {project.columns.map((c) => {
              const itemT = columnTransform(c, project.room);
              if (!itemT) return null;
              const t = applyTransform(itemT, scale, ox, oy);
              return (
                <g key={c.id} transform={`translate(${t.cx} ${t.cy}) rotate(${t.rot})`}>
                  <rect x={-t.w / 2} y={-t.d / 2} width={t.w} height={t.d}
                    fill={`url(#${c.finish === 'tile' ? `tile-${uid}` : `mas-${uid}`})`}
                    opacity={0.75} />
                  <rect x={-t.w / 2} y={-t.d / 2} width={t.w} height={t.d}
                    fill="none" stroke={INK} strokeWidth={LW_CUT} />
                  {/* Cross-diagonal to indicate solid column */}
                  <line x1={-t.w / 2} y1={-t.d / 2} x2={t.w / 2} y2={t.d / 2}
                    stroke={INK} strokeWidth={LW_DIM} opacity={0.5} />
                  <line x1={t.w / 2} y1={-t.d / 2} x2={-t.w / 2} y2={t.d / 2}
                    stroke={INK} strokeWidth={LW_DIM} opacity={0.5} />
                </g>
              );
            })}

            {/* ── Benches ──────────────────────────────────────────────── */}
            {project.benches.map((b) => {
              const t = applyTransform(benchTransform(b, project.room), scale, ox, oy);
              return (
                <g key={b.id} transform={`translate(${t.cx} ${t.cy}) rotate(${t.rot})`}>
                  {/* Bench fill — face grain hatch */}
                  <rect x={-t.w / 2} y={-t.d / 2} width={t.w} height={t.d}
                    fill={`url(#grn-${uid})`} opacity={0.55} />
                  <rect x={-t.w / 2} y={-t.d / 2} width={t.w} height={t.d}
                    fill="none" stroke={INK} strokeWidth={LW_VIS} />
                  {/* Slat direction lines (suggest parallel slats) */}
                  {Array.from({ length: Math.max(2, Math.floor(t.d / 10)) }).map((_, k, arr) => {
                    const frac = (k + 1) / (arr.length + 1);
                    return (
                      <line key={k}
                        x1={-t.w / 2} y1={-t.d / 2 + t.d * frac}
                        x2={t.w / 2}  y2={-t.d / 2 + t.d * frac}
                        stroke={INK} strokeWidth={0.3} opacity={0.4} />
                    );
                  })}
                  {/* Tier label */}
                  <text x={0} y={2} textAnchor="middle" fill={INK} fontSize={6.5}
                    fontWeight="600" letterSpacing="0.3">
                    {b.tier.toUpperCase().slice(0, 4)}
                  </text>
                </g>
              );
            })}

            {/* ── Openings (doors & windows) ───────────────────────────── */}
            {project.openings.map((o) => {
              const t = applyTransform(openingTransform(o, project.room), scale, ox, oy);
              const isDoor = o.type === 'door';
              return (
                <g key={o.id} transform={`translate(${t.cx} ${t.cy}) rotate(${t.rot})`}>
                  {/* Opening gap: white over wall */}
                  <rect x={-t.w / 2} y={-t.d / 2} width={t.w} height={t.d} fill="white" />
                  {/* Opening line (threshold / glazing) */}
                  <line x1={-t.w / 2} y1={0} x2={t.w / 2} y2={0}
                    stroke={INK} strokeWidth={isDoor ? 0.6 : 1.2}
                    strokeDasharray={isDoor ? 'none' : 'none'} />
                  {/* Door swing arc */}
                  {isDoor && (
                    <>
                      {/* Hinge point at one end, arc sweeps 90° */}
                      <line x1={-t.w / 2} y1={0} x2={-t.w / 2} y2={-t.w}
                        stroke={INK} strokeWidth={0.7} />
                      <path
                        d={`M ${-t.w / 2} ${-t.w} A ${t.w} ${t.w} 0 0 1 ${t.w / 2} 0`}
                        fill="none" stroke={INK} strokeWidth={0.7} strokeDasharray="3 2" />
                    </>
                  )}
                  {/* Window: double line glazing */}
                  {!isDoor && (
                    <>
                      <line x1={-t.w / 2} y1={-1.5} x2={t.w / 2} y2={-1.5}
                        stroke={INK} strokeWidth={0.6} />
                      <line x1={-t.w / 2} y1={1.5} x2={t.w / 2} y2={1.5}
                        stroke={INK} strokeWidth={0.6} />
                    </>
                  )}
                  {/* Type label */}
                  <text x={0} y={isDoor ? -t.w / 3 : -4} textAnchor="middle"
                    fill={INK_S} fontSize={5.5} fontWeight="600">
                    {o.type.toUpperCase().slice(0, 3)}
                  </text>
                </g>
              );
            })}

            {/* ── Dimension chains ─────────────────────────────────────── */}

            {/* North (top) dimension */}
            {(() => {
              const y0 = oy - WALL_THK_PX - 18;
              const x1 = ox - WALL_THK_PX;
              const x2 = ox + rW + WALL_THK_PX;
              return (
                <g>
                  <line x1={x1} y1={oy - WALL_THK_PX - 4} x2={x1} y2={oy - WALL_THK_PX - 22}
                    stroke={INK_D} strokeWidth={LW_DIM} />
                  <line x1={x2} y1={oy - WALL_THK_PX - 4} x2={x2} y2={oy - WALL_THK_PX - 22}
                    stroke={INK_D} strokeWidth={LW_DIM} />
                  <line x1={x1} y1={y0} x2={x2} y2={y0} stroke={INK_D} strokeWidth={LW_DIM} />
                  <DimTick x={x1} y={y0} />
                  <DimTick x={x2} y={y0} />
                  <rect x={(x1 + x2) / 2 - 22} y={y0 - 9} width={44} height={10} fill="white" />
                  <text x={(x1 + x2) / 2} y={y0 - 1} textAnchor="middle"
                    fill={INK} fontSize={8} fontWeight="700">
                    {length}mm
                  </text>
                  {/* "NORTH" label */}
                  <text x={(x1 + x2) / 2} y={y0 - 14} textAnchor="middle"
                    fill={INK_S} fontSize={7} letterSpacing="1">NORTH</text>
                </g>
              );
            })()}

            {/* South (bottom) dimension */}
            {(() => {
              const y0 = oy + rH + WALL_THK_PX + 18;
              const x1 = ox - WALL_THK_PX;
              const x2 = ox + rW + WALL_THK_PX;
              return (
                <g>
                  <line x1={x1} y1={oy + rH + WALL_THK_PX + 4} x2={x1} y2={oy + rH + WALL_THK_PX + 22}
                    stroke={INK_D} strokeWidth={LW_DIM} />
                  <line x1={x2} y1={oy + rH + WALL_THK_PX + 4} x2={x2} y2={oy + rH + WALL_THK_PX + 22}
                    stroke={INK_D} strokeWidth={LW_DIM} />
                  <line x1={x1} y1={y0} x2={x2} y2={y0} stroke={INK_D} strokeWidth={LW_DIM} />
                  <DimTick x={x1} y={y0} />
                  <DimTick x={x2} y={y0} />
                  <rect x={(x1 + x2) / 2 - 22} y={y0 - 1} width={44} height={10} fill="white" />
                  <text x={(x1 + x2) / 2} y={y0 + 8} textAnchor="middle"
                    fill={INK} fontSize={8} fontWeight="700">
                    {length}mm
                  </text>
                  <text x={(x1 + x2) / 2} y={y0 + 20} textAnchor="middle"
                    fill={INK_S} fontSize={7} letterSpacing="1">SOUTH</text>
                </g>
              );
            })()}

            {/* West (left) dimension */}
            {(() => {
              const x0 = ox - WALL_THK_PX - 18;
              const y1 = oy - WALL_THK_PX;
              const y2 = oy + rH + WALL_THK_PX;
              return (
                <g>
                  <line x1={ox - WALL_THK_PX - 4} y1={y1} x2={ox - WALL_THK_PX - 22} y2={y1}
                    stroke={INK_D} strokeWidth={LW_DIM} />
                  <line x1={ox - WALL_THK_PX - 4} y1={y2} x2={ox - WALL_THK_PX - 22} y2={y2}
                    stroke={INK_D} strokeWidth={LW_DIM} />
                  <line x1={x0} y1={y1} x2={x0} y2={y2} stroke={INK_D} strokeWidth={LW_DIM} />
                  <DimTick x={x0} y={y1} />
                  <DimTick x={x0} y={y2} />
                  <rect x={x0 - 4} y={(y1 + y2) / 2 - 22} width={10} height={44} fill="white" />
                  <text
                    x={x0} y={(y1 + y2) / 2}
                    textAnchor="middle" fill={INK} fontSize={8} fontWeight="700"
                    transform={`rotate(-90 ${x0} ${(y1 + y2) / 2})`}>
                    {width}mm
                  </text>
                </g>
              );
            })()}

            {/* East (right) label */}
            {(() => {
              const xLab = ox + rW + WALL_THK_PX + 28;
              const ymid = oy + rH / 2;
              return (
                <text x={xLab} y={ymid} textAnchor="middle" fill={INK_S}
                  fontSize={7} letterSpacing="1"
                  transform={`rotate(90 ${xLab} ${ymid})`}>
                  EAST
                </text>
              );
            })()}

            {/* ── North arrow ──────────────────────────────────────────── */}
            <NorthArrow x={VW - 24} y={MARGIN_T - 20} />

            {/* ── Title block ──────────────────────────────────────────── */}
            <line x1={MARGIN_L} y1={VH - 14} x2={VW - 8} y2={VH - 14}
              stroke={INK_S} strokeWidth={0.5} />
            <text x={MARGIN_L} y={VH - 4} fill={INK_S} fontSize={7} letterSpacing="0.3">
              FLOOR PLAN · 1:50 · DIMENSIONS IN MM
            </text>
            <text x={VW - 8} y={VH - 4} textAnchor="end" fill={INK_S} fontSize={7} letterSpacing="0.3">
              {project.name.toUpperCase()}
            </text>
          </svg>

          {/* Legend strip */}
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
            <PlanLegendItem pattern="masonry" label="Wall section" />
            <PlanLegendItem pattern="grain" label="Bench (plan)" />
            <PlanLegendItem pattern="tile" label="Tile / heater zone" />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width={20} height={14}>
                <line x1={4} y1={7} x2={16} y2={7} stroke={INK} strokeWidth={0.8}
                  strokeDasharray="3 2" />
              </svg>
              Door swing
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanLegendItem({ pattern, label }: { pattern: string; label: string }) {
  const sid = `pl-${pattern}`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <svg width={14} height={14}>
        <defs>
          {pattern === 'masonry' && (
            <pattern id={sid} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="#5c5c5c" strokeWidth="0.45" />
            </pattern>
          )}
          {pattern === 'grain' && (
            <pattern id={sid} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(10)">
              <line x1="0" y1="0" x2="0" y2="3" stroke="#5c5c5c" strokeWidth="0.3" />
            </pattern>
          )}
          {pattern === 'tile' && (
            <pattern id={sid} width="4" height="4" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="4" height="4" fill="none" stroke="#5c5c5c" strokeWidth="0.3" />
            </pattern>
          )}
        </defs>
        <rect x="0" y="0" width="14" height="14" fill={`url(#${sid})`} opacity={0.7} />
        <rect x="0" y="0" width="14" height="14" fill="none" stroke="#888" strokeWidth="0.6" />
      </svg>
      {label}
    </span>
  );
}
