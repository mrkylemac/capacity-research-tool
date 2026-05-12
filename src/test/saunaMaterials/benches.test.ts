import {
  benchDepthFromSlats,
  benchFramingLM,
  benchSurfaceAreas,
  climbStepDepthFromSlats,
  computeSlatCountFromDepth,
  computeSlatDepth,
  defaultRearVentilation,
  defaultSlatConstructionType,
  defaultSlatCount,
  frontHeightMm,
  resolvedSlatConstructionType,
  slatCountFromClimbStepDepth,
  slatCountFromDepth,
  slatYieldPerBoard,
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

// ── Construction-type resolution ─────────────────────────────────────────────

describe('defaultSlatConstructionType', () => {
  it('returns box for climbStep', () => {
    expect(defaultSlatConstructionType('climbStep')).toBe('box');
  });

  it('returns wallMounted for foot, upper, accessible', () => {
    expect(defaultSlatConstructionType('foot')).toBe('wallMounted');
    expect(defaultSlatConstructionType('upper')).toBe('wallMounted');
    expect(defaultSlatConstructionType('accessible')).toBe('wallMounted');
  });
});

describe('resolvedSlatConstructionType', () => {
  it('uses the tier default when no explicit override is set', () => {
    expect(resolvedSlatConstructionType({ tier: 'climbStep' })).toBe('box');
    expect(resolvedSlatConstructionType({ tier: 'foot' })).toBe('wallMounted');
  });

  it('respects an explicit slatConstructionType override over the tier default', () => {
    // A foot bench explicitly set to box (unusual but valid)
    expect(resolvedSlatConstructionType({ tier: 'foot', slatConstructionType: 'box' })).toBe('box');
    // A climbStep explicitly set to wallMounted
    expect(resolvedSlatConstructionType({ tier: 'climbStep', slatConstructionType: 'wallMounted' })).toBe('wallMounted');
  });

  it('ignores undefined override (treats as absent)', () => {
    expect(resolvedSlatConstructionType({ tier: 'upper', slatConstructionType: undefined })).toBe('wallMounted');
  });
});

describe('defaultSlatCount', () => {
  it('returns 3 for box construction', () => {
    expect(defaultSlatCount('box')).toBe(3);
  });

  it('returns 6 for wallMounted construction', () => {
    expect(defaultSlatCount('wallMounted')).toBe(6);
  });
});

describe('defaultRearVentilation', () => {
  it('returns 25mm for upper tier regardless of slatGap', () => {
    expect(defaultRearVentilation('upper', 10)).toBe(25);
    expect(defaultRearVentilation('upper', 12)).toBe(25);
  });

  it('returns slatGap for all other tiers', () => {
    expect(defaultRearVentilation('foot', 10)).toBe(10);
    expect(defaultRearVentilation('climbStep', 10)).toBe(10); // box type uses this as a no-op
    expect(defaultRearVentilation('accessible', 8)).toBe(8);
  });
});

describe('computeSlatDepth', () => {
  it('dispatches to wallMounted formula (matches benchDepthFromSlats)', () => {
    expect(computeSlatDepth(90, 21, 6, 10, 'wallMounted', 10))
      .toBe(benchDepthFromSlats(90, 21, 6, 10, 10));
  });

  it('dispatches to box formula (matches climbStepDepthFromSlats)', () => {
    expect(computeSlatDepth(90, 21, 3, 10, 'box'))
      .toBe(climbStepDepthFromSlats(90, 21, 3, 10));
  });

  it('uses slatGap as rearVentilation fallback for wallMounted when rearVentilation is omitted', () => {
    expect(computeSlatDepth(90, 21, 6, 10, 'wallMounted'))
      .toBe(benchDepthFromSlats(90, 21, 6, 10, 10)); // rearVentilation = slatGap = 10
  });
});

describe('computeSlatCountFromDepth', () => {
  it('dispatches to wallMounted inverse (matches slatCountFromDepth)', () => {
    expect(computeSlatCountFromDepth(631, 90, 21, 10, 'wallMounted', 10))
      .toBe(slatCountFromDepth(631, 90, 21, 10, 10));
  });

  it('dispatches to box inverse (matches slatCountFromClimbStepDepth)', () => {
    expect(computeSlatCountFromDepth(352, 90, 21, 10, 'box'))
      .toBe(slatCountFromClimbStepDepth(352, 90, 21, 10));
  });

  it('round-trips with computeSlatDepth for both construction types', () => {
    for (const type of ['wallMounted', 'box'] as const) {
      const depth = computeSlatDepth(90, 21, 4, 10, type, 10);
      expect(computeSlatCountFromDepth(depth, 90, 21, 10, type, 10)).toBe(4);
    }
  });
});

// ── Slat depth calculator — wall-mounted benches ─────────────────────────────

describe('benchDepthFromSlats', () => {
  it('matches the Slow Folk upper/foot bench drawing (6 slats, 90mm face, 21mm fascia, 10mm gap)', () => {
    // Layout back→front: 10 | 90 | 10 | 90 | 10 | 90 | 10 | 90 | 10 | 90 | 10 | 90 | 10 | 21
    // = rearVent + N×(faceWidth+gap) + thickness = 10 + 6×(90+10) + 21 = 631mm
    expect(benchDepthFromSlats(90, 21, 6, 10, 10)).toBe(631);
  });

  it('handles a single slat', () => {
    // 10 + 1×(90+10) + 21 = 131mm
    expect(benchDepthFromSlats(90, 21, 1, 10, 10)).toBe(131);
  });

  it('applies 25mm rear ventilation gap for upper tier', () => {
    // 25 + 6×(90+10) + 21 = 646mm
    expect(benchDepthFromSlats(90, 21, 6, 10, 25)).toBe(646);
  });

  it('is symmetric with slatCountFromDepth (round-trip)', () => {
    const depth = benchDepthFromSlats(90, 21, 5, 10, 10);
    expect(slatCountFromDepth(depth, 90, 21, 10, 10)).toBe(5);
  });
});

describe('slatCountFromDepth', () => {
  it('recovers 6 slats from a 631mm wall-mounted bench', () => {
    expect(slatCountFromDepth(631, 90, 21, 10, 10)).toBe(6);
  });

  it('returns at least 1 slat for very shallow depths', () => {
    expect(slatCountFromDepth(30, 90, 21, 10, 10)).toBe(1);
  });
});

// ── Slat depth calculator — climb step (box construction) ────────────────────

describe('climbStepDepthFromSlats', () => {
  it('matches the Slow Folk climb step drawing (3 slats, 90mm face, 21mm side, 10mm gap)', () => {
    // Layout: 21 | 10 | 90 | 10 | 90 | 10 | 90 | 10 | 21
    // = 2×thickness + (N+1)×gap + N×faceWidth = 2×21 + 4×10 + 3×90 = 352mm
    expect(climbStepDepthFromSlats(90, 21, 3, 10)).toBe(352);
  });

  it('scales correctly with different slat counts', () => {
    // 2 slats: 2×21 + 3×10 + 2×90 = 42+30+180 = 252mm
    expect(climbStepDepthFromSlats(90, 21, 2, 10)).toBe(252);
    // 4 slats: 2×21 + 5×10 + 4×90 = 42+50+360 = 452mm
    expect(climbStepDepthFromSlats(90, 21, 4, 10)).toBe(452);
  });

  it('is symmetric with slatCountFromClimbStepDepth (round-trip)', () => {
    const depth = climbStepDepthFromSlats(90, 21, 3, 10);
    expect(slatCountFromClimbStepDepth(depth, 90, 21, 10)).toBe(3);
  });
});

describe('slatCountFromClimbStepDepth', () => {
  it('recovers 3 slats from the 352mm Slow Folk climb step', () => {
    expect(slatCountFromClimbStepDepth(352, 90, 21, 10)).toBe(3);
  });

  it('returns at least 1 slat for very shallow depths', () => {
    expect(slatCountFromClimbStepDepth(30, 90, 21, 10)).toBe(1);
  });
});

// ── Stock yield ───────────────────────────────────────────────────────────────

describe('slatYieldPerBoard', () => {
  it('calculates cuts and offcut for a 2.4m board at 631mm depth', () => {
    const y = slatYieldPerBoard(631, 2.4);
    expect(y.cutsPerBoard).toBe(3);           // floor(2400/631) = 3
    expect(y.offcutMm).toBe(2400 - 3 * 631); // 507mm
  });

  it('calculates cuts and offcut for a 3.6m board at 631mm depth', () => {
    const y = slatYieldPerBoard(631, 3.6);
    expect(y.cutsPerBoard).toBe(5);           // floor(3600/631) = 5
    expect(y.offcutMm).toBe(3600 - 5 * 631); // 445mm
  });

  it('climb step: 352mm depth into a 2.4m board', () => {
    const y = slatYieldPerBoard(352, 2.4);
    expect(y.cutsPerBoard).toBe(6);           // floor(2400/352) = 6
    expect(y.offcutMm).toBe(2400 - 6 * 352); // 288mm
  });

  it('returns zero cuts when bench is deeper than stock board', () => {
    const y = slatYieldPerBoard(2500, 2.4);
    expect(y.cutsPerBoard).toBe(0);
    expect(y.wastePercent).toBe(100);
  });

  it('returns zero offcut when depth divides evenly', () => {
    // 2400 / 600 = 4 exact
    const y = slatYieldPerBoard(600, 2.4);
    expect(y.cutsPerBoard).toBe(4);
    expect(y.offcutMm).toBe(0);
    expect(y.wastePercent).toBe(0);
  });
});
