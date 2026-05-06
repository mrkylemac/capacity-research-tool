import type { Project } from '@/types/saunaMaterials';
import { mm } from './conversions';
import {
  FOIL_ROLL_WIDTH_M,
  FOIL_TAPE_BUFFER,
  TAPE_PER_PENETRATION_M,
  VAPOUR_BARRIER_OVERLAP,
} from './conversions';
import {
  ceilingGrossAreaM2,
  totalOpeningsAreaM2,
  totalWallGrossM2,
} from './geometry';

/** Wall insulation area (m²) — gross walls minus openings. Vapour barrier and
 *  insulation continue behind tile zones, so those are not subtracted here. */
export function insulationWallM2(project: Project): number {
  return Math.max(
    0,
    totalWallGrossM2(project.room) - totalOpeningsAreaM2(project.openings)
  );
}

export function insulationCeilingM2(project: Project): number {
  return ceilingGrossAreaM2(project.room);
}

/** Total envelope area (m²) for vapour barrier — walls + ceiling minus openings. */
export function envelopeAreaM2(project: Project): number {
  return Math.max(
    0,
    totalWallGrossM2(project.room) +
      ceilingGrossAreaM2(project.room) -
      totalOpeningsAreaM2(project.openings)
  );
}

/** Vapour barrier requirement, m² with overlap allowance. */
export function vapourBarrierM2(project: Project): number {
  return envelopeAreaM2(project) * VAPOUR_BARRIER_OVERLAP;
}

/**
 * Foil tape lineal metres — sums horizontal seams (one per roll-width band),
 * vertical corners + ceiling perimeter, and a per-penetration allowance, with a
 * buffer factor on top.
 */
export function foilTapeLM(project: Project): number {
  const envelope = totalWallGrossM2(project.room) + ceilingGrossAreaM2(project.room);
  const horizontalSeamsLM = envelope / FOIL_ROLL_WIDTH_M;
  const room = project.room;
  // Wall-to-wall corners: 4 vertical corners full ceiling height.
  const wallCornersLM = 4 * mm(room.ceilingHeight);
  // Ceiling perimeter: 2 × (length + width).
  const ceilingPerimeterLM = 2 * (mm(room.length) + mm(room.width));
  const penetrationLM = project.openings.length * TAPE_PER_PENETRATION_M;
  return (
    (horizontalSeamsLM + wallCornersLM + ceilingPerimeterLM + penetrationLM) *
    FOIL_TAPE_BUFFER
  );
}

export interface FixingTotals {
  cladding: number;
  bench: number;
}

/**
 * Approximate fixings count (each), driven by clad area × density.
 * Caller converts to boxes via material unitSize.
 */
export function fixingCounts(
  project: Project,
  totals: { wallNet: number; ceilingNet: number; benchFace: number }
): FixingTotals {
  const claddingArea = totals.wallNet + totals.ceilingNet;
  const cladding = claddingArea * project.construction.fixingsDensityCladding;
  const bench = totals.benchFace * project.construction.fixingsDensityBench;
  return { cladding, bench };
}
