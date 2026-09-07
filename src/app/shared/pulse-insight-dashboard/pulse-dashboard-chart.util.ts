import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { ProgramPillarDashboardPillarValueDto } from 'src/app/core/models/AiProgramPillarDashboardResponseDto';
import { GetProgramsSubmitionHistoryResponseDto } from 'src/app/core/models/ProgramHistoryDto';
import { ProgramHistoryDto } from 'src/app/core/models/ProgramHistoryDto';
import { PulseKpiCard } from './pulse-dashboard.models';
import { UserRole } from 'src/app/core/enums/UserRole';
import {
  DashboardInterpretationDto,
  DashboardModeResponseDto,
  DashboardQuestionScoreDto,
} from 'src/app/core/models/ProgramSignalDashboardDto';
import { SignalCardDto } from 'src/app/core/models/SignalCardDto';

export const PULSE_THEME = {
  bg: '#050c20',
  card: '#0b1730',
  cardBorder: 'rgba(92, 140, 200, 0.22)',
  text: '#e8eef8',
  textMuted: '#9aadc4',
  grid: 'rgba(92, 140, 200, 0.14)',
  blue: '#3b9eff',
  green: '#a8e063',
  teal: '#5CB8FF',
  cyan: '#4CAF50',
  deepBlue: '#187dd6',
  navy: '#2665b3',
  forest: '#2E7D32',
  sea: '#105675',
} as const;

export type PulseAreaChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  fill: any;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  markers: any;
  grid: any;
};

export type PulseRadialChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
};

export type PulseLineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  colors: string[];
  dataLabels: ApexDataLabels;
  markers: any;
  grid: any;
  legend: ApexLegend;
  fill?: any;
};

function truncateCategories(data: { pillarName: string }[]): string[] {
  const used = new Set<string>();
  return data.map((item) => {
    if (!item.pillarName) return '';
    const words = item.pillarName.trim().split(/\s+/);
    let label = '';
    for (let i = 1; i <= words.length; i++) {
      const candidate = i < words.length ? words.slice(0, i).join(' ') : words.join(' ');
      if (!used.has(candidate)) {
        label = candidate + (i < words.length ? '…' : '');
        used.add(candidate);
        break;
      }
    }
    if (!label) label = words[0] + '…';
    return label;
  });
}

