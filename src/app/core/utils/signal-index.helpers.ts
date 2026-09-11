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
import {
  DashboardInterpretationDto,
  DashboardModeResponseDto,
  DashboardQuestionScoreDto,
  SignalCardDto,
} from 'src/app/core/models/CountrySignalDashboardDto';
import { HS_CHART, HS_AXIS_STYLE } from 'src/app/core/constants/hs-chart-theme';

export type SignalTab = 'stress' | 'warning' | 'resilience';

export type GlanceBarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  grid: ApexGrid;
  colors: string[];
};

export type GlanceDonutChartOptions = {
  series: number[];
  chart: ApexChart;
  labels: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  colors: string[];
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
};

declare var bootstrap: any;

/** Shared Operational Intelligence (ROSEW) helpers used by role dashboards. */
export class SignalIndexHelpers {
  activeTab: SignalTab = 'stress';
  stressDashboard: DashboardModeResponseDto | null = null;
  warningDashboard: DashboardModeResponseDto | null = null;
  resilienceDashboard: DashboardModeResponseDto | null = null;
  selectedQuestion: DashboardQuestionScoreDto | null = null;
  interpretationConditions: DashboardInterpretationDto[] = [];
  glanceBarChartOptions: Partial<GlanceBarChartOptions> = {};
  glanceDonutChartOptions: Partial<GlanceDonutChartOptions> = {};
  signalLoading = false;

  private modalId: string;

  constructor(modalId = 'signalDetailModal') {
    this.modalId = modalId;
  }

  getActiveDashboard(): DashboardModeResponseDto | null {
    if (this.activeTab === 'stress') return this.stressDashboard;
    if (this.activeTab === 'warning') return this.warningDashboard;
    return this.resilienceDashboard;
  }

  getQuestions(dashboard: DashboardModeResponseDto | null): DashboardQuestionScoreDto[] {
    const signals = this.getSignals(dashboard);
    if (signals.length) {
      return signals.map((signal) => this.mapSignalToQuestion(signal));
    }
    return dashboard?.questions ?? [];
  }

  getSignals(dashboard: DashboardModeResponseDto | null): SignalCardDto[] {
    if (!dashboard) return [];
    return dashboard.signals ?? [];
  }

  private mapSignalToQuestion(signal: SignalCardDto): DashboardQuestionScoreDto {
    return {
      questionID: signal.layerID,
      questionDescription: signal.layerName || signal.name,
      aiScore: signal.aiValue ?? null,
      evaluationScore: signal.manualValue ?? null,
      aiUpdatedAt: signal.aiUpdatedAt ?? null,
      manualUpdatedAt: signal.manualUpdatedAt ?? null,
      aiTotalScore: null,
      aiTotalAns: null,
      aiTotalNA: null,
      aiTotalUnknown: null,
      condition: signal.aiCondition,
      conditionDescription: signal.aiDescriptor,
      manualCondition: signal.manualCondition,
      manualDescriptor: signal.manualDescriptor,
      layerCode: signal.layerCode || signal.code,
      isAlert: signal.isAlert,
    };
  }

  hasScore(score: number | null | undefined): boolean {
    return score !== null && score !== undefined;
  }

  formatScore(score: number | null | undefined): string {
    if (!this.hasScore(score)) return 'NA';
    return Number(score).toFixed(1);
  }

  getConditionClass(score: number | null | undefined): string {
    if (!this.hasScore(score)) return 'no-data';
    const value = Number(score);
    if (value >= 80) return 'stable';
    if (value >= 60) return 'low';
    if (value >= 40) return 'watch';
    if (value >= 20) return 'elevated';
    return 'critical';
  }

  isAlertQuestion(question: DashboardQuestionScoreDto): boolean {
    if (question.isAlert) return true;
    if (this.isStaleUnverified(question.aiUpdatedAt)) return false;
    const condition = (
      question.condition ||
      this.getInterpretationConditionByScore(question.aiScore).condition ||
      ''
    ).toLowerCase();
    return (
      condition.includes('critical') ||
      condition.includes('elevated') ||
      condition.includes('high') ||
      condition.includes('watch') ||
      condition.includes('fragile')
    );
  }

  getSignalProgress(score: number | null | undefined): number {
    if (!this.hasScore(score)) return 0;
    return Math.max(0, Math.min(100, Number(score)));
  }

