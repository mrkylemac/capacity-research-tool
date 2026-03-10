#!/usr/bin/env tsx
/**
 * Generate venue reference MD files from cached session data.
 *
 * Run: yarn generate:references
 */

import fs from 'node:fs';
import path from 'node:path';
import { format, parseISO } from 'date-fns';
import { sanitizeSessions } from '../src/lib/utils';
import { calculateMetrics, calculateMonthlyData, calculateClassTypeData } from '../src/lib/metricsCalculator';
import { calculateBenchmarkMetrics, compareToSlowFolk, inferOperatingHours, formatOperatingHours } from '../src/lib/benchmarkMetrics';
import { getVisitorGrowth, getStrongestMonth, isPartialMonth, computePeriodSummary } from '../src/lib/venueInsights';
import { formatDecimalHour } from '../src/lib/utils';
import type { MomenceSession } from '../src/types/momence';

// ── Venue configs ────────────────────────────────────────────────────────────

interface VenueRefConfig {
  slug: string;
  name: string;
  dataFile: string;
  locationFilter: string | null;
  timezone: string;
  platform: string;
  city: string;
}

const VENUE_CONFIGS: VenueRefConfig[] = [
  {
    slug: 'inner-studio-collingwood',
    name: 'Inner Studio — Collingwood',
    dataFile: 'innerstudio-momence.json',
    locationFilter: 'Collingwood',
    timezone: 'Australia/Melbourne',
    platform: 'Momence',
    city: 'Collingwood, Melbourne',
  },
  {
    slug: 'inner-studio-south-yarra',
    name: 'Inner Studio — South Yarra',
    dataFile: 'innerstudio-momence.json',
    locationFilter: 'South Yarra',
    timezone: 'Australia/Melbourne',
    platform: 'Momence',
    city: 'South Yarra, Melbourne',
  },
  {
    slug: 'sol-sauna',
    name: 'Sol Sauna',
    dataFile: '59636-momence.json',
    locationFilter: null,
    timezone: 'Australia/Melbourne',
    platform: 'Momence',
    city: 'Prahran, Melbourne',
  },
  {
    slug: 'aalto',
    name: 'Aalto',
    dataFile: '49448-momence.json',
    locationFilter: null,
    timezone: 'Australia/Adelaide',
    platform: 'Momence',
    city: 'Adelaide',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');
const OUTPUT_DIR = path.join(process.cwd(), 'src', 'data', 'references');

function fmt(n: number): string {
  return n.toLocaleString('en-AU', { maximumFractionDigits: 0 });
}

function fmtDec(n: number, digits = 1): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtRatioPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function statusEmoji(status: string): string {
  if (status === 'above') return '+';
  if (status === 'below') return '-';
  return '=';
}

// ── Main ─────────────────────────────────────────────────────────────────────

function loadSessions(dataFile: string, locationFilter: string | null): MomenceSession[] {
  const raw = JSON.parse(fs.readFileSync(path.join(VENUES_DIR, dataFile), 'utf-8'));
  let sessions: MomenceSession[] = raw.sessions;

  // Trim session names to collapse whitespace variants
  sessions = sessions.map(s => ({ ...s, sessionName: s.sessionName.trim() }));

  if (locationFilter) {
    sessions = sessions.filter(s => s.location === locationFilter);
  }

  return sessions;
}

function generateMd(config: VenueRefConfig): string {
  const rawSessions = loadSessions(config.dataFile, config.locationFilter);
  const { sessions, report } = sanitizeSessions(rawSessions);

  if (sessions.length === 0) {
    return `# ${config.name}\n\nNo sessions found after sanitization.\n`;
  }

  // Sort by start time to derive date range
  const sorted = [...sessions].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const fromDate = sorted[0].startsAt.slice(0, 10);
  const toDate = sorted[sorted.length - 1].startsAt.slice(0, 10);

  // Compute metrics
  const metrics = calculateMetrics(sessions, fromDate, toDate);
  const benchmark = calculateBenchmarkMetrics(sessions, fromDate, toDate, undefined, config.timezone);
  const monthly = calculateMonthlyData(sessions);
  const classTypes = calculateClassTypeData(sessions);
  const opHours = inferOperatingHours(sessions, config.timezone);
  const comparison = compareToSlowFolk(benchmark);
  const periodSummary = computePeriodSummary(benchmark);
  const growth = getVisitorGrowth(monthly);
  const strongest = getStrongestMonth(monthly);

  const totalRevenue = sessions.reduce((sum, s) => sum + s.ticketsSold * s.fixedTicketPrice, 0);
  const weeklyRevenue = totalRevenue / benchmark.weeksInRange;

  const dateFrom = format(parseISO(fromDate), 'd MMM yyyy');
  const dateTo = format(parseISO(toDate), 'd MMM yyyy');
  const generatedAt = format(new Date(), 'd MMM yyyy');

  // ── Build MD ───────────────────────────────────────────────────────────────

  const lines: string[] = [];
  const ln = (s = '') => lines.push(s);

  ln(`# ${config.name}`);
  ln();
  ln(`> Reference data for Slow Folk financial model comparison.`);
  ln(`> Generated ${generatedAt} from cached session data.`);
  ln();

  // Venue Overview
  ln(`## Venue Overview`);
  ln();
  ln(`| Field | Value |`);
  ln(`|-------|-------|`);
  ln(`| Platform | ${config.platform} |`);
  ln(`| Location | ${config.city} |`);
  ln(`| Timezone | ${config.timezone} |`);
  ln(`| Data range | ${dateFrom} – ${dateTo} |`);
  ln(`| Data window | ${periodSummary.periodLabel} |`);
  ln(`| Sessions analysed | ${fmt(sessions.length)} |`);
  ln(`| Sessions dropped | ${fmt(report.inputCount - report.outputCount)} (${report.dropped.cancelled} cancelled, ${report.dropped.zeroCapacity} zero-cap) |`);
  ln(`| Modal capacity | ${benchmark.modalCapacity} seats/session |`);
  ln(`| Ticket price | ${fmtCurrency(benchmark.avgPrice)} |`);
  ln(`| Session duration | ${sessions[0]?.durationMinutes ?? 60} min |`);
  ln();

  // Headline KPIs
  ln(`## Headline KPIs`);
  ln();
  ln(`| Metric | Value |`);
  ln(`|--------|-------|`);
  ln(`| Total visitors | ${fmt(benchmark.totalVisits)} |`);
  ln(`| Weekly visitors | ${fmtDec(benchmark.weeklyVisits)} |`);
  ln(`| Daily visitors | ${fmtDec(benchmark.dailyVisits)} |`);
  ln(`| Occupancy rate | ${fmtRatioPct(benchmark.occupancyRate)} |`);
  ln(`| ARPV | ${fmtCurrency(benchmark.impliedArpv)} |`);
  ln(`| Total revenue | ${fmtCurrency(totalRevenue)} |`);
  ln(`| Weekly revenue | ${fmtCurrency(weeklyRevenue)} |`);
  ln(`| Sessions/week | ${fmtDec(metrics.sessionsPerWeek)} |`);
  ln(`| Sessions/day | ${fmtDec(metrics.sessionsPerDay)} |`);
  ln(`| Visitors/session | ${fmtDec(benchmark.avgVisitorsPerSession)} |`);
  ln(`| Operating since | ${metrics.operatingSince} |`);
  ln(`| Visitor growth | ${growth >= 0 ? '+' : ''}${fmtDec(growth, 0)}% (first 3 months vs last 3 months) |`);
  if (strongest) {
    ln(`| Strongest month | ${strongest.label} (${fmt(strongest.visitors)} visitors) |`);
  }
  ln();

  // Monthly Breakdown
  ln(`## Monthly Breakdown`);
  ln();
  ln(`| Month | Sessions | Visitors | Capacity | Occupancy % | Revenue | Notes |`);
  ln(`|-------|----------|----------|----------|-------------|---------|-------|`);

  let totalSessions = 0, totalVisitors = 0, totalCap = 0, totalRev = 0;

  for (const m of monthly) {
    const partial = isPartialMonth(m, monthly);
    const note = partial ? 'partial' : '';
    ln(`| ${m.month} ${m.year} | ${fmt(m.sessions)} | ${fmt(m.ticketsSold)} | ${fmt(m.capacity)} | ${fmtPct(m.utilisation)} | ${fmtCurrency(m.revenue)} | ${note} |`);
    totalSessions += m.sessions;
    totalVisitors += m.ticketsSold;
    totalCap += m.capacity;
    totalRev += m.revenue;
  }

  const avgOcc = totalCap > 0 ? (totalVisitors / totalCap) * 100 : 0;
  ln(`| **Total** | **${fmt(totalSessions)}** | **${fmt(totalVisitors)}** | **${fmt(totalCap)}** | **${fmtPct(avgOcc)}** | **${fmtCurrency(totalRev)}** | |`);
  ln();

  // Session Types
  if (classTypes.length > 1) {
    ln(`## Session Types`);
    ln();
    ln(`| Type | Sessions | Visitors | Avg/Session | Occupancy % | Revenue |`);
    ln(`|------|----------|----------|-------------|-------------|---------|`);
    for (const ct of classTypes) {
      ln(`| ${ct.className} | ${fmt(ct.sessionCount)} | ${fmt(ct.totalVisitors)} | ${fmtDec(ct.avgVisitorsPerSession)} | ${fmtPct(ct.avgUtilisation)} | ${fmtCurrency(ct.totalRevenue)} |`);
    }
    ln();
  }

  // Operating Hours
  ln(`## Operating Hours`);
  ln();
  ln(`| Day | Open | Close | Hours |`);
  ln(`|-----|------|-------|-------|`);
  const wdHrs = opHours.weekdayEnd - opHours.weekdayStart;
  const weHrs = opHours.weekendEnd - opHours.weekendStart;
  ln(`| Weekdays (Mon–Fri) | ${formatDecimalHour(opHours.weekdayStart)} | ${formatDecimalHour(opHours.weekdayEnd)} | ${fmtDec(wdHrs)}h |`);
  ln(`| Weekends (Sat–Sun) | ${formatDecimalHour(opHours.weekendStart)} | ${formatDecimalHour(opHours.weekendEnd)} | ${fmtDec(weHrs)}h |`);
  ln(`| **Weekly total** | | | **${fmtDec(benchmark.weeklyOpenHours)}h** |`);
  ln();

  // Demand Split
  ln(`## Demand Split`);
  ln();
  ln(`| Period | Visitors | Share |`);
  ln(`|--------|----------|-------|`);
  ln(`| Weekday (Mon–Fri) | ${fmt(benchmark.weekdayVisits)} | ${fmtRatioPct(benchmark.weekdayShare)} |`);
  ln(`| Weekend (Sat–Sun) | ${fmt(benchmark.weekendVisits)} | ${fmtRatioPct(benchmark.weekendShare)} |`);
  ln();

  // Comparison to Slow Folk Targets
  ln(`## Comparison to Slow Folk Targets`);
  ln();
  ln(`| Metric | This Venue | SF Target | Delta | Status |`);
  ln(`|--------|-----------|-----------|-------|--------|`);
  for (const c of comparison) {
    let venueVal: string, targetVal: string, deltaStr: string;
    if (c.unit === 'ratio') {
      venueVal = fmtRatioPct(c.value);
      targetVal = fmtRatioPct(c.target);
      deltaStr = `${c.delta >= 0 ? '+' : ''}${(c.delta * 100).toFixed(1)}pp`;
    } else if (c.unit === 'currency') {
      venueVal = fmtCurrency(c.value);
      targetVal = fmtCurrency(c.target);
      deltaStr = `${c.delta >= 0 ? '+' : '-'}${fmtCurrency(Math.abs(c.delta))}`;
    } else {
      venueVal = fmtDec(c.value);
      targetVal = fmtDec(c.target);
      deltaStr = `${c.delta >= 0 ? '+' : ''}${fmtDec(c.delta)}`;
    }
    ln(`| ${c.metric} | ${venueVal} | ${targetVal} | ${deltaStr} (${c.deltaPercent >= 0 ? '+' : ''}${fmtDec(c.deltaPercent, 0)}%) | ${c.status} |`);
  }
  ln();

  // Footer
  ln(`---`);
  ln();
  ln(`*Data source: \`src/data/venues/${config.dataFile}\`${config.locationFilter ? ` (filtered to ${config.locationFilter})` : ''}*`);
  ln(`*Computed using: metricsCalculator.ts, benchmarkMetrics.ts, venueInsights.ts*`);

  return lines.join('\n');
}

// ── Run ──────────────────────────────────────────────────────────────────────

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const config of VENUE_CONFIGS) {
  console.log(`Generating ${config.slug}...`);
  const md = generateMd(config);
  const outPath = path.join(OUTPUT_DIR, `${config.slug}.md`);
  fs.writeFileSync(outPath, md, 'utf-8');
  console.log(`  → ${outPath}`);
}

console.log('\nDone — generated reference files in src/data/references/');
