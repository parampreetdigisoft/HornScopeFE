import {
  ApexChart,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStates,
  ApexTooltip,
} from 'ng-apexcharts';
import { HS_CHART } from './hs-chart-theme';

export type CountryScoreRadialOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  states: ApexStates;
  tooltip: ApexTooltip;
};

function roundScore(value: number): number {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

export function buildCountryScoreRadialOptions(scores: {
  ai: number;
  evaluator: number;
  discrepancy: number;
  avg: number;
}): CountryScoreRadialOptions {
  const ai = roundScore(scores.ai);
  const evaluator = roundScore(scores.evaluator);
  const discrepancy = roundScore(scores.discrepancy);
  const avg = roundScore(scores.avg);

  return {
    series: [ai, evaluator, discrepancy, avg],
    colors: [...HS_CHART.radialBarShort],
    chart: {
      height: 380,
      type: 'radialBar',
      background: 'transparent',
      foreColor: HS_CHART.text,
      toolbar: { show: false },
      selection: { enabled: false },
      events: {
        click: (event: Event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
        },
        dataPointSelection: (event: Event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
        },
      },
    },
    states: {
      active: { filter: { type: 'none' } },
      hover: { filter: { type: 'lighten', value: 0.08 } },
    },
    tooltip: {
      enabled: true,
    },
    plotOptions: {
      radialBar: {
        startAngle: 20,
        endAngle: 300,
        offsetY: 80,
        offsetX: 20,
        hollow: {
          margin: 0,
          size: '40%',
          background: HS_CHART.hollow,
          image: undefined,
          position: 'front',
        },
        track: {
          background: HS_CHART.grid,
        },
        dataLabels: {
          show: true,
          name: {
            show: true,
            offsetY: -10,
            color: HS_CHART.textMuted,
          },
          value: {
            show: true,
            offsetY: 10,
            color: HS_CHART.text,
            formatter: (value: number) => {
              const parsed = Number(value);
              return Number.isNaN(parsed) ? '0.0' : parsed.toFixed(1);
            },
          },
          total: {
            show: true,
            label: 'Avg Score',
            color: HS_CHART.primaryMid,
            formatter: () => avg.toFixed(1),
          },
        },
      },
    },
    labels: ['AI Score', 'Evaluator Score', 'Discrepancy', 'Avg Score'],
    legend: {
      show: true,
      floating: true,
      fontSize: '13px',
      fontWeight: 600,
      position: 'left',
      offsetX: 10,
      offsetY: -10,
      labels: {
        useSeriesColors: true,
      },
      onItemClick: {
        toggleDataSeries: false,
      },
      onItemHover: {
        highlightDataSeries: true,
      },
      formatter: (seriesName: string, opts: any) =>
        `${seriesName}:  ${Number(opts?.w?.globals?.series?.[opts?.seriesIndex] ?? 0).toFixed(1)}`,
      itemMargin: {
        horizontal: 3,
      },
    },
  };
}
