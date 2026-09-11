import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexPlotOptions,
  ApexStates,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { HS_CHART, HS_AXIS_STYLE, amiScoreColor } from './hs-chart-theme';
import { computeKpiChartYRange } from './kpi-comparison-chart.util';

export type AiKpiPillarTooltipPillar = {
  pillarName: string;
  isAccess?: boolean;
  aiProgress?: number | null;
  evaluatorScore?: number | null;
  discrepancy?: number | null;
};

export type AiKpiGroupedBarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  fill: ApexFill;
  states: ApexStates;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
};

export type AiKpiAreaChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  tooltip: ApexTooltip;
  legend: ApexLegend;
  fill: ApexFill;
  states: ApexStates;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  markers: ApexMarkers;
};

const TOOLTIP_SHELL = `
  padding: 14px 16px;
  min-width: 240px;
  max-width: 360px;
  background: linear-gradient(160deg, #123049 0%, #0C2238 100%);
  border-radius: 12px;
  box-shadow: ${HS_CHART.tooltipShadow};
  border: 1px solid ${HS_CHART.border};
  font-family: Inter, system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: ${HS_CHART.text};
`;

export const HS_KPI_BAR_COLORS = [
  HS_CHART.primary,
  HS_CHART.secondary,
  HS_CHART.primarySoft,
] as const;

export const HS_KPI_BAR_GRADIENT_TO = [
  HS_CHART.primaryMid,
  '#E8EEF4',
  '#C5A05A',
] as const;

/** Short unique axis labels (full name stays in the tooltip). */
export function buildAiKpiCategoryLabels(data: { pillarName?: string }[]): string[] {
  const used = new Set<string>();
  return data.map((item) => {
    if (!item.pillarName) return '';
    const words = item.pillarName.trim().split(/\s+/);
    let label = '';
    for (let i = 1; i <= words.length; i++) {
      const candidate = i < words.length ? words.slice(0, i).join(' ') : words.join(' ');
      if (!used.has(candidate)) {
        label = candidate + (i < words.length ? '...' : '');
        used.add(candidate);
        break;
      }
    }
    if (!label) label = `${words[0]}...`;
    return label;
  });
}

export function buildAiKpiPillarTooltipHtml(pillar: AiKpiPillarTooltipPillar): string {
  const name = pillar.pillarName || 'Domain';
  if (pillar.isAccess === false) {
    return `
      <div style="${TOOLTIP_SHELL}">
        <div style="font-weight:700;font-size:14px;color:${HS_CHART.primaryMid};margin-bottom:8px;line-height:1.35;">
          ${escapeHtml(name)}
        </div>
        <div style="color:${HS_CHART.textMuted};font-size:12px;line-height:1.5;">
          Upgrade your plan to unlock real insights
        </div>
      </div>
    `;
  }

  const discrepancy = pillar.discrepancy ?? 0;
  const discrepancyColor = discrepancy >= 0 ? HS_CHART.primaryMid : HS_CHART.completionLow;

  return `
    <div style="${TOOLTIP_SHELL}">
      <div style="
        font-weight:700;
        font-size:14px;
        color:${HS_CHART.primaryMid};
        margin-bottom:10px;
        padding-bottom:8px;
        border-bottom:1px solid ${HS_CHART.border};
        line-height:1.4;
        white-space:normal;
      ">
        ${escapeHtml(name)}
      </div>
      <div style="display:grid;row-gap:7px;">
        ${metricRow('AI Score', pillar.aiProgress, HS_CHART.primary)}
        ${metricRow('Evaluator', pillar.evaluatorScore, HS_CHART.secondary)}
        <div style="
          display:flex;
          justify-content:space-between;
          gap:16px;
          padding-top:6px;
          margin-top:2px;
          border-top:1px dashed ${HS_CHART.border};
        ">
          <span style="color:${HS_CHART.textMuted};">Discrepancy</span>
          <span style="font-weight:700;color:${discrepancyColor};">
            ${formatScore(discrepancy)}
          </span>
        </div>
      </div>
    </div>
  `;
}

export function buildAiKpiProgressTooltipHtml(
  pillar: AiKpiPillarTooltipPillar,
  progressColor: string = HS_CHART.primary
): string {
  if (pillar.isAccess === false) {
    return buildAiKpiPillarTooltipHtml(pillar);
  }

  const progressPercent = pillar.aiProgress ?? 0;
  const statusText =
    progressPercent >= 75
      ? 'Excellent Performance'
      : progressPercent >= 50
        ? 'Strong Score'
        : progressPercent >= 25
          ? 'Steady Growth'
          : 'Early Stage';

  return `
    <div style="${TOOLTIP_SHELL}">
      <div style="font-weight:700;font-size:14px;color:${HS_CHART.primaryMid};margin-bottom:8px;line-height:1.4;">
        ${escapeHtml(pillar.pillarName || 'Domain')}
      </div>
      <div style="
        display:inline-flex;
        padding:3px 10px;
        border-radius:999px;
        font-size:11px;
        font-weight:600;
        color:${progressColor};
        background:rgba(197,160,90,0.12);
        border:1px solid rgba(197,160,90,0.28);
        margin-bottom:12px;
      ">${statusText}</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="color:${HS_CHART.textMuted};">Score</span>
        <span style="font-weight:700;color:${progressColor};">${formatScore(progressPercent)}</span>
      </div>
      <div style="width:100%;height:8px;background:#16324A;border-radius:8px;overflow:hidden;">
        <div style="width:${Math.min(Math.max(progressPercent, 0), 100)}%;height:100%;background:${progressColor};border-radius:8px;"></div>
      </div>
    </div>
  `;
}

