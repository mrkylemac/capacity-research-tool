import {
  benchFramingLM,
  benchSurfaceAreas,
  frontHeightMm,
  totalBenchSlatFaceM2,
} from '@/lib/saunaMaterials/benches';
import { OPEN_FASCIA_FILL_RATIO } from '@/lib/saunaMaterials/conversions';
import type { Bench } from '@/types/saunaMaterials';
import { SLOW_FOLK_PROJECT } from './slowfolk-fixture';

function bench(overrides: Partial<Bench>): Bench {
  return {
    id: 'b',
    tier: 'foot',
    wall: 'north',
    length: 3000,
    depth: 600,
    topHeight: 750,
    hasBackrest: false,
    backrestHeight: 0,
    hasEndCap: 'none',
    closedFront: true,
    ...overrides,
  };
}

describe('frontHeightMm', () => {
  it('returns full top height when no lower tier exists', () => {
    const b = bench({ topHeight: 750 });
    expect(frontHeightMm(b, [b])).toBe(750);
  });

  it('returns the gap to the next lower tier when stacked', () => {
    const lower = bench({ id: 'l', topHeight: 300 });
    const upper = bench({ id: 'u', topHeight: 750 });
    expect(frontHeightMm(upper, [lower, upper])).toBe(450);
  });
});

describe('benchSurfaceAreas', () => {
  it('computes top, front, and end areas for a closed-front bench', () => {
    const b = bench({ length: 3000, depth: 600, topHeight: 600, hasEndCap: 'right' });
    const areas = benchSurfaceAreas(b, [b]);
    expect(areas.top).toBeCloseTo(1.8, 3); // 3.0 × 0.6
    expect(areas.front).toBeCloseTo(1.8, 3); // 3.0 × 0.6
    expect(areas.ends).toBeCloseTo(0.36, 3); // 0.6 × 0.6 × 1
    expect(areas.backrest).toBe(0);
  });

  it('discounts open-front benches by OPEN_FASCIA_FILL_RATIO', () => {
    const b = bench({ length: 3000, depth: 600, topHeight: 600, closedFront: false });
    const areas = benchSurfaceAreas(b, [b]);
    expect(areas.front).toBeCloseTo(1.8 * OPEN_FASCIA_FILL_RATIO, 3);
  });

  it('counts both ends when end cap is "both"', () => {
    const b = bench({ length: 3000, depth: 600, topHeight: 600, hasEndCap: 'both' });
    const areas = benchSurfaceAreas(b, [b]);
    expect(areas.ends).toBeCloseTo(0.72, 3); // 0.6 × 0.6 × 2
  });

  it('adds backrest area when hasBackrest', () => {
    const b = bench({
      length: 3000,
      depth: 600,
      topHeight: 1200,
      hasBackrest: true,
      backrestHeight: 250,
    });
    const areas = benchSurfaceAreas(b, [b]);
    expect(areas.backrest).toBeCloseTo(0.75, 3); // 3.0 × 0.25
  });
});

describe('totalBenchSlatFaceM2 — Slow Folk', () => {
  it('produces total bench face area roughly in line with the spec', () => {
    const total = totalBenchSlatFaceM2(SLOW_FOLK_PROJECT.benches);
    // Spec sense check: ~25 m² total face including tops/fronts/ends/backrests.
    // The actual model is closer to 20–25 m² depending on stacking math.
    expect(total).toBeGreaterThan(15);
    expect(total).toBeLessThan(30);
  });
});

describe('benchFramingLM', () => {
  it('captures perimeter, bearers, and legs', () => {
    const b = bench({ length: 3000, depth: 600, topHeight: 750 });
    const lm = benchFramingLM(b);
    // Perimeter: 2 × (3 + 0.6) = 7.2
    // Bearers: ceil(3000/800) - 1 = 3, × 0.6 = 1.8
    // Legs: max(2, ceil(3000/1500) + 1) = 3 positions, × 2 × 0.75 = 4.5
    // Total ≈ 13.5
    expect(lm).toBeCloseTo(13.5, 1);
  });
});
