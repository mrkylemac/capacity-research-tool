import { parseSheetRows, computeCapExSummary } from '@/lib/sheetsClient';
import type { SheetData, CostLineItem } from '@/types/tracker';

// ═══════════════════════════════════════════════════════════════════════════════
// parseSheetRows
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseSheetRows', () => {
  it('maps columns by standard header names', () => {
    const data: SheetData = {
      tab: 'CapEx',
      headers: ['Category', 'Description', 'Supplier', 'Forecast', 'Actual', 'Status', 'Date', 'Notes'],
      rows: [
        {
          Category: 'Plumbing',
          Description: 'Install hot water',
          Supplier: 'AquaCo',
          Forecast: '$10,000',
          Actual: '$9,500',
          Status: 'Paid',
          Date: '2026-01-15',
          Notes: 'On time',
        },
      ],
    };

    const items = parseSheetRows(data);
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe('Plumbing');
    expect(items[0].description).toBe('Install hot water');
    expect(items[0].supplier).toBe('AquaCo');
    expect(items[0].forecastAmount).toBe(10000);
    expect(items[0].actualAmount).toBe(9500);
    expect(items[0].variance).toBe(500);
    expect(items[0].status).toBe('paid');
    expect(items[0].date).toBe('2026-01-15');
    expect(items[0].notes).toBe('On time');
  });

  it('handles alternative column names', () => {
    const data: SheetData = {
      tab: 'Budget',
      headers: ['Type', 'Item', 'Vendor', 'Budget', 'Cost', 'State'],
      rows: [
        { Type: 'Electrical', Item: 'Wiring', Vendor: 'ElecCo', Budget: '5000', Cost: '4800', State: 'Paid' },
      ],
    };

    const items = parseSheetRows(data);
    expect(items[0].category).toBe('Electrical');
    expect(items[0].description).toBe('Wiring');
    expect(items[0].supplier).toBe('ElecCo');
    expect(items[0].forecastAmount).toBe(5000);
    expect(items[0].actualAmount).toBe(4800);
  });

  it('handles missing/empty cells gracefully', () => {
    const data: SheetData = {
      tab: 'CapEx',
      headers: ['Category', 'Description', 'Forecast'],
      rows: [{ Category: '', Description: '', Forecast: '' }],
    };

    const items = parseSheetRows(data);
    expect(items).toHaveLength(0); // filtered out — all values are empty after trim
  });

  it('handles a row with at least one non-empty cell', () => {
    const data: SheetData = {
      tab: 'CapEx',
      headers: ['Category', 'Description', 'Forecast'],
      rows: [{ Category: 'Plumbing', Description: '', Forecast: '' }],
    };

    const items = parseSheetRows(data);
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe('Plumbing');
    expect(items[0].forecastAmount).toBe(0);
  });

  it('parses currency strings correctly', () => {
    const data: SheetData = {
      tab: 'CapEx',
      headers: ['Category', 'Forecast', 'Actual'],
      rows: [
        { Category: 'Test', Forecast: '$12,345.67', Actual: '$ 9,876.54' },
      ],
    };

    const items = parseSheetRows(data);
    expect(items[0].forecastAmount).toBeCloseTo(12345.67, 2);
    expect(items[0].actualAmount).toBeCloseTo(9876.54, 2);
  });

  it('parses status values correctly', () => {
    const data: SheetData = {
      tab: 'CapEx',
      headers: ['Category', 'Status'],
      rows: [
        { Category: 'A', Status: 'Paid' },
        { Category: 'B', Status: 'Invoiced' },
        { Category: 'C', Status: 'Quoted' },
        { Category: 'D', Status: 'Invoice Sent' },
        { Category: 'E', Status: 'Quote Pending' },
        { Category: 'F', Status: '' },
        { Category: 'G', Status: 'Random' },
      ],
    };

    const items = parseSheetRows(data);
    expect(items[0].status).toBe('paid');
    expect(items[1].status).toBe('invoiced');
    expect(items[2].status).toBe('quoted');
    expect(items[3].status).toBe('invoiced');  // starts with 'invoice'
    expect(items[4].status).toBe('quoted');     // starts with 'quote'
    expect(items[5].status).toBe('forecast');   // empty → default
    expect(items[6].status).toBe('forecast');   // unrecognized → default
  });

  it('assigns sequential IDs', () => {
    const data: SheetData = {
      tab: 'CapEx',
      headers: ['Category'],
      rows: [{ Category: 'A' }, { Category: 'B' }, { Category: 'C' }],
    };

    const items = parseSheetRows(data);
    expect(items.map(i => i.id)).toEqual(['item-0', 'item-1', 'item-2']);
  });

  it('defaults category to Uncategorised when column is missing', () => {
    const data: SheetData = {
      tab: 'CapEx',
      headers: ['Description'],
      rows: [{ Description: 'Something' }],
    };

    const items = parseSheetRows(data);
    expect(items[0].category).toBe('Uncategorised');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// computeCapExSummary
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeCapExSummary', () => {
  function makeItem(overrides: Partial<CostLineItem> = {}): CostLineItem {
    return {
      id: 'item-0',
      category: 'General',
      description: 'Test item',
      forecastAmount: 10000,
      actualAmount: 8000,
      variance: 2000,
      status: 'paid',
      ...overrides,
    };
  }

  it('computes totals correctly', () => {
    const items = [
      makeItem({ forecastAmount: 10000, actualAmount: 8000, status: 'paid' }),
      makeItem({ forecastAmount: 5000, actualAmount: 4000, status: 'paid' }),
      makeItem({ forecastAmount: 3000, actualAmount: 2500, status: 'invoiced' }),
    ];

    const summary = computeCapExSummary(items);
    expect(summary.totalBudget).toBe(18000);
    expect(summary.totalSpent).toBe(12000);    // paid items actual amounts
    expect(summary.totalCommitted).toBe(2500);  // invoiced items actual amounts
    expect(summary.totalRemaining).toBe(3500);  // 18000 - 12000 - 2500
  });

  it('calculates burn percentage correctly', () => {
    const items = [
      makeItem({ forecastAmount: 10000, actualAmount: 9000, status: 'paid' }),
    ];
    const summary = computeCapExSummary(items);
    expect(summary.burnPercentage).toBe(90); // (9000 + 0) / 10000 * 100
  });

  it('handles zero budget', () => {
    const items = [makeItem({ forecastAmount: 0, actualAmount: 0 })];
    const summary = computeCapExSummary(items);
    expect(summary.burnPercentage).toBe(0);
  });

  it('groups items by category', () => {
    const items = [
      makeItem({ category: 'Plumbing', forecastAmount: 5000 }),
      makeItem({ category: 'Plumbing', forecastAmount: 3000 }),
      makeItem({ category: 'Electrical', forecastAmount: 7000 }),
    ];

    const summary = computeCapExSummary(items);
    expect(summary.categories).toHaveLength(2);

    const plumbing = summary.categories.find(c => c.name === 'Plumbing');
    expect(plumbing).toBeTruthy();
    expect(plumbing!.forecastTotal).toBe(8000);
    expect(plumbing!.items).toHaveLength(2);
  });

  it('generates danger signal when category is over budget by > 15%', () => {
    const items = [
      makeItem({ category: 'Plumbing', forecastAmount: 5000, actualAmount: 6000 }),
    ];

    const summary = computeCapExSummary(items);
    const signal = summary.signals.find(s => s.title === 'Plumbing over budget');
    expect(signal).toBeTruthy();
    expect(signal!.type).toBe('danger');
  });

  it('generates warning signal when category is over budget by <= 15%', () => {
    const items = [
      makeItem({ category: 'Plumbing', forecastAmount: 10000, actualAmount: 11000 }),
    ];

    const summary = computeCapExSummary(items);
    const signal = summary.signals.find(s => s.title === 'Plumbing over budget');
    expect(signal).toBeTruthy();
    expect(signal!.type).toBe('warning');
  });

  it('generates danger signal when burn > 90%', () => {
    const items = [
      makeItem({ forecastAmount: 10000, actualAmount: 9500, status: 'paid' }),
    ];

    const summary = computeCapExSummary(items);
    const signal = summary.signals.find(s => s.title === 'Budget nearly exhausted');
    expect(signal).toBeTruthy();
    expect(signal!.type).toBe('danger');
  });

  it('generates warning signal when burn > 75% but <= 90%', () => {
    const items = [
      makeItem({ forecastAmount: 10000, actualAmount: 8000, status: 'paid' }),
    ];

    const summary = computeCapExSummary(items);
    const signal = summary.signals.find(s => s.title === 'High burn rate');
    expect(signal).toBeTruthy();
    expect(signal!.type).toBe('warning');
  });

  it('generates success signal when tracking under forecast', () => {
    const items = [
      makeItem({ forecastAmount: 10000, actualAmount: 5000, status: 'paid' }),
    ];

    const summary = computeCapExSummary(items);
    const signal = summary.signals.find(s => s.title === 'Tracking under forecast');
    expect(signal).toBeTruthy();
    expect(signal!.type).toBe('success');
  });

  it('uses forecast amount for committed items with zero actuals', () => {
    const items = [
      makeItem({ forecastAmount: 5000, actualAmount: 0, status: 'quoted' }),
    ];

    const summary = computeCapExSummary(items);
    expect(summary.totalCommitted).toBe(5000); // falls back to forecastAmount
  });

  it('returns empty signals for a clean budget', () => {
    const items = [
      makeItem({ forecastAmount: 10000, actualAmount: 2000, status: 'paid' }),
    ];

    const summary = computeCapExSummary(items);
    // 20% burn — no warning/danger signals
    const warningOrDanger = summary.signals.filter(s => s.type === 'warning' || s.type === 'danger');
    expect(warningOrDanger).toHaveLength(0);
  });
});
