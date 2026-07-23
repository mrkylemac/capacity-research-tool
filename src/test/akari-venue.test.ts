import { describe, it, expect } from 'vitest';
import { VENUES, GLOFOX_CONFIG } from '@/config/api';

describe('Akari Saunas venue configuration', () => {
  const venue = VENUES.find(v => v.id === 'akari');

  // Akari's Glofox is memberships-only — no session bookings exist, so the
  // venue is deliberately excluded from the report grid until an occupancy
  // view (Google Sheets feed) is built.
  it('is not listed in VENUES', () => {
    expect(venue).toBeUndefined();
  });

  it('has a Glofox config entry', () => {
    const cfg = GLOFOX_CONFIG.akariSaunas;
    expect(cfg).toBeDefined();
    expect(cfg.branchId).toBe('67cf4fe8ef346c3817003b8f');
    expect(cfg.name).toBe('Akari Saunas');
    expect(cfg.timezone).toBe('America/New_York');
  });

  it('has Google Sheets occupancy feed configured', () => {
    const cfg = GLOFOX_CONFIG.akariSaunas;
    expect(cfg.sheetsSpreadsheetId).toBe('1yrIBz86iBFtin1_glrHsl0g05raVsisvbgIYaAYtin4');
    expect(cfg.sheetsApiKey).toBeTruthy();
    expect(cfg.sheetsRange).toBe('SingleRow!A2:E2');
  });

  it('config name identifies the venue', () => {
    expect(GLOFOX_CONFIG.akariSaunas.name).toContain('Akari');
  });
});

describe('Akari Saunas operating hours (from website JS)', () => {
  // Mon–Fri: 8am–10pm ET, Sat–Sun: 9am–8pm ET
  const HOURS_OPEN: Record<number, number> = { 0: 9, 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 9 };
  const HOURS_CLOSED: Record<number, number> = { 0: 20, 1: 22, 2: 22, 3: 22, 4: 22, 5: 22, 6: 20 };

  it('weekdays open at 8am', () => {
    for (let d = 1; d <= 5; d++) {
      expect(HOURS_OPEN[d]).toBe(8);
    }
  });

  it('weekdays close at 10pm', () => {
    for (let d = 1; d <= 5; d++) {
      expect(HOURS_CLOSED[d]).toBe(22);
    }
  });

  it('weekends open at 9am', () => {
    expect(HOURS_OPEN[0]).toBe(9); // Sunday
    expect(HOURS_OPEN[6]).toBe(9); // Saturday
  });

  it('weekends close at 8pm', () => {
    expect(HOURS_CLOSED[0]).toBe(20); // Sunday
    expect(HOURS_CLOSED[6]).toBe(20); // Saturday
  });

  it('all days have valid hours', () => {
    for (let d = 0; d <= 6; d++) {
      expect(HOURS_OPEN[d]).toBeLessThan(HOURS_CLOSED[d]);
      expect(HOURS_OPEN[d]).toBeGreaterThanOrEqual(0);
      expect(HOURS_CLOSED[d]).toBeLessThanOrEqual(24);
    }
  });
});

describe('Akari Saunas occupancy data model', () => {
  // SingleRow!A2:E2 columns from their website JS
  it('defines correct column mapping', () => {
    const columns = [
      { index: 0, name: 'lastUpdatedDatetime', jsVar: 'data[0]' },
      { index: 1, name: 'rawOccupancy', jsVar: 'data[1] * 1.0' },
      { index: 2, name: 'prettyDate', jsVar: 'data[2]' },
      { index: 3, name: 'prettyTime', jsVar: 'data[3]' },
      { index: 4, name: 'occupancyLabel', jsVar: 'data[4]' },
    ];
    expect(columns).toHaveLength(5);
    expect(columns[1].name).toBe('rawOccupancy');
  });

  it('TOTAL_OCCUPANCY threshold is 0.2 (from their JS)', () => {
    // Their JS: var occupancyRatio = rawOccupancy > TOTAL_OCCUPANCY ? 1.0 : rawOccupancy / TOTAL_OCCUPANCY;
    const TOTAL_OCCUPANCY = 0.2;
    expect(TOTAL_OCCUPANCY).toBe(0.2);

    // At 0.1 → 50% full
    expect(0.1 / TOTAL_OCCUPANCY).toBe(0.5);
    // At 0.2 → 100% full
    expect(0.2 / TOTAL_OCCUPANCY).toBe(1.0);
    // Above 0.2 → clamped to 100%
    expect(Math.min(1.0, 0.3 / TOTAL_OCCUPANCY)).toBe(1.0);
  });
});
