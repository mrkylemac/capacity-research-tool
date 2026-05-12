// Sauna Bill of Materials — domain types
// All linear dimensions are millimetres (mm) unless suffixed otherwise.
// Areas are square metres (m²); BOM lengths are lineal metres (lm).

export type WallId = 'north' | 'south' | 'east' | 'west';

export interface Room {
  /** mm — the longer dimension. North + south walls run this length. */
  length: number;
  /** mm — the shorter dimension. East + west walls run this length. */
  width: number;
  /** mm — finished ceiling level (FCL). */
  ceilingHeight: number;
}

export type OpeningShape = 'rectangle' | 'circle';
export type OpeningType = 'door' | 'window' | 'vent';

export interface Opening {
  id: string;
  type: OpeningType;
  wall: WallId;
  shape: OpeningShape;
  /** mm. For circle this is diameter. */
  width: number;
  /** mm. Ignored when shape === 'circle'. */
  height: number;
  /** Optional position along the wall, mm from the wall start. Used for diagram only. */
  startOffset?: number;
  /** Free-position top-left X in room coords (mm). Overrides wall layout. */
  x?: number;
  /** Free-position top-left Y in room coords (mm). Overrides wall layout. */
  y?: number;
  /** Rotation in degrees, around the item centre. Defaults to 0. */
  rotation?: number;
}

export type SurfaceFinish = 'tile' | 'timber';

export interface HeaterZone {
  wall: WallId;
  /** mm — width of the cladding zone around the heater. */
  width: number;
  /** mm — height up the wall. */
  height: number;
  finish: SurfaceFinish;
  /** Optional position along the wall, mm from the wall start. Used for diagram only. */
  startOffset?: number;
  /** Free-position top-left X in room coords (mm). Overrides wall layout. */
  x?: number;
  /** Free-position top-left Y in room coords (mm). Overrides wall layout. */
  y?: number;
  /** Rotation in degrees, around the item centre. Defaults to 0. */
  rotation?: number;
  /** Free-position depth (footprint into the room, mm). Defaults to a thin strip when not set. */
  depth?: number;
}

export type ColumnLocation = WallId | 'freestanding';

export interface Column {
  id: string;
  wall: ColumnLocation;
  /** mm — side length on the wall face. */
  width: number;
  /** mm — projection from the wall. */
  depth: number;
  /** mm. */
  height: number;
  finish: SurfaceFinish;
  /** When true, the column footprint is subtracted from the ceiling area. */
  extendsToCeiling: boolean;
  /** Optional position along the wall, mm from the wall start. Used for diagram only. */
  startOffset?: number;
  /** Free-position top-left X in room coords (mm). Overrides wall layout. */
  x?: number;
  /** Free-position top-left Y in room coords (mm). Overrides wall layout. */
  y?: number;
  /** Rotation in degrees, around the item centre. Defaults to 0. */
  rotation?: number;
}

export type BenchTier = 'climbStep' | 'foot' | 'upper' | 'accessible';
export type EndCap = 'left' | 'right' | 'both' | 'none';

/**
 * How the slat cross-section is constructed.
 *
 * - `wallMounted` — front fascia + slats + rear ventilation gap at the wall.
 *   Used for standard benches fixed to a wall (foot, upper, accessible).
 * - `box` — two side pieces enclosing the slats with uniform gaps on all sides.
 *   Used for freestanding step elements (climb step).
 *
 * When undefined on a Bench, the type is derived from the tier via
 * `resolvedSlatConstructionType()`. The explicit field allows future overrides
 * without changing the tier (e.g. a box-built foot bench in an unusual design).
 */
export type SlatConstructionType = 'wallMounted' | 'box';

export interface Bench {
  id: string;
  tier: BenchTier;
  wall: WallId;
  /** mm — run along the wall. Auto-set to wall length when using full-wall mode. */
  length: number;
  /** mm — projection from the wall. */
  depth: number;
  /** mm AFF — top of bench surface. */
  topHeight: number;
  hasBackrest: boolean;
  /** mm — height above bench top. 0 when no backrest. */
  backrestHeight: number;
  hasEndCap: EndCap;
  /** true = front fully clad, false = open slat fascia (uses OPEN_FASCIA_FILL_RATIO). */
  closedFront: boolean;
  /** Skirting board along the base of the bench front. */
  hasSkirting?: boolean;
  /** mm — height of the skirting board. */
  skirtingHeight?: number;
  /** Optional offset along the wall, mm. Used by the overlap sweep when set. */
  startOffset?: number;
  x?: number;
  y?: number;
  rotation?: number;
  /** Number of slats across bench depth — when set, depth is derived from slat geometry. */
  slatCount?: number;
  /** mm gap between adjacent slats. Defaults to 10 when slatCount is set. */
  slatGap?: number;
  /** mm rear ventilation gap at wall. Defaults to slatGap (lower tiers) or 25 (upper). Only applies to wallMounted construction. */
  rearVentilation?: number;
  /**
   * Explicit slat construction type override. When undefined, derived from tier:
   * climbStep → 'box', all others → 'wallMounted'.
   */
  slatConstructionType?: SlatConstructionType;
}

