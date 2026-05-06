'use client';

import { useState } from 'react';
import { Library as LibraryIcon, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useGenerateId, useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type {
  MaterialCategory,
  MaterialItem,
  MaterialUnit,
  Profile,
  ProfileCategory,
} from '@/types/saunaMaterials';

type Tab = 'profiles' | 'materials';

const PROFILE_CATEGORIES: ProfileCategory[] = [
  'wallCladding',
  'ceilingCladding',
  'benchSlat',
  'framing',
  'batten',
  'backrest',
];

const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'insulation',
  'vapourBarrier',
  'tape',
  'fixings',
  'sealant',
  'misc',
];

const MATERIAL_UNITS: MaterialUnit[] = ['m2', 'roll', 'box', 'each', 'lm'];

function ProfileEditor({ profile, onChange, onRemove }: {
  profile: Profile;
  onChange: (next: Profile) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-2 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Profile</span>
        <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remove profile">
          <Trash2 className="h-4 w-4 text-red-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Name</Label>
          <Input value={profile.name} onChange={e => onChange({ ...profile, name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
          <Select
            value={profile.category}
            onValueChange={(v: ProfileCategory) => onChange({ ...profile, category: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROFILE_CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Species</Label>
          <Input value={profile.species} onChange={e => onChange({ ...profile, species: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Supplier</Label>
          <Input value={profile.supplier} onChange={e => onChange({ ...profile, supplier: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Face width (mm)</Label>
          <Input
            type="number"
            value={profile.faceWidth}
            onChange={e => onChange({ ...profile, faceWidth: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cover width (mm)</Label>
          <Input
            type="number"
            value={profile.coverWidth}
            onChange={e => onChange({ ...profile, coverWidth: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Thickness (mm)</Label>
          <Input
            type="number"
            value={profile.thickness}
            onChange={e => onChange({ ...profile, thickness: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Price per LM (AUD)</Label>
          <Input
            type="number"
            step="0.01"
            value={profile.pricePerLM ?? ''}
            placeholder="—"
            onChange={e => {
              const v = e.target.value;
              onChange({ ...profile, pricePerLM: v === '' ? null : Number(v) || null });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MaterialEditor({ material, onChange, onRemove }: {
  material: MaterialItem;
  onChange: (next: MaterialItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-2 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Material</span>
        <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remove material">
          <Trash2 className="h-4 w-4 text-red-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Name</Label>
          <Input value={material.name} onChange={e => onChange({ ...material, name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
          <Select
            value={material.category}
            onValueChange={(v: MaterialCategory) => onChange({ ...material, category: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Unit</Label>
          <Select
            value={material.unit}
            onValueChange={(v: MaterialUnit) => onChange({ ...material, unit: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_UNITS.map(u => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Unit size</Label>
          <Input
            type="number"
            step="0.01"
            value={material.unitSize}
            onChange={e => onChange({ ...material, unitSize: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Supplier</Label>
          <Input value={material.supplier} onChange={e => onChange({ ...material, supplier: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Price per unit (AUD)</Label>
          <Input
            type="number"
            step="0.01"
            value={material.pricePerUnit ?? ''}
            placeholder="—"
            onChange={e => {
              const v = e.target.value;
              onChange({ ...material, pricePerUnit: v === '' ? null : Number(v) || null });
            }}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes</Label>
          <Input value={material.notes} onChange={e => onChange({ ...material, notes: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

export function LibraryManagerSheet() {
  const { library, dispatchLibrary } = useSaunaMaterials();
  const genId = useGenerateId();
  const [tab, setTab] = useState<Tab>('profiles');

  const addProfile = () => {
    dispatchLibrary({
      type: 'UPSERT_PROFILE',
      profile: {
        id: genId('profile'),
        name: 'New profile',
        category: 'wallCladding',
        species: '',
        faceWidth: 90,
        coverWidth: 84,
        thickness: 15,
        stockLengths: [2.4, 3.0],
        pricePerLM: null,
        supplier: '',
        notes: '',
      },
    });
  };

  const addMaterial = () => {
    dispatchLibrary({
      type: 'UPSERT_MATERIAL',
      material: {
        id: genId('material'),
        name: 'New material',
        category: 'misc',
        unit: 'each',
        unitSize: 1,
        pricePerUnit: null,
        supplier: '',
        notes: '',
      },
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <LibraryIcon className="h-4 w-4" />
          Library
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Profile & material library</SheetTitle>
          <SheetDescription>
            Edit profiles and materials. Prices flow into the BOM total when set.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-1 border-b border-gray-2 my-4">
          {(['profiles', 'materials'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                'flex items-center px-4 py-2.5 text-sm font-medium transition-colors',
                tab === t
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-fg-4',
              ].join(' ')}
            >
              {t === 'profiles' ? 'Timber profiles' : 'Materials'}
              <span className="ml-2 text-xs text-muted-foreground">
                ({t === 'profiles' ? library.profiles.length : library.materials.length})
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end mb-3">
          <Button size="sm" variant="outline" onClick={tab === 'profiles' ? addProfile : addMaterial}>
            <Plus className="h-4 w-4 mr-1" />
            Add {tab === 'profiles' ? 'profile' : 'material'}
          </Button>
        </div>

        {tab === 'profiles' && (
          <div className="space-y-3">
            {library.profiles.map(p => (
              <ProfileEditor
                key={p.id}
                profile={p}
                onChange={next => dispatchLibrary({ type: 'UPSERT_PROFILE', profile: next })}
                onRemove={() => dispatchLibrary({ type: 'REMOVE_PROFILE', id: p.id })}
              />
            ))}
          </div>
        )}

        {tab === 'materials' && (
          <div className="space-y-3">
            {library.materials.map(m => (
              <MaterialEditor
                key={m.id}
                material={m}
                onChange={next => dispatchLibrary({ type: 'UPSERT_MATERIAL', material: next })}
                onRemove={() => dispatchLibrary({ type: 'REMOVE_MATERIAL', id: m.id })}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
