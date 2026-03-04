import { describe, it, expect } from 'vitest';
import { VENUES, GLOFOX_CONFIG } from '@/config/api';

describe('Akari Saunas venue configuration', () => {
  const venue = VENUES.find(v => v.id === 'akari');

  it('is listed in VENUES', () => {
    expect(venue).toBeDefined();
  });

  it('has correct platform and location', () => {
    expect(venue!.platform).toBe('glofox');
    expect(venue!.location).toBe('Brooklyn');
    expect(venue!.timezone).toBe('America/New_York');
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

  it('venue name matches config', () => {
    expect(venue!.name).toContain('Akari');
    expect(GLOFOX_CONFIG.akariSaunas.name).toContain('Akari');
  });
});
