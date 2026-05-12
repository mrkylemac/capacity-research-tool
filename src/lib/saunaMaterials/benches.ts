import type { Bench, BenchConstruction, BenchTier, EndCap, SlatConstructionType } from '@/types/saunaMaterials';
import {
  BENCH_BEARER_SPACING_MM,
  BENCH_LEG_SPACING_MM,
  m2FromMm,
  mm,
  OPEN_FASCIA_FILL_RATIO,
} from './conversions';

/**
 * Visible front height of a bench tier, taking into account any lower tier
 * stacked under it on the same wall. The front face of a bench only spans
 * from its top down to the next-lower tier's top (or the floor when none).
 */
export function frontHeightMm(bench: Bench, allBenches: Bench[]): number {
  const lowerTiers = allBenches
    .filter(b => b.wall === bench.wall && b.topHeight < bench.topHeight)
    .map(b => b.topHeight);
  if (lowerTiers.length === 0) return bench.topHeight;
  return bench.topHeight - Math.max(...lowerTiers);
}

function endCapMultiplier(end: EndCap): number {
  if (end === 'both') return 2;
  if (end === 'none') return 0;
  return 1;
}

export interface BenchSurfaceAreas {
  /** mm² → m² for the bench top face. */
  top: number;
  /** Front fascia, m². Already discounted for open-front benches. */
  front: number;
  /** Visible end caps, m². */
  ends: number;
  /** Backrest face, m². 0 when no backrest. */
  backrest: number;
}

export function benchSurfaceAreas(
  bench: Bench,
  allBenches: Bench[]
): BenchSurfaceAreas {
  const top = m2FromMm(bench.length, bench.depth);

  const front = (() => {
    const h = frontHeightMm(bench, allBenches);
    const fillRatio = bench.closedFront ? 1 : OPEN_FASCIA_FILL_RATIO;
    return m2FromMm(bench.length, h) * fillRatio;
  })();

  const ends = (() => {
    const h = frontHeightMm(bench, allBenches);
    return m2FromMm(bench.depth, h) * endCapMultiplier(bench.hasEndCap);
  })();

  const backrest = bench.hasBackrest
    ? m2FromMm(bench.length, bench.backrestHeight)
    : 0;

  return { top, front, ends, backrest };
}

/**
 * Total bench-slat face area (m²) across all benches and faces. This is what
 * gets converted to lineal metres of slat profile.
 */
export function totalBenchSlatFaceM2(benches: Bench[]): number {
  let total = 0;
  for (const b of benches) {
    const a = benchSurfaceAreas(b, benches);
    total += a.top + a.front + a.ends + a.backrest;
  }
  return total;
}

/**
 * Bench framing lineal metres for a single bench. Captures:
 *   - perimeter rails: 2 × (length + depth)
 *   - intermediate bearers across the depth at bearerSpacing centres
 *   - legs (front + back per position) at legSpacing centres
 * Falls back to module constants when construction config is omitted.
 */
export function benchFramingLM(
  bench: Bench,
  bc?: Pick<BenchConstruction, 'supportSpacing' | 'bearerSpacing'>
): number {
  const legSpacing = bc?.supportSpacing ?? BENCH_LEG_SPACING_MM;
  const bearerSpacing = bc?.bearerSpacing ?? BENCH_BEARER_SPACING_MM;

  const perimeterMm = 2 * (bench.length + bench.depth);

  const bearerCount = Math.max(0, Math.ceil(bench.length / bearerSpacing) - 1);
  const bearersMm = bearerCount * bench.depth;

  const legPositions = Math.max(2, Math.ceil(bench.length / legSpacing) + 1);
  const legsMm = legPositions * 2 * bench.topHeight;

  return mm(perimeterMm + bearersMm + legsMm);
}

export function totalBenchFramingLM(
  benches: Bench[],
  bc?: Pick<BenchConstruction, 'supportSpacing' | 'bearerSpacing'>
): number {
  return benches.reduce((sum, b) => sum + benchFramingLM(b, bc), 0);
}

/** Lineal metres of dedicated backrest profile, length-only across benches. */
export function totalBackrestLM(benches: Bench[]): number {
  return benches
    .filter(b => b.hasBackrest)
    .reduce((sum, b) => sum + mm(b.length), 0);
}

// ── Slat depth calculator ────────────────────────────────────────────────────

/**
 * Wall-mounted bench depth from slat count and profile dimensions.
 *
 * Cross-section layout (wall → room, back to front):
 *   rearVentilation | slat₁ | gap | slat₂ | gap | … | slatN | gap | fascia (thickness)
 *
 * There is a ventilation gap on BOTH sides of the slat array:
 *   - at the back: rearVentilation (10 mm for lower tiers, 25 mm for upper)
 *   - at the front: slatGap (between last slat and the fascia board)
 *
 * Formula: rearVentilation + N × (faceWidth + slatGap) + thickness
 *
 * Example — Slow Folk upper bench (6 slats, 90 mm face, 21 mm fascia, 10 mm gap):
 *   10 + 6 × (90 + 10) + 21 = 631 mm  ✓
 */
export function benchDepthFromSlats(
  faceWidth: number,
  thickness: number,
  slatCount: number,
  slatGap: number,
  rearVentilation: number,
): number {
  return Math.round(rearVentilation + slatCount * (faceWidth + slatGap) + thickness);
}

