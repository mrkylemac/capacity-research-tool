'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type {
  MaterialCategory,
  MaterialItem,
  Profile,
  ProfileCategory,
  ProfileSelections,
} from '@/types/saunaMaterials';

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupBySupplier<T extends { supplier: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const list = groups.get(it.supplier) ?? [];
    list.push(it);
    groups.set(it.supplier, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function profileSpec(p: Profile) {
  const dims = `${p.faceWidth}×${p.thickness}mm`;
  const price = p.pricePerLM != null ? ` · $${p.pricePerLM.toFixed(2)}/lm` : '';
  return `${dims}${price}`;
}

function materialSpec(m: MaterialItem) {
  const price = m.pricePerUnit != null ? ` · $${m.pricePerUnit.toFixed(2)}/${m.unit}` : '';
  return `${m.unitSize} ${m.unit}${price}`;
}

const SUPPLIER_SHORT: Record<string, string> = {
  'SDS Australia': 'SDS',
  'Local timber yard': 'Local',
  'Local fastener supplier': 'Local',
};

function supplierShort(s: string) {
  return SUPPLIER_SHORT[s] ?? s;
}

/**
 * Find the first profile from a supplier in one of the given categories.
 * Sorted by faceWidth ascending so the narrowest (most standard) comes first.
 */
function findBestFromSupplier(
  profiles: Profile[],
  supplier: string,
  categories: ProfileCategory[],
): Profile | null {
  return (
    profiles
      .filter(p => p.supplier === supplier && categories.includes(p.category))
      .sort((a, b) => a.faceWidth - b.faceWidth)[0] ?? null
  );
}

// ── Supplier quick-fill strip ────────────────────────────────────────────────

function SupplierStrip({
  suppliers,
  active,
  onChange,
}: {
  suppliers: string[];
  active: string | null;
  onChange: (s: string | null) => void;
}) {
  if (suppliers.length === 0) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap rounded-xl bg-muted/50 px-3 py-2.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0">
        Supplier
      </span>
      <div className="flex flex-wrap gap-1.5">
        {suppliers.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(active === s ? null : s)}
            className={`h-7 px-3 rounded-full text-xs font-medium border transition-colors ${
              active === s
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-gray-2 hover:border-primary/50 hover:text-fg-4'
            }`}
          >
            {supplierShort(s)}
          </button>
        ))}
      </div>
      {active !== null && (
        <span className="text-xs text-muted-foreground ml-auto">
          Selections auto-filled · adjust individually below
        </span>
      )}
    </div>
  );
}

// ── Profile picker ────────────────────────────────────────────────────────────

interface ProfilePickerProps {
  label: string;
  value: string;
  category: ProfileCategory | ProfileCategory[];
  field: keyof ProfileSelections;
  preferredSupplier?: string | null;
}

