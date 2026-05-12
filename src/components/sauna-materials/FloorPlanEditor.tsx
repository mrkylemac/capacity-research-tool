'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  benchTransform,
  columnTransform,
  heaterTransform,
  openingTransform,
  type ItemTransform,
} from '@/lib/saunaMaterials/diagramLayout';
import {
  clampRectToRoom,
  screenPointToRoomMm,
  snapToGrid,
  snapToWall,
} from '@/lib/saunaMaterials/floorPlanCoords';
import { useGenerateId, useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type {
  Bench,
  Column,
  HeaterZone,
  Opening,
  WallId,
} from '@/types/saunaMaterials';
import {
  FloorPlanEditorToolbar,
  type EditorTool,
} from './FloorPlanEditorToolbar';
import {
  FloorPlanBackgroundLayer,
  FloorPlanBackgroundPanel,
  usePersistedBackground,
} from './FloorPlanBackground';

const GRID_MM = 50;
const SNAP_THRESHOLD_MM = 50;
const RESIZE_HANDLE_PX = 9;
const SELECTION_STROKE_PX = 1.5;
const MIN_DIM_MM = 100;

type ItemKind = 'opening' | 'column' | 'bench' | 'heater';

interface SelectedRef {
  kind: ItemKind;
  id: string;
}

type DragMode = 'move' | 'resize-min' | 'resize-max';

interface DragState {
  ref: SelectedRef;
  mode: DragMode;
  pointerId: number;
  /** Pointer position at drag start, in room mm. */
  startMm: { x: number; y: number };
  /** Item snapshot at drag start. */
  snapshot: ItemSnapshot;
}

type ItemSnapshot =
  | { kind: 'opening'; item: Opening }
  | { kind: 'column'; item: Column }
  | { kind: 'bench'; item: Bench }
  | { kind: 'heater'; item: HeaterZone };

const WALL_ORIENTATION: Record<WallId, 'horizontal' | 'vertical'> = {
  north: 'horizontal',
  south: 'horizontal',
  east: 'vertical',
  west: 'vertical',
};

const COLOURS = {
  bench: 'var(--purple-3)',
  benchAlt: 'var(--purple-2)',
  heater: 'var(--amber-3)',
  columnTile: 'var(--amber-4)',
  columnTimber: 'var(--gray-3)',
  door: 'var(--red-4)',
  window: 'var(--sky-4)',
  vent: 'var(--amber-4)',
  selection: 'var(--purple-4)',
};

export function FloorPlanEditor() {
  const { project, dispatchProject } = useSaunaMaterials();
  const genId = useGenerateId();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { length: roomLen, width: roomWid } = project.room;

  const [tool, setTool] = useState<EditorTool>('select');
  const [selected, setSelected] = useState<SelectedRef | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [backgroundPanelOpen, setBackgroundPanelOpen] = useState(false);
  const [background, setBackground] = usePersistedBackground();

  // Resolve the selected item to its current data.
  const selectedItem = useMemo<ItemSnapshot | null>(() => {
    if (!selected) return null;
    if (selected.kind === 'opening') {
      const item = project.openings.find(o => o.id === selected.id);
      return item ? { kind: 'opening', item } : null;
    }
    if (selected.kind === 'column') {
      const item = project.columns.find(c => c.id === selected.id);
      return item ? { kind: 'column', item } : null;
    }
    if (selected.kind === 'bench') {
      const item = project.benches.find(b => b.id === selected.id);
      return item ? { kind: 'bench', item } : null;
    }
    if (selected.kind === 'heater' && project.heaterZone) {
      return { kind: 'heater', item: project.heaterZone };
    }
    return null;
  }, [selected, project]);

  // Drag handling ──────────────────────────────────────────────────────────
  const beginDrag = (
    ref: SelectedRef,
    mode: DragMode,
    e: ReactPointerEvent<SVGElement>
  ) => {
    if (!svgRef.current) return;
    const startMm = screenPointToRoomMm(svgRef.current, e.clientX, e.clientY);
    if (!startMm) return;
    const snap = snapshotItem(ref, project.openings, project.columns, project.benches, project.heaterZone);
    if (!snap) return;
    e.stopPropagation();
    svgRef.current.setPointerCapture(e.pointerId);
    setSelected(ref);
    setDrag({ ref, mode, pointerId: e.pointerId, startMm, snapshot: snap });
  };

  const onSvgPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag || !svgRef.current) return;
    const pt = screenPointToRoomMm(svgRef.current, e.clientX, e.clientY);
    if (!pt) return;
    const dx = pt.x - drag.startMm.x;
    const dy = pt.y - drag.startMm.y;
    applyDrag(drag, dx, dy);
  };

  const onSvgPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag && svgRef.current) {
      try {
        svgRef.current.releasePointerCapture(drag.pointerId);
      } catch {
        // ignore
      }
    }
    setDrag(null);
    void e;
  };

  const applyDrag = (d: DragState, rawDx: number, rawDy: number) => {
    if (d.snapshot.kind === 'opening') return applyOpeningDrag(d, d.snapshot.item, rawDx, rawDy);
    if (d.snapshot.kind === 'column') return applyColumnDrag(d, d.snapshot.item, rawDx, rawDy);
    if (d.snapshot.kind === 'bench') return applyBenchDrag(d, d.snapshot.item, rawDx, rawDy);
    if (d.snapshot.kind === 'heater') return applyHeaterDrag(d, d.snapshot.item, rawDx, rawDy);
  };

  // ── Item type–specific drag logic ─────────────────────────────────────────
  const applyOpeningDrag = (d: DragState, o: Opening, dx: number, dy: number) => {
    if (o.x !== undefined && o.y !== undefined) {
      // Free-position move/resize.
      const next = freePositionPatch(d, o, dx, dy, o.width, 60, roomLen, roomWid);
      if (next) dispatchProject({ type: 'UPDATE_OPENING', id: o.id, patch: next });
      return;
    }
    // Wall-anchored move/resize. Only the along-wall component matters.
    const along = wallAlongComponent(o.wall, dx, dy);
    const wallLen = wallLengthFor(o.wall, roomLen, roomWid);
    const baseOffset = o.startOffset ?? Math.max(0, Math.round((wallLen - o.width) / 2));

    if (d.mode === 'move') {
      let next = baseOffset + along;
      next = applySnap(next, wallLen - o.width);
      const clamped = clamp(next, 0, Math.max(0, wallLen - o.width));
      dispatchProject({ type: 'UPDATE_OPENING', id: o.id, patch: { startOffset: clamped } });
    } else if (d.mode === 'resize-min') {
      // Drag leading edge: offset += Δ, width -= Δ.
      const rawWidth = o.width - along;
      const newWidth = Math.max(MIN_DIM_MM, applySnapPure(rawWidth, gridEnabled));
      const widthDelta = o.width - newWidth;
      const newOffset = clamp(baseOffset + widthDelta, 0, Math.max(0, wallLen - newWidth));
      dispatchProject({ type: 'UPDATE_OPENING', id: o.id, patch: { startOffset: newOffset, width: newWidth } });
    } else {
      // resize-max: width += Δ.
      const newWidth = Math.max(MIN_DIM_MM, applySnapPure(o.width + along, gridEnabled));
      const clampedWidth = Math.min(newWidth, wallLen - baseOffset);
      dispatchProject({ type: 'UPDATE_OPENING', id: o.id, patch: { width: clampedWidth } });
    }
  };

  const applyColumnDrag = (d: DragState, c: Column, dx: number, dy: number) => {
    if (c.wall === 'freestanding' || (c.x !== undefined && c.y !== undefined)) {
      const next = freePositionPatch(d, c, dx, dy, c.width, c.depth, roomLen, roomWid);
      if (next) dispatchProject({ type: 'UPDATE_COLUMN', id: c.id, patch: next });
      return;
    }
    const along = wallAlongComponent(c.wall, dx, dy);
    const wallLen = wallLengthFor(c.wall, roomLen, roomWid);
    const baseOffset = c.startOffset ?? Math.max(0, Math.round((wallLen - c.width) / 2));

    if (d.mode === 'move') {
      let next = baseOffset + along;
      next = applySnap(next, wallLen - c.width);
      const clamped = clamp(next, 0, Math.max(0, wallLen - c.width));
      dispatchProject({ type: 'UPDATE_COLUMN', id: c.id, patch: { startOffset: clamped } });
    } else if (d.mode === 'resize-min') {
      const newWidth = Math.max(MIN_DIM_MM, applySnapPure(c.width - along, gridEnabled));
      const widthDelta = c.width - newWidth;
      const newOffset = clamp(baseOffset + widthDelta, 0, Math.max(0, wallLen - newWidth));
      dispatchProject({ type: 'UPDATE_COLUMN', id: c.id, patch: { startOffset: newOffset, width: newWidth } });
    } else {
      const newWidth = Math.max(MIN_DIM_MM, applySnapPure(c.width + along, gridEnabled));
      const clampedWidth = Math.min(newWidth, wallLen - baseOffset);
      dispatchProject({ type: 'UPDATE_COLUMN', id: c.id, patch: { width: clampedWidth } });
    }
  };

  const applyBenchDrag = (d: DragState, b: Bench, dx: number, dy: number) => {
    if (b.x !== undefined && b.y !== undefined) {
      const next = freePositionPatch(d, b, dx, dy, b.length, b.depth, roomLen, roomWid);
      if (next) {
        // For benches, "width" in our patch maps to `length` on Bench.
        const patch: Partial<Bench> = {};
        if ('x' in next) patch.x = next.x;
        if ('y' in next) patch.y = next.y;
        if (next.width !== undefined) patch.length = next.width;
        if (next.depth !== undefined) patch.depth = next.depth;
        dispatchProject({ type: 'UPDATE_BENCH', id: b.id, patch });
      }
      return;
    }
    const along = wallAlongComponent(b.wall, dx, dy);
    const wallLen = wallLengthFor(b.wall, roomLen, roomWid);
    const baseOffset = b.startOffset ?? Math.max(0, Math.round((wallLen - b.length) / 2));

    if (d.mode === 'move') {
      let next = baseOffset + along;
      next = applySnap(next, wallLen - b.length);
      const clamped = clamp(next, 0, Math.max(0, wallLen - b.length));
      dispatchProject({ type: 'UPDATE_BENCH', id: b.id, patch: { startOffset: clamped } });
    } else if (d.mode === 'resize-min') {
      const newLen = Math.max(MIN_DIM_MM, applySnapPure(b.length - along, gridEnabled));
      const widthDelta = b.length - newLen;
      const newOffset = clamp(baseOffset + widthDelta, 0, Math.max(0, wallLen - newLen));
      dispatchProject({ type: 'UPDATE_BENCH', id: b.id, patch: { startOffset: newOffset, length: newLen } });
    } else {
      const newLen = Math.max(MIN_DIM_MM, applySnapPure(b.length + along, gridEnabled));
      const clampedLen = Math.min(newLen, wallLen - baseOffset);
      dispatchProject({ type: 'UPDATE_BENCH', id: b.id, patch: { length: clampedLen } });
    }
  };

  const applyHeaterDrag = (d: DragState, h: HeaterZone, dx: number, dy: number) => {
    if (h.x !== undefined && h.y !== undefined) {
      const next = freePositionPatch(d, h, dx, dy, h.width, h.depth ?? 200, roomLen, roomWid);
      if (next) {
        const patch: Partial<HeaterZone> = {};
        if ('x' in next) patch.x = next.x;
        if ('y' in next) patch.y = next.y;
        if (next.width !== undefined) patch.width = next.width;
        if (next.depth !== undefined) patch.depth = next.depth;
        dispatchProject({ type: 'SET_HEATER', heater: { ...h, ...patch } });
      }
      return;
    }
    const along = wallAlongComponent(h.wall, dx, dy);
    const wallLen = wallLengthFor(h.wall, roomLen, roomWid);
    const baseOffset = h.startOffset ?? Math.max(0, Math.round((wallLen - h.width) / 2));

    if (d.mode === 'move') {
      let next = baseOffset + along;
      next = applySnap(next, wallLen - h.width);
      const clamped = clamp(next, 0, Math.max(0, wallLen - h.width));
      dispatchProject({ type: 'SET_HEATER', heater: { ...h, startOffset: clamped } });
    } else if (d.mode === 'resize-min') {
      const newW = Math.max(MIN_DIM_MM, applySnapPure(h.width - along, gridEnabled));
      const widthDelta = h.width - newW;
      const newOffset = clamp(baseOffset + widthDelta, 0, Math.max(0, wallLen - newW));
      dispatchProject({ type: 'SET_HEATER', heater: { ...h, startOffset: newOffset, width: newW } });
    } else {
      const newW = Math.max(MIN_DIM_MM, applySnapPure(h.width + along, gridEnabled));
      const clampedW = Math.min(newW, wallLen - baseOffset);
      dispatchProject({ type: 'SET_HEATER', heater: { ...h, width: clampedW } });
    }
  };

  // Free-position move/resize helper. Returns a patch with x/y/width/depth.
  const freePositionPatch = (
    d: DragState,
    item: { x?: number; y?: number },
    dx: number,
    dy: number,
    currentWidth: number,
    currentDepth: number,
    rl: number,
    rw: number
  ): Partial<{ x: number; y: number; width: number; depth: number }> | null => {
    const origX = item.x ?? 0;
    const origY = item.y ?? 0;
    if (d.mode === 'move') {
      let x = origX + dx;
      let y = origY + dy;
      const w = currentWidth;
      const dep = currentDepth;
      if (gridEnabled) {
        x = snapToGrid(x, GRID_MM);
        y = snapToGrid(y, GRID_MM);
      }
      if (snapEnabled) {
        x = snapToWall(x, rl - w, SNAP_THRESHOLD_MM);
        y = snapToWall(y, rw - dep, SNAP_THRESHOLD_MM);
      }
      const clamped = clampRectToRoom({ x, y, width: w, depth: dep }, { length: rl, width: rw });
      return { x: clamped.x, y: clamped.y };
    }
    if (d.mode === 'resize-max') {
      const w = Math.max(MIN_DIM_MM, applySnapPure(currentWidth + dx, gridEnabled));
      const dep = Math.max(MIN_DIM_MM, applySnapPure(currentDepth + dy, gridEnabled));
      const cw = Math.min(w, rl - origX);
      const cd = Math.min(dep, rw - origY);
      return { width: cw, depth: cd };
    }
    // resize-min: NW corner — adjust x/y and width/depth so SE corner stays.
    const seX = origX + currentWidth;
    const seY = origY + currentDepth;
    let nwX = origX + dx;
    let nwY = origY + dy;
    if (gridEnabled) {
      nwX = snapToGrid(nwX, GRID_MM);
      nwY = snapToGrid(nwY, GRID_MM);
    }
    nwX = clamp(nwX, 0, seX - MIN_DIM_MM);
    nwY = clamp(nwY, 0, seY - MIN_DIM_MM);
    return { x: nwX, y: nwY, width: seX - nwX, depth: seY - nwY };
  };

  // Add-tool support ────────────────────────────────────────────────────────
  const onCanvasPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag) return;
    if (!svgRef.current) return;
    const pt = screenPointToRoomMm(svgRef.current, e.clientX, e.clientY);
    if (!pt) return;
    if (tool === 'select') {
      setSelected(null);
      return;
    }
    // Add tools
    if (tool === 'add-door') {
      addOpening('door', pt);
    } else if (tool === 'add-window') {
      addOpening('window', pt);
    } else if (tool === 'add-vent') {
      addOpening('vent', pt);
    } else if (tool === 'add-column') {
      addColumn(pt);
    } else if (tool === 'add-bench') {
      addBench(pt);
    } else if (tool === 'add-heater') {
      addHeater(pt);
    }
    setTool('select');
  };

  const addOpening = (type: Opening['type'], pt: { x: number; y: number }) => {
    const wall = nearestWall(pt, roomLen, roomWid);
    const width = type === 'door' ? 900 : type === 'window' ? 800 : 200;
    const height = type === 'door' ? 2100 : type === 'window' ? 800 : 200;
    const offset = positionAlongWall(wall, pt, width, roomLen, roomWid);
    const id = genId('opening');
    dispatchProject({
      type: 'ADD_OPENING',
      opening: {
        id, type, wall,
        shape: type === 'vent' ? 'circle' : 'rectangle',
        width, height,
        startOffset: offset,
      },
    });
    setSelected({ kind: 'opening', id });
  };

  const addColumn = (pt: { x: number; y: number }) => {
    // Free-position column.
    const w = 500;
    const d = 500;
    const id = genId('column');
    dispatchProject({
      type: 'ADD_COLUMN',
      column: {
        id, wall: 'freestanding',
        width: w, depth: d,
        height: project.room.ceilingHeight,
        finish: 'tile', extendsToCeiling: true,
        x: clamp(pt.x - w / 2, 0, Math.max(0, roomLen - w)),
        y: clamp(pt.y - d / 2, 0, Math.max(0, roomWid - d)),
      },
    });
    setSelected({ kind: 'column', id });
  };

  const addBench = (pt: { x: number; y: number }) => {
    const wall = nearestWall(pt, roomLen, roomWid);
    const wallLen = wallLengthFor(wall, roomLen, roomWid);
    const length = Math.min(1800, wallLen);
    const offset = positionAlongWall(wall, pt, length, roomLen, roomWid);
    const id = genId('bench');
    dispatchProject({
      type: 'ADD_BENCH',
      bench: {
        id, tier: 'foot', wall,
        length, depth: 600, topHeight: 750,
        hasBackrest: false, backrestHeight: 0,
        hasEndCap: 'none', closedFront: true,
        startOffset: offset,
      },
    });
    setSelected({ kind: 'bench', id });
  };

  const addHeater = (pt: { x: number; y: number }) => {
    const wall = nearestWall(pt, roomLen, roomWid);
    const width = 1200;
    const offset = positionAlongWall(wall, pt, width, roomLen, roomWid);
    dispatchProject({
      type: 'SET_HEATER',
      heater: {
        wall, width, height: project.room.ceilingHeight,
        finish: 'tile',
        startOffset: offset,
      },
    });
    setSelected({ kind: 'heater', id: 'heater' });
  };

  // Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected) return;
      // Skip when typing in inputs.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'Escape') {
        setSelected(null);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 100 : 10;
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        nudgeSelected(dx, dy);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, project]);

  const deleteSelected = () => {
    if (!selected) return;
    if (selected.kind === 'opening') dispatchProject({ type: 'REMOVE_OPENING', id: selected.id });
    else if (selected.kind === 'column') dispatchProject({ type: 'REMOVE_COLUMN', id: selected.id });
    else if (selected.kind === 'bench') dispatchProject({ type: 'REMOVE_BENCH', id: selected.id });
    else if (selected.kind === 'heater') dispatchProject({ type: 'SET_HEATER', heater: null });
    setSelected(null);
  };

  const nudgeSelected = (dx: number, dy: number) => {
    if (!selectedItem) return;
    const fakeStart: DragState = {
      ref: { kind: selectedItem.kind, id: selected!.id },
      mode: 'move',
      pointerId: -1,
      startMm: { x: 0, y: 0 },
      snapshot: selectedItem,
    };
    applyDrag(fakeStart, dx, dy);
  };

  // ── Rendering ─────────────────────────────────────────────────────────────
  const openingColour = (type: Opening['type']) =>
    type === 'door' ? COLOURS.door : type === 'window' ? COLOURS.window : COLOURS.vent;

  const screenScale = useScreenScale(svgRef);
  const handleSizeMm = RESIZE_HANDLE_PX / Math.max(screenScale, 0.001);
  const selectionStrokeMm = SELECTION_STROKE_PX / Math.max(screenScale, 0.001);

  const renderHandles = (t: ItemTransform, ref: SelectedRef, isFreePosition: boolean) => {
    const handles: Array<{ x: number; y: number; mode: DragMode }> = [];
    const cx = t.x + t.width / 2;
    const cy = t.y + t.depth / 2;
    if (isFreePosition) {
      handles.push(
        { x: t.x, y: t.y, mode: 'resize-min' },
        { x: t.x + t.width, y: t.y + t.depth, mode: 'resize-max' },
      );
    } else {
      // Edge handles in the along-wall direction. For north/south walls that's left/right;
      // for east/west walls that's top/bottom. The bbox already has width aligned with x for
      // north/south and depth aligned with y for east/west, so 'min' is at (x, cy) for N/S
      // and (cx, y) for E/W.
      const orientation = WALL_ORIENTATION[snapshotWall(ref, project)];
      if (orientation === 'horizontal') {
        handles.push(
          { x: t.x, y: cy, mode: 'resize-min' },
          { x: t.x + t.width, y: cy, mode: 'resize-max' },
        );
      } else {
        handles.push(
          { x: cx, y: t.y, mode: 'resize-min' },
          { x: cx, y: t.y + t.depth, mode: 'resize-max' },
        );
      }
    }
    return handles.map(h => (
      <rect
        key={`${h.mode}-${h.x}-${h.y}`}
        x={h.x - handleSizeMm / 2}
        y={h.y - handleSizeMm / 2}
        width={handleSizeMm}
        height={handleSizeMm}
        fill="var(--card)"
        stroke={COLOURS.selection}
        strokeWidth={selectionStrokeMm}
        style={{ cursor: 'nwse-resize' }}
        onPointerDown={e => beginDrag(ref, h.mode, e)}
      />
    ));
  };

  const isSelected = (kind: ItemKind, id: string) =>
    selected?.kind === kind && selected.id === id;

  const cursor = tool === 'select' ? 'default' : 'crosshair';

  return (
    <Card>
      <CardContent className="p-0">
        <FloorPlanEditorToolbar
          tool={tool}
          onChange={setTool}
          gridEnabled={gridEnabled}
          snapEnabled={snapEnabled}
          onToggleGrid={() => setGridEnabled(g => !g)}
          onToggleSnap={() => setSnapEnabled(s => !s)}
          onOpenBackground={() => setBackgroundPanelOpen(v => !v)}
          hasBackground={!!background}
        />
        {backgroundPanelOpen && (
          <FloorPlanBackgroundPanel
            background={background}
            onChange={setBackground}
            defaultWidthMm={roomLen}
            onClose={() => setBackgroundPanelOpen(false)}
          />
        )}
        <div ref={containerRef} className="p-3">
          <svg
            ref={svgRef}
            viewBox={`-200 -200 ${roomLen + 400} ${roomWid + 400}`}
            className="w-full h-auto select-none"
            style={{ cursor, touchAction: 'none', maxHeight: '70vh' }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onSvgPointerMove}
            onPointerUp={onSvgPointerUp}
            onPointerCancel={onSvgPointerUp}
          >
            {background && <FloorPlanBackgroundLayer background={background} />}

            {/* Grid */}
            {gridEnabled && (
              <g pointerEvents="none">
                {gridLines(roomLen, roomWid, 500)}
              </g>
            )}

            {/* Room outline */}
            <rect
              x={0}
              y={0}
              width={roomLen}
              height={roomWid}
              fill="var(--card)"
              fillOpacity={background ? 0 : 1}
              stroke="var(--gray-3)"
              strokeWidth={selectionStrokeMm * 2}
              rx={8}
            />

            {/* Wall labels — use mm-scaled font so they stay constant on screen */}
            <WallLabels roomLen={roomLen} roomWid={roomWid} scale={screenScale} />

            {/* Items */}
            {project.heaterZone && (() => {
              const t = heaterTransform(project.heaterZone, project.room);
              return (
                <ItemRect
                  key="heater"
                  transform={t}
                  fill={COLOURS.heater}
                  selected={isSelected('heater', 'heater')}
                  onPointerDown={e => beginDrag({ kind: 'heater', id: 'heater' }, 'move', e)}
                  selectionStrokeMm={selectionStrokeMm}
                />
              );
            })()}

            {project.columns.map(c => {
              const t = columnTransform(c, project.room);
              if (!t) return null;
              return (
                <ItemRect
                  key={c.id}
                  transform={t}
                  fill={c.finish === 'tile' ? COLOURS.columnTile : COLOURS.columnTimber}
                  selected={isSelected('column', c.id)}
                  onPointerDown={e => beginDrag({ kind: 'column', id: c.id }, 'move', e)}
                  selectionStrokeMm={selectionStrokeMm}
                />
              );
            })}

            {project.benches.map((b, i) => {
              const t = benchTransform(b, project.room);
              const palette = [COLOURS.bench, COLOURS.benchAlt, 'var(--sky-3)', 'var(--green-3)'];
              return (
                <ItemRect
                  key={b.id}
                  transform={t}
                  fill={palette[i % palette.length]}
                  selected={isSelected('bench', b.id)}
                  onPointerDown={e => beginDrag({ kind: 'bench', id: b.id }, 'move', e)}
                  selectionStrokeMm={selectionStrokeMm}
                />
              );
            })}

            {project.openings.map(o => {
              const t = openingTransform(o, project.room);
              return (
                <ItemRect
                  key={o.id}
                  transform={t}
                  fill={openingColour(o.type)}
                  selected={isSelected('opening', o.id)}
                  onPointerDown={e => beginDrag({ kind: 'opening', id: o.id }, 'move', e)}
                  selectionStrokeMm={selectionStrokeMm}
                />
              );
            })}

            {/* Selection handles, drawn on top */}
            {selectedItem && selected && (() => {
              const t = transformFor(selectedItem, project.room);
              if (!t) return null;
              const free = isFreePosition(selectedItem);
              return renderHandles(t, selected, free);
            })()}
          </svg>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Click an item to select. Drag to move, drag the square handles to resize.
            </span>
            <span>Delete to remove. Arrow keys to nudge ({GRID_MM === 50 ? '10mm, Shift+10×' : ''}).</span>
            <span>Grid: {GRID_MM}mm.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Helpers (file-local) ─────────────────────────────────────────────────────

function ItemRect({
  transform,
  fill,
  selected,
  onPointerDown,
  selectionStrokeMm,
}: {
  transform: ItemTransform;
  fill: string;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent<SVGElement>) => void;
  selectionStrokeMm: number;
}) {
  const cx = transform.x + transform.width / 2;
  const cy = transform.y + transform.depth / 2;
  return (
    <g
      transform={`translate(${cx} ${cy}) rotate(${transform.rotation})`}
      style={{ cursor: 'move' }}
      onPointerDown={onPointerDown}
    >
      <rect
        x={-transform.width / 2}
        y={-transform.depth / 2}
        width={transform.width}
        height={transform.depth}
        fill={fill}
        opacity={0.85}
        rx={2}
        stroke={selected ? COLOURS.selection : 'transparent'}
        strokeWidth={selectionStrokeMm * 2}
      />
    </g>
  );
}

