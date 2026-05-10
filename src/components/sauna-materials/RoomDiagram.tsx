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

const VIEW_W = 600;
const VIEW_H = 360;
const MARGIN = 60;

function applyTransform(t: ItemTransform, scale: number, originX: number, originY: number) {
  const cxPx = originX + (t.x + t.width / 2) * scale;
  const cyPx = originY + (t.y + t.depth / 2) * scale;
  return {
    cxPx,
    cyPx,
    wPx: t.width * scale,
    dPx: t.depth * scale,
    rotation: t.rotation,
  };
}

export function RoomDiagram() {
  const { project } = useSaunaMaterials();
  const { length, width } = project.room;

  const innerW = VIEW_W - MARGIN * 2;
  const innerH = VIEW_H - MARGIN * 2;
  const scale = Math.min(innerW / length, innerH / width);
  const w = length * scale;
  const h = width * scale;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;

  const openingColour = (type: Opening['type']) =>
    type === 'door' ? 'var(--red-4)' : type === 'window' ? 'var(--sky-4)' : 'var(--amber-4)';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sauna Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto select-none">
          <rect x={x} y={y} width={w} height={h} fill="var(--card)" stroke="var(--gray-3)" strokeWidth={1.5} rx={6} />

          <text x={x + w / 2} y={y - 18} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
            North · {length}mm
          </text>
          <text x={x + w / 2} y={y + h + 28} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
            South · {length}mm
          </text>
          <text
            x={x - 18}
            y={y + h / 2}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 11, fontWeight: 600 }}
            transform={`rotate(-90 ${x - 18} ${y + h / 2})`}
          >
            West · {width}mm
          </text>
          <text
            x={x + w + 18}
            y={y + h / 2}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 11, fontWeight: 600 }}
            transform={`rotate(90 ${x + w + 18} ${y + h / 2})`}
          >
            East · {width}mm
          </text>

          {project.heaterZone && (() => {
            const t = applyTransform(heaterTransform(project.heaterZone, project.room), scale, x, y);
            return (
              <g transform={`translate(${t.cxPx} ${t.cyPx}) rotate(${t.rotation})`}>
                <rect x={-t.wPx / 2} y={-t.dPx / 2} width={t.wPx} height={t.dPx} fill="var(--amber-3)" opacity={0.85} rx={2} />
              </g>
            );
          })()}

          {project.columns.map((c) => {
            const itemT = columnTransform(c, project.room);
            if (!itemT) return null;
            const t = applyTransform(itemT, scale, x, y);
            return (
              <g key={c.id} transform={`translate(${t.cxPx} ${t.cyPx}) rotate(${t.rotation})`}>
                <rect
                  x={-t.wPx / 2}
                  y={-t.dPx / 2}
                  width={t.wPx}
                  height={t.dPx}
                  fill={c.finish === 'tile' ? 'var(--amber-4)' : 'var(--gray-3)'}
                  opacity={0.7}
                  rx={2}
                />
              </g>
            );
          })}

          {project.benches.map((b, i) => {
            const t = applyTransform(benchTransform(b, project.room), scale, x, y);
            const palette = ['var(--purple-3)', 'var(--purple-2)', 'var(--sky-3)', 'var(--green-3)'];
            return (
              <g key={b.id} transform={`translate(${t.cxPx} ${t.cyPx}) rotate(${t.rotation})`}>
                <rect
                  x={-t.wPx / 2}
                  y={-t.dPx / 2}
                  width={t.wPx}
                  height={t.dPx}
                  fill={palette[i % palette.length]}
                  opacity={0.6}
                  rx={3}
                />
              </g>
            );
          })}

          {project.openings.map((o) => {
            const t = applyTransform(openingTransform(o, project.room), scale, x, y);
            return (
              <g key={o.id} transform={`translate(${t.cxPx} ${t.cyPx}) rotate(${t.rotation})`}>
                <rect
                  x={-t.wPx / 2}
                  y={-t.dPx / 2}
                  width={t.wPx}
                  height={t.dPx}
                  fill={openingColour(o.type)}
                  opacity={0.85}
                  rx={2}
                />
              </g>
            );
          })}
        </svg>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <Legend swatch="var(--purple-3)" label="Bench" />
          <Legend swatch="var(--amber-3)" label="Heater" />
          <Legend swatch="var(--amber-4)" label="Tile column" />
          <Legend swatch="var(--red-4)" label="Door" />
          <Legend swatch="var(--sky-4)" label="Window" />
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-block w-3 h-3 rounded-sm" style={{ background: swatch, opacity: 0.8 }} />
      {label}
    </span>
  );
}
