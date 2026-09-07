import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { AgBarSeriesOptions, AgLineSeriesOptions, AgTooltipRendererDataRow } from "ag-charts-community";
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { AnalystService } from '../../analyst.service';
import { CountryHistoryDto, GetCountriesSubmitionHistoryResponseDto, UserCountryRequestDto } from 'src/app/core/models/countryHistoryDto';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { CommonService } from 'src/app/core/services/common.service';

import {
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexChart,
  ApexLegend,
  ChartComponent, ApexAxisChartSeries, ApexXAxis, ApexYAxis, ApexStroke, ApexTooltip, ApexDataLabels,
  ApexStates
} from "ng-apexcharts";
import { AiCountryPillarDashboardResponseDto } from 'src/app/core/models/AiCountryPillarDashboardResponseDto';
import { ActivatedRoute, Router } from '@angular/router';
import { HS_CHART, amiScoreColor, HS_AXIS_STYLE } from 'src/app/core/constants/hs-chart-theme';
import { SignalIndexHelpers, SignalTab } from 'src/app/core/utils/signal-index.helpers';
import { DashboardModeResponseDto } from 'src/app/core/models/CountrySignalDashboardDto';




export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;

};
export type ApexChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  colors:any;
  dataLabels: ApexDataLabels;
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
  states: ApexStates;
  dataLabels: ApexDataLabels;
  stroke: any;
  markers: any;
  grid: any;
};

@Component({
  selector: 'app-analyst-dashboard',
  templateUrl: './analyst-dashboard.component.html',
  styleUrl: './analyst-dashboard.component.css',
})
export class AnalystDashboardComponent extends SignalIndexHelpers implements OnInit {
  selectedYear = new Date().getFullYear();
  countries: CountryVM[] | null = [];
  selectedCountries: number | any = '';
  countryHistory: CountryHistoryDto | null = null;
  countryQuestionHistoryReponse: AiCountryPillarDashboardResponseDto | null = null;
  pillarBarOptions: any = {};
  isLoader: boolean = false;
  resizeTimeout: any;
  constructor(private analystService: AnalystService, private toaster: ToasterService,
    private userService: UserService, public commonService: CommonService, private router: Router) {
    super('analystSignalDetailModal');
  }
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;

  @ViewChild("apexchart") apexchart!: ChartComponent;
  public apexchartOptions: Partial<ApexChartOptions> = {};

  @ViewChild("chartPillar") chartPillar!: ChartComponent;
  public chartPillarOptions: Partial<PillarChartOptions> = {};

  ngAfterViewInit() { }

  ngOnInit(): void {
    this.isLoader = true;
    this.getAllCountriesByUserId();
    this.yearChanged();

  }
  yearChanged() {
    this.GetCountryHistory();
    this.getCountriesProgressByUserId();
    this.getCountryPillarHistory();
    this.loadActiveTabData();
  }
  getCountriesProgressByUserId() {
    this.analystService.getCountriesProgressByUserId(this.userService?.userInfo?.userID ?? 0, this.commonService.getStartOfYearLocal(this.selectedYear)).subscribe({
      next: (res) => {
        if (res.succeeded && res.result) {
          this.apexchartOptions = this.getCountryLineChartOptions(res.result);
        }
      }
    })
  }
  getAllCountriesByUserId() {
    this.analystService.getAllCountriesByUserId(this.userService?.userInfo?.userID).subscribe({
      next: (res) => {
        this.countries = res.result;
        this.isLoader = false;
        if (this.countries && this.countries.length > 0) {
          this.isLoader = true;
          this.selectedCountries = this.countries[0].countryID;
          this.getCountryPillarHistory();
          this.loadActiveTabData();
        }
      }
    });
  }

  onCountrySelected() {
    this.getCountryPillarHistory();
    if (this.selectedCountries) {
      this.loadActiveTabData();
    }
  }

