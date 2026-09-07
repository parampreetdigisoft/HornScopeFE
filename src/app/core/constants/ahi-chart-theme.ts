/**
 * AMI (Africa Market Intelligence) chart palette —
 * gold / bronze command console (country_index_ami_theme.html).
 */
export const AMI_CHART = {
  primary: '#C9A24A',
  primaryMid: '#E7C878',
  primarySoft: '#8A5A2B',
  secondary: '#C9C7BF',
  accent: '#8B887E',
  deep: '#0A0906',
  text: '#EFE7D6',
  textMuted: '#9C9484',
  grid: '#241F14',
  border: '#332C1D',
  hollow: 'rgba(201, 162, 74, 0.08)',
  tooltipShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',

  /** Radial / multi-segment status charts */
  radialBar: [
    '#E7C878',
    '#C9C7BF',
    '#C9A24A',
    '#8A5A2B',
    '#8B887E',
    '#B5502E',
  ],

  /** Evaluator radial (4 segments) */
  radialBarShort: ['#E7C878', '#C9C7BF', '#C9A24A', '#8A5A2B'],

  /** Line chart: manual / evaluation vs AI */
  lineEvaluation: '#C9C7BF',
  lineAi: '#E7C878',

  /** Area comparison chart strokes */
  areaEvaluator: '#C9C7BF',
  areaAi: '#E7C878',

  /** Early-warning & multi-series trends */
  trendLines: ['#E7C878', '#C9C7BF', '#C9A24A', '#8A5A2B', '#8B887E', '#B7A25A'],

  /** Bar / score scale (low → high) */
  scoreScale: [
    '#B5502E',
    '#C46A3A',
    '#8A5A2B',
    '#A67C3D',
    '#C9A24A',
    '#D4B45E',
    '#E7C878',
    '#B7A25A',
    '#C9C7BF',
    '#EFE7D6',
  ],

  /** Domain bar chart (evaluator) — light to strong */
  pillarBar: [
    '#332C1D',
    '#8A5A2B',
    '#A67C3D',
    '#C9A24A',
    '#D4B45E',
    '#E7C878',
    '#B7A25A',
    '#C9C7BF',
    '#8B887E',
    '#EFE7D6',
  ],

  completionHigh: '#B7A25A',
  completionMid: '#C9A24A',
  completionLow: '#B5502E',
} as const;

export function amiScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return '#8B887E';
  }
  const safe = Math.min(Math.max(Number(score), 0), 100);
  const index = Math.min(
    Math.floor(safe / 10),
    AMI_CHART.scoreScale.length - 1
  );
  return AMI_CHART.scoreScale[index];
}

export function amiCompletionColor(rate: number): string {
  if (rate >= 80) return AMI_CHART.completionHigh;
  if (rate >= 50) return AMI_CHART.completionMid;
  return AMI_CHART.completionLow;
}

/** Shared ApexCharts axis / grid styling */
export const AMI_AXIS_STYLE = {
  grid: {
    borderColor: AMI_CHART.grid,
    strokeDashArray: 4,
  },
  xaxisLabels: {
    style: {
      fontSize: '11px',
      fontWeight: 500,
      colors: AMI_CHART.textMuted,
    },
  },
  yaxisTitle: {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: AMI_CHART.text,
    },
  },
  yaxisLabels: {
    style: {
      fontSize: '12px',
      colors: AMI_CHART.textMuted,
    },
  },
};
