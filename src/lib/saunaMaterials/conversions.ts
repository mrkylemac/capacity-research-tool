import type { Profile, WallId, Room } from '@/types/saunaMaterials';

// Open-fascia bench fronts: rough fill ratio for slats with gaps.
// Calibrate later with a proper open-area calc.
export const OPEN_FASCIA_FILL_RATIO = 0.6;

// Vapour barrier overlap allowance (10%).
export const VAPOUR_BARRIER_OVERLAP = 1.10;

// Foil tape: 10% buffer on top of seams + corners + penetrations.
export const FOIL_TAPE_BUFFER = 1.10;

// Vapour barrier roll face width (m). Used to estimate horizontal seams.
export const FOIL_ROLL_WIDTH_M = 1.2;

// Foil tape allowance per opening penetration (m).
export const TAPE_PER_PENETRATION_M = 5;

// Bench leg spacing (mm). Legs at this centre, plus end legs.
export const BENCH_LEG_SPACING_MM = 1500;

// Bench intermediate bearer spacing (mm).
export const BENCH_BEARER_SPACING_MM = 800;

/** Convert millimetres to metres. */
export const mm = (n: number) => n / 1000;

/** Convert two millimetre dimensions to a square-metre area. */
export const m2FromMm = (w: number, h: number) => (w / 1000) * (h / 1000);

/** Round to 2 decimal places (m² display). */
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Round to 1 decimal place (lineal metre display). */
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Length of a wall in millimetres given the room geometry. */
export function wallLengthMm(wall: WallId, room: Room): number {
  return wall === 'north' || wall === 'south' ? room.length : room.width;
}

/**
 * Convert face area (m²) of cladding to lineal metres of profile.
 * Uses cover width (face minus tongue) and applies a waste factor.
 */
export function faceAreaToLM(
  faceAreaM2: number,
  profile: Pick<Profile, 'coverWidth'>,
  wasteFactor: number
): number {
  if (faceAreaM2 <= 0) return 0;
  const coverM = profile.coverWidth / 1000;
  if (coverM <= 0) return 0;
  const rawLM = faceAreaM2 / coverM;
  return rawLM * (1 + wasteFactor);
}

/** Round up to the nearest whole unit (boxes, rolls, etc.). */
export const ceilUnits = (n: number) => Math.max(0, Math.ceil(n));
