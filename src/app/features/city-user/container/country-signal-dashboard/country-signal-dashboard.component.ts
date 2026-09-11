import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
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
import { CountryVM } from 'src/app/core/models/CountryVM';
import { TieredAccessPlanValue } from 'src/app/core/enums/TieredAccessPlan';
import { CountryHistoryDto } from 'src/app/core/models/countryHistoryDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { AiCountrySummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiCountrySummeryRequestPdfDto';
import { HS_CHART } from 'src/app/core/constants/hs-chart-theme';
import { DiagnosticsDashboardTab } from 'src/app/core/constants/relational-diagnostics.catalog';
import { DashboardModeResponseDto } from 'src/app/core/models/CountrySignalDashboardDto';
import { CommonService } from 'src/app/core/services/common.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { CountryUserService } from '../../country-user.service';

declare var bootstrap: any;

export type AreaChartOptions = {
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

export type RadialChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
};

@Component({
  selector: 'app-country-user-dashboard',
  templateUrl: './country-signal-dashboard.component.html',
  styleUrl: './country-signal-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class CountryUserDashboardComponent implements OnInit {
  selectedYear = new Date().getFullYear();
  countries: CountryVM[] = [];
  selectedCountryID: number | null = null;
  countryHistory: CountryHistoryDto | null = null;
  aiPillars: { pillarID: number; pillarName: string; aiValue: number }[] = [];
  activeKpiTab: DiagnosticsDashboardTab = 'relational';
  selectedFamilyId = 'A';
  diagnosticsDashboard: DashboardModeResponseDto | null = null;
  signalLoading = false;
  pillarChartOptions: Partial<AreaChartOptions> | null = null;
  radialChartOptions: Partial<RadialChartOptions> | null = null;

  isLoader = false;
  loading = false;
  chooseKpisLayers = false;
  pillars: PillarsVM[] = [];
  tier: TieredAccessPlanValue = TieredAccessPlanValue.Pending;

  constructor(
    private countryUserService: CountryUserService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService,
    private router: Router
  ) {
    this.tier = this.userService?.userInfo?.tier || TieredAccessPlanValue.Pending;
  }

  ngOnInit(): void {
    this.isLoader = true;
    this.getCountryHistory();
    this.getCountryUserCountries();
  }

  getCountryUserCountries(): void {
    this.countryUserService.getCountryUserCountries().subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.countries = res.result ?? [];
          if (this.countries.length) {
            this.selectedCountryID = this.countries[0].countryID;
            this.onCountryChanged();
          } else {
            this.chooseKpisLayers = true;
            this.selectedCountryID = null;
            this.getAllPillars();
            this.openDialog();
          }
        } else {
          this.toaster.showWarning(res.errors?.[0] || 'Failed to load countries.');
        }
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError('Failed to load country list.');
      },
    });
  }

  getCountryHistory(): void {
    this.countryUserService.getCountryHistory().subscribe({
      next: (res) => {
        this.countryHistory = res.result;
        this.radialChartOptions = this.buildRadialChart();
      },
    });
  }

  onCountryChanged(): void {
    if (!this.selectedCountryID) return;
    this.loadAiPillars();
    this.loadActiveTabData();
  }

  yearChanged(): void {
    if (!this.selectedCountryID) return;
    this.loadAiPillars();
    this.loadActiveTabData();
  }

  setKpiTab(tab: DiagnosticsDashboardTab): void {
    this.activeKpiTab = tab;
    this.loadActiveTabData();
  }

  onFamilyChange(familyId: string): void {
    this.selectedFamilyId = familyId || 'A';
    if (this.activeKpiTab === 'relational') {
      this.loadRelationalDiagnosticsDashboard(this.selectedFamilyId);
    }
  }

  loadActiveTabData(): void {
    if (!this.selectedCountryID) return;
    if (this.activeKpiTab === 'relational') {
      this.loadRelationalDiagnosticsDashboard(this.selectedFamilyId || 'A');
      return;
    }
    this.loadCompositeDiagnosticsDashboard();
  }

  loadRelationalDiagnosticsDashboard(familyGroup: string = 'A'): void {
    if (!this.selectedCountryID) return;
    this.signalLoading = true;
    this.countryUserService
      .getRelationalDiagnosticsDashboard(this.selectedCountryID, Number(this.selectedYear), familyGroup)
      .subscribe({
        next: (res) => {
          this.signalLoading = false;
          if (!res.succeeded) {
            this.diagnosticsDashboard = null;
            this.toaster.showWarning(res.errors?.[0] || 'No relational diagnostics data found.');
            return;
          }
          this.diagnosticsDashboard = res.result as DashboardModeResponseDto;
        },
        error: () => {
          this.signalLoading = false;
          this.diagnosticsDashboard = null;
          this.toaster.showError('Failed to load relational diagnostics dashboard.');
        },
      });
  }

  loadCompositeDiagnosticsDashboard(): void {
    if (!this.selectedCountryID) return;
    this.signalLoading = true;
    this.countryUserService.getCompositeDiagnosticsDashboard(this.selectedCountryID, Number(this.selectedYear)).subscribe({
      next: (res) => {
        this.signalLoading = false;
        if (!res.succeeded) {
          this.diagnosticsDashboard = null;
          this.toaster.showWarning(res.errors?.[0] || 'No composite diagnostics data found.');
          return;
        }
        this.diagnosticsDashboard = res.result as DashboardModeResponseDto;
      },
      error: () => {
        this.signalLoading = false;
        this.diagnosticsDashboard = null;
        this.toaster.showError('Failed to load composite diagnostics dashboard.');
      },
    });
  }

  get diagnosticsCountryName(): string {
    return this.countries.find((c) => c.countryID === this.selectedCountryID)?.countryName || 'Selected country';
  }

  private loadAiPillars(): void {
    if (!this.selectedCountryID) return;
    const request: AiCountrySummeryRequestPdfDto = {
      countryID: this.selectedCountryID,
      year: Number(this.selectedYear),
    };
    this.countryUserService.getAICountryPillars(request).subscribe({
      next: (res) => {
        const pillars = res.result?.pillars ?? [];
        this.aiPillars = pillars.map((p, index) => ({
          pillarID: p.pillarID ?? index,
          pillarName: p.pillarName || `Pillar ${index + 1}`,
          aiValue: Number(p.aiProgress ?? p.aiScore ?? 0),
        }));
        this.refreshDerivedViews();
      },
      error: () => {
        this.refreshDerivedViews();
      },
    });
  }

  private refreshDerivedViews(): void {
    this.pillarChartOptions = this.buildAreaChart();
    this.radialChartOptions = this.buildRadialChart();
  }

  private buildAreaChart(): Partial<AreaChartOptions> | null {
    const data = [...this.aiPillars];
    if (!data.length) return null;
    const categories = this.truncateCategories(data.map((p) => p.pillarName));
    const colors = [HS_CHART.lineAi];

    return {
      series: [{ name: 'Score', data: data.map((x) => Number(x.aiValue ?? 0)) }],
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
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3, colors },
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
        strokeColors: HS_CHART.deep,
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
          style: { fontSize: '11px', fontWeight: 500, colors: HS_CHART.textMuted },
        },
        axisBorder: { show: true, color: HS_CHART.grid },
        axisTicks: { show: true, color: HS_CHART.grid },
        tooltip: { enabled: false },
      },
      yaxis: {
        title: {
          text: 'Score',
          style: { fontSize: '12px', fontWeight: 600, color: HS_CHART.textMuted },
        },
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          formatter: (val) => `${Math.round(val)}`,
          style: { fontSize: '12px', colors: [HS_CHART.textMuted] },
        },
      },
      grid: {
        borderColor: HS_CHART.grid,
        strokeDashArray: 4,
        padding: { top: 8, right: 8, bottom: -8, left: 4 },
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        followCursor: true,
        custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
          const pillar = data[dataPointIndex];
          if (!pillar) return '';

          const score = Number(pillar.aiValue ?? 0);
          const accent = '#D4B86A';
          const statusText =
            score >= 75
              ? 'Excellent Performance'
              : score >= 50
                ? 'Strong Score'
                : score >= 25
                  ? 'Steady Growth'
                  : 'Early Stage';
          const statusIcon =
            score >= 75 ? '🌟' : score >= 50 ? '📈' : score >= 25 ? '⚡' : '🌱';
          const barWidth = Math.min(Math.max(score, 0), 100);

          return `
            <div style="padding:18px 20px;min-width:320px;max-width:480px;background:linear-gradient(160deg,#123049 0%,#0C2238 100%);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(197,160,90,0.35);border-left:4px solid ${accent};font-family:Inter,system-ui,sans-serif;position:relative;overflow:hidden;color:#E8EEF4; flex: 1;
min-width: 0;
white-space: normal;
overflow-wrap: anywhere;
word-break: break-word;">
              <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:${accent};opacity:0.16;border-radius:50%;filter:blur(2px);"></div>
              <div style="position:relative;z-index:1;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:12px;">
                  <div>
                    <div style="font-weight:700;font-size:15px;color:#ffffff;margin-bottom:6px;line-height:1.35;">${pillar.pillarName || 'Pillar'}</div>
                    <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:${accent}28;border:1px solid ${accent}77;border-radius:12px;font-size:11px;font-weight:700;color:${accent};">
                      ${statusIcon} ${statusText}
                    </div>
                  </div>
                  <div style="font-size:28px;font-weight:800;color:#ffffff;line-height:1;text-shadow:0 0 18px ${accent}aa; flex: 0 0 auto;min-width: 45px;white-space: nowrap;">
                    ${score.toFixed(0)}
                  </div>
                </div>
                <div style="margin-bottom:4px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;color:#8FA3B5;">
                    <span>Score</span>
                    <span style="color:${accent};font-size:13px;font-weight:800;text-shadow:0 0 10px ${accent}88;">${score.toFixed(1)}</span>
                  </div>
                  <div style="width:100%;height:10px;background:rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;position:relative;border:1px solid rgba(197,160,90,0.18);">
                    <div style="width:${barWidth}%;height:100%;background:linear-gradient(90deg, ${accent} 0%, ${accent}ee 100%);border-radius:10px;box-shadow:0 0 12px ${accent}99;"></div>
                  </div>
                </div>
              </div>
            </div>`;
        },
      },
      legend: { show: false },
    };
  }

  private buildRadialChart(): Partial<RadialChartOptions> {
    const pillarCount = this.aiPillars?.length ?? 0;
    const avgFromPillars =
      pillarCount > 0
        ? this.aiPillars.reduce((sum, x) => sum + Number(x.aiValue ?? 0), 0) / pillarCount
        : null;
    const rawScore = Number(avgFromPillars ?? this.countryHistory?.overallVitalityScore ?? 0);
    const score = Math.max(0, Math.min(100, Number(rawScore.toFixed(1))));

    return {
      series: [score],
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
          startAngle: -135,
          endAngle: 135,
          hollow: {
            margin: 0,
            size: '62%',
            background: 'transparent',
          },
          track: {
            background: HS_CHART.hollow,
            strokeWidth: '100%',
            margin: 0,
          },
          dataLabels: {
            show: true,
            name: {
              show: true,
              offsetY: -12,
              color: HS_CHART.textMuted,
              fontSize: '13px',
            },
            value: {
              show: true,
              offsetY: 8,
              color: HS_CHART.text,
              fontSize: '28px',
              fontWeight: 700,
              formatter: (value: number) => `${Number(value).toFixed(1)}`,
            },
            total: { show: false },
          },
        },
      },
      colors: [HS_CHART.primary],
      labels: ['Score'],
      legend: { show: false },
    };
  }

  private truncateCategories(names: string[]): string[] {
    const used = new Set<string>();
    return names.map((name) => {
      if (!name) return '';
      const words = name.trim().split(/\s+/);
      let label = '';
      for (let i = 1; i <= words.length; i++) {
        const candidate = i < words.length ? words.slice(0, i).join(' ') : words.join(' ');
        if (!used.has(candidate)) {
          label = candidate + (i < words.length ? '…' : '');
          used.add(candidate);
          break;
        }
      }
      return label || `${words[0]}…`;
    });
  }

  goToCountryAnalysis(): void {
    const queryParams: any = {};
    if (Number(this.selectedCountryID) > 0) {
      queryParams.countryID = this.selectedCountryID;
      queryParams.year = this.selectedYear;
    }
    this.router.navigate(['/countryuser/ai/country-analysis'], { queryParams });
  }

  exportAiScores(): void {
    const country = this.countries.find((x) => x.countryID == this.selectedCountryID);
    if (this.aiPillars.length && country) {
      const exportData = this.aiPillars.map((x) => ({
        CountryName: country.countryName,
        Year: this.selectedYear,
        PillarName: x.pillarName,
        Score: Number(x.aiValue ?? 0).toFixed(2),
      }));
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning('Please select country to export the records');
    }
  }

  getAllPillars(): void {
    this.countryUserService.getAllPillars().subscribe({
      next: (res) => {
        this.pillars = res.result ?? [];
      },
    });
  }

  openDialog(): void {
    setTimeout(() => {
      const modalEl = document.getElementById('exampleModal');
      if (!modalEl) return;
      let modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl);
      }
      modalInstance.show();
    }, 100);
  }

  closeModal(): void {
    this.loading = false;
    const homeTab = document.querySelector('#pills-home-tab') as HTMLElement;
    if (homeTab) homeTab.click();
    const modalEl = document.getElementById('exampleModal');
    if (!modalEl) return;
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }

  selectedKpisLayers(event: any): void {
    this.loading = true;
    this.countryUserService.addCountryUserKpisCountryAndPillar(event).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.succeeded) {
          this.closeModal();
          this.toaster.showSuccess('Access granted successfully');
          this.ngOnInit();
        } else {
          this.toaster.showWarning('Access may not granted. Please try again');
        }
      },
      error: () => {
        this.toaster.showError('Something went wrong');
        this.loading = false;
      },
    });
  }
}
