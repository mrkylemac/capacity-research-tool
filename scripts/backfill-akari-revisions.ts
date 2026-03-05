#!/usr/bin/env tsx
/**
 * Backfill Akari Saunas occupancy history by exporting Google Sheets
 * at historical revision numbers.
 *
 * This uses an undocumented Google Sheets export URL that accepts a `revision`
 * parameter. It works on publicly-shared sheets without OAuth.
 *
 * IMPORTANT: This is brittle — Google could break or rate-limit this at any time.
 *
 * Usage:
 *   npx tsx scripts/backfill-akari-revisions.ts                         # default: walk back from latest known rev
 *   npx tsx scripts/backfill-akari-revisions.ts --from 341336 --to 1    # custom range
 *   npx tsx scripts/backfill-akari-revisions.ts --from 341336 --to 300000 --step 10  # sample every 10th rev
 *   npx tsx scripts/backfill-akari-revisions.ts --probe                 # find oldest valid revision via binary search
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Config ───────────────────────────────────────────────────────────────────

const SHEET_ID = '1yrIBz86iBFtin1_glrHsl0g05raVsisvbgIYaAYtin4';
const EXPORT_BASE = `https://docs.google.com/spreadsheets/export`;

const LOG_DIR = path.join(process.cwd(), 'src', 'data', 'venues');
const BACKFILL_FILE = path.join(LOG_DIR, 'akari-revision-backfill.json');

const DEFAULT_FROM_REV = 341336; // Latest known revision
const DEFAULT_STEP = 1;
const REQUEST_DELAY_MS = 1500; // Be polite — 1.5s between requests
const MAX_CONSECUTIVE_ERRORS = 20; // Stop if this many in a row fail

// ── Types ────────────────────────────────────────────────────────────────────

interface RevisionSnapshot {
  revision: number;
  fetchedAt: string;
  /** Raw CSV row values from SingleRow (row 2) */
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
  /** Track which revisions we've already checked */
  checkedRevisions: { from: number; to: number; step: number }[];
  lastUpdated: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchRevisionCSV(revision: number): Promise<string | null> {
  const url = `${EXPORT_BASE}?id=${SHEET_ID}&revision=${revision}&exportFormat=csv`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      return null;
    }
    return await res.text();
  } catch {
    return null;
  }
}

function parseCSV(csv: string): RevisionSnapshot | null {
  // CSV has header row + data row(s). We want the SingleRow data.
  // The sheet may export all sheets or just the first one.
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // Parse CSV properly (handle quoted fields)
  const parseLine = (line: string): string[] => {
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
  };

  const dataRow = parseLine(lines[1]);
  if (dataRow.length < 5) return null;

  const rawOccupancy = parseFloat(dataRow[1]);
  if (isNaN(rawOccupancy) && !dataRow[0]) return null; // Empty/invalid row

  return {
    revision: 0, // filled by caller
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
    exportMethod: 'google-sheets-revision-export',
    snapshots: [],
    checkedRevisions: [],
    lastUpdated: '',
  };
}