/**
 * Back-calculate slat count for a wall-mounted bench from a known depth.
 *
 * Derivation:
 *   depth = rearVentilation + N × (faceWidth + slatGap) + thickness
 *   → N = (depth − rearVentilation − thickness) / (faceWidth + slatGap)
 */
export function slatCountFromDepth(
  depth: number,
  faceWidth: number,
  thickness: number,
  slatGap: number,
  rearVentilation: number,
): number {
  return Math.max(1, Math.round(
    (depth - rearVentilation - thickness) / (faceWidth + slatGap),
  ));
}

/**
 * Climb-step depth from slat count — BOX construction.
 *
 * The climb step has no wall attachment and no rear ventilation gap.
 * Instead, two side pieces (same profile, set vertically) form the ends,
 * with uniform gaps between every element including the outer faces.
 *
 * Cross-section layout (left side → right side):
 *   side (thickness) | gap | slat₁ | gap | slat₂ | … | slatN | gap | side (thickness)
 *
 * Formula: 2 × thickness + (N + 1) × slatGap + N × faceWidth
 *
 * Example — Slow Folk climb step (3 slats, 90 mm face, 21 mm side, 10 mm gap):
 *   2 × 21 + (3 + 1) × 10 + 3 × 90 = 352 mm  ✓
 */
export function climbStepDepthFromSlats(
  faceWidth: number,
  thickness: number,
  slatCount: number,
  slatGap: number,
): number {
  return Math.round(2 * thickness + (slatCount + 1) * slatGap + slatCount * faceWidth);
}

/**
 * Back-calculate slat count for a climb-step (box construction) from a known depth.
 *
 * Derivation:
 *   depth = 2 × thickness + (N + 1) × slatGap + N × faceWidth
 *   → N = (depth − 2 × thickness − slatGap) / (faceWidth + slatGap)
 */
export function slatCountFromClimbStepDepth(
  depth: number,
  faceWidth: number,
  thickness: number,
  slatGap: number,
): number {
  return Math.max(1, Math.round(
    (depth - 2 * thickness - slatGap) / (faceWidth + slatGap),
  ));
}

// ── Construction-type resolution + unified dispatch ──────────────────────────

/**
 * Derive the default slat construction type from a bench tier.
 * The climb step is a freestanding box; all wall-fixed tiers are wallMounted.
 * Add new tiers here if their default construction differs.
 */
export function defaultSlatConstructionType(tier: BenchTier): SlatConstructionType {
  return tier === 'climbStep' ? 'box' : 'wallMounted';
}

/**
 * Resolved construction type for a bench — single source of truth.
 * Uses the explicit `slatConstructionType` override when present,
 * otherwise falls back to the tier-derived default.
 */
export function resolvedSlatConstructionType(
  bench: Pick<Bench, 'tier' | 'slatConstructionType'>,
): SlatConstructionType {
  return bench.slatConstructionType ?? defaultSlatConstructionType(bench.tier);
}

/** Default number of slats for a given construction type. */
export function defaultSlatCount(constructionType: SlatConstructionType): number {
  return constructionType === 'box' ? 3 : 6;
}

/**
 * Default rear-ventilation gap for a wall-mounted bench tier.
 * Upper tier gets 25 mm for heat circulation clearance; all others use the slat gap.
 * Not applicable to box construction.
 */
export function defaultRearVentilation(tier: BenchTier, slatGap: number): number {
  return tier === 'upper' ? 25 : slatGap;
}

/**
 * Compute bench depth for any slat construction type.
 * Dispatches to the appropriate formula based on constructionType.
 * rearVentilation is ignored for 'box' construction.
 */
export function computeSlatDepth(
  faceWidth: number,
  thickness: number,
  slatCount: number,
  slatGap: number,
  constructionType: SlatConstructionType,
  rearVentilation?: number,
): number {
  if (constructionType === 'box') {
    return climbStepDepthFromSlats(faceWidth, thickness, slatCount, slatGap);
  }
  return benchDepthFromSlats(faceWidth, thickness, slatCount, slatGap, rearVentilation ?? slatGap);
}

/**
 * Back-calculate slat count from a known depth for any slat construction type.
 * Dispatches to the appropriate inverse formula.
 */
export function computeSlatCountFromDepth(
  depth: number,
  faceWidth: number,
  thickness: number,
  slatGap: number,
  constructionType: SlatConstructionType,
  rearVentilation?: number,
): number {
  if (constructionType === 'box') {
    return slatCountFromClimbStepDepth(depth, faceWidth, thickness, slatGap);
  }
  return slatCountFromDepth(depth, faceWidth, thickness, slatGap, rearVentilation ?? slatGap);
}

/** Stock yield for cutting bench slats (each slat = bench depth mm) from a board. */
export interface SlatYield {
  stockLengthMm: number;
  cutsPerBoard: number;
  offcutMm: number;
  wastePercent: number;
}

export function slatYieldPerBoard(benchDepthMm: number, stockLengthM: number): SlatYield {
  const stockLengthMm = Math.round(stockLengthM * 1000);
  const cutsPerBoard = Math.max(0, Math.floor(stockLengthMm / benchDepthMm));
  const offcutMm = stockLengthMm - cutsPerBoard * benchDepthMm;
  const wastePercent = cutsPerBoard === 0 ? 100 : Math.round((offcutMm / stockLengthMm) * 100);
  return { stockLengthMm, cutsPerBoard, offcutMm, wastePercent };
}
