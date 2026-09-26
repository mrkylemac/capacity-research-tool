import { NextResponse } from 'next/server';
import { fetchSpreadsheetTabs } from '@/lib/sheetsClient';
import { requireApprovedUserForApi } from '@/lib/auth-guard';

export async function GET(): Promise<NextResponse> {
  const { error: authError } = await requireApprovedUserForApi();
  if (authError) return authError;

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey        = process.env.GOOGLE_SHEETS_API_KEY;

  if (!spreadsheetId || !apiKey) {
    return NextResponse.json({
      tabs: [{ name: 'CapEx', sheetId: 0, index: 0 }],
      configured: false,
    });
  }

  try {
    const tabs = await fetchSpreadsheetTabs(spreadsheetId, apiKey);
    return NextResponse.json({ tabs, configured: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
