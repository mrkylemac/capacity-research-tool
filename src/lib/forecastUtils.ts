import forecastData from '@/data/forecast.json';

export const forecastTargets = {
  weeklyVisits: Number(forecastData.pricingBreakeven['Weekly Visits']) || 345,
  venueOccupancy: Number(forecastData.venueCapacity['Venue Occupancy %']) || 35,
  arpv: Number(forecastData.pricingBreakeven['ARPV']) || 34.81,
  monthlyRevenue: Number(forecastData.pricingBreakeven['Monthly Revenue']) || 51993.83,
  breakeven: {
    operating: Number(forecastData.pricingBreakeven['Operating Only']) || 27738,
    combined: Number(forecastData.pricingBreakeven['Combined']) || 39251,
    profit: Number(forecastData.pricingBreakeven['Combined + Profit']) || 45138,
  },
};

export const hasForecastData =
  Object.keys(forecastData.pricingBreakeven).length > 0 ||
  Object.keys(forecastData.venueCapacity).length > 0 ||
  forecastData.cashFlow.length > 0;

export const forecastLastUpdated: string | null = forecastData.lastUpdated || null;
