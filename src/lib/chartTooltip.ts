import type { CSSProperties } from 'react';

/**
 * Shared tooltip styling for Recharts and other chart tooltips.
 * Dark theme: charcoal background, rounded corners, light text, header/label in muted grey.
 */
export const chartTooltipContentStyle: CSSProperties = {
  background: 'black',
  borderRadius: '4px',
  padding: '8px 8px 3px 8px',
  fontSize: 14,
  lineHeight: 1.1,
  color: '#OAOAOA',
};

/** Label/header row (e.g. date "Mar 3") — slightly larger, muted grey */
export const chartTooltipLabelStyle: CSSProperties = {
  color: 'white',
  fontSize: 14,
};
