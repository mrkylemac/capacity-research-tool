import { derivePriceTiers, formatPrice } from '@/lib/priceTiers';

const priced = (price: number, count: number) =>
  Array.from({ length: count }, () => ({ fixedTicketPrice: price }));

describe('formatPrice', () => {
  it('leaves whole dollars clean', () => {
    expect(formatPrice(25)).toBe('$25');
  });

  // Rounding 25.55 to "$26" made it read as a different price point from
  // "$25", when it is the same product recorded on a different platform.
  it('keeps cents when a price has them', () => {
    expect(formatPrice(25.55)).toBe('$25.55');
    expect(formatPrice(66.5)).toBe('$66.50');
  });
});

describe('derivePriceTiers', () => {
  it('returns nothing when no price is published', () => {
    expect(derivePriceTiers([])).toEqual([]);
    expect(derivePriceTiers(priced(0, 10))).toEqual([]);
  });

  it('leaves unpriced sessions out rather than counting them as a $0 tier', () => {
    const tiers = derivePriceTiers([...priced(0, 90), ...priced(25, 10)]);
    expect(tiers).toHaveLength(1);
    expect(tiers[0]).toMatchObject({ price: 25, pct: 100 });
  });

  // The real Sauna Goose distribution. Ordering by price and taking the top
  // five showed $98/$67/$65/$56/$55, which is 1.3% of its listings, and hid
  // $25.55 and $35.78, which are 72% of them.
  it('orders by how common a price is, not how expensive', () => {
    const tiers = derivePriceTiers([
      ...priced(25.55, 596),
      ...priced(35.78, 270),
      ...priced(25, 192),
      ...priced(35, 122),
      ...priced(66.5, 5),
      ...priced(65, 4),
      ...priced(56.25, 4),
      ...priced(97.5, 2),
      ...priced(55, 1),
    ]);

    expect(tiers.map(t => t.price).slice(0, 5)).toEqual([25.55, 35.78, 25, 35, 66.5]);
    // The five shown now cover the bulk of the listings, not a rounding error.
    expect(tiers.slice(0, 5).reduce((sum, t) => sum + t.pct, 0)).toBeGreaterThan(98);
  });

  it('scales bars against the most common tier, not the dearest', () => {
    const tiers = derivePriceTiers([...priced(25, 80), ...priced(200, 20)]);

    expect(tiers[0]).toMatchObject({ price: 25, pct: 80, maxPct: 80 });
    // 20/80 of the top bar. Previously maxPct came from the $200 tier, so the
    // rarest price drew a full-width bar and the common one overflowed.
    expect((tiers[1].pct / tiers[1].maxPct) * 100).toBeCloseTo(25);
  });

  it('breaks ties by price descending so the order is stable', () => {
    const tiers = derivePriceTiers([...priced(30, 5), ...priced(50, 5), ...priced(40, 5)]);
    expect(tiers.map(t => t.price)).toEqual([50, 40, 30]);
  });

  it('does not merge prices that differ only by cents', () => {
    const tiers = derivePriceTiers([...priced(25, 3), ...priced(25.55, 2)]);
    expect(tiers.map(t => t.price)).toEqual([25, 25.55]);
  });

  it('percentages add up to 100', () => {
    const tiers = derivePriceTiers([...priced(25, 7), ...priced(35, 2), ...priced(45, 1)]);
    expect(tiers.reduce((sum, t) => sum + t.pct, 0)).toBeCloseTo(100);
  });
});
