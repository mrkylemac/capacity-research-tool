interface ForecastData {
  pricingBreakeven: Record<string, number | string>;
  venueCapacity: Record<string, number | string>;
  cashFlow: Array<{ month: string; forecast: number }>;
  lastUpdated: string;
}

function parseCSV(csv: string): string[][] {
  const lines = csv.trim().split('\n');
  return lines.map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

function parseSheetData(data: string[][]): Record<string, number | string> {
  const result: Record<string, number | string> = {};
  
  data.forEach((row) => {
    if (row.length >= 2 && row[0] && row[1]) {
      const key = String(row[0]).trim();
      const value = row[1];
      
      const numValue = parseFloat(String(value).replace(/[,$%]/g, ''));
      result[key] = isNaN(numValue) ? value : numValue;
    }
  });
  
  return result;
}

function parseCashFlow(data: string[][]): Array<{ month: string; forecast: number }> {
  if (data.length < 2) return [];
  
  const headers = data[0];
  const monthIdx = headers.findIndex(h => h?.toLowerCase().includes('month'));
  const forecastIdx = headers.findIndex(h => 
    h?.toLowerCase().includes('forecast') || 
    h?.toLowerCase().includes('projected') ||
    h?.toLowerCase().includes('revenue')
  );
  
  if (monthIdx === -1 || forecastIdx === -1) {
    console.warn('Could not find month or forecast columns in Cash Flow sheet');
    return [];
  }
  
  return data.slice(1).map(row => ({
    month: String(row[monthIdx] || '').trim(),
    forecast: parseFloat(String(row[forecastIdx] || '0').replace(/[,$]/g, '')) || 0,
  })).filter(item => item.month && item.forecast > 0);
}

async function fetchSheetAsCSV(spreadsheetId: string, sheetName: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet "${sheetName}": ${response.statusText}`);
  }
  
  return await response.text();
}

export async function fetchForecastFromSheets(spreadsheetId: string): Promise<ForecastData> {
  const pricingCSV = await fetchSheetAsCSV(spreadsheetId, 'Pricing & Breakeven');
  const pricingData = parseCSV(pricingCSV);
  
  const capacityCSV = await fetchSheetAsCSV(spreadsheetId, 'Venue Capacity');
  const capacityData = parseCSV(capacityCSV);
  
  const cashFlowCSV = await fetchSheetAsCSV(spreadsheetId, 'Cash Flow (Monthly)');
  const cashFlowData = parseCSV(cashFlowCSV);
  
  return {
    pricingBreakeven: parseSheetData(pricingData),
    venueCapacity: parseSheetData(capacityData),
    cashFlow: parseCashFlow(cashFlowData),
    lastUpdated: new Date().toISOString(),
  };
}