export function buildPulsePillarAreaChart(
  pillars: ProgramPillarDashboardPillarValueDto[],
  options: {
    showAi: boolean;
    showManual: boolean;
    userRole?: UserRole | string;
    isProgramUser?: boolean;
  }
): Partial<PulseAreaChartOptions> {
  const isProgramUser =
    options.isProgramUser ||
    options.userRole === UserRole.ProgramUser ||
    (typeof options.userRole === 'string' && options.userRole.toLowerCase() === 'programuser');
  const aiLabel = isProgramUser ? 'Score' : 'AI Score';

  const data = [...(pillars ?? [])];
  const categories = truncateCategories(data);
  const series: ApexAxisChartSeries = [];

  if (options.showManual) {
    series.push({
      name: 'Manual Score',
      data: data.map((x) => Number(x.evaluationValue ?? 0)),
    });
  }
  if (options.showAi) {
    series.push({
      name: aiLabel,
      data: data.map((x) => Number(x.aiValue ?? 0)),
    });
  }
  
  const colors = [
    ...(options.showManual ? [PULSE_THEME.blue] : []),
    ...(options.showAi ? [PULSE_THEME.green] : []),
  ];

  return {
    series,
    chart: {
      type: 'area',
      height: 380,
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 900,
        dynamicAnimation: { enabled: true, speed: 350 },
      },
      fontFamily: 'Poppins, system-ui, sans-serif',
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.04,
        stops: [0, 85, 100],
      },
    },
    colors,
    markers: {
      size: 6,
      colors,
      strokeColors: '#0b1730',
      strokeWidth: 2,
      hover: { size: 9, sizeOffset: 3 },
    },
    plotOptions: {},
    xaxis: {
      categories,
      labels: {
        rotateAlways: true,
        rotate: -35,
        maxHeight: 72,
        offsetY: 0,
        style: { fontSize: '11px', fontWeight: 500, colors: PULSE_THEME.textMuted },
      },
      axisBorder: { show: true, color: PULSE_THEME.grid },
      axisTicks: { show: true, color: PULSE_THEME.grid },
      tooltip: { enabled: false },
    },
    yaxis: {
      title: {
        text: 'Score',
        style: { fontSize: '12px', fontWeight: 600, color: PULSE_THEME.textMuted },
      },
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        formatter: (val) => `${Math.round(val)}`,
        style: { fontSize: '12px', colors: [PULSE_THEME.textMuted] },
      },
    },
    grid: {
      borderColor: PULSE_THEME.grid,
      strokeDashArray: 4,
      padding: { top: 8, right: 8, bottom: -8, left: 4 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      fixed: {
        enabled: true,
        position: 'centerRight',
        offsetX: 0,
        offsetY: 0
      },
      followCursor: true,
      custom: ({ dataPointIndex }) => {
        const pillar = data[dataPointIndex];
        if (!pillar) return '';

        const aiVal = Number(pillar.aiValue ?? 0);
        const manualVal = Number(pillar.evaluationValue ?? 0);
        const showAi = options.showAi;
        const showManual = options.showManual;
        const avgScore =
          showAi && showManual
            ? (aiVal + manualVal) / 2
            : showAi
              ? aiVal
              : manualVal;

        // Bright, high-contrast colors for dark tooltip (ignore muted scale colors)
        const aiColor = '#B8F26A';
        const manualColor = '#5CB8FF';
        const accent = showAi ? aiColor : manualColor;

        const statusText =
          avgScore >= 75
            ? 'Excellent Performance'
            : avgScore >= 50
              ? 'Strong Score'
              : avgScore >= 25
                ? 'Steady Growth'
                : 'Early Stage';

        const statusIcon =
          avgScore >= 75 ? '🌟' : avgScore >= 50 ? '📈' : avgScore >= 25 ? '⚡' : '🌱';

        const scoreBar = (label: string, value: number, color: string) => `
          <div style="margin-bottom: 14px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;color:#cbd5e1;">
              <span>${label}</span>
              <span style="color:${color};font-size:13px;font-weight:800;text-shadow:0 0 10px ${color}88;">${value.toFixed(1)}</span>
            </div>
            <div style="width:100%;height:10px;background:rgba(255,255,255,0.12);border-radius:10px;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,0.08);">
              <div style="width:${Math.min(Math.max(value, 0), 100)}%;height:100%;background:linear-gradient(90deg, ${color} 0%, ${color}ee 100%);border-radius:10px;box-shadow:0 0 12px ${color}99;position:relative;">
                <div style="position:absolute;inset:0;background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%);animation:pulseTipShimmer 2s infinite;"></div>
              </div>
            </div>
          </div>`;

        return `
          <div style="padding:18px 20px;min-width:300px;background:linear-gradient(160deg,#12243f 0%,#0d1a30 100%);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(92,140,200,0.35);border-left:4px solid ${accent};font-family:Poppins,system-ui,sans-serif;position:relative;overflow:hidden;color:#f8fafc;">
            <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:${accent};opacity:0.16;border-radius:50%;filter:blur(2px);"></div>
            <div style="position:relative;z-index:1;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:12px;">
                <div>
                  <div style="font-weight:700;font-size:15px;color:#ffffff;margin-bottom:6px;">${pillar.pillarName || 'Pillar'}</div>
                  <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:${accent}28;border:1px solid ${accent}77;border-radius:12px;font-size:11px;font-weight:700;color:${accent};">
                    ${statusIcon} ${statusText}
                  </div>
                </div>
                <div style="font-size:28px;font-weight:800;color:#ffffff;line-height:1;text-shadow:0 0 18px ${accent}aa;">
                  ${avgScore.toFixed(0)}
                </div>
              </div>
              ${showAi ? scoreBar(aiLabel, aiVal, aiColor) : ''}
              ${showManual ? scoreBar('Manual Score', manualVal, manualColor) : ''}
              ${
                showAi && showManual
                  ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px;">
                      <div style="padding:10px 12px;background:rgba(92,184,255,0.12);border-radius:8px;border:1px solid rgba(92,184,255,0.4);">
                        <div style="font-size:11px;color:#cbd5e1;margin-bottom:4px;font-weight:600;">Difference</div>
                        <div style="font-size:15px;font-weight:800;color:${manualColor};">${Math.abs(aiVal - manualVal).toFixed(0)}</div>
                      </div>
                      <div style="padding:10px 12px;background:rgba(184,242,106,0.12);border-radius:8px;border:1px solid rgba(184,242,106,0.4);">
                        <div style="font-size:11px;color:#cbd5e1;margin-bottom:4px;font-weight:600;">Avg Score</div>
                        <div style="font-size:15px;font-weight:800;color:${aiColor};">${avgScore.toFixed(0)}</div>
                      </div>
                    </div>`
                  : ''
              }
            </div>
          </div>
          <style>
            @keyframes pulseTipShimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          </style>`;
      },
    },
    legend: { show: false },
  };
}

export function buildPulseEvaluatorBarChart(
  pillars: { pillarName: string; scoreProgress: number; ansQuestion: number; totalQuestion: number }[]
): Partial<PulseAreaChartOptions> {
  const data = [...(pillars ?? [])].sort((a, b) => a.scoreProgress - b.scoreProgress);
  const categories = truncateCategories(data);
  const height = Math.max(280, data.length * 36);

  return {
    series: [
      {
        name: 'Manual Score',
        data: data.map((d) => Number(d.scoreProgress ?? 0)),
      },
    ],
    chart: {
      type: 'bar',
      height,
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 800 },
      fontFamily: 'Poppins, system-ui, sans-serif',
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: '62%',
        distributed: false,
      },
    },
    colors: [PULSE_THEME.blue],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Number(val).toFixed(val >= 100 ? 0 : 1)}`,
      style: { fontSize: '12px', fontWeight: 700, colors: ['#fff'] },
    },
    stroke: { show: false, width: 0, colors: ['transparent'] },
    xaxis: {
      categories,
      min: 0,
      max: 100,
      labels: {
        style: { fontSize: '11px', colors: [PULSE_THEME.textMuted] },
      },
      axisBorder: { color: PULSE_THEME.grid },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: [PULSE_THEME.textMuted] },
      },
    },
    grid: {
      borderColor: PULSE_THEME.grid,
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val: number) => `${Number(val).toFixed(1)}` },
    },
    legend: { show: false },
    fill: { opacity: 0.95 },
    markers: { size: 0 },
  };
}

