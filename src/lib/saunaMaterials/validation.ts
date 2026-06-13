import { z } from 'zod';
import type { BOMWarning, Library, Project } from '@/types/saunaMaterials';
import { WALL_IDS, wallNetArea } from './geometry';

const wallSchema = z.enum(['north', 'south', 'east', 'west']);
const columnLocationSchema = z.enum(['north', 'south', 'east', 'west', 'freestanding']);

const positiveInt = z.number().int().nonnegative();

const roomSchema = z.object({
  length: positiveInt,
  width: positiveInt,
  ceilingHeight: positiveInt,
});

const xy = z.number().optional();
const rotation = z.number().optional();

const openingSchema = z.object({
  id: z.string(),
  type: z.enum(['door', 'window', 'vent']),
  wall: wallSchema,
  shape: z.enum(['rectangle', 'circle']),
  width: positiveInt,
  height: positiveInt,
  startOffset: positiveInt.optional(),
  x: xy,
  y: xy,
  rotation,
});

const heaterZoneSchema = z.object({
  wall: wallSchema,
  width: positiveInt,
  height: positiveInt,
  finish: z.enum(['tile', 'timber']),
  startOffset: positiveInt.optional(),
  x: xy,
  y: xy,
  rotation,
  depth: positiveInt.optional(),
});

const columnSchema = z.object({
  id: z.string(),
  wall: columnLocationSchema,
  width: positiveInt,
  depth: positiveInt,
  height: positiveInt,
  finish: z.enum(['tile', 'timber']),
  extendsToCeiling: z.boolean(),
  startOffset: positiveInt.optional(),
  x: xy,
  y: xy,
  rotation,
});

const benchSchema = z.object({
  id: z.string(),
  tier: z.enum(['climbStep', 'foot', 'upper', 'high', 'accessible']),
  wall: wallSchema,
  length: positiveInt,
  depth: positiveInt,
  topHeight: positiveInt,
  hasBackrest: z.boolean(),
  backrestHeight: positiveInt,
  hasEndCap: z.enum(['left', 'right', 'both', 'none']),
  closedFront: z.boolean(),
  hasSkirting: z.boolean().optional(),
  skirtingHeight: positiveInt.optional(),
  startOffset: positiveInt.optional(),
  x: xy,
  y: xy,
  rotation,
  slatCount: positiveInt.optional(),
  slatGap: positiveInt.optional(),
  rearVentilation: positiveInt.optional(),
  slatConstructionType: z.enum(['wallMounted', 'box']).optional(),
});

const benchConstructionSchema = z.object({
  method: z.enum(['floating', 'legPost', 'bracket', 'hybrid']),
  frameMaterial: z.enum(['timber', 'steel']),
  frontStyle: z.enum(['open', 'fascia', 'tiled']),
  supportSpacing: positiveInt,
  bearerSpacing: positiveInt,
});

const constructionSchema = z.object({
  behindBenchClad: z.boolean(),
  crossBattening: z.boolean(),
  battenSpacing: positiveInt,
  insulationDepth: positiveInt,
  vapourBarrierType: z.enum(['foilPaper', 'pureFoil']),
  ceilingInsulationDepth: positiveInt,
  fixingsDensityCladding: z.number().nonnegative(),
  fixingsDensityBench: z.number().nonnegative(),
});

const wasteSchema = z.object({
  cladding: z.number().nonnegative(),
  benchSlat: z.number().nonnegative(),
  framing: z.number().nonnegative(),
  batten: z.number().nonnegative(),
});

const profileSelectionsSchema = z.object({
  wallCladding: z.string(),
  ceilingCladding: z.string(),
  benchSlat: z.string(),
  benchFraming: z.string(),
  batten: z.string(),
  backrest: z.string(),
  insulation: z.string(),
  ceilingInsulation: z.string(),
  vapourBarrier: z.string(),
  tape: z.string(),
  claddingScrews: z.string(),
  benchScrews: z.string(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  client: z.string(),
  location: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  room: roomSchema,
  openings: z.array(openingSchema),
  heaterZone: heaterZoneSchema.nullable(),
  columns: z.array(columnSchema),
  benches: z.array(benchSchema),
  construction: constructionSchema,
  benchConstruction: benchConstructionSchema.default({
    method: 'hybrid',
    frameMaterial: 'timber',
    frontStyle: 'fascia',
    supportSpacing: 1500,
    bearerSpacing: 800,
  }),
  waste: wasteSchema,
  profiles: profileSelectionsSchema,
});

const profileLibrarySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum([
    'wallCladding',
    'ceilingCladding',
    'benchSlat',
    'framing',
    'batten',
    'backrest',
  ]),
  species: z.string(),
  faceWidth: positiveInt,
  coverWidth: positiveInt,
  thickness: positiveInt,
  stockLengths: z.array(z.number().positive()),
  pricePerLM: z.number().nullable(),
  supplier: z.string(),
  notes: z.string(),
});

const materialLibrarySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['insulation', 'vapourBarrier', 'tape', 'fixings', 'sealant', 'misc']),
  unit: z.enum(['m2', 'roll', 'box', 'each', 'lm', 'hr']),
  unitSize: z.number().positive(),
  pricePerUnit: z.number().nullable(),
  supplier: z.string(),
  notes: z.string(),
});

export const librarySchema = z.object({
  profiles: z.array(profileLibrarySchema),
  materials: z.array(materialLibrarySchema),
});

const TYPICAL_HEATER_STONE_HEIGHT_MM = 750;

/**
 * Non-blocking warnings — collected into the BOM rather than thrown. Geometry
 * issues (clamped wall area), bench rules of thumb, and missing library
 * references all surface here.
 */
export function collectWarnings(project: Project, library: Library): BOMWarning[] {
  const out: BOMWarning[] = [];

  // Wall area clamped
  for (const wall of WALL_IDS) {
    const result = wallNetArea(project, wall);
    if (result.clamped) {
      out.push({
        severity: 'warning',
        code: 'wall-area-clamped',
        message: `${wall} wall: subtractions exceed gross area, clamped to zero. Check openings and bench dimensions.`,
      });
    }
  }

  // Foot bench below typical heater stone height
  for (const b of project.benches) {
    if (b.tier === 'foot' && b.topHeight < TYPICAL_HEATER_STONE_HEIGHT_MM) {
      out.push({
        severity: 'warning',
        code: 'foot-bench-low',
        message: `Foot bench top is ${b.topHeight}mm AFF — below the typical ${TYPICAL_HEATER_STONE_HEIGHT_MM}mm heater stone level.`,
      });
    }
  }

  // Bench tier ordering per wall
  const order: Record<string, number> = { climbStep: 0, foot: 1, upper: 2, accessible: 1 };
  const byWall = new Map<string, typeof project.benches>();
  for (const b of project.benches) {
    const list = byWall.get(b.wall) ?? [];
    list.push(b);
    byWall.set(b.wall, list);
  }
  for (const [wall, list] of byWall.entries()) {
    const sorted = [...list].sort((a, b) => a.topHeight - b.topHeight);
    for (let i = 1; i < sorted.length; i++) {
      if (order[sorted[i].tier] < order[sorted[i - 1].tier]) {
        out.push({
          severity: 'info',
          code: 'bench-tier-order',
          message: `Bench tiers on ${wall} wall are not in ascending order — review tier assignment.`,
        });
        break;
      }
    }
  }

  // Profile + material reference integrity
  const profileIds = new Set(library.profiles.map(p => p.id));
  const materialIds = new Set(library.materials.map(m => m.id));
  const sel = project.profiles;

  const profileFields: Array<[keyof typeof sel, string]> = [
    ['wallCladding', 'wall cladding'],
    ['ceilingCladding', 'ceiling cladding'],
    ['benchSlat', 'bench slat'],
    ['benchFraming', 'bench framing'],
    ['batten', 'batten'],
    ['backrest', 'backrest'],
  ];
  for (const [key, label] of profileFields) {
    if (!profileIds.has(sel[key])) {
      out.push({
        severity: 'warning',
        code: 'missing-profile',
        message: `Selected ${label} profile "${sel[key]}" is missing from the library.`,
      });
    }
  }

  const materialFields: Array<[keyof typeof sel, string]> = [
    ['insulation', 'insulation'],
    ['ceilingInsulation', 'ceiling insulation'],
    ['vapourBarrier', 'vapour barrier'],
    ['tape', 'foil tape'],
    ['claddingScrews', 'cladding screws'],
    ['benchScrews', 'bench screws'],
  ];
  for (const [key, label] of materialFields) {
    if (!materialIds.has(sel[key])) {
      out.push({
        severity: 'warning',
        code: 'missing-material',
        message: `Selected ${label} material "${sel[key]}" is missing from the library.`,
      });
    }
  }

  return out;
}
