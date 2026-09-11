import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { SignalCardDto } from 'src/app/core/models/CountrySignalDashboardDto';
import { HS_CHART, HS_AXIS_STYLE } from './hs-chart-theme';

export type GlanceBarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  grid: ApexGrid;
  colors: string[];
};

export type GlanceDonutChartOptions = {
  series: number[];
  chart: ApexChart;
  labels: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  colors: string[];
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
};

const POSITIVE_BAR = '#C5A05A';
const NEGATIVE_BAR = '#B5502E';
const NEUTRAL_BAR = '#7A8A9A';

function hasScore(score: number | null | undefined): boolean {
  return score !== null && score !== undefined && !Number.isNaN(Number(score));
}

function truncateLabel(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function signalLabel(signal: SignalCardDto): string {
  return truncateLabel(signal.layerCode || signal.code || signal.layerName || signal.name || 'KPI', 18);
}

function signalAiScore(signal: SignalCardDto): number | null {
  return hasScore(signal.aiValue) ? Number(signal.aiValue) : null;
}

function glanceCondition(signal: SignalCardDto): string {
  return (
    signal.aiCondition ||
    signal.aiInterpretationValue ||
    (hasScore(signal.aiValue) ? 'Scored' : 'No Data')
  );
}

export function glanceConditionColor(condition: string): string {
  const value = (condition || '').toLowerCase();
  if (!value || value.includes('no data') || value.includes('stale') || value.includes('scored')) {
    return value.includes('scored') ? HS_CHART.primarySoft : NEUTRAL_BAR;
  }
  if (
    value.includes('critical') ||
    value.includes('collapse') ||
    value.includes('fragile') ||
    value.includes('extreme') ||
    value.includes('predatory') ||
    value.includes('arbitrary') ||
    value.includes('non-operable') ||
    value.includes('high drag')
  ) {
    return '#B5502E';
  }
  if (
    value.includes('weak') ||
    value.includes('elevated') ||
    value.includes('incoherent') ||
    value.includes('vulnerable') ||
    value.includes('punitive')
  ) {
    return '#C46A3A';
  }
  if (
    value.includes('strained') ||
    value.includes('watch') ||
    value.includes('developing') ||
    value.includes('mixed') ||
    value.includes('constrained') ||
    value.includes('moderate')
  ) {
    return '#C5A05A';
  }
  if (value.includes('functional') || value.includes('stable') || value.includes('secure') || value.includes('operable')) {
    return '#D4B86A';
  }
  if (
    value.includes('strong') ||
    value.includes('coherent') ||
    value.includes('resilient') ||
    value.includes('high ') ||
    value.includes('enabling')
  ) {
    return '#B8C5D0';
  }
  return HS_CHART.primarySoft;
}

function valueAxisRange(values: number[]): { min: number; max: number } {
  if (!values.length) return { min: 0, max: 100 };
  const dataMin = Math.min(...values, 0);
  const dataMax = Math.max(...values, 0);
  const padMin = Math.floor(dataMin / 10) * 10;
  const padMax = Math.ceil(dataMax / 10) * 10;
  if (padMin === 0 && padMax === 0) return { min: -10, max: 10 };
  return {
    min: padMin,
    max: padMax === padMin ? padMax + 10 : padMax,
  };
}

export function buildGlanceBarChartOptions(signals: SignalCardDto[]): Partial<GlanceBarChartOptions> | null {
  if (!signals.length) return null;

  const categories = signals.map(signalLabel);
  const scores = signals.map((signal) => signalAiScore(signal) ?? 0);
  const colors = signals.map((signal) => {
    const score = signalAiScore(signal);
    if (score === null) return NEUTRAL_BAR;
    if (score < 0) return NEGATIVE_BAR;
    if (score === 0) return NEUTRAL_BAR;
    return POSITIVE_BAR;
  });
  const { min, max } = valueAxisRange(scores.filter((_, i) => signalAiScore(signals[i]) !== null));

  return {
    series: [{ name: 'AI Score', data: scores }],
    chart: {
      type: 'bar',
      height: Math.max(320, signals.length * 26),
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
      background: 'transparent',
      animations: { enabled: true, speed: 800 },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: '62%',
        distributed: true,
        dataLabels: { position: 'top' },
      },
    },
    colors,
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts: any) => {
        const signal = signals[opts.dataPointIndex];
        return signalAiScore(signal) === null ? 'N/A' : Number(val).toFixed(1);
      },
      offsetX: 8,
      style: { fontSize: '11px', fontWeight: 700, colors: [HS_CHART.text] },
    },
    xaxis: {
      categories,
      min,
      max,
      labels: {
        style: HS_AXIS_STYLE.xaxisLabels.style,
        formatter: (v: string) => v,
      },
      axisBorder: { color: HS_CHART.border },
      axisTicks: { color: HS_CHART.border },
    },
    yaxis: {
      labels: {
        style: { ...HS_AXIS_STYLE.yaxisLabels.style, fontSize: '12px', fontWeight: 600 },
      },
    },
    grid: {
      borderColor: HS_CHART.grid,
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const signal = signals[dataPointIndex];
        if (!signal) return '';
        const ai = signalAiScore(signal);
        const manual = hasScore(signal.manualValue) ? Number(signal.manualValue) : null;
        const name = signal.layerName || signal.name || signalLabel(signal);
        const condition = glanceCondition(signal);
        return `
          <div style="padding:12px 14px;min-width:220px;background:#0C2238;border:1px solid ${HS_CHART.border};border-radius:10px;color:${HS_CHART.text};font-family:Inter,sans-serif;">
            <div style="font-weight:700;margin-bottom:8px;color:${HS_CHART.primaryMid};">${name}</div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px;">
              <span style="color:${HS_CHART.textMuted};">AI</span>
              <span style="font-weight:700;">${ai === null ? 'N/A' : ai.toFixed(1)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px;">
              <span style="color:${HS_CHART.textMuted};">Manual</span>
              <span style="font-weight:700;">${manual === null ? 'N/A' : manual.toFixed(1)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;padding-top:6px;border-top:1px solid ${HS_CHART.border};">
              <span style="color:${HS_CHART.textMuted};">Status</span>
              <span style="font-weight:700;color:${glanceConditionColor(condition)};">${condition}</span>
            </div>
          </div>
        `;
      },
    },
    stroke: { width: 0 },
  };
}