export function buildPulseRadialChart(
  history: ProgramHistoryDto | null,
  mode: 'full' | 'simple' | 'aiOnly' = 'full'
): Partial<PulseRadialChartOptions> {
  const total = history?.totalProgram ?? 0;
  const active = history?.activeProgram ?? 0;
  const inprogress = history?.inprocessProgram ?? 0;
  const complete = history?.compeleteProgram ?? 0;
  const finalizeProgram = history?.finalizeProgram ?? 0;
  const unFinalize = history?.unFinalize ?? 0;
  const toPercent = (value: number) => (total > 0 ? (value / total) * 100 : 0);

  let series: number[];
  let labels: string[];
  let colors: string[];

  if (mode === 'aiOnly') {
    series = [
      total > 0 ? 100 : 0,
      toPercent(finalizeProgram),
      toPercent(unFinalize),
      toPercent(complete),
    ];
    labels = ['Total', 'AI Finalized', 'AI Pending Review', 'Completed'];
    colors = [PULSE_THEME.navy, PULSE_THEME.cyan, PULSE_THEME.deepBlue, PULSE_THEME.green];
  } else if (mode === 'simple') {
    series = [total > 0 ? 100 : 0, toPercent(active), toPercent(inprogress), toPercent(complete)];
    labels = ['Total', 'Active', 'In-Progress', 'Completed'];
    colors = [PULSE_THEME.navy, PULSE_THEME.teal, PULSE_THEME.cyan, PULSE_THEME.blue];
  } else {
    series = [
      total > 0 ? 100 : 0,
      toPercent(active),
      toPercent(inprogress),
      toPercent(complete),
      toPercent(finalizeProgram),
      toPercent(unFinalize),
    ];
    labels = [
      'Total',
      'Manual Active',
      'Manual In-Progress',
      'Manual Completed',
      'AI Finalized',
      'AI Pending Review',
    ];
    colors = [
      PULSE_THEME.navy,
      PULSE_THEME.teal,
      PULSE_THEME.cyan,
      PULSE_THEME.sea,
      PULSE_THEME.forest,
      PULSE_THEME.deepBlue,
    ];
  }

  return {
    series,
    chart: {
      height: 340,
      type: 'radialBar',
      background: 'transparent',
      toolbar: { show: false },
      fontFamily: 'Poppins, system-ui, sans-serif',
      parentHeightOffset: 0,
      sparkline: { enabled: false },
    },
    plotOptions: {
      radialBar: {
        startAngle: 20,
        endAngle: 300,
        offsetY: 0,
        offsetX: 0,
        hollow: {
          margin: 0,
          size: '38%',
          background: 'transparent',
        },
        track: {
          background: 'rgba(92, 140, 200, 0.08)',
          strokeWidth: '100%',
          margin: 2,
        },
        dataLabels: {
          show: true,
          name: {
            show: true,
            offsetY: -8,
            color: PULSE_THEME.textMuted,
            fontSize: '12px',
          },
          value: {
            show: true,
            offsetY: 8,
            color: PULSE_THEME.text,
            fontSize: '22px',
            fontWeight: 700,
            formatter: (value: number) => `${((value * total) / 100).toFixed(0)}`,
          },
          total: {
            show: true,
            label: 'Total Program',
            color: PULSE_THEME.textMuted,
            fontSize: '13px',
            formatter: () => `${total}`,
          },
        },
      },
    },
    colors,
    labels,
    legend: {
      show: true,
      floating: false,
      fontSize: '12px',
      position: 'top',
      horizontalAlign: 'left',
      labels: { useSeriesColors: true },
      formatter: (seriesName: string, opts: any) =>
        `${seriesName}: ${((opts.w.globals.series[opts.seriesIndex] * total) / 100).toFixed(0)}`,
      itemMargin: { horizontal: 4, vertical: 2 },
      onItemClick: { toggleDataSeries: false },
    },
  };
}

