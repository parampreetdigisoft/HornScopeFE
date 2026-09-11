import {
  Component,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  AfterViewInit,
} from "@angular/core";

import { AdminService } from "../../admin.service";
import { ToasterService } from "src/app/core/services/toaster.service";
import { UserService } from "src/app/core/services/user.service";
import { CountryVM } from "src/app/core/models/CountryVM";
import { CountryHistoryDto, UserCountryRequestDto } from "../../../../core/models/countryHistoryDto";
import { CommonService } from "src/app/core/services/common.service";
import { Router } from "@angular/router";
import {
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexChart,
  ApexLegend,
  ChartComponent,
  ApexAxisChartSeries,
  ApexDataLabels,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ApexStates,
} from "ng-apexcharts";
import { AiCountryPillarDashboardResponseDto } from "src/app/core/models/AiCountryPillarDashboardResponseDto";
import { HS_CHART, amiScoreColor, HS_AXIS_STYLE } from "src/app/core/constants/hs-chart-theme";
import { DiagnosticsDashboardTab } from "src/app/core/constants/relational-diagnostics.catalog";
import { DashboardModeResponseDto } from "src/app/core/models/CountrySignalDashboardDto";

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
  states: ApexStates;
  dataLabels: ApexDataLabels;
  stroke: any;
  markers: any;
  grid: any;
};

