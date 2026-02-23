/**
 * Compare HOI data (our fetch + metrics) vs Momence dashboard for same period.
 * Momence screenshot: last 3 months from Fri 6 Feb 2026.
 * Run: yarn test src/test/compare-hoi-momence.test.ts
 */
import { momenceClient } from '@/lib/momenceClient';
import { calculateMetrics } from '@/lib/metricsCalculator';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { sanitizeSessions, logDataQuality } from '@/lib/utils';
import { API_CONFIG } from '@/config/api';
import type { MomenceSession } from '@/types/momence';

const HOI_HOST_ID = '16053';
const FROM = '2025-11-06T00:00:00.000Z';
const TO = '2026-02-06T23:59:59.999Z';

function filterByDateRange(sessions: MomenceSession[], fromDate: string, toDate: string) {
  const from = new Date(fromDate).getTime();
  const to = new Date(toDate).getTime();
  return sessions.filter(s => {
    const t = new Date(s.startsAt).getTime();
    return t >= from && t <= to;
  });
}

async function fetchAllSessions() {
  const all: MomenceSession[] = [];
  let page = 1;
  while (true) {
    const res = await momenceClient.fetchSessions({
      hostId: HOI_HOST_ID,
      startsAtFrom: FROM,
      startsAtTo: TO,
      page,
      pageSize: API_CONFIG.pageSize,
    });
    all.push(...res.sessions);
    if (res.sessions.length < API_CONFIG.pageSize || res.sessions.length === 0) break;
    page++;
    if (page > 250) break;
  }
  const dated = filterByDateRange(all, FROM, TO);
  const { sessions, report } = sanitizeSessions(dated);
  logDataQuality('HOI comparison', report);
  return sessions;
}

describe('HOI vs Momence dashboard comparison', () => {
  const runLive = process.env.RUN_LIVE_API_TESTS === 'true';
  const testFn = runLive ? it : it.skip;

  testFn('fetches same period (6 Nov 2025 – 6 Feb 2026) and compares metrics', async () => {
    const sessions = await fetchAllSessions();
    const fromStr = FROM.slice(0, 10);
    const toStr = TO.slice(0, 10);
    const metrics = calculateMetrics(sessions, fromStr, toStr);
    const benchmark = calculateBenchmarkMetrics(sessions, fromStr, toStr);

    const momence = {
      visits: 2929,
      classVisits: 2878,
      appointmentVisits: 51,
      classes: 444,
      capacityFilledPct: 64.85,
      uniqueCustomers: 343,
      avgVisitsPerCustomer: 8.54,
    };

    console.log('\n=== OUR DATA (HOI, 6 Nov 2025 – 6 Feb 2026) ===');
    console.log('Total sessions (classes):     ', metrics.totalSessions);
    console.log('Total tickets sold (visits):   ', metrics.totalTicketsSold);
    console.log('Total capacity:                ', metrics.totalCapacity);
    console.log('Avg utilisation %:              ', metrics.avgUtilisation.toFixed(2));
    console.log('Occupancy rate (ratio):        ', (benchmark.occupancyRate * 100).toFixed(2) + '%');

    console.log('\n=== MOMENCE DASHBOARD (screenshot) ===');
    console.log('Visits:                        ', momence.visits);
    console.log('Class visits:                  ', momence.classVisits);
    console.log('Classes:                       ', momence.classes);
    console.log('Capacity filled:               ', momence.capacityFilledPct + '%');

    const sessionDiff = metrics.totalSessions - momence.classes;
    const visitDiff = metrics.totalTicketsSold - momence.classVisits;
    const capacityDiff = metrics.avgUtilisation - momence.capacityFilledPct;
    console.log('\n=== DIFF (ours − Momence) ===');
    console.log('Sessions:  diff ', sessionDiff);
    console.log('Visits:    diff ', visitDiff);
    console.log('Capacity % diff ', capacityDiff.toFixed(2) + '%');

    expect(sessions.length).toBeGreaterThan(0);
  }, 180000);
});
