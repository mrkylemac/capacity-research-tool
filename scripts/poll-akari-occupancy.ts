#!/usr/bin/env tsx
/**
 * Polls Akari Saunas live occupancy from their Google Sheets feed and
 * accumulates snapshots into a local JSON log.
 *
 * Data source: akarisauna.com embeds a Google Sheets call for live occupancy.
 *   SingleRow!A2:E2 → [lastUpdatedDatetime, rawOccupancy, prettyDate, prettyTime, occupancyLabel]
 *   Closures!A2:A1001 → special closure dates
 *
 * Operating hours (from their website JS):
 *   Mon–Fri: 8am–10pm ET
 *   Sat–Sun: 9am–8pm ET
 *
 * Usage:
 *   npx tsx scripts/poll-akari-occupancy.ts              # single poll
 *   npx tsx scripts/poll-akari-occupancy.ts --loop        # continuous (every 15 min)
 *   npx tsx scripts/poll-akari-occupancy.ts --loop --interval 5  # every 5 min
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Config ───────────────────────────────────────────────────────────────────

const SHEETS_SPREADSHEET_ID = '1yrIBz86iBFtin1_glrHsl0g05raVsisvbgIYaAYtin4';
const SHEETS_API_KEY = 'AIzaSyB_CloyomHHpxfqBS8jJFBeIiR_MjE4gAQ';

const LOG_DIR = path.join(process.cwd(), 'src', 'data', 'venues');
const LOG_FILE = path.join(LOG_DIR, 'akari-occupancy-log.json');

const DEFAULT_INTERVAL_MINS = 15;

// Operating hours per day-of-week (0=Sun, 6=Sat) in ET
const HOURS_OPEN: Record<number, number> = { 0: 9, 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 9 };
const HOURS_CLOSED: Record<number, number> = { 0: 20, 1: 22, 2: 22, 3: 22, 4: 22, 5: 22, 6: 20 };

// ── Types ────────────────────────────────────────────────────────────────────

interface OccupancySnapshot {
  /** ISO timestamp when we polled */
  polledAt: string;
  /** Raw timestamp from the sheet (column A) */
  sheetTimestamp: string;
  /** Occupancy ratio, 0–~0.2+ where 0.2 = "full" (column B) */
  rawOccupancy: number;
  /** Human-readable date from sheet (column C) */
  prettyDate: string;
  /** Human-readable time from sheet (column D) */
  prettyTime: string;
  /** Occupancy label e.g. "Very Busy" (column E) */
  occupancyLabel: string;
  /** Whether venue is within operating hours at poll time */
  withinOperatingHours: boolean;
}

interface OccupancyLog {
  venueId: string;
  venueName: string;
  timezone: string;
  snapshots: OccupancySnapshot[];
  closureDates: string[];
  lastPolledAt: string;
}

