import type {
  DeckGeometry,
  ElevationCourse,
  ElevationLayout,
  Rect,
  RectWithKind,
  TileCell,
  TilePlanConfig,
  TileStats,
} from '@/types/tiles';

// Slow Folk Tile Module System
// module = tileSize + groutWidth = 103 mm at the default tile/grout
// Whole-tile run of N tiles = N * tileSize + (N - 1) * groutWidth
//   29 tiles → 2984 mm   14 tiles → 1439 mm    8 tiles → 821 mm    9 tiles → 924 mm
// Snap any dimension to (N * module - groutWidth) to land on whole tiles only.
export const DEFAULT_CONFIG: TilePlanConfig = {
  tileSize: 100,
  tileThickness: 7,
  groutWidth: 3,
  edgeWidth: 200,
  centreWidth: 600,
  maxOverallLength: 5400,
  hotPool: {
    length: 2987, // 29 tile modules, lands on grout joint at the end
    width: 1442, // 14 tile modules
    shellHeight: 824, // 8 courses, no top cut
    waterDepth: 721, // grout joint above course 7
  },
  coldPool: {
    length: 1442, // 14 tile modules
    width: 1442, // 14 tile modules
    shellHeight: 927, // 9 courses, no top cut (deeper plunge)
    waterDepth: 824, // grout joint above course 8
  },
  hotSkimmer: {
    offsetX: 240,
    offsetY: 860,
    width: 340,
    depth: 340,
    bodySize: 469,
    facing: 'right',
    lidType: 'hide',
  },
  coldSkimmer: {
    offsetX: 20,
    offsetY: 200,
    width: 340,
    depth: 340,
    bodySize: 469,
    facing: 'left',
    lidType: 'hide',
  },
  gridOriginX: 0,
  gridOriginY: 0,
  fittings: [
    { id: 'h-rail-hot-n', kind: 'handrail', pool: 'hot', surface: 'wallNorth', x: 1500, y: 0, width: 400, height: 80, label: 'Hot N handrail' },
    { id: 'h-rail-cold-n', kind: 'handrail', pool: 'cold', surface: 'wallNorth', x: 700, y: 0, width: 400, height: 80, label: 'Cold N handrail' },
    { id: 'suction-hot', kind: 'suction', pool: 'hot', surface: 'floor', x: 1500, y: 700, width: 150, height: 150, label: 'Hot floor suction' },
    { id: 'suction-cold', kind: 'suction', pool: 'cold', surface: 'floor', x: 700, y: 700, width: 150, height: 150, label: 'Cold floor suction' },
  ],
};