  GetCountryHistory() {
    this.analystService.getCountryHistory(this.userService?.userInfo?.userID ?? 0, this.commonService.getStartOfYearLocal(this.selectedYear)).subscribe({
      next: (res) => {
        this.countryHistory = res.result;;
        this.GetApexPieOptions();
      }
    });
  }
  getCountryPillarHistory() {
    if (this.userService?.userInfo?.userID == null || !this.selectedCountries || this.selectedCountries === '' || this.selectedCountries == null) {
      return;
    }
    let request: UserCountryRequestDto = {
      userID: this.userService?.userInfo?.userID ?? 0,
      countryID: this.selectedCountries,
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear)
    }
    this.analystService.getCountryPillarHistory(request).subscribe({
      next: (res) => {
        this.isLoader = false;
        this.countryQuestionHistoryReponse = res.result;
        if (this.countryQuestionHistoryReponse) {
          this.buildPillarComparisonChart();
        }
      },
      error: (err) => {
        this.isLoader = false;
      }
    });
  }

  setActiveTab(tab: SignalTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.loadActiveTabData();
  }

  loadActiveTabData(): void {
    if (!this.selectedCountries) return;
    if (this.activeTab === 'stress') {
      this.loadStressDashboard();
      return;
    }
    if (this.activeTab === 'warning') {
      this.loadEarlyWarningDashboard();
      return;
    }
    this.loadResilienceDashboard();
  }

  loadStressDashboard(): void {
    if (!this.selectedCountries) return;
    this.signalLoading = true;
    this.analystService.getPeaceStressTestDashboard(this.selectedCountries, Number(this.selectedYear)).subscribe({
      next: (res) => {
        this.signalLoading = false;
        if (!res.succeeded) {
          this.stressDashboard = null;
          this.toaster.showWarning(res.errors?.[0] || 'No stress test data found.');
          return;
        }
        this.stressDashboard = res.result as DashboardModeResponseDto;
        this.interpretationConditions = res.result?.dashboardInterpretations ?? [];
        if (this.activeTab === 'stress') this.updateGlanceCharts(this.stressDashboard);
      },
      error: () => {
        this.signalLoading = false;
        this.toaster.showError('Failed to load stress test dashboard.');
      },
    });
  }

  loadEarlyWarningDashboard(): void {
    if (!this.selectedCountries) return;
    this.signalLoading = true;
    this.analystService.getEarlyWarningDashboard(this.selectedCountries, Number(this.selectedYear)).subscribe({
      next: (res) => {
        this.signalLoading = false;
        if (!res.succeeded) {
          this.warningDashboard = null;
          this.toaster.showWarning(res.errors?.[0] || 'No early warning data found.');
          return;
        }
        this.warningDashboard = res.result as DashboardModeResponseDto;
        this.interpretationConditions = res.result?.dashboardInterpretations ?? [];
        if (this.activeTab === 'warning') this.updateGlanceCharts(this.warningDashboard);
      },
      error: () => {
        this.signalLoading = false;
        this.toaster.showError('Failed to load early warning dashboard.');
      },
    });
  }

  loadResilienceDashboard(): void {
    if (!this.selectedCountries) return;
    this.signalLoading = true;
    this.analystService.getResilienceScorecard(this.selectedCountries, Number(this.selectedYear)).subscribe({
      next: (res) => {
        this.signalLoading = false;
        if (!res.succeeded) {
          this.resilienceDashboard = null;
          this.toaster.showWarning(res.errors?.[0] || 'No resilience data found.');
          return;
        }
        this.resilienceDashboard = res.result as DashboardModeResponseDto;
        this.interpretationConditions = res.result?.dashboardInterpretations ?? [];
        if (this.activeTab === 'resilience') this.updateGlanceCharts(this.resilienceDashboard);
      },
      error: () => {
        this.signalLoading = false;
        this.toaster.showError('Failed to load resilience scorecard.');
      },
    });
  }

  getCountryName(): string {
    return (
      this.countries?.find((x) => x.countryID === this.selectedCountries)?.countryName ||
      'Selected Country'
    );
  }

  getSignalCountryName(): string {
    return this.getCountryName();
  }

  goToCountryAnalysis() {
    // If countryID exists, pass it as a query parameter
    const queryParams: any = {};
    if (this.selectedCountries > 0) {
      queryParams.countryID = this.selectedCountries;
      queryParams.year = this.selectedYear;
    }

    this.router.navigate(["/analyst/ai/country-analysis"], { queryParams });
  }

  ExportCountryPillar() {
    let country = this.countries?.find((x) => x.countryID == this.selectedCountries);
    if (this.countryQuestionHistoryReponse?.pillars && country) {
      var exportData = this.countryQuestionHistoryReponse?.pillars.map((x) => {
        return {
          CountryName: country?.countryName,
          PillarName: x.pillarName,
          AIScore: x.aiValue?.toFixed(2),
          EvaluationScore: x.evaluationValue?.toFixed(2)
        };
      });
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning("Please select country to export the records");
    }
  }
  getCountryLineChartOptions(countriesHistory: GetCountriesSubmitionHistoryResponseDto[]) {

    const evaluationColor = HS_CHART.lineEvaluation;
    const aiColor = HS_CHART.lineAi;

    const categories = countriesHistory.map(x => x.countryName);
    const evaluationSeries = countriesHistory.map(x => x.scoreProgress ?? 0);
    const aiSeries = countriesHistory.map(x => x.aiScore ?? 0);

    let option: Partial<ApexChartOptions> = {
      series: [
        {
          name: "Evaluation Score",
          data: evaluationSeries,
          color: evaluationColor
        },
        {
          name: "AI Score",
          data: aiSeries,
          color: aiColor
        }
      ],

      chart: {
        type: "line",
        height: 360,
        zoom: { enabled: false },
        toolbar: { show: false },
        background: "transparent",
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 850,
        },
      },

      stroke: {
        curve: "smooth",
        width: 3
      },



      dataLabels: {
        enabled: true,
        offsetY: -8,
        formatter: (val: number, opts: any) => {
          const d = countriesHistory[opts.dataPointIndex];
          if (!d || val <= 0) return "";

          const country = d.countryName;
          const percent = val.toFixed(val >= 100 ? 0 : 1);
          return `${country} ${percent}`;
        },
        style: {
          fontSize: "11px",
          fontWeight: "600",
          colors: [HS_CHART.text]
        },
        background: {
          enabled: true,
          borderRadius: 5,
          padding: 6,
          borderWidth: 1,
          borderColor: HS_CHART.border,
          foreColor: HS_CHART.deep,
          opacity: 0.95
        }
      },

      colors: [evaluationColor, aiColor],

      xaxis: {
        categories,
        labels: {
          rotate: -25,
          style: { fontSize: "12px", colors: HS_CHART.textMuted }
        },
        axisBorder: { color: HS_CHART.border },
      },

      yaxis: {
        min: 0,
        max: 100,
        decimalsInFloat: 0,
        title: {
          text: "Country Score",
          style: { fontSize: "13px", fontWeight: 600, color: HS_CHART.textMuted }
        },
        labels: {
          style: { colors: HS_CHART.textMuted }
        }
      },

      tooltip: {
        theme: 'dark',
        custom: ({ dataPointIndex }) => {
          const d = countriesHistory[dataPointIndex];
          if (!d) return "";

          return `
          <div style="padding:14px 16px; min-width:220px; font-size:12px; font-family:Inter,sans-serif; 
          background:#0C2238; border-radius:12px; box-shadow:${HS_CHART.tooltipShadow}; border:1px solid #1E3D5C; color:#E8EEF4;">
            <div style="font-weight:700; margin-bottom:10px; color:#D4B86A; font-size:14px;">
              ${d.countryName}
            </div>
            <div style="margin-bottom:8px; color:#8FA3B5;">
              Total Answered: <b style="color:#E8EEF4">${d.ansQuestion}</b>
            </div>

            <div style="display:flex; align-items:center; gap:8px; margin:6px 0; padding:6px 8px; background:#123049; border-radius:8px;">
              <span style="width:10px; height:10px; background:${evaluationColor}; border-radius:50%;"></span>
              <span style="color:#8FA3B5">Manual Score</span>
              <b style="margin-left:auto; color:#E8EEF4">${(d.scoreProgress ?? 0).toFixed(1)}</b>
            </div>

            <div style="display:flex; align-items:center; gap:8px; margin:6px 0; padding:6px 8px; background:#123049; border-radius:8px;">
              <span style="width:10px; height:10px; background:${aiColor}; border-radius:50%;"></span>
              <span style="color:#8FA3B5">AI Score</span>
              <b style="margin-left:auto; color:#E8EEF4">${(d.aiScore ?? 0).toFixed(1)}</b>
            </div>
          </div>
        `;
        }
      }
    };

    return option;
  }


  GetApexPieOptions() {
    const total = this.countryHistory?.totalCountry ?? 0;
    const active = this.countryHistory?.activeCountry?? 0;
    const inprogress = this.countryHistory?.inprocessCountry ?? 0;
    const complete = this.countryHistory?.compeleteCountry ?? 0;

    const finalizeCountry = this.countryHistory?.finalizeCountry ?? 0;
    const unFinalize = this.countryHistory?.unFinalize ?? 0;

    this.chartOptions = {
      series: [
        (total / total) * 100,
        (active / total) * 100,
        (inprogress / total) * 100,
        (complete / total) * 100,
        (finalizeCountry / total) * 100,
        (unFinalize / total) * 100,
      ],

      chart: {
        height: 360,
        type: "radialBar",
        toolbar: {
          show: false,
        },
        background: "transparent",
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 900,
        },
      },
      plotOptions: {
        radialBar: {
          startAngle: 20,
          endAngle: 300,
          offsetY: 10,
          offsetX: 10,
          hollow: {
            margin: 0,
            size: "40%",
            background: HS_CHART.hollow,
            image: undefined,
            position: "front",
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
                return `${((value * total) / 100).toFixed(0)}`;
              },
            },
            total: {
              show: true,
              label: "Total Country",
              color: HS_CHART.textMuted,
              formatter: (value: any) => {
                return `${total}`;
              },
            },
          },
        },
      },
      colors: [...HS_CHART.radialBar],
      labels: [
        "Total",
        "Manual Active",
        "Manual InProgress",
        "Manual Completed",
        "AI Finalized",
        "AI Pending Review"
      ],
      legend: {
        show: false,
        floating: false,
        fontSize: "12px",
        position: "top",
        offsetX: 0,
        offsetY: 0,
        labels: {
          useSeriesColors: true,
          colors: HS_CHART.textMuted,
        },
        formatter: function (seriesName: any, opts: any) {
          return (
            seriesName +
            ":  " +
            `${(
              (opts.w.globals.series[opts.seriesIndex] * total) /
              100
            ).toFixed(0)}`
          );
        },
        itemMargin: {
          horizontal: 6,
        },
      },
    };
  }


  buildPillarComparisonChart() {
    const data = [...(this.countryQuestionHistoryReponse?.pillars ?? [])];

    const categories = this.buildUniqueCategories(data);
    const aiSeries = data.map(x => x.aiValue);
    const evaluatorSeries = data.map(x => x.evaluationValue);
    this.chartPillarOptions = {
      series: [{
        name: 'AI Score',
        data: aiSeries
      },
      {
        name: 'Evaluator',
        data: evaluatorSeries
      }],

      chart: {
        type: 'area',
        height: 450,
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },

      dataLabels: {
        enabled: false,
        formatter: (val: number, opts) => {
          const pillar = data[opts.dataPointIndex];

          return `${Math.round(val)}`;
        },
        offsetY: -10,
        style: {
          fontSize: '11px',
          fontWeight: 500,
          colors: [HS_CHART.text]
        },
        background: {
          enabled: true,
          foreColor: HS_CHART.deep,
          padding: 6,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: HS_CHART.border,
          opacity: 0.95
        }
      },

      stroke: {
        curve: 'smooth',
        width: 3,
        colors: [HS_CHART.primary, HS_CHART.secondary],
      },

      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.04,
          stops: [0, 85, 100],
        }
      },

      colors: [HS_CHART.primary, HS_CHART.secondary],

      markers: {
        size: data.map(p => 4),
        colors: data.map(p => amiScoreColor(p.aiValue)),
        strokeColors: HS_CHART.primaryMid,
        strokeWidth: 2,
        hover: {
          size: 8,
          sizeOffset: 3
        }
      },

      xaxis: {
        categories: categories,
        labels: {
          rotateAlways: true,
          rotate: -45,
          style: {
            fontSize: '11px',
            fontWeight: 500,
            colors: HS_CHART.textMuted
          }
        },
        axisBorder: {
          show: true,
          color: HS_CHART.border
        },
        axisTicks: {
          show: true,
          color: HS_CHART.border
        }
      },

      yaxis: {
        title: {
          text: 'Score',
          style: {
            fontSize: '13px',
            fontWeight: 600,
            color: HS_CHART.textMuted
          }
        },
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          formatter: (val) => val >= 0 ? `${Math.round(val)}` : '',
          style: {
            fontSize: '12px',
            colors: HS_CHART.textMuted
          }
        }
      },

      grid: {
        ...HS_AXIS_STYLE.grid,
        xaxis: {
          lines: { show: false }
        },
        yaxis: {
          lines: { show: true }
        }
      },

      tooltip: {
        enabled: true,
        theme: 'dark',
        fixed: {
          enabled: true,
          position: 'centerRight',
          offsetX: 0,
          offsetY: 0
        },
        custom: ({ dataPointIndex }) => {
          const pillar = data[dataPointIndex];

          const progressColor = amiScoreColor(pillar.aiValue);
          const evaluatorProgressColor = amiScoreColor(pillar.evaluationValue);
          const progressPercent = pillar.aiValue ?? 0;
          const evaluatorProgressPercent = pillar.evaluationValue ?? 0;
          const avgScore = ((progressPercent + evaluatorProgressPercent) / 2);

          const statusText = avgScore >= 75 ? 'Excellent Performance' :
            avgScore >= 50 ? 'Strong Score' :
              avgScore >= 25 ? 'Steady Growth' : 'Early Stage';

          return `
          <div style="
            padding: 16px 18px;
            min-width: 280px;
            background: #0C2238;
            border-radius: 12px;
            box-shadow: ${HS_CHART.tooltipShadow};
            border: 1px solid #1E3D5C;
            border-left: 4px solid ${HS_CHART.primary};
            font-family: Inter, system-ui, sans-serif;
            color: #E8EEF4;
          ">
            <div style="font-weight:700; font-size:15px; margin-bottom:8px; color:#E8EEF4;">
              ${pillar.pillarName}
            </div>
            <div style="font-size:11px; color:${progressColor}; margin-bottom:12px; font-weight:600;">
              ${statusText}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
              <div style="background:#123049; border:1px solid #1E3D5C; border-radius:8px; padding:10px;">
                <div style="color:#8FA3B5; margin-bottom:4px;">AI Score</div>
                <div style="font-family:JetBrains Mono,monospace; font-weight:700; color:#D4B86A;">${progressPercent.toFixed(1)}</div>
              </div>
              <div style="background:#123049; border:1px solid #1E3D5C; border-radius:8px; padding:10px;">
                <div style="color:#8FA3B5; margin-bottom:4px;">Manual Score</div>
                <div style="font-family:JetBrains Mono,monospace; font-weight:700; color:#B8C5D0;">${evaluatorProgressPercent.toFixed(1)}</div>
              </div>
              <div style="background:#123049; border:1px solid #1E3D5C; border-radius:8px; padding:10px;">
                <div style="color:#8FA3B5; margin-bottom:4px;">Difference</div>
                <div style="font-family:JetBrains Mono,monospace; font-weight:700;">${Math.abs(progressPercent - evaluatorProgressPercent).toFixed(0)}</div>
              </div>
              <div style="background:#123049; border:1px solid #1E3D5C; border-radius:8px; padding:10px;">
                <div style="color:#8FA3B5; margin-bottom:4px;">Avg Score</div>
                <div style="font-family:JetBrains Mono,monospace; font-weight:700;">${avgScore.toFixed(0)}</div>
              </div>
            </div>
          </div>
        `;
        }
      },

      legend: {
        show: false
      }
    };
  }
  PillarColorByScore(score: any): string {
    return amiScoreColor(score);
  }

  buildUniqueCategories(data: { pillarName: string }[]): string[] {
    const used = new Set<string>();
    return data.map(item => {
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
      if (!label) label = words[0] + '...';
      return label;
    });
  }
}
