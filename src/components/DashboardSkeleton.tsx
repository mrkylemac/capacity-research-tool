import { Skeleton } from '@/components/untitled/skeleton';
import { Card, CardContent } from '@/components/untitled/card';

function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-16" />
        {lines > 2 && <Skeleton className="h-3 w-20" />}
      </CardContent>
    </Card>
  );
}

function SkeletonChart({ height = 'h-48' }: { height?: string }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className={`w-full rounded-lg ${height}`} />
      </CardContent>
    </Card>
  );
}

function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="divide-y">
          {/* Header */}
          <div className="flex gap-4 px-4 py-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-3 flex-1" />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              {[1, 2, 3, 4, 5].map(j => (
                <Skeleton key={j} className="h-3 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonSection({ title }: { title: string }) {
  return (
    <div className="space-y-1 mb-4">
      <Skeleton className="h-5 w-40" />
      <span className="sr-only">{title}</span>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-10 mt-8">
      {/* Venue Summary */}
      <section>
        <SkeletonSection title="Venue Summary" />
        {/* Profile card */}
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex gap-6">
              <Skeleton className="h-20 w-20 rounded-xl shrink-0" />
              <div className="flex-1 space-y-4">
                <div>
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 6 metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
        {/* 3 insight cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-2 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Monthly Performance */}
      <section>
        <SkeletonSection title="Monthly Performance" />
        <SkeletonChart height="h-56" />
        <div className="mt-4">
          <SkeletonTable rows={4} />
        </div>
      </section>

      {/* Demand Patterns */}
      <section>
        <SkeletonSection title="Demand Patterns" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-36" />
                <div className="space-y-2">
                  {[1, 2].map(j => (
                    <div key={j} className="flex items-center justify-between">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-3 w-40" />
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 flex-1 rounded-full" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Revenue Insights */}
      <section>
        <SkeletonSection title="Revenue Insights" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <SkeletonChart height="h-56" />
      </section>

      {/* Capacity Trend */}
      <section>
        <SkeletonSection title="Capacity Trend" />
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="text-center p-3 rounded-lg space-y-2">
                  <Skeleton className="h-6 w-12 mx-auto" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </div>
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>
      </section>

      {/* Pricing & Offerings */}
      <section>
        <SkeletonSection title="Pricing & Offerings" />
        <Card className="mb-4">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-3 rounded-lg space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <SkeletonTable rows={5} />
      </section>
    </div>
  );
}
