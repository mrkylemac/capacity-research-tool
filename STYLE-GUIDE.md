# Style Guide — Slow Folk

Use this when creating or editing pages so they stay in the family.

> Light-mode first, inspired by Visitors / Godly. Quiet surfaces, soft shadows, one accent (violet). Tabular numbers everywhere counts appear. Animation is whisper-quiet — a 200ms fade with a small Y nudge.

---

## 1. The shell

Every page starts the same way.

```tsx
'use client'; // if interactive

export function SomePageClient() {
  return (
    <main className="min-h-screen">
      <div className="page-container">
        {/* header — see §2 */}
        {/* content — see §6 */}
      </div>
    </main>
  );
}
```

**Container width.**

| Page type | Class |
|---|---|
| Default (reports, tracker, content) | `page-container` (`max-w-4xl`, 896 px) |
| Tool with wide canvas (Tile Planner) | `max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8` |

If you need >900 px because you're rendering a wide SVG, drawing, or side-by-side panels, override `page-container` rather than fight it.

**Server vs client.** `page.tsx` stays a server component and exports `metadata`. All interactivity goes in `*-client.tsx`. Don't mix.

```tsx
// page.tsx
import { ThisClient } from './this-client';
export const metadata = { title: 'Thing — Slow Folk' };
export default function Page() { return <ThisClient />; }
```

---

## 2. Page header

```tsx
<div className="mb-6">
  <div className="flex items-center gap-2 mb-1.5">
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-{tone}-1 text-{tone}-4 border border-{tone}-2 tracking-wide uppercase">
      Section
    </span>
  </div>
  <h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
  <p className="text-sm text-muted-foreground mt-0.5">One-line subtitle</p>
</div>
```

**Pick the badge tone by domain:**

| Tone | Use for |
|---|---|
| `purple` | CapEx, financial tracker |
| `sky` | Build tools, planning (tile planner) |
| `amber` | OpEx, warnings |
| `green` | Live data, success |
| `red` | Alerts, errors |

---

## 3. Colour system

All colours live in `src/styles/globals.css` as CSS variables and are exposed as Tailwind utilities. **Never hardcode hex in components.** Use the named utilities.

### Surfaces & text (semantic)

| Token | Use |
|---|---|
| `bg-background` / `bg-card` | Page and card surfaces (white) |
| `bg-gray-1` | Subtle inset (KPI panels, stat chips, inputs) |
| `bg-muted` | Toggle tracks, dividers |
| `text-fg-4` | Primary text (default) |
| `text-muted-foreground` | Secondary text, labels, captions |
| `border-gray-2` | Default 1px border |

### Tonal scales — 4 steps each

Every accent colour (`blue`, `red`, `green`, `amber`, `purple`, `sky`, `pink`) has the same 4-step pattern. Use them in **trios**:

```
bg-{color}-1   text-{color}-4   border-{color}-2
```

- **`-1`** — tinted background (chip/banner fill)
- **`-2`** — border on a tinted surface
- **`-3`** — strong accent for icons, focus rings, dividers
- **`-4`** — text and bold solid fills

