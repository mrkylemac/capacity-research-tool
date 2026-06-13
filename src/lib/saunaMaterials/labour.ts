import type { Bench, BenchTier, EndCap, Project } from '@/types/saunaMaterials';
import { mm } from './conversions';

export interface LabourPhase {
  id: string;
  description: string;
  hours: number;
}

// ── Per-bench estimation ─────────────────────────────────────────────────────

/** Base hours for each tier at a reference bench length of 3.8 m. */
const TIER_BASE_HOURS: Record<BenchTier, number> = {
  climbStep:  6,
  foot:       10,
  upper:      13,
  high:       15,
  accessible: 10,
};

const REFERENCE_LM = 3.8;

function endCapCount(cap: EndCap): number {
  if (cap === 'both') return 2;
  if (cap === 'none') return 0;
  return 1;
}

function benchHours(bench: Bench): number {
  const lengthLm = mm(bench.length);
  const base     = TIER_BASE_HOURS[bench.tier] * (lengthLm / REFERENCE_LM);
  const backrest = bench.hasBackrest ? 3 : 0;
  const endCaps  = endCapCount(bench.hasEndCap);
  return Math.round(base + backrest + endCaps);
}

// ── Project-level estimation ─────────────────────────────────────────────────

export function estimateLabourPhases(project: Project): LabourPhase[] {
  const { room, benches, openings, heaterZone } = project;

  const wallM2     = 2 * (room.length + room.width) * room.ceilingHeight / 1e6;
  const ceilingM2  = (room.length * room.width) / 1e6;
  const envelopeM2 = wallM2 + ceilingM2;

  const phases: LabourPhase[] = [
    {
      id: 'labour-services',
      description: 'Services rough-in (electrical, plumbing, ventilation)',
      hours: 18,
    },
    {
      id: 'labour-insulation',
      description: 'Insulation',
      hours: Math.max(4, Math.round(envelopeM2 / 6)),
    },
    {
      id: 'labour-vapour',
      description: 'Vapour barrier and taping',
      hours: Math.max(4, Math.round(envelopeM2 / 7)),
    },
    {
      id: 'labour-battening',
      description: 'Counter battening',
      hours: Math.max(3, Math.round(envelopeM2 / 12)),
    },
    {
      id: 'labour-cladding',
      description: 'Wall and ceiling cladding',
      hours: Math.max(8, Math.round(envelopeM2 / 4)),
    },
  ];

  if (heaterZone) {
    const heaterM2 = (heaterZone.width * heaterZone.height) / 1e6;
    phases.push({
      id: 'labour-tiling',
      description: 'Heater zone tiling',
      hours: Math.max(4, Math.round(heaterM2 * 1.5 + 2)),
    });
  }

  if (benches.length > 0) {
    const totalBenchHrs = benches.reduce((sum, b) => sum + benchHours(b), 0);
    const totalBenchLm  = benches.reduce((sum, b) => sum + mm(b.length), 0);
    phases.push({
      id: 'labour-benches',
      description: `Bench construction — ${benches.length} bench${benches.length !== 1 ? 'es' : ''}, ${totalBenchLm.toFixed(1)} lm`,
      hours: totalBenchHrs,
    });
  }

  for (const o of openings) {
    const label = o.type.charAt(0).toUpperCase() + o.type.slice(1);
    const hrs   = o.type === 'door' ? 6 : o.shape === 'circle' ? 8 : 4;
    phases.push({
      id: `labour-opening-${o.id}`,
      description: `${label} — ${o.wall} wall`,
      hours: hrs,
    });
  }

  phases.push(
    {
      id: 'labour-electrical',
      description: 'Electrical final fix (heater, controls, lighting)',
      hours: 6,
    },
    {
      id: 'labour-finishes',
      description: 'Finishes and commissioning',
      hours: 10,
    },
  );

  return phases;
}

export function totalLabourHours(phases: LabourPhase[]): number {
  return phases.reduce((sum, p) => sum + p.hours, 0);
}
