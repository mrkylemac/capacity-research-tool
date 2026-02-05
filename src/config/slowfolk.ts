// Slow Folk Model Targets
// These are the assumptions from the 2026 financial model to benchmark against

export const SLOW_FOLK_TARGETS = {
  // Volume targets
  weeklyVisits: 686,
  breakeven: {
    operating: 199,    // Operating-only breakeven
    combined: 282,     // Operating + capital
    profit: 324,       // Combined + profit target
  },

  // Occupancy targets
  occupancy: {
    current: 0.35,     // Starting/conservative occupancy
    target: 0.60,      // Healthy operating occupancy
  },

  // Demand distribution
  peakShare: 0.59,
  offPeakShare: 0.34,
  shoulderShare: 0.07,
  weekdayShare: 0.63,
  weekendShare: 0.37,

  // Revenue
  arpv: 34.81,         // Average Revenue Per Visit
  cogsPerVisit: 2.67,
  contributionMargin: 32.14,

  // Operating structure
  weeklyHours: {
    offPeak: 22,
    peak: 38.5,
    total: 60.5,
  },

  // Capacity
  capacity: {
    weekdayPeak: 150,  // Visits per weekday at peak
    weekendPeak: 170,  // Visits per weekend day at peak
  },

  // Session structure
  sessionDuration: 75, // minutes
  concurrentSeats: 15,

  // Membership
  members: {
    active: 69,
    maxCapacity: 137,
    visitsPerWeek: 1.5,
  },

  // Sales mix
  salesMix: {
    casual: 0.50,
    membership: 0.30,
    packRedemption: 0.20,
  },
} as const;

export type SlowFolkTargets = typeof SLOW_FOLK_TARGETS;
