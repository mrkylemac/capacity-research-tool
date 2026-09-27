import type { CSSProperties } from 'react';

/**
 * Shared tooltip styling for Recharts and other chart tooltips.
 * Brand chart chrome: card surface, hairline border, no shadow. The values
 * come from the chart tokens in src/styles/globals.css.
 */
export const chartTooltipContentStyle: CSSProperties = {
  background: 'var(--chart-tooltip-background)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 10px 5px 10px',
  fontSize: 14,
  lineHeight: 1.3,
  color: 'var(--chart-tooltip-foreground)',
  boxShadow: 'none',
};

/** Label row (the date, for example): Medium weight, strongest ink */
export const chartTooltipLabelStyle: CSSProperties = {
  color: 'var(--chart-tooltip-foreground)',
  fontSize: 14,
  fontWeight: 500,
};

/** Value rows: strongest ink; the series swatch beside them carries identity */
export const chartTooltipItemStyle: CSSProperties = {
  color: 'var(--chart-tooltip-foreground)',
};
