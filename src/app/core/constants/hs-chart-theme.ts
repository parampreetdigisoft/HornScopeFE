/**
 * Hornscope chart palette — navy / gold / slate
 * (aligned with brand logo and hornscope-theme.css)
 */
export const HS_CHART = {
  primary: '#C5A05A',
  primaryMid: '#D4B86A',
  primarySoft: '#8B6B32',
  secondary: '#7A94A8',
  accent: '#7A8A9A',
  deep: '#061525',
  text: '#E8EEF4',
  textMuted: '#8FA3B5',
  grid: '#16324A',
  border: '#1E3D5C',
  hollow: 'rgba(197, 160, 90, 0.08)',
  tooltipShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',

  /** Radial / multi-segment status charts */
  radialBar: [
    '#D4B86A',
    '#B8C5D0',
    '#C5A05A',
    '#8B6B32',
    '#7A8A9A',
    '#B5502E',
  ],

  /** Evaluator radial (4 segments) */
  radialBarShort: ['#D4B86A', '#B8C5D0', '#C5A05A', '#8B6B32'],

  /** Line chart: manual / evaluation vs AI */
  lineEvaluation: '#B8C5D0',
  lineAi: '#D4B86A',

  /** Area comparison chart strokes */
  areaEvaluator: '#B8C5D0',
  areaAi: '#D4B86A',

  /** Early-warning & multi-series trends */
  trendLines: ['#D4B86A', '#B8C5D0', '#C5A05A', '#8B6B32', '#7A8A9A', '#5A9B8A'],

  /** Bar / score scale (low → high) */
  scoreScale: [
    '#B5502E',
    '#C46A3A',
    '#8B6B32',
    '#A67C3D',
    '#C5A05A',
    '#C9A85A',
    '#D4B86A',
    '#5A9B8A',
    '#B8C5D0',
    '#E8EEF4',
  ],

  /** Domain bar chart (evaluator) — light to strong */
  pillarBar: [
    '#1E3D5C',
    '#8B6B32',
    '#A67C3D',
    '#C5A05A',
    '#C9A85A',
    '#D4B86A',
    '#5A9B8A',
    '#B8C5D0',
    '#7A8A9A',
    '#E8EEF4',
  ],

  completionHigh: '#5A9B8A',
  completionMid: '#C5A05A',
  completionLow: '#B5502E',
} as const;

export function amiScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return '#7A8A9A';
  }
  const safe = Math.min(Math.max(Number(score), 0), 100);
  const index = Math.min(
    Math.floor(safe / 10),
    HS_CHART.scoreScale.length - 1
  );
  return HS_CHART.scoreScale[index];
}

export function amiCompletionColor(rate: number): string {
  if (rate >= 80) return HS_CHART.completionHigh;
  if (rate >= 50) return HS_CHART.completionMid;
  return HS_CHART.completionLow;
}

/** Shared ApexCharts axis / grid styling */
export const HS_AXIS_STYLE = {
  grid: {
    borderColor: HS_CHART.grid,
    strokeDashArray: 4,
  },
  xaxisLabels: {
    style: {
      fontSize: '11px',
      fontWeight: 500,
      colors: HS_CHART.textMuted,
    },
  },
  yaxisTitle: {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: HS_CHART.text,
    },
  },
  yaxisLabels: {
    style: {
      fontSize: '12px',
      colors: HS_CHART.textMuted,
    },
  },
};
