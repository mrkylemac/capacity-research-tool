#!/usr/bin/env tsx
/**
 * Backfill Akari Saunas occupancy history using authenticated Google Sheets
 * revision access.
 *
 * Requires a browser cookie for docs.google.com — grab it from Chrome DevTools:
 *   1. Open the Akari spreadsheet in Chrome
 *   2. DevTools → Network → find any docs.google.com request
 *   3. Copy the Cookie header value
 *   4. Save it to .env as GOOGLE_COOKIE="..." or pass via --cookie
 *
 * Usage:
 *   npx tsx scripts/backfill-akari-with-cookie.ts --list-revisions
 *   npx tsx scripts/backfill-akari-with-cookie.ts --backfill
 *   npx tsx scripts/backfill-akari-with-cookie.ts --backfill --from 341336 --to 300000 --step 100
 *   npx tsx scripts/backfill-akari-with-cookie.ts --export-rev 341336
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Config ───────────────────────────────────────────────────────────────────

const SHEET_ID = '1yrIBz86iBFtin1_glrHsl0g05raVsisvbgIYaAYtin4';
const SHEETS_BASE = 'https://docs.google.com/spreadsheets';

const LOG_DIR = path.join(process.cwd(), 'src', 'data', 'venues');
const BACKFILL_FILE = path.join(LOG_DIR, 'akari-revision-backfill.json');
const REVISIONS_CACHE = path.join(LOG_DIR, 'akari-revisions-list.json');

const DEFAULT_FROM_REV = 341336;
const REQUEST_DELAY_MS = 1000;
const MAX_CONSECUTIVE_ERRORS = 10;

// ── Cookie Auth ──────────────────────────────────────────────────────────────

function getCookie(): string {
  const args = process.argv.slice(2);
  const cookieIdx = args.indexOf('--cookie');
  if (cookieIdx >= 0 && args[cookieIdx + 1]) {
    return args[cookieIdx + 1];
  }

  // Try .env file
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^GOOGLE_COOKIE=["']?(.*?)["']?\s*$/m);
    if (match?.[1]) return match[1];
  }

  // Try environment variable
  if (process.env.GOOGLE_COOKIE) {
    return process.env.GOOGLE_COOKIE;
  }

  console.error('\n  ✗ No cookie found.');
  console.error('  Set GOOGLE_COOKIE in .env or pass --cookie "..."');
  process.exit(1);
}

function makeHeaders(cookie: string): Record<string, string> {
  return {
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface RevisionSnapshot {
  revision: number;
  fetchedAt: string;
  sheetTimestamp: string;
  rawOccupancy: number;
  prettyDate: string;
  prettyTime: string;
  occupancyLabel: string;
}

interface BackfillLog {
  venueId: string;
  venueName: string;
  exportMethod: string;
  snapshots: RevisionSnapshot[];
  checkedRevisions: { from: number; to: number; step: number }[];
  lastUpdated: string;
}

interface RevisionInfo {
  id: number;
  timestamp?: string;
  author?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(csv: string, revision: number): RevisionSnapshot | null {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const dataRow = parseCSVLine(lines[1]);
  if (dataRow.length < 5) return null;

  const rawOccupancy = parseFloat(dataRow[1]);
  if (isNaN(rawOccupancy) && !dataRow[0]) return null;

  return {
    revision,
    fetchedAt: new Date().toISOString(),
    sheetTimestamp: dataRow[0] ?? '',
    rawOccupancy: isNaN(rawOccupancy) ? 0 : rawOccupancy,
    prettyDate: dataRow[2] ?? '',
    prettyTime: dataRow[3] ?? '',
    occupancyLabel: dataRow[4] ?? '',
  };
}

function loadBackfill(): BackfillLog {
  if (fs.existsSync(BACKFILL_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(BACKFILL_FILE, 'utf-8'));
    } catch {
      console.log('  ⚠ Existing backfill log corrupted, starting fresh.');
    }
  }
  return {
    venueId: 'akari',
    venueName: 'Akari Saunas',
    exportMethod: 'google-sheets-cookie-auth-revision-export',
    snapshots: [],
    checkedRevisions: [],
    lastUpdated: '',
  };
}

function saveBackfill(log: BackfillLog): void {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(BACKFILL_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

// ── List Revisions ──────────────────────────────────────────────────────────

async function listRevisions(cookie: string): Promise<RevisionInfo[]> {
  console.log('\n  Fetching revision list...\n');
  const headers = makeHeaders(cookie);

  // Try the revisions feed endpoint
  // Google Sheets uses a tiles-based revision list or the /revisions/list endpoint
  const urls = [
    `${SHEETS_BASE}/d/${SHEET_ID}/revisions/tiles?id=${SHEET_ID}&start=1&showDetailedRevisions=false&filterNamed=false&token=AC4w5VhYX`,
    `${SHEETS_BASE}/d/${SHEET_ID}/revisions/list?id=${SHEET_ID}`,
    `${SHEETS_BASE}/u/0/d/${SHEET_ID}/revisions/tiles?start=1&showDetailedRevisions=false`,
  ];

  for (const url of urls) {
    console.log(`  Trying: ${url.split('/revisions/')[1]?.slice(0, 60)}...`);
    try {
      const res = await fetch(url, { headers, redirect: 'follow' });
      console.log(`  → Status: ${res.status} (${res.headers.get('content-type')?.slice(0, 40)})`);

      if (res.ok) {
        const text = await res.text();
        console.log(`  → Size: ${text.length} bytes`);
        console.log(`  → Preview: ${text.slice(0, 300)}`);

        // Save raw response for analysis
        const cacheFile = path.join(LOG_DIR, 'akari-revisions-raw.txt');
        fs.mkdirSync(LOG_DIR, { recursive: true });
        fs.writeFileSync(cacheFile, text, 'utf-8');
        console.log(`  → Saved raw to: ${cacheFile}`);
        console.log('');
      }
    } catch (err: any) {
      console.log(`  → Error: ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  // Also try the show endpoint we know works (from the user's cURL)
  console.log('  Trying known-good revisions/show endpoint...');
  try {
    const showUrl = `${SHEETS_BASE}/u/0/d/${SHEET_ID}/revisions/show?rev=${DEFAULT_FROM_REV}&fromRev=${DEFAULT_FROM_REV - 11}`;
    const res = await fetch(showUrl, { headers, redirect: 'follow' });
    console.log(`  → Status: ${res.status}`);
    if (res.ok) {
      const text = await res.text();
      console.log(`  → Size: ${text.length} bytes`);
      // Look for revision numbers embedded in the response
      const revMatches = text.match(/\"revision\":(\d+)/g);
      if (revMatches) {
        console.log(`  → Found revision refs: ${revMatches.slice(0, 5).join(', ')}`);
      }
      const cacheFile = path.join(LOG_DIR, 'akari-revision-show-sample.html');
      fs.writeFileSync(cacheFile, text, 'utf-8');
      console.log(`  → Saved to: ${cacheFile}`);
    }
  } catch (err: any) {
    console.log(`  → Error: ${err.message}`);
  }

  return [];
}

// ── Export a single revision ─────────────────────────────────────────────────

async function fetchRevisionCSV(revision: number, cookie: string): Promise<string | null> {
  const headers = makeHeaders(cookie);

  // Try the export endpoint with auth
  const url = `${SHEETS_BASE}/export?id=${SHEET_ID}&revision=${revision}&exportFormat=csv&gid=0`;
  try {
    const res = await fetch(url, { headers, redirect: 'follow' });
    if (!res.ok) {
      return null;
    }
    const text = await res.text();
    // Sanity check: should look like CSV
    if (text.includes(',') && text.includes('\n')) {
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

async function exportSingleRevision(revision: number, cookie: string): Promise<void> {
  console.log(`\n  Exporting revision ${revision}...\n`);

  const csv = await fetchRevisionCSV(revision, cookie);
  if (!csv) {
    console.log('  ✗ Failed to export. Cookie may be expired.');
    return;
  }

  console.log('  Raw CSV:');
  console.log('  ' + csv.split('\n').slice(0, 5).join('\n  '));

  const snapshot = parseCSV(csv, revision);
  if (snapshot) {
    console.log(`\n  Parsed:`);
    console.log(`    Timestamp:  ${snapshot.sheetTimestamp}`);
    console.log(`    Occupancy:  ${snapshot.rawOccupancy} (${snapshot.occupancyLabel})`);
    console.log(`    Date/Time:  ${snapshot.prettyDate} ${snapshot.prettyTime}`);
  }
}

// ── Verify auth works ────────────────────────────────────────────────────────

async function verifyAuth(cookie: string): Promise<boolean> {
  console.log('\n  Verifying cookie auth...\n');
  const headers = makeHeaders(cookie);

  // Test 1: Can we access the sheet at all?
  const sheetUrl = `${SHEETS_BASE}/d/${SHEET_ID}/edit`;
  try {
    const res = await fetch(sheetUrl, { headers, redirect: 'manual' });
    console.log(`  Sheet access: ${res.status}`);
    if (res.status >= 400) {
      console.log('  ✗ Cookie appears invalid or expired.');
      return false;
    }
  } catch (err: any) {
    console.log(`  ✗ Network error: ${err.message}`);
    return false;
  }

  // Test 2: Can we export with a revision?
  const revs = [DEFAULT_FROM_REV, Math.floor(DEFAULT_FROM_REV / 2)];
  const results: string[] = [];

  for (const rev of revs) {
    process.stdout.write(`  Rev ${rev}: `);
    const csv = await fetchRevisionCSV(rev, cookie);
    if (csv) {
      const first = csv.split('\n')[1]?.slice(0, 80) ?? '';
      console.log(`✓ ${first}`);
      results.push(csv);
    } else {
      console.log('✗ failed');
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (results.length < 2) {
    console.log('\n  ⚠ Could not fetch multiple revisions. Export may not support revision param.');
    return results.length > 0;
  }

  if (results[0] === results[1]) {
    console.log('\n  ⚠ Both revisions returned identical data — revision param may be ignored.');
    return false;
  }

  console.log('\n  ✓ Auth works and revisions return different data!');
  return true;
}

// ── Backfill loop ────────────────────────────────────────────────────────────

async function backfill(fromRev: number, toRev: number, step: number, cookie: string): Promise<void> {
  console.log(`\n  Backfilling revisions ${fromRev} → ${toRev} (step ${step})`);
  console.log(`  Delay between requests: ${REQUEST_DELAY_MS}ms`);

  const log = loadBackfill();
  const existingRevs = new Set(log.snapshots.map(s => s.revision));
  let consecutiveErrors = 0;
  let newSnapshots = 0;
  let skipped = 0;

  const direction = fromRev > toRev ? -1 : 1;
  const total = Math.abs(fromRev - toRev) / step;

  for (let rev = fromRev; direction > 0 ? rev <= toRev : rev >= toRev; rev += step * direction) {
    if (existingRevs.has(rev)) {
      skipped++;
      continue;
    }

    const progress = Math.abs(fromRev - rev) / step;
    process.stdout.write(`  [${progress}/${Math.floor(total)}] Rev ${rev}: `);

    const csv = await fetchRevisionCSV(rev, cookie);
    if (!csv) {
      console.log('✗');
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.log(`\n  Stopping: ${MAX_CONSECUTIVE_ERRORS} consecutive errors.`);
        break;
      }
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    consecutiveErrors = 0;
    const snapshot = parseCSV(csv, rev);
    if (!snapshot) {
      console.log('✗ (parse)');
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    log.snapshots.push(snapshot);
    existingRevs.add(rev);
    newSnapshots++;

    const pct = snapshot.rawOccupancy > 0
      ? `${Math.min(100, (snapshot.rawOccupancy / 0.2) * 100).toFixed(0)}%`
      : '0%';
    console.log(`${snapshot.occupancyLabel || 'N/A'} (${pct}) — ${snapshot.prettyTime || ''} ${snapshot.prettyDate || ''}`);

    if (newSnapshots % 50 === 0) {
      log.lastUpdated = new Date().toISOString();
      saveBackfill(log);
      console.log(`  → Saved (${log.snapshots.length} total)`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  log.checkedRevisions.push({ from: fromRev, to: toRev, step });
  log.lastUpdated = new Date().toISOString();
  log.snapshots.sort((a, b) => a.revision - b.revision);
  saveBackfill(log);

  console.log(`\n  Done! New: ${newSnapshots}, Skipped: ${skipped}`);
  console.log(`  Total snapshots: ${log.snapshots.length}`);
  console.log(`  Saved to: ${BACKFILL_FILE}`);
}

// ── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Akari Saunas — Cookie-Auth Revision Backfill');
  console.log('══════════════════════════════════════════════════════');

  const cookie = getCookie();
  console.log(`  Cookie: ${cookie.slice(0, 30)}...${cookie.slice(-20)} (${cookie.length} chars)`);

  if (args.includes('--list-revisions')) {
    await listRevisions(cookie);
    return;
  }

  if (args.includes('--export-rev')) {
    const idx = args.indexOf('--export-rev');
    const rev = parseInt(args[idx + 1], 10);
    if (isNaN(rev)) {
      console.error('  Usage: --export-rev <revision-number>');
      process.exit(1);
    }
    await exportSingleRevision(rev, cookie);
    return;
  }

  // Default: verify then backfill
  const valid = await verifyAuth(cookie);
  if (!valid) {
    console.log('\n  Auth check failed. Make sure your cookie is fresh.');
    if (!args.includes('--force')) {
      console.log('  Use --force to try backfilling anyway.');
      process.exit(1);
    }
  }

  if (args.includes('--backfill') || args.includes('--force')) {
    const fromIdx = args.indexOf('--from');
    const toIdx = args.indexOf('--to');
    const stepIdx = args.indexOf('--step');

    const fromRev = fromIdx >= 0 ? parseInt(args[fromIdx + 1], 10) : DEFAULT_FROM_REV;
    const toRev = toIdx >= 0 ? parseInt(args[toIdx + 1], 10) : 1;
    const step = stepIdx >= 0 ? parseInt(args[stepIdx + 1], 10) : 100; // default to sampling every 100th

    await backfill(fromRev, toRev, step, cookie);
  } else {
    console.log('\n  Auth verified! Run with --backfill to start fetching historical data.');
    console.log('  Example:');
    console.log(`    npx tsx scripts/backfill-akari-with-cookie.ts --backfill`);
    console.log(`    npx tsx scripts/backfill-akari-with-cookie.ts --backfill --step 100`);
    console.log(`    npx tsx scripts/backfill-akari-with-cookie.ts --list-revisions`);
    console.log(`    npx tsx scripts/backfill-akari-with-cookie.ts --export-rev ${DEFAULT_FROM_REV}`);
  }
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
