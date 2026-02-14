# Plan: Clean Venue Data — Session Times & Capacity Normalization

## Problem Summary

Two data quality issues in fetched venue data:

1. **Phantom early sessions**: Time slots start at 4:30am but most venues open at 6:00am+. The `inferOperatingHours()` function uses raw `Math.min()` across all session start times — a single outlier (test session, timezone glitch, or placeholder) drags the reported opening time down and pollutes the 4:30–6:30am demand slot.

2. **Capacity variations**: Sessions from the same venue show different capacity values (e.g. 12, 15, 20) due to special events, instructor overrides, or API inconsistencies. This skews `avgCapacityPerSession`, utilisation %, and theoretical max calculations.

---

## Proposed Changes

### 1. Outlier-resistant operating hours (`src/lib/benchmarkMetrics.ts`)

**Current**: `inferOperatingHours()` uses `Math.min(startTimes)` / `Math.max(endTimes)` — any single outlier shifts the range.

**Proposed**: Use **percentile-based bounds** (5th/95th percentile) instead of absolute min/max. This drops the earliest/latest ~5% of sessions as outliers.

- Add a `percentile(arr, p)` helper
- Replace `safeMin`/`safeMax` with `percentile(arr, 0.05)` and `percentile(arr, 0.95)`
- Floor start times and ceil end times to the nearest 0.5h for clean display

### 2. Filter sessions outside inferred operating hours (`src/lib/utils.ts`)

**New rule in `sanitizeSessions()`**: After inferring robust operating hours, drop sessions that start before the 5th-percentile opening time. This prevents phantom 4:30am slots from appearing in demand patterns.

- Add `outsideOperatingHours` counter to `DataQualityReport.dropped`
- Accept an optional `operatingHoursBounds` parameter `{ earliestStart: number; latestEnd: number }` in `sanitizeSessions()`
- When provided, drop sessions outside these bounds

### 3. Normalize capacity with modal value detection (`src/lib/utils.ts`)

**New function `normalizeCapacity(sessions)`**: Detect the **mode** (most common) capacity value per venue. Flag sessions with capacity deviating more than a configurable threshold (e.g. >50% deviation from mode) and either:

- Clamp to the modal capacity (conservative — preserves session count)
- Report the variance in `DataQualityReport`

Add to `DataQualityReport`:
```typescript
clamped: {
  ticketsExceededCapacity: number;
  capacityNormalized: number;  // NEW
}
```

### 4. Dynamic time slots based on inferred hours (`src/lib/metricsCalculator.ts`, `src/components/DemandPatterns.tsx`)

**Current**: 9 hardcoded 2-hour slots starting at 4:30am.

**Proposed**: Generate time slots dynamically from the venue's inferred operating hours. Only create slots that overlap with the venue's actual operating window.

- New function `generateTimeSlots(operatingHours: OperatingHours): TimeSlot[]`
- Keeps the 2-hour bucket width but starts from the venue's earliest operating hour
- Both `metricsCalculator.ts` and `DemandPatterns.tsx` use the generated slots instead of the hardcoded array

### 5. Wire it all together (`src/hooks/useSessions.ts`)

Update the data pipeline:
1. Fetch raw sessions (existing)
2. Date-range filter (existing)
3. Basic sanitization (existing `sanitizeSessions`)
4. Infer operating hours with percentile bounds (new)
5. Filter out-of-hours sessions (new)
6. Normalize capacity (new)
7. Calculate metrics with dynamic time slots (updated)

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/benchmarkMetrics.ts` | Percentile-based `inferOperatingHours()` |
| `src/lib/utils.ts` | Extended `sanitizeSessions()` with operating hours filter; new `normalizeCapacity()`; updated `DataQualityReport` |
| `src/lib/metricsCalculator.ts` | New `generateTimeSlots()`; use dynamic slots in `calculateDemandPatterns()` |
| `src/components/DemandPatterns.tsx` | Use dynamic slots from `generateTimeSlots()` |
| `src/hooks/useSessions.ts` | Wire new cleaning steps into pipeline |