@Component({
  selector: "app-admin-dashboard",
  templateUrl: "./admin-dashboard.component.html",
  styleUrl: "./admin-dashboard.component.css",
  encapsulation: ViewEncapsulation.None,
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  activeTab: DiagnosticsDashboardTab = "relational";
  selectedFamilyId = "A";
  diagnosticsDashboard: DashboardModeResponseDto | null = null;
  signalLoading = false;
  selectedYear = new Date().getFullYear();
  countries: CountryVM[] | null = [];
  selectedCountries: number | any = "";
  countryHistory: CountryHistoryDto | null = null;
  countryQuestionHistoryResponse: AiCountryPillarDashboardResponseDto | null = null;
  isLoader: boolean = false;
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;
  @ViewChild("chartPillar") chartPillar!: ChartComponent;
  public chartPillarOptions: Partial<PillarChartOptions> = {};

  constructor(
    private adminService: AdminService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoader = true;
    this.getAllCountriesByUserId();
    this.GetCountryHistory();
  }

  ngAfterViewInit() { }

  getAllCountriesByUserId() {
    this.adminService
      .getAllCountriesByUserId(this.userService?.userInfo?.userID)
      .subscribe({
        next: (res) => {
          this.countries = res.result;
          this.isLoader = false;
          if (this.countries && this.countries.length > 0) {
            this.isLoader = true;
            this.selectedCountries = this.countries[0].countryID;
            this.getCountryPillarHistory();
            this.loadActiveTabData();
          }
        },
      });
  }

  yearChanged() {
    this.getCountryPillarHistory();
    this.GetCountryHistory();
    this.loadActiveTabData();
  }

  onCountrySelected() {
    this.getCountryPillarHistory();
    if (this.selectedCountries) {
      this.loadActiveTabData();
    }
  }

  GetCountryHistory() {
    this.adminService
      .getCountryHistory(
        this.userService?.userInfo?.userID ?? 0,
        this.commonService.getStartOfYearLocal(this.selectedYear)
      )
      .subscribe({
        next: (res) => {
          this.countryHistory = res.result;
          this.GetApexPieOptions();
        },
      });
  }

  getCountryPillarHistory() {
    if (
      this.userService?.userInfo?.userID == null ||
      !this.selectedCountries ||
      this.selectedCountries === "" ||
      this.selectedCountries == null
    ) {
      return;
    }
    let request: UserCountryRequestDto = {
      userID: this.userService?.userInfo?.userID ?? 0,
      countryID: this.selectedCountries,
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear),
    };
    this.adminService.getCountryPillarHistory(request).subscribe({
      next: (res) => {
        this.isLoader = false;
        this.countryQuestionHistoryResponse = res.result;
        if (this.countryQuestionHistoryResponse) {
          this.buildPillarComparisonChart();
        }
      },
      error: (err) => {
        this.isLoader = false;
      },
    });
  }

  setActiveTab(tab: DiagnosticsDashboardTab): void {
    this.activeTab = tab;
    this.loadActiveTabData();
  }

  onFamilyChange(familyId: string): void {
    this.selectedFamilyId = familyId || "A";
    if (this.activeTab === "relational") {
      this.loadRelationalDiagnosticsDashboard(this.selectedFamilyId);
    }
  }

  loadActiveTabData(): void {
    if (!this.selectedCountries) return;
    if (this.activeTab === "relational") {
      this.loadRelationalDiagnosticsDashboard(this.selectedFamilyId || "A");
      return;
    }
    this.loadCompositeDiagnosticsDashboard();
  }

  loadRelationalDiagnosticsDashboard(familyGroup: string = "A"): void {
    if (!this.selectedCountries) return;
    this.signalLoading = true;
    this.adminService
      .getRelationalDiagnosticsDashboard(this.selectedCountries, Number(this.selectedYear), familyGroup)
      .subscribe({
        next: (res) => {
          this.signalLoading = false;
          if (!res.succeeded) {
            this.diagnosticsDashboard = null;
            this.toaster.showWarning(res.errors?.[0] || "No relational diagnostics data found.");
            return;
          }
          this.diagnosticsDashboard = res.result as DashboardModeResponseDto;
        },
        error: () => {
          this.signalLoading = false;
          this.diagnosticsDashboard = null;
          this.toaster.showError("Failed to load relational diagnostics dashboard.");
        },
      });
  }

  loadCompositeDiagnosticsDashboard(): void {
    if (!this.selectedCountries) return;
    this.signalLoading = true;
    this.adminService.getCompositeDiagnosticsDashboard(this.selectedCountries, Number(this.selectedYear)).subscribe({
      next: (res) => {
        this.signalLoading = false;
        if (!res.succeeded) {
          this.diagnosticsDashboard = null;
          this.toaster.showWarning(res.errors?.[0] || "No composite diagnostics data found.");
          return;
        }
        this.diagnosticsDashboard = res.result as DashboardModeResponseDto;
      },
      error: () => {
        this.signalLoading = false;
        this.diagnosticsDashboard = null;
        this.toaster.showError("Failed to load composite diagnostics dashboard.");
      },
    });
  }

  getCountryName(): string {
    return (
      this.countries?.find((x) => x.countryID === this.selectedCountries)?.countryName ||
      "Selected Country"
    );
  }

  goToCountryAnalysis() {
    // If countryID exists, pass it as a query parameter
    const queryParams: any = {};
    if (this.selectedCountries > 0) {
      queryParams.countryID = this.selectedCountries;
      queryParams.year = this.selectedYear;
    }

    this.router.navigate(["/admin/ai/country-analysis"], { queryParams });
  }

  ExportCountryPillar() {
    let country = this.countries?.find((x) => x.countryID == this.selectedCountries);
    if (this.countryQuestionHistoryResponse?.pillars && country) {
      var exportData = this.countryQuestionHistoryResponse?.pillars.map((x) => {
        return {
          CountryName: country?.countryName,
          PillarName: x.pillarName,
          AIScore: x.aiValue?.toFixed(1),
          EvaluationScore: x.evaluationValue?.toFixed(1)
        };
      });
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning("Please select country to export the records");
    }
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
    const data = [...(this.countryQuestionHistoryResponse?.pillars ?? [])];

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
        fixed: {
          enabled: true,
          position: 'centerRight',
          offsetX: 0,
          offsetY: 0
        },
        theme: 'dark',
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
                <div style="font-family:JetBrains Mono,monospace; font-weight:700;">${avgScore.toFixed(1)}</div>
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
