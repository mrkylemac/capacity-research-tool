# Sauna Materials Calculator — Handoff Context

## Project
Slow Folk Brunswick · 219 Albion St Brunswick VIC  
A parametric sauna Bill of Materials calculator built into an existing Next.js analytics workbook repo.

**Repo path:** `/Users/mrkylemac/Documents/Sites/Slow Folk/workbook/sauna-session-stats/`  
**Route:** `/sauna-materials`  
**Stack:** Next.js 15 App Router · TypeScript · Tailwind 4 · shadcn/ui (Radix) · Zod · Vitest  
**Tests:** 44 tests passing — `yarn test src/test/saunaMaterials`

---

## What exists

### Domain layer (pure TypeScript, no React)
All in `src/lib/saunaMaterials/`:

| File | Purpose |
|---|---|
| `conversions.ts` | `mm()`, `m2FromMm()`, `faceAreaToLM()`, constants |
| `geometry.ts` | Wall + ceiling net areas with all subtractions |
| `benches.ts` | Bench surface areas, framing LM |
| `battens.ts` | Batten LM (wall + ceiling, cross-batten) |
| `envelope.ts` | Insulation, vapour barrier, foil tape, fixings |
| `bom.ts` | `generateBom()` — composes all calcs into BOM line items |
| `csv.ts` | `bomToCsv()`, `downloadCsv()` |
| `validation.ts` | Zod schemas for all types + `collectWarnings()` |
| `diagramLayout.ts` | `ItemTransform {x, y, width, depth, rotation}` — wall-anchored or free 2D |
| `store.tsx` | React Context + useReducer + localStorage; `SLOW_FOLK_DEMO` hardcoded project |
| `seedLibrary.ts` | 108 timber profiles + 9 materials; `DEFAULT_PROFILE_SELECTIONS` (SDS quote) |

### Types
`src/types/saunaMaterials.ts` — `Room`, `Bench`, `Opening`, `HeaterZone`, `Column`, `Profile`, `MaterialItem`, `BOM`, `BOMLineItem`, etc.  
All positioned items have optional `startOffset`, `x`, `y`, `rotation` fields.

### Route
- `src/app/sauna-materials/page.tsx` — server shell
- `src/app/sauna-materials/sauna-materials-client.tsx` — client root, header hardcoded to "Slow Folk Brunswick · 219 Albion St"

### Components (`src/components/sauna-materials/`)

| Component | Purpose |
|---|---|
| `SaunaMaterialsNav` | Tabs: Room · Openings · Benches · Profiles · BOM |
| `ProjectSetupForm` | Room dimensions only (length / width / ceiling height mm) |
| `RoomDiagram` | Read-only static top-down SVG plan view |
| `OpeningsEditor` | Card per opening — type, wall, shape, width, height, offset from start |
| `HeaterColumnsEditor` | Heater + columns editors with offset from start |
| `BenchesEditor` | **Read-only** table of fixed Slow Folk bench config (no editing) |
| `BenchConstructionDiagram` | Side elevation SVG per wall (non-interactive) |
| `ProfilesPanel` | 4 sections (Cladding · Bench timber · Insulation & vapour · Fixings), dropdowns grouped by supplier with inline spec |
| `ConstructionToggles` | Behind-bench clad toggle, cross-battening, 6 numeric fields, 4 waste sliders |
| `BomSummaryCards` | Timber lm / Insulation m² / Vapour barrier m² / Cost |
| `BomTable` | Collapsible category rows, 7 columns |
| `ExportButton` | CSV download |
| `LibraryManagerSheet` | Right Sheet, full CRUD for profiles and materials |
| `WarningsPanel` | Amber warning list (wall area clamped, low bench, missing profiles) |

### Tests (`src/test/saunaMaterials/`)
`geometry.test.ts` · `benches.test.ts` · `battens.test.ts` · `envelope.test.ts` · `bom-slowfolk.test.ts` · `csv.test.ts` · `slowfolk-fixture.ts`

---

## Hardcoded Slow Folk configuration

### Room
```
length: 5518mm · width: 3830mm · ceilingHeight: 2400mm
```

### Benches (fixed — BenchesEditor is now read-only)
```
1. Climb step  · north wall · 3771×300mm  · topHeight  300mm
2. Foot bench  · north wall · 3771×600mm  · topHeight  750mm  · end cap right
3. Upper bench · north wall · 3771×600mm  · topHeight 1200mm  · backrest 250mm · end cap right
4. Accessible  · east wall  · 5266×600mm  · topHeight  450mm  · end cap left
```

### Openings
```
- Door   · west  · rectangle · 920×2375mm
- Window · south · circle    · Ø1500mm
```

### Heater zone
```
south wall · 1500mm wide · 2400mm height · tile finish
```