function WallLabels({ roomLen, roomWid, scale }: { roomLen: number; roomWid: number; scale: number }) {
  const fontSizeMm = 12 / Math.max(scale, 0.001);
  return (
    <g pointerEvents="none" className="fill-muted-foreground" style={{ fontWeight: 600, fontSize: fontSizeMm }}>
      <text x={roomLen / 2} y={-30} textAnchor="middle">North · {roomLen}mm</text>
      <text x={roomLen / 2} y={roomWid + fontSizeMm + 20} textAnchor="middle">South · {roomLen}mm</text>
      <text
        x={-30}
        y={roomWid / 2}
        textAnchor="middle"
        transform={`rotate(-90 ${-30} ${roomWid / 2})`}
      >
        West · {roomWid}mm
      </text>
      <text
        x={roomLen + 30}
        y={roomWid / 2}
        textAnchor="middle"
        transform={`rotate(90 ${roomLen + 30} ${roomWid / 2})`}
      >
        East · {roomWid}mm
      </text>
    </g>
  );
}

function gridLines(len: number, wid: number, stepMm: number) {
  const lines: JSX.Element[] = [];
  for (let x = stepMm; x < len; x += stepMm) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={wid}
        stroke="var(--gray-2)"
        strokeWidth={x % 1000 === 0 ? 2 : 1}
        opacity={x % 1000 === 0 ? 0.5 : 0.25}
      />
    );
  }
  for (let y = stepMm; y < wid; y += stepMm) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={len}
        y2={y}
        stroke="var(--gray-2)"
        strokeWidth={y % 1000 === 0 ? 2 : 1}
        opacity={y % 1000 === 0 ? 0.5 : 0.25}
      />
    );
  }
  return <>{lines}</>;
}

