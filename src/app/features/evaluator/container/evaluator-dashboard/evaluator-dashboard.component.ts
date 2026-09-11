import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import {
  CountryHistoryDto,
  GetCountryQuestionHistoryResponseDto,
  UserCountryRequestDto,
} from 'src/app/core/models/countryHistoryDto';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { EvaluatorService } from '../../evaluator.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { CommonService } from 'src/app/core/services/common.service';
import { HS_CHART, amiCompletionColor, amiScoreColor } from 'src/app/core/constants/hs-chart-theme';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
};

export type PillarChartOptions = {
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
  stroke: any;
  markers: any;
  grid: any;
};

@Component({
  selector: 'app-evaluator-dashboard',
  templateUrl: './evaluator-dashboard.component.html',
  styleUrl: './evaluator-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class EvaluatorDashboardComponent implements OnInit {
  selectedYear = new Date().getFullYear();
  countries: CountryVM[] | null = [];
  selectedCountries: number | '' | null = '';
  countryHistory: CountryHistoryDto | null = null;
  countryQuestionHistoryResponse: GetCountryQuestionHistoryResponseDto | null = null;
  isLoader = false;

  chartOptions: Partial<ChartOptions> | null = null;
  chartPillarOptions: Partial<PillarChartOptions> | null = null;

  constructor(
    private evaluatorService: EvaluatorService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.isLoader = true;
    this.getAllCountriesByUserId();
    this.getCountryHistory();
  }

  yearChanged(): void {
    this.getCountryHistory();
    this.getCountryQuestionHistory();
  }

  getAllCountriesByUserId(): void {
    this.evaluatorService.getAllCountriesByUserId(this.userService?.userInfo?.userID).subscribe({
      next: (res) => {
        this.countries = res.result;
        if (this.countries?.length) {
          this.selectedCountries = this.countries[0].countryID;
          this.getCountryQuestionHistory();
        } else {
          this.isLoader = false;
        }
      },
      error: () => {
        this.isLoader = false;
      },
    });
  }

  onCountrySelected(): void {
    this.getCountryQuestionHistory();
  }

  getCountryHistory(): void {
    this.evaluatorService
      .getCountryHistory(
        this.userService?.userInfo?.userID ?? 0,
        this.commonService.getStartOfYearLocal(this.selectedYear)
      )
      .subscribe({
        next: (res) => {
          this.countryHistory = res.result;
          this.buildRadialChart();
        },
      });
  }

  getCountryQuestionHistory(): void {
    if (
      this.userService?.userInfo?.userID == null ||
      !this.selectedCountries
    ) {
      this.isLoader = false;
      return;
    }

    const request: UserCountryRequestDto = {
      userID: this.userService.userInfo.userID,
      countryID: Number(this.selectedCountries),
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear),
    };

    this.evaluatorService.getCountryQuestionHistory(request).subscribe({
      next: (res) => {
        this.countryQuestionHistoryResponse = res;
        this.buildPillarChartOptions(this.countryQuestionHistoryResponse);
        this.isLoader = false;
      },
      error: () => {
        this.chartPillarOptions = null;
        this.isLoader = false;
      },
    });
  }

  private buildPillarChartOptions(history: GetCountryQuestionHistoryResponseDto | null): void {
    if (!history?.pillars?.length) {
      this.chartPillarOptions = null;
      return;
    }

    const rawMax = Math.max(0, ...history.pillars.map((p) => p.scoreProgress ?? 0));
    const maxNumber = Math.max(10, Math.ceil(rawMax / 10) * 10);

    const data = history.pillars
      .map((p) => ({
        pillarID: p.pillarID,
        pillarName: p.pillarName,
        totalQuestion: p.totalQuestion,
        ansQuestion: p.ansQuestion,
        score: p.score,
        scoreProgress: p.scoreProgress ?? 0,
        completionRate: p.totalQuestion > 0 ? (p.ansQuestion / p.totalQuestion) * 100 : 0,
      }))
      .sort((a, b) => a.scoreProgress - b.scoreProgress);

    const shortNames = this.generateUniqueShortNames(data.map((d) => d.pillarName));
    const chartHeight = Math.max(280, data.length * 38);
    const seriesData = data.map((d, index) => ({
      x: shortNames[index],
      y: d.scoreProgress,
      fillColor: this.getBarColor(d.scoreProgress, maxNumber),
      meta: {
        ansQuestion: d.ansQuestion,
        totalQuestion: d.totalQuestion,
        completionRate: d.completionRate,
        pillarName: d.pillarName,
        pillarShortName: shortNames[index],
      },
    }));

    this.chartPillarOptions = {
      series: [
        {
          name: 'Manual Score',
          data: seriesData,
        },
      ],
      chart: {
        type: 'bar',
        height: chartHeight,
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'transparent',
        toolbar: { show: false },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 900,
          animateGradually: { enabled: true, delay: 100 },
          dynamicAnimation: { enabled: true, speed: 400 },
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          borderRadiusApplication: 'end',
          barHeight: '70%',
          distributed: true,
          dataLabels: { position: 'center' },
        },
      },
      colors: [...HS_CHART.pillarBar],
      dataLabels: {
        enabled: true,
        textAnchor: 'middle',
        offsetX: 0,
        style: {
          fontSize: '14px',
          fontWeight: 800,
          colors: ['#ffffff'],
        },
        formatter: (val: number) => `${val.toFixed(val >= 100 ? 0 : 1)}`,
        background: { enabled: false },
      },
      stroke: {
        show: true,
        width: 0,
        colors: ['transparent'],
      },
      xaxis: {
        categories: shortNames,
        title: {
          text: 'Score',
          style: {
            fontSize: '14px',
            fontWeight: 700,
            color: HS_CHART.primaryMid,
          },
          offsetY: 0,
        },
        labels: {
          style: {
            fontSize: '12px',
            fontWeight: 600,
            colors: [HS_CHART.text],
          },
          formatter: (value: string) => `${value}`,
        },
        axisBorder: {
          show: true,
          color: HS_CHART.textMuted,
          offsetY: 0,
        },
        axisTicks: {
          show: true,
          color: HS_CHART.textMuted,
          height: 5,
        },
        min: 0,
        max: maxNumber,
        tickAmount: 5,
      },
      yaxis: {
        labels: {
          show: true,
          align: 'right',
          minWidth: 0,
          maxWidth: 120,
          style: {
            fontSize: '11px',
            fontWeight: 600,
            colors: HS_CHART.textMuted,
          },
          offsetX: -50,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      grid: {
        show: true,
        borderColor: HS_CHART.grid,
        strokeDashArray: 4,
        position: 'back',
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { top: 5, right: 30, bottom: 10, left: 10 },
      },
      tooltip: {
        enabled: true,
        shared: false,
        followCursor: true,
        intersect: true,
        inverseOrder: false,
        theme: 'dark',
        style: {
          fontSize: '13px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        onDatasetHover: { highlightDataSeries: true },
        custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
          const meta = w.config.series[0].data[dataPointIndex].meta;
          const percentage = series[seriesIndex][dataPointIndex].toFixed(1);
          const completion = meta.completionRate.toFixed(1);
          const barColor = w.config.series[0].data[dataPointIndex].fillColor;
          const completionColor = amiCompletionColor(Number(completion));
          const progressWidth = Math.min(completion, 100);

          return `
          <div style="background: #0F2A40; border-radius: 12px; box-shadow: ${HS_CHART.tooltipShadow}; overflow: hidden; border: 1px solid ${barColor}55; font-family: Inter, sans-serif; min-width: 280px; max-width: 420px;">
            <div style="background: linear-gradient(135deg, ${barColor}cc 0%, ${barColor}88 100%); padding: 16px 20px; min-height: 56px;">
              <div style="font-weight: 800; font-size: 15px; color: #ffffff; line-height: 1.5; word-wrap: break-word;">
                ${meta.pillarName}
              </div>
            </div>
            <div style="padding: 18px 20px; background: #0F2A40;">
              <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; padding: 12px; background: rgba(197, 160, 90, 0.08); border-radius: 8px; border: 1px solid ${HS_CHART.border};">
                <span style="color: ${HS_CHART.textMuted}; font-weight: 600; font-size: 13px;">Score</span>
                <span style="color: ${barColor}; font-weight: 900; font-size: 24px;">${percentage}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px; padding: 10px 12px; background: rgba(197, 160, 90, 0.06); border-left: 3px solid ${barColor}; border-radius: 6px;">
                <span style="color: ${HS_CHART.textMuted}; font-weight: 600; font-size: 12px; white-space: nowrap;">Questions Answered</span>
                <span style="color: ${HS_CHART.text}; font-weight: 700; font-size: 15px;">
                  ${meta.ansQuestion} / ${meta.totalQuestion}
                </span>
              </div>
              <div style="margin-top: 14px;">
                <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 8px;">
                  <span style="color: ${HS_CHART.textMuted}; font-weight: 600; font-size: 12px; white-space: nowrap;">Completion Rate</span>
                  <span style="color: ${completionColor}; font-weight: 800; font-size: 16px;">${completion}%</span>
                </div>
                <div style="width: 100%; height: 10px; background: rgba(197, 160, 90, 0.15); border-radius: 12px; overflow: hidden;">
                  <div style="width: ${progressWidth}%; height: 100%; background: ${completionColor}; border-radius: 12px;"></div>
                </div>
              </div>
            </div>
          </div>`;
        },
      },
      legend: { show: false },
      fill: {
        opacity: 0.95,
        type: 'solid',
      },
      markers: { size: 0 },
    };
  }

  private generateUniqueShortNames(pillarNames: string[]): string[] {
    const maxLength = 8;
    const shortNames: string[] = [];
    const nameCount: Record<string, number> = {};
    const usedNames: Record<string, number> = {};

    pillarNames.forEach((name) => {
      const words = name.split(/[\s,/&-]+/).filter((word) => word.length > 0);
      const firstWord = words[0] || name;
      const truncated = firstWord.length > maxLength ? firstWord.substring(0, maxLength) : firstWord;
      nameCount[truncated] = (nameCount[truncated] || 0) + 1;
    });

    pillarNames.forEach((name) => {
      const words = name.split(/[\s,/&-]+/).filter((word) => word.length > 0);
      const firstWord = words[0] || name;
      let truncated = firstWord.length > maxLength ? firstWord.substring(0, maxLength) : firstWord;

      if (nameCount[truncated] > 1) {
        usedNames[truncated] = (usedNames[truncated] || 0) + 1;
        const suffixWord = words[usedNames[truncated]] || words[1];
        truncated = suffixWord
          ? `${truncated}...${suffixWord.charAt(0).toLowerCase()}`
          : `${truncated}...`;
      } else if (firstWord.length > maxLength || words.length > 1) {
        truncated = `${truncated}...`;
      }

      shortNames.push(truncated);
    });

    return shortNames;
  }

  private getBarColor(scoreProgress: number, maxNumber: number): string {
    if (scoreProgress === 0) {
      return HS_CHART.accent;
    }
    const normalized = maxNumber > 0 ? (scoreProgress / maxNumber) * 100 : 0;
    return (amiScoreColor(normalized));
    // return color === '#E8EEF4' ? HS_CHART.primaryMid : color;
  }

  private buildRadialChart(): void {
    const h = this.countryHistory;
    const total = h?.totalCountry ?? 0;
    const active = h?.activeCountry ?? 0;
    const inprogress = h?.inprocessCountry ?? 0;
    const complete = h?.compeleteCountry ?? 0;
    const toPercent = (value: number) => (total > 0 ? (value / total) * 100 : 0);

    this.chartOptions = {
      series: [total > 0 ? 100 : 0, toPercent(active), toPercent(inprogress), toPercent(complete)],
      chart: {
        height: 340,
        type: 'radialBar',
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: 'Inter, system-ui, sans-serif',
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
            background: HS_CHART.hollow,
            strokeWidth: '100%',
            margin: 2,
          },
          dataLabels: {
            show: true,
            name: {
              show: true,
              offsetY: -8,
              color: HS_CHART.textMuted,
              fontSize: '12px',
            },
            value: {
              show: true,
              offsetY: 8,
              color: HS_CHART.text,
              fontSize: '22px',
              fontWeight: 700,
              formatter: (value: number) => `${((value * total) / 100).toFixed(0)}`,
            },
            total: {
              show: true,
              label: 'Total Country',
              color: HS_CHART.textMuted,
              fontSize: '13px',
              formatter: () => `${total}`,
            },
          },
        },
      },
      colors: [...HS_CHART.radialBarShort],
      labels: ['Total', 'Active', 'In-Progress', 'Completed'],
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

  exportCountryPillar(): void {
    const country = this.countries?.find((x) => x.countryID == this.selectedCountries);
    if (this.countryQuestionHistoryResponse?.pillars && country) {
      const exportData = this.countryQuestionHistoryResponse.pillars.map((x) => ({
        CountryName: country.countryName,
        PillarName: x.pillarName,
        Score: x.scoreProgress?.toFixed(2),
        AnsweredQuestion: x.ansQuestion,
        TotalQuestion: x.totalQuestion,
      }));
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning('Please select country to export the records');
    }
  }
}