### Column
```
south wall · 290×290mm · 2400mm height · tile · extends to ceiling
```

### Construction defaults
```
behindBenchClad: true
crossBattening: false
battenSpacing: 600mm
insulationDepth: 90mm
ceilingInsulationDepth: 140mm
vapourBarrierType: foilPaper
fixingsDensityCladding: 20/m²
fixingsDensityBench: 8/m²
waste: cladding 12% · benchSlat 8% · framing 10% · batten 10%
```

---

## Profile library

**108 timber profiles** across 5 supplier sets:
1. **Modinex** — thermo aspen, abachi, pine framing, batten, backrest
2. **SDS Australia** — Western Red Cedar (V-joint, panelling, DAR bench board, shiplap, castellated, charred look)
3. **SDS Australia** — European Alder heat-treated + Euro framing (from quote Q-003752)
4. **SDS Australia** — Vapour barrier, foil tape (Ametalin), fixings
5. **Kosny** — Western Red Cedar, Hinoki, Sugi (from April 2026 price list)

**9 materials**: Rockwool RWA45 75mm + 100mm, foil paper + pure foil barrier, foil tape 50mm, SS cladding nail, SS bench screw, SDS foil reflector, SDS Ametalin tape.

### Default profile selections (SDS Quote Q-003752)
```
wallCladding:      sds-alder-ht-90x15-tg        ($26.84/lm)
ceilingCladding:   sds-alder-ht-90x15-tg
benchSlat:         sds-alder-ht-90x21-slat       ($38.17/lm)
benchFraming:      sds-euro-framing-90x35         ($33.00/lm)
batten:            sds-euro-framing-70x19-batten  ($24.29/lm)
backrest:          sds-alder-ht-65x21-fascia      ($21.89/lm)
vapourBarrier:     sds-foil-reflector             ($154/roll)
tape:              sds-ametalin-tape-48            ($33/roll)
insulation:        rockwool-rwa45-75              (null price)
ceilingInsulation: rockwool-rwa45-100             (null price)
claddingScrews:    ss-cladding-nail               (null price)
benchScrews:       ss-bench-screw                 (null price)
```

Note: `THERMO_ASPEN_REFERENCE_SELECTIONS` in `seedLibrary.ts` is a separate constant used **only** by the test fixture to keep snapshot values stable across default changes.

---

## BOM output (Slow Folk, SDS defaults)
```
Timber total:   ~1,204 lm
Wall cladding:  36.55 m² face → 487 lm @ $26.84/lm = ~$13,079
Ceiling:        21.05 m² face → 281 lm @ $26.84/lm = ~$7,534
Bench slat:     ~17.5 m² face → 210 lm @ $38.17/lm
Insulation:     ~62 m² (walls + ceiling)
Vapour barrier: ~68.2 m² incl. 10% overlap → 3 rolls
Cost total:     null (Rockwool + screws have null prices → shows "—")
```
To enable cost total, open Library → Materials and add prices to Rockwool RWA45 items.

---

## Known issues / notes
- **Estimated total cost is null**: Rockwool and SS screws don't have prices set. Open Library → Materials and add $/unit to enable the cost card.
- **Radix hydration warning**: `aria-controls` ID mismatch on LibraryManagerSheet between SSR and client. Cosmetic only.
- **localStorage persistence**: Auto-saves to `slowfolk:sauna-materials:project` and `slowfolk:sauna-materials:library`. Clearing storage resets to demo with SDS defaults.
- **BenchesEditor is read-only**: The Benches tab now shows a fixed read-only table. The bench data still lives in `project.benches` (SLOW_FOLK_DEMO) and drives all BOM calculations — it's just not editable from the UI.

---

## Styling conventions
```
bg-card · bg-gray-1 · border-gray-2 · shadow-1
text-fg-3 · text-fg-4 · text-muted-foreground
rounded-2xl · section-animate
page-container · data-table
Colors: purple-1/2/3/4 · amber-1..4 · green-4 · red-4 · sky-4
Font: "Open Runde" (woff2, 400/500/600/700)
```

## Important constants
```typescript
// conversions.ts
OPEN_FASCIA_FILL_RATIO = 0.6    // slat gap discount
VAPOUR_BARRIER_OVERLAP = 1.10   // 10% overlap
BENCH_LEG_SPACING_MM   = 1500
BENCH_BEARER_SPACING_MM = 800

// geometry.ts
// North + south walls run the room LENGTH
// East + west walls run the room WIDTH
```

---

## Possible next steps
- Add prices to Rockwool RWA45 items in the library to unlock the cost total
- PDF export (print-friendly BOM with Slow Folk branding)
- Named project saves (multiple quote variants, e.g. WRC cedar vs Alder vs Hinoki)
- Second-tier pricing: add a markup % to the BOM for contractor quotes
