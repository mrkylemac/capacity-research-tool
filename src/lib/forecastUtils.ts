import forecastData from '@/data/forecast.json';

interface RawForecast {
  pricingBreakeven: Record<string, number | string>;
  venueCapacity: Record<string, number | string>;
  cashFlow: Array<{ month: string; forecast: number }>;
  lastUpdated: string;
}

const raw = forecastData as RawForecast;

function get(key: string, source: Record<string, number | string>, fallback: number): number {
  const val = source[key];
  if (val == null) return fallback;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,$%]/g, ''));
  return isNaN(n) ? fallback : n;
}

function getFromPricing(key: string, fallback: number): number {
  return get(key, raw.pricingBreakeven, fallback);
}

function getFromCapacity(key: string, fallback: number): number {
  return get(key, raw.venueCapacity, fallback);
}

/** Unified Slow Folk targets from Google Sheets (forecast.json). Single source of truth. */
export const forecastTargets = {
  weeklyVisits: getFromPricing('Weekly Visits', 345),
  monthlyRevenue: getFromPricing('Monthly Revenue', 51993.83),
  arpv: getFromPricing('ARPV', 34.81),
  venueOccupancy: getFromCapacity('Venue Occupancy %', 35),
  peakOccupancy: getFromCapacity('Peak Occupancy %', 59),
  sessionsPerWeek: getFromCapacity('Sessions Per Week', 46.5),
  breakeven: {
    operating: getFromPricing('Operating Only', 27738),
    combined: getFromPricing('Combined', 39251),
    profit: getFromPricing('Combined + Profit', 45138),
  },
} as const;

export const cashFlow = raw.cashFlow;
export const forecastLastUpdated = raw.lastUpdated;

export function hasForecastData(): boolean {
  return raw.cashFlow.length > 0 ||
    Object.keys(raw.pricingBreakeven).length > 0 ||
    Object.keys(raw.venueCapacity).length > 0;
}
