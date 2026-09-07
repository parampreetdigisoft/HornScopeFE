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
import { ChartSeriesDto } from 'src/app/core/models/CompareCountryResponseDto';
import { HS_CHART } from './hs-chart-theme';

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
  countrySeries: ChartSeriesDto[];
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

/** Y-axis that can drop below 0 when KPI scores are negative. */
export function computeKpiChartYRange(series: Array<{ data?: any[] }>): { min: number; max: number } {
  const allValues = series
    .flatMap((s) => s.data ?? [])
    .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)))
    .map((v) => Number(v));
  const dataMin = allValues.length ? Math.min(...allValues) : 0;
  const dataMax = allValues.length ? Math.max(...allValues) : 100;
  return {
    min: dataMin < 0 ? Math.floor(dataMin / 10) * 10 : 0,
    max: Math.max(100, Math.ceil(dataMax / 10) * 10),
  };
}

/** Dark-console KPI comparison line chart (admin / analyst). */
export function buildKpiComparisonChartOptions(args: BuildArgs): Partial<KpiComparisonChartOptions> {
  const { countrySeries, categories, kpiMap, colorPalette, isAiViewEnabled } = args;

  const series: any[] = [];
  const strokeDashArray: number[] = [];
  const colors: string[] = [];

  countrySeries.forEach((countryData, index) => {
    if (index === countrySeries.length - 1 && isAiViewEnabled) {
      return;
    }

    const baseColor = colorPalette[index % colorPalette.length];

    series.push({
      name: `${countryData.name} (Evaluation)`,
      data: countryData.data,
      color: baseColor,
      type: 'line',
    });
    colors.push(baseColor);
    strokeDashArray.push(0);

    if (isAiViewEnabled && countryData.aiData) {
      const aiColor = lightenHex(baseColor, 20);
      series.push({
        name: `${countryData.name} (AI)`,
        data: countryData.aiData,
        color: aiColor,
        type: 'line',
      });
      colors.push(aiColor);
      strokeDashArray.push(8);
    }
  });

  const { min: yMin, max: yMax } = computeKpiChartYRange(series);

  return {
    series,
    colors,
    chart: {
      height: 440,
      type: 'line',
      background: 'transparent',
      foreColor: HS_CHART.textMuted,
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
      strokeColors: HS_CHART.deep,
      hover: {
        size: 7,
        sizeOffset: 3,
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '13px',
      fontWeight: 500,
      labels: { colors: HS_CHART.text },
      markers: {
        width: 20,
        height: 3,
        radius: 0,
      } as any,
      itemMargin: {
        horizontal: 15,
        vertical: 5,
      },
      onItemClick: { toggleDataSeries: true },
      onItemHover: { highlightDataSeries: true },
    },
    grid: {
      borderColor: HS_CHART.grid,
      strokeDashArray: 3,
      row: {
        colors: ['rgba(197,160,90,0.06)', 'transparent'],
        opacity: 0.5,
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
          colors: HS_CHART.textMuted,
        },
        trim: false,
      },
      tooltip: { enabled: false },
      axisBorder: { show: true, color: HS_CHART.border },
      axisTicks: { show: true, color: HS_CHART.border },
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
          colors: [HS_CHART.textMuted],
        },
      },
      title: {
        text: 'Score',
        style: {
          fontSize: '13px',
          fontWeight: 600,
          color: HS_CHART.text,
        },
      },
      axisBorder: { show: true, color: HS_CHART.border },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: 'dark',
      custom: ({ dataPointIndex }) => {
        const layerCode = categories?.[dataPointIndex] ?? '';
        const layerName = kpiMap.get(layerCode) ?? '';

        let tooltipHtml = `
          <div style="padding:14px 16px;min-width:260px;background:linear-gradient(160deg,#123049 0%,#0C2238 100%);border-radius:12px;box-shadow:${HS_CHART.tooltipShadow};border:1px solid #1E3D5C;font-family:Poppins,sans-serif;color:#E8EEF4;">
            <div style="font-weight:700;margin-bottom:10px;color:#E8EEF4;font-size:13px;border-bottom:1px solid #1E3D5C;padding-bottom:8px;">
              ${layerCode}${layerName ? ' — ' + layerName : ''}
            </div>
        `;

        countrySeries.forEach((country, idx) => {
          if (idx === countrySeries.length - 1 && isAiViewEnabled) {
            return;
          }

          const evalValue = Number(country.data?.[dataPointIndex] ?? 0);
          const aiValue = country.aiData?.[dataPointIndex];
          const color = colorPalette[idx % colorPalette.length];
          const difference = aiValue != null ? evalValue - Number(aiValue) : 0;

          tooltipHtml += `
            <div style="margin:8px 0;padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid ${color};">
              <div style="font-weight:600;color:${color};margin-bottom:6px;font-size:12px;">
                ${country.name}
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
                <span style="color:#8FA3B5;">Evaluation</span>
                <span style="font-weight:700;color:#E8EEF4;">${evalValue.toFixed(2)}</span>
              </div>
          `;

          if (isAiViewEnabled && aiValue != null) {
            tooltipHtml += `
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
                <span style="color:#8FA3B5;">AI</span>
                <span style="font-weight:700;color:${HS_CHART.primaryMid};">${Number(aiValue).toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid #1E3D5C;">
                <span style="color:#8FA3B5;">Difference</span>
                <span style="font-weight:700;color:${Math.abs(difference) > 10 ? '#E08A6A' : HS_CHART.primaryMid};">
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
