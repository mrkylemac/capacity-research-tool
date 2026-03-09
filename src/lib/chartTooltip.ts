import type { CSSProperties } from 'react';

/**
 * Shared tooltip styling for Recharts and other chart tooltips.
 * Light theme: white background, rounded corners, subtle shadow.
 */
export const chartTooltipContentStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e4ea',
  borderRadius: '10px',
  padding: '8px 10px 5px 10px',
  fontSize: 14,
  lineHeight: 1.3,
  color: '#111827',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

/** Label/header row (e.g. date "Mar 3") — semi-bold, dark text */
export const chartTooltipLabelStyle: CSSProperties = {
  color: '#111827',
  fontSize: 14,
  fontWeight: 600,
};

/** Value row items — dark text */
export const chartTooltipItemStyle: CSSProperties = {
  color: '#111827',
};