**Status conventions (don't reinvent):**

| Status | Trio | Example |
|---|---|---|
| Success / "good" | `green-1` + `green-4` + `border-green-3` | "On track" chip |
| Warning / "attention" | `amber-1` + `amber-4` + `border-amber-3` | Demo data banner |
| Error / "danger" | `red-1` + `red-4` + `border-red-3` | Error state |
| Highlight / "info" | `purple-1` + `purple-4` + `border-purple-2` | CapEx, hero CTA |
| Build / "planning" | `sky-1` + `sky-4` + `border-sky-2` | Tile Planner |

### Single accent

`text-primary` and `bg-primary` are the violet accent (`--purple-4` family). Use sparingly — links, active tab underline, slider thumb, primary button, single highlight per view.

---

## 4. Typography

Open Runde is the only font (loaded in `globals.css`). Don't add other faces.

| Role | Class |
|---|---|
| Page title | `text-2xl font-bold tracking-tight` |
| Section title (card header) | `text-sm font-semibold` |
| Section subtitle | `text-xs text-muted-foreground` |
| Stat value (big) | `text-lg font-semibold tabular-nums` |
| Stat value (small) | `text-sm font-semibold tabular-nums` |
| Eyebrow / label | `text-[10px] uppercase tracking-wide text-muted-foreground` (or `tracking-wider font-semibold` for stronger) |
| Helper text | `text-[11px] text-muted-foreground` |
| Body | default 14 px (`text-sm`) for UI; 16 px for prose |
| Code / mono | `font-mono` on a tinted chip (`bg-{tone}-2 px-1 rounded`) |

**Always use `tabular-nums` for numbers in cards, tables, and stat blocks.** Otherwise digits jitter on update.

---

## 5. Shape, spacing, shadow

### Radii

| Shape | Class | Use |
|---|---|---|
| Card / large panel | `rounded-2xl` (16 px) | Main containers |
| Stat chip / KPI | `rounded-lg` (8 px) | Inset panels |
| Tag, pill, toggle | `rounded-full` | Chips, badges, segmented controls, button primary |
| Input | `rounded` (4 px) | Number inputs |
| Decorative SVG | `rx={4}` to `rx={8}` | Skimmer / fitting overlays |

### Borders & shadows

- Default card: `bg-card rounded-2xl border border-gray-2 shadow-1`
- Elevated on hover: `hover:shadow-2 transition-shadow`
- Soft inset (KPI block): `bg-gray-1 rounded-lg px-3 py-2` — no border, no shadow
- Tinted banner: `bg-{tone}-1 border border-{tone}-3 rounded-xl px-4 py-3`

Shadow scale (in globals.css): `shadow-1` → `shadow-4`. Default to `shadow-1`. Bump to `shadow-2` only on hover or for a single hero element.

### Spacing scale

| Where | Gap / padding |
|---|---|
| Stacked sections inside main column | `space-y-6` |
| Grid of cards | `gap-3` (tight) to `gap-4` (relaxed) |
| Inside a card | `p-4` (most) or `p-5` (hero summary) |
| Header → content | `mb-6` after the page header, `mb-4` for sub-sections |
| Within a stat chip | `px-3 py-2` (KPI) or `px-2.5 py-1.5` (compact) |
| Between header and content inside a card | `border-b border-gray-2` + `px-4 py-3` for the header row |

---

## 6. Component recipes

### Card

```tsx
<div className="bg-card rounded-2xl border border-gray-2 shadow-1">
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-2">
    <div>
      <p className="text-sm font-semibold">Section name</p>
      <p className="text-xs text-muted-foreground">One-line description</p>
    </div>
    {/* optional right-side: toggle, action, legend */}
  </div>
  <div className="p-4">
    {/* content */}
  </div>
</div>
```

### KPI block

```tsx
<div className="bg-gray-1 rounded-lg px-3 py-2">
  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Label</div>
  <div className="text-lg font-semibold tabular-nums leading-tight text-fg-4">42</div>
  <div className="text-[10px] text-muted-foreground mt-0.5">optional hint</div>
</div>
```

Tone the value with `text-green-4` / `text-amber-4` / `text-red-4` when the number itself carries status.

### Stat compact (inside elevation / dense layout)

```tsx
<div className="bg-gray-1 rounded-lg px-2.5 py-1.5">
  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Label</div>
  <div className="text-sm font-semibold tabular-nums text-fg-4">value</div>
  <div className="text-[10px] text-muted-foreground mt-0.5">hint</div>
</div>
```

### Banner (warning / demo / info)

```tsx
<div className="bg-amber-1 border border-amber-3 rounded-xl px-4 py-3 text-sm text-amber-4 mb-4">
  <span className="font-semibold">Demo data</span> — explanation, with
  <code className="font-mono bg-amber-2 px-1 rounded">tokens</code> in mono chips.
</div>
```

### Segmented control / pill toggle

```tsx
<div className="flex items-center gap-1 text-xs bg-muted rounded-full p-0.5">
  <button
    onClick={() => setMode('a')}
    className={`px-3 py-1 rounded-full transition-colors ${
      mode === 'a' ? 'bg-card text-primary font-semibold' : 'text-muted-foreground'
    }`}
  >
    Option A
  </button>
  {/* … */}
</div>
```

### Tab nav (under page header)

See `src/components/tracker/TrackerNav.tsx`. Active tab gets `text-primary border-b-2 border-primary -mb-px`; inactive is `text-muted-foreground hover:text-fg-4`. A "soon" tab is `disabled` with a small `bg-gray-2` chip.

### CTA card (link in a grid)

```tsx
<Link href="/somewhere" className="block mb-6">
  <Card className="bg-{tone}-1 border-{tone}-2 rounded-2xl shadow-1 hover:shadow-2 transition-shadow">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="font-semibold text-{tone}-4">Title</p>
        <p className="text-sm text-muted-foreground mt-0.5">One-liner</p>
      </div>
      <span className="text-{tone}-4 text-lg">→</span>
    </CardContent>
  </Card>
</Link>
```

### Form: number input row

```tsx
<label className="flex items-center justify-between gap-2 text-sm">
  <span className="text-muted-foreground flex-1 truncate">Label</span>
  <input
    type="number"
    value={value}
    step={1}
    onChange={…}
    className="w-20 h-7 px-2 text-right text-sm tabular-nums bg-gray-1 border border-gray-2 rounded focus:outline-none focus:border-primary"
  />
</label>
```

### Form: slider

```tsx
<input
  type="range"
  …
  className="w-full accent-primary"
/>
```

`accent-primary` is the standard way to colour native form controls — use it for sliders, checkboxes, radios.

### Form: toggle switch

```tsx
<button
  type="button"
  onClick={() => onChange(!checked)}
  className={`relative w-9 h-5 rounded-full transition-colors ${
    checked ? 'bg-primary' : 'bg-gray-2'
  }`}
>
  <span
    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
      checked ? 'translate-x-4' : ''
    }`}
  />
