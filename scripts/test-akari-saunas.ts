#!/usr/bin/env tsx
/**
 * Test script: Probes whether Akari Saunas data is readable as a venue.
 *
 * Two data sources are tested:
 *   A) Glofox API — attempts to discover the namespace and fetch events
 *   B) Google Sheets — fetches the live occupancy feed Akari publishes
 *
 * Run:  npx tsx scripts/test-akari-saunas.ts
 */

// ── Akari Saunas configuration ───────────────────────────────────────────────

const BRANCH_ID = '67cf4fe8ef346c3817003b8f';
const GLOFOX_API = 'https://api.glofox.com/2.0';

const SHEETS_SPREADSHEET_ID = '1yrIBz86iBFtin1_glrHsl0g05raVsisvbgIYaAYtin4';
const SHEETS_API_KEY = 'AIzaSyB_CloyomHHpxfqBS8jJFBeIiR_MjE4gAQ';
const SHEETS_RANGE = 'SingleRow!A2:E2';

// Namespace candidates to try when discovering the Glofox guest token
const NAMESPACE_CANDIDATES = [
  'akarisauna',
  'akari',
  'akarisaunas',
  'akarinyc',
  'akaribrooklyn',
  'akaribk',
  BRANCH_ID,
  'akari-sauna',
  'akari-saunas',
];

// ══════════════════════════════════════════════════════════════════════════════
// Part A — Glofox API probe
// ══════════════════════════════════════════════════════════════════════════════

interface GuestTokenResponse {
  token?: string;
  user?: { _id: string; namespace: string; branch_id: string; type: string };
}

interface GlofoxEvent {
  _id: string;
  name: string;
  time_start: number;
  duration: number;
  size: number;
  booked: number;
  waiting: number;
  facility?: { name: string };
  level?: string;
}

interface GlofoxEventsResponse {
  page: number;
  limit: number;
  has_more: boolean;
  total_count: number;
  data: GlofoxEvent[];
}

async function tryGetGuestToken(namespace: string): Promise<string | null> {
  for (const body of [
    { namespace },
    { namespace, branch_id: BRANCH_ID },
  ]) {
    try {
      const res = await fetch(`${GLOFOX_API}/users/guest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data: GuestTokenResponse = await res.json();
        if (data.token) return data.token;
      }
    } catch { /* continue */ }
  }
  return null;
}

async function fetchGlofoxEvents(
  token: string,
  branchId: string,
  timezone: string,
  startDate: Date,
  endDate: Date,
  page = 1,
): Promise<GlofoxEventsResponse> {
  const url = new URL(`${GLOFOX_API}/events`);
  url.searchParams.set('start', Math.floor(startDate.getTime() / 1000).toString());
  url.searchParams.set('end', Math.floor(endDate.getTime() / 1000).toString());
  url.searchParams.set('include', 'trainers,facility,program');
  url.searchParams.set('page', page.toString());
  url.searchParams.set('limit', '100');
  url.searchParams.set('private', 'false');
  url.searchParams.set('sort_by', 'time_start');

  const res = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      'x-glofox-branch-id': branchId,
      'x-glofox-branch-timezone': timezone,
      'x-glofox-source': 'webportal',
      accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Glofox events: ${res.status} ${res.statusText}`);
  return res.json();
}

async function probeGlofox(): Promise<boolean> {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Part A — Glofox API Probe                      ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Branch ID: ${BRANCH_ID}\n`);

  // 1. Discover namespace
  let token: string | null = null;
  let namespace = '';

  for (const ns of NAMESPACE_CANDIDATES) {
    process.stdout.write(`  [namespace] ${ns} ... `);
    token = await tryGetGuestToken(ns);
    if (token) {
      namespace = ns;
      console.log('✓ token obtained');
      break;
    }
    console.log('✗');
  }

  if (!token) {
    console.log('\n  ⚠ No guest token found for any namespace candidate.');
    console.log('  To test manually, visit the Glofox portal in a browser:');
    console.log(`    https://app.glofox.com/portal/#/branch/${BRANCH_ID}/classes-day-view`);
    console.log('  Then copy the Bearer token from the Network tab.\n');
    return false;
  }

  console.log(`\n  Namespace: ${namespace}`);
  console.log(`  Token: ${token.slice(0, 40)}...\n`);

  // 2. Fetch branch info
  try {
    const res = await fetch(`${GLOFOX_API}/branches/${BRANCH_ID}`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-glofox-branch-id': BRANCH_ID,
        accept: 'application/json',
      },
    });
    if (res.ok) {
      const b = await res.json() as Record<string, unknown>;
      console.log(`  Branch name: ${b.name ?? '(unknown)'}`);
      console.log(`  Timezone:    ${b.timezone ?? '(unknown)'}`);
    }
  } catch { /* non-critical */ }

  // 3. Fetch events
  const from = new Date();
  from.setDate(from.getDate() - 90);
  const to = new Date();
  to.setDate(to.getDate() + 30);

  console.log(`\n  Fetching events: ${from.toISOString().split('T')[0]} → ${to.toISOString().split('T')[0]}`);

  const allEvents: GlofoxEvent[] = [];
  let page = 1;
  while (true) {
    const response = await fetchGlofoxEvents(token, BRANCH_ID, 'America/New_York', from, to, page);
    allEvents.push(...response.data);
    console.log(`    Page ${page}: ${response.data.length} events (total: ${allEvents.length}/${response.total_count})`);
    if (!response.has_more || page >= 50) break;
    page++;
  }

  if (allEvents.length === 0) {
    console.log('\n  ⚠ No Glofox events found in the last 90 days.');
    return false;
  }

  reportGlofoxEvents(allEvents);
  return true;
}

