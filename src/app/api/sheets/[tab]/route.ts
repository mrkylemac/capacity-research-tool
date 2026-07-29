import { NextRequest, NextResponse } from 'next/server';
import {
  fetchSheetData,
  readCachedTabData,
  writeCachedTabData,
  readSampleData,
  parseSheetRows,
  computeCapExSummary,
} from '@/lib/sheetsClient';
import type { TrackerApiResponse } from '@/types/tracker';
import { requireApprovedUserForApi } from '@/lib/auth-guard';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tab: string }> },
): Promise<NextResponse> {
  const { error: authError } = await requireApprovedUserForApi();
  if (authError) return authError;

  const { tab } = await params;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey        = process.env.GOOGLE_SHEETS_API_KEY;

  let usingDemo  = false;
  let usingCache = false;

  // 1. Try live Sheets API
  let sheetData: Awaited<ReturnType<typeof fetchSheetData>> | null = null;
  if (spreadsheetId && apiKey) {
    try {
      sheetData = await fetchSheetData(spreadsheetId, tab, apiKey);
      writeCachedTabData(tab, sheetData);
    } catch {
      // Fall through to cache
    }
  }

  // 2. Fall back to filesystem cache
  if (!sheetData) {
    sheetData = readCachedTabData(tab);
    if (sheetData) usingCache = true;
  }

  // 3. Fall back to bundled sample data
  if (!sheetData) {
    sheetData = readSampleData();
    if (sheetData) usingDemo = true;
  }

  if (!sheetData) {
    return NextResponse.json({ error: 'No data available' }, { status: 404 });
  }

  const items   = parseSheetRows(sheetData);
  const summary = computeCapExSummary(items);

  const response: TrackerApiResponse = { items, summary, usingDemo, usingCache };
  return NextResponse.json(response);
}
