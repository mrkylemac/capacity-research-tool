'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { importBackground, type ImportedBackground } from '@/lib/saunaMaterials/importBackground';

const STORAGE_KEY = 'slowfolk:sauna-materials:floorPlanBackground';

export interface BackgroundState {
  kind: 'image' | 'svg';
  payload: string;
  naturalWidth: number;
  naturalHeight: number;
  /** Width on the plan, in mm. (Height auto-scales from the natural aspect ratio.) */
  widthMm: number;
  /** Top-left X in room coords, mm. */
  xMm: number;
  /** Top-left Y in room coords, mm. */
  yMm: number;
  /** 0..1 */
  opacity: number;
}

export function loadStoredBackground(): BackgroundState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.kind !== 'image' && parsed.kind !== 'svg') return null;
    return parsed as BackgroundState;
  } catch {
    return null;
  }
}

export function storeBackground(bg: BackgroundState | null) {
  if (typeof window === 'undefined') return;
  try {
    if (bg) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bg));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore quota
  }
}

interface FloorPlanBackgroundProps {
  background: BackgroundState | null;
  onChange: (next: BackgroundState | null) => void;
  /** Default width in mm to use for a new import. Usually the room length. */
  defaultWidthMm: number;
  onClose: () => void;
}

export function FloorPlanBackgroundPanel({
  background,
  onChange,
  defaultWidthMm,
  onClose,
}: FloorPlanBackgroundProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const imported = await importBackground(file);
      const widthMm = background?.widthMm ?? defaultWidthMm;
      onChange({
        kind: imported.kind,
        payload: imported.payload,
        naturalWidth: imported.naturalWidth,
        naturalHeight: imported.naturalHeight,
        widthMm,
        xMm: background?.xMm ?? 0,
        yMm: background?.yMm ?? 0,
        opacity: background?.opacity ?? 0.4,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import file');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-gray-2 bg-card px-3 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Tracing background</div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.dxf,.dwg,image/*,application/pdf"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          {busy ? 'Importing…' : background ? 'Replace…' : 'Import file…'}
        </Button>
        {background && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-1">
          PNG, JPG, PDF, or DXF. DWG users: export to PDF or DXF first.
        </span>
      </div>

      {error && <div className="text-xs text-red-4">{error}</div>}

      {background && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <NumberField
            label="X offset (mm)"
            value={background.xMm}
            onChange={v => onChange({ ...background, xMm: v })}
          />
          <NumberField
            label="Y offset (mm)"
            value={background.yMm}
            onChange={v => onChange({ ...background, yMm: v })}
          />
          <NumberField
            label="Width (mm)"
            value={background.widthMm}
            onChange={v => onChange({ ...background, widthMm: Math.max(1, v) })}
          />
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Opacity ({Math.round(background.opacity * 100)}%)
            </Label>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[Math.round(background.opacity * 100)]}
              onValueChange={([v]) => onChange({ ...background, opacity: (v ?? 0) / 100 })}
              className="mt-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type="number"
        className="h-8"
        value={Math.round(value)}
        onChange={e => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

interface FloorPlanBackgroundLayerProps {
  background: BackgroundState;
}

/**
 * SVG fragment that renders the imported tracing layer in room coords.
 * Render inside an `<svg>` with `viewBox="0 0 roomLength roomWidth"`.
 */
export function FloorPlanBackgroundLayer({ background }: FloorPlanBackgroundLayerProps) {
  const aspect = background.naturalHeight > 0 ? background.naturalHeight / background.naturalWidth : 1;
  const heightMm = background.widthMm * aspect;
  if (background.kind === 'svg') {
    // Wrap the user's SVG inside an outer SVG positioned in room coords.
    return (
      <g opacity={background.opacity}>
        <foreignObject
          x={background.xMm}
          y={background.yMm}
          width={background.widthMm}
          height={heightMm}
        >
          <div
            dangerouslySetInnerHTML={{ __html: scaleSvgToFill(background.payload) }}
            style={{ width: '100%', height: '100%' }}
          />
        </foreignObject>
      </g>
    );
  }
  return (
    <image
      href={background.payload}
      x={background.xMm}
      y={background.yMm}
      width={background.widthMm}
      height={heightMm}
      opacity={background.opacity}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}

/** Force the SVG payload to fill its container by setting width/height to 100%. */
function scaleSvgToFill(svg: string): string {
  // Replace any existing width/height attrs on the root <svg> tag.
  return svg
    .replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1')
    .replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1')
    .replace(/<svg([^>]*?)>/, '<svg$1 width="100%" height="100%">');
}

/** Persistence hook — wires loadStoredBackground / storeBackground to a React state pair. */
export function usePersistedBackground(): [BackgroundState | null, (next: BackgroundState | null) => void] {
  const [bg, setBg] = useState<BackgroundState | null>(null);
  useEffect(() => {
    setBg(loadStoredBackground());
  }, []);
  const update = (next: BackgroundState | null) => {
    setBg(next);
    storeBackground(next);
  };
  return [bg, update];
}
