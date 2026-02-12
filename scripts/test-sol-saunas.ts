#!/usr/bin/env tsx
/**
 * Test script: Verifies Momence API results for Sol Saunas (59636)
 * against the Sól Saunas Venue Performance Report (Feb 2025 - Jan 2026).
 *
 * Run: yarn tsx scripts/test-sol-saunas.ts
 */

import { momenceClient } from '../src/lib/momenceClient';
import { API_CONFIG } from '../src/config/api';
import { calculateMetrics, calculateMonthlyData } from '../src/lib/metricsCalculator';
import { sanitizeSessions } from '../src/lib/utils';
import type { MomenceSession } from '../src/types/momence';

const HOST_ID = '59636';
const FROM = '2025-02-01';
const TO = '2026-01-31';

// Expected values from the report
const EXPECTED = {
  operatingPeriod: {
    nov2025: { sessions: 350, tickets: 563, utilisation: 10.7, revenue: 16890 },
    dec2025: { sessions: 350, tickets: 750, utilisation: 17.9, revenue: 22500 },
    jan2026: { sessions: 320, tickets: 790, utilisation: 20.6, revenue: 23700 },
  },
  total: { sessions: 1020, tickets: 2103, utilisation: 15.8, revenue: 63090 },
  avgMonthlyVisitors: 701,
  avgWeeklyVisitors: 175,
  ticketPrice: 30,
  avgUtilisation: 16.4,
  avgMonthlyRevenue: 21030,
};

function filterByDateRange(sessions: MomenceSession[], fromDate: string, toDate: string): MomenceSession[] {
  const from = new Date(fromDate).getTime();
  const toParsed = new Date(toDate);
  const toTime = toParsed.getHours() === 0 && toParsed.getMinutes() === 0 && toParsed.getSeconds() === 0
    ? new Date(toParsed.getFullYear(), toParsed.getMonth(), toParsed.getDate(), 23, 59, 59, 999).getTime()
    : toParsed.getTime();

  return sessions.filter(session => {
    const sessionDate = new Date(session.startsAt).getTime();
    return sessionDate >= from && sessionDate <= toTime;
  });
}

