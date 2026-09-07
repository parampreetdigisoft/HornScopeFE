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
import { VCP_CHART } from './ahi-chart-theme';

export type PillarComparisonBarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  grid: ApexGrid;
  stroke: ApexStroke;
  colors: string[];
};

export type PillarComparisonTooltipPillar = {
  pillarName: string;
  evaluators: Record<
    string,
    {
      score: number;
      ansQuestion: number;
      totalQuestion: number;
    }
  >;
};

type BuildArgs = {
  series: ApexAxisChartSeries;
  categories: string[];
  hasData: boolean;
  uniqueEvaluators: string[];
  tooltipData: PillarComparisonTooltipPillar[];
  colors: string[];
};

function resolveColumnWidth(hasData: boolean, seriesCount: number, pillarCount: number): {
  columnWidthPercent: number;
  barMaxWidth?: number;
} {
  let barMaxWidth: number | undefined = 120;
  let columnWidthPercent = 70;
  const totalBars = pillarCount * (seriesCount || 0);

  if (!hasData) {
    return { columnWidthPercent: 40 };
  }
  if (totalBars === 1) {
    return { columnWidthPercent: 5, barMaxWidth: 50 };
  }
  if (totalBars === 2) {
    return { columnWidthPercent: 10 };
  }
  if (totalBars <= 3) {
    return { columnWidthPercent: 15 };
  }
  if (totalBars <= 4) {
    return { columnWidthPercent: 20, barMaxWidth: 100 };
  }
  if (totalBars <= 6) {
    return { columnWidthPercent: 30 };
  }
  if (totalBars <= 10) {
    return { columnWidthPercent: 45 };
  }
  return { columnWidthPercent: 60, barMaxWidth };
}

/** Dark-console pillar assessment comparison bar chart (admin / analyst). */
export function buildPillarComparisonBarChartOptions(
  args: BuildArgs
): Partial<PillarComparisonBarChartOptions> {
  const { series, categories, hasData, uniqueEvaluators, tooltipData, colors } = args;
  const pillarCount = categories.length;
  const { columnWidthPercent, barMaxWidth } = resolveColumnWidth(
    hasData,
    series.length,
    pillarCount
  );

  const allValues = series.flatMap((s: any) => s.data ?? []).filter((v: any) => v !== null && v !== undefined && !isNaN(Number(v))).map((v: any) => Number(v));
  const dataMin = allValues.length ? Math.min(...allValues) : 0;
  const dataMax = allValues.length ? Math.max(...allValues) : 100;
  const yMin = dataMin < 0 ? Math.floor(dataMin / 10) * 10 : 0;
  const yMax = Math.max(100, Math.ceil(dataMax / 10) * 10);

  return {
    series,
    colors: hasData ? colors : ['#6b7c93'],
    chart: {
      type: 'bar',
      height: 500,
      background: 'transparent',
      foreColor: VCP_CHART.textMuted,
      fontFamily: 'Poppins, sans-serif',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: { enabled: true, delay: 120 },
        dynamicAnimation: { enabled: true, speed: 320 },
      } as any,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: `${columnWidthPercent}%`,
        ...(barMaxWidth ? { barHeight: barMaxWidth } : {}),
        borderRadius: 6,
        borderRadiusApplication: 'end',
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: false,
      formatter: () => '',
      offsetY: -20,
      style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: [VCP_CHART.text],
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      categories,
      labels: {
        style: {
          fontSize: '12px',
          fontWeight: 500,
          colors: VCP_CHART.textMuted,
        },
        rotate: pillarCount > 8 ? -45 : 0,
        rotateAlways: false,
        trim: true,
        maxHeight: 120,
      },
      title: {
        text: 'Pillars',
        style: {
          fontSize: '13px',
          fontWeight: 600,
          color: VCP_CHART.text,
        },
      },
      axisBorder: { show: true, color: VCP_CHART.border },
      axisTicks: { show: true, color: VCP_CHART.border },
    },
    yaxis: {
      title: {
        text: 'Score',
        style: {
          fontSize: '13px',
          fontWeight: 600,
          color: VCP_CHART.text,
        },
      },
      labels: {
        formatter: (val: number) => (val != null && !isNaN(val) ? val.toFixed(0) : ''),
        style: {
          fontSize: '12px',
          colors: [VCP_CHART.textMuted],
        },
      },
      min: yMin,
      max: yMax,
      forceNiceScale: true,
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: 'dark',
      style: { fontSize: '13px', fontFamily: 'Poppins, sans-serif' },
      y: {
        formatter: (val: number, opts: any) => {
          if (!hasData) {
            return 'No data';
          }
          const seriesIndex = opts.seriesIndex;
          const dataPointIndex = opts.dataPointIndex;
          const evaluatorName = uniqueEvaluators[seriesIndex];
          const pillarData = tooltipData[dataPointIndex];
          const evaluatorData = pillarData?.evaluators?.[evaluatorName];

          if (evaluatorData) {
            return `${Number(val).toFixed(1)} (${evaluatorData.ansQuestion}/${evaluatorData.totalQuestion} questions)`;
          }
          return `${Number(val).toFixed(1)}`;
        },
      },
    },
    legend: {
      show: hasData,
      position: 'top',
      horizontalAlign: 'center',
      offsetY: 0,
      fontSize: '12px',
      fontWeight: 500,
      labels: { colors: VCP_CHART.text },
      markers: { width: 12, height: 12, radius: 3 } as any,
      itemMargin: { horizontal: 12, vertical: 8 },
    },
    grid: {
      borderColor: VCP_CHART.grid,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 8, right: 16, bottom: 0, left: 8 },
    },
  };
}
