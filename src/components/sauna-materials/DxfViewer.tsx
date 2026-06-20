'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, Link2, CheckCircle2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type { IEntity, IPoint } from 'dxf-parser';
import type { ILineEntity } from 'dxf-parser';
import type { ILwpolylineEntity } from 'dxf-parser';
import type { IArcEntity } from 'dxf-parser';
import type { ICircleEntity } from 'dxf-parser';

// ── Types ─────────────────────────────────────────────────────────────────────

type DxfEntity = Omit<IEntity, 'handle'> & {
  handle?: string | number;
  layer?: string;
};

interface ParsedDxf {
  entities: DxfEntity[];
  layers: string[];
}

type LinkTarget =
  | { kind: 'room'; field: 'length' | 'width' | 'ceilingHeight' }
  | { kind: 'bench'; benchId: string; field: 'length' | 'depth' | 'topHeight' }
  | { kind: 'opening'; openingId: string; field: 'width' | 'height' };

interface Annotation {
  id: string;
  entityHandle: string;
  layerName: string;
  lengthMm: number;
  target: LinkTarget;
  label: string;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function dist2D(a: IPoint, b: IPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function entityLength(entity: DxfEntity): number {
  switch (entity.type) {
    case 'LINE': {
      const e = entity as DxfEntity & ILineEntity;
      if (!e.vertices || e.vertices.length < 2) return 0;
      return dist2D(e.vertices[0], e.vertices[1]);
    }
    case 'LWPOLYLINE': {
      const e = entity as DxfEntity & ILwpolylineEntity;
      if (!e.vertices || e.vertices.length < 2) return 0;
      let total = 0;
      for (let i = 1; i < e.vertices.length; i++) {
        total += dist2D(e.vertices[i - 1], e.vertices[i]);
      }
      if ((e as any).shape && e.vertices.length > 2) {
        total += dist2D(e.vertices[e.vertices.length - 1], e.vertices[0]);
      }
      return total;
    }
    case 'ARC': {
      const e = entity as DxfEntity & IArcEntity;
      let span = e.endAngle - e.startAngle;
      if (span < 0) span += 360;
      return (Math.PI / 180) * span * e.radius;
    }
    case 'CIRCLE': {
      const e = entity as DxfEntity & ICircleEntity;
      return 2 * Math.PI * e.radius;
    }
    default:
      return 0;
  }
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

interface Transform {
  minX: number;
  minY: number;
  scale: number;
  pad: number;
  canvasH: number;
}

function toScreen(p: IPoint, t: Transform): { x: number; y: number } {
  return {
    x: (p.x - t.minX) * t.scale + t.pad,
    y: t.canvasH - ((p.y - t.minY) * t.scale + t.pad),
  };
}

function buildTransform(
  entities: DxfEntity[],
  canvasW: number,
  canvasH: number,
): Transform | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const ent of entities) {
    const pts = entityPoints(ent);
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  if (!isFinite(minX)) return null;

  const pad = 40;
  const dw = maxX - minX || 1;
  const dh = maxY - minY || 1;
  const scale = Math.min((canvasW - pad * 2) / dw, (canvasH - pad * 2) / dh);

  return { minX, minY, scale, pad, canvasH };
}

function entityPoints(ent: DxfEntity): IPoint[] {
  switch (ent.type) {
    case 'LINE': {
      const e = ent as DxfEntity & ILineEntity;
      return e.vertices ?? [];
    }
    case 'LWPOLYLINE': {
      const e = ent as DxfEntity & ILwpolylineEntity;
      return e.vertices ?? [];
    }
    case 'ARC':
    case 'CIRCLE': {
      const e = ent as DxfEntity & IArcEntity;
      const r = e.radius ?? 0;
      return [
        { x: e.center.x - r, y: e.center.y - r, z: 0 },
        { x: e.center.x + r, y: e.center.y + r, z: 0 },
      ];
    }
    default:
      return [];
  }
}

function drawEntities(
  ctx: CanvasRenderingContext2D,
  entities: DxfEntity[],
  visibleLayers: Set<string>,
  selected: DxfEntity | null,
  t: Transform,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const ent of entities) {
    if (ent.layer && !visibleLayers.has(ent.layer)) continue;
    const isSelected = selected?.handle === ent.handle;

    ctx.strokeStyle = isSelected ? '#7c3aed' : '#374151';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.setLineDash([]);

    drawEntity(ctx, ent, t);
  }
}

function drawEntity(ctx: CanvasRenderingContext2D, ent: DxfEntity, t: Transform) {
  switch (ent.type) {
    case 'LINE': {
      const e = ent as DxfEntity & ILineEntity;
      if (!e.vertices || e.vertices.length < 2) return;
      const a = toScreen(e.vertices[0], t);
      const b = toScreen(e.vertices[1], t);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      break;
    }
    case 'LWPOLYLINE': {
      const e = ent as DxfEntity & ILwpolylineEntity;
      if (!e.vertices || e.vertices.length < 2) return;
      ctx.beginPath();
      const first = toScreen(e.vertices[0], t);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < e.vertices.length; i++) {
        const pt = toScreen(e.vertices[i], t);
        ctx.lineTo(pt.x, pt.y);
      }
      if ((e as any).shape) ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'ARC': {
      const e = ent as DxfEntity & IArcEntity;
      const c = toScreen(e.center, t);
      const r = e.radius * t.scale;
      ctx.beginPath();
      ctx.arc(
        c.x, c.y, r,
        -(e.endAngle * Math.PI) / 180,
        -(e.startAngle * Math.PI) / 180,
      );
      ctx.stroke();
      break;
    }
    case 'CIRCLE': {
      const e = ent as DxfEntity & ICircleEntity;
      const c = toScreen(e.center, t);
      const r = e.radius * t.scale;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
}

// ── Hit testing ───────────────────────────────────────────────────────────────

function ptSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

function hitTest(
  entities: DxfEntity[],
  visibleLayers: Set<string>,
  cx: number,
  cy: number,
  t: Transform,
  threshold = 8,
): DxfEntity | null {
  let best: DxfEntity | null = null;
  let bestDist = threshold;

  for (const ent of entities) {
    if (ent.layer && !visibleLayers.has(ent.layer)) continue;
    let d = Infinity;

    if (ent.type === 'LINE') {
      const e = ent as DxfEntity & ILineEntity;
      if (!e.vertices || e.vertices.length < 2) continue;
      const a = toScreen(e.vertices[0], t);
      const b = toScreen(e.vertices[1], t);
      d = ptSegDist(cx, cy, a.x, a.y, b.x, b.y);
    } else if (ent.type === 'LWPOLYLINE') {
      const e = ent as DxfEntity & ILwpolylineEntity;
      if (!e.vertices || e.vertices.length < 2) continue;
      for (let i = 1; i < e.vertices.length; i++) {
        const a = toScreen(e.vertices[i - 1], t);
        const b = toScreen(e.vertices[i], t);
        d = Math.min(d, ptSegDist(cx, cy, a.x, a.y, b.x, b.y));
      }
      if ((e as any).shape) {
        const a = toScreen(e.vertices[e.vertices.length - 1], t);
        const b = toScreen(e.vertices[0], t);
        d = Math.min(d, ptSegDist(cx, cy, a.x, a.y, b.x, b.y));
      }
    } else if (ent.type === 'ARC' || ent.type === 'CIRCLE') {
      const e = ent as DxfEntity & IArcEntity;
      const c = toScreen(e.center, t);
      const r = e.radius * t.scale;
      d = Math.abs(Math.sqrt((cx - c.x) ** 2 + (cy - c.y) ** 2) - r);
    }

    if (d < bestDist) {
      bestDist = d;
      best = ent;
    }
  }
  return best;
}

// ── Link options ──────────────────────────────────────────────────────────────

function buildLinkOptions(project: ReturnType<typeof useSaunaMaterials>['project']) {
  const options: Array<{ value: string; label: string; target: LinkTarget }> = [
    { value: 'room.length',        label: 'Room: Length',         target: { kind: 'room', field: 'length' } },
    { value: 'room.width',         label: 'Room: Width',          target: { kind: 'room', field: 'width' } },
    { value: 'room.ceilingHeight', label: 'Room: Ceiling height', target: { kind: 'room', field: 'ceilingHeight' } },
  ];
  for (const b of project.benches) {
    const label = `${b.tier.charAt(0).toUpperCase() + b.tier.slice(1)} bench`;
    options.push({ value: `bench.${b.id}.length`,    label: `${label}: Length`,     target: { kind: 'bench', benchId: b.id, field: 'length' } });
    options.push({ value: `bench.${b.id}.depth`,     label: `${label}: Depth`,      target: { kind: 'bench', benchId: b.id, field: 'depth' } });
    options.push({ value: `bench.${b.id}.topHeight`, label: `${label}: Top height`, target: { kind: 'bench', benchId: b.id, field: 'topHeight' } });
  }
  for (const o of project.openings) {
    const label = `${o.type.charAt(0).toUpperCase() + o.type.slice(1)} (${o.wall})`;
    options.push({ value: `opening.${o.id}.width`,  label: `${label}: Width`,  target: { kind: 'opening', openingId: o.id, field: 'width' } });
    options.push({ value: `opening.${o.id}.height`, label: `${label}: Height`, target: { kind: 'opening', openingId: o.id, field: 'height' } });
  }
  return options;
}

function formatMm(mm: number): string {
  return mm >= 1000
    ? `${(mm / 1000).toFixed(3).replace(/\.?0+$/, '')}m`
    : `${Math.round(mm)}mm`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DxfViewer() {
  const { project, dispatchProject } = useSaunaMaterials();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dxf, setDxf] = useState<ParsedDxf | null>(null);
  const [transform, setTransform] = useState<Transform | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<DxfEntity | null>(null);
  const [linkValue, setLinkValue] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const linkOptions = buildLinkOptions(project);
  const selectedLength = selected ? entityLength(selected) : 0;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dxf || !transform) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawEntities(ctx, dxf.entities, visibleLayers, selected, transform);
  }, [dxf, transform, visibleLayers, selected]);

