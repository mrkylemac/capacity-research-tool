'use client';

import {
  DoorOpen,
  Flame,
  Grid3x3,
  Image as ImageIcon,
  Magnet,
  MousePointer2,
  RectangleHorizontal,
  Square,
  Wind,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type EditorTool =
  | 'select'
  | 'add-door'
  | 'add-window'
  | 'add-vent'
  | 'add-column'
  | 'add-bench'
  | 'add-heater';

interface ToolDef {
  id: EditorTool;
  label: string;
  Icon: typeof MousePointer2;
}

const TOOLS: ToolDef[] = [
  { id: 'select',      label: 'Select',  Icon: MousePointer2 },
  { id: 'add-door',    label: 'Door',    Icon: DoorOpen },
  { id: 'add-window',  label: 'Window',  Icon: Square },
  { id: 'add-vent',    label: 'Vent',    Icon: Wind },
  { id: 'add-heater',  label: 'Heater',  Icon: Flame },
  { id: 'add-column',  label: 'Column',  Icon: RectangleHorizontal },
  { id: 'add-bench',   label: 'Bench',   Icon: RectangleHorizontal },
];

interface FloorPlanEditorToolbarProps {
  tool: EditorTool;
  onChange: (tool: EditorTool) => void;
  gridEnabled: boolean;
  snapEnabled: boolean;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onOpenBackground: () => void;
  hasBackground: boolean;
}

export function FloorPlanEditorToolbar({
  tool,
  onChange,
  gridEnabled,
  snapEnabled,
  onToggleGrid,
  onToggleSnap,
  onOpenBackground,
  hasBackground,
}: FloorPlanEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-gray-2 bg-card rounded-t-xl">
      {TOOLS.map(({ id, label, Icon }) => {
        const active = tool === id;
        return (
          <Button
            key={id}
            type="button"
            variant={active ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(id)}
            className="gap-1.5 h-8"
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs">{label}</span>
          </Button>
        );
      })}
      <div className="mx-2 h-5 w-px bg-gray-2" />
      <Button
        type="button"
        variant={gridEnabled ? 'default' : 'ghost'}
        size="sm"
        onClick={onToggleGrid}
        className="gap-1.5 h-8"
        title="Toggle grid"
      >
        <Grid3x3 className="h-3.5 w-3.5" />
        <span className="text-xs">Grid</span>
      </Button>
      <Button
        type="button"
        variant={snapEnabled ? 'default' : 'ghost'}
        size="sm"
        onClick={onToggleSnap}
        className="gap-1.5 h-8"
        title="Toggle snap"
      >
        <Magnet className="h-3.5 w-3.5" />
        <span className="text-xs">Snap</span>
      </Button>
      <div className="mx-2 h-5 w-px bg-gray-2" />
      <Button
        type="button"
        variant={hasBackground ? 'secondary' : 'ghost'}
        size="sm"
        onClick={onOpenBackground}
        className="gap-1.5 h-8"
        title="Import background"
      >
        <ImageIcon className="h-3.5 w-3.5" />
        <span className="text-xs">Background</span>
      </Button>
    </div>
  );
}