function useScreenScale(ref: React.RefObject<SVGSVGElement>): number {
  const [scale, setScale] = useState(0.1);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const svg = ref.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (ctm) setScale(ctm.a);
    };
    measure();
    const obs = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    });
    if (ref.current) obs.observe(ref.current);
    window.addEventListener('resize', measure);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', measure);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return scale;
}

function transformFor(snap: ItemSnapshot, room: { length: number; width: number; ceilingHeight: number }): ItemTransform | null {
  switch (snap.kind) {
    case 'opening': return openingTransform(snap.item, room);
    case 'column': return columnTransform(snap.item, room);
    case 'bench': return benchTransform(snap.item, room);
    case 'heater': return heaterTransform(snap.item, room);
  }
}

function isFreePosition(snap: ItemSnapshot): boolean {
  if (snap.kind === 'heater') {
    return snap.item.x !== undefined && snap.item.y !== undefined;
  }
  if (snap.kind === 'column' && snap.item.wall === 'freestanding') return true;
  const item = snap.item as { x?: number; y?: number };
  return item.x !== undefined && item.y !== undefined;
}

function snapshotItem(
  ref: SelectedRef,
  openings: Opening[],
  columns: Column[],
  benches: Bench[],
  heater: HeaterZone | null
): ItemSnapshot | null {
  if (ref.kind === 'opening') {
    const item = openings.find(o => o.id === ref.id);
    return item ? { kind: 'opening', item } : null;
  }
  if (ref.kind === 'column') {
    const item = columns.find(c => c.id === ref.id);
    return item ? { kind: 'column', item } : null;
  }
  if (ref.kind === 'bench') {
    const item = benches.find(b => b.id === ref.id);
    return item ? { kind: 'bench', item } : null;
  }
  if (ref.kind === 'heater' && heater) {
    return { kind: 'heater', item: heater };
  }
  return null;
}

