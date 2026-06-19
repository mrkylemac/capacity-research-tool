'use client';

export type SaunaSection = 'room' | 'benches' | 'walls' | 'supplies' | 'drawings' | 'takeoff';

interface NavTab {
  id: SaunaSection;
  label: string;
}

const TABS: NavTab[] = [
  { id: 'room',     label: 'Room & Openings' },
  { id: 'benches',  label: 'Benches' },
  { id: 'walls',    label: 'Walls & Ceiling' },
  { id: 'supplies', label: 'Supplies' },
  { id: 'drawings', label: 'Drawings' },
  { id: 'takeoff',  label: 'Take-off' },
];

interface SaunaMaterialsNavProps {
  active: SaunaSection;
  onChange: (next: SaunaSection) => void;
}

export function SaunaMaterialsNav({ active, onChange }: SaunaMaterialsNavProps) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-2 mb-6 overflow-x-auto">
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              'flex items-center px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-fg-4',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
