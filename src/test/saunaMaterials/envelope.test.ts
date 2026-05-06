import {
  envelopeAreaM2,
  fixingCounts,
  foilTapeLM,
  insulationCeilingM2,
  insulationWallM2,
  vapourBarrierM2,
} from '@/lib/saunaMaterials/envelope';
import { VAPOUR_BARRIER_OVERLAP } from '@/lib/saunaMaterials/conversions';
import { SLOW_FOLK_PROJECT } from './slowfolk-fixture';

describe('insulationWallM2 — Slow Folk', () => {
  it('returns gross walls minus openings (~32 m²)', () => {
    const m2 = insulationWallM2(SLOW_FOLK_PROJECT);
    expect(m2).toBeGreaterThan(38);
    expect(m2).toBeLessThan(46);
  });
});

describe('insulationCeilingM2 — Slow Folk', () => {
  it('returns full ceiling area', () => {
    const m2 = insulationCeilingM2(SLOW_FOLK_PROJECT);
    expect(m2).toBeCloseTo(5.518 * 3.83, 2);
  });
});

describe('vapourBarrierM2 — Slow Folk', () => {
  it('applies the 10% overlap factor on envelope area', () => {
    const env = envelopeAreaM2(SLOW_FOLK_PROJECT);
    expect(vapourBarrierM2(SLOW_FOLK_PROJECT)).toBeCloseTo(env * VAPOUR_BARRIER_OVERLAP, 3);
  });
});

describe('foilTapeLM — Slow Folk', () => {
  it('returns a positive value with sane order of magnitude', () => {
    const lm = foilTapeLM(SLOW_FOLK_PROJECT);
    expect(lm).toBeGreaterThan(20);
    expect(lm).toBeLessThan(200);
  });
});

describe('fixingCounts', () => {
  it('multiplies clad area by density for cladding fixings', () => {
    const fx = fixingCounts(SLOW_FOLK_PROJECT, {
      wallNet: 30,
      ceilingNet: 20,
      benchFace: 25,
    });
    expect(fx.cladding).toBeCloseTo(50 * 20, 3);
    expect(fx.bench).toBeCloseTo(25 * 8, 3);
  });
});