function snapshotWall(ref: SelectedRef, project: { openings: Opening[]; columns: Column[]; benches: Bench[]; heaterZone: HeaterZone | null }): WallId {
  if (ref.kind === 'opening') return project.openings.find(o => o.id === ref.id)?.wall ?? 'north';
  if (ref.kind === 'column') {
    const c = project.columns.find(c => c.id === ref.id);
    return (c && c.wall !== 'freestanding' ? c.wall : 'north');
  }
  if (ref.kind === 'bench') return project.benches.find(b => b.id === ref.id)?.wall ?? 'north';
  return project.heaterZone?.wall ?? 'north';
}

function wallAlongComponent(wall: WallId, dx: number, dy: number): number {
  return WALL_ORIENTATION[wall] === 'horizontal' ? dx : dy;
}

function wallLengthFor(wall: WallId, roomLen: number, roomWid: number): number {
  return WALL_ORIENTATION[wall] === 'horizontal' ? roomLen : roomWid;
}

function nearestWall(pt: { x: number; y: number }, roomLen: number, roomWid: number): WallId {
  const distances: Array<[WallId, number]> = [
    ['north', pt.y],
    ['south', Math.max(0, roomWid - pt.y)],
    ['west', pt.x],
    ['east', Math.max(0, roomLen - pt.x)],
  ];
  distances.sort((a, b) => a[1] - b[1]);
  return distances[0][0];
}

function positionAlongWall(
  wall: WallId,
  pt: { x: number; y: number },
  itemWidth: number,
  roomLen: number,
  roomWid: number
): number {
  const along = WALL_ORIENTATION[wall] === 'horizontal' ? pt.x : pt.y;
  const wallLen = wallLengthFor(wall, roomLen, roomWid);
  const max = Math.max(0, wallLen - itemWidth);
  return Math.round(clamp(along - itemWidth / 2, 0, max));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function applySnap(value: number, maxOffset: number): number {
  let v = snapToGrid(value, GRID_MM);
  v = snapToWall(v, maxOffset, SNAP_THRESHOLD_MM);
  return v;
}

function applySnapPure(value: number, gridOn: boolean): number {
  return gridOn ? snapToGrid(value, GRID_MM) : Math.round(value);
}
