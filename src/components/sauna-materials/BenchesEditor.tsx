'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type { Bench } from '@/types/saunaMaterials';

const TIER_LABEL: Record<string, string> = {
  climbStep:  'Climb step',
  foot:       'Foot bench',
  upper:      'Upper bench',
  accessible: 'Accessible',
};

const WALL_LABEL: Record<string, string> = {
  north: 'North',
  south: 'South',
  east:  'East',
  west:  'West',
};

function feature(b: Bench): string {
  const parts: string[] = [];
  if (b.hasBackrest) parts.push(`backrest ${b.backrestHeight}mm`);
  if (b.hasEndCap !== 'none') parts.push(`end cap ${b.hasEndCap}`);
  if (!b.closedFront) parts.push('open front');
  return parts.join(' · ') || '—';
}

export function BenchesEditor() {
  const { project } = useSaunaMaterials();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">Bench layout</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fixed Slow Folk configuration · change timber in Profiles
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-2">
                <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium pb-2 pr-4">Tier</th>
                <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium pb-2 pr-4">Wall</th>
                <th className="text-right text-[11px] uppercase tracking-wide text-muted-foreground font-medium pb-2 pr-4">Length</th>
                <th className="text-right text-[11px] uppercase tracking-wide text-muted-foreground font-medium pb-2 pr-4">Depth</th>
                <th className="text-right text-[11px] uppercase tracking-wide text-muted-foreground font-medium pb-2 pr-4">Top height</th>
                <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium pb-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-2">
              {project.benches.map(b => (
                <tr key={b.id}>
                  <td className="py-2.5 pr-4 font-medium text-fg-4">{TIER_LABEL[b.tier] ?? b.tier}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{WALL_LABEL[b.wall] ?? b.wall}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-fg-4">{b.length.toLocaleString()} mm</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">{b.depth} mm</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">{b.topHeight} mm</td>
                  <td className="py-2.5 text-xs text-muted-foreground">{feature(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