  getAverageScore(dashboard: DashboardModeResponseDto | null): number | null {
    const countryScore = dashboard?.aiCountryScore ?? dashboard?.ami;
    if (this.hasScore(countryScore)) return Number(countryScore);
    const scores = this.getQuestions(dashboard)
      .map((q) => q.aiScore)
      .filter((score): score is number => this.hasScore(score));
    if (!scores.length) return null;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  getReportingCount(dashboard: DashboardModeResponseDto | null): number {
    return this.getQuestions(dashboard).filter((q) => this.hasScore(q.aiScore)).length;
  }

  getTotalQuestionCount(dashboard: DashboardModeResponseDto | null): number {
    return this.getQuestions(dashboard).length;
  }

  private getDaysSince(date: Date | string | null | undefined): number | null {
    if (!date) return null;
    const updatedDate = new Date(date);
    const today = new Date();
    return Math.floor((today.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  getLastVerifiedLabel(date: Date | string | null | undefined): string {
    const days = this.getDaysSince(date);
    if (days === null) return 'Updated : N/A';
    if (days <= 0) return 'Updated today';
    if (days === 1) return 'Updated 1 day ago';
    return `Updated ${days} days ago`;
  }

  getLastVerifiedShort(date: Date | string | null | undefined): string {
    const days = this.getDaysSince(date);
    if (days === null) return 'N/A';
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  isCarriedForward(date: Date | string | null | undefined): boolean {
    const days = this.getDaysSince(date);
    return days !== null && days >= 7;
  }

  isStaleUnverified(date: Date | string | null | undefined): boolean {
    const days = this.getDaysSince(date);
    return days !== null && days >= 21;
  }

  getDisplayCondition(
    score: number | null | undefined,
    updatedAt: Date | string | null | undefined,
    question?: DashboardQuestionScoreDto,
    kind: 'ai' | 'manual' = 'ai'
  ) {
    if (this.hasScore(score) && this.isStaleUnverified(updatedAt)) {
      return {
        condition: 'Stale / Unverified',
        description: 'Score is carried forward from older evidence; treat as unverified until refreshed.',
      };
    }
    if (question) {
      const condition = kind === 'manual' ? question.manualCondition : question.condition;
      const description = kind === 'manual' ? question.manualDescriptor : question.conditionDescription;
      if (condition) {
        return { condition, description: description || '' };
      }
    }
    return this.getInterpretationConditionByScore(score);
  }

  getDisplayConditionClass(
    score: number | null | undefined,
    updatedAt: Date | string | null | undefined,
    question?: DashboardQuestionScoreDto,
    kind: 'ai' | 'manual' = 'ai'
  ): string {
    if (this.hasScore(score) && this.isStaleUnverified(updatedAt)) return 'stale';
    if (question) {
      const condition = kind === 'manual' ? question.manualCondition : question.condition;
      if (condition) return this.getConditionClassFromLabel(condition);
    }
    return this.getConditionClass(score);
  }

  getQuestionName(question: DashboardQuestionScoreDto): string {
    return question.questionDescription;
  }

  getQuestionIconClass(question: DashboardQuestionScoreDto): string {
    const value = (question.questionDescription || '').toLowerCase();
    if (value.includes('fever') || value.includes('respiratory') || value.includes('disease')) return 'bi-virus';
    if (value.includes('icu') || value.includes('ventilator') || value.includes('emergency')) return 'bi-hospital';
    if (value.includes('rain') || value.includes('flood') || value.includes('heat') || value.includes('drought')) return 'bi-cloud-rain-heavy';
    if (value.includes('vaccin') || value.includes('medicine') || value.includes('stock')) return 'bi-capsule';
    if (value.includes('ambulance') || value.includes('continuity')) return 'bi-truck';
    if (value.includes('lab') || value.includes('movement')) return 'bi-radar';
    return 'bi-graph-up-arrow';
  }

  getQuestionAccentClass(question: DashboardQuestionScoreDto): string {
    const score = question.aiScore;
    if (!this.hasScore(score)) return 'accent-default';
    if (Number(score) <= 40) return 'accent-alert';
    if (Number(score) <= 60) return 'accent-warning';
    return 'accent-cohesion';
  }

  getTabIcon(tab: SignalTab): string {
    const icons: Record<SignalTab, string> = {
      stress: 'bi-speedometer2',
      warning: 'bi-bell',
      resilience: 'bi-bar-chart-steps',
    };
    return icons[tab];
  }

  getTabLabel(tab: SignalTab): string {
    const labels: Record<SignalTab, string> = {
      stress: 'Market System Stress Test',
      warning: 'Strategic Early Warning',
      resilience: 'Market System Resilience Scorecard',
    };
    return labels[tab];
  }

  getOutlookLines(dashboard: DashboardModeResponseDto | null): string[] {
    const alertCount = this.getQuestions(dashboard).filter((q) => this.isAlertQuestion(q)).length;
    if (!dashboard) return [];
    if (alertCount >= 4) return ['Escalation watch: multiple indicators are in elevated or critical range.'];
    if (alertCount >= 2) return ['Cautionary watch: monitor highlighted indicators closely.'];
    return ['Stable watch: no major escalation detected across mapped indicators.'];
  }

  getInterpretationConditionByScore(score: number | null | undefined) {
    if (score === null || score === undefined || !this.interpretationConditions?.length) {
      return { condition: 'No Data', description: 'No interpretation available.' };
    }
    const match = this.interpretationConditions.find(
      (x) => score >= (x.minRange ?? 0) && score <= (x.maxRange ?? 100)
    );
    return {
      condition: match?.condition ?? 'No Data',
      description: match?.description ?? 'No interpretation available.',
    };
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  updateGlanceCharts(dashboard: DashboardModeResponseDto | null): void {
    const questions = this.getQuestions(dashboard);
    const categories = questions.map((q) => this.truncateLabel(q.layerCode || q.questionDescription || `Q${q.questionID}`, 22));
    const scores = questions.map((q) => (this.hasScore(q.aiScore) ? Number(q.aiScore) : 0));
    const barColors = questions.map((q) => {
      if (!this.hasScore(q.aiScore)) return '#7A8A9A';
      const score = Number(q.aiScore);
      if (score <= 40) return '#B5502E';
      if (score <= 60) return '#C5A05A';
      if (score <= 80) return '#D4B86A';
      return '#B8C5D0';
    });

    this.glanceBarChartOptions = {
      series: [{ name: 'Score', data: scores }],
      chart: {
        type: 'bar',
        height: 500,
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif',
        background: 'transparent',
        animations: { enabled: true, speed: 800 },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '62%',
          distributed: true,
          dataLabels: { position: 'top' },
        },
      },
      colors: barColors,
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts: any) => {
          const q = questions[opts.dataPointIndex];
          return this.hasScore(q?.aiScore) ? Number(val).toFixed(1) : 'N/A';
        },
        offsetX: 24,
        style: { fontSize: '11px', fontWeight: 700, colors: [HS_CHART.text] },
      },
      xaxis: {
        categories,
        max: 100,
        labels: {
          style: HS_AXIS_STYLE.xaxisLabels.style,
          formatter: (v: string) => v,
        },
        axisBorder: { color: HS_CHART.border },
      },
      yaxis: {
        labels: {
          style: { ...HS_AXIS_STYLE.yaxisLabels.style, fontSize: '12px' },
        },
      },
      grid: {
        borderColor: HS_CHART.grid,
        strokeDashArray: 4,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
      },
      legend: { show: false },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number, opts: any) => {
            const q = questions[opts.dataPointIndex];
            if (!this.hasScore(q?.aiScore)) return 'No data';
            return `${Number(val).toFixed(1)} / 100`;
          },
        },
      },
      stroke: { width: 0 },
    };

    const conditionMap = new Map<string, number>();
    let noDataCount = 0;
    questions.forEach((q) => {
      if (!this.hasScore(q.aiScore)) {
        noDataCount++;
        return;
      }
      const key = this.getDisplayCondition(q.aiScore, q.aiUpdatedAt, q).condition || 'Stable';
      conditionMap.set(key, (conditionMap.get(key) ?? 0) + 1);
    });
    if (noDataCount > 0) conditionMap.set('No Data', noDataCount);

    const donutLabels = Array.from(conditionMap.keys());
    const donutSeries = Array.from(conditionMap.values());
    const donutColors = donutLabels.map((label) => this.getConditionColor(label));

    this.glanceDonutChartOptions = {
      series: donutSeries.length ? donutSeries : [1],
      labels: donutLabels.length ? donutLabels : ['No indicators'],
      chart: {
        type: 'donut',
        height: 500,
        fontFamily: 'Inter, sans-serif',
        background: 'transparent',
      },
      colors: donutColors.length ? donutColors : ['#7A8A9A'],
      legend: {
        position: 'bottom',
        fontSize: '12px',
        fontWeight: 600,
        labels: { colors: HS_CHART.textMuted },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${Math.round(val)}%`,
        style: { fontSize: '11px', fontWeight: 700 },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '62%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Indicators',
                fontSize: '13px',
                fontWeight: 600,
                color: HS_CHART.textMuted,
                formatter: () => `${questions.length}`,
              },
            },
          },
        },
      },
      tooltip: {
        theme: 'dark',
        y: { formatter: (val: number) => `${val} indicator(s)` },
      },
    };
  }

  private getConditionClassFromLabel(condition: string): string {
    const value = (condition || '').toLowerCase();
    if (!value || value.includes('no data')) return 'no-data';
    if (value.includes('stale')) return 'stale';
    if (value.includes('very low load') || value.includes('very low drag') || value.includes('light-touch')) return 'stable';
    if (
      value.includes('high liquidity') ||
      value.includes('high resilience') ||
      value.includes('high credibility') ||
      value.includes('high predictability') ||
      value.includes('enabling') ||
      value.includes('well protected') ||
      value.includes('exit viable')
    ) {
      return 'stable';
    }
    if (
      value.includes('critical') ||
      value.includes('fragile') ||
      value.includes('extreme') ||
      value.includes('predatory') ||
      value.includes('arbitrary') ||
      value.includes('non-operable') ||
      value.includes('high drag') ||
      value.includes('very low')
    ) {
      return 'critical';
    }
    if (value.includes('elevated') || value.includes('punitive') || value.includes('high')) return 'elevated';
    if (value.includes('watch') || value.includes('moderate') || value.includes('developing') || value.includes('mixed') || value.includes('constrained')) {
      return 'watch';
    }
    if (value.includes('stable') || value.includes('secure') || value.includes('operable') || value.includes('reliable')) return 'low';
    if (value.includes('strong')) return 'stable';
    return 'watch';
  }

  private truncateLabel(value: string, max: number): string {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
  }

  private getConditionColor(condition: string): string {
    const value = condition.toLowerCase();
    if (value.includes('no data') || value.includes('stale')) return '#7A8A9A';
    if (value.includes('critical') || value.includes('fragile')) return '#B5502E';
    if (value.includes('elevated') || value.includes('high')) return '#C46A3A';
    if (value.includes('watch') || value.includes('developing')) return '#C5A05A';
    if (value.includes('stable')) return '#D4B86A';
    if (value.includes('strong')) return '#B8C5D0';
    return HS_CHART.primarySoft;
  }

  openQuestionDetails(question: DashboardQuestionScoreDto): void {
    this.selectedQuestion = question;
    document.querySelectorAll('body > .modal-backdrop').forEach((el) => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');

    setTimeout(() => {
      const modalEl = document.getElementById(this.modalId) as HTMLElement | null;
      if (!modalEl) return;
      if (modalEl.parentElement !== document.body) {
        document.body.appendChild(modalEl);
      }
      let modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl, {
          backdrop: true,
          keyboard: true,
          focus: true,
        });
      }
      const onHidden = () => {
        this.selectedQuestion = null;
        document.querySelectorAll('body > .modal-backdrop').forEach((el) => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        modalEl.removeEventListener('hidden.bs.modal', onHidden);
      };
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
      modalEl.addEventListener('hidden.bs.modal', onHidden);
      modalInstance.show();
    }, 30);
  }

  closeQuestionDetails(): void {
    const modalEl = document.getElementById(this.modalId);
    if (!modalEl) {
      this.selectedQuestion = null;
      return;
    }
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
      modalInstance.hide();
    } else {
      this.selectedQuestion = null;
      document.querySelectorAll('body > .modal-backdrop').forEach((el) => el.remove());
      document.body.classList.remove('modal-open');
    }
  }
}
