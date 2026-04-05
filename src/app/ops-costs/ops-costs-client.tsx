'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

/* ------------------------------------------------------------------ */
/* Formatters                                                         */
/* ------------------------------------------------------------------ */

function fmtAUD(n: number) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

function fmtAUD2(n: number) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 });
}

function fmtNum(n: number, dp = 0) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: dp });
}

/* ------------------------------------------------------------------ */
/* Reusable: labelled numeric input                                   */
/* ------------------------------------------------------------------ */

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  hint?: string;
}

function NumberField({ label, value, onChange, unit, step = 1, min = 0, hint }: NumberFieldProps) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <Input
          type="number"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className={unit ? 'pr-14 tabular-nums' : 'tabular-nums'}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium tracking-wide uppercase pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable: stat card (matches BudgetSummary styling)                */
/* ------------------------------------------------------------------ */

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  accent?: 'default' | 'green' | 'amber' | 'red';
  hero?: boolean;
}

function StatTile({ label, value, sub, accent = 'default', hero = false }: StatTileProps) {
  const valueColor = {
    default: hero ? '' : 'text-fg-4',
    green: 'text-green-4',
    amber: 'text-amber-4',
    red: 'text-red-4',
  }[accent];

  return (
    <div
      className="bg-card rounded-2xl border border-gray-2 shadow-1 px-5 py-4 transition-all"
      style={hero ? { borderTop: '2px solid var(--primary)' } : undefined}
    >
      <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-bold tabular-nums tracking-tight leading-none ${valueColor}`}
        style={hero && accent === 'default' ? { color: 'var(--primary)' } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Global assumptions                                                 */
/* ------------------------------------------------------------------ */

interface Globals {
  electricityRate: number;   // $/kWh
  waterRate: number;         // $/kL
  openDaysPerWeek: number;
  openWeeksPerYear: number;
  openHoursPerDay: number;
}

const DEFAULT_GLOBALS: Globals = {
  electricityRate: 0.35,     // AUD/kWh commercial Vic retail
  waterRate: 4.5,            // AUD/kL metro water+sewer
  openDaysPerWeek: 6,
  openWeeksPerYear: 50,
  openHoursPerDay: 11,
};

/* ------------------------------------------------------------------ */
/* Sauna heater model                                                 */
/* ------------------------------------------------------------------ */

interface HeaterModel {
  numSaunas: number;
  heaterKW: number;           // nameplate kW per sauna heater
  preheatHours: number;       // per open day — full-power warm up
  dutyCycleRunning: number;   // 0-1 thermostat duty during open hours
  standbyHours: number;       // per open day — idle-but-warm between sessions
  dutyCycleStandby: number;   // 0-1 during standby
}

const DEFAULT_HEATERS: HeaterModel = {
  numSaunas: 2,
  heaterKW: 9,                // typical 8-ppl electric heater
  preheatHours: 1.0,
  dutyCycleRunning: 0.55,     // cycles on/off to hold temp
  standbyHours: 0,
  dutyCycleStandby: 0.15,
};

function heaterCalc(globals: Globals, m: HeaterModel) {
  const runningHours = Math.max(0, globals.openHoursPerDay - m.preheatHours - m.standbyHours);
  const kWhPerDayPerHeater =
    m.heaterKW * m.preheatHours * 1.0 +
    m.heaterKW * runningHours * m.dutyCycleRunning +
    m.heaterKW * m.standbyHours * m.dutyCycleStandby;

  const kWhPerDay = kWhPerDayPerHeater * m.numSaunas;
  const daysPerYear = globals.openDaysPerWeek * globals.openWeeksPerYear;
  const kWhPerYear = kWhPerDay * daysPerYear;
  const kWhPerMonth = kWhPerYear / 12;
  const costPerMonth = kWhPerMonth * globals.electricityRate;
  const costPerYear = kWhPerYear * globals.electricityRate;
  const costPerDay = kWhPerDay * globals.electricityRate;

  return { kWhPerDayPerHeater, kWhPerDay, kWhPerMonth, kWhPerYear, costPerDay, costPerMonth, costPerYear };
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

export function OpsCostsClient() {
  const [globals, setGlobals] = useState<Globals>(DEFAULT_GLOBALS);
  const [heaters, setHeaters] = useState<HeaterModel>(DEFAULT_HEATERS);

  const heaterResult = useMemo(() => heaterCalc(globals, heaters), [globals, heaters]);

  const totalMonthly = heaterResult.costPerMonth; // extend when ventilation/HVAC/laundry land

  const setG = <K extends keyof Globals>(k: K) => (v: number) => setGlobals((g) => ({ ...g, [k]: v }));
  const setH = <K extends keyof HeaterModel>(k: K) => (v: number) => setHeaters((h) => ({ ...h, [k]: v }));

  const resetAll = () => {
    setGlobals(DEFAULT_GLOBALS);
    setHeaters(DEFAULT_HEATERS);
  };

  return (
    <main className="min-h-screen">
      <div className="page-container">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-1 text-amber-4 border border-amber-2 tracking-wide uppercase">
                Lab
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-1 text-purple-4 border border-purple-2 tracking-wide uppercase">
                OpEx
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Ops Costs Calculator</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Playground for monthly operating cost estimates — sauna heater energy first, then ventilation, HVAC, laundry.
            </p>
          </div>
          <button
            onClick={resetAll}
            className="text-xs font-medium text-muted-foreground hover:text-fg-4 border border-gray-2 rounded-md px-3 py-2 transition-colors shrink-0"
          >
            Reset to defaults
          </button>
        </div>

        {/* Monthly summary */}
        <div className="space-y-6">
          <div className="section-animate" style={{ animationDelay: '0ms' }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile
                label="Est. monthly OpEx"
                value={fmtAUD(totalMonthly)}
                sub="Modelled categories only"
                hero
              />
              <StatTile
                label="Heater — monthly"
                value={fmtAUD(heaterResult.costPerMonth)}
                sub={`${fmtNum(heaterResult.kWhPerMonth)} kWh`}
              />
              <StatTile
                label="Heater — annual"
                value={fmtAUD(heaterResult.costPerYear)}
                sub={`${fmtNum(heaterResult.kWhPerYear)} kWh / yr`}
                accent="amber"
              />
              <StatTile
                label="Heater — per day"
                value={fmtAUD2(heaterResult.costPerDay)}
                sub={`${fmtNum(heaterResult.kWhPerDay, 1)} kWh / day`}
              />
            </div>
          </div>

          {/* Globals */}
          <div className="section-animate" style={{ animationDelay: '60ms' }}>
            <div className="bg-card rounded-2xl border border-gray-2 shadow-1 px-5 py-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold tracking-tight">Global assumptions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shared across every category. Edit inline — all downstream numbers update live.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <NumberField
                  label="Electricity rate"
                  value={globals.electricityRate}
                  onChange={setG('electricityRate')}
                  unit="$/kWh"
                  step={0.01}
                  hint="Commercial retail incl. network, ex GST"
                />
                <NumberField
                  label="Water rate"
                  value={globals.waterRate}
                  onChange={setG('waterRate')}
                  unit="$/kL"
                  step={0.1}
                  hint="Potable + sewer combined"
                />
                <NumberField
                  label="Open days / week"
                  value={globals.openDaysPerWeek}
                  onChange={setG('openDaysPerWeek')}
                  unit="days"
                  step={1}
                  min={0}
                />
                <NumberField
                  label="Open weeks / year"
                  value={globals.openWeeksPerYear}
                  onChange={setG('openWeeksPerYear')}
                  unit="wks"
                  step={1}
                  min={0}
                  hint="52 minus closures / holidays"
                />
                <NumberField
                  label="Open hours / day"
                  value={globals.openHoursPerDay}
                  onChange={setG('openHoursPerDay')}
                  unit="hrs"
                  step={0.5}
                  min={0}
                  hint="Door open → door closed"
                />
              </div>
            </div>
          </div>

          {/* Sauna heater */}
          <div className="section-animate" style={{ animationDelay: '120ms' }}>
            <div className="bg-card rounded-2xl border border-gray-2 shadow-1 px-5 py-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Sauna heater energy</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Electric heater load modelled as <span className="font-medium text-fg-4">preheat at 100%</span> +{' '}
                    <span className="font-medium text-fg-4">thermostat-cycled running</span> + optional standby.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Monthly</p>
                  <p className="text-2xl font-bold tabular-nums tracking-tight leading-none" style={{ color: 'var(--primary)' }}>
                    {fmtAUD(heaterResult.costPerMonth)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                <NumberField
                  label="Number of saunas"
                  value={heaters.numSaunas}
                  onChange={setH('numSaunas')}
                  unit="saunas"
                  step={1}
                  min={0}
                />
                <NumberField
                  label="Heater power (each)"
                  value={heaters.heaterKW}
                  onChange={setH('heaterKW')}
                  unit="kW"
                  step={0.5}
                  hint="Nameplate rating per room"
                />
                <NumberField
                  label="Preheat time / day"
                  value={heaters.preheatHours}
                  onChange={setH('preheatHours')}
                  unit="hrs"
                  step={0.25}
                  hint="Full-power morning warm-up"
                />
                <NumberField
                  label="Running duty cycle"
                  value={heaters.dutyCycleRunning}
                  onChange={setH('dutyCycleRunning')}
                  unit="×"
                  step={0.05}
                  min={0}
                  hint="Fraction of time element is on during open hours"
                />
                <NumberField
                  label="Standby hours / day"
                  value={heaters.standbyHours}
                  onChange={setH('standbyHours')}
                  unit="hrs"
                  step={0.5}
                  hint="After hours idle-warm (0 = cold overnight)"
                />
                <NumberField
                  label="Standby duty cycle"
                  value={heaters.dutyCycleStandby}
                  onChange={setH('dutyCycleStandby')}
                  unit="×"
                  step={0.05}
                  min={0}
                />
              </div>

              {/* Per-heater breakdown */}
              <div className="border-t border-gray-2 pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                      <th className="text-left pb-2 font-medium">Breakdown</th>
                      <th className="text-right pb-2 font-medium">kWh</th>
                      <th className="text-right pb-2 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    <tr className="border-t border-gray-2">
                      <td className="py-2 text-fg-4">Per heater · per day</td>
                      <td className="py-2 text-right text-muted-foreground">{fmtNum(heaterResult.kWhPerDayPerHeater, 1)}</td>
                      <td className="py-2 text-right text-muted-foreground">{fmtAUD2(heaterResult.kWhPerDayPerHeater * globals.electricityRate)}</td>
                    </tr>
                    <tr className="border-t border-gray-2">
                      <td className="py-2 text-fg-4">All saunas · per day</td>
                      <td className="py-2 text-right text-muted-foreground">{fmtNum(heaterResult.kWhPerDay, 1)}</td>
                      <td className="py-2 text-right text-muted-foreground">{fmtAUD2(heaterResult.costPerDay)}</td>
                    </tr>
                    <tr className="border-t border-gray-2">
                      <td className="py-2 text-fg-4">All saunas · per month</td>
                      <td className="py-2 text-right text-muted-foreground">{fmtNum(heaterResult.kWhPerMonth)}</td>
                      <td className="py-2 text-right font-semibold text-fg-4">{fmtAUD(heaterResult.costPerMonth)}</td>
                    </tr>
                    <tr className="border-t border-gray-2">
                      <td className="py-2 text-fg-4">All saunas · per year</td>
                      <td className="py-2 text-right text-muted-foreground">{fmtNum(heaterResult.kWhPerYear)}</td>
                      <td className="py-2 text-right font-semibold text-fg-4">{fmtAUD(heaterResult.costPerYear)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Placeholders for upcoming categories */}
          <div className="section-animate grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ animationDelay: '180ms' }}>
            {[
              { label: 'Ventilation', note: 'Exhaust + make-up air fans, humidity control' },
              { label: 'HVAC', note: 'Reception, change rooms, lounge conditioning' },
              { label: 'Laundry', note: 'Towels + robes: water, gas, detergent, labour' },
            ].map((c) => (
              <div key={c.label} className="bg-card rounded-2xl border border-gray-2 border-dashed shadow-1 px-5 py-4 opacity-70">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{c.label}</p>
                  <span className="text-[10px] bg-gray-2 text-muted-foreground px-1.5 py-0.5 rounded-full leading-none uppercase tracking-wide">soon</span>
                </div>
                <p className="text-2xl font-bold tabular-nums tracking-tight leading-none text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground mt-1.5">{c.note}</p>
              </div>
            ))}
          </div>

          <div className="section-animate text-xs text-muted-foreground pt-2" style={{ animationDelay: '240ms' }}>
            <p>
              Numbers are client-side only — nothing is persisted. Refresh to reset, or hit{' '}
              <span className="font-medium text-fg-4">Reset to defaults</span>.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
