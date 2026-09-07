/**
 * VCP (Horn Scope) chart palette — logo green + console navy/blue.
 * Use hex values (ApexCharts does not resolve CSS variables reliably).
 */
export const VCP_CHART = {
  primary: '#3B9EFF',
  primaryMid: '#1D5D96',
  primarySoft: '#5CB8FF',
  secondary: '#A8E063',
  accent: '#4CAF50',
  discrepancy: '#FFB84D',
  deep: '#0A2240',
  text: '#E8EEF8',
  textMuted: '#9AADC4',
  grid: 'rgba(92, 140, 200, 0.18)',
  border: 'rgba(92, 140, 200, 0.28)',
  hollow: 'rgba(59, 158, 255, 0.08)',
  tooltipShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',

  /** Radial / multi-segment status charts */
  radialBar: [
    '#3B9EFF',
    '#5CB8FF',
    '#4CAF50',
    '#1D5D96',
    '#A8E063',
    '#2E7D32',
  ],

  /** Evaluator radial (4 segments) */
  radialBarShort: ['#3B9EFF', '#5CB8FF', '#A8E063', '#4CAF50'],

  /** Line chart: manual / evaluation vs AI */
  lineEvaluation: '#3B9EFF',
  lineAi: '#A8E063',

  /** Area comparison chart strokes */
  areaEvaluator: '#5CB8FF',
  areaAi: '#A8E063',

  /** Early-warning & multi-series trends */
  trendLines: ['#3B9EFF', '#A8E063', '#4CAF50', '#5CB8FF', '#1D5D96', '#c5e878'],

  /** Bar / score scale (low → high) */
  scoreScale: [
    '#6b7c93',
    '#5C9CC0',
    '#3B9EFF',
    '#2E7D32',
    '#4CAF50',
    '#77B44D',
    '#A8E063',
    '#B8F26A',
    '#1D5D96',
    '#4675af',
  ],

  /** Pillar bar chart (evaluator) — light to strong */
  pillarBar: [
    '#6b7c93',
    '#5C9CC0',
    '#3B9EFF',
    '#2E7D32',
    '#4CAF50',
    '#77B44D',
    '#A8E063',
    '#B8F26A',
    '#1D5D96',
    '#396397',
  ],

  completionHigh: '#4CAF50',
  completionMid: '#A8E063',
  completionLow: '#ff8a65',
} as const;

export function ahiScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return '#6b7c93';
  }
  const safe = Math.min(Math.max(Number(score), 0), 100);
  const index = Math.min(
    Math.floor(safe / 10),
    VCP_CHART.scoreScale.length - 1
  );
  return VCP_CHART.scoreScale[index];
}

export function ahiCompletionColor(rate: number): string {
  if (rate >= 80) return VCP_CHART.completionHigh;
  if (rate >= 50) return VCP_CHART.completionMid;
  return VCP_CHART.completionLow;
}

/** Shared ApexCharts axis / grid styling */
export const VCP_AXIS_STYLE = {
  grid: {
    borderColor: VCP_CHART.grid,
    strokeDashArray: 4,
  },
  xaxisLabels: {
    style: {
      fontSize: '11px',
      fontWeight: 500,
      colors: VCP_CHART.textMuted,
    },
  },
  yaxisTitle: {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: VCP_CHART.text,
    },
  },
  yaxisLabels: {
    style: {
      fontSize: '12px',
      colors: VCP_CHART.textMuted,
    },
  },
};
