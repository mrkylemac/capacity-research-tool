"use client";

import { localPoint } from "@visx/event";
import type { scaleLinear, scaleTime } from "@visx/scale";
import { useCallback, useRef, useState } from "react";
import type { Margin, LineConfig, TooltipData } from "./chart-context";

type ScaleLinear = ReturnType<typeof scaleLinear<number>>;
type ScaleTime = ReturnType<typeof scaleTime<number>>;

export interface ChartSelection {
  active: boolean;
  startDate: Date;
  endDate: Date;
  startX: number;
  endX: number;
}

interface UseChartInteractionProps {
  xScale: ScaleTime;
  yScale: ScaleLinear;
  data: Record<string, unknown>[];
  lines: LineConfig[];
  margin: Margin;
  xAccessor: (d: Record<string, unknown>) => Date;
  bisectDate: (
    array: Record<string, unknown>[],
    date: Date,
    lo?: number,
    hi?: number
  ) => number;
  canInteract: boolean;
}

export function useChartInteraction({
  xScale,
  yScale,
  data,
  lines,
  margin,
  xAccessor,
  bisectDate,
  canInteract,
}: UseChartInteractionProps) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [selection, setSelection] = useState<ChartSelection | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; date: Date } | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const getTooltipData = useCallback(
    (event: React.MouseEvent<SVGGElement>): TooltipData | null => {
      const point = localPoint(event);
      if (!point || data.length === 0) return null;

      const x = point.x - margin.left;
      const date = (xScale as { invert: (x: number) => Date }).invert(x);
      const index = bisectDate(data, date, 1);
      const d0 = data[index - 1];
      const d1 = data[index];

      let nearest = d0;
      if (d1) {
        const d0Time = xAccessor(d0).getTime();
        const d1Time = xAccessor(d1).getTime();
        const target = date.getTime();
        nearest = target - d0Time < d1Time - target ? d0 : d1;
      }

      if (!nearest) return null;

      const nearestIndex = data.indexOf(nearest);
      const nearestX =
        (xScale as { (d: Date): number })(xAccessor(nearest)) ?? 0;

      const yPositions: Record<string, number> = {};
      for (const line of lines) {
        const val = nearest[line.dataKey];
        if (typeof val === "number") {
          yPositions[line.dataKey] = (yScale as { (d: number): number })(val) ?? 0;
        }
      }

      return {
        point: nearest,
        index: nearestIndex,
        x: nearestX,
        yPositions,
      };
    },
    [data, xScale, yScale, lines, margin, xAccessor, bisectDate]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (!canInteract) return;

      const td = getTooltipData(event);
      setTooltipData(td);

      if (isDragging.current && dragStart.current && td) {
        const point = localPoint(event);
        if (!point) return;
        const x = point.x - margin.left;
        const date = (xScale as { invert: (x: number) => Date }).invert(x);
        const startDate = dragStart.current.date;
        const startX = dragStart.current.x;

        setSelection({
          active: true,
          startDate: startDate < date ? startDate : date,
          endDate: startDate < date ? date : startDate,
          startX: startX < x ? startX : x,
          endX: startX < x ? x : startX,
        });
      }
    },
    [canInteract, getTooltipData, xScale, margin]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null);
    if (isDragging.current) {
      isDragging.current = false;
      dragStart.current = null;
    }
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (!canInteract) return;
      const point = localPoint(event);
      if (!point) return;
      const x = point.x - margin.left;
      const date = (xScale as { invert: (x: number) => Date }).invert(x);
      isDragging.current = true;
      dragStart.current = { x, date };
      setSelection(null);
    },
    [canInteract, xScale, margin]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    dragStart.current = null;
  }, []);

  const interactionHandlers = canInteract
    ? {
        onMouseMove: handleMouseMove,
        onMouseLeave: handleMouseLeave,
        onMouseDown: handleMouseDown,
        onMouseUp: handleMouseUp,
      }
    : {};

  const interactionStyle: React.CSSProperties = canInteract
    ? { cursor: "crosshair" }
    : {};

  return {
    tooltipData,
    setTooltipData,
    selection,
    clearSelection,
    interactionHandlers,
    interactionStyle,
  };
}
