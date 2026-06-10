'use client';

import type { TilePlanConfig } from '@/types/tiles';

interface ControlsPanelProps {
  config: TilePlanConfig;
  onChange: (next: TilePlanConfig) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  showCuts: boolean;
  setShowCuts: (v: boolean) => void;
  showDimensions: boolean;
  setShowDimensions: (v: boolean) => void;
  showFittings: boolean;
  setShowFittings: (v: boolean) => void;
  onReset: () => void;
}

export function ControlsPanel({
  config,
  onChange,
  showGrid,
  setShowGrid,
  showCuts,
  setShowCuts,
  showDimensions,
  setShowDimensions,
  showFittings,
  setShowFittings,
  onReset,
}: ControlsPanelProps) {
  const update = <K extends keyof TilePlanConfig>(key: K, value: TilePlanConfig[K]) => {
    onChange({ ...config, [key]: value });
  };
  const updatePool = (
    pool: 'hotPool' | 'coldPool',
    field: keyof TilePlanConfig['hotPool'],
    value: number,
  ) => {
    onChange({ ...config, [pool]: { ...config[pool], [field]: value } });
  };
  const updateSkimmer = <F extends keyof TilePlanConfig['hotSkimmer']>(
    key: 'hotSkimmer' | 'coldSkimmer',
    field: F,
    value: TilePlanConfig['hotSkimmer'][F],
  ) => {
    onChange({ ...config, [key]: { ...config[key], [field]: value } });
  };

  return (
    <aside className="bg-card rounded-2xl border border-gray-2 shadow-1 p-4 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Controls</p>
          <p className="text-xs text-muted-foreground">Adjust to minimise cuts</p>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Reset
        </button>
      </header>

      <Section title="Visibility">
        <Toggle label="Tile grid" checked={showGrid} onChange={setShowGrid} />
        <Toggle label="Cut tiles" checked={showCuts} onChange={setShowCuts} />
        <Toggle label="Dimensions" checked={showDimensions} onChange={setShowDimensions} />
        <Toggle label="Fittings" checked={showFittings} onChange={setShowFittings} />
      </Section>

      <Section title="Tile">
        <NumInput label="Tile size (mm)" value={config.tileSize} onChange={v => update('tileSize', v)} step={5} />
        <NumInput label="Thickness (mm)" value={config.tileThickness} onChange={v => update('tileThickness', v)} step={1} />
        <NumInput label="Grout (mm)" value={config.groutWidth} onChange={v => update('groutWidth', v)} step={0.5} />
      </Section>

      <Section title="Grid origin (nudge to align)">
        <Slider
          label={`X offset: ${config.gridOriginX.toFixed(0)} mm`}
          min={-(config.tileSize + config.groutWidth)}
          max={0}
          step={1}
          value={config.gridOriginX}
          onChange={v => update('gridOriginX', v)}
        />
        <Slider
          label={`Y offset: ${config.gridOriginY.toFixed(0)} mm`}
          min={-(config.tileSize + config.groutWidth)}
          max={0}
          step={1}
          value={config.gridOriginY}
          onChange={v => update('gridOriginY', v)}
        />
      </Section>

      <Section title="Deck">
        <NumInput label="Edge width (mm)" value={config.edgeWidth} onChange={v => update('edgeWidth', v)} step={1} />
        <NumInput label="Centre width (mm)" value={config.centreWidth} onChange={v => update('centreWidth', v)} step={1} />
        <NumInput label="Max long dim (mm)" value={config.maxOverallLength} onChange={v => update('maxOverallLength', v)} step={1} />
      </Section>

      <Section title="Hot pool">
        <NumInput label="Length (mm)" value={config.hotPool.length} onChange={v => updatePool('hotPool', 'length', v)} step={1} />
        <NumInput label="Width (mm)" value={config.hotPool.width} onChange={v => updatePool('hotPool', 'width', v)} step={1} />
        <NumInput label="Shell height (mm)" value={config.hotPool.shellHeight} onChange={v => updatePool('hotPool', 'shellHeight', v)} step={1} />
        <NumInput label="Water depth (mm)" value={config.hotPool.waterDepth} onChange={v => updatePool('hotPool', 'waterDepth', v)} step={1} />
      </Section>

      <Section title="Cold pool">
        <NumInput label="Length (mm)" value={config.coldPool.length} onChange={v => updatePool('coldPool', 'length', v)} step={1} />
        <NumInput label="Width (mm)" value={config.coldPool.width} onChange={v => updatePool('coldPool', 'width', v)} step={1} />
        <NumInput label="Shell height (mm)" value={config.coldPool.shellHeight} onChange={v => updatePool('coldPool', 'shellHeight', v)} step={1} />
        <NumInput label="Water depth (mm)" value={config.coldPool.waterDepth} onChange={v => updatePool('coldPool', 'waterDepth', v)} step={1} />
      </Section>

      <Section title="Hot skimmer (Megaskim, faces hot)">
        <NumInput label="Offset X (mm)" value={config.hotSkimmer.offsetX} onChange={v => updateSkimmer('hotSkimmer', 'offsetX', v)} step={1} />
        <NumInput label="Offset Y (mm)" value={config.hotSkimmer.offsetY} onChange={v => updateSkimmer('hotSkimmer', 'offsetY', v)} step={1} />
        <NumInput label="Lid W (mm)" value={config.hotSkimmer.width} onChange={v => updateSkimmer('hotSkimmer', 'width', v)} step={1} />
        <NumInput label="Lid D (mm)" value={config.hotSkimmer.depth} onChange={v => updateSkimmer('hotSkimmer', 'depth', v)} step={1} />
        <NumInput label="Body size (mm)" value={config.hotSkimmer.bodySize} onChange={v => updateSkimmer('hotSkimmer', 'bodySize', v)} step={1} />
        <FacingToggle value={config.hotSkimmer.facing} onChange={v => updateSkimmer('hotSkimmer', 'facing', v)} />
        <LidTypeToggle value={config.hotSkimmer.lidType} onChange={v => updateSkimmer('hotSkimmer', 'lidType', v)} />
      </Section>

      <Section title="Cold skimmer (Megaskim, faces cold)">
        <NumInput label="Offset X (mm)" value={config.coldSkimmer.offsetX} onChange={v => updateSkimmer('coldSkimmer', 'offsetX', v)} step={1} />
        <NumInput label="Offset Y (mm)" value={config.coldSkimmer.offsetY} onChange={v => updateSkimmer('coldSkimmer', 'offsetY', v)} step={1} />
        <NumInput label="Lid W (mm)" value={config.coldSkimmer.width} onChange={v => updateSkimmer('coldSkimmer', 'width', v)} step={1} />
        <NumInput label="Lid D (mm)" value={config.coldSkimmer.depth} onChange={v => updateSkimmer('coldSkimmer', 'depth', v)} step={1} />
        <NumInput label="Body size (mm)" value={config.coldSkimmer.bodySize} onChange={v => updateSkimmer('coldSkimmer', 'bodySize', v)} step={1} />
        <FacingToggle value={config.coldSkimmer.facing} onChange={v => updateSkimmer('coldSkimmer', 'facing', v)} />
        <LidTypeToggle value={config.coldSkimmer.lidType} onChange={v => updateSkimmer('coldSkimmer', 'lidType', v)} />
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-sm cursor-pointer">
      <span>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-2'
        }`}
        type="button"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </label>
  );
}

function NumInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground flex-1 truncate">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="w-20 h-7 px-2 text-right text-sm tabular-nums bg-gray-1 border border-gray-2 rounded focus:outline-none focus:border-primary"
      />
    </label>
  );
}

function FacingToggle({
  value,
  onChange,
}: {
  value: 'left' | 'right';
  onChange: (v: 'left' | 'right') => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground flex-1 truncate">Throat facing</span>
      <div className="flex items-center gap-1 bg-gray-1 rounded-full p-0.5 border border-gray-2">
        <button
          type="button"
          onClick={() => onChange('left')}
          className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
            value === 'left' ? 'bg-primary text-white' : 'text-muted-foreground'
          }`}
        >
          ← Left
        </button>
        <button
          type="button"
          onClick={() => onChange('right')}
          className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
            value === 'right' ? 'bg-primary text-white' : 'text-muted-foreground'
          }`}
        >
          Right →
        </button>
      </div>
    </div>
  );
}

function LidTypeToggle({
  value,
  onChange,
}: {
  value: 'standard' | 'hide';
  onChange: (v: 'standard' | 'hide') => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground flex-1 truncate">Lid type</span>
      <div className="flex items-center gap-1 bg-gray-1 rounded-full p-0.5 border border-gray-2">
        <button
          type="button"
          onClick={() => onChange('standard')}
          className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
            value === 'standard' ? 'bg-primary text-white' : 'text-muted-foreground'
          }`}
        >
          Standard
        </button>
        <button
          type="button"
          onClick={() => onChange('hide')}
          className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
            value === 'hide' ? 'bg-primary text-white' : 'text-muted-foreground'
          }`}
        >
          HIDE
        </button>
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1 tabular-nums">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
