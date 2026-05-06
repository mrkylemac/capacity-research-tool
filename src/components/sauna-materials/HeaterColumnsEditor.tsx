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
import type { Column, ColumnLocation, SurfaceFinish, WallId } from '@/types/saunaMaterials';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{children}</Label>;
}

function MmInput({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <Input
      type="number"
      className="h-9"
      value={value}
      onChange={e => onChange(Number(e.target.value) || 0)}
      disabled={disabled}
    />
  );
}

function HeaterCard() {
  const { project, dispatchProject } = useSaunaMaterials();
  const heater = project.heaterZone;
  const enabled = heater !== null;

  if (!enabled) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Heater</CardTitle>
            <Switch
              checked={false}
              onCheckedChange={() =>
                dispatchProject({
                  type: 'SET_HEATER',
                  heater: { wall: 'south', width: 1500, height: 2400, finish: 'tile' },
                })
              }
            />
          </div>
        </CardHeader>
      </Card>
    );
  }

  const wallLen = wallLengthMm(heater!.wall, project.room);
  const maxOffset = Math.max(0, wallLen - heater!.width);
  const offset = Math.min(heater!.startOffset ?? Math.max(0, (wallLen - heater!.width) / 2), maxOffset);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Heater</CardTitle>
          <Switch
            checked
            onCheckedChange={() => dispatchProject({ type: 'SET_HEATER', heater: null })}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <FieldLabel>Wall</FieldLabel>
            <Select
              value={heater!.wall}
              onValueChange={(v: WallId) => dispatchProject({ type: 'SET_HEATER', heater: { ...heater!, wall: v } })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="north">North</SelectItem>
                <SelectItem value="south">South</SelectItem>
                <SelectItem value="east">East</SelectItem>
                <SelectItem value="west">West</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel>Width (mm)</FieldLabel>
            <MmInput value={heater!.width} onChange={v => dispatchProject({ type: 'SET_HEATER', heater: { ...heater!, width: v } })} />
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel>Finish</FieldLabel>
            <Select
              value={heater!.finish}
              onValueChange={(v: SurfaceFinish) => dispatchProject({ type: 'SET_HEATER', heater: { ...heater!, finish: v } })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tile">Tile</SelectItem>
                <SelectItem value="timber">Timber</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel>Height (mm)</FieldLabel>
            <MmInput value={heater!.height} onChange={v => dispatchProject({ type: 'SET_HEATER', heater: { ...heater!, height: v } })} />
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel>Position (mm from left)</FieldLabel>
            <MmInput
              value={offset}
              onChange={v => dispatchProject({ type: 'SET_HEATER', heater: { ...heater!, startOffset: Math.max(0, Math.min(v, maxOffset)) } })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ColumnsCard() {
  const { project, dispatchProject } = useSaunaMaterials();
  const genId = useGenerateId();

  const addColumn = () => {
    dispatchProject({
      type: 'ADD_COLUMN',
      column: {
        id: genId('column'),
        wall: 'north',
        width: 290,
        depth: 290,
        height: project.room.ceilingHeight,
        finish: 'tile',
        extendsToCeiling: true,
      },
    });
  };

  const update = (id: string, patch: Partial<Column>) =>
    dispatchProject({ type: 'UPDATE_COLUMN', id, patch });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Columns</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Position = mm from the left end of the wall</p>
          </div>
          <Button size="sm" variant="outline" onClick={addColumn} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {project.columns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No columns yet.</p>
        ) : (
          <div className="space-y-3">
            {project.columns.map(c => {
              const onWall = c.wall !== 'freestanding';
              const wallLen = onWall ? wallLengthMm(c.wall as WallId, project.room) : 0;
              const maxOffset = Math.max(0, wallLen - c.width);
              const offset = Math.min(c.startOffset ?? Math.max(0, (wallLen - c.width) / 2), maxOffset);
              return (
                <div key={c.id} className="rounded-xl border border-gray-2 p-3 space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.finish} column</span>
                    <Button size="icon" variant="ghost" onClick={() => dispatchProject({ type: 'REMOVE_COLUMN', id: c.id })} aria-label="Remove">
                      <Trash2 className="h-4 w-4 text-red-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Wall</FieldLabel>
                      <Select value={c.wall} onValueChange={(v: ColumnLocation) => update(c.id, { wall: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="north">North</SelectItem>
                          <SelectItem value="south">South</SelectItem>
                          <SelectItem value="east">East</SelectItem>
                          <SelectItem value="west">West</SelectItem>
                          <SelectItem value="freestanding">Free</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Width (mm)</FieldLabel>
                      <MmInput value={c.width} onChange={v => update(c.id, { width: v })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Depth (mm)</FieldLabel>
                      <MmInput value={c.depth} onChange={v => update(c.id, { depth: v })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Height (mm)</FieldLabel>
                      <MmInput value={c.height} onChange={v => update(c.id, { height: v })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Position (mm from left)</FieldLabel>
                      <MmInput
                        value={offset}
                        onChange={v => update(c.id, { startOffset: Math.max(0, Math.min(v, maxOffset)) })}
                        disabled={!onWall}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Finish</FieldLabel>
                      <Select value={c.finish} onValueChange={(v: SurfaceFinish) => update(c.id, { finish: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tile">Tile</SelectItem>
                          <SelectItem value="timber">Timber</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>To ceiling</FieldLabel>
                      <div className="h-9 flex items-center">
                        <Switch checked={c.extendsToCeiling} onCheckedChange={v => update(c.id, { extendsToCeiling: v })} />
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

export function HeaterColumnsEditor() {
  return (
    <div className="space-y-4">
      <HeaterCard />
      <ColumnsCard />
    </div>
  );
}
