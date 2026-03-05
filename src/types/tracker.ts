// ── Status ──────────────────────────────────────────────────────────────────
export type ItemStatus = 'forecast' | 'quoted' | 'invoiced' | 'paid';

// ── Core line item ──────────────────────────────────────────────────────────
export interface CostLineItem {
  id: string;
  category: string;
  description: string;
  supplier?: string;
  forecastAmount: number;
  /** Amount actually spent/invoiced */
  actualAmount: number;
  /** forecastAmount - actualAmount (positive = under budget) */
  variance: number;
  status: ItemStatus;
  date?: string;
  notes?: string;
}

// ── Aggregations ─────────────────────────────────────────────────────────────
export interface CategorySummary {
  name: string;
  forecastTotal: number;
  actualTotal: number;
  /** forecastTotal - actualTotal */
  variance: number;
  items: CostLineItem[];
}

export type SignalType = 'success' | 'info' | 'warning' | 'danger';

export interface FinancialSignal {
  type: SignalType;
  title: string;
  message: string;
  amount?: number;
}

export interface CapExSummary {
  totalBudget: number;
  totalSpent: number;
  /** Quoted or invoiced, not yet paid */
  totalCommitted: number;
  totalRemaining: number;
  /** (spent + committed) / budget × 100 */
  burnPercentage: number;
  categories: CategorySummary[];
  signals: FinancialSignal[];
  items: CostLineItem[];
}

// ── Chart data ───────────────────────────────────────────────────────────────
export interface BurnDataPoint {
  month: string;
  cumulativeBudget: number;
  cumulativeActual: number;
}

// ── Google Sheets helpers ────────────────────────────────────────────────────
export interface SheetTab {
  name: string;
  sheetId: number;
  index: number;
}

export interface SheetData {
  tab: string;
  headers: string[];
  rows: Record<string, string>[];
}

// ── API response ─────────────────────────────────────────────────────────────
export interface TrackerApiResponse {
  items: CostLineItem[];
  summary: CapExSummary;
  usingDemo: boolean;
  usingCache: boolean;
}
