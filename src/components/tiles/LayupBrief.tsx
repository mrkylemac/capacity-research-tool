'use client';

import { useMemo, useState } from 'react';
import type { LayupBrief } from '@/types/tileFindings';
import type { TilePlanConfig, TileStats } from '@/types/tiles';
import { evaluateLayup } from '@/lib/tileFindings';

interface LayupBriefProps {
  config: TilePlanConfig;
  stats: TileStats;
}

const SEVERITY_TONE = {
  red: {
    bg: 'bg-[#FDF6F6]',
    border: 'border-[#F2D6D2]',
    dot: 'bg-[#ff2f00]',
    text: 'text-[#7a1a05]',
    chip: 'bg-[#ffe2db] text-[#ff2f00] border-[#ffd5cc]',
  },
  amber: {
    bg: 'bg-[#FCFAEF]',
    border: 'border-[#EFE2B4]',
    dot: 'bg-[#ffa600]',
    text: 'text-[#7a5610]',
    chip: 'bg-[#ffeac2] text-[#9a6700] border-[#ffc65c]',
  },
  green: {
    bg: 'bg-[#F6F9F7]',
    border: 'border-[#D9E6DC]',
    dot: 'bg-[#33c758]',
    text: 'text-[#1c5b2e]',
    chip: 'bg-[#c2efcd] text-[#1c5b2e] border-[#71da8b]',
  },
  clear: {
    bg: 'bg-card',
    border: 'border-gray-2',
    dot: 'bg-gray-3',
    text: 'text-muted-foreground',
    chip: 'bg-gray-1 text-muted-foreground border-gray-2',
  },
} as const;

