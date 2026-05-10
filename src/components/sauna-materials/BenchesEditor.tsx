'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { wallLengthMm } from '@/lib/saunaMaterials/conversions';
import { useGenerateId, useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type {
  Bench,
  BenchMethod,
  BenchTier,
  EndCap,
  FrameMaterial,
  FrontStyle,
  WallId,
} from '@/types/saunaMaterials';

const TIER_DEFAULTS: Record<BenchTier, { topHeight: number; depth: number }> = {
  climbStep:  { topHeight: 300,  depth: 300 },
  foot:       { topHeight: 750,  depth: 600 },
  upper:      { topHeight: 1200, depth: 600 },
  accessible: { topHeight: 450,  depth: 600 },
};

const TIER_LABEL: Record<BenchTier, string> = {
  climbStep:  'Climb step',
  foot:       'Foot bench',
  upper:      'Upper bench',
  accessible: 'Accessible',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{children}</Label>;
}

function NumInput({
  value,
  onChange,
  suffix,
  min = 0,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  min?: number;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        className={suffix ? 'h-9 pr-10' : 'h-9'}
        value={value}
        min={min}
        onChange={e => onChange(Number(e.target.value) || 0)}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ── Bench layout editor ──────────────────────────────────────────────────────

export function BenchesEditor() {
  const { project, dispatchProject } = useSaunaMaterials();
  const genId = useGenerateId();

  const addBench = () => {
    const tier: BenchTier = 'foot';
    const wall: WallId = 'north';
    const d = TIER_DEFAULTS[tier];
    dispatchProject({
      type: 'ADD_BENCH',
      bench: {
        id: genId('bench'),
        tier,
        wall,
        length: wallLengthMm(wall, project.room),
        depth: d.depth,
        topHeight: d.topHeight,
        hasBackrest: false,
        backrestHeight: 0,
        hasEndCap: 'none',
        closedFront: true,
        hasSkirting: false,
        skirtingHeight: 100,
      },
    });
  };

  const update = (id: string, patch: Partial<Bench>) =>
    dispatchProject({ type: 'UPDATE_BENCH', id, patch });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Bench layout</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each bench spans the full length of its wall
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={addBench} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add bench
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {project.benches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No benches yet.</p>
        ) : (
          <div className="space-y-3">
            {project.benches.map(b => {
              const wallLen = wallLengthMm(b.wall, project.room);
              return (
                <div key={b.id} className="rounded-xl border border-gray-2 p-3 space-y-3 bg-card">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-fg-4">
                      {TIER_LABEL[b.tier]} · {b.wall.charAt(0).toUpperCase() + b.wall.slice(1)} wall · {(wallLen / 1000).toFixed(2)} m
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => dispatchProject({ type: 'REMOVE_BENCH', id: b.id })}
                      aria-label="Remove bench"
                    >
                      <Trash2 className="h-4 w-4 text-red-4" />
                    </Button>
                  </div>

                  {/* Row 1: Tier | Wall | Depth | Top height */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Tier</FieldLabel>
                      <Select
                        value={b.tier}
                        onValueChange={(v: BenchTier) => {
                          const d = TIER_DEFAULTS[v];
                          update(b.id, { tier: v, topHeight: d.topHeight, depth: d.depth });
                        }}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="climbStep">Climb step</SelectItem>
                          <SelectItem value="foot">Foot bench</SelectItem>
                          <SelectItem value="upper">Upper bench</SelectItem>
                          <SelectItem value="accessible">Accessible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Wall</FieldLabel>
                      <Select
                        value={b.wall}
                        onValueChange={(v: WallId) =>
                          update(b.id, { wall: v, length: wallLengthMm(v, project.room) })
                        }
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="north">North ({(wallLengthMm('north', project.room) / 1000).toFixed(2)} m)</SelectItem>
                          <SelectItem value="south">South ({(wallLengthMm('south', project.room) / 1000).toFixed(2)} m)</SelectItem>
                          <SelectItem value="east">East ({(wallLengthMm('east', project.room) / 1000).toFixed(2)} m)</SelectItem>
                          <SelectItem value="west">West ({(wallLengthMm('west', project.room) / 1000).toFixed(2)} m)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Depth (mm)</FieldLabel>
                      <NumInput value={b.depth} onChange={v => update(b.id, { depth: v })} suffix="mm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Top height (mm)</FieldLabel>
                      <NumInput value={b.topHeight} onChange={v => update(b.id, { topHeight: v })} suffix="mm" />
                    </div>
                  </div>

                  {/* Row 2: End caps | Backrest | Skirting */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <FieldLabel>End caps</FieldLabel>
                      <Select value={b.hasEndCap} onValueChange={(v: EndCap) => update(b.id, { hasEndCap: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="left">Left only</SelectItem>
                          <SelectItem value="right">Right only</SelectItem>
                          <SelectItem value="both">Both ends</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <FieldLabel>Backrest</FieldLabel>
                      <div className="flex items-center gap-2 h-9">
                        <Switch
                          checked={b.hasBackrest}
                          onCheckedChange={v =>
                            update(b.id, {
                              hasBackrest: v,
                              backrestHeight: v ? Math.max(b.backrestHeight || 0, 250) : 0,
                            })
                          }
                        />
                        {b.hasBackrest && (
                          <NumInput
                            value={b.backrestHeight}
                            onChange={v => update(b.id, { backrestHeight: v })}
                            suffix="mm"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <FieldLabel>Skirting</FieldLabel>
                      <div className="flex items-center gap-2 h-9">
                        <Switch
                          checked={b.hasSkirting ?? false}
                          onCheckedChange={v =>
                            update(b.id, {
                              hasSkirting: v,
                              skirtingHeight: v ? Math.max(b.skirtingHeight || 0, 100) : 0,
                            })
                          }
                        />
                        {b.hasSkirting && (
                          <NumInput
                            value={b.skirtingHeight ?? 100}
                            onChange={v => update(b.id, { skirtingHeight: v })}
                            suffix="mm"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Method descriptions ──────────────────────────────────────────────────────

const METHOD_INFO: Record<BenchMethod, { label: string; description: string; spacingLabel: string }> = {
  floating: {
    label: 'Floating',
    description: 'Wall cleats only — no floor contact. Easiest to clean, cleanest look. Requires solid stud framing.',
    spacingLabel: 'Cleat spacing',
  },
  legPost: {
    label: 'Leg post',
    description: 'Vertical timber or steel legs on the floor supporting a perimeter frame. Most common, most forgiving structurally.',
    spacingLabel: 'Leg spacing',
  },
  bracket: {
    label: 'Bracket',
    description: 'Angled wall brackets — no vertical legs. Structurally clean, ideal for shallower single-tier benches (≤500mm depth).',
    spacingLabel: 'Bracket spacing',
  },
  hybrid: {
    label: 'Hybrid',
    description: 'Leg post on the lower tier, floating upper tier off the lower frame + rear cleat. Most practical for multi-tier setups.',
    spacingLabel: 'Leg spacing',
  },
};

// ── Construction method card ─────────────────────────────────────────────────

export function BenchConstructionMethod() {
  const { project, dispatchProject } = useSaunaMaterials();
  const bc = project.benchConstruction;

  const update = (patch: Partial<typeof bc>) =>
    dispatchProject({ type: 'UPDATE_BENCH_CONSTRUCTION', patch });

  const info = METHOD_INFO[bc.method];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Construction method</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          How the bench frames are built — affects framing quantities
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: Method | Frame material | Front style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Method</FieldLabel>
            <Select value={bc.method} onValueChange={(v: BenchMethod) => update({ method: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="floating">Floating</SelectItem>
                <SelectItem value="legPost">Leg post</SelectItem>
                <SelectItem value="bracket">Bracket</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel>Frame material</FieldLabel>
            <Select value={bc.frameMaterial} onValueChange={(v: FrameMaterial) => update({ frameMaterial: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="timber">Timber</SelectItem>
                <SelectItem value="steel">Steel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel>Front style</FieldLabel>
            <Select value={bc.frontStyle} onValueChange={(v: FrontStyle) => update({ frontStyle: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open frame</SelectItem>
                <SelectItem value="fascia">Timber fascia</SelectItem>
                <SelectItem value="tiled">Tiled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Method description */}
        <p className="text-xs text-muted-foreground rounded-lg bg-muted px-3 py-2.5 leading-relaxed">
          <span className="font-semibold text-fg-4">{info.label} — </span>
          {info.description}
        </p>

        {/* Row 2: Support spacing | Bearer spacing */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>{info.spacingLabel} (c/c)</FieldLabel>
            <NumInput
              value={bc.supportSpacing}
              onChange={v => update({ supportSpacing: v })}
              suffix="mm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Bearer spacing (c/c)</FieldLabel>
            <NumInput
              value={bc.bearerSpacing}
              onChange={v => update({ bearerSpacing: v })}
              suffix="mm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