interface SheetsResponse {
  range: string;
  majorDimension: string;
  values?: string[][];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getETNow(): Date {
  // Get current time in America/New_York
  const now = new Date();
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(etStr);
}

function isWithinOperatingHours(): { open: boolean; reason: string } {
  const et = getETNow();
  const day = et.getDay();
  const hour = et.getHours();
  const openHour = HOURS_OPEN[day];
  const closeHour = HOURS_CLOSED[day];

  if (hour < openHour) {
    return { open: false, reason: `Before opening (opens ${openHour}am ET)` };
  }
  if (hour >= closeHour) {
    const closeLabel = closeHour > 12 ? `${closeHour - 12}pm` : `${closeHour}am`;
    return { open: false, reason: `After closing (closed at ${closeLabel} ET)` };
  }
  return { open: true, reason: 'Open' };
}

async function fetchSheetRange(range: string): Promise<SheetsResponse | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${SHEETS_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  ✗ Sheets API HTTP ${res.status} for "${range}"`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.log(`  ✗ Network error fetching "${range}": ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

function loadLog(): OccupancyLog {
  if (fs.existsSync(LOG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    } catch {
      console.log('  ⚠ Existing log corrupted, starting fresh.');
    }
  }
  return {
    venueId: 'akari',
    venueName: 'Akari Saunas',
    timezone: 'America/New_York',
    snapshots: [],
    closureDates: [],
    lastPolledAt: '',
  };
}

function saveLog(log: OccupancyLog): void {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

// ── Core poll ────────────────────────────────────────────────────────────────

async function pollOnce(): Promise<OccupancySnapshot | null> {
  const now = new Date();
  const { open } = isWithinOperatingHours();

  // Fetch occupancy
  const data = await fetchSheetRange('SingleRow!A2:E2');
  if (!data?.values || data.values.length === 0) {
    console.log(`  [${now.toISOString()}] ✗ No data from SingleRow sheet`);
    return null;
  }

  const row = data.values[0];
  const snapshot: OccupancySnapshot = {
    polledAt: now.toISOString(),
    sheetTimestamp: row[0] ?? '',
    rawOccupancy: parseFloat(row[1] ?? '0'),
    prettyDate: row[2] ?? '',
    prettyTime: row[3] ?? '',
    occupancyLabel: row[4] ?? '',
    withinOperatingHours: open,
  };

  return snapshot;
}

async function fetchClosures(): Promise<string[]> {
  const data = await fetchSheetRange('Closures!A2:A1001');
  if (!data?.values) return [];
  return data.values.map(r => r[0]).filter(Boolean);
}

async function runPoll(): Promise<void> {
  const et = getETNow();
  const { open, reason } = isWithinOperatingHours();
  const timeStr = et.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });

  console.log(`  [${timeStr} ET] ${reason}`);

  // Always poll when running — captures both open and closed state.
  // During closed hours the data won't change, but we log the attempt.
  const snapshot = await pollOnce();
  if (!snapshot) return;

  // Check for duplicate (same sheetTimestamp as last snapshot)
  const log = loadLog();
  const lastSnapshot = log.snapshots[log.snapshots.length - 1];
  if (lastSnapshot && lastSnapshot.sheetTimestamp === snapshot.sheetTimestamp) {
    console.log(`  → Sheet unchanged since ${lastSnapshot.prettyTime} on ${lastSnapshot.prettyDate} (skipping duplicate)`);
    return;
  }

  log.snapshots.push(snapshot);
  log.lastPolledAt = snapshot.polledAt;

  // Refresh closures periodically (every 50 snapshots or on first run)
  if (log.snapshots.length === 1 || log.snapshots.length % 50 === 0) {
    log.closureDates = await fetchClosures();
    console.log(`  → Refreshed closures: ${log.closureDates.length} dates`);
  }

  saveLog(log);

  const fullness = snapshot.rawOccupancy > 0
    ? `${Math.min(100, (snapshot.rawOccupancy / 0.2) * 100).toFixed(0)}%`
    : '0%';
  console.log(`  → ${snapshot.occupancyLabel} (${fullness} full) — updated ${snapshot.prettyTime} on ${snapshot.prettyDate}`);
  console.log(`  → Total snapshots: ${log.snapshots.length}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const loop = args.includes('--loop');
  const intervalIdx = args.indexOf('--interval');
  const intervalMins = intervalIdx >= 0 ? parseInt(args[intervalIdx + 1], 10) : DEFAULT_INTERVAL_MINS;

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Akari Saunas — Occupancy Poller');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Mode:     ${loop ? `continuous (every ${intervalMins} min)` : 'single poll'}`);
  console.log(`  Log file: ${LOG_FILE}`);

  const existingLog = loadLog();
  console.log(`  Existing snapshots: ${existingLog.snapshots.length}`);
  console.log('');

  if (!loop) {
    try {
      await runPoll();
    } catch (err) {
      console.log(`\n  ✗ Poll failed: ${err instanceof Error ? err.message : err}`);
    }
    console.log('\n  Done. Run with --loop for continuous polling.');
    return;
  }

  // Continuous mode
  console.log(`  Starting continuous poll (Ctrl+C to stop)...\n`);
  await runPoll();

  setInterval(async () => {
    try {
      await runPoll();
    } catch (err) {
      console.log(`  ✗ Poll error: ${err instanceof Error ? err.message : err}`);
    }
  }, intervalMins * 60 * 1000);
}

main().catch(err => {
  console.error('Poller failed:', err);
  process.exit(1);
});
