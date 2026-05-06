import { generateBom } from '@/lib/saunaMaterials/bom';
import { SEED_LIBRARY } from '@/lib/saunaMaterials/seedLibrary';
import { SLOW_FOLK_PROJECT } from './slowfolk-fixture';

const FROZEN_TIMESTAMP = '2026-05-05T00:00:00.000Z';

describe('generateBom — Slow Folk fixture', () => {
  const bom = generateBom(SLOW_FOLK_PROJECT, SEED_LIBRARY, FROZEN_TIMESTAMP);

  it('returns one line item per category needed for the build', () => {
    const ids = bom.lineItems.map(li => li.id);
    expect(ids).toContain('wall-cladding');
    expect(ids).toContain('ceiling-cladding');
    expect(ids).toContain('bench-slat');
    expect(ids).toContain('bench-framing');
    expect(ids).toContain('batten');
    expect(ids).toContain('wall-insulation');
    expect(ids).toContain('ceiling-insulation');
    expect(ids).toContain('vapour-barrier');
    expect(ids).toContain('foil-tape');
    expect(ids).toContain('cladding-fixings');
    expect(ids).toContain('bench-fixings');
  });

  it('wall cladding lineal metres land in the spec sense-check band (350–400 lm)', () => {
    const wall = bom.lineItems.find(li => li.id === 'wall-cladding')!;
    expect(wall.unit).toBe('lm');
    expect(wall.quantity).toBeGreaterThanOrEqual(330);
    expect(wall.quantity).toBeLessThanOrEqual(420);
  });

  it('ceiling cladding lineal metres land near 220 lm', () => {
    const ceil = bom.lineItems.find(li => li.id === 'ceiling-cladding')!;
    expect(ceil.unit).toBe('lm');
    expect(ceil.quantity).toBeGreaterThanOrEqual(200);
    expect(ceil.quantity).toBeLessThanOrEqual(260);
  });

  it('bench slat lineal metres are in a sensible range', () => {
    const slat = bom.lineItems.find(li => li.id === 'bench-slat')!;
    expect(slat.unit).toBe('lm');
    expect(slat.quantity).toBeGreaterThanOrEqual(150);
    expect(slat.quantity).toBeLessThanOrEqual(350);
  });

  it('vapour barrier resolves to 3 rolls', () => {
    const vb = bom.lineItems.find(li => li.id === 'vapour-barrier')!;
    expect(vb.unit).toBe('roll');
    expect(vb.quantity).toBe(3);
  });

  it('totals.timberLM is the sum of all timber line items', () => {
    const sum = bom.lineItems
      .filter(li => li.category === 'timber')
      .reduce((s, li) => s + li.quantity, 0);
    expect(bom.totals.timberLM).toBeCloseTo(Math.round(sum * 10) / 10, 1);
  });

  it('estimatedTotalCost is null when no profile/material has prices', () => {
    expect(bom.totals.estimatedTotalCost).toBeNull();
  });

  it('emits no clamped-area warnings on the Slow Folk geometry', () => {
    const codes = bom.warnings.map(w => w.code);
    expect(codes).not.toContain('wall-area-clamped');
    expect(codes).not.toContain('missing-profile');
    expect(codes).not.toContain('missing-material');
  });

  it('preserves the project + generatedAt for traceability', () => {
    expect(bom.generatedAt).toBe(FROZEN_TIMESTAMP);
    expect(bom.project.id).toBe(SLOW_FOLK_PROJECT.id);
  });
});