export function buildPulseProgressLineChart(
  programsHistory: GetProgramsSubmitionHistoryResponseDto[],
  options: {
    showAi: boolean;
    showManual: boolean;
    userRole?: UserRole | string;
    isProgramUser?: boolean;
  }
): Partial<PulseLineChartOptions> {
  const isProgramUser =
    options.isProgramUser ||
    options.userRole === UserRole.ProgramUser ||
    (typeof options.userRole === 'string' && options.userRole.toLowerCase() === 'programuser');
  const aiLabel = isProgramUser ? 'Score' : 'AI Score';

  const categories = programsHistory.map((x) => x.programName);
  const series: ApexAxisChartSeries = [];
  const colors: string[] = [];

  if (options.showManual) {
    series.push({
      name: 'Manual Score',
      data: programsHistory.map((x) => x.scoreProgress ?? 0),
    });
    colors.push(PULSE_THEME.blue);
  }
  if (options.showAi) {
    series.push({
      name: aiLabel,
      data: programsHistory.map((x) => x.aiScore ?? 0),
    });
    colors.push(PULSE_THEME.green);
  }

  return {
    series,
    chart: {
      type: 'area',
      height: 360,
      background: 'transparent',
      zoom: { enabled: false },
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 850 },
      fontFamily: 'Poppins, system-ui, sans-serif',
    },
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.04,
        stops: [0, 90, 100],
      },
    },
    dataLabels: { enabled: false },
    colors,
    markers: {
      size: 5,
      strokeColors: '#0b1730',
      strokeWidth: 2,
      hover: { size: 8 },
    },
    xaxis: {
      categories,
      labels: {
        rotate: -25,
        style: { fontSize: '11px', colors: [PULSE_THEME.textMuted] },
      },
      axisBorder: { color: PULSE_THEME.grid },
    },
    yaxis: {
      min: 0,
      max: 100,
      title: {
        text: 'Progress Score',
        style: { fontSize: '12px', fontWeight: 600, color: PULSE_THEME.textMuted },
      },
      labels: {
        style: { fontSize: '12px', colors: [PULSE_THEME.textMuted] },
      },
    },
    grid: {
      borderColor: PULSE_THEME.grid,
      strokeDashArray: 4,
    },
    tooltip: { theme: 'dark' },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: PULSE_THEME.textMuted },
    },
  };
}

