interface ForecastData {
  pricingBreakeven: Record<string, number | string>;
  venueCapacity: Record<string, number | string>;
  cashFlow: Array<{ month: string; forecast: number }>;
  lastUpdated: string;
}

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function fetchForecastFromSheets(spreadsheetId: string): Promise<ForecastData> {
  const url = `${SHEETS_API}/${spreadsheetId}/values:batchGet?ranges=PricingBreakeven&ranges=VenueCapacity&ranges=CashFlow&key=${import.meta.env.VITE_GOOGLE_SHEETS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);

  const json = await res.json();
  const [pricingRange, capacityRange, cashFlowRange] = json.valueRanges ?? [];

  const toRecord = (rows: string[][] = []): Record<string, number | string> => {
    const record: Record<string, number | string> = {};
    for (const [key, val] of rows) {
      if (!key) continue;
      const num = Number(val);
      record[key] = isNaN(num) ? val : num;
    }
    return record;
  };

  const cashFlow = (cashFlowRange?.values?.slice(1) ?? []).map(([month, forecast]: string[]) => ({
    month,
    forecast: Number(forecast) || 0,
  }));

  return {
    pricingBreakeven: toRecord(pricingRange?.values),
    venueCapacity: toRecord(capacityRange?.values),
    cashFlow,
    lastUpdated: new Date().toISOString(),
  };
}
