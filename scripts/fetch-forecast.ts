import * as fs from 'fs';
import * as path from 'path';

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
      
      // Try to parse as number
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

async function fetchForecastData(spreadsheetId: string): Promise<ForecastData> {
  console.log('Fetching Pricing & Breakeven...');
  const pricingCSV = await fetchSheetAsCSV(spreadsheetId, 'Pricing & Breakeven');
  const pricingData = parseCSV(pricingCSV);
  
  console.log('Fetching Venue Capacity...');
  const capacityCSV = await fetchSheetAsCSV(spreadsheetId, 'Venue Capacity');
  const capacityData = parseCSV(capacityCSV);
  
  console.log('Fetching Cash Flow (Monthly)...');
  const cashFlowCSV = await fetchSheetAsCSV(spreadsheetId, 'Cash Flow (Monthly)');
  const cashFlowData = parseCSV(cashFlowCSV);
  
  return {
    pricingBreakeven: parseSheetData(pricingData),
    venueCapacity: parseSheetData(capacityData),
    cashFlow: parseCashFlow(cashFlowData),
    lastUpdated: new Date().toISOString(),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const spreadsheetId = args[0];
  
  if (!spreadsheetId) {
    console.error('Usage: tsx scripts/fetch-forecast.ts <SPREADSHEET_ID>');
    console.error('Example: tsx scripts/fetch-forecast.ts 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    process.exit(1);
  }
  
  try {
    console.log(`Fetching forecast data from spreadsheet: ${spreadsheetId}\n`);
    const data = await fetchForecastData(spreadsheetId);
    
    const outputPath = path.join(process.cwd(), 'src', 'data', 'forecast.json');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`\n✓ Forecast data saved to: ${outputPath}`);
    console.log(`✓ Last updated: ${data.lastUpdated}`);
    console.log(`✓ Pricing metrics: ${Object.keys(data.pricingBreakeven).length}`);
    console.log(`✓ Capacity metrics: ${Object.keys(data.venueCapacity).length}`);
    console.log(`✓ Cash flow entries: ${data.cashFlow.length}`);
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    process.exit(1);
  }
}

main();