export function computePulseMetrics(
  pillars: { evaluationValue?: number; aiValue?: number; scoreProgress?: number; pillarName?: string }[],
  history: ProgramHistoryDto | null,
  options: { showAi: boolean; showManual: boolean }
): { primary: import('./pulse-dashboard.models').PulseMetricCard[]; secondary: import('./pulse-dashboard.models').PulseMetricCard[] } {
  const vals = (pillars ?? []).map((p) => {
    if (options.showAi && options.showManual) {
      return (Number(p.aiValue ?? 0) + Number(p.evaluationValue ?? p.scoreProgress ?? 0)) / 2;
    }
    if (options.showAi) return Number(p.aiValue ?? 0);
    return Number(p.evaluationValue ?? p.scoreProgress ?? 0);
  });
  const overall = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const aiAvg =
    (pillars ?? []).length > 0
      ? (pillars ?? []).reduce((a, p) => a + Number(p.aiValue ?? 0), 0) / (pillars ?? []).length
      : 0;
  const manualAvg =
    (pillars ?? []).length > 0
      ? (pillars ?? []).reduce((a, p) => a + Number(p.evaluationValue ?? p.scoreProgress ?? 0), 0) /
        (pillars ?? []).length
      : 0;
  const gap = Math.abs(aiAvg - manualAvg);
  const momentum = aiAvg - manualAvg;
  const total = history?.totalProgram ?? 0;
  const complete = history?.compeleteProgram ?? 0;
  const progress = total > 0 ? (complete / total) * 100 : 0;
  const tier = overall >= 70 ? 'HIGH' : overall >= 45 ? 'MID' : 'LOW';
  const tierAccent: 'green' | 'teal' | 'warn' = overall >= 70 ? 'green' : overall >= 45 ? 'teal' : 'warn';

  const primary: import('./pulse-dashboard.models').PulseMetricCard[] = [
    { title: 'Overall Score', value: overall.toFixed(1), icon: 'bi-speedometer2', accent: 'blue' },
    { title: 'Performance Tier', value: tier, icon: 'bi-award', accent: tierAccent, highlight: true },
    {
      title: 'Programs Covered',
      value: `${history?.totalAccessProgram ?? history?.totalProgram ?? 0}`,
      icon: 'bi-trophy',
      accent: 'teal',
    },
    { title: 'Progress to Target', value: `${progress.toFixed(0)}%`, icon: 'bi-bullseye', accent: 'teal' },
  ];

  if (options.showAi && options.showManual) {
    primary.push({ title: 'Benchmark Gap', value: gap.toFixed(1), icon: 'bi-bar-chart', accent: 'blue' });
    primary.push({
      title: 'Momentum',
      value: `${momentum >= 0 ? '+' : ''}${momentum.toFixed(1)}`,
      icon: 'bi-graph-up-arrow',
      accent: momentum >= 0 ? 'green' : 'warn',
      highlight: true,
    });
  } else if (options.showAi) {
    primary.push({ title: 'AI Average', value: aiAvg.toFixed(1), icon: 'bi-cpu', accent: 'green' });
    primary.push({
      title: 'AI Coverage',
      value: `${history?.finalizeProgram ?? 0}`,
      icon: 'bi-check2-circle',
      accent: 'green',
    });
  } else {
    primary.push({ title: 'Manual Average', value: manualAvg.toFixed(1), icon: 'bi-clipboard-data', accent: 'blue' });
    primary.push({
      title: 'Completed',
      value: `${complete}`,
      icon: 'bi-check2-all',
      accent: 'teal',
    });
  }

  const icons = ['bi-pie-chart', 'bi-graph-up', 'bi-shield-check', 'bi-clipboard-check', 'bi-people', 'bi-globe2'];
  const secondary = (pillars ?? []).slice(0, 6).map((p, i) => {
    let value = 0;
    if (options.showAi && options.showManual) {
      value = (Number(p.aiValue ?? 0) + Number(p.evaluationValue ?? p.scoreProgress ?? 0)) / 2;
    } else if (options.showAi) {
      value = Number(p.aiValue ?? 0);
    } else {
      value = Number(p.evaluationValue ?? p.scoreProgress ?? 0);
    }
    return {
      title: p.pillarName || `KPI ${i + 1}`,
      value: value.toFixed(1),
      icon: icons[i % icons.length],
      accent: (i % 2 === 0 ? 'blue' : 'green') as any,
    };
  });

  return { primary, secondary };
}

