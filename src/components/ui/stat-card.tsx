import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

interface StatCardProps {
  value: React.ReactNode;
  label: string;
  note?: string;
  className?: string;
}

/**
 * Investor-style stat card: large number → label → contextual note.
 * Matches the Amplemarket-style card pattern: big stat, category beneath,
 * body-sized context note pinned to the bottom with a separator.
 */
export function StatCard({ value, label, note, className }: StatCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-5 flex flex-col min-h-[136px]">
        {/* Stat + label */}
        <div className="flex-1">
          <div className="text-[2rem] font-bold tabular-nums tracking-tight leading-none text-foreground">
            {value}
          </div>
          <p className="text-sm text-muted-foreground mt-2 leading-snug">{label}</p>
        </div>

        {/* Context note — pinned to bottom with separator */}
        {note && (
          <p className="text-sm text-muted-foreground mt-5 pt-3 border-t border-border leading-snug">
            {note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