function saveBackfill(log: BackfillLog): void {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(BACKFILL_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

// ── Probe: find oldest valid revision via binary search ─────────────────────

async function probeOldestRevision(): Promise<void> {
  console.log('\n  Probing for oldest available revision (binary search)...\n');

  let lo = 1;
  let hi = DEFAULT_FROM_REV;
  let oldestValid = hi;

  // First check: does revision 1 work?
  process.stdout.write(`  Checking rev 1... `);
  const r1 = await fetchRevisionCSV(1);
  if (r1) {
    console.log('EXISTS — all revisions may be available');
    oldestValid = 1;
  } else {
    console.log('not found');

    // Binary search for the boundary
    while (lo < hi - 1) {
      const mid = Math.floor((lo + hi) / 2);
      process.stdout.write(`  Checking rev ${mid}... `);
      await sleep(REQUEST_DELAY_MS);
      const csv = await fetchRevisionCSV(mid);
      if (csv) {
        console.log('exists');
        hi = mid;
        oldestValid = mid;
      } else {
        console.log('not found');
        lo = mid;
      }
    }
  }

  console.log(`\n  Oldest available revision: ~${oldestValid}`);
  console.log(`  Total revisions to backfill: ~${DEFAULT_FROM_REV - oldestValid}`);
  const estimatedHours = ((DEFAULT_FROM_REV - oldestValid) * REQUEST_DELAY_MS) / 1000 / 3600;
  console.log(`  Estimated time at ${REQUEST_DELAY_MS}ms delay: ~${estimatedHours.toFixed(1)} hours`);
  console.log(`\n  Suggested command:`);
  console.log(`  npx tsx scripts/backfill-akari-revisions.ts --from ${DEFAULT_FROM_REV} --to ${oldestValid} --step 1`);
}

// ── Verify: confirm revision parameter actually works ───────────────────────

async function verifyRevisionsWork(): Promise<boolean> {
  console.log('\n  Verifying that revision parameter returns different data...\n');

  const revs = [DEFAULT_FROM_REV, Math.floor(DEFAULT_FROM_REV / 2), 1];
  const results: { rev: number; data: string | null }[] = [];

  for (const rev of revs) {
    process.stdout.write(`  Rev ${rev}: `);
    const csv = await fetchRevisionCSV(rev);
    if (!csv) {
      console.log('failed to fetch');
    } else {
      const lines = csv.split('\n').slice(0, 3).join(' | ');
      console.log(lines.slice(0, 120));
    }
    results.push({ rev, data: csv });
    await sleep(REQUEST_DELAY_MS);
  }

  const unique = new Set(results.filter(r => r.data).map(r => r.data));
  if (unique.size <= 1) {
    console.log('\n  ⚠ WARNING: All revisions returned identical data.');
    console.log('  The revision parameter may be ignored for public sheets.');
    console.log('  Backfill would not yield historical data.');
    return false;
  }

  console.log(`\n  ✓ Found ${unique.size} distinct results — revisions are real!`);
  return true;
}

// ── Main backfill loop ──────────────────────────────────────────────────────

async function backfill(fromRev: number, toRev: number, step: number): Promise<void> {
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
    // Skip already-fetched revisions
    if (existingRevs.has(rev)) {
      skipped++;
      continue;
    }

    const progress = Math.abs(fromRev - rev) / step;
    process.stdout.write(`  [${progress}/${Math.floor(total)}] Rev ${rev}: `);

    const csv = await fetchRevisionCSV(rev);
    if (!csv) {
      console.log('✗ (no data)');
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.log(`\n  Stopping: ${MAX_CONSECUTIVE_ERRORS} consecutive errors.`);
        break;
      }
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    consecutiveErrors = 0;
    const snapshot = parseCSV(csv);
    if (!snapshot) {
      console.log('✗ (parse error)');
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    snapshot.revision = rev;
    log.snapshots.push(snapshot);
    existingRevs.add(rev);
    newSnapshots++;

    const fullness = snapshot.rawOccupancy > 0
      ? `${Math.min(100, (snapshot.rawOccupancy / 0.2) * 100).toFixed(0)}%`
      : '0%';
    console.log(`${snapshot.occupancyLabel || 'N/A'} (${fullness}) — ${snapshot.prettyTime || 'N/A'} ${snapshot.prettyDate || 'N/A'}`);

    // Save periodically (every 50 new snapshots)
    if (newSnapshots % 50 === 0) {
      log.lastUpdated = new Date().toISOString();
      saveBackfill(log);
      console.log(`  → Saved (${log.snapshots.length} total snapshots)`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  // Final save
  log.checkedRevisions.push({ from: fromRev, to: toRev, step });
  log.lastUpdated = new Date().toISOString();

  // Sort snapshots by revision number
  log.snapshots.sort((a, b) => a.revision - b.revision);
  saveBackfill(log);

  console.log(`\n  Done! New: ${newSnapshots}, Skipped (already had): ${skipped}`);
  console.log(`  Total snapshots: ${log.snapshots.length}`);
  console.log(`  Saved to: ${BACKFILL_FILE}`);
}

// ── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Akari Saunas — Revision Backfill');
  console.log('══════════════════════════════════════════════════════');

  if (args.includes('--probe')) {
    await probeOldestRevision();
    return;
  }

  if (args.includes('--verify')) {
    await verifyRevisionsWork();
    return;
  }

  const fromIdx = args.indexOf('--from');
  const toIdx = args.indexOf('--to');
  const stepIdx = args.indexOf('--step');

  const fromRev = fromIdx >= 0 ? parseInt(args[fromIdx + 1], 10) : DEFAULT_FROM_REV;
  const toRev = toIdx >= 0 ? parseInt(args[toIdx + 1], 10) : 1;
  const step = stepIdx >= 0 ? parseInt(args[stepIdx + 1], 10) : DEFAULT_STEP;

  if (isNaN(fromRev) || isNaN(toRev) || isNaN(step)) {
    console.log('  Usage: npx tsx scripts/backfill-akari-revisions.ts [--from N] [--to N] [--step N] [--probe] [--verify]');
    process.exit(1);
  }

  // Verify first if this is the first run
  const log = loadBackfill();
  if (log.snapshots.length === 0) {
    console.log('\n  First run — verifying revision exports work...');
    const valid = await verifyRevisionsWork();
    if (!valid) {
      console.log('\n  Aborting. Revision exports appear to return identical data.');
      console.log('  The backfill approach won\'t yield historical data.');
      process.exit(1);
    }
  }

  await backfill(fromRev, toRev, step);
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
