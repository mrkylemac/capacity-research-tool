#!/usr/bin/env tsx
/**
 * Test script: Probes whether Akari Saunas data is readable as a venue.
 *
 * Data sources (from akarisauna.com JS):
 *   A) Google Sheets "SingleRow" — live occupancy snapshot (A2:E2)
 *      Column A: lastUpdatedDatetime  (raw timestamp)
 *      Column B: rawOccupancy         (decimal, 0.2 = "full")
 *      Column C: prettyDate           (e.g. "Mar 4, 2026")
 *      Column D: prettyTime           (e.g. "6:39pm")
 *      Column E: occupancyLabel       (e.g. "Very Busy")
 *
 *   B) Google Sheets "Closures" — special closure dates (A2:A1001)
 *
 *   C) Glofox API — membership portal (branch 67cf4fe8ef346c3817003b8f)
 *      Used for memberships, not session booking. Probed for completeness.
 *
 * Operating hours (from JS):
 *   Mon–Fri: 8am–10pm ET
 *   Sat–Sun: 9am–8pm ET
 *
 * Run:  npx tsx scripts/test-akari-saunas.ts
 */

// ── Configuration ────────────────────────────────────────────────────────────

const SHEETS_SPREADSHEET_ID = '1yrIBz86iBFtin1_glrHsl0g05raVsisvbgIYaAYtin4';
const SHEETS_API_KEY = 'AIzaSyB_CloyomHHpxfqBS8jJFBeIiR_MjE4gAQ';

const GLOFOX_BRANCH_ID = '67cf4fe8ef346c3817003b8f';
const GLOFOX_API = 'https://api.glofox.com/2.0';

const GLOFOX_NAMESPACE_CANDIDATES = [
  'akarisauna',
  'akari',
  'akarisaunas',
  'akarinyc',
  'akaribrooklyn',
  GLOFOX_BRANCH_ID,
];

// ── Helpers ──────────────────────────────────────────────────────────────────

interface SheetsResponse {
  range: string;
  majorDimension: string;
  values?: string[][];
}

async function fetchSheetRange(range: string): Promise<SheetsResponse | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${SHEETS_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`    ✗ HTTP ${res.status} for range "${range}"`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.log(`    ✗ Fetch error for range "${range}": ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Part A — Google Sheets: Live Occupancy (SingleRow)
// ══════════════════════════════════════════════════════════════════════════════

async function probeOccupancySheet(): Promise<boolean> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Part A — Google Sheets: Live Occupancy (SingleRow)      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Spreadsheet: ${SHEETS_SPREADSHEET_ID}`);

  // 1. Fetch headers + data row
  console.log('\n  --- SingleRow!A1:E2 (headers + data) ---');
  const full = await fetchSheetRange('SingleRow!A1:E2');
  if (!full?.values || full.values.length < 2) {
    // Try just the data row
    const dataOnly = await fetchSheetRange('SingleRow!A2:E2');
    if (!dataOnly?.values || dataOnly.values.length === 0) {
      console.log('  ✗ No data returned from SingleRow sheet.');
      return false;
    }
    const row = dataOnly.values[0];
    console.log('  ✓ Data row retrieved (no headers available)');
    printOccupancyRow(row);
    return true;
  }

  const headers = full.values[0];
  const row = full.values[1];

  console.log('  ✓ Headers + data retrieved\n');
  console.log('  Column mapping:');
  for (let i = 0; i < Math.max(headers.length, row.length); i++) {
    const col = String.fromCharCode(65 + i);
    console.log(`    ${col}: "${headers[i] ?? '—'}" = "${row[i] ?? ''}"`);
  }

  printOccupancyRow(row);

  // 2. Check if there are more rows (historical data?)
  console.log('\n  --- Checking for historical rows (SingleRow!A2:E20) ---');
  const extended = await fetchSheetRange('SingleRow!A2:E20');
  if (extended?.values && extended.values.length > 1) {
    console.log(`  ✓ Found ${extended.values.length} rows — historical data available!`);
    for (let i = 0; i < Math.min(extended.values.length, 5); i++) {
      const r = extended.values[i];
      console.log(`    Row ${i + 2}: ${r[0] ?? '—'} | occ=${r[1] ?? '—'} | ${r[2] ?? '—'} ${r[3] ?? '—'} | "${r[4] ?? '—'}"`);
    }
    if (extended.values.length > 5) {
      console.log(`    ... and ${extended.values.length - 5} more rows`);
    }
  } else {
    console.log('  → Single row only (live snapshot, no history in this sheet)');
  }

  return true;
}

