import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { ChartSeriesDto } from 'src/app/core/models/CompareProgramResponseDto';
import { VCP_CHART } from './ahi-chart-theme';

export type KpiComparisonChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  markers: ApexMarkers;
  legend: ApexLegend;
  grid: ApexGrid;
  colors: string[];
};

type BuildArgs = {
  programSeries: ChartSeriesDto[];
  categories: string[] | undefined;
  kpiMap: Map<string, string>;
  colorPalette: string[];
  isAiViewEnabled: boolean;
};

function lightenHex(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  if (Number.isNaN(num)) return color;
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

/** Dark-console KPI comparison line chart (admin / analyst / client). */
export function buildKpiComparisonChartOptions(args: BuildArgs): Partial<KpiComparisonChartOptions> {
  const { programSeries, categories, kpiMap, colorPalette, isAiViewEnabled } = args;

  const series: any[] = [];
  const strokeDashArray: number[] = [];
  const colors: string[] = [];

  programSeries.forEach((programData, index) => {
    if (index === programSeries.length - 1 && isAiViewEnabled) {
      return;
    }

    const baseColor = colorPalette[index % colorPalette.length];

    series.push({
      name: `${programData.name} (Evaluation)`,
      data: programData.data,
      color: baseColor,
      type: 'line',
    });
    colors.push(baseColor);
    strokeDashArray.push(0);

    if (isAiViewEnabled && programData.aiData) {
      const aiColor = index % 2 === 0 ? VCP_CHART.secondary : lightenHex(baseColor, 28);
      series.push({
        name: `${programData.name} (AI)`,
        data: programData.aiData,
        color: aiColor,
        type: 'line',
      });
      colors.push(aiColor);
      strokeDashArray.push(7);
    }
  });

  const allValues = series.flatMap((s: any) => s.data ?? []).filter((v: any) => v !== null && v !== undefined && !isNaN(Number(v))).map((v: any) => Number(v));
  const dataMin = allValues.length ? Math.min(...allValues) : 0;
  const dataMax = allValues.length ? Math.max(...allValues) : 100;
  const yMin = dataMin < 0 ? Math.floor(dataMin / 10) * 10 : 0;
  const yMax = Math.max(100, Math.ceil(dataMax / 10) * 10);

  return {
    series,
    colors,
    chart: {
      height: 440,
      type: 'line',
      background: 'transparent',
      foreColor: VCP_CHART.textMuted,
      fontFamily: 'Poppins, sans-serif',
      zoom: { enabled: false, type: 'x' },
      toolbar: {
        show: true,
        tools: {
          download: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
      } as any,
      dropShadow: {
        enabled: true,
        top: 0,
        left: 0,
        blur: 4,
        opacity: 0.25,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3,
      dashArray: strokeDashArray,
    },
    markers: {
      size: 5,
      strokeWidth: 2,
      strokeColors: VCP_CHART.deep,
      hover: {
        size: 7,
        sizeOffset: 3,
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontWeight: 500,
      labels: { colors: VCP_CHART.text },
      markers: {
        width: 16,
        height: 3,
        radius: 0,
      } as any,
      itemMargin: {
        horizontal: 14,
        vertical: 6,
      },
      onItemClick: { toggleDataSeries: true },
      onItemHover: { highlightDataSeries: true },
    },
    grid: {
      borderColor: VCP_CHART.grid,
      strokeDashArray: 4,
      row: {
        colors: ['rgba(59, 158, 255, 0.04)', 'transparent'],
        opacity: 1,
      },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 8, right: 12, bottom: 0, left: 8 },
    },
    xaxis: {
      type: 'category',
      categories,
      labels: {
        rotate: -20,
        rotateAlways: true,
        style: {
          fontSize: '11px',
          fontWeight: 500,
          colors: VCP_CHART.textMuted,
        },
        trim: false,
      },
      tooltip: { enabled: false },
      axisBorder: { show: true, color: VCP_CHART.border },
      axisTicks: { show: true, color: VCP_CHART.border },
    },
    yaxis: {
      min: yMin,
      max: yMax,
      forceNiceScale: true,
      decimalsInFloat: 0,
      labels: {
        show: true,
        formatter: (val: number) => (val != null && !isNaN(val) ? Math.round(val).toString() : ''),
        style: {
          fontSize: '12px',
          fontWeight: 500,
          colors: [VCP_CHART.textMuted],
        },
      },
      title: {
        text: 'Score',
        style: {
          fontSize: '13px',
          fontWeight: 600,
          color: VCP_CHART.text,
        },
      },
      axisBorder: { show: true, color: VCP_CHART.border },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: 'dark',
      custom: ({ dataPointIndex }) => {
        const layerCode = categories?.[dataPointIndex] ?? '';
        const layerName = kpiMap.get(layerCode) ?? '';

        let tooltipHtml = `
          <div style="padding:14px 16px;min-width:260px;background:linear-gradient(160deg,#12243f 0%,#0d1a30 100%);border-radius:12px;box-shadow:${VCP_CHART.tooltipShadow};border:1px solid rgba(92,140,200,0.35);font-family:Poppins,sans-serif;color:#f8fafc;">
            <div style="font-weight:700;margin-bottom:10px;color:#ffffff;font-size:13px;border-bottom:1px solid rgba(92,140,200,0.28);padding-bottom:8px;">
              ${layerCode}${layerName ? ' — ' + layerName : ''}
            </div>
        `;

        programSeries.forEach((program, idx) => {
          if (idx === programSeries.length - 1 && isAiViewEnabled) {
            return;
          }

          const evalValue = Number(program.data?.[dataPointIndex] ?? 0);
          const aiValue = program.aiData?.[dataPointIndex];
          const color = colorPalette[idx % colorPalette.length];
          const difference = aiValue != null ? evalValue - Number(aiValue) : 0;

          tooltipHtml += `
            <div style="margin:8px 0;padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid ${color};">
              <div style="font-weight:600;color:${color};margin-bottom:6px;font-size:12px;">
                ${program.name}
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
                <span style="color:#9AADC4;">Evaluation</span>
                <span style="font-weight:700;color:#E8EEF8;">${evalValue.toFixed(2)}</span>
              </div>
          `;

          if (isAiViewEnabled && aiValue != null) {
            tooltipHtml += `
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
                <span style="color:#9AADC4;">AI</span>
                <span style="font-weight:700;color:${VCP_CHART.secondary};">${Number(aiValue).toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid rgba(92,140,200,0.22);">
                <span style="color:#9AADC4;">Difference</span>
                <span style="font-weight:700;color:${Math.abs(difference) > 10 ? '#ff8a65' : VCP_CHART.secondary};">
                  ${difference > 0 ? '+' : ''}${difference.toFixed(2)}
                </span>
              </div>
            `;
          }

          tooltipHtml += `</div>`;
        });

        tooltipHtml += '</div>';
        return tooltipHtml;
      },
    },
  };
}
