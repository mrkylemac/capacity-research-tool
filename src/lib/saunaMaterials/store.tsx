'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type {
  Bench,
  Column,
  Construction,
  HeaterZone,
  Library,
  MaterialItem,
  Opening,
  Profile,
  Project,
  ProfileSelections,
  Room,
  WasteFactors,
} from '@/types/saunaMaterials';
import { DEFAULT_PROFILE_SELECTIONS, SEED_LIBRARY } from './seedLibrary';
import { librarySchema, projectSchema } from './validation';

const PROJECT_KEY = 'slowfolk:sauna-materials:project';
const LIBRARY_KEY = 'slowfolk:sauna-materials:library';

const SLOW_FOLK_DEMO: Project = {
  id: 'slow-folk-brunswick',
  name: 'Slow Folk Brunswick',
  client: 'Slow Folk',
  location: '219 Albion Street Brunswick VIC',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
  room: { length: 5518, width: 3830, ceilingHeight: 2400 },
  openings: [
    {
      id: 'door-west',
      type: 'door',
      wall: 'west',
      shape: 'rectangle',
      width: 920,
      height: 2375,
    },
    {
      id: 'window-south',
      type: 'window',
      wall: 'south',
      shape: 'circle',
      width: 1530,
      height: 1530,
    },
  ],
  heaterZone: {
    wall: 'south',
    width: 1500,
    height: 2400,
    finish: 'tile',
  },
  columns: [
    {
      id: 'column-south',
      wall: 'south',
      width: 290,
      depth: 290,
      height: 2400,
      finish: 'tile',
      extendsToCeiling: true,
    },
  ],
  benches: [
    {
      id: 'climb-step-north',
      tier: 'climbStep',
      wall: 'north',
      length: 3771,
      depth: 300,
      topHeight: 300,
      hasBackrest: false,
      backrestHeight: 0,
      hasEndCap: 'none',
      closedFront: true,
    },
    {
      id: 'foot-bench-north',
      tier: 'foot',
      wall: 'north',
      length: 3771,
      depth: 600,
      topHeight: 750,
      hasBackrest: false,
      backrestHeight: 0,
      hasEndCap: 'right',
      closedFront: true,
    },
    {
      id: 'upper-bench-north',
      tier: 'upper',
      wall: 'north',
      length: 3771,
      depth: 600,
      topHeight: 1200,
      hasBackrest: true,
      backrestHeight: 250,
      hasEndCap: 'right',
      closedFront: true,
    },
    {
      id: 'accessible-bench-east',
      tier: 'accessible',
      wall: 'east',
      length: 5266,
      depth: 600,
      topHeight: 450,
      hasBackrest: false,
      backrestHeight: 0,
      hasEndCap: 'left',
      closedFront: true,
    },
  ],
  construction: {
    behindBenchClad: true,
    crossBattening: false,
    battenSpacing: 600,
    insulationDepth: 90,
    vapourBarrierType: 'foilPaper',
    ceilingInsulationDepth: 140,
    fixingsDensityCladding: 20,
    fixingsDensityBench: 8,
  },
  waste: {
    cladding: 0.12,
    benchSlat: 0.08,
    framing: 0.10,
    batten: 0.10,
  },
  profiles: { ...DEFAULT_PROFILE_SELECTIONS },
};

export const DEMO_PROJECT = SLOW_FOLK_DEMO;

// ── Actions ─────────────────────────────────────────────────────────────────

export type ProjectAction =
  | { type: 'LOAD_PROJECT'; project: Project }
  | { type: 'UPDATE_META'; patch: Partial<Pick<Project, 'name' | 'client' | 'location'>> }
  | { type: 'UPDATE_ROOM'; patch: Partial<Room> }
  | { type: 'ADD_OPENING'; opening: Opening }
  | { type: 'UPDATE_OPENING'; id: string; patch: Partial<Opening> }
  | { type: 'REMOVE_OPENING'; id: string }
  | { type: 'SET_HEATER'; heater: HeaterZone | null }
  | { type: 'ADD_COLUMN'; column: Column }
  | { type: 'UPDATE_COLUMN'; id: string; patch: Partial<Column> }
  | { type: 'REMOVE_COLUMN'; id: string }
  | { type: 'ADD_BENCH'; bench: Bench }
  | { type: 'UPDATE_BENCH'; id: string; patch: Partial<Bench> }
  | { type: 'REMOVE_BENCH'; id: string }
  | { type: 'UPDATE_CONSTRUCTION'; patch: Partial<Construction> }
  | { type: 'UPDATE_WASTE'; patch: Partial<WasteFactors> }
  | { type: 'UPDATE_PROFILES'; patch: Partial<ProfileSelections> }
  | { type: 'RESET_TO_DEMO' };

function touch<T extends Project>(project: T): T {
  return { ...project, updatedAt: new Date().toISOString() };
}