function printOccupancyRow(row: string[]) {
  const [lastUpdatedDatetime, rawOccupancy, prettyDate, prettyTime, occupancyLabel] = row;

  console.log('\n  Parsed occupancy data:');
  console.log(`    Last updated:    ${lastUpdatedDatetime ?? '—'}`);
  console.log(`    Raw occupancy:   ${rawOccupancy ?? '—'} (0.2 = full per their JS)`);
  console.log(`    Pretty date:     ${prettyDate ?? '—'}`);
  console.log(`    Pretty time:     ${prettyTime ?? '—'}`);
  console.log(`    Occupancy label: ${occupancyLabel ?? '—'}`);

  if (rawOccupancy) {
    const ratio = parseFloat(rawOccupancy);
    const MAX = 0.2;
    const pct = Math.min(100, (ratio / MAX) * 100);
    console.log(`    Fullness:        ${pct.toFixed(0)}% (of their 0.2 max threshold)`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Part B — Google Sheets: Closures
// ══════════════════════════════════════════════════════════════════════════════

async function probeClosuresSheet(): Promise<boolean> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Part B — Google Sheets: Closures                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const data = await fetchSheetRange('Closures!A1:A1001');
  if (!data?.values || data.values.length === 0) {
    console.log('  ✗ No closure data found.');
    return false;
  }

  const allRows = data.values;
  const header = allRows[0]?.[0];
  const closureDates = allRows.slice(1).map(r => r[0]).filter(Boolean);

  console.log(`  ✓ Found ${closureDates.length} closure dates`);
  if (header) console.log(`  Header: "${header}"`);

  if (closureDates.length > 0) {
    // Show recent/upcoming closures
    const now = new Date();
    const upcoming = closureDates.filter(d => {
      try { return new Date(d) >= now; } catch { return false; }
    });
    const past = closureDates.filter(d => {
      try { return new Date(d) < now; } catch { return false; }
    });

    console.log(`  Past closures: ${past.length}`);
    console.log(`  Upcoming closures: ${upcoming.length}`);

    if (upcoming.length > 0) {
      console.log(`\n  Upcoming:`);
      for (const d of upcoming.slice(0, 5)) {
        console.log(`    ${d}`);
      }
    }

    // Show last few past closures
    if (past.length > 0) {
      console.log(`\n  Most recent past closures:`);
      for (const d of past.slice(-5)) {
        console.log(`    ${d}`);
      }
    }
  }

  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// Part C — Discover additional sheets
// ══════════════════════════════════════════════════════════════════════════════

async function probeAdditionalSheets(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Part C — Probing for Additional Sheets                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Try common sheet names that might contain historical occupancy data
  const candidates = [
    { name: 'History', range: 'History!A1:E5' },
    { name: 'Log', range: 'Log!A1:E5' },
    { name: 'Data', range: 'Data!A1:E5' },
    { name: 'Sheet1', range: 'Sheet1!A1:E5' },
    { name: 'Occupancy', range: 'Occupancy!A1:E5' },
    { name: 'Archive', range: 'Archive!A1:E5' },
    { name: 'Raw', range: 'Raw!A1:E5' },
  ];

  let found = false;
  for (const { name, range } of candidates) {
    const data = await fetchSheetRange(range);
    if (data?.values && data.values.length > 0) {
      found = true;
      console.log(`\n  ✓ Sheet "${name}" exists (${data.values.length} rows):`);
      for (let r = 0; r < Math.min(data.values.length, 3); r++) {
        console.log(`    Row ${r + 1}: [${data.values[r].map(v => `"${v}"`).join(', ')}]`);
      }
    }
  }

  if (!found) {
    console.log('\n  → No additional sheets found (only SingleRow + Closures confirmed)');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Part D — Glofox API Probe
// ══════════════════════════════════════════════════════════════════════════════

async function probeGlofox(): Promise<boolean> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Part D — Glofox API Probe (membership portal)           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Branch ID: ${GLOFOX_BRANCH_ID}`);
  console.log('  Note: Akari uses Glofox for memberships, not session booking.\n');

  let token: string | null = null;
  let namespace = '';

  for (const ns of GLOFOX_NAMESPACE_CANDIDATES) {
    process.stdout.write(`  [namespace] ${ns} ... `);
    for (const body of [{ namespace: ns }, { namespace: ns, branch_id: GLOFOX_BRANCH_ID }]) {
      try {
        const res = await fetch(`${GLOFOX_API}/users/guest`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) { token = data.token; namespace = ns; break; }
        }
      } catch { /* continue */ }
    }
    if (token) { console.log('✓ token obtained'); break; }
    console.log('✗');
  }

  if (!token) {
    console.log('\n  ⚠ No guest token found. Akari may restrict Glofox guest access.');
    console.log(`  Portal: https://app.glofox.com/portal/#/branch/${GLOFOX_BRANCH_ID}/memberships`);
    return false;
  }

  console.log(`  Namespace: ${namespace}`);
  console.log(`  Token: ${token.slice(0, 40)}...`);
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Akari Saunas — Venue Data Readability Test');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Location: Williamsburg, Brooklyn, NYC');
  console.log('  Model:    Membership-based, no bookings');
  console.log('  Hours:    Mon–Fri 8am–10pm, Sat–Sun 9am–8pm (ET)');

  const results = { occupancy: false, closures: false, glofox: false };

  // Part A: Live occupancy
  try {
    results.occupancy = await probeOccupancySheet();
  } catch (err) {
    console.log(`  ✗ Occupancy probe failed: ${err instanceof Error ? err.message : err}`);
  }

  // Part B: Closures
  try {
    results.closures = await probeClosuresSheet();
  } catch (err) {
    console.log(`  ✗ Closures probe failed: ${err instanceof Error ? err.message : err}`);
  }

  // Part C: Additional sheets
  try {
    await probeAdditionalSheets();
  } catch (err) {
    console.log(`  ✗ Additional sheets probe failed: ${err instanceof Error ? err.message : err}`);
  }

  // Part D: Glofox
  try {
    results.glofox = await probeGlofox();
  } catch (err) {
    console.log(`  ✗ Glofox probe failed: ${err instanceof Error ? err.message : err}`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Live occupancy (Sheets):  ${results.occupancy ? '✓ READABLE' : '✗ NOT READABLE'}`);
  console.log(`  Closures (Sheets):        ${results.closures ? '✓ READABLE' : '✗ NOT READABLE'}`);
  console.log(`  Glofox memberships:       ${results.glofox ? '✓ READABLE' : '✗ NOT READABLE'}`);

  const anyReadable = results.occupancy || results.closures || results.glofox;
  console.log(`\n  Overall: ${anyReadable ? '✓ PASS' : '✗ FAIL'}`);

  if (results.occupancy) {
    console.log('\n  ℹ Akari publishes real-time occupancy via Google Sheets.');
    console.log('    This is a live snapshot (not historical session data).');
    console.log('    To build history, set up periodic polling (e.g. every 15 min).');
    console.log('    Columns: timestamp, rawOccupancy (0–0.2), date, time, label');
  }

  console.log('');
  process.exit(anyReadable ? 0 : 1);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
