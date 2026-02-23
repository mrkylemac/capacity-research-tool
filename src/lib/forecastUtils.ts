import forecastData from '@/data/forecast.json';

export const forecastTargets = {
  weeklyVisits: Number(forecastData.pricingBreakeven['Weekly Visits']) || 0,
  venueOccupancy: Number(forecastData.venueCapacity['Venue Occupancy %']) || 0,
  arpv: Number(forecastData.pricingBreakeven['ARPV']) || 0,
  monthlyRevenue: Number(forecastData.pricingBreakeven['Monthly Revenue']) || 0,
  breakeven: {
    operating: Number(forecastData.pricingBreakeven['Operating Only']) || 0,
    combined: Number(forecastData.pricingBreakeven['Combined']) || 0,
    profit: Number(forecastData.pricingBreakeven['Combined + Profit']) || 0,
  },
};

export function hasForecastData(): boolean {
  return Object.keys(forecastData.pricingBreakeven).length > 0 ||
    Object.keys(forecastData.venueCapacity).length > 0 ||
    forecastData.cashFlow.length > 0;
}

export const forecastLastUpdated: string = forecastData.lastUpdated;