</button>
```

---

## 7. Animation

One animation utility, one rhythm.

```tsx
<div className="section-animate" style={{ animationDelay: '0ms' }}>…</div>
<div className="section-animate" style={{ animationDelay: '60ms' }}>…</div>
<div className="section-animate" style={{ animationDelay: '120ms' }}>…</div>
```

- **`section-animate`** is a 200 ms fade-in + small Y translate on entry (defined in `globals.css`).
- Stagger sequential sections by **60 ms**: 0, 60, 120, 180, 240, …
- Don't add bespoke motion. If you need more, extend the existing class.
- For micro-interactions, `transition-colors` and `transition-shadow` are enough. Avoid `transition-all`.

---

## 8. Loading / error / empty states

Keep these three components consistent across pages — copy from `src/app/tracker/tracker-client.tsx`.

```tsx
function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-2xl" />
        ))}
      </div>
      <div className="h-48 bg-muted rounded-2xl" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-1 border border-red-3 rounded-xl px-4 py-4 text-sm text-red-4">
      <p className="font-semibold">Failed to load</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </div>
  );
}
```

Empty states use the same banner shape but with `bg-gray-1` and `text-muted-foreground`.

---

## 9. Data visualisation

### Charts (Recharts / Visx)

- Use the named CSS variables, not hex: pull from `bg-sky-4`, `bg-amber-4`, `bg-green-4`, etc.
- Single-series accents: violet `--purple-4` or sky `--sky-4`.
- Multi-series: pair sky + amber for actual-vs-forecast; sky + amber + purple + green for 3–4 series. Avoid red unless the data is signed/negative.
- Axis labels: `text-xs text-muted-foreground`, no bolding.
- Grid lines: `var(--border)` at 50 % opacity, or none.

### Schematic SVG (Tile Planner pattern)

When drawing physical things in mm:

- Set `viewBox` in real-world mm; never in px.
- `preserveAspectRatio="xMidYMid meet"`.
- Add an `aspect-ratio` style on the `<svg>` so the container reserves the right vertical space before scripts run.
- Wrap the tile / pattern grid in a `<clipPath>` so cut elements don't bleed outside the body.
- Colour palette inside an SVG:
  - Hot zones: `#ff7a3a` stroke, `rgba(255,122,58,0.18)` fill.
  - Cold zones: `#2c78fc` stroke, `rgba(44,120,252,0.18)` fill.
  - Cut / loss: `rgba(255,47,0,0.7)` stroke, `rgba(255,47,0,0.18)` fill.
  - Skimmer / utility: `#ffa600` stroke, `#fff8eb` fill.
  - Fitting / part: `#1f8a3f` stroke, `rgba(51,199,88,0.4)` fill.

These match the tinted-1/strong-4 pattern of the broader colour system.

---

## 10. Naming, files, and conventions

| Item | Convention | Example |
|---|---|---|
| Page route | lowercase, single word | `src/app/tiles/page.tsx` |
| Client component | `*-client.tsx`, kebab | `tiles-client.tsx` |
| Feature components | PascalCase folder | `src/components/tiles/PlanView.tsx` |
| Domain logic | camelCase in `src/lib/` | `tilePlanner.ts` |
| Domain types | PascalCase in `src/types/` | `tiles.ts` exports `TilePlanConfig`, `TileCell` |
| Hooks | `use{Thing}` | `useCapExData` |
| Shadcn primitives | `src/components/ui/` — **don't edit by hand** | regenerate via CLI |

Import alias is `@/*` for `src/*`.

---

## 11. Page skeleton (copy-paste)

A new page starts from this template — replace the badge tone, title, and content.

```tsx
'use client';

import { useState } from 'react';

export function NewThingClient() {
  return (
    <main className="min-h-screen">
      <div className="page-container">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-1 text-purple-4 border border-purple-2 tracking-wide uppercase">
              Section
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">New Thing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            One-line subtitle that says what this is for
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="section-animate" style={{ animationDelay: '0ms' }}>
            <div className="bg-card rounded-2xl border border-gray-2 shadow-1">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-2">
                <div>
                  <p className="text-sm font-semibold">Card title</p>
                  <p className="text-xs text-muted-foreground">Caption</p>
                </div>
              </div>
              <div className="p-4">
                {/* content */}
              </div>
            </div>
          </div>

          <div className="section-animate" style={{ animationDelay: '60ms' }}>
            {/* next section */}
          </div>
        </div>
      </div>
    </main>
  );
}
```

---

## 12. Quick checklist before shipping a page

- [ ] Uses `page-container` (or a justified override) — not raw widths
- [ ] Header has a tonal badge, `text-2xl` title, and muted subtitle
- [ ] Sections are wrapped in `section-animate` with 60 ms staggered delays
- [ ] Cards use `rounded-2xl border border-gray-2 shadow-1`
- [ ] Numbers carry `tabular-nums`
- [ ] No hex colours in components — only Tailwind tokens
- [ ] Loading + error states exist where data is fetched
- [ ] Mobile breakpoint (`sm:`) handled for any grid (`grid-cols-1 sm:grid-cols-2 …`)
- [ ] Accent colour appears at most once or twice — quiet > shouty
- [ ] Server `page.tsx` exports `metadata` with the title pattern `… — Slow Folk`
