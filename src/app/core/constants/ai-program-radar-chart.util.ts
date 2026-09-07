import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexLegend,
  ApexMarkers,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { VCP_CHART } from './ahi-chart-theme';

export type AiProgramRadarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  markers: ApexMarkers;
  legend: ApexLegend;
  colors: string[];
  fill: ApexFill;
  plotOptions: ApexPlotOptions;
  responsive: ApexResponsive[];
};

export type RadarColorTone = {
  primary: string;
  light: string;
  gradient: string;
};

type BuildArgs = {
  series: { name: string; data: number[] }[];
  categories: string[];
  colorPalette: RadarColorTone[];
  /** Full program series used for tooltip ranking (all categories indices). */
  tooltipSeries: { name: string; data: number[] }[];
  tooltipCategoryLabels?: string[];
};

/** Dark-console radar chart for Cross-Program AI comparison (all roles). */
export function buildAiProgramRadarChartOptions(args: BuildArgs): Partial<AiProgramRadarChartOptions> {
  const { series, categories, colorPalette, tooltipSeries, tooltipCategoryLabels } = args;
  const labelColors = Array(categories?.length || 0).fill(VCP_CHART.textMuted);
  const primaries = colorPalette.map((c) => c.primary);
  const lights = colorPalette.map((c) => c.light);

  return {
    series,
    colors: primaries,
    chart: {
      height: 500,
      type: 'radar',
      background: 'transparent',
      foreColor: VCP_CHART.textMuted,
      fontFamily: 'Poppins, system-ui, sans-serif',
      toolbar: {
        show: true,
        tools: {
          download: true,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: true,
        },
        export: {
          csv: {
            filename: 'cross-program-comparison',
            headerCategory: 'Category',
          },
          svg: { filename: 'cross-program-radar' },
          png: { filename: 'cross-program-radar' },
        },
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 900,
        animateGradually: { enabled: true, delay: 120 },
        dynamicAnimation: { enabled: true, speed: 320 },
      } as any,
      dropShadow: {
        enabled: true,
        blur: 6,
        left: 0,
        top: 0,
        opacity: 0.28,
        color: '#3B9EFF',
      },
    },
    stroke: {
      show: true,
      width: 2.5,
      colors: primaries,
      dashArray: 0,
    },
    fill: {
      opacity: 0.22,
      type: 'solid',
    },
    markers: {
      size: 5,
      strokeWidth: 2,
      strokeColors: VCP_CHART.deep,
      colors: primaries,
      hover: {
        size: 8,
        sizeOffset: 2,
      },
    },
    xaxis: {
      categories,
      labels: {
        show: true,
        style: {
          colors: labelColors,
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'Poppins, system-ui, sans-serif',
        },
        formatter: (value: string) => {
          if (!value) return '';
          return value.length > 16 ? `${value.substring(0, 16)}...` : value;
        },
      },
    },
    yaxis: {
      show: true,
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        show: true,
        style: {
          colors: VCP_CHART.textMuted,
          fontSize: '11px',
          fontWeight: 500,
        },
        formatter: (val: number) => `${val.toFixed(0)}`,
      },
    },
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      floating: false,
      fontSize: '12px',
      fontWeight: 600,
      fontFamily: 'Poppins, system-ui, sans-serif',
      labels: { colors: VCP_CHART.text },
      offsetY: 8,
      markers: {
        width: 12,
        height: 12,
        strokeWidth: 0,
        radius: 3,
        offsetX: -4,
        offsetY: 0,
      } as any,
      itemMargin: { horizontal: 14, vertical: 6 },
      onItemClick: { toggleDataSeries: true },
      onItemHover: { highlightDataSeries: true },
      formatter: (seriesName: string, opts: any) => {
        const seriesIndex = opts.seriesIndex;
        const data = series[seriesIndex]?.data ?? [];
        const avgScore = data.length
          ? data.reduce((a: number, b: number) => a + Number(b || 0), 0) / data.length
          : 0;
        return `${seriesName} <span style="color:#9AADC4;font-weight:400;margin-left:4px;">(Avg: ${avgScore.toFixed(1)})</span>`;
      },
    },
    plotOptions: {
      radar: {
        size: 220,
        offsetX: 0,
        offsetY: 0,
        polygons: {
          strokeColors: 'rgba(92, 140, 200, 0.35)',
          strokeWidth: '1',
          connectorColors: 'rgba(92, 140, 200, 0.28)',
          fill: {
            colors: ['rgba(16, 32, 68, 0.55)', 'rgba(11, 22, 51, 0.35)'],
          },
        },
      },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      theme: 'dark',
      style: {
        fontSize: '12px',
        fontFamily: 'Poppins, system-ui, sans-serif',
      },
      onDatasetHover: { highlightDataSeries: true },
      custom: ({ dataPointIndex }) => {
        const categoryLabels = tooltipCategoryLabels?.length ? tooltipCategoryLabels : categories;
        const categoryName = categoryLabels?.[dataPointIndex] ?? categories?.[dataPointIndex] ?? '';

        let tooltipHtml = `
          <div style="padding:14px 16px;min-width:280px;background:linear-gradient(160deg,#12243f 0%,#0d1a30 100%);border-radius:12px;box-shadow:${VCP_CHART.tooltipShadow};border:1px solid rgba(92,140,200,0.35);font-family:Poppins,sans-serif;color:#f8fafc;">
            <div style="font-weight:700;margin-bottom:12px;color:#ffffff;font-size:13px;border-bottom:1px solid rgba(92,140,200,0.28);padding-bottom:8px;display:flex;align-items:center;gap:8px;">
              <span style="width:8px;height:8px;background:linear-gradient(135deg,#3B9EFF,#A8E063);border-radius:50%;display:inline-block;"></span>
              ${categoryName}
            </div>
        `;

        const cityScores: Array<{ name: string; score: number; color: string; index: number }> = [];
        (tooltipSeries ?? []).forEach((programData, idx) => {
          const score = Number(programData.data?.[dataPointIndex] ?? 0);
          const colors = colorPalette[idx % colorPalette.length];
          cityScores.push({
            name: programData.name,
            score,
            color: colors.primary,
            index: idx,
          });
        });

        cityScores.sort((a, b) => b.score - a.score);

        cityScores.forEach((program, rank) => {
          const rankLabel = rank === 0 ? '1' : rank === 1 ? '2' : rank === 2 ? '3' : `${rank + 1}`;
          const scoreColor =
            program.score >= 80 ? VCP_CHART.secondary : program.score >= 60 ? '#FFB74D' : '#FF8A65';

          tooltipHtml += `
            <div style="margin:8px 0;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid ${program.color};">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;">
                  <span style="font-size:11px;color:#9AADC4;min-width:14px;">${rankLabel}</span>
                  <span style="font-weight:600;color:${program.color};font-size:13px;">${program.name}</span>
                </div>
                <div style="font-weight:700;font-size:16px;color:${scoreColor};min-width:52px;text-align:right;">
                  ${program.score.toFixed(1)}
                </div>
              </div>
              <div style="margin-top:8px;height:6px;background:rgba(92,140,200,0.2);border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${Math.max(0, Math.min(100, program.score))}%;background:linear-gradient(90deg,${program.color},${lights[program.index % lights.length]});border-radius:3px;"></div>
              </div>
            </div>
          `;
        });

        if (cityScores.length) {
          const avgScore = cityScores.reduce((sum, p) => sum + p.score, 0) / cityScores.length;
          const maxScore = cityScores[0].score;
          const minScore = cityScores[cityScores.length - 1].score;
          const spread = maxScore - minScore;

          tooltipHtml += `
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(92,140,200,0.22);display:flex;justify-content:space-around;font-size:11px;color:#9AADC4;">
              <div style="text-align:center;">
                <div style="font-weight:600;">Avg</div>
                <div style="font-weight:700;color:#E8EEF8;margin-top:2px;">${avgScore.toFixed(1)}</div>
              </div>
              <div style="width:1px;background:rgba(92,140,200,0.22);"></div>
              <div style="text-align:center;">
                <div style="font-weight:600;">Range</div>
                <div style="font-weight:700;color:#E8EEF8;margin-top:2px;">${spread.toFixed(1)}</div>
              </div>
              <div style="width:1px;background:rgba(92,140,200,0.22);"></div>
              <div style="text-align:center;">
                <div style="font-weight:600;">Best</div>
                <div style="font-weight:700;color:${VCP_CHART.secondary};margin-top:2px;">${maxScore.toFixed(1)}</div>
              </div>
            </div>
          `;
        }

        tooltipHtml += '</div>';
        return tooltipHtml;
      },
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: { height: 480 },
          plotOptions: { radar: { size: 180 } },
        },
      },
      {
        breakpoint: 768,
        options: {
          chart: { height: 430 },
          plotOptions: { radar: { size: 150 } },
          xaxis: {
            labels: { style: { fontSize: '10px' } },
          },
        },
      },
    ],
  };
}
