/**
 * Price distribution for venues with no pricing config in `src/config/api.ts`.
 *
 * Most venues have no config, so this derived view is what the report shows for
 * them. It answers one question: what does this venue mostly charge?
 *
 * That means ordering by how common a price is, not by how expensive it is.
 * Ordering by price and taking the top few surfaced whichever tiers happened to
 * be dearest — Sauna Goose showed five prices covering 1.3% of its listings and
 * hid the two that make up 87% of them.
 */
import type { MomenceSession } from '@/types/momence';

export interface PriceTier {
  price: number;
  /** Share of priced listings at this price, 0 to 100. */
  pct: number;
  /** Share held by the most common tier, so bars can be drawn relative to it. */
  maxPct: number;
}

/** Only show cents when a price has them: $25 stays $25, $25.55 keeps its cents. */
export function formatPrice(price: number): string {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

export function derivePriceTiers(sessions: Pick<MomenceSession, 'fixedTicketPrice'>[]): PriceTier[] {
  const counts = new Map<number, number>();

  for (const session of sessions) {
    // A zero or missing price means the price is not published, not that the
    // session is free, so it is left out rather than counted as a $0 tier.
    if (session.fixedTicketPrice > 0) {
      counts.set(session.fixedTicketPrice, (counts.get(session.fixedTicketPrice) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return [];

  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  // Most common first. Price descending is the tie-break so equally common
  // tiers keep a stable, predictable order.
  const sorted = Array.from(counts.entries())
    .sort(([priceA, countA], [priceB, countB]) => countB - countA || priceB - priceA);

  const maxPct = (sorted[0][1] / total) * 100;

  return sorted.map(([price, count]) => ({
    price,
    pct: (count / total) * 100,
    maxPct,
  }));
}