export function computeDeckGeometry(c: TilePlanConfig): DeckGeometry {
  const totalWidth =
    c.edgeWidth * 2 + c.coldPool.length + c.centreWidth + c.hotPool.length;
  const totalHeight =
    c.edgeWidth * 2 + Math.max(c.coldPool.width, c.hotPool.width);

  const outer: Rect = { x: 0, y: 0, width: totalWidth, height: totalHeight };

  const coldPool: Rect = {
    x: c.edgeWidth,
    y: c.edgeWidth,
    width: c.coldPool.length,
    height: c.coldPool.width,
  };
  const centre: Rect = {
    x: c.edgeWidth + c.coldPool.length,
    y: c.edgeWidth,
    width: c.centreWidth,
    height: Math.max(c.coldPool.width, c.hotPool.width),
  };
  const hotPool: Rect = {
    x: c.edgeWidth + c.coldPool.length + c.centreWidth,
    y: c.edgeWidth,
    width: c.hotPool.length,
    height: c.hotPool.width,
  };

  const coldSkimmer: Rect = {
    x: centre.x + c.coldSkimmer.offsetX,
    y: centre.y + c.coldSkimmer.offsetY,
    width: c.coldSkimmer.width,
    height: c.coldSkimmer.depth,
  };
  const hotSkimmer: Rect = {
    x: centre.x + c.hotSkimmer.offsetX,
    y: centre.y + c.hotSkimmer.offsetY,
    width: c.hotSkimmer.width,
    height: c.hotSkimmer.depth,
  };
  const coldBodyX =
    c.coldSkimmer.facing === 'left'
      ? centre.x
      : centre.x + c.centreWidth - c.coldSkimmer.bodySize;
  const coldSkimmerBody: Rect = {
    x: coldBodyX,
    y: coldSkimmer.y + coldSkimmer.height / 2 - c.coldSkimmer.bodySize / 2,
    width: c.coldSkimmer.bodySize,
    height: c.coldSkimmer.bodySize,
  };
  const hotBodyX =
    c.hotSkimmer.facing === 'left'
      ? centre.x
      : centre.x + c.centreWidth - c.hotSkimmer.bodySize;
  const hotSkimmerBody: Rect = {
    x: hotBodyX,
    y: hotSkimmer.y + hotSkimmer.height / 2 - c.hotSkimmer.bodySize / 2,
    width: c.hotSkimmer.bodySize,
    height: c.hotSkimmer.bodySize,
  };

  const cutouts: RectWithKind[] = [
    { ...coldPool, kind: 'pool', label: 'Cold pool' },
    { ...hotPool, kind: 'pool', label: 'Hot pool' },
  ];
  if (c.coldSkimmer.lidType !== 'hide') {
    cutouts.push({ ...coldSkimmer, kind: 'skimmer', label: 'Cold skimmer' });
  }
  if (c.hotSkimmer.lidType !== 'hide') {
    cutouts.push({ ...hotSkimmer, kind: 'skimmer', label: 'Hot skimmer' });
  }

  return {
    bounds: outer,
    outer,
    coldPool,
    hotPool,
    centre,
    coldSkimmer,
    hotSkimmer,
    coldSkimmerBody,
    hotSkimmerBody,
    cutouts,
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function intersection(a: Rect, b: Rect): Rect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x1 >= x2 || y1 >= y2) return null;
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function subtractRect(rect: Rect, cut: Rect): Rect[] {
  const inter = intersection(rect, cut);
  if (!inter) return [rect];
  const eps = 0.001;
  if (
    inter.width >= rect.width - eps &&
    inter.height >= rect.height - eps
  ) {
    return [];
  }
  const pieces: Rect[] = [];
  if (inter.y > rect.y + eps) {
    pieces.push({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: inter.y - rect.y,
    });
  }
  if (inter.y + inter.height < rect.y + rect.height - eps) {
    pieces.push({
      x: rect.x,
      y: inter.y + inter.height,
      width: rect.width,
      height: rect.y + rect.height - (inter.y + inter.height),
    });
  }
  if (inter.x > rect.x + eps) {
    pieces.push({
      x: rect.x,
      y: inter.y,
      width: inter.x - rect.x,
      height: inter.height,
    });
  }
  if (inter.x + inter.width < rect.x + rect.width - eps) {
    pieces.push({
      x: inter.x + inter.width,
      y: inter.y,
      width: rect.x + rect.width - (inter.x + inter.width),
      height: inter.height,
    });
  }
  return pieces;
}

export interface DeckTileResult {
  cells: TileCell[];
  stats: TileStats;
}

export function computeDeckTiles(c: TilePlanConfig, geo: DeckGeometry): DeckTileResult {
  const module = c.tileSize + c.groutWidth;
  const cells: TileCell[] = [];

  const startCol = Math.floor((geo.outer.x - c.gridOriginX) / module) - 1;
  const startRow = Math.floor((geo.outer.y - c.gridOriginY) / module) - 1;
  const endCol = Math.ceil((geo.outer.x + geo.outer.width - c.gridOriginX) / module) + 1;
  const endRow = Math.ceil((geo.outer.y + geo.outer.height - c.gridOriginY) / module) + 1;

  const tileArea = c.tileSize * c.tileSize;

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const x = c.gridOriginX + col * module;
      const y = c.gridOriginY + row * module;
      const tileRect: Rect = { x, y, width: c.tileSize, height: c.tileSize };

      const interOuter = intersection(tileRect, geo.outer);
      if (!interOuter) continue;

      let pieces: Rect[] = [interOuter];
      for (const co of geo.cutouts) {
        pieces = pieces.flatMap(p => subtractRect(p, co));
        if (pieces.length === 0) break;
      }
      if (pieces.length === 0) continue;

      let useableArea = 0;
      let largest: Rect = pieces[0];
      for (const p of pieces) {
        const a = p.width * p.height;
        useableArea += a;
        if (a > largest.width * largest.height) largest = p;
      }
      if (useableArea < 1) continue;

      const isOuterCut =
        interOuter.width < c.tileSize - 0.001 ||
        interOuter.height < c.tileSize - 0.001;
      const lostToCutouts = interOuter.width * interOuter.height - useableArea;
      const isCutoutCut = lostToCutouts > 0.5;
      const isCut = isOuterCut || isCutoutCut;

      cells.push({
        col,
        row,
        x,
        y,
        width: c.tileSize,
        height: c.tileSize,
        status: isCut ? 'cut' : 'full',
        cutWidth: isCut ? largest.width : c.tileSize,
        cutHeight: isCut ? largest.height : c.tileSize,
        cutArea: useableArea,
        fullArea: tileArea,
      });
    }
  }

  const stats = computeStats(cells, c);
  return { cells, stats };
}