export type BenchMethod = 'floating' | 'legPost' | 'bracket' | 'hybrid';
export type FrameMaterial = 'timber' | 'steel';
export type FrontStyle = 'open' | 'fascia' | 'tiled';

/** How the bench frames are built — drives framing LM and finish choices. */
export interface BenchConstruction {
  /** Structural support method. */
  method: BenchMethod;
  /** Frame material. */
  frameMaterial: FrameMaterial;
  /** How the visible front face is finished. */
  frontStyle: FrontStyle;
  /**
   * mm — centre-to-centre spacing of primary supports along bench length.
   * Leg centres for legPost/hybrid; cleat/bracket centres for floating/bracket.
   */
  supportSpacing: number;
  /** mm — centre-to-centre cross bearer spacing across bench depth. */
  bearerSpacing: number;
}

export type ProfileCategory =
  | 'wallCladding'
  | 'ceilingCladding'
  | 'benchSlat'
  | 'framing'
  | 'batten'
  | 'backrest';

export interface Profile {
  id: string;
  name: string;
  category: ProfileCategory;
  species: string;
  /** mm — total face width of the board. */
  faceWidth: number;
  /** mm — effective installed cover (face width minus tongue). */
  coverWidth: number;
  /** mm. */
  thickness: number;
  /** Available stock lengths, metres. */
  stockLengths: number[];
  /** AUD per lineal metre. */
  pricePerLM: number | null;
  supplier: string;
  notes: string;
}

export type MaterialCategory =
  | 'insulation'
  | 'vapourBarrier'
  | 'tape'
  | 'fixings'
  | 'sealant'
  | 'misc';

export type MaterialUnit = 'm2' | 'roll' | 'box' | 'each' | 'lm' | 'hr';

export interface MaterialItem {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  /** Quantity-per-unit in the unit's natural measure (m² per roll, screws per box, etc.). */
  unitSize: number;
  pricePerUnit: number | null;
  supplier: string;
  notes: string;
}

export type VapourBarrierType = 'foilPaper' | 'pureFoil';

export interface Construction {
  /** When true, walls behind benches are still clad (and not subtracted). */
  behindBenchClad: boolean;
  /** Counter battens for thermal-bridge break. */
  crossBattening: boolean;
  /** mm — typical 600. */
  battenSpacing: number;
  /** mm — wall insulation depth. */
  insulationDepth: number;
  vapourBarrierType: VapourBarrierType;
  /** mm — ceiling insulation depth (often deeper than walls). */
  ceilingInsulationDepth: number;
  /** Fixings per m² of cladding. */
  fixingsDensityCladding: number;
  /** Fixings per m² of bench surface. */
  fixingsDensityBench: number;
}

export interface WasteFactors {
  cladding: number;
  benchSlat: number;
  framing: number;
  batten: number;
}

export interface ProfileSelections {
  wallCladding: string;
  ceilingCladding: string;
  benchSlat: string;
  benchFraming: string;
  batten: string;
  backrest: string;
  insulation: string;
  ceilingInsulation: string;
  vapourBarrier: string;
  tape: string;
  claddingScrews: string;
  benchScrews: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  room: Room;
  openings: Opening[];
  heaterZone: HeaterZone | null;
  columns: Column[];
  benches: Bench[];
  construction: Construction;
  benchConstruction: BenchConstruction;
  waste: WasteFactors;
  profiles: ProfileSelections;
}

export interface Library {
  profiles: Profile[];
  materials: MaterialItem[];
}

// ── BOM output ──────────────────────────────────────────────────────────────

export type BOMCategory =
  | 'timber'
  | 'insulation'
  | 'vapourBarrier'
  | 'tape'
  | 'fixings'
  | 'misc'
  | 'labour';

export type BOMUnit = MaterialUnit;

export interface BOMLineItem {
  id: string;
  category: BOMCategory;
  description: string;
  profileOrMaterialName: string;
  quantity: number;
  unit: BOMUnit;
  /** 0.10 = 10%. */
  wasteApplied: number;
  unitPrice: number | null;
  totalPrice: number | null;
  notes: string;
}

export type WarningSeverity = 'info' | 'warning';

export interface BOMWarning {
  severity: WarningSeverity;
  code: string;
  message: string;
}

export interface BOMTotals {
  timberLM: number;
  insulationM2: number;
  vapourBarrierM2: number;
  estimatedTotalCost: number | null;
  /** Total estimated labour hours. Only present when labour is included. */
  labourHours?: number;
}

export interface BOM {
  project: Project;
  generatedAt: string;
  lineItems: BOMLineItem[];
  totals: BOMTotals;
  warnings: BOMWarning[];
}
