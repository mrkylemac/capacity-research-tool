interface ForecastData {
  pricingBreakeven: Record<string, number | string>;
  venueCapacity: Record<string, number | string>;
  cashFlow: Array<{ month: string; forecast: number }>;
  lastUpdated: string;
}

export async function fetchForecastFromSheets(spreadsheetId: string): Promise<ForecastData> {
  const apiUrl = `/api/fetch-forecast?spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast data: ${response.statusText}`);
  }
  return response.json() as Promise<ForecastData>;
}