function ProfilePicker({
  label,
  value,
  category,
  field,
  preferredSupplier,
}: ProfilePickerProps) {
  const { library, dispatchProject } = useSaunaMaterials();
  const cats = Array.isArray(category) ? category : [category];
  const allOptions = library.profiles.filter(p => cats.includes(p.category));

  // Preferred supplier floats to the top of the dropdown
  const orderedOptions = preferredSupplier
    ? [
        ...allOptions.filter(p => p.supplier === preferredSupplier),
        ...allOptions.filter(p => p.supplier !== preferredSupplier),
      ]
    : allOptions;

  const groups = groupBySupplier(orderedOptions);
  const selectedProfile = allOptions.find(p => p.id === value);
  const isMixed =
    preferredSupplier != null &&
    selectedProfile != null &&
    selectedProfile.supplier !== preferredSupplier;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between min-h-[1.25rem] gap-2">
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
        {isMixed && (
          <span className="shrink-0 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-px leading-tight">
            {supplierShort(selectedProfile.supplier)}
          </span>
        )}
      </div>
      <Select
        value={value}
        onValueChange={v =>
          dispatchProject({
            type: 'UPDATE_PROFILES',
            patch: { [field]: v } as Partial<ProfileSelections>,
          })
        }
      >
        <SelectTrigger className="h-auto py-2">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="max-h-[28rem]">
          {groups.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No profiles</div>
          ) : (
            groups.map(([supplier, items], i) => (
              <SelectGroup key={supplier}>
                {i > 0 && <SelectSeparator />}
                <SelectLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                  {supplier}
                </SelectLabel>
                {items.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex flex-col">
                      <span className="text-sm">{p.name}</span>
                      <span className="text-[11px] text-muted-foreground">{profileSpec(p)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Material picker ───────────────────────────────────────────────────────────

interface MaterialPickerProps {
  label: string;
  value: string;
  category: MaterialCategory;
  field: keyof ProfileSelections;
}

function MaterialPicker({ label, value, category, field }: MaterialPickerProps) {
  const { library, dispatchProject } = useSaunaMaterials();
  const options = library.materials.filter(m => m.category === category);
  const groups = groupBySupplier(options);

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Select
        value={value}
        onValueChange={v =>
          dispatchProject({
            type: 'UPDATE_PROFILES',
            patch: { [field]: v } as Partial<ProfileSelections>,
          })
        }
      >
        <SelectTrigger className="h-auto py-2">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="max-h-[28rem]">
          {groups.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No materials</div>
          ) : (
            groups.map(([supplier, items], i) => (
              <SelectGroup key={supplier}>
                {i > 0 && <SelectSeparator />}
                <SelectLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                  {supplier}
                </SelectLabel>
                {items.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex flex-col">
                      <span className="text-sm">{m.name}</span>
                      <span className="text-[11px] text-muted-foreground">{materialSpec(m)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

const CLADDING_CATS: ProfileCategory[] = ['wallCladding', 'ceilingCladding'];
const BENCH_SLAT_CATS: ProfileCategory[] = ['benchSlat'];
const BATTEN_CATS: ProfileCategory[] = ['batten'];
const FRAMING_CATS: ProfileCategory[] = ['framing'];
const BACKREST_CATS: ProfileCategory[] = ['backrest', 'benchSlat'];

export function ProfilesPanel() {
  const { project, library, dispatchProject } = useSaunaMaterials();
  const sel = project.profiles;

  // Active supplier per section — initialised from the current selection
  const [claddingSupplier, setCladdingSupplier] = useState<string | null>(
    () => library.profiles.find(p => p.id === sel.wallCladding)?.supplier ?? null,
  );
  const [benchSupplier, setBenchSupplier] = useState<string | null>(
    () => library.profiles.find(p => p.id === sel.benchSlat)?.supplier ?? null,
  );

  // Suppliers available per section (only show suppliers that have actual cladding/slat profiles)
  const claddingSuppliers = useMemo(() => {
    const s = new Set<string>();
    library.profiles
      .filter(p => CLADDING_CATS.includes(p.category))
      .forEach(p => s.add(p.supplier));
    return [...s].sort();
  }, [library.profiles]);

  const benchSuppliers = useMemo(() => {
    const s = new Set<string>();
    library.profiles
      .filter(p => BENCH_SLAT_CATS.includes(p.category))
      .forEach(p => s.add(p.supplier));
    return [...s].sort();
  }, [library.profiles]);

  // Auto-fill cladding section from the selected supplier
  const handleCladdingSupplier = (supplier: string | null) => {
    setCladdingSupplier(supplier);
    if (!supplier) return;
    const patch: Partial<ProfileSelections> = {};
    const wall = findBestFromSupplier(library.profiles, supplier, CLADDING_CATS);
    const batten = findBestFromSupplier(library.profiles, supplier, BATTEN_CATS);
    if (wall) {
      patch.wallCladding = wall.id;
      patch.ceilingCladding = wall.id;
    }
    if (batten) patch.batten = batten.id;
    if (Object.keys(patch).length > 0) {
      dispatchProject({ type: 'UPDATE_PROFILES', patch });
    }
  };

  // Auto-fill bench section from the selected supplier
  const handleBenchSupplier = (supplier: string | null) => {
    setBenchSupplier(supplier);
    if (!supplier) return;
    const patch: Partial<ProfileSelections> = {};
    const slat = findBestFromSupplier(library.profiles, supplier, BENCH_SLAT_CATS);
    const framing = findBestFromSupplier(library.profiles, supplier, FRAMING_CATS);
    const backrest = findBestFromSupplier(library.profiles, supplier, BACKREST_CATS);
    if (slat) patch.benchSlat = slat.id;
    if (framing) patch.benchFraming = framing.id;
    if (backrest) patch.backrest = backrest.id;
    if (Object.keys(patch).length > 0) {
      dispatchProject({ type: 'UPDATE_PROFILES', patch });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profiles</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose a supplier to auto-fill a section, then adjust individual profiles as needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">

        {/* ── Cladding ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cladding
          </p>
          <SupplierStrip
            suppliers={claddingSuppliers}
            active={claddingSupplier}
            onChange={handleCladdingSupplier}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfilePicker
              label="Walls"
              value={sel.wallCladding}
              category={CLADDING_CATS}
              field="wallCladding"
              preferredSupplier={claddingSupplier}
            />
            <ProfilePicker
              label="Ceiling"
              value={sel.ceilingCladding}
              category={CLADDING_CATS}
              field="ceilingCladding"
              preferredSupplier={claddingSupplier}
            />
            <ProfilePicker
              label="Battens"
              value={sel.batten}
              category={BATTEN_CATS}
              field="batten"
              preferredSupplier={claddingSupplier}
            />
          </div>
        </div>

        {/* ── Bench timber ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bench timber
          </p>
          <SupplierStrip
            suppliers={benchSuppliers}
            active={benchSupplier}
            onChange={handleBenchSupplier}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfilePicker
              label="Slats"
              value={sel.benchSlat}
              category={BENCH_SLAT_CATS}
              field="benchSlat"
              preferredSupplier={benchSupplier}
            />
            <ProfilePicker
              label="Framing"
              value={sel.benchFraming}
              category={FRAMING_CATS}
              field="benchFraming"
              preferredSupplier={benchSupplier}
            />
            <ProfilePicker
              label="Backrest"
              value={sel.backrest}
              category={BACKREST_CATS}
              field="backrest"
              preferredSupplier={benchSupplier}
            />
          </div>
        </div>

        {/* ── Insulation & vapour ───────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Insulation & vapour
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MaterialPicker label="Wall insulation" value={sel.insulation} category="insulation" field="insulation" />
            <MaterialPicker label="Ceiling insulation" value={sel.ceilingInsulation} category="insulation" field="ceilingInsulation" />
            <MaterialPicker label="Vapour barrier" value={sel.vapourBarrier} category="vapourBarrier" field="vapourBarrier" />
            <MaterialPicker label="Foil tape" value={sel.tape} category="tape" field="tape" />
          </div>
        </div>

        {/* ── Fixings ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fixings
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MaterialPicker label="Cladding fixings" value={sel.claddingScrews} category="fixings" field="claddingScrews" />
            <MaterialPicker label="Bench fixings" value={sel.benchScrews} category="fixings" field="benchScrews" />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
