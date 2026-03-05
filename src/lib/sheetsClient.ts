/**
 * Google Sheets API helper — server-side only (uses node:fs).
 * Pure computation helpers (parseSheetRows, computeCapExSummary) live here too
 * but are called only from API routes.
 */
import fs from 'node:fs';
import path from 'node:path';
import type {
  CostLineItem,
  CapExSummary,
  CategorySummary,
  FinancialSignal,
  SheetData,
} from '@/types/tracker';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TRACKER_DIR = path.join(process.cwd(), 'src', 'data', 'tracker');

// ── Column mapping ───────────────────────────────────────────────────────────

function mapCol(headers: string[], ...candidates: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const c of candidates) {
    const i = lower.indexOf(c.toLowerCase().trim());
    if (i !== -1) return i;
  }
  return -1;
}

function parseAmount(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[$,\s%]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseStatus(val: string | undefined): CostLineItem['status'] {
  const v = (val ?? '').toLowerCase().trim();
  if (v === 'paid') return 'paid';
  if (v.startsWith('invoice')) return 'invoiced';
  if (v.startsWith('quote') || v === 'quoted') return 'quoted';
  return 'forecast';
}

// ── Parse raw sheet rows into typed items ────────────────────────────────────

export function parseSheetRows(data: SheetData): CostLineItem[] {
  const h = data.headers;
  const categoryCol  = mapCol(h, 'category', 'type', 'cat', 'area', 'section');
  const descCol      = mapCol(h, 'description', 'item', 'line item', 'detail', 'name', 'work');
  const supplierCol  = mapCol(h, 'supplier', 'vendor', 'provider', 'contractor', 'company', 'subcontractor');
  const forecastCol  = mapCol(h, 'forecast', 'budget', 'budgeted', 'estimate', 'estimated', 'quote amount');
  const actualCol    = mapCol(h, 'actual', 'paid', 'cost', 'invoice amount', 'amount paid', 'spent', 'actuals');
  const statusCol    = mapCol(h, 'status', 'state', 'stage', 'payment status');
  const dateCol      = mapCol(h, 'date', 'invoice date', 'payment date', 'paid date', 'due date');
  const notesCol     = mapCol(h, 'notes', 'note', 'comment', 'comments', 'memo', 'remarks');

  return data.rows
    .filter(row => Object.values(row).some(v => v?.trim()))
    .map((row, idx) => {
      const forecast = parseAmount(forecastCol >= 0 ? row[h[forecastCol]] : undefined);
      const actual   = parseAmount(actualCol   >= 0 ? row[h[actualCol]]   : undefined);
      return {
        id:             `item-${idx}`,
        category:       categoryCol >= 0 ? (row[h[categoryCol]]?.trim() || 'Uncategorised') : 'Uncategorised',
        description:    descCol     >= 0 ? (row[h[descCol]]?.trim()     || '') : '',
        supplier:       supplierCol >= 0 ? (row[h[supplierCol]]?.trim() || undefined) : undefined,
        forecastAmount: forecast,
        actualAmount:   actual,
        variance:       forecast - actual,
        status:         parseStatus(statusCol >= 0 ? row[h[statusCol]] : undefined),
        date:           dateCol  >= 0 ? (row[h[dateCol]]?.trim()  || undefined) : undefined,
        notes:          notesCol >= 0 ? (row[h[notesCol]]?.trim() || undefined) : undefined,
      } satisfies CostLineItem;
    });
}

// ── Compute summary from parsed items ────────────────────────────────────────

export function computeCapExSummary(items: CostLineItem[]): CapExSummary {
  const totalBudget    = items.reduce((s, i) => s + i.forecastAmount, 0);
  const totalSpent     = items.filter(i => i.status === 'paid').reduce((s, i) => s + i.actualAmount, 0);
  const totalCommitted = items
    .filter(i => i.status === 'invoiced' || i.status === 'quoted')
    .reduce((s, i) => s + (i.actualAmount > 0 ? i.actualAmount : i.forecastAmount), 0);
  const totalRemaining = totalBudget - totalSpent - totalCommitted;
  const burnPercentage = totalBudget > 0 ? ((totalSpent + totalCommitted) / totalBudget) * 100 : 0;

  // Group by category
  const catMap = new Map<string, CostLineItem[]>();
  for (const item of items) {
    if (!catMap.has(item.category)) catMap.set(item.category, []);
    catMap.get(item.category)!.push(item);
  }

  const categories: CategorySummary[] = [];
  catMap.forEach((catItems, name) => {
    const forecastTotal = catItems.reduce((s, i) => s + i.forecastAmount, 0);
    const actualTotal   = catItems.reduce((s, i) => s + i.actualAmount,   0);
    categories.push({ name, forecastTotal, actualTotal, variance: forecastTotal - actualTotal, items: catItems });
  });

  // Generate financial signals
  const signals: FinancialSignal[] = [];

  for (const cat of categories) {
    if (cat.variance < 0) {
      const overBy = Math.abs(cat.variance);
      const pct    = cat.forecastTotal > 0 ? (overBy / cat.forecastTotal) * 100 : 100;
      signals.push({
        type: pct > 15 ? 'danger' : 'warning',
        title: `${cat.name} over budget`,
        message: `${pct.toFixed(0)}% above forecast — $${overBy.toLocaleString('en-AU')} additional investment`,
        amount: overBy,
      });
    }
  }

  if (burnPercentage > 90) {
    signals.push({
      type: 'danger',
      title: 'Budget nearly exhausted',
      message: `${burnPercentage.toFixed(0)}% committed or spent — only $${Math.max(0, totalRemaining).toLocaleString('en-AU')} remaining`,
      amount: totalRemaining,
    });
  } else if (burnPercentage > 75) {
    signals.push({
      type: 'warning',
      title: 'High burn rate',
      message: `${burnPercentage.toFixed(0)}% of budget consumed — $${totalRemaining.toLocaleString('en-AU')} still available`,
      amount: totalRemaining,
    });
  }

  const totalActuals = items.reduce((s, i) => s + i.actualAmount, 0);
  const totalVariance = totalBudget - totalActuals;
  if (totalVariance > 0 && burnPercentage > 40) {
    signals.push({
      type: 'success',
      title: 'Tracking under forecast',
      message: `Actuals are $${totalVariance.toLocaleString('en-AU')} below combined forecast`,
      amount: totalVariance,
    });
  }

  return { totalBudget, totalSpent, totalCommitted, totalRemaining, burnPercentage, categories, signals, items };
}

// ── Google Sheets API v4 ─────────────────────────────────────────────────────

export async function fetchSheetData(
  spreadsheetId: string,
  tabName: string,
  apiKey: string,
): Promise<SheetData> {
  const range = `${encodeURIComponent(tabName)}!A1:Z1000`;
  const url   = `${SHEETS_API}/${spreadsheetId}/values/${range}?key=${apiKey}`;
  const res   = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${res.statusText}`);

  const json = await res.json() as { values?: string[][] };
  const rows  = json.values ?? [];
  if (rows.length === 0) return { tab: tabName, headers: [], rows: [] };

  const headers = rows[0].map(h => h.trim());
  const data: Record<string, string>[] = rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });

  return { tab: tabName, headers, rows: data };
}

export async function fetchSpreadsheetTabs(
  spreadsheetId: string,
  apiKey: string,
): Promise<Array<{ name: string; sheetId: number; index: number }>> {
  const url = `${SHEETS_API}/${spreadsheetId}?fields=sheets.properties&key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${res.statusText}`);

  const json = await res.json() as {
    sheets?: Array<{ properties: { title: string; sheetId: number; index: number } }>
  };
  return (json.sheets ?? []).map(s => ({
    name: s.properties.title,
    sheetId: s.properties.sheetId,
    index: s.properties.index,
  }));
}

// ── File-system cache ────────────────────────────────────────────────────────

export function readCachedTabData(tab: string): SheetData | null {
  try {
    const p = path.join(TRACKER_DIR, `${tab.toLowerCase().replace(/\s+/g, '-')}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as SheetData;
  } catch { return null; }
}

export function writeCachedTabData(tab: string, data: SheetData): void {
  try {
    fs.mkdirSync(TRACKER_DIR, { recursive: true });
    const p = path.join(TRACKER_DIR, `${tab.toLowerCase().replace(/\s+/g, '-')}.json`);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  } catch { /* non-fatal */ }
}

export function readSampleData(): SheetData | null {
  try {
    const p = path.join(TRACKER_DIR, 'sample-capex.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as SheetData;
  } catch { return null; }
}