function projectReducer(state: Project, action: ProjectAction): Project {
  switch (action.type) {
    case 'LOAD_PROJECT':
      return action.project;
    case 'UPDATE_META':
      return touch({ ...state, ...action.patch });
    case 'UPDATE_ROOM':
      return touch({ ...state, room: { ...state.room, ...action.patch } });
    case 'ADD_OPENING':
      return touch({ ...state, openings: [...state.openings, action.opening] });
    case 'UPDATE_OPENING':
      return touch({
        ...state,
        openings: state.openings.map(o =>
          o.id === action.id ? { ...o, ...action.patch } : o
        ),
      });
    case 'REMOVE_OPENING':
      return touch({ ...state, openings: state.openings.filter(o => o.id !== action.id) });
    case 'SET_HEATER':
      return touch({ ...state, heaterZone: action.heater });
    case 'ADD_COLUMN':
      return touch({ ...state, columns: [...state.columns, action.column] });
    case 'UPDATE_COLUMN':
      return touch({
        ...state,
        columns: state.columns.map(c =>
          c.id === action.id ? { ...c, ...action.patch } : c
        ),
      });
    case 'REMOVE_COLUMN':
      return touch({ ...state, columns: state.columns.filter(c => c.id !== action.id) });
    case 'ADD_BENCH':
      return touch({ ...state, benches: [...state.benches, action.bench] });
    case 'UPDATE_BENCH':
      return touch({
        ...state,
        benches: state.benches.map(b =>
          b.id === action.id ? { ...b, ...action.patch } : b
        ),
      });
    case 'REMOVE_BENCH':
      return touch({ ...state, benches: state.benches.filter(b => b.id !== action.id) });
    case 'UPDATE_CONSTRUCTION':
      return touch({
        ...state,
        construction: { ...state.construction, ...action.patch },
      });
    case 'UPDATE_WASTE':
      return touch({ ...state, waste: { ...state.waste, ...action.patch } });
    case 'UPDATE_PROFILES':
      return touch({ ...state, profiles: { ...state.profiles, ...action.patch } });
    case 'RESET_TO_DEMO':
      return SLOW_FOLK_DEMO;
    default:
      return state;
  }
}

// ── Library actions ─────────────────────────────────────────────────────────

export type LibraryAction =
  | { type: 'UPSERT_PROFILE'; profile: Profile }
  | { type: 'REMOVE_PROFILE'; id: string }
  | { type: 'UPSERT_MATERIAL'; material: MaterialItem }
  | { type: 'REMOVE_MATERIAL'; id: string }
  | { type: 'RESET_LIBRARY' };

function libraryReducer(state: Library, action: LibraryAction): Library {
  switch (action.type) {
    case 'UPSERT_PROFILE': {
      const exists = state.profiles.some(p => p.id === action.profile.id);
      return {
        ...state,
        profiles: exists
          ? state.profiles.map(p => (p.id === action.profile.id ? action.profile : p))
          : [...state.profiles, action.profile],
      };
    }
    case 'REMOVE_PROFILE':
      return { ...state, profiles: state.profiles.filter(p => p.id !== action.id) };
    case 'UPSERT_MATERIAL': {
      const exists = state.materials.some(m => m.id === action.material.id);
      return {
        ...state,
        materials: exists
          ? state.materials.map(m => (m.id === action.material.id ? action.material : m))
          : [...state.materials, action.material],
      };
    }
    case 'REMOVE_MATERIAL':
      return { ...state, materials: state.materials.filter(m => m.id !== action.id) };
    case 'RESET_LIBRARY':
      return SEED_LIBRARY;
    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────────────────────

interface SaunaMaterialsContextValue {
  project: Project;
  library: Library;
  hydrated: boolean;
  dispatchProject: (action: ProjectAction) => void;
  dispatchLibrary: (action: LibraryAction) => void;
}

const SaunaMaterialsContext = createContext<SaunaMaterialsContextValue | null>(null);

function safeReadProject(): Project | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return projectSchema.parse(parsed);
  } catch {
    return null;
  }
}

function safeReadLibrary(): Library | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return librarySchema.parse(parsed);
  } catch {
    return null;
  }
}

export function SaunaMaterialsProvider({ children }: PropsWithChildren) {
  const [project, dispatchProject] = useReducer(projectReducer, SLOW_FOLK_DEMO);
  const [library, dispatchLibrary] = useReducer(libraryReducer, SEED_LIBRARY);
  const [hydrated, setHydrated] = useState(false);
  const skipPersist = useRef(true);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    const storedProject = safeReadProject();
    const storedLibrary = safeReadLibrary();
    if (storedProject) {
      dispatchProject({ type: 'LOAD_PROJECT', project: storedProject });
    }
    if (storedLibrary) {
      // Replace library wholesale by removing existing and adding stored.
      // Easiest: emit a synthetic load by resetting + upserting? We need a
      // direct setter — bypass reducer by re-running with a custom action.
      // Simpler: walk a single reset+upsert sequence.
      dispatchLibrary({ type: 'RESET_LIBRARY' });
      for (const p of storedLibrary.profiles) {
        dispatchLibrary({ type: 'UPSERT_PROFILE', profile: p });
      }
      for (const m of storedLibrary.materials) {
        dispatchLibrary({ type: 'UPSERT_MATERIAL', material: m });
      }
    }
    setHydrated(true);
    // Allow persistence after hydration completes.
    requestAnimationFrame(() => {
      skipPersist.current = false;
    });
  }, []);

  // Persist with debounce.
  useEffect(() => {
    if (skipPersist.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
      } catch {
        // ignore quota / disabled storage
      }
    }, 250);
    return () => clearTimeout(t);
  }, [project]);

  useEffect(() => {
    if (skipPersist.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(t);
  }, [library]);

  const value = useMemo<SaunaMaterialsContextValue>(
    () => ({ project, library, hydrated, dispatchProject, dispatchLibrary }),
    [project, library, hydrated]
  );

  return (
    <SaunaMaterialsContext.Provider value={value}>{children}</SaunaMaterialsContext.Provider>
  );
}

export function useSaunaMaterials() {
  const ctx = useContext(SaunaMaterialsContext);
  if (!ctx) {
    throw new Error('useSaunaMaterials must be used inside SaunaMaterialsProvider');
  }
  return ctx;
}

export function useGenerateId() {
  return useCallback((prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`, []);
}
