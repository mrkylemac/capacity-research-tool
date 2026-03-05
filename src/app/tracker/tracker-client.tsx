'use client';

import { TrackerNav }         from '@/components/tracker/TrackerNav';
import { BudgetSummary }      from '@/components/tracker/BudgetSummary';
import { CashSignals }        from '@/components/tracker/CashSignals';
import { BurnChart }          from '@/components/tracker/BurnChart';
import { VarianceChart }      from '@/components/tracker/VarianceChart';
import { CategoryBreakdown }  from '@/components/tracker/CategoryBreakdown';
import { CostTable }          from '@/components/tracker/CostTable';
import { useCapExData }       from '@/hooks/useSheets';

function DemoDataBanner() {
  return (
    <div className="bg-amber-1 border border-amber-3 rounded-xl px-4 py-3 text-sm text-amber-4 mb-4">
      <span className="font-semibold">Demo data</span> — set{' '}
      <code className="font-mono bg-amber-2 px-1 rounded">GOOGLE_SHEETS_API_KEY</code> and{' '}
      <code className="font-mono bg-amber-2 px-1 rounded">GOOGLE_SHEETS_SPREADSHEET_ID</code>{' '}
      in <code className="font-mono bg-amber-2 px-1 rounded">.env.local</code> to connect your workbook.
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-2xl" />
        ))}
      </div>
      <div className="h-3 bg-muted rounded-full" />
      <div className="h-48 bg-muted rounded-2xl" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-1 border border-red-3 rounded-xl px-4 py-4 text-sm text-red-4">
      <p className="font-semibold">Failed to load data</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </div>
  );
}

export function TrackerClient() {
  const { data, isLoading, isError, error } = useCapExData();

  return (
    <main className="min-h-screen">
      <div className="page-container">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-1 text-purple-4 border border-purple-2 tracking-wide uppercase">
              CapEx
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Slow Folk build — capital expenditure control centre</p>
        </div>

        <TrackerNav />

        {/* Banners */}
        {data?.usingDemo && <DemoDataBanner />}

        {/* Content */}
        {isLoading && <LoadingState />}

        {isError && (
          <ErrorState message={error instanceof Error ? error.message : 'Unknown error'} />
        )}

        {data && (
          <div className="space-y-6">

            {/* Hero summary */}
            <div className="section-animate" style={{ animationDelay: '0ms' }}>
              <BudgetSummary summary={data.summary} />
            </div>

            {/* Financial signals */}
            {data.summary.signals.length > 0 && (
              <div className="section-animate" style={{ animationDelay: '60ms' }}>
                <CashSignals signals={data.summary.signals} />
              </div>
            )}

            {/* Charts — 2-col on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 section-animate" style={{ animationDelay: '120ms' }}>
              <BurnChart items={data.items} />
              <VarianceChart categories={data.summary.categories} />
            </div>

            {/* Category breakdown */}
            <div className="section-animate" style={{ animationDelay: '180ms' }}>
              <CategoryBreakdown categories={data.summary.categories} />
            </div>

            {/* Line items table */}
            <div className="section-animate" style={{ animationDelay: '240ms' }}>
              <CostTable categories={data.summary.categories} />
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
