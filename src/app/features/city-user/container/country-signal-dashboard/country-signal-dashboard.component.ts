import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
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
import {
  DashboardModeResponseDto,
  SignalCardDto,
} from 'src/app/core/models/CountrySignalDashboardDto';
import { CountryHistoryDto } from 'src/app/core/models/countryHistoryDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { AiCountrySummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiCountrySummeryRequestPdfDto';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { HS_CHART } from 'src/app/core/constants/hs-chart-theme';
import { CommonService } from 'src/app/core/services/common.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { CountryUserService } from '../../country-user.service';

declare var bootstrap: any;

type SignalTab = 'stress' | 'warning' | 'resilience';

interface CountryKpiCard {
  id: number;
  code: string;
  name: string;
  description: string;
  aiScore: number | null;
  condition: string;
  interpretation: string;
  icon: string;
  isAlert: boolean;
  aiUpdatedAt: Date | string | null;
}

interface CountryIndexHero {
  modeName: string;
  countryLabel: string;
  overallLabel: string;
  stats: { label: string; value: string }[];
}

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
  readonly kpiTabs: { id: SignalTab; label: string; icon: string }[] = [
    { id: 'stress', label: 'Market System Stress Test', icon: 'bi-speedometer2' },
    { id: 'warning', label: 'Strategic Early Warning', icon: 'bi-bell' },
    { id: 'resilience', label: 'Market System Resilience Scorecard', icon: 'bi-bar-chart-steps' },
  ];

  selectedYear = new Date().getFullYear();
  countries: CountryVM[] = [];
  selectedCountryID: number | null = null;
  countryHistory: CountryHistoryDto | null = null;
  modeDashboard: DashboardModeResponseDto | null = null;
  aiPillars: { pillarID: number; pillarName: string; aiValue: number }[] = [];
  activeKpiTab: SignalTab = 'stress';
  selectedKpi: CountryKpiCard | null = null;
  kpiCards: CountryKpiCard[] = [];
  indexHero: CountryIndexHero | null = null;
  pillarChartOptions: Partial<AreaChartOptions> | null = null;
  radialChartOptions: Partial<RadialChartOptions> | null = null;

  isLoader = false;
  isKpiLoader = false;
  loading = false;
  chooseKpisLayers = false;
  pillars: PillarsVM[] = [];
  tier: TieredAccessPlanValue = TieredAccessPlanValue.Pending;

  private readonly kpiModalId = 'countryUserKpiDetailModal';

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
    this.activeKpiTab = 'stress';
    this.loadAiPillars();
    this.loadModeDashboard(false);
  }

  yearChanged(): void {
    if (!this.selectedCountryID) return;
    this.loadAiPillars();
    this.loadModeDashboard(false);
  }

  setKpiTab(tab: SignalTab): void {
    if (this.activeKpiTab === tab) return;
    this.activeKpiTab = tab;
    this.loadModeDashboard(true);
  }

  getTabIcon(tab: SignalTab): string {
    return this.kpiTabs.find((item) => item.id === tab)?.icon ?? 'bi-speedometer2';
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

  private loadModeDashboard(sectionOnly: boolean): void {
    if (!this.selectedCountryID) {
      this.isLoader = false;
      this.isKpiLoader = false;
      return;
    }

    if (sectionOnly) {
      this.isKpiLoader = true;
    } else {
      this.isLoader = true;
    }

    this.getModeRequest(this.selectedCountryID).subscribe({
      next: (res) => {
        this.isLoader = false;
        this.isKpiLoader = false;
        this.modeDashboard = res.succeeded ? res.result : null;
        this.kpiCards = this.buildKpiCards(this.modeDashboard);
        if (!this.aiPillars.length && this.modeDashboard) {
          const signals = this.getSignals(this.modeDashboard);
          this.aiPillars = signals.map((s, index) => ({
            pillarID: s.layerID || index,
            pillarName: s.name || s.layerName || s.code || `Signal ${index + 1}`,
            aiValue: Number(s.aiValue ?? 0),
          }));
          this.refreshDerivedViews();
        } else {
          this.buildIndexHero();
        }
      },
      error: () => {
        this.isLoader = false;
        this.isKpiLoader = false;
        this.modeDashboard = null;
        this.kpiCards = [];
        this.buildIndexHero();
      },
    });
  }

  private getModeRequest(countryID: number): Observable<ResultResponseDto<DashboardModeResponseDto>> {
    const year = Number(this.selectedYear);
    if (this.activeKpiTab === 'warning') {
      return this.countryUserService.getEarlyWarningDashboard(countryID, year);
    }
    if (this.activeKpiTab === 'resilience') {
      return this.countryUserService.getResilienceScorecard(countryID, year);
    }
    return this.countryUserService.getPeaceStressTestDashboard(countryID, year);
  }

  private refreshDerivedViews(): void {
    this.pillarChartOptions = this.buildAreaChart();
    this.radialChartOptions = this.buildRadialChart();
    this.buildIndexHero();
  }

  private getSignals(dashboard: DashboardModeResponseDto | null): SignalCardDto[] {
    if (!dashboard) return [];
    if (dashboard.primarySignals?.length) {
      return [...dashboard.primarySignals, ...(dashboard.secondarySignals ?? [])];
    }
    return dashboard.signals ?? [];
  }

  private buildKpiCards(dashboard: DashboardModeResponseDto | null): CountryKpiCard[] {
    if (!dashboard) return [];
    const signals = this.getSignals(dashboard);
    if (signals.length) {
      return signals.map((s, index) => ({
        id: s.layerID || index,
        code: s.code || s.layerCode || `KPI-${index + 1}`,
        name: s.name || s.layerName || `Indicator ${index + 1}`,
        description: s.description || '',
        aiScore: this.hasScore(s.aiValue) ? Number(s.aiValue) : null,
        condition: s.aiCondition || this.conditionFromScore(s.aiValue),
        interpretation: s.aiDescriptor || s.aiInterpretationValue || '',
        icon: this.kpiIcon(s.code || s.layerName || s.name),
        isAlert: !!s.isAlert,
        aiUpdatedAt: s.aiUpdatedAt,
      }));
    }
    return (dashboard.questions ?? []).map((q, index) => ({
      id: q.questionID || index,
      code: q.layerCode || `Q-${index + 1}`,
      name: q.questionDescription || `Indicator ${index + 1}`,
      description: q.questionDescription || '',
      aiScore: this.hasScore(q.aiScore) ? Number(q.aiScore) : null,
      condition: q.condition || this.conditionFromScore(q.aiScore),
      interpretation: q.conditionDescription || '',
      icon: this.kpiIcon(q.layerCode || q.questionDescription),
      isAlert: !!q.isAlert,
      aiUpdatedAt: q.aiUpdatedAt,
    }));
  }

  private buildIndexHero(): void {
    const country = this.countries.find((c) => c.countryID === this.selectedCountryID);
    const d = this.modeDashboard;
    const first = this.kpiCards[0];
    const second = this.kpiCards[1];
    const third = this.kpiCards[2];
    const overall =
      first?.aiScore ??
      (d ? Number(d.aiCountryScore ?? d.ami ?? 0) : null) ??
      (this.aiPillars.length
        ? this.aiPillars.reduce((sum, p) => sum + Number(p.aiValue ?? 0), 0) / this.aiPillars.length
        : 0);
    const condition =
      d?.amiCondition ||
      first?.condition ||
      (Number(overall) >= 70 ? 'Stable' : Number(overall) >= 40 ? 'Watch' : 'Critical');
    const fallbackMode =
      this.kpiTabs.find((t) => t.id === this.activeKpiTab)?.label || 'Market System Stress Test';

    this.indexHero = {
      modeName: d?.modeName || fallbackMode,
      countryLabel: country
        ? `${country.countryName}${country.continent ? ' · ' + country.continent : ''} · ${this.selectedYear}`
        : 'Select a country',
      overallLabel: `Overall Score ${Number(overall).toFixed(1)}/100 · ${condition}`,
      stats: [
        { label: first?.code || 'HS', value: Number(overall).toFixed(1) },
        { label: second?.code || 'IND-2', value: Number(second?.aiScore ?? 0).toFixed(1) },
        { label: third?.code || 'IND-3', value: Number(third?.aiScore ?? 0).toFixed(1) },
      ],
    };
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

  hasScore(score: number | null | undefined): boolean {
    return score !== null && score !== undefined;
  }

  formatScore(score: number | null | undefined): string {
    if (!this.hasScore(score)) return 'N/A';
    return Number(score).toFixed(1);
  }

  scoreProgress(score: number | null | undefined): number {
    if (!this.hasScore(score)) return 0;
    return Math.max(0, Math.min(100, Number(score)));
  }

  conditionClass(condition?: string | null): string {
    const value = (condition || '').toLowerCase();
    if (value.includes('critical') || value.includes('fragile')) return 'critical';
    if (value.includes('elevated') || value.includes('high')) return 'elevated';
    if (value.includes('watch') || value.includes('developing') || value.includes('moderate')) return 'watch';
    return 'stable';
  }

  private conditionFromScore(score: number | null | undefined): string {
    if (!this.hasScore(score)) return 'No Data';
    const value = Number(score);
    if (value >= 70) return 'Stable';
    if (value >= 40) return 'Watch';
    return 'Critical';
  }

  private kpiIcon(value?: string): string {
    const text = (value || '').toLowerCase();
    if (text.includes('stress') || text.includes('shock')) return 'bi-speedometer2';
    if (text.includes('warn') || text.includes('risk') || text.includes('alert')) return 'bi-bell';
    if (text.includes('resilien') || text.includes('ready')) return 'bi-shield-check';
    if (text.includes('market') || text.includes('trade')) return 'bi-graph-up-arrow';
    return 'bi-broadcast';
  }

  openKpiDetails(kpi: CountryKpiCard, event?: Event): void {
    event?.stopPropagation();
    this.selectedKpi = kpi;
    setTimeout(() => {
      const modalEl = document.getElementById(this.kpiModalId);
      if (!modalEl) return;
      let modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl);
      }
      modalInstance.show();
    }, 40);
  }

  closeKpiDetails(): void {
    const modalEl = document.getElementById(this.kpiModalId);
    if (modalEl) {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    }
    this.selectedKpi = null;
  }

  trackByKpi(_: number, item: CountryKpiCard): number | string {
    return item.id;
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
