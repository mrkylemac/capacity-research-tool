'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type { VapourBarrierType, WasteFactors } from '@/types/saunaMaterials';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{children}</Label>;
}

function WasteSlider({
  label,
  value,
  field,
}: {
  label: string;
  value: number;
  field: keyof WasteFactors;
}) {
  const { dispatchProject } = useSaunaMaterials();
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-sm font-semibold tabular-nums">{pct}%</span>
      </div>
      <Slider
        value={[pct]}
        min={0}
        max={30}
        step={1}
        onValueChange={([next]) =>
          dispatchProject({ type: 'UPDATE_WASTE', patch: { [field]: next / 100 } as Partial<WasteFactors> })
        }
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Input
          type="number"
          className={suffix ? 'h-9 pr-10' : 'h-9'}
          value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

export function ConstructionToggles() {
  const { project, dispatchProject } = useSaunaMaterials();
  const c = project.construction;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Construction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between rounded-xl border border-gray-2 bg-card px-3 py-2.5">
              <span className="text-sm font-medium text-fg-4">Clad behind benches</span>
              <Switch
                checked={c.behindBenchClad}
                onCheckedChange={v => dispatchProject({ type: 'UPDATE_CONSTRUCTION', patch: { behindBenchClad: v } })}
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-gray-2 bg-card px-3 py-2.5">
              <span className="text-sm font-medium text-fg-4">Cross battening</span>
              <Switch
                checked={c.crossBattening}
                onCheckedChange={v => dispatchProject({ type: 'UPDATE_CONSTRUCTION', patch: { crossBattening: v } })}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumField
              label="Batten spacing"
              value={c.battenSpacing}
              onChange={v => dispatchProject({ type: 'UPDATE_CONSTRUCTION', patch: { battenSpacing: v } })}
              suffix="mm"
            />
            <NumField
              label="Wall insulation"
              value={c.insulationDepth}
              onChange={v => dispatchProject({ type: 'UPDATE_CONSTRUCTION', patch: { insulationDepth: v } })}
              suffix="mm"
            />
            <NumField
              label="Ceiling insulation"
              value={c.ceilingInsulationDepth}
              onChange={v => dispatchProject({ type: 'UPDATE_CONSTRUCTION', patch: { ceilingInsulationDepth: v } })}
              suffix="mm"
            />
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Vapour barrier type</FieldLabel>
              <Select
                value={c.vapourBarrierType}
                onValueChange={(v: VapourBarrierType) =>
                  dispatchProject({ type: 'UPDATE_CONSTRUCTION', patch: { vapourBarrierType: v } })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foilPaper">Foil paper</SelectItem>
                  <SelectItem value="pureFoil">Pure aluminium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumField
              label="Cladding fixings/m²"
              value={c.fixingsDensityCladding}
              onChange={v => dispatchProject({ type: 'UPDATE_CONSTRUCTION', patch: { fixingsDensityCladding: v } })}
            />
            <NumField
              label="Bench fixings/m²"
              value={c.fixingsDensityBench}
              onChange={v => dispatchProject({ type: 'UPDATE_CONSTRUCTION', patch: { fixingsDensityBench: v } })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Waste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
            <WasteSlider label="Cladding" value={project.waste.cladding} field="cladding" />
            <WasteSlider label="Slat" value={project.waste.benchSlat} field="benchSlat" />
            <WasteSlider label="Framing" value={project.waste.framing} field="framing" />
            <WasteSlider label="Battens" value={project.waste.batten} field="batten" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
