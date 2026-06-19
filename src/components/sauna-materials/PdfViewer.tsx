'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Link2, CheckCircle2, Ruler, Square,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Minus, CheckCheck, PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type { WallId } from '@/types/saunaMaterials';

// ── Constants ─────────────────────────────────────────────────────────────────

const PDF_RENDER_SCALE = 2;
const DBL_CLICK_MS = 300;
const DBL_CLICK_PX = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pt { x: number; y: number }

type RectSide = 'top' | 'right' | 'bottom' | 'left';

interface RoomBox {
  p1: Pt;
  p2: Pt;
  northSide: RectSide; // which drawn side is North; others follow clockwise
}

interface CalibrationLine {
  p1: Pt; p2: Pt;
  pageNum: number;
  pxPerMm: number;
}

interface LineMeasure {
  id: string;
  pageNum: number;
  points: Pt[];
  lengthMm: number;
}

interface Annotation {
  id: string;
  lineId: string;
  mm: number;
  targetValue: string;
  targetLabel: string;
}

type Tool = 'view' | 'calibrate' | 'line' | 'room';

// ── Geometry ──────────────────────────────────────────────────────────────────

function ptDist(a: Pt, b: Pt) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function ptSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

function totalPolyLen(points: Pt[]) {
  return points.reduce((sum, p, i) => i === 0 ? sum : sum + ptDist(points[i - 1], p), 0);
}

function polyHitDist(px: number, py: number, points: Pt[]) {
  let min = Infinity;
  for (let i = 1; i < points.length; i++) {
    min = Math.min(min, ptSegDist(px, py, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y));
  }
  return min;
}

function formatMm(mm: number) {
  return mm >= 1000
    ? `${(mm / 1000).toFixed(3).replace(/\.?0+$/, '')}m`
    : `${Math.round(mm)}mm`;
}

// Which compass direction each rect side is, given northSide
function sideDirection(side: RectSide, northSide: RectSide): WallId {
  const order: RectSide[] = ['top', 'right', 'bottom', 'left'];
  const dirs: WallId[]    = ['north', 'east', 'south', 'west'];
  const northIdx = order.indexOf(northSide);
  const sideIdx  = order.indexOf(side);
  return dirs[(sideIdx - northIdx + 4) % 4];
}

// Rotate northSide clockwise
function rotateCW(side: RectSide): RectSide {
  const order: RectSide[] = ['top', 'right', 'bottom', 'left'];
  return order[(order.indexOf(side) + 1) % 4];
}

// ── Canvas drawing ────────────────────────────────────────────────────────────

function drawTick(ctx: CanvasRenderingContext2D, p: Pt, angle: number, size: number) {
  const perp = angle + Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(perp) * size, p.y + Math.sin(perp) * size);
  ctx.lineTo(p.x - Math.cos(perp) * size, p.y - Math.sin(perp) * size);
  ctx.stroke();
}

function drawPolyMeasure(
  ctx: CanvasRenderingContext2D,
  points: Pt[],
  label: string | null,
  color: string,
  lineWidth: number,
) {
  if (points.length < 2) return;
  const tickSize = 8 * PDF_RENDER_SCALE;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  const firstAngle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
  drawTick(ctx, points[0], firstAngle, tickSize);
  const last = points.length - 1;
  const lastAngle = Math.atan2(points[last].y - points[last - 1].y, points[last].x - points[last - 1].x);
  drawTick(ctx, points[last], lastAngle, tickSize);

  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 * PDF_RENDER_SCALE, 0, Math.PI * 2);
    ctx.fill();
  }

  if (label) {
    const total = totalPolyLen(points);
    let half = total / 2;
    let mx = points[0].x, my = points[0].y, labelAngle = 0;
    for (let i = 1; i < points.length; i++) {
      const seg = ptDist(points[i - 1], points[i]);
      if (half <= seg) {
        const t = half / seg;
        mx = points[i - 1].x + t * (points[i].x - points[i - 1].x);
        my = points[i - 1].y + t * (points[i].y - points[i - 1].y);
        labelAngle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
        break;
      }
      half -= seg;
    }

    const fontSize = 13 * PDF_RENDER_SCALE;
    ctx.font = `bold ${fontSize}px system-ui`;
    const tw = ctx.measureText(label).width;
    const pad = 6 * PDF_RENDER_SCALE;

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.abs(labelAngle) > Math.PI / 2 ? labelAngle + Math.PI : labelAngle);

    const rx = -tw / 2 - pad, ry = -fontSize / 2 - pad * 0.5;
    const rw = tw + pad * 2, rh = fontSize + pad, r = rh / 2;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry); ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r); ctx.arcTo(rx, ry + rh, rx, ry, r);
    ctx.arcTo(rx, ry, rx + rw, ry, r); ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }

  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, pt: Pt, text: string) {
  const fontSize = 11 * PDF_RENDER_SCALE;
  const pad = 6 * PDF_RENDER_SCALE;
  const offX = 18 * PDF_RENDER_SCALE;
  const offY = -12 * PDF_RENDER_SCALE;

  ctx.save();
  ctx.font = `${fontSize}px system-ui`;
  const tw = ctx.measureText(text).width;
  const w = tw + pad * 2;
  const h = fontSize + pad * 1.5;

  let x = pt.x + offX;
  let y = pt.y + offY - h;
  if (x + w > ctx.canvas.width - pad) x = pt.x - offX - w;
  if (y < pad) y = pt.y + Math.abs(offY) + pad;

  ctx.fillStyle = 'rgba(17, 24, 39, 0.82)';
  const r = 4 * PDF_RENDER_SCALE;
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x + pad, y + pad * 0.75);
  ctx.restore();
}

