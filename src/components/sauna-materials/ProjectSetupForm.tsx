'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSaunaMaterials } from '@/lib/saunaMaterials/store';

function MmField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={Number.isFinite(value) ? value : ''}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className="pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
      </div>
    </div>
  );
}

export function ProjectSetupForm() {
  const { project, dispatchProject } = useSaunaMaterials();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Room</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MmField
            id="room-length"
            label="Length"
            value={project.room.length}
            onChange={v => dispatchProject({ type: 'UPDATE_ROOM', patch: { length: v } })}
          />
          <MmField
            id="room-width"
            label="Width"
            value={project.room.width}
            onChange={v => dispatchProject({ type: 'UPDATE_ROOM', patch: { width: v } })}
          />
          <MmField
            id="room-ceiling"
            label="Ceiling (FCL)"
            value={project.room.ceilingHeight}
            onChange={v => dispatchProject({ type: 'UPDATE_ROOM', patch: { ceilingHeight: v } })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          North &amp; south run the length, east &amp; west run the width.
        </p>
      </CardContent>
    </Card>
  );
}
