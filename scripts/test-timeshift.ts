/**
 * Quick CLI test for Squarespace date time-shifting.
 *
 * Usage:
 *   npx tsx scripts/test-timeshift.ts                       # defaults
 *   npx tsx scripts/test-timeshift.ts --offset 60           # 60-day offset
 *   npx tsx scripts/test-timeshift.ts --date 2025-12-01     # specific display date
 *   npx tsx scripts/test-timeshift.ts --mode proxy          # use proxy approach
 *   npx tsx scripts/test-timeshift.ts --dry-run             # just show date math, no API call
 */

import {
  setDisplayOffset,
  DISPLAY_OFFSET_DAYS,
  fetchWithOffset,
  squarespaceFetch,
  debugShift,
  maxOffsetFor,
  toDateString,
  toApiDate,
  parseDate,
} from '../src/lib/squarespaceTimeShift';

// ── Parse CLI args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}
const hasFlag = (flag: string) => args.includes(flag);

const offset = parseInt(getArg('--offset') || '30', 10);
const displayDate = getArg('--date') || '2026-02-04'; // 30 days before 2026-03-06
const mode = (getArg('--mode') || 'offset') as 'offset' | 'proxy';
const dryRun = hasFlag('--dry-run');

// The Corner Sauna config
const CORNER_SAUNA = {
  owner: '6f7bfa9c',
  appointmentTypeId: 86988395,
  calendarId: 13261360,
  timezone: 'Australia/Sydney',
};

// ── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  setDisplayOffset(offset);

  console.log('\n=== Squarespace Time-Shift Test ===');
  console.log(`Mode:          ${mode}`);
  console.log(`Offset:        ${DISPLAY_OFFSET_DAYS} days`);
  console.log(`Display date:  ${displayDate}`);
  console.log(`Max offset for this date: ${maxOffsetFor(displayDate)} days`);
  console.log('');

  debugShift(displayDate);

  if (dryRun) {
    console.log('\n[dry-run] Skipping API call.');
    return;
  }

  console.log(`\nFetching via ${mode} approach...`);

  if (mode === 'offset') {
    // ── Approach 1: explicit offset ────────────────────────────────────
    const data = await fetchWithOffset({
      ...CORNER_SAUNA,
      displayStartDate: displayDate,
      maxDays: 2,
    });

    console.log('\nResponse (display dates):');
    for (const [date, slots] of Object.entries(data)) {
      console.log(`  ${date}: ${(slots as unknown[]).length} time slot(s)`);
      for (const slot of (slots as { time: string }[]).slice(0, 3)) {
        console.log(`    - ${slot.time}`);
      }
      if ((slots as unknown[]).length > 3) {
        console.log(`    ... and ${(slots as unknown[]).length - 3} more`);
      }
    }
  } else {
    // ── Approach 2: transparent proxy ──────────────────────────────────
    const apiStartDate = toDateString(toApiDate(parseDate(displayDate)));
    // Build the URL as the app normally would (with the "logical" past date)
    const url =
      `https://app.squarespacescheduling.com/api/scheduling/v1/availability/times` +
      `?owner=${CORNER_SAUNA.owner}` +
      `&appointmentTypeId=${CORNER_SAUNA.appointmentTypeId}` +
      `&calendarId=${CORNER_SAUNA.calendarId}` +
      `&startDate=${displayDate}` + // <-- the "past" date, proxy will fix it
      `&maxDays=2` +
      `&timezone=${CORNER_SAUNA.timezone}`;

    console.log(`Original URL startDate: ${displayDate}`);
    console.log(`Proxy will rewrite to:  ${apiStartDate}`);

    const res = await squarespaceFetch(url, {
      headers: {
        accept: 'application/json',
        'x-secondo-owner': CORNER_SAUNA.owner,
      },
    });

    const data = await res.json();
    console.log('\nResponse (logical dates, shifted back by proxy):');
    for (const [date, slots] of Object.entries(data)) {
      console.log(`  ${date}: ${(slots as unknown[]).length} time slot(s)`);
      for (const slot of (slots as { time: string }[]).slice(0, 3)) {
        console.log(`    - ${slot.time}`);
      }
    }
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