function drawRoomBox(
  ctx: CanvasRenderingContext2D,
  box: RoomBox,
  pxPerMm: number,
) {
  const x1 = Math.min(box.p1.x, box.p2.x);
  const y1 = Math.min(box.p1.y, box.p2.y);
  const x2 = Math.max(box.p1.x, box.p2.x);
  const y2 = Math.max(box.p1.y, box.p2.y);
  const w  = x2 - x1;
  const h  = y2 - y1;

  ctx.save();

  // Tinted fill
  ctx.fillStyle = 'rgba(124, 58, 237, 0.06)';
  ctx.fillRect(x1, y1, w, h);

  // Border
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2 * PDF_RENDER_SCALE;
  ctx.strokeRect(x1, y1, w, h);

  // Corner handles
  ctx.fillStyle = '#7c3aed';
  for (const [px, py] of [[x1,y1],[x2,y1],[x2,y2],[x1,y2]]) {
    ctx.beginPath();
    ctx.arc(px as number, py as number, 5 * PDF_RENDER_SCALE, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wall direction badges on each side + dimension labels
  const SIDES: Array<{ side: RectSide; cx: number; cy: number; angle: number; dimOffset: number }> = [
    { side: 'top',    cx: (x1+x2)/2, cy: y1,          angle: 0,            dimOffset: -28 * PDF_RENDER_SCALE },
    { side: 'right',  cx: x2,        cy: (y1+y2)/2,   angle: Math.PI / 2,  dimOffset:  28 * PDF_RENDER_SCALE },
    { side: 'bottom', cx: (x1+x2)/2, cy: y2,          angle: 0,            dimOffset:  28 * PDF_RENDER_SCALE },
    { side: 'left',   cx: x1,        cy: (y1+y2)/2,   angle: Math.PI / 2,  dimOffset: -28 * PDF_RENDER_SCALE },
  ];

  const SHORT: Record<WallId, string> = { north: 'N', east: 'E', south: 'S', west: 'W' };
  const fontSize = 13 * PDF_RENDER_SCALE;

  for (const s of SIDES) {
    const dir = sideDirection(s.side, box.northSide);
    const isNorth = dir === 'north';
    const label = SHORT[dir];

    ctx.save();
    ctx.translate(s.cx, s.cy);
    ctx.rotate(s.angle);

    ctx.font = `bold ${fontSize}px system-ui`;
    const tw  = ctx.measureText(label).width;
    const pad = 5 * PDF_RENDER_SCALE;
    const bw  = tw + pad * 2;
    const bh  = fontSize + pad;
    const by  = -20 * PDF_RENDER_SCALE - bh / 2;

    ctx.fillStyle = isNorth ? '#7c3aed' : 'rgba(124, 58, 237, 0.18)';
    const r2 = bh / 2;
    ctx.beginPath();
    ctx.moveTo(-bw/2 + r2, by);
    ctx.arcTo( bw/2, by,       bw/2, by+bh, r2);
    ctx.arcTo( bw/2, by+bh,   -bw/2, by+bh, r2);
    ctx.arcTo(-bw/2, by+bh,   -bw/2, by,    r2);
    ctx.arcTo(-bw/2, by,       bw/2, by,     r2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isNorth ? 'white' : '#7c3aed';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, -20 * PDF_RENDER_SCALE);

    // Dimension below badge
    if (pxPerMm > 0) {
      const len = s.angle === 0 ? w : h;
      const dimLabel = formatMm(len / pxPerMm);
      ctx.font = `${11 * PDF_RENDER_SCALE}px system-ui`;
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dimLabel, 0, s.dimOffset);
    }

    ctx.restore();
  }

  ctx.restore();
}

function redraw(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap | null,
  calLine: CalibrationLine | null,
  currentPage: number,
  lines: LineMeasure[],
  selectedId: string | null,
  pxPerMm: number,
  activeChain: { points: Pt[]; cursor: Pt } | null,
  calDrag: { p1: Pt; p2: Pt } | null,
  roomBox: RoomBox | null,
  roomDrag: { p1: Pt; p2: Pt } | null,
) {
  const { width: W, height: H } = ctx.canvas;
  ctx.clearRect(0, 0, W, H);
  if (bitmap) ctx.drawImage(bitmap, 0, 0, W, H);

  // Room bounding box
  if (roomBox) drawRoomBox(ctx, roomBox, pxPerMm);

  // Room drag preview
  if (roomDrag) {
    ctx.save();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1.5 * PDF_RENDER_SCALE;
    ctx.setLineDash([8, 4]);
    const x1 = Math.min(roomDrag.p1.x, roomDrag.p2.x);
    const y1 = Math.min(roomDrag.p1.y, roomDrag.p2.y);
    const w2  = Math.abs(roomDrag.p2.x - roomDrag.p1.x);
    const h2  = Math.abs(roomDrag.p2.y - roomDrag.p1.y);
    ctx.strokeRect(x1, y1, w2, h2);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Calibration reference line
  if (calLine && calLine.pageNum === currentPage) {
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(calLine.p1.x, calLine.p1.y);
    ctx.lineTo(calLine.p2.x, calLine.p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const p of [calLine.p1, calLine.p2]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }
    ctx.restore();
  }

  // Committed measurements
  for (const ln of lines) {
    if (ln.pageNum !== currentPage) continue;
    const sel = ln.id === selectedId;
    const label = pxPerMm ? formatMm(ln.lengthMm) : null;
    drawPolyMeasure(
      ctx, ln.points, label,
      sel ? '#7c3aed' : '#2563eb',
      sel ? 2.5 * PDF_RENDER_SCALE : 1.5 * PDF_RENDER_SCALE,
    );
  }

  // Calibration drag preview
  if (calDrag) {
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(calDrag.p1.x, calDrag.p1.y);
    ctx.lineTo(calDrag.p2.x, calDrag.p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Active polyline chain
  if (activeChain && activeChain.points.length > 0) {
    const { points, cursor } = activeChain;

    if (points.length >= 2) {
      drawPolyMeasure(ctx, points, null, '#2563eb', 1.5 * PDF_RENDER_SCALE);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 4 * PDF_RENDER_SCALE, 0, Math.PI * 2);
      ctx.fillStyle = '#2563eb';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5 * PDF_RENDER_SCALE;
    ctx.setLineDash([8 * PDF_RENDER_SCALE, 4 * PDF_RENDER_SCALE]);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(cursor.x, cursor.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Snap ring
    const SNAP_THRESHOLD = 14 * PDF_RENDER_SCALE;
    const pageEndpts = lines.filter(ln => ln.pageNum === currentPage).flatMap(ln => ln.points);
    const snapTarget = pageEndpts.find(p => ptDist(cursor, p) < SNAP_THRESHOLD);
    if (snapTarget) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(snapTarget.x, snapTarget.y, 10 * PDF_RENDER_SCALE, 0, Math.PI * 2);
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2 * PDF_RENDER_SCALE;
      ctx.stroke();
      ctx.restore();
    }

    // HUD
    if (pxPerMm > 0) {
      const lastPt = points[points.length - 1];
      const segPx = ptDist(lastPt, cursor);
      if (segPx > 5) {
        const segMm   = segPx / pxPerMm;
        const totalMm = (totalPolyLen(points) + segPx) / pxPerMm;
        const hudText = points.length >= 2
          ? `+${formatMm(segMm)}  ·  total ${formatMm(totalMm)}`
          : formatMm(segMm);
        drawHud(ctx, cursor, hudText);
      }
    }
  }
}

// ── Link helpers ──────────────────────────────────────────────────────────────

interface LinkOption { value: string; label: string; group: string }

function buildLinkOptions(project: ReturnType<typeof useSaunaMaterials>['project']): LinkOption[] {
  const opts: LinkOption[] = [];

  opts.push({ group: 'Room & walls', value: 'room.length',        label: 'N/S wall length' });
  opts.push({ group: 'Room & walls', value: 'room.width',         label: 'E/W wall width' });
  opts.push({ group: 'Room & walls', value: 'room.ceilingHeight', label: 'Ceiling height (FCL)' });

  if (project.heaterZone) {
    opts.push({ group: 'Heater zone', value: 'heater.width',  label: 'Heater zone: width' });
    opts.push({ group: 'Heater zone', value: 'heater.height', label: 'Heater zone: height' });
  }

  for (const c of project.columns ?? []) {
    const lbl = `Column (${c.wall})`;
    opts.push({ group: 'Columns', value: `column.${c.id}.width`,  label: `${lbl}: Width` });
    opts.push({ group: 'Columns', value: `column.${c.id}.depth`,  label: `${lbl}: Depth` });
    opts.push({ group: 'Columns', value: `column.${c.id}.height`, label: `${lbl}: Height` });
  }

  for (const b of project.benches) {
    const lbl = `${b.tier[0].toUpperCase()}${b.tier.slice(1)} bench (${b.wall})`;
    opts.push({ group: 'Benches', value: `bench.${b.id}.length`,    label: `${lbl}: Length` });
    opts.push({ group: 'Benches', value: `bench.${b.id}.depth`,     label: `${lbl}: Depth` });
    opts.push({ group: 'Benches', value: `bench.${b.id}.topHeight`, label: `${lbl}: Top height` });
    if (b.hasBackrest) {
      opts.push({ group: 'Benches', value: `bench.${b.id}.backrestHeight`, label: `${lbl}: Backrest height` });
    }
  }

  for (const o of project.openings) {
    const lbl = `${o.type[0].toUpperCase()}${o.type.slice(1)} (${o.wall})`;
    opts.push({ group: 'Openings', value: `opening.${o.id}.width`,  label: `${lbl}: Width` });
    opts.push({ group: 'Openings', value: `opening.${o.id}.height`, label: `${lbl}: Height` });
  }

  return opts;
}

function applyToProject(
  dispatch: ReturnType<typeof useSaunaMaterials>['dispatchProject'],
  project: ReturnType<typeof useSaunaMaterials>['project'],
  value: string,
  mm: number,
) {
  const parts   = value.split('.');
  const kind    = parts[0];
  const rounded = Math.round(mm);
  if (kind === 'room')    dispatch({ type: 'UPDATE_ROOM',    patch: { [parts[1]]: rounded } });
  if (kind === 'bench')   dispatch({ type: 'UPDATE_BENCH',   id: parts[1], patch: { [parts[2]]: rounded } });
  if (kind === 'opening') dispatch({ type: 'UPDATE_OPENING', id: parts[1], patch: { [parts[2]]: rounded } });
  if (kind === 'column')  dispatch({ type: 'UPDATE_COLUMN',  id: parts[1], patch: { [parts[2]]: rounded } });
  if (kind === 'heater' && project.heaterZone) {
    dispatch({ type: 'SET_HEATER', heater: { ...project.heaterZone, [parts[1]]: rounded } });
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

interface PdfViewerProps {
  file: File;
  onClose: () => void;
}

export function PdfViewer({ file, onClose }: PdfViewerProps) {
  const { project, dispatchProject } = useSaunaMaterials();

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const pdfDocRef  = useRef<any>(null);
  const bitmapRef  = useRef<ImageBitmap | null>(null);

  const calRef         = useRef<CalibrationLine | null>(null);
  const linesRef       = useRef<LineMeasure[]>([]);
  const selectedRef    = useRef<string | null>(null);
  const pageRef        = useRef(1);
  const pxPerMmRef     = useRef(0);
  const activeChainRef = useRef<{ points: Pt[]; cursor: Pt } | null>(null);
  const calDragRef     = useRef<{ p1: Pt; p2: Pt } | null>(null);
  const roomBoxRef     = useRef<RoomBox | null>(null);
  const roomDragRef    = useRef<{ p1: Pt; p2: Pt } | null>(null);

  const [pageCount,   setPageCount]   = useState(0);
  const [pageNum,     setPageNum]     = useState(1);
  const [canvasSize,  setCanvasSize]  = useState({ w: 0, h: 0 });
  const [viewZoom,    setViewZoom]    = useState(1.0);

  const [tool,         setTool]         = useState<Tool>('view');
  const [calLine,      setCalLine]      = useState<CalibrationLine | null>(null);
  const [pxPerMm,      setPxPerMm]      = useState(0);
  const [lines,        setLines]        = useState<LineMeasure[]>([]);
  const [selectedLine, setSelectedLine] = useState<LineMeasure | null>(null);
  const [annotations,  setAnnotations]  = useState<Annotation[]>([]);

  const [activeChain,  setActiveChain]  = useState<{ points: Pt[]; cursor: Pt } | null>(null);
  const [calDrag,      setCalDrag]      = useState<{ p1: Pt; p2: Pt } | null>(null);
  const calDragStart   = useRef<Pt | null>(null);

  // Room bounding box
  const [roomBox,      setRoomBox]      = useState<RoomBox | null>(null);
  const [roomDrag,     setRoomDrag]     = useState<{ p1: Pt; p2: Pt } | null>(null);
  const roomDragStart  = useRef<Pt | null>(null);

  // Calibration input
  const [showCalInput,  setShowCalInput]  = useState(false);
  const [calPxLen,      setCalPxLen]      = useState(0);
  const [calMmInput,    setCalMmInput]    = useState('');
  const [pendingCalPts, setPendingCalPts] = useState<{ p1: Pt; p2: Pt } | null>(null);

  // Link target + opening creation
  const [linkTarget,       setLinkTarget]       = useState('');
  const [showAddOpening,   setShowAddOpening]   = useState(false);
  const [openingWall,      setOpeningWall]       = useState<WallId>('north');
  const [openingType,      setOpeningType]       = useState<'door' | 'window' | 'vent'>('door');
  const [openingHeight,    setOpeningHeight]     = useState('2100');

  const linkOptions = buildLinkOptions(project);

  const lastClickRef = useRef<{ time: number; pt: Pt } | null>(null);

  // Sync refs
  calRef.current         = calLine;
  linesRef.current       = lines;
  selectedRef.current    = selectedLine?.id ?? null;
  pageRef.current        = pageNum;
  pxPerMmRef.current     = pxPerMm;
  activeChainRef.current = activeChain;
  calDragRef.current     = calDrag;
  roomBoxRef.current     = roomBox;
  roomDragRef.current    = roomDrag;

  // ── Draw ────────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    redraw(
      ctx, bitmapRef.current,
      calRef.current, pageRef.current,
      linesRef.current, selectedRef.current, pxPerMmRef.current,
      activeChainRef.current, calDragRef.current,
      roomBoxRef.current, roomDragRef.current,
    );
  }, []);

  useEffect(() => {
    draw();
  }, [draw, calLine, lines, selectedLine, pageNum, pxPerMm, activeChain, calDrag, roomBox, roomDrag]);

  // ── PDF rendering ────────────────────────────────────────────────────────────

  const renderPage = useCallback(async (num: number) => {
    const pdfDoc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdfDoc || !canvas) return;
    const page     = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const off = document.createElement('canvas');
    off.width = viewport.width;
    off.height = viewport.height;
    await page.render({ canvasContext: off.getContext('2d')!, viewport }).promise;
    bitmapRef.current = await createImageBitmap(off);
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    setCanvasSize({ w: viewport.width, h: viewport.height });
    draw();
  }, [draw]);

  useEffect(() => {
    if (pdfDocRef.current) renderPage(pageNum);
  }, [pageNum, renderPage]);

  useEffect(() => {
    (async () => {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const doc = await getDocument({ data: await file.arrayBuffer() }).promise;
      pdfDocRef.current = doc;
      setPageCount(doc.numPages);
      setPageNum(1);
      setViewZoom(1.0);
      setLines([]);
      setAnnotations([]);
      setCalLine(null);
      setPxPerMm(0);
      setSelectedLine(null);
      setActiveChain(null);
      setRoomBox(null);
      setTool('view');
      await renderPage(1);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveChain(null);
        lastClickRef.current = null;
        setRoomDrag(null);
        roomDragStart.current = null;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Canvas coords ────────────────────────────────────────────────────────────

  function canvasPt(e: React.MouseEvent<HTMLCanvasElement>): Pt {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    };
  }

  function snapAndConstrain(raw: Pt, e: React.MouseEvent<HTMLCanvasElement>): Pt {
    const SNAP_PX = 14 * PDF_RENDER_SCALE;
    const pageEndpts = linesRef.current
      .filter(ln => ln.pageNum === pageRef.current)
      .flatMap(ln => ln.points);
    const snap = pageEndpts.find(p => ptDist(raw, p) < SNAP_PX);
    if (snap) return snap;
    const chain = activeChainRef.current;
    if (e.shiftKey && chain && chain.points.length > 0) {
      const last = chain.points[chain.points.length - 1];
      const dx = Math.abs(raw.x - last.x);
      const dy = Math.abs(raw.y - last.y);
      return dx >= dy ? { x: raw.x, y: last.y } : { x: last.x, y: raw.y };
    }
    return raw;
  }

  // ── Finish chain ─────────────────────────────────────────────────────────────

  function finishChain(pts: Pt[]) {
    if (pts.length < 2) { setActiveChain(null); return; }
    const ln: LineMeasure = {
      id: crypto.randomUUID(),
      pageNum,
      points: pts,
      lengthMm: pxPerMm ? totalPolyLen(pts) / pxPerMm : 0,
    };
    setLines(prev => [...prev, ln]);
    setSelectedLine(ln);
    setLinkTarget('');
    setShowAddOpening(false);
    setActiveChain(null);
    lastClickRef.current = null;
  }

  // ── Room helpers ─────────────────────────────────────────────────────────────

  function roomWallMm(box: RoomBox, side: 'horizontal' | 'vertical') {
    if (!pxPerMm) return null;
    const w = Math.abs(box.p2.x - box.p1.x);
    const h = Math.abs(box.p2.y - box.p1.y);
    return side === 'horizontal' ? w / pxPerMm : h / pxPerMm;
  }

  function applyRoomBox(box: RoomBox) {
    if (!pxPerMm) return;
    const w = Math.abs(box.p2.x - box.p1.x) / pxPerMm;
    const h = Math.abs(box.p2.y - box.p1.y) / pxPerMm;
    // N/S walls run along the horizontal axis, E/W along vertical
    const northIsHorizontal = box.northSide === 'top' || box.northSide === 'bottom';
    const length = Math.round(northIsHorizontal ? w : h);
    const width  = Math.round(northIsHorizontal ? h : w);
    dispatchProject({ type: 'UPDATE_ROOM', patch: { length, width } });
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────────

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pt = canvasPt(e);

    if (tool === 'calibrate') {
      calDragStart.current = pt;
      setCalDrag({ p1: pt, p2: pt });
      return;
    }

    if (tool === 'room') {
      roomDragStart.current = pt;
      setRoomDrag({ p1: pt, p2: pt });
      return;
    }

    if (tool === 'view') {
      const THRESHOLD = 10 * PDF_RENDER_SCALE;
      const hit = lines
        .filter(ln => ln.pageNum === pageNum)
        .find(ln => polyHitDist(pt.x, pt.y, ln.points) < THRESHOLD);
      setSelectedLine(hit ?? null);
      setLinkTarget('');
      setShowAddOpening(false);
      return;
    }

    if (tool === 'line') {
      const chain  = activeChainRef.current;
      const addPt  = chain ? chain.cursor : snapAndConstrain(pt, e);
      const now    = performance.now();
      const last   = lastClickRef.current;
      if (last && now - last.time < DBL_CLICK_MS && ptDist(addPt, last.pt) < DBL_CLICK_PX) {
        lastClickRef.current = null;
        if (chain && chain.points.length >= 2) finishChain(chain.points);
        else setActiveChain(null);
        return;
      }
      lastClickRef.current = { time: now, pt: addPt };
      setActiveChain(prev =>
        prev
          ? { ...prev, points: [...prev.points, addPt], cursor: addPt }
          : { points: [addPt], cursor: addPt }
      );
    }
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const raw = canvasPt(e);

    if (tool === 'calibrate' && calDragStart.current) {
      setCalDrag({ p1: calDragStart.current, p2: raw });
      return;
    }

    if (tool === 'room' && roomDragStart.current) {
      setRoomDrag({ p1: roomDragStart.current, p2: raw });
      return;
    }

    if (tool === 'line') {
      const pt = snapAndConstrain(raw, e);
      setActiveChain(prev => prev ? { ...prev, cursor: pt } : null);
    }
  }

  function onMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (tool === 'calibrate' && calDragStart.current) {
      const p2 = canvasPt(e);
      const p1 = calDragStart.current;
      calDragStart.current = null;
      setCalDrag(null);
      const len = ptDist(p1, p2);
      if (len < 10) return;
      setPendingCalPts({ p1, p2 });
      setCalPxLen(len);
      setCalMmInput('');
      setShowCalInput(true);
      setCalLine({ p1, p2, pageNum, pxPerMm: 0 });
      return;
    }

    if (tool === 'room' && roomDragStart.current) {
      const p2 = canvasPt(e);
      const p1 = roomDragStart.current;
      roomDragStart.current = null;
      setRoomDrag(null);
      if (Math.abs(p2.x - p1.x) < 20 || Math.abs(p2.y - p1.y) < 20) return;
      setRoomBox({ p1, p2, northSide: 'top' });
      switchTool('view');
    }
  }

  function confirmCal() {
    const mm = parseFloat(calMmInput);
    if (!mm || !pendingCalPts || calPxLen === 0) return;
    const ppm = calPxLen / mm;
    setPxPerMm(ppm);
    setCalLine({ ...pendingCalPts, pageNum, pxPerMm: ppm });
    setLines(prev => prev.map(ln => ({ ...ln, lengthMm: totalPolyLen(ln.points) / ppm })));
    setShowCalInput(false);
    setTool('line');
  }

  function applyLink() {
    if (!selectedLine || !linkTarget) return;
    const label = linkOptions.find(o => o.value === linkTarget)?.label ?? linkTarget;
    applyToProject(dispatchProject, project, linkTarget, selectedLine.lengthMm);
    setAnnotations(prev => [
      ...prev.filter(a => a.targetValue !== linkTarget),
      { id: crypto.randomUUID(), lineId: selectedLine.id, mm: Math.round(selectedLine.lengthMm), targetValue: linkTarget, targetLabel: label },
    ]);
    setLinkTarget('');
  }

  function createOpening() {
    if (!selectedLine) return;
    dispatchProject({
      type: 'ADD_OPENING',
      opening: {
        id: crypto.randomUUID(),
        type: openingType,
        wall: openingWall,
        shape: 'rectangle',
        width:  Math.round(selectedLine.lengthMm),
        height: parseInt(openingHeight) || 2100,
      },
    });
    setAnnotations(prev => [...prev, {
      id: crypto.randomUUID(),
      lineId: selectedLine.id,
      mm: Math.round(selectedLine.lengthMm),
      targetValue: `opening.new.${openingWall}`,
      targetLabel: `New ${openingType} (${openingWall}) — ${Math.round(selectedLine.lengthMm)}mm`,
    }]);
    setShowAddOpening(false);
  }

  function removeLine(id: string) {
    setLines(prev => prev.filter(ln => ln.id !== id));
    setAnnotations(prev => prev.filter(a => a.lineId !== id));
    if (selectedLine?.id === id) setSelectedLine(null);
  }

  function switchTool(next: Tool) {
    setTool(next);
    setActiveChain(null);
    lastClickRef.current = null;
    setRoomDrag(null);
    roomDragStart.current = null;
  }

  const chainInProgress = tool === 'line' && !!activeChain && activeChain.points.length >= 1;
  const chainLen = activeChain ? totalPolyLen(activeChain.points) : 0;
  const pageLines = lines.filter(ln => ln.pageNum === pageNum);
  const zoomPct   = `${Math.round(viewZoom * 100)}%`;

  // Room box dimensions for panel display
  const roomW = roomBox ? roomWallMm(roomBox, 'horizontal') : null;
  const roomH = roomBox ? roomWallMm(roomBox, 'vertical')   : null;
  const northIsHoriz = roomBox ? (roomBox.northSide === 'top' || roomBox.northSide === 'bottom') : true;

  return (
    <div className="h-full flex flex-col bg-background">

      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-gray-2 bg-card">
        <span className="text-sm font-semibold truncate max-w-44 shrink-0">{file.name}</span>

        {/* Page nav */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum === 1}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-1">
            {pageNum} <span className="opacity-50">/ {pageCount}</span>
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPageNum(p => Math.min(pageCount, p + 1))} disabled={pageNum === pageCount}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="w-px h-5 bg-gray-2 mx-0.5 shrink-0" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">{zoomPct}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewZoom(z => Math.min(5, +(z + 0.25).toFixed(2)))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="w-px h-5 bg-gray-2 mx-0.5 shrink-0" />

        <Button
          variant={tool === 'calibrate' ? 'default' : 'outline'}
          size="sm" className="h-7 gap-1.5 text-xs shrink-0"
          onClick={() => switchTool(tool === 'calibrate' ? 'view' : 'calibrate')}
        >
          <Ruler className="h-3.5 w-3.5" />
          Set scale
          {pxPerMm ? <span className="text-[10px] ml-0.5 opacity-80">✓</span> : null}
        </Button>

        <Button
          variant={tool === 'room' ? 'default' : 'outline'}
          size="sm" className="h-7 gap-1.5 text-xs shrink-0"
          onClick={() => switchTool(tool === 'room' ? 'view' : 'room')}
          title="Draw room boundary and label walls N/E/S/W"
        >
          <Square className="h-3.5 w-3.5" />
          Room
        </Button>

        <Button
          variant={tool === 'line' ? 'default' : 'outline'}
          size="sm" className="h-7 gap-1.5 text-xs shrink-0"
          disabled={!pxPerMm}
          onClick={() => switchTool(tool === 'line' ? 'view' : 'line')}
          title={!pxPerMm ? 'Set scale first' : undefined}
        >
          <Minus className="h-3.5 w-3.5" />
          Draw line
        </Button>

        {chainInProgress && (
          <>
            <div className="w-px h-5 bg-gray-2 mx-0.5 shrink-0" />
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs bg-green-600 hover:bg-green-700 shrink-0"
              onClick={() => finishChain(activeChain!.points)}
              disabled={activeChain!.points.length < 2}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Finish
              {pxPerMm && chainLen > 0 ? <span className="ml-1 opacity-80">{formatMm(chainLen / pxPerMm)}</span> : null}
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-7 text-xs text-muted-foreground shrink-0"
              onClick={() => { setActiveChain(null); lastClickRef.current = null; }}
            >
              Cancel
            </Button>
          </>
        )}

        <div className="flex-1" />

        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground shrink-0" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>

      {/* Calibration input strip */}
      {showCalInput && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-2 text-sm">
          <span className="font-medium text-amber-800">What is the real length of this line?</span>
          <div className="relative w-32">
            <Input
              type="number" autoFocus placeholder="5548"
              value={calMmInput}
              onChange={e => setCalMmInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmCal()}
              className="h-7 pr-9 text-sm"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
          </div>
          <Button size="sm" className="h-7" onClick={confirmCal} disabled={!calMmInput}>Confirm</Button>
          <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={() => { setShowCalInput(false); setCalLine(null); }}>Cancel</Button>
          <span className="text-xs text-muted-foreground ml-auto">{Math.round(calPxLen)}px drawn</span>
        </div>
      )}

      {/* Tool hints */}
      {!showCalInput && tool !== 'view' && (
        <div className={`shrink-0 px-4 py-1.5 text-xs border-b ${
          tool === 'calibrate' ? 'bg-amber-50 text-amber-700 border-amber-2' :
          tool === 'room'      ? 'bg-purple-50 text-purple-700 border-purple-2' :
                                 'bg-blue-50 text-blue-700 border-blue-2'
        }`}>
          {tool === 'calibrate' ? 'Drag along a known dimension to set the scale.' :
           tool === 'room'      ? 'Drag to draw the room bounding box, then label each side N / E / S / W in the panel.' :
           chainInProgress      ? `${activeChain!.points.length} points — keep clicking to add segments, double-click or Finish to complete.` :
                                  'Click to place your first point, then click to add connected segments.'}
        </div>
      )}

      {/* Canvas + right panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto bg-neutral-700">
          <div style={{
            width: canvasSize.w * viewZoom,
            height: canvasSize.h * viewZoom,
            minWidth: '100%',
            minHeight: '100%',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}>
            <canvas
              ref={canvasRef}
              style={{
                transformOrigin: 'top left',
                transform: `scale(${viewZoom})`,
                display: 'block',
                cursor: tool === 'view' ? 'default' : tool === 'room' ? 'crosshair' : 'crosshair',
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => {
                if (tool === 'line' && activeChain) {
                  setActiveChain(prev => prev ? { ...prev, cursor: prev.points[prev.points.length - 1] } : null);
                }
                if (tool === 'calibrate' && calDragStart.current) {
                  calDragStart.current = null;
                  setCalDrag(null);
                }
                if (tool === 'room' && roomDragStart.current) {
                  roomDragStart.current = null;
                  setRoomDrag(null);
                }
              }}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 border-l border-gray-2 bg-card overflow-y-auto flex flex-col">

          {/* ── Room box panel ── */}
          {roomBox ? (
            <div className="shrink-0 border-b border-gray-2 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Room boundary</p>

              {pxPerMm ? (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      {northIsHoriz ? 'N/S length' : 'N/S length'}
                    </p>
                    <p className="text-base font-bold text-primary">
                      {formatMm(northIsHoriz ? (roomW ?? 0) : (roomH ?? 0))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      {northIsHoriz ? 'E/W width' : 'E/W width'}
                    </p>
                    <p className="text-base font-bold text-primary">
                      {formatMm(northIsHoriz ? (roomH ?? 0) : (roomW ?? 0))}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600">Set scale to see dimensions</p>
              )}

              {/* North wall picker */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Which side is North?</p>
                <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
                  {/* Top */}
                  <div />
                  <button
                    type="button"
                    onClick={() => setRoomBox(b => b ? { ...b, northSide: 'top' } : b)}
                    className={`rounded text-[11px] font-bold py-1 transition-colors ${roomBox.northSide === 'top' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'}`}
                  >N</button>
                  <div />
                  {/* Left / Right */}
                  <button
                    type="button"
                    onClick={() => setRoomBox(b => b ? { ...b, northSide: 'left' } : b)}
                    className={`rounded text-[11px] font-bold py-1 transition-colors ${roomBox.northSide === 'left' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'}`}
                  >W</button>
                  <div className="flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoomBox(b => b ? { ...b, northSide: 'right' } : b)}
                    className={`rounded text-[11px] font-bold py-1 transition-colors ${roomBox.northSide === 'right' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'}`}
                  >E</button>
                  {/* Bottom */}
                  <div />
                  <button
                    type="button"
                    onClick={() => setRoomBox(b => b ? { ...b, northSide: 'bottom' } : b)}
                    className={`rounded text-[11px] font-bold py-1 transition-colors ${roomBox.northSide === 'bottom' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'}`}
                  >S</button>
                  <div />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm" className="flex-1 h-7 text-xs gap-1.5"
                  disabled={!pxPerMm}
                  onClick={() => applyRoomBox(roomBox)}
                  title={!pxPerMm ? 'Set scale first' : undefined}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Apply to room
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => setRoomBox(null)}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          {/* ── Measurement / link panel ── */}
          <div className="p-4 border-b border-gray-2">
            {!selectedLine ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How to use</p>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary font-bold shrink-0">1</span>Click <strong>Set scale</strong>, drag a known dimension</li>
                  <li className="flex gap-2"><span className="text-primary font-bold shrink-0">2</span>Click <strong>Room</strong>, drag the room bounding box, label N/E/S/W</li>
                  <li className="flex gap-2"><span className="text-primary font-bold shrink-0">3</span>Use <strong>Draw line</strong> for openings and feature measurements</li>
                  <li className="flex gap-2"><span className="text-primary font-bold shrink-0">4</span>Click any measurement to link or create an opening</li>
                </ol>
                {pxPerMm ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg">
                    <span>✓</span><span>Scale calibrated</span>
                  </div>
                ) : null}
                {pageLines.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {pageLines.length} measurement{pageLines.length !== 1 ? 's' : ''} on this page
                    {lines.length > pageLines.length ? ` · ${lines.length} total` : ''}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selected</p>
                  <button type="button" onClick={() => removeLine(selectedLine.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-primary">{formatMm(selectedLine.lengthMm)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedLine.points.length - 1} segment{selectedLine.points.length !== 2 ? 's' : ''} · page {selectedLine.pageNum}
                  </p>
                </div>

                {/* Link to existing field */}
                {!showAddOpening && (
                  <>
                    <Select value={linkTarget} onValueChange={setLinkTarget}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Link to take-off field…" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(
                          linkOptions.reduce<Record<string, LinkOption[]>>((acc, o) => {
                            (acc[o.group] ??= []).push(o);
                            return acc;
                          }, {})
                        ).map(([group, items]) => (
                          <SelectGroup key={group}>
                            <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">{group}</SelectLabel>
                            {items.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="w-full gap-1.5" disabled={!linkTarget} onClick={applyLink}>
                      <Link2 className="h-3.5 w-3.5" />
                      Apply to take-off
                    </Button>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-gray-2" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">or</span>
                      <div className="flex-1 h-px bg-gray-2" />
                    </div>
                    <Button
                      size="sm" variant="outline" className="w-full gap-1.5 text-xs"
                      onClick={() => setShowAddOpening(true)}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Create new opening
                    </Button>
                  </>
                )}

                {/* Create opening form */}
                {showAddOpening && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium">New opening — <span className="text-primary">{formatMm(selectedLine.lengthMm)}</span> wide</p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Wall</p>
                        <Select value={openingWall} onValueChange={v => setOpeningWall(v as WallId)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(['north','east','south','west'] as WallId[]).map(w => (
                              <SelectItem key={w} value={w} className="text-xs capitalize">{w}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Type</p>
                        <Select value={openingType} onValueChange={v => setOpeningType(v as 'door' | 'window' | 'vent')}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="door"   className="text-xs">Door</SelectItem>
                            <SelectItem value="window" className="text-xs">Window</SelectItem>
                            <SelectItem value="vent"   className="text-xs">Vent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Height (mm)</p>
                      <Input
                        type="number" className="h-7 text-xs"
                        value={openingHeight}
                        onChange={e => setOpeningHeight(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-7 text-xs gap-1.5" onClick={createOpening}>
                        <PlusCircle className="h-3.5 w-3.5" />
                        Create opening
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setShowAddOpening(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Linked annotations */}
          {annotations.length > 0 && (
            <div className="shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-3 pb-2">Linked ({annotations.length})</p>
              <div className="divide-y divide-gray-1">
                {annotations.map(ann => (
                  <div key={ann.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ann.targetLabel}</p>
                      <p className="text-xs text-muted-foreground">{formatMm(ann.mm)}</p>
                    </div>
                    <button type="button" onClick={() => setAnnotations(prev => prev.filter(a => a.id !== ann.id))} className="text-muted-foreground hover:text-foreground shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All measurements */}
          {lines.length > 0 && (
            <div className="shrink-0 mt-auto border-t border-gray-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-3 pb-2">All measurements ({lines.length})</p>
              <div className="divide-y divide-gray-1 pb-2">
                {lines.map(ln => (
                  <button
                    key={ln.id} type="button"
                    onClick={() => { setPageNum(ln.pageNum); setSelectedLine(ln); setLinkTarget(''); setShowAddOpening(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-muted/50 ${selectedLine?.id === ln.id ? 'bg-purple-1' : ''}`}
                  >
                    <Minus className={`h-3 w-3 shrink-0 ${selectedLine?.id === ln.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`flex-1 text-xs font-medium ${selectedLine?.id === ln.id ? 'text-primary' : ''}`}>
                      {formatMm(ln.lengthMm)}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {ln.points.length - 1}seg · p.{ln.pageNum}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
