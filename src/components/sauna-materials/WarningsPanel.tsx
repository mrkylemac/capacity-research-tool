'use client';

import { AlertTriangle, Info } from 'lucide-react';
import type { BOMWarning } from '@/types/saunaMaterials';

export function WarningsPanel({ warnings }: { warnings: BOMWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="bg-amber-1 border border-amber-3 rounded-xl px-4 py-3">
      <p className="text-sm font-semibold text-amber-4 mb-2">
        {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'} to review
      </p>
      <ul className="space-y-1.5">
        {warnings.map((w, i) => {
          const Icon = w.severity === 'warning' ? AlertTriangle : Info;
          const colour = w.severity === 'warning' ? 'text-amber-4' : 'text-muted-foreground';
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${colour}`} />
              <span className="text-fg-4">{w.message}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