async function fetchAllSessions(): Promise<MomenceSession[]> {
  const allData: MomenceSession[] = [];
  let page = 1;

  while (true) {
    const response = await momenceClient.fetchSessions({
      hostId: HOST_ID,
      startsAtFrom: new Date(FROM).toISOString(),
      startsAtTo: new Date(TO + 'T23:59:59').toISOString(),
      page,
      pageSize: API_CONFIG.pageSize,
    });

    allData.push(...response.sessions);
    if (response.sessions.length === 0 || response.sessions.length < API_CONFIG.pageSize || page >= 100) break;
    page++;
  }

  return allData;
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function pct(v: number) {
  return `${v.toFixed(1)}%`;
}

function diff(actual: number, expected: number): string {
  const d = actual - expected;
  const p = expected !== 0 ? ((d / expected) * 100).toFixed(1) : '—';
  return d >= 0 ? `+${d} (${p}%)` : `${d} (${p}%)`;
}

async function main() {
  console.log('\n=== Sol Saunas API Validation Test ===\n');
  console.log(`Host ID: ${HOST_ID}`);
  console.log(`Date range: ${FROM} to ${TO}\n`);

  const rawSessions = await fetchAllSessions();
  const filtered = filterByDateRange(rawSessions, FROM, TO);
  const { sessions } = sanitizeSessions(filtered);

  console.log(`Raw API sessions: ${rawSessions.length}`);
  console.log(`After date filter: ${filtered.length}`);
  console.log(`After sanitize: ${sessions.length}\n`);

  const metrics = calculateMetrics(sessions, FROM, TO);
  const monthlyData = calculateMonthlyData(sessions);

  // Overall metrics
  console.log('--- Overall Metrics ---');
  console.log(`Total Sessions:  ${fmt(metrics.totalSessions)}  (expected: ${fmt(EXPECTED.total.sessions)})  ${diff(metrics.totalSessions, EXPECTED.total.sessions)}`);
  console.log(`Total Tickets:    ${fmt(metrics.totalTicketsSold)}  (expected: ${fmt(EXPECTED.total.tickets)})  ${diff(metrics.totalTicketsSold, EXPECTED.total.tickets)}`);
  console.log(`Avg Utilisation: ${pct(metrics.avgUtilisation)}  (expected: ${pct(EXPECTED.total.utilisation)})`);
  console.log(`Total Revenue:   $${fmt(metrics.totalRevenue)}  (expected: $${fmt(EXPECTED.total.revenue)})  ${diff(metrics.totalRevenue, EXPECTED.total.revenue)}`);
  console.log(`ARPV:            $${metrics.avgRevenuePerVisit.toFixed(2)}  (expected: $${EXPECTED.ticketPrice})`);
  console.log(`Operating Since: ${metrics.operatingSince}\n`);

  // Monthly breakdown (operating period only)
  const operatingMonths = monthlyData.filter(m => 
    (m.year === 2025 && m.month === 'November') ||
    (m.year === 2025 && m.month === 'December') ||
    (m.year === 2026 && m.month === 'January')
  );

  console.log('--- Operating Period (Nov 2025 - Jan 2026) ---');
  for (const m of operatingMonths) {
    const key = m.month === 'November' ? 'nov2025' : m.month === 'December' ? 'dec2025' : 'jan2026';
    const exp = EXPECTED.operatingPeriod[key as keyof typeof EXPECTED.operatingPeriod];
    console.log(`\n${m.month} ${m.year}:`);
    console.log(`  Sessions:    ${fmt(m.sessions)} (expected: ${fmt(exp.sessions)})  ${diff(m.sessions, exp.sessions)}`);
    console.log(`  Tickets:     ${fmt(m.ticketsSold)} (expected: ${fmt(exp.tickets)})  ${diff(m.ticketsSold, exp.tickets)}`);
    console.log(`  Utilisation: ${pct(m.utilisation)} (expected: ${pct(exp.utilisation)})`);
    console.log(`  Revenue:     $${fmt(m.revenue)} (expected: $${fmt(exp.revenue)})  ${diff(m.revenue, exp.revenue)}`);
  }

  // All months in range (for context)
  console.log('\n--- All Months in Range ---');
  monthlyData.forEach(m => {
    console.log(`  ${m.month} ${m.year}: ${m.sessions} sessions, ${m.ticketsSold} tickets, $${m.revenue.toLocaleString()} (${pct(m.utilisation)} util)`);
  });

  const operatingMonthsCount = operatingMonths.length;
  const avgMonthlyRevenue = metrics.totalRevenue / (operatingMonthsCount || 1);
  const daysInRange = Math.ceil((new Date(TO).getTime() - new Date(FROM).getTime()) / (1000 * 60 * 60 * 24));
  const weeklyVisitors = (metrics.totalTicketsSold / daysInRange) * 7;

  console.log('\n--- Derived Averages ---');
  console.log(`Monthly Visitors (avg): ${fmt(metrics.totalTicketsSold / (operatingMonthsCount || 1))}  (expected: ${fmt(EXPECTED.avgMonthlyVisitors)})`);
  console.log(`Weekly Visitors (avg):  ${fmt(weeklyVisitors)}  (expected: ${fmt(EXPECTED.avgWeeklyVisitors)})`);
  console.log(`Monthly Revenue (avg):  $${fmt(avgMonthlyRevenue)}  (expected: $${fmt(EXPECTED.avgMonthlyRevenue)})`);

  // Summary
  const sessionsMatch = Math.abs(metrics.totalSessions - EXPECTED.total.sessions) <= 50;
  const ticketsMatch = Math.abs(metrics.totalTicketsSold - EXPECTED.total.tickets) <= 50;
  const revenueMatch = Math.abs(metrics.totalRevenue - EXPECTED.total.revenue) <= 500;

  console.log('\n--- Validation Summary ---');
  console.log(`Sessions match: ${sessionsMatch ? '✓' : '✗'}`);
  console.log(`Tickets match:  ${ticketsMatch ? '✓' : '✗'}`);
  console.log(`Revenue match:  ${revenueMatch ? '✓' : '✗'}`);
  console.log('');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
