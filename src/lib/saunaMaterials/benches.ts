import type { Bench, EndCap } from '@/types/saunaMaterials';
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
 *   - intermediate bearers across the depth at BENCH_BEARER_SPACING_MM centres
 *   - legs (front + back per position) at BENCH_LEG_SPACING_MM centres
 */
export function benchFramingLM(bench: Bench): number {
  const perimeterMm = 2 * (bench.length + bench.depth);

  const bearerCount = Math.max(0, Math.ceil(bench.length / BENCH_BEARER_SPACING_MM) - 1);
  const bearersMm = bearerCount * bench.depth;

  const legPositions = Math.max(2, Math.ceil(bench.length / BENCH_LEG_SPACING_MM) + 1);
  const legsMm = legPositions * 2 * bench.topHeight;

  return mm(perimeterMm + bearersMm + legsMm);
}

export function totalBenchFramingLM(benches: Bench[]): number {
  return benches.reduce((sum, b) => sum + benchFramingLM(b), 0);
}

/** Lineal metres of dedicated backrest profile, length-only across benches. */
export function totalBackrestLM(benches: Bench[]): number {
  return benches
    .filter(b => b.hasBackrest)
    .reduce((sum, b) => sum + mm(b.length), 0);
}
