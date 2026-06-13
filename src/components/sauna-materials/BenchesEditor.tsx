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
import {
  computeSlatCountFromDepth,
  computeSlatDepth,
  defaultRearVentilation,
  defaultSlatCount,
  resolvedSlatConstructionType,
  slatYieldPerBoard,
} from '@/lib/saunaMaterials/benches';
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
  climbStep:  { topHeight: 415,  depth: 300 },
  foot:       { topHeight: 690,  depth: 600 },
  upper:      { topHeight: 1140, depth: 600 },
  high:       { topHeight: 1590, depth: 600 },
  accessible: { topHeight: 450,  depth: 600 },
};

const TIER_LABEL: Record<BenchTier, string> = {
  climbStep:  'Climb step',
  foot:       'Foot bench',
  upper:      'Upper bench',
  high:       'High bench',
  accessible: 'Accessible',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {children}
    </Label>
  );
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

// ── Slat depth panel ─────────────────────────────────────────────────────────

function SlatDepthPanel({
  bench,
  update,
}: {
  bench: Bench;
  update: (patch: Partial<Bench>) => void;
}) {
  const { project, library } = useSaunaMaterials();
  const slatProfile = library.profiles.find(p => p.id === project.profiles.benchSlat);

  if (!slatProfile) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Select a bench slat profile on the Profiles tab first.
      </p>
    );
  }

  // ── Resolve construction type from bench data (override → tier default) ──
  const constructionType = resolvedSlatConstructionType(bench);
  const isBox = constructionType === 'box';

  // ── Resolved parameter values (stored → sensible defaults) ──────────────
  const slatGap = bench.slatGap ?? 10;
  const slatCount = bench.slatCount ?? defaultSlatCount(constructionType);
  const rearVentilation = bench.rearVentilation ?? defaultRearVentilation(bench.tier, slatGap);

  // ── Unified depth computation ────────────────────────────────────────────
  const computedDepth = computeSlatDepth(
    slatProfile.faceWidth,
    slatProfile.thickness,
    slatCount,
    slatGap,
    constructionType,
    rearVentilation,
  );

  const updateSlats = (patch: Partial<Pick<Bench, 'slatCount' | 'slatGap' | 'rearVentilation'>>) => {
    const sc = patch.slatCount ?? slatCount;
    const sg = patch.slatGap ?? slatGap;
    const rv = patch.rearVentilation ?? rearVentilation;
    const depth = computeSlatDepth(
      slatProfile.faceWidth,
      slatProfile.thickness,
      sc,
      sg,
      constructionType,
      rv,
    );
    update({ ...patch, depth });
  };

  // ── Stock yield — best (lowest waste) across available stock lengths ─────
  const yields = slatProfile.stockLengths.map(l => slatYieldPerBoard(computedDepth, l));
  const bestYield = yields.length > 0
    ? yields.reduce((best, y) => y.wastePercent < best.wastePercent ? y : best, yields[0])
    : null;

  // ── Formula breakdown label ──────────────────────────────────────────────
  const breakdownText = isBox
    ? `${slatProfile.thickness}mm side + ${slatCount + 1}×${slatGap}mm gaps + ${slatCount}×${slatProfile.faceWidth}mm slats + ${slatProfile.thickness}mm side`
    : `${rearVentilation}mm rear + ${slatCount}×(${slatProfile.faceWidth}+${slatGap})mm + ${slatProfile.thickness}mm fascia`;

  return (
    <div className="space-y-3">
      {/* Profile badge + construction type badge */}
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5 flex-1">
          {slatProfile.name} · {slatProfile.faceWidth}×{slatProfile.thickness}mm
        </p>
        {isBox && (
          <span className="text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5 shrink-0">
            Box construction
          </span>
        )}
      </div>

      {/* Slat count / gap / rear vent (rear vent hidden for box construction) */}
      <div className={`grid gap-3 ${isBox ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <div className="flex flex-col gap-1">
          <FieldLabel>Slats</FieldLabel>
          <NumInput value={slatCount} min={1} onChange={v => updateSlats({ slatCount: v })} />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel>Gap</FieldLabel>
          <NumInput
            value={slatGap}
            min={0}
            suffix="mm"
            onChange={v => updateSlats({ slatGap: v })}
          />
        </div>
        {!isBox && (
          <div className="flex flex-col gap-1">
            <FieldLabel>Rear vent</FieldLabel>
            <NumInput
              value={rearVentilation}
              min={0}
              suffix="mm"
              onChange={v => updateSlats({ rearVentilation: v })}
            />
          </div>
        )}
      </div>

      {/* Computed depth + stock yield */}
      <div className="flex items-start justify-between rounded-lg bg-muted/50 px-3 py-2.5 gap-4">
        <div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Computed depth</p>
          <p className="text-sm font-semibold text-fg-4">{computedDepth} mm</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{breakdownText}</p>
        </div>
        {bestYield && (
          <div className="text-right shrink-0">
            <p className="text-[11px] text-muted-foreground mb-0.5">Best stock yield</p>
            <p className="text-xs font-medium text-fg-4">
              {(bestYield.stockLengthMm / 1000).toFixed(1)} m → {bestYield.cutsPerBoard} cuts
            </p>
            <p className="text-[10px] text-muted-foreground">
              {bestYield.offcutMm} mm offcut ({bestYield.wastePercent}% waste)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Material efficiency note ──────────────────────────────────────────────────

function MaterialEfficiencyNote() {
  const { project, library } = useSaunaMaterials();
  const wallProfile = library.profiles.find(p => p.id === project.profiles.wallCladding);
  const slatProfile = library.profiles.find(p => p.id === project.profiles.benchSlat);
  if (!wallProfile || !slatProfile) return null;

  const sameProfile = wallProfile.id === slatProfile.id;
  const sameFaceWidth = wallProfile.faceWidth === slatProfile.faceWidth;
  const sameSpecies = wallProfile.species.toLowerCase() === slatProfile.species.toLowerCase();

  if (sameProfile) {
    return (
      <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2.5 text-[11px] text-violet-700 leading-relaxed">
        <span className="font-semibold">Same profile for walls and benches</span>
        {' '}— ordering from a single run maximises board yield and ensures a perfect colour match.
        Vertical cladding cut-offs can feed directly into bench slats.
      </div>
    );
  }

  if (sameFaceWidth && sameSpecies) {
    return (
      <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2.5 text-[11px] text-violet-700 leading-relaxed">
        <span className="font-semibold">
          Walls and benches share the same face width ({wallProfile.faceWidth} mm) and species.
        </span>
        {' '}Consider unifying to a single profile — off-cuts from cladding can be reused as bench slats, and one order run reduces lead time.
      </div>
    );
  }

  if (sameSpecies) {
    return (
      <div className="rounded-lg bg-muted px-3 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
        Wall cladding ({wallProfile.faceWidth} mm {wallProfile.species}) and bench slats (
        {slatProfile.faceWidth} mm {slatProfile.species}) are the same species — order together
        for colour consistency and to simplify delivery.
      </div>
    );
  }

  return null;
}

// ── Bench layout editor ──────────────────────────────────────────────────────

export function BenchesEditor() {
  const { project, library, dispatchProject } = useSaunaMaterials();
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

  /** Switch a bench into slat-driven depth mode, deriving slatCount from its existing depth. */
  const activateSlatMode = (b: Bench) => {
    const slatProfile = library.profiles.find(p => p.id === project.profiles.benchSlat);
    if (!slatProfile) return;

    const constructionType = resolvedSlatConstructionType(b);
    const slatGap = 10;
    const rearVentilation = defaultRearVentilation(b.tier, slatGap);

    const sc = computeSlatCountFromDepth(
      b.depth,
      slatProfile.faceWidth,
      slatProfile.thickness,
      slatGap,
      constructionType,
      rearVentilation,
    );
    const depth = computeSlatDepth(
      slatProfile.faceWidth,
      slatProfile.thickness,
      sc,
      slatGap,
      constructionType,
      rearVentilation,
    );

    update(b.id, {
      slatCount: sc,
      slatGap,
      // rearVentilation only stored for wallMounted; clear it for box so the panel
      // shows the correct default when the type changes later.
      rearVentilation: constructionType === 'wallMounted' ? rearVentilation : undefined,
      depth,
    });
  };

  const deactivateSlatMode = (id: string) =>
    update(id, { slatCount: undefined, slatGap: undefined, rearVentilation: undefined });

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
              const slatMode = b.slatCount != null;
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

                  {/* Row 1: Tier | Wall | Top height */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Tier</FieldLabel>
                      <Select
                        value={b.tier}
                        onValueChange={(v: BenchTier) => {
                          const d = TIER_DEFAULTS[v];
                          update(b.id, {
                            tier: v,
                            topHeight: d.topHeight,
                            depth: d.depth,
                            slatCount: undefined,
                            slatGap: undefined,
                            rearVentilation: undefined,
                          });
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
                      <FieldLabel>Top height</FieldLabel>
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

                  {/* Seat depth section */}
                  <div className="border-t border-gray-2 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Seat depth
                      </span>
                      {/* Mode toggle */}
                      <div className="flex rounded-full border border-gray-2 overflow-hidden text-[11px] font-medium">
                        <button
                          type="button"
                          onClick={() => deactivateSlatMode(b.id)}
                          className={`px-3 py-1 transition-colors ${
                            !slatMode
                              ? 'bg-primary text-white'
                              : 'text-muted-foreground hover:text-fg-4'
                          }`}
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => activateSlatMode(b)}
                          className={`px-3 py-1 transition-colors ${
                            slatMode
                              ? 'bg-primary text-white'
                              : 'text-muted-foreground hover:text-fg-4'
                          }`}
                        >
                          By slats
                        </button>
                      </div>
                    </div>

                    {slatMode ? (
                      <SlatDepthPanel bench={b} update={patch => update(b.id, patch)} />
                    ) : (
                      <div className="flex flex-col gap-1">
                        <NumInput
                          value={b.depth}
                          onChange={v => update(b.id, { depth: v })}
                          suffix="mm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Material efficiency note — shown when benches are present */}
            <MaterialEfficiencyNote />
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