function kpiIcon(code?: string | null): string {
  const value = (code || '').toLowerCase();
  if (value.includes('pem') || value.includes('program') || value.includes('overall')) return 'bi-speedometer2';
  if (value.includes('sfs') || value.includes('fragility')) return 'bi-activity';
  if (value.includes('gas') || value.includes('grievance')) return 'bi-exclamation-diamond';
  if (value.includes('scs') || value.includes('cohesion')) return 'bi-people';
  if (value.includes('tas') || value.includes('trust')) return 'bi-shield-check';
  if (value.includes('adg') || value.includes('ambition')) return 'bi-bullseye';
  if (value.includes('fcig') || value.includes('finance')) return 'bi-cash-coin';
  if (value.includes('risk') || value.includes('alert')) return 'bi-broadcast';
  return 'bi-graph-up-arrow';
}

function interpretationByScore(
  score: number | null | undefined,
  interpretations: DashboardInterpretationDto[] | undefined,
  signalInterpretations?: { minRange: number; maxRange: number; condition: string; descriptor: string }[]
): { condition: string; description: string } {
  if (score === null || score === undefined) {
    return { condition: 'No Data', description: 'No interpretation available.' };
  }

  if (interpretations?.length) {
    const match = interpretations.find(
      (x) => score >= (x.minRange ?? 0) && score <= (x.maxRange ?? 100)
    );
    if (match) {
      return {
        condition: match.condition || 'Stable',
        description: match.description || 'No interpretation available.',
      };
    }
  }

  if (signalInterpretations?.length) {
    const match = signalInterpretations.find(
      (x) => score >= (x.minRange ?? 0) && score <= (x.maxRange ?? 100)
    );
    if (match) {
      return {
        condition: match.condition || 'Stable',
        description: match.descriptor || 'No interpretation available.',
      };
    }
  }

  const condition = score >= 70 ? 'Stable' : score >= 40 ? 'Watch' : 'Critical';
  return { condition, description: `Score indicates ${condition.toLowerCase()} standing.` };
}