export function LayupBriefView({ config, stats }: LayupBriefProps) {
  const brief = useMemo(() => evaluateLayup(config, stats), [config, stats]);
  const [docOpen, setDocOpen] = useState(true);

  const overallFootprint =
    config.edgeWidth * 2 +
    config.coldPool.length +
    config.centreWidth +
    config.hotPool.length;
  const overallShort =
    config.edgeWidth * 2 + Math.max(config.coldPool.width, config.hotPool.width);

  const reds = brief.findings.filter(f => f.severity === 'red');
  const ambers = brief.findings.filter(f => f.severity === 'amber');

  return (
    <div className="space-y-4">
      {/* Document header */}
      <header className="bg-card rounded-2xl border border-gray-2 shadow-1 px-5 py-4">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Tile layup review
            </p>
            <h2 className="text-xl font-bold tracking-tight">
              Slow Folk pool tile plan
            </h2>
          </div>
          <button
            onClick={() => setDocOpen(o => !o)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {docOpen ? 'Collapse meta' : 'Show meta'}
          </button>
        </div>
        {docOpen && (
          <dl className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
            <Meta label="Tile" value={`${config.tileSize} mm raw-edge`} />
            <Meta label="Grout" value={`${config.groutWidth} mm`} />
            <Meta label="Footprint" value={`${overallFootprint} × ${overallShort} mm`} />
            <Meta label="Hot pool" value={`${config.hotPool.length} × ${config.hotPool.width} mm`} />
            <Meta label="Cold pool" value={`${config.coldPool.length} × ${config.coldPool.width} mm`} />
            <Meta label="Centre" value={`${config.centreWidth} mm`} />
            <Meta label="Edge" value={`${config.edgeWidth} mm`} />
            <Meta
              label="Room cap"
              value={`${config.maxOverallLength} mm long${overallFootprint > config.maxOverallLength ? ` (over by ${overallFootprint - config.maxOverallLength})` : ''}`}
            />
            <Meta
              label="Hot lid"
              value={`Megaskim ${config.hotSkimmer.lidType === 'hide' ? 'HIDE' : 'standard'} ${config.hotSkimmer.width}×${config.hotSkimmer.depth}`}
            />
            <Meta
              label="Cold lid"
              value={`Megaskim ${config.coldSkimmer.lidType === 'hide' ? 'HIDE' : 'standard'} ${config.coldSkimmer.width}×${config.coldSkimmer.depth}`}
            />
          </dl>
        )}
      </header>

      {/* Bottom line */}
      <section className="bg-[#F9F8F7] border border-[#E8E5DF] rounded-2xl px-5 py-4">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-[#7a6a4a] mb-1.5">
          Bottom line
        </p>
        <p className="text-base leading-relaxed text-fg-4">{brief.bottomLine}</p>
      </section>

      {/* Scorecard + Heat map */}
      <section className="bg-card rounded-2xl border border-gray-2 shadow-1 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-2">
          <p className="text-sm font-semibold">Summary</p>
          <p className="text-xs text-muted-foreground">
            What needs fixing, where the risk sits
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-gray-2 border-b border-gray-2">
          <Score count={brief.counts.red} label="To fix" tone="red" />
          <Score count={brief.counts.amber} label="To tweak" tone="amber" />
          <Score count={brief.counts.green} label="Standard" tone="green" />
        </div>

        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Where the risk sits
          </p>
          <ul className="space-y-1.5">
            {brief.heatMap.map(row => {
              const tone = SEVERITY_TONE[row.severity];
              return (
                <li
                  key={row.category}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${tone.bg} ${tone.border}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${tone.dot} shrink-0`} />
                    <span className="text-sm font-medium truncate">{row.label}</span>
                  </div>
                  <span className={`text-xs ${tone.text} tabular-nums shrink-0`}>
                    {row.statusText}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Red issues */}
      {reds.length > 0 && (
        <section>
          <SectionHeader
            kicker={`${reds.length} red ${reds.length === 1 ? 'item' : 'items'}`}
            title="Fix before pour"
            tone="red"
          />
          <div className="space-y-3">
            {reds.map((f, i) => (
              <IssueCard key={f.id} finding={f} index={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Amber issues */}
      {ambers.length > 0 && (
        <section>
          <SectionHeader
            kicker={`${ambers.length} amber ${ambers.length === 1 ? 'item' : 'items'}`}
            title="Negotiate or clarify"
            tone="amber"
          />
          <div className="space-y-3">
            {ambers.map((f, i) => (
              <IssueCard key={f.id} finding={f} index={reds.length + i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Green table */}
      {brief.greenNotes.length > 0 && (
        <section className="bg-[#F6F9F7] border border-[#D9E6DC] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D9E6DC]">
            <p className="text-sm font-semibold text-[#1c5b2e]">Standard, on module</p>
            <p className="text-xs text-[#3a6b47]">
              Read and ticked. No action needed.
            </p>
          </div>
          <ul className="divide-y divide-[#D9E6DC]">
            {brief.greenNotes.map(g => (
              <li key={g.id} className="px-5 py-2.5 grid grid-cols-12 gap-3 text-sm">
                <span className="col-span-3 font-medium text-fg-4 truncate">{g.item}</span>
                <span className="col-span-3 text-muted-foreground truncate">{g.location}</span>
                <span className="col-span-6 text-fg-4">{g.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Questions */}
      {brief.questions.length > 0 && (
        <section className="bg-[#FAF7FC] border border-[#E3D7EE] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E3D7EE]">
            <p className="text-sm font-semibold text-[#4d2e6b]">
              Asks before the tiler starts
            </p>
            <p className="text-xs text-[#6a4d80]">
              Send these to your pool builder and tiler in writing.
            </p>
          </div>
          <ol className="px-5 py-3 space-y-1.5 list-decimal list-inside text-sm text-fg-4">
            {brief.questions.map((q, i) => (
              <li key={i} className="leading-relaxed pl-1">
                {q.replace(/^Before pour: |^Confirm with tiler: /, '')}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Housekeeping */}
      <section className="bg-[#F9F8F7] border border-[#E8E5DF] rounded-2xl px-5 py-4">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-[#7a6a4a] mb-1.5">
          Housekeeping
        </p>
        <ul className="text-sm text-fg-4 space-y-1 list-disc list-inside">
          {brief.housekeeping.map((h, i) => (
            <li key={i} className="leading-relaxed">{h}</li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-muted-foreground italic pt-1">
        Generated from the current planner config. This is a first pass for
        conversations with your tiler and pool builder, not engineering advice.
        Anything that depends on AS1926.3 compliance must be signed off by your
        builder.
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-fg-4 tabular-nums truncate">{value}</dd>
    </div>
  );
}

function Score({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: 'red' | 'amber' | 'green';
}) {
  const t = SEVERITY_TONE[tone];
  return (
    <div className="px-5 py-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${t.text}`}>{count}</div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  tone,
}: {
  kicker: string;
  title: string;
  tone: 'red' | 'amber';
}) {
  const t = SEVERITY_TONE[tone];
  return (
    <div className="flex items-baseline gap-2 mb-2 px-1">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${t.chip} tracking-wide uppercase`}>
        {kicker}
      </span>
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}

function IssueCard({
  finding,
  index,
}: {
  finding: ReturnType<typeof evaluateLayup>['findings'][number];
  index: number;
}) {
  const t = SEVERITY_TONE[finding.severity];
  return (
    <article className={`${t.bg} ${t.border} border rounded-2xl px-5 py-4`}>
      <header className="flex items-start gap-3 mb-3">
        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${t.dot}`}>
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-fg-4 leading-tight">
            {finding.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium">Location:</span> {finding.location}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <FindingField label="What it says" value={finding.whatItSays} />
        <FindingField label="Why it matters" value={finding.whyItMatters} />
        <FindingField label="Market norm" value={finding.marketNorm} />
        <FindingField
          label="What to do"
          value={finding.whatToDo}
          emphasis
          tone={finding.severity}
        />
      </dl>
    </article>
  );
}

function FindingField({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: 'red' | 'amber' | 'green';
}) {
  const text = emphasis && tone ? SEVERITY_TONE[tone].text : 'text-fg-4';
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
        {label}
      </dt>
      <dd className={`text-sm leading-relaxed ${text} ${emphasis ? 'font-medium' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
