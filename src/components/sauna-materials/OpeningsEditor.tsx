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
import { wallLengthMm } from '@/lib/saunaMaterials/conversions';
import { useGenerateId, useSaunaMaterials } from '@/lib/saunaMaterials/store';
import type { Opening, OpeningShape, OpeningType, WallId } from '@/types/saunaMaterials';

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{children}</Label>;
}

export function OpeningsEditor() {
  const { project, dispatchProject } = useSaunaMaterials();
  const genId = useGenerateId();

  const addOpening = () => {
    dispatchProject({
      type: 'ADD_OPENING',
      opening: {
        id: genId('opening'),
        type: 'window',
        wall: 'north',
        shape: 'rectangle',
        width: 600,
        height: 600,
      },
    });
  };

  const update = (id: string, patch: Partial<Opening>) =>
    dispatchProject({ type: 'UPDATE_OPENING', id, patch });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Openings</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Position = mm from the left end of the wall</p>
          </div>
          <Button size="sm" variant="outline" onClick={addOpening} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {project.openings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No openings yet.</p>
        ) : (
          <div className="space-y-3">
            {project.openings.map(o => {
              const wallLen = wallLengthMm(o.wall, project.room);
              const maxOffset = Math.max(0, wallLen - o.width);
              const offset = Math.min(o.startOffset ?? Math.max(0, (wallLen - o.width) / 2), maxOffset);
              return (
                <div key={o.id} className="rounded-xl border border-gray-2 p-3 space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-fg-4 capitalize">{o.type}</span>
                    <Button size="icon" variant="ghost" onClick={() => dispatchProject({ type: 'REMOVE_OPENING', id: o.id })} aria-label="Remove">
                      <Trash2 className="h-4 w-4 text-red-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Type</FieldLabel>
                      <Select value={o.type} onValueChange={(v: OpeningType) => update(o.id, { type: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="door">Door</SelectItem>
                          <SelectItem value="window">Window</SelectItem>
                          <SelectItem value="vent">Vent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Wall</FieldLabel>
                      <Select value={o.wall} onValueChange={(v: WallId) => update(o.id, { wall: v })}>
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
                      <FieldLabel>Shape</FieldLabel>
                      <Select value={o.shape} onValueChange={(v: OpeningShape) => update(o.id, { shape: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rectangle">Rectangle</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Width (mm)</FieldLabel>
                      <MmInput value={o.width} onChange={v => update(o.id, { width: v })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Height (mm)</FieldLabel>
                      <MmInput value={o.height} onChange={v => update(o.id, { height: v })} disabled={o.shape === 'circle'} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Position (mm)</FieldLabel>
                      <MmInput value={offset} onChange={v => update(o.id, { startOffset: Math.max(0, Math.min(v, maxOffset)) })} />
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
