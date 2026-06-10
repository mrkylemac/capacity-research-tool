export type Severity = 'red' | 'amber' | 'green' | 'clear';

export type FindingCategory =
  | 'cutEfficiency'
  | 'perimeterEdges'
  | 'poolDimensions'
  | 'skimmerFit'
  | 'waterline'
  | 'topCourse'
  | 'fittings'
  | 'footprint';

export interface Finding {
  id: string;
  severity: Exclude<Severity, 'clear'>;
  category: FindingCategory;
  title: string;
  location: string;
  whatItSays: string;
  whyItMatters: string;
  marketNorm: string;
  whatToDo: string;
}

export interface GreenNote {
  id: string;
  category: FindingCategory;
  item: string;
  location: string;
  note: string;
}

export interface HeatMapRow {
  category: FindingCategory;
  label: string;
  severity: Severity;
  statusText: string;
}

export interface LayupBrief {
  bottomLine: string;
  posture: 'lay-as-is' | 'lay-with-tweaks' | 'pause-and-fix';
  counts: { red: number; amber: number; green: number };
  heatMap: HeatMapRow[];
  findings: Finding[];
  greenNotes: GreenNote[];
  questions: string[];
  housekeeping: string[];
}
