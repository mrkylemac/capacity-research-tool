import type {
  Bench,
  Column,
  HeaterZone,
  Opening,
  Project,
  Room,
  WallId,
} from '@/types/saunaMaterials';
import { m2FromMm, mm, wallLengthMm } from './conversions';

export const WALL_IDS: WallId[] = ['north', 'south', 'east', 'west'];

export function wallGrossAreaM2(wall: WallId, room: Room): number {
  return m2FromMm(wallLengthMm(wall, room), room.ceilingHeight);
}

export function openingAreaM2(opening: Opening): number {
  if (opening.shape === 'circle') {
    const rM = mm(opening.width) / 2;
    return Math.PI * rM * rM;
  }
  return m2FromMm(opening.width, opening.height);
}

export function heaterTileAreaM2(heater: HeaterZone | null, wall: WallId): number {
  if (!heater || heater.wall !== wall || heater.finish !== 'tile') return 0;
  return m2FromMm(heater.width, heater.height);
}

export function columnTileFaceAreaM2(columns: Column[], wall: WallId): number {
  let total = 0;
  for (const c of columns) {
    if (c.wall === wall && c.finish === 'tile') {
      total += m2FromMm(c.width, c.height);
    }
  }
  return total;
}

/**
 * Behind-bench coverage on a single wall, deduplicated for stacking.
 *
 * Each bench is a left-anchored interval at `startOffset` (default 0), running
 * `length` mm along the wall and reaching `topHeight` mm above the floor.
 * For any overlapping range, only the tallest tier counts.
 */
export function behindBenchAreaM2(benches: Bench[], wall: WallId): number {
  const onWall = benches.filter(b => b.wall === wall);
  if (onWall.length === 0) return 0;

  const points = new Set<number>();
  for (const b of onWall) {
    const start = b.startOffset ?? 0;
    points.add(start);
    points.add(start + b.length);
  }
  const sorted = [...points].sort((a, b) => a - b);

  let totalAreaMm2 = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const z = sorted[i + 1];
    const segLen = z - a;
    let maxTop = 0;
    for (const b of onWall) {
      const start = b.startOffset ?? 0;
      const end = start + b.length;
      if (start <= a && z <= end && b.topHeight > maxTop) {
        maxTop = b.topHeight;
      }
    }
    totalAreaMm2 += segLen * maxTop;
  }
  return totalAreaMm2 / 1_000_000;
}

export interface WallNetResult {
  wall: WallId;
  gross: number;
  openings: number;
  heater: number;
  columns: number;
  behindBench: number;
  net: number;
  /** True when the raw subtraction went negative and was clamped to zero. */
  clamped: boolean;
}

export function wallNetArea(project: Project, wall: WallId): WallNetResult {
  const gross = wallGrossAreaM2(wall, project.room);
  const openings = project.openings
    .filter(o => o.wall === wall)
    .reduce((sum, o) => sum + openingAreaM2(o), 0);
  const heater = heaterTileAreaM2(project.heaterZone, wall);
  const columns = columnTileFaceAreaM2(project.columns, wall);
  const behindBench = project.construction.behindBenchClad
    ? 0
    : behindBenchAreaM2(project.benches, wall);

  const raw = gross - openings - heater - columns - behindBench;
  return {
    wall,
    gross,
    openings,
    heater,
    columns,
    behindBench,
    net: Math.max(0, raw),
    clamped: raw < 0,
  };
}

export interface TotalWallResult {
  total: number;
  perWall: WallNetResult[];
}

export function totalWallNetCladdingM2(project: Project): TotalWallResult {
  const perWall = WALL_IDS.map(w => wallNetArea(project, w));
  const total = perWall.reduce((sum, r) => sum + r.net, 0);
  return { total, perWall };
}

export function ceilingGrossAreaM2(room: Room): number {
  return m2FromMm(room.length, room.width);
}

/**
 * Ceiling cladding area, subtracting tile column tops that extend to ceiling.
 */
export function ceilingNetCladdingM2(project: Project): number {
  const gross = ceilingGrossAreaM2(project.room);
  let subtract = 0;
  for (const c of project.columns) {
    if (c.finish === 'tile' && c.extendsToCeiling) {
      subtract += m2FromMm(c.width, c.depth);
    }
  }
  return Math.max(0, gross - subtract);
}

/** Sum of all opening areas across the room. */
export function totalOpeningsAreaM2(openings: Opening[]): number {
  return openings.reduce((sum, o) => sum + openingAreaM2(o), 0);
}

/** Sum of gross wall area across all four walls. */
export function totalWallGrossM2(room: Room): number {
  return WALL_IDS.reduce((sum, w) => sum + wallGrossAreaM2(w, room), 0);
}