function mapQuestionToKpi(
  q: DashboardQuestionScoreDto,
  interpretations: DashboardInterpretationDto[] | undefined,
  options: { showAi: boolean; showManual: boolean }
): PulseKpiCard {
  const aiScore = options.showAi ? q.aiScore ?? null : null;
  const manualScore = options.showManual ? q.evaluationScore ?? null : null;
  const aiInterp = interpretationByScore(aiScore, interpretations);
  const manualInterp = interpretationByScore(manualScore, interpretations);
  const primaryCondition = options.showAi ? aiInterp.condition : manualInterp.condition;
  const primaryInterpretation = options.showAi ? aiInterp.description : manualInterp.description;

  return {
    id: q.questionID,
    code: `Q${q.questionID}`,
    name: q.questionDescription || `Question ${q.questionID}`,
    description: q.questionDescription || 'No description available.',
    aiScore,
    manualScore,
    condition: primaryCondition,
    aiCondition: aiInterp.condition,
    manualCondition: manualInterp.condition,
    interpretation: primaryInterpretation,
    aiInterpretation: aiInterp.description,
    manualInterpretation: manualInterp.description,
    aiStrategicAction: aiInterp.description,
    manualStrategicAction: manualInterp.description,
    icon: kpiIcon(q.questionDescription),
    isAlert: ['critical', 'elevated', 'fragile', 'watch'].some((x) =>
      primaryCondition.toLowerCase().includes(x)
    ),
  };
}

function lookupSignalInterpretation(
  interpretations: SignalCardDto['interpretations'] | undefined,
  interpretationId?: number | null,
  condition?: string | null
): { condition: string; description: string } {
  if (interpretations?.length && interpretationId) {
    const match = interpretations.find((x) => x.interpretationID === interpretationId);
    if (match) {
      return {
        condition: match.condition || condition || 'Stable',
        description: match.descriptor || 'No interpretation available.',
      };
    }
  }
  if (interpretations?.length && condition) {
    const match = interpretations.find((x) => x.condition === condition);
    if (match) {
      return {
        condition: match.condition || condition,
        description: match.descriptor || 'No interpretation available.',
      };
    }
  }
  return { condition: condition || 'Stable', description: '' };
}

function signalAiScore(signal: SignalCardDto): number | null {
  if (signal.aiValue !== null && signal.aiValue !== undefined) return Number(signal.aiValue);
  if (signal.value !== null && signal.value !== undefined) return Number(signal.value);
  return null;
}

function signalManualScore(signal: SignalCardDto): number | null {
  if (signal.manualValue !== null && signal.manualValue !== undefined) return Number(signal.manualValue);
  return null;
}

/** Resolve AI score from a signal card (supports legacy `value` field). */
export function getSignalAiScore(signal: SignalCardDto | null | undefined): number | null {
  return signal ? signalAiScore(signal) : null;
}

/** Resolve manual score from a signal card. */
export function getSignalManualScore(signal: SignalCardDto | null | undefined): number | null {
  return signal ? signalManualScore(signal) : null;
}

