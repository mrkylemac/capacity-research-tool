'use client';

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

interface ProfilePickerProps {
  label: string;
  value: string;
  category: ProfileCategory | ProfileCategory[];
  field: keyof ProfileSelections;
}

function ProfilePicker({ label, value, category, field }: ProfilePickerProps) {
  const { library, dispatchProject } = useSaunaMaterials();
  const cats = Array.isArray(category) ? category : [category];
  const options = library.profiles.filter(p => cats.includes(p.category));
  const groups = groupBySupplier(options);

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Select
        value={value}
        onValueChange={v =>
          dispatchProject({ type: 'UPDATE_PROFILES', patch: { [field]: v } as Partial<ProfileSelections> })
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
          dispatchProject({ type: 'UPDATE_PROFILES', patch: { [field]: v } as Partial<ProfileSelections> })
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

export function ProfilesPanel() {
  const { project } = useSaunaMaterials();
  const sel = project.profiles;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profiles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Cladding">
          <ProfilePicker label="Walls" value={sel.wallCladding} category={['wallCladding', 'ceilingCladding']} field="wallCladding" />
          <ProfilePicker label="Ceiling" value={sel.ceilingCladding} category={['wallCladding', 'ceilingCladding']} field="ceilingCladding" />
          <ProfilePicker label="Battens" value={sel.batten} category="batten" field="batten" />
        </Section>

        <Section title="Bench timber">
          <ProfilePicker label="Slats" value={sel.benchSlat} category="benchSlat" field="benchSlat" />
          <ProfilePicker label="Framing" value={sel.benchFraming} category="framing" field="benchFraming" />
          <ProfilePicker label="Backrest" value={sel.backrest} category={['backrest', 'benchSlat']} field="backrest" />
        </Section>

        <Section title="Insulation & vapour">
          <MaterialPicker label="Wall insulation" value={sel.insulation} category="insulation" field="insulation" />
          <MaterialPicker label="Ceiling insulation" value={sel.ceilingInsulation} category="insulation" field="ceilingInsulation" />
          <MaterialPicker label="Vapour barrier" value={sel.vapourBarrier} category="vapourBarrier" field="vapourBarrier" />
          <MaterialPicker label="Foil tape" value={sel.tape} category="tape" field="tape" />
        </Section>

        <Section title="Fixings">
          <MaterialPicker label="Cladding screws" value={sel.claddingScrews} category="fixings" field="claddingScrews" />
          <MaterialPicker label="Bench screws" value={sel.benchScrews} category="fixings" field="benchScrews" />
        </Section>
      </CardContent>
    </Card>
  );
}