export function buildGlanceDonutChartOptions(signals: SignalCardDto[]): Partial<GlanceDonutChartOptions> | null {
  if (!signals.length) return null;

  const conditionMap = new Map<string, number>();
  signals.forEach((signal) => {
    const key = glanceCondition(signal);
    conditionMap.set(key, (conditionMap.get(key) ?? 0) + 1);
  });

  const labels = Array.from(conditionMap.keys());
  const series = Array.from(conditionMap.values());
  const colors = labels.map((label, index) => {
    const mapped = glanceConditionColor(label);
    if (mapped !== HS_CHART.primarySoft) return mapped;
    return HS_CHART.radialBar[index % HS_CHART.radialBar.length];
  });

  return {
    series,
    labels,
    chart: {
      type: 'donut',
      height: Math.max(320, Math.min(500, 280 + labels.length * 18)),
      fontFamily: 'Inter, sans-serif',
      background: 'transparent',
    },
    colors,
    legend: {
      position: 'bottom',
      fontSize: '12px',
      fontWeight: 600,
      labels: { colors: HS_CHART.textMuted },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
      style: { fontSize: '11px', fontWeight: 700 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '62%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Indicators',
              fontSize: '13px',
              fontWeight: 600,
              color: HS_CHART.textMuted,
              formatter: () => `${signals.length}`,
            },
          },
        },
      },
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val: number) => `${val} indicator(s)` },
    },
  };
}