export function buildAiKpiXaxis(categories: string[]): ApexXAxis {
  return {
    categories,
    labels: {
      rotate: -45,
      rotateAlways: false,
      style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: HS_CHART.text,
        cssClass: 'ami-kpi-xaxis-label',
      },
    },
    axisBorder: { color: HS_CHART.border },
    axisTicks: { color: HS_CHART.border },
    tooltip: { enabled: false },
  };
}

export function buildAiKpiGroupedBarChartOptions(args: {
  pillars: AiKpiPillarTooltipPillar[];
  aiSeries: number[];
  evaluatorSeries: number[];
  discrepancySeries: number[];
  evaluatorSeriesName?: string;
}): AiKpiGroupedBarChartOptions {
  const {
    pillars,
    aiSeries,
    evaluatorSeries,
    discrepancySeries,
    evaluatorSeriesName = 'Evaluator Score',
  } = args;

  const series = [
    { name: 'AI Score', data: aiSeries },
    { name: evaluatorSeriesName, data: evaluatorSeries },
    { name: 'Discrepancy', data: discrepancySeries },
  ];
  const { min: yMin, max: yMax } = computeKpiChartYRange(series);

  return {
    series,
    colors: [...HS_KPI_BAR_COLORS],
    chart: {
      type: 'bar',
      height: 420,
      background: 'transparent',
      foreColor: HS_CHART.text,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '58%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
        distributed: false,
      },
    },
    dataLabels: { enabled: false },
    xaxis: buildAiKpiXaxis(buildAiKpiCategoryLabels(pillars)),
    yaxis: {
      title: {
        text: 'Score',
        style: { ...HS_AXIS_STYLE.yaxisTitle.style },
      },
      min: yMin,
      max: yMax,
      forceNiceScale: true,
      tickAmount: 5,
      labels: {
        ...HS_AXIS_STYLE.yaxisLabels,
        formatter: (val: number) =>
          val !== null && val !== undefined && !Number.isNaN(val) ? `${Math.round(val)}` : '',
      },
    },
    grid: {
      ...HS_AXIS_STYLE.grid,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.18,
        gradientToColors: [...HS_KPI_BAR_GRADIENT_TO],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.82,
        stops: [0, 100],
      },
    },
    stroke: { show: false, width: 0 },
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: 'dark',
      cssClass: 'ami-kpi-custom-tooltip',
      custom: ({ dataPointIndex }: { dataPointIndex: number }) =>
        buildAiKpiPillarTooltipHtml(pillars[dataPointIndex] ?? { pillarName: '', isAccess: true }),
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      offsetY: 8,
      fontSize: '12px',
      labels: { colors: HS_CHART.text },
      markers: { strokeWidth: 0 },
    },
  };
}

/** Single-series area chart used by country-user Domain Analysis (AI score only). */
export function buildAiKpiAreaChartOptions(args: {
  pillars: AiKpiPillarTooltipPillar[];
  series: number[];
}): AiKpiAreaChartOptions {
  const { pillars, series } = args;

  return {
    series: [{ name: 'Progress', data: series }],
    colors: [HS_CHART.primary],
    chart: {
      type: 'area',
      height: 420,
      background: 'transparent',
      foreColor: HS_CHART.text,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts: { dataPointIndex: number }) => {
        const pillar = pillars[opts.dataPointIndex];
        if (pillar?.isAccess === false) return '';
        return `${Math.round(val)}`;
      },
      offsetY: -10,
      style: {
        fontSize: '11px',
        fontWeight: 700,
        colors: [HS_CHART.primaryMid],
      },
      background: {
        enabled: true,
        foreColor: HS_CHART.deep,
        padding: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: HS_CHART.primary,
        opacity: 0.95,
      },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: [HS_CHART.primary],
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.35,
        gradientToColors: [HS_CHART.deep],
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0.06,
        stops: [0, 100],
      },
    },
    markers: {
      size: pillars.map((p) => (p.isAccess === false ? 4 : 6)),
      colors: pillars.map((p) =>
        p.isAccess === false ? HS_CHART.accent : amiScoreColor(p.aiProgress)
      ),
      strokeColors: HS_CHART.deep,
      strokeWidth: 2,
      hover: { size: 8, sizeOffset: 3 },
    },
    xaxis: buildAiKpiXaxis(buildAiKpiCategoryLabels(pillars)),
    yaxis: {
      title: {
        text: 'Score',
        style: { ...HS_AXIS_STYLE.yaxisTitle.style },
      },
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        ...HS_AXIS_STYLE.yaxisLabels,
        formatter: (val: number) =>
          val !== null && val !== undefined && !Number.isNaN(val)
            ? `${Math.round(val)}`
            : '',
      },
    },
    grid: {
      ...HS_AXIS_STYLE.grid,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      cssClass: 'ami-kpi-custom-tooltip',
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const pillar = pillars[dataPointIndex] ?? { pillarName: '', isAccess: true };
        return buildAiKpiProgressTooltipHtml(pillar, amiScoreColor(pillar.aiProgress));
      },
    },
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } },
    },
    legend: { show: false },
  };
}

function metricRow(label: string, value: number | null | undefined, color: string): string {
  return `
    <div style="display:flex;justify-content:space-between;gap:16px;">
      <span style="color:${HS_CHART.textMuted};">${label}</span>
      <span style="font-weight:700;color:${color};">${formatScore(value)}</span>
    </div>
  `;
}

function formatScore(value: number | null | undefined): string {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '0.00';
  return numeric.toFixed(1);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
