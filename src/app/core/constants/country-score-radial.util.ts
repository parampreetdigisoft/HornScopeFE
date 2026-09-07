import {
  ApexChart,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStates,
  ApexTooltip,
} from 'ng-apexcharts';
import { AMI_CHART } from './ahi-chart-theme';

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
    colors: [...AMI_CHART.radialBarShort],
    chart: {
      height: 380,
      type: 'radialBar',
      background: 'transparent',
      foreColor: AMI_CHART.text,
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
          background: AMI_CHART.hollow,
          image: undefined,
          position: 'front',
        },
        track: {
          background: AMI_CHART.grid,
        },
        dataLabels: {
          show: true,
          name: {
            show: true,
            offsetY: -10,
            color: AMI_CHART.textMuted,
          },
          value: {
            show: true,
            offsetY: 10,
            color: AMI_CHART.text,
            formatter: (value: number) => {
              const parsed = Number(value);
              return Number.isNaN(parsed) ? '0.00' : parsed.toFixed(2);
            },
          },
          total: {
            show: true,
            label: 'Avg Score',
            color: AMI_CHART.primaryMid,
            formatter: () => avg.toFixed(2),
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
        `${seriesName}:  ${Number(opts?.w?.globals?.series?.[opts?.seriesIndex] ?? 0).toFixed(2)}`,
      itemMargin: {
        horizontal: 3,
      },
    },
  };
}