  useEffect(() => { redraw(); }, [redraw]);

  const rebuildTransform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !dxf) return;
    const w = container.clientWidth;
    const h = Math.max(400, Math.round(w * 0.6));
    canvas.width = w;
    canvas.height = h;
    const t = buildTransform(dxf.entities, w, h);
    if (t) {
      t.canvasH = h;
      setTransform(t);
    }
  }, [dxf]);

  useEffect(() => {
    if (!dxf) return;
    rebuildTransform();
    const observer = new ResizeObserver(rebuildTransform);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [dxf, rebuildTransform]);

  const loadFile = useCallback(async (file: File) => {
    const text = await file.text();
    const { DxfParser } = await import('dxf-parser');
    const parser = new DxfParser();
    const parsed = parser.parse(text);
    if (!parsed) return;

    const layers = new Set<string>();
    const entities = ((parsed.entities ?? []) as unknown as DxfEntity[]).filter((e) => {
      if (e.layer) layers.add(e.layer);
      return ['LINE', 'LWPOLYLINE', 'ARC', 'CIRCLE'].includes(e.type);
    });

    setDxf({ entities, layers: Array.from(layers).sort() });
    setVisibleLayers(new Set(layers));
    setSelected(null);
    setAnnotations([]);
    setFileName(file.name);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dxf || !transform) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const hit = hitTest(dxf.entities, visibleLayers, cx, cy, transform);
    setSelected(hit);
    setLinkValue('');
  }, [dxf, transform, visibleLayers]);

  function applyLink() {
    if (!selected || !linkValue) return;
    const opt = linkOptions.find(o => o.value === linkValue);
    if (!opt) return;

    const mm = Math.round(selectedLength);
    const t = opt.target;

    if (t.kind === 'room') {
      dispatchProject({ type: 'UPDATE_ROOM', patch: { [t.field]: mm } });
    } else if (t.kind === 'bench') {
      dispatchProject({ type: 'UPDATE_BENCH', id: t.benchId, patch: { [t.field]: mm } });
    } else if (t.kind === 'opening') {
      dispatchProject({ type: 'UPDATE_OPENING', id: t.openingId, patch: { [t.field]: mm } });
    }

    const existing = annotations.findIndex(a => a.target.kind === t.kind &&
      (t.kind === 'room'
        ? (a.target as any).field === t.field
        : t.kind === 'bench'
          ? (a.target as any).benchId === t.benchId && (a.target as any).field === t.field
          : (a.target as any).openingId === t.openingId && (a.target as any).field === t.field));

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      entityHandle: String(selected.handle ?? ''),
      layerName: selected.layer ?? '0',
      lengthMm: mm,
      target: t,
      label: opt.label,
    };

    setAnnotations(prev =>
      existing >= 0
        ? prev.map((a, i) => (i === existing ? annotation : a))
        : [...prev, annotation],
    );
    setLinkValue('');
  }

  function removeAnnotation(id: string) {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }

  function toggleLayer(layer: string) {
    setVisibleLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }

  if (!dxf) {
    return (
      <Card>
        <CardContent className="p-0">
          <label
            className={[
              'flex flex-col items-center justify-center gap-3 cursor-pointer rounded-xl',
              'border-2 border-dashed transition-colors min-h-56',
              dragging ? 'border-primary bg-purple-1' : 'border-gray-2 hover:border-primary hover:bg-purple-1/50',
            ].join(' ')}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input type="file" accept=".dxf" className="sr-only" onChange={onFileInput} />
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Drop a DXF file or click to upload</p>
              <p className="text-xs text-muted-foreground mt-0.5">Export DXF from AutoCAD, Revit, or any CAD tool</p>
            </div>
          </label>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Canvas + layers */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{fileName}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => { setDxf(null); setFileName(''); setAnnotations([]); setSelected(null); }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex gap-0">
            {/* Canvas */}
            <div ref={containerRef} className="flex-1 min-w-0">
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair rounded-b-xl"
                onClick={onCanvasClick}
              />
            </div>

            {/* Layer panel */}
            {dxf.layers.length > 0 && (
              <div className="w-44 shrink-0 border-l border-gray-2 p-3 space-y-1 overflow-y-auto max-h-[500px]">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Layers</p>
                {dxf.layers.map(layer => (
                  <label key={layer} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={visibleLayers.has(layer)}
                      onChange={() => toggleLayer(layer)}
                      className="accent-primary"
                    />
                    <span className="text-xs truncate group-hover:text-foreground text-muted-foreground">
                      {layer}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selection + link panel */}
      <Card>
        <CardContent className="py-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Click any line in the drawing to select it and link its measurement
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Selected</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {selected.type}
                    {selected.layer ? <span className="text-muted-foreground font-normal"> · {selected.layer}</span> : null}
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-primary mt-1">
                    {formatMm(selectedLength)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setSelected(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select value={linkValue} onValueChange={setLinkValue}>
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Link to take-off field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!linkValue}
                  onClick={applyLink}
                  className="gap-1.5"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Apply
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annotations list */}
      {annotations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Linked measurements ({annotations.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-1">
              {annotations.map(ann => (
                <div key={ann.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ann.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMm(ann.lengthMm)}
                        {ann.layerName !== '0' && <span> · {ann.layerName}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAnnotation(ann.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
