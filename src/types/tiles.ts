export type PoolId = 'hot' | 'cold';

export interface PoolConfig {
  length: number;
  width: number;
  shellHeight: number;
  waterDepth: number;
}

export type LidType = 'standard' | 'hide';

export interface SkimmerConfig {
  offsetX: number;
  offsetY: number;
  width: number;
  depth: number;
  bodySize: number;
  facing: 'left' | 'right';
  lidType: LidType;
}

export type FittingKind = 'handrail' | 'suction' | 'returnJet' | 'light';
export type FittingSurface = 'deck' | 'wallNorth' | 'wallSouth' | 'wallEast' | 'wallWest' | 'floor';

export interface Fitting {
  id: string;
  kind: FittingKind;
  pool: PoolId | 'shared';
  surface: FittingSurface;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface TilePlanConfig {
  tileSize: number;
  tileThickness: number;
  groutWidth: number;
  edgeWidth: number;
  centreWidth: number;
  maxOverallLength: number;
  hotPool: PoolConfig;
  coldPool: PoolConfig;
  hotSkimmer: SkimmerConfig;
  coldSkimmer: SkimmerConfig;
  gridOriginX: number;
  gridOriginY: number;
  fittings: Fitting[];
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RectWithKind extends Rect {
  kind: string;
  label?: string;
}

export interface DeckGeometry {
  bounds: Rect;
  outer: Rect;
  coldPool: Rect;
  hotPool: Rect;
  centre: Rect;
  coldSkimmer: Rect;
  hotSkimmer: Rect;
  coldSkimmerBody: Rect;
  hotSkimmerBody: Rect;
  cutouts: RectWithKind[];
}

export type TileStatus = 'full' | 'cut' | 'outside';

export interface TileCell {
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  status: TileStatus;
  cutWidth: number;
  cutHeight: number;
  cutArea: number;
  fullArea: number;
}

export interface TileStats {
  full: number;
  cut: number;
  total: number;
  cutSizes: { label: string; count: number }[];
  wastePercent: number;
}

export interface ElevationCourse {
  index: number;
  yBottom: number;
  yTop: number;
  height: number;
  isCut: boolean;
}

export interface ElevationLayout {
  shellHeight: number;
  waterDepth: number;
  length: number;
  courses: ElevationCourse[];
  columns: ElevationCourse[];
  waterlineOffsetInCourse: number;
  waterlineFallsOnGroutLine: boolean;
}