function mapSignalToKpi(
  signal: SignalCardDto,
  interpretations: DashboardInterpretationDto[] | undefined,
  options: { showAi: boolean; showManual: boolean },
  dashboard?: DashboardModeResponseDto | null,
  manualByCode?: Map<string, number>,
  signalIndex = 0
): PulseKpiCard {
  const code = signal.code || signal.layerCode || 'KPI';
  const aiScore = options.showAi ? signalAiScore(signal) : null;
  const manualFromMap = manualByCode?.get(code.toLowerCase()) ?? manualByCode?.get((signal.layerCode || '').toLowerCase());
  let manualScore = options.showManual ? signalManualScore(signal) ?? manualFromMap ?? null : null;

  if (options.showManual && manualScore == null) {
    const raw = signal as SignalCardDto & {
      evaluationScore?: number | null;
      evaluationValue?: number | null;
      manualScore?: number | null;
    };
    const fromSignal = raw.evaluationScore ?? raw.evaluationValue ?? raw.manualScore;
    if (fromSignal !== null && fromSignal !== undefined) {
      manualScore = Number(fromSignal);
    }
  }
  if (options.showManual && manualScore == null && dashboard && signalIndex === 0) {
    manualScore = dashboard.manualProgramScore ?? dashboard.manualValue ?? null;
  }

  const aiInterpFromRange = interpretationByScore(aiScore, interpretations, signal.interpretations);
  const manualInterpFromRange = interpretationByScore(manualScore, interpretations, signal.interpretations);
  const aiInterpFromId = lookupSignalInterpretation(
    signal.interpretations,
    signal.aiInterpretationID ?? signal.interpretationID,
    signal.aiCondition || signal.condition
  );
  const manualInterpFromId = lookupSignalInterpretation(
    signal.interpretations,
    signal.manualInterpretationID,
    signal.manualCondition
  );

  const aiCondition =
    signal.aiCondition || signal.condition || aiInterpFromId.condition || dashboard?.vcpCondition || aiInterpFromRange.condition;
  const manualCondition =
    signal.manualCondition || manualInterpFromId.condition || dashboard?.manualCondition || manualInterpFromRange.condition;

  const aiInterpretation =
    aiInterpFromId.description ||
    signal.descriptor ||
    dashboard?.vcpDescriptor ||
    aiInterpFromRange.description ||
    'No interpretation available.';
  const manualInterpretation =
    manualInterpFromId.description ||
    signal.narrative ||
    signal.descriptor ||
    dashboard?.manualDescriptor ||
    manualInterpFromRange.description ||
    'No interpretation available.';

  const aiStrategicAction = signal.strategicAction || aiInterpretation;
  const manualStrategicAction = signal.strategicAction || manualInterpretation;
  const primaryCondition = options.showAi ? aiCondition : manualCondition;
  const primaryInterpretation = options.showAi ? aiInterpretation : manualInterpretation;

  return {
    id: signal.layerID ?? code,
    code,
    name: signal.name || signal.layerName || code,
    description: signal.description || signal.descriptor || dashboard?.description || 'No description available.',
    aiScore,
    manualScore,
    condition: primaryCondition,
    aiCondition,
    manualCondition,
    interpretation: primaryInterpretation,
    aiInterpretation,
    manualInterpretation,
    narrative: aiStrategicAction || undefined,
    aiStrategicAction: aiStrategicAction || undefined,
    manualStrategicAction: manualStrategicAction || undefined,
    icon: kpiIcon(code),
    isAlert: !!signal.isAlert,
  };
}

/** Build KPI cards from Ambition–Delivery dashboard (signals preferred, questions as fallback). */
export function buildPulseKpiCards(
  dashboard: DashboardModeResponseDto | null,
  options: { showAi: boolean; showManual: boolean }
): PulseKpiCard[] {
  if (!dashboard) return [];
  const interpretations = dashboard.dashboardInterpretations;
  const signals = dashboard.primarySignals?.length
    ? dashboard.primarySignals
    : dashboard.signals ?? [];
  const questions = dashboard.questions ?? [];

  // Build manual score lookup from questions when signals are shown
  const manualByCode = new Map<string, number>();
  questions.forEach((q) => {
    if (q.evaluationScore !== null && q.evaluationScore !== undefined) {
      manualByCode.set(`q${q.questionID}`, Number(q.evaluationScore));
    }
  });

  if (signals.length) {
    return signals.map((s, index) => {
      const card = mapSignalToKpi(s, interpretations, options, dashboard, manualByCode, index);
      if (
        options.showManual &&
        (card.manualScore === null || card.manualScore === undefined) &&
        questions[index]?.evaluationScore != null
      ) {
        card.manualScore = Number(questions[index].evaluationScore);
        const manualInterp = interpretationByScore(card.manualScore, interpretations, s.interpretations);
        card.manualCondition = dashboard?.manualCondition || manualInterp.condition;
        card.manualInterpretation = dashboard?.manualDescriptor || manualInterp.description;
        card.manualStrategicAction = dashboard?.manualDescriptor || manualInterp.description;
      }
      if (options.showAi && (card.aiScore === null || card.aiScore === undefined) && index === 0 && dashboard) {
        card.aiScore = dashboard.aiProgramScore ?? null;
        card.aiCondition = card.aiCondition || dashboard.vcpCondition;
      }
      return card;
    });
  }

  if (questions.length) {
    return questions.map((q) => mapQuestionToKpi(q, interpretations, options));
  }

  return [];
}