function computeStats(cells: TileCell[], c: TilePlanConfig): TileStats {
  const full = cells.filter(t => t.status === 'full').length;
  const cut = cells.filter(t => t.status === 'cut').length;
  const total = cells.length;

  const sizeBuckets = new Map<string, number>();
  for (const t of cells) {
    if (t.status !== 'cut') continue;
    const w = Math.round(t.cutWidth);
    const h = Math.round(t.cutHeight);
    const a = Math.min(w, h);
    const b = Math.max(w, h);
    const key = `${a}×${b}`;
    sizeBuckets.set(key, (sizeBuckets.get(key) ?? 0) + 1);
  }

  const cutSizes = Array.from(sizeBuckets.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const tileArea = c.tileSize * c.tileSize;
  const usedArea = cells.reduce((s, t) => s + t.cutArea, 0);
  const purchasedArea = total * tileArea;
  const wastePercent =
    purchasedArea === 0 ? 0 : ((purchasedArea - usedArea) / purchasedArea) * 100;

  return { full, cut, total, cutSizes, wastePercent };
}

export function computeWallElevation(
  c: TilePlanConfig,
  pool: 'hot' | 'cold',
  axis: 'long' | 'short',
): ElevationLayout {
  const p = pool === 'hot' ? c.hotPool : c.coldPool;
  const length = axis === 'long' ? p.length : p.width;
  const module = c.tileSize + c.groutWidth;

  const courses: ElevationCourse[] = [];
  let y = 0;
  let i = 0;
  while (y < p.shellHeight - 0.001) {
    const remaining = p.shellHeight - y;
    const h = Math.min(c.tileSize, remaining);
    courses.push({
      index: i,
      yBottom: y,
      yTop: y + h,
      height: h,
      isCut: h < c.tileSize - 0.001,
    });
    y += c.tileSize;
    if (y < p.shellHeight - 0.001) y += c.groutWidth;
    i++;
  }

  const columns: ElevationCourse[] = [];
  let x = 0;
  i = 0;
  while (x < length - 0.001) {
    const remaining = length - x;
    const w = Math.min(c.tileSize, remaining);
    columns.push({
      index: i,
      yBottom: x,
      yTop: x + w,
      height: w,
      isCut: w < c.tileSize - 0.001,
    });
    x += c.tileSize;
    if (x < length - 0.001) x += c.groutWidth;
    i++;
  }

  const waterDepth = p.waterDepth;
  let courseAtWaterline: ElevationCourse | null = null;
  for (const co of courses) {
    if (waterDepth >= co.yBottom - 0.001 && waterDepth <= co.yTop + c.groutWidth + 0.001) {
      courseAtWaterline = co;
      break;
    }
  }
  let waterlineOffsetInCourse = 0;
  let waterlineFallsOnGroutLine = false;
  if (courseAtWaterline) {
    waterlineOffsetInCourse = waterDepth - courseAtWaterline.yBottom;
    waterlineFallsOnGroutLine =
      Math.abs(waterlineOffsetInCourse - courseAtWaterline.height) < 1 ||
      Math.abs(waterlineOffsetInCourse) < 1;
  }

  return {
    shellHeight: p.shellHeight,
    waterDepth,
    length,
    courses,
    columns,
    waterlineOffsetInCourse,
    waterlineFallsOnGroutLine,
  };
}

export function fitTilesAcross(length: number, tileSize: number, grout: number) {
  if (length <= 0) return { full: 0, cutSize: 0, hasCut: false };
  const module = tileSize + grout;
  const full = Math.floor((length + grout) / module);
  const used = full * tileSize + Math.max(0, full - 1) * grout;
  const remaining = length - used;
  if (remaining <= 0.5) return { full, cutSize: 0, hasCut: false };
  const cutSize = remaining - grout;
  if (cutSize <= 0.5) return { full, cutSize: 0, hasCut: false };
  return { full, cutSize, hasCut: true };
}