function reportGlofoxEvents(events: GlofoxEvent[]) {
  const nameMap = new Map<string, { count: number; cap: number; booked: number }>();
  for (const e of events) {
    const s = nameMap.get(e.name) ?? { count: 0, cap: 0, booked: 0 };
    s.count++;
    s.cap += e.size;
    s.booked += e.booked;
    nameMap.set(e.name, s);
  }

  console.log('\n  Session types:');
  for (const [name, s] of [...nameMap.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const util = s.cap > 0 ? ((s.booked / s.cap) * 100).toFixed(1) : '0';
    console.log(`    "${name}": ${s.count} sessions, ${util}% utilisation`);
  }

  const sorted = events.sort((a, b) => a.time_start - b.time_start);
  console.log(`\n  Date range: ${new Date(sorted[0].time_start * 1000).toISOString().split('T')[0]} → ${new Date(sorted[sorted.length - 1].time_start * 1000).toISOString().split('T')[0]}`);
  console.log(`  Total: ${events.reduce((s, e) => s + e.booked, 0)} bookings / ${events.reduce((s, e) => s + e.size, 0)} capacity`);
}

// ══════════════════════════════════════════════════════════════════════════════
// Part B — Google Sheets occupancy feed
// ══════════════════════════════════════════════════════════════════════════════

interface SheetsResponse {
  range: string;
  majorDimension: string;
  values?: string[][];
}

async function probeGoogleSheets(): Promise<boolean> {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Part B — Google Sheets Occupancy Feed           ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_SPREADSHEET_ID}/values/${encodeURIComponent(SHEETS_RANGE)}?key=${SHEETS_API_KEY}`;
  console.log(`\n  Spreadsheet: ${SHEETS_SPREADSHEET_ID}`);
  console.log(`  Range: ${SHEETS_RANGE}`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.log(`\n  ✗ HTTP ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }

    const data: SheetsResponse = await res.json();
    console.log(`\n  ✓ Response received`);
    console.log(`  Range: ${data.range}`);
    console.log(`  Dimension: ${data.majorDimension}`);

    if (!data.values || data.values.length === 0) {
      console.log('  ⚠ No data rows returned.');
      return false;
    }

    console.log(`\n  Row data (${data.values[0].length} columns):`);
    for (let i = 0; i < data.values[0].length; i++) {
      console.log(`    Column ${String.fromCharCode(65 + i)}: "${data.values[0][i]}"`);
    }

    // Also fetch header row to understand columns
    const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_SPREADSHEET_ID}/values/${encodeURIComponent('SingleRow!A1:E1')}?key=${SHEETS_API_KEY}`;
    try {
      const headerRes = await fetch(headerUrl);
      if (headerRes.ok) {
        const headerData: SheetsResponse = await headerRes.json();
        if (headerData.values && headerData.values[0]) {
          console.log('\n  Column headers:');
          for (let i = 0; i < headerData.values[0].length; i++) {
            console.log(`    ${String.fromCharCode(65 + i)}: "${headerData.values[0][i]}" = "${data.values[0][i] ?? ''}"`);
          }
        }
      }
    } catch { /* non-critical */ }

    return true;
  } catch (err) {
    console.log(`\n  ✗ Fetch error: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

// Also try to read a broader range to understand all available data
async function probeSheetsBroadRange(): Promise<void> {
  console.log('\n  --- Probing broader ranges ---');

  const ranges = [
    'SingleRow!A1:Z2',    // Headers + first data row, all columns
    'Sheet1!A1:Z5',       // Default sheet name, first 5 rows
  ];

  for (const range of ranges) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${SHEETS_API_KEY}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data: SheetsResponse = await res.json();
      if (data.values && data.values.length > 0) {
        console.log(`\n  Range "${range}":`);
        for (let r = 0; r < data.values.length; r++) {
          console.log(`    Row ${r + 1}: [${data.values[r].map(v => `"${v}"`).join(', ')}]`);
        }
      }
    } catch { /* continue */ }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Akari Saunas — Venue Data Readability Test');
  console.log('══════════════════════════════════════════════════════');

  let glofoxOk = false;
  let sheetsOk = false;

  // Part A: Glofox
  try {
    glofoxOk = await probeGlofox();
  } catch (err) {
    console.log(`\n  ✗ Glofox probe failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Part B: Google Sheets
  try {
    sheetsOk = await probeGoogleSheets();
    if (sheetsOk) {
      await probeSheetsBroadRange();
    }
  } catch (err) {
    console.log(`\n  ✗ Sheets probe failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Glofox events API:     ${glofoxOk ? '✓ READABLE' : '✗ NOT READABLE'}`);
  console.log(`  Google Sheets feed:    ${sheetsOk ? '✓ READABLE' : '✗ NOT READABLE'}`);
  console.log(`  Overall:               ${glofoxOk || sheetsOk ? '✓ PASS — at least one data source is readable' : '✗ FAIL — no data source readable'}`);
  console.log('');

  if (!glofoxOk && !sheetsOk) {
    console.log('  Next steps:');
    console.log('  1. For Glofox: visit the portal in a browser and grab the Bearer token');
    console.log(`     https://app.glofox.com/portal/#/branch/${BRANCH_ID}/classes-day-view`);
    console.log('  2. For Sheets: check that the API key and spreadsheet ID are correct');
    console.log(`     https://docs.google.com/spreadsheets/d/${SHEETS_SPREADSHEET_ID}`);
    console.log('');
  }

  process.exit(glofoxOk || sheetsOk ? 0 : 1);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
