import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { ClientService } from '../../client.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { CommonService } from 'src/app/core/services/common.service';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { ProgramHistoryDto } from 'src/app/core/models/ProgramHistoryDto';
import { UserRole } from 'src/app/core/enums/UserRole';
import { AiProgramPillarVM } from 'src/app/core/models/aiVm/AiProgramPillarResponseDto';
import { AiProgramSummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestPdfDto';
import { DashboardModeResponseDto } from 'src/app/core/models/ProgramSignalDashboardDto';
import { ProgramPillarDashboardPillarValueDto } from 'src/app/core/models/AiProgramPillarDashboardResponseDto';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import {
  PulseIndexHero,
  PulseKpiCard,
  PulseKpiTab,
  PulseSummaryCard,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard.models';
import {
  PULSE_THEME,
  PulseAreaChartOptions,
  PulseRadialChartOptions,
  buildPulseKpiCards,
  buildPulsePillarAreaChart,
  getSignalAiScore,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-chart.util';
import {
  PULSE_KPI_TABS,
  closePulseKpiModal,
  formatPulseScore,
  openPulseKpiModal,
  pulseConditionClass,
  pulseProgramSearchFn,
  pulseScoreProgress,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-ui.util';

@Component({
  selector: 'app-client-pulse-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgApexchartsModule, MatTooltipModule],
  templateUrl: './client-pulse-dashboard.component.html',
  styleUrl: '../../../../shared/pulse-insight-dashboard/pulse-dashboard.shared.css',
  encapsulation: ViewEncapsulation.None,
})
export class ClientPulseDashboardComponent implements OnInit {
  readonly kpiTabs = PULSE_KPI_TABS;
  readonly customSearchFn = pulseProgramSearchFn;
  readonly formatScore = formatPulseScore;
  readonly scoreProgress = pulseScoreProgress;
  readonly conditionClass = pulseConditionClass;

  isPageLoader = false;
  isKpiLoader = false;
  programs: ProgramVM[] = [];
  selectedPrograms: number | '' | null = '';
  programHistory: ProgramHistoryDto | null = null;
  modeDashboard: DashboardModeResponseDto | null = null;
  aiPillars: ProgramPillarDashboardPillarValueDto[] = [];
  activeKpiTab: PulseKpiTab = 'ambitionDelivery';
  selectedKpi: PulseKpiCard | null = null;
  aiProgress: number | null = null;
  summaryCards: PulseSummaryCard[] = [];
  kpiCards: PulseKpiCard[] = [];
  indexHero: PulseIndexHero | null = null;
  pillarChartOptions: Partial<PulseAreaChartOptions> | null = null;
  radialChartOptions: Partial<PulseRadialChartOptions> | null = null;

  private readonly kpiModalId = 'clientPulseKpiDetailModal';

  constructor(
    private clientService: ClientService,
    private toaster: ToasterService,
    public commonService: CommonService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isPageLoader = true;
    this.getClientPrograms();
  }

  getClientPrograms(): void {
    this.clientService.getClientPrograms().subscribe({
      next: (res) => {
        this.isPageLoader = false;
        if (res.succeeded) {
          this.programs = res.result ?? [];
          if (this.programs.length) {
            this.selectedPrograms = this.programs[0].climateProgramID;
            this.onProgramChanged();
          }
        } else {
          this.toaster.showWarning(res.errors?.[0] || 'Failed to load programs.');
        }
      },
      error: () => {
        this.isPageLoader = false;
        this.toaster.showError('Failed to load program list.');
      },
    });
  }

  onProgramChanged(): void {
    if (!this.selectedPrograms) return;
    this.activeKpiTab = 'ambitionDelivery';
    this.isPageLoader = true;
    this.loadAiPillars();
    this.loadModeDashboard(false);
  }

  setKpiTab(tab: PulseKpiTab): void {
    if (this.activeKpiTab === tab) return;
    this.activeKpiTab = tab;
    this.loadModeDashboard(true);
  }

  private loadAiPillars(): void {
    const request: AiProgramSummeryRequestPdfDto = {
      climateProgramID: Number(this.selectedPrograms),
    };

    this.clientService.getAIProgramPillars(request).subscribe({
      next: (res) => {
        const pillars: AiProgramPillarVM[] = res.result?.pillars ?? [];
        this.aiProgress = res.result?.aiProgress ?? null;
        this.aiPillars = pillars.map((p, index) => ({
          pillarID: p.pillarID ?? index,
          pillarName: p.pillarName || `Pillar ${index + 1}`,
          displayOrder: p.displayOrder ?? index,
          evaluationValue: 0,
          aiValue: Number(p.aiProgress ?? 0),
        }));
        this.refreshDerivedViews();
      },
      error: () => {
        this.refreshDerivedViews();
      },
    });
  }

  private loadModeDashboard(sectionOnly: boolean): void {
    if (!this.selectedPrograms) {
      this.isPageLoader = false;
      this.isKpiLoader = false;
      return;
    }

    if (sectionOnly) {
      this.isKpiLoader = true;
    } else {
      this.isPageLoader = true;
    }

    this.getModeRequest(Number(this.selectedPrograms)).subscribe({
      next: (res) => {
        this.isPageLoader = false;
        this.isKpiLoader = false;
        this.modeDashboard = res.succeeded ? res.result : null;
        this.kpiCards = buildPulseKpiCards(this.modeDashboard, {
          showAi: true,
          showManual: false,
        });
        if (!this.aiPillars.length && this.modeDashboard) {
          const signals = this.modeDashboard.primarySignals?.length
            ? this.modeDashboard.primarySignals
            : this.modeDashboard.signals ?? [];
          this.aiPillars = signals.map((s, index) => ({
            pillarID: s.layerID || index,
            pillarName: s.name || s.layerName || s.code || `Signal ${index + 1}`,
            displayOrder: index,
            evaluationValue: 0,
            aiValue: Number(s.value ?? 0),
          }));
          this.refreshDerivedViews();
        } else {
          this.buildIndexHero();
        }
      },
      error: () => {
        this.isPageLoader = false;
        this.isKpiLoader = false;
        this.modeDashboard = null;
        this.kpiCards = [];
        this.buildIndexHero();
      },
    });
  }

  private getModeRequest(
    climateProgramID: number
  ): Observable<ResultResponseDto<DashboardModeResponseDto>> {
    if (this.activeKpiTab === 'diplomaticRisk') {
      return this.clientService.getDiplomaticRiskDashboard(climateProgramID);
    }
    if (this.activeKpiTab === 'institutionalReadiness') {
      return this.clientService.getReadinessScorecardDashboard(climateProgramID);
    }
    return this.clientService.getAmbitionDeliveryIndexDashboard(climateProgramID);
  }

  private refreshDerivedViews(): void {
    this.pillarChartOptions = buildPulsePillarAreaChart(this.aiPillars, {
      showAi: true,
      showManual: false,
      userRole: UserRole.ProgramUser,
    });
     this.radialChartOptions = this.buildPulseRadialChart(this.aiProgress);
    this.buildIndexHero();
  }

  private buildSummaryCards(): void {
    const h = this.programHistory;
    const programCount = this.programs?.length || h?.totalProgram || 0;
    this.summaryCards = [
      {
        title: 'Total Programs',
        value: programCount,
        subtitle: 'Your programs',
        icon: 'bi-buildings',
        accent: 'green',
      },
      {
        title: 'AI Finalized',
        value: h?.finalizeProgram ?? 0,
        subtitle: 'AI completed',
        icon: 'bi-cpu',
        accent: 'blue',
      },
      {
        title: 'AI Pending',
        value: h?.unFinalize ?? 0,
        subtitle: 'Awaiting review',
        icon: 'bi-hourglass-split',
        accent: 'teal',
      },
      {
        title: 'Access Programs',
        value: h?.totalAccessProgram ?? programCount,
        subtitle: 'Available access',
        icon: 'bi-globe2',
        accent: 'cyan',
      },
    ];
  }

  private buildIndexHero(): void {
    const program = this.programs?.find((p) => p.climateProgramID === this.selectedPrograms);
    const d = this.modeDashboard;
    const signals = d?.primarySignals?.length ? d.primarySignals : d?.signals ?? [];
    const vcpCard = this.kpiCards[0];
    const adgCard = this.kpiCards[1];
    const fcigCard = this.kpiCards[2];
    const vcpScore =
      vcpCard?.aiScore ??
      (d ? Number(d.aiProgramScore ?? d.vcp ?? 0) : null) ??
      (this.aiPillars.length > 0
        ? this.aiPillars.reduce((s, p) => s + Number(p.aiValue ?? 0), 0) / this.aiPillars.length
        : 0);
    const adgScore = adgCard?.aiScore ?? getSignalAiScore(signals[1]) ?? 0;
    const fcigScore = fcigCard?.aiScore ?? getSignalAiScore(signals[2]) ?? 0;
    const condition =
      d?.vcpCondition ||
      vcpCard?.condition ||
      (Number(vcpScore) >= 70 ? 'Stable' : Number(vcpScore) >= 40 ? 'Watch' : 'Critical');
    const fallbackMode =
      this.activeKpiTab === 'diplomaticRisk'
        ? 'DIPLOMATIC RISK & TRUST INDEX'
        : this.activeKpiTab === 'institutionalReadiness'
          ? 'INSTITUTIONAL READINESS SCORECARD'
          : 'AMBITION–DELIVERY INDEX';

    this.indexHero = {
      modeName: d?.modeName || fallbackMode,
      programLabel: program
        ? `${program.programName} · ${program.year || '—'} · ${program.location || '—'}`
        : 'Select a program',
      overallLabel: `Overall Score ${Number(vcpScore).toFixed(1)}/100 · ${condition}`,
      stats: [
        {
          label: vcpCard?.code || signals[0]?.code || signals[0]?.layerCode || 'VCP',
          value: Number(vcpScore).toFixed(1),
        },
        {
          label: adgCard?.code || signals[1]?.code || signals[1]?.layerCode || 'ADG',
          value: Number(adgScore).toFixed(1),
        },
        {
          label: fcigCard?.code || signals[2]?.code || signals[2]?.layerCode || 'FCIG',
          value: Number(fcigScore).toFixed(1),
        },
      ],
    };
  }

  openKpiDetails(kpi: PulseKpiCard, event?: Event): void {
    event?.stopPropagation();
    this.selectedKpi = kpi;
    openPulseKpiModal(this.kpiModalId);
  }

  closeKpiDetails(): void {
    closePulseKpiModal(this.kpiModalId);
    this.selectedKpi = null;
  }

  trackByTitle(_: number, item: PulseSummaryCard): string {
    return item.title;
  }

  trackByKpi(_: number, item: PulseKpiCard): string | number {
    return item.id;
  }

  goToProgramAnalysis(): void {
    const queryParams: any = {};
    if (Number(this.selectedPrograms) > 0) {
      queryParams.climateProgramID = this.selectedPrograms;
    }
    this.router.navigate(['/programuser/ai/program-analysis'], { queryParams });
  }

  exportAiScores(): void {
    const program = this.programs?.find((x) => x.climateProgramID == this.selectedPrograms);
    if (this.aiPillars.length && program) {
      const exportData = this.aiPillars.map((x) => ({
        ProgramName: program.programName,
        PillarName: x.pillarName,
        Score: Number(x.aiValue ?? 0).toFixed(2),
      }));
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning('Please select program to export the records');
    }
  }

  buildPulseRadialChart(aiProgress: number | null): Partial<PulseRadialChartOptions> {
    const score = Math.max(0, Math.min(100, Number(aiProgress ?? 0)));
    return {
      series: [score],
      chart: {
        height: 340,
        type: 'radialBar',
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: 'Poppins, system-ui, sans-serif',
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
            background: 'rgba(92, 140, 200, 0.12)',
            strokeWidth: '100%',
            margin: 0,
          },
          dataLabels: {
            show: true,
            name: {
              show: true,
              offsetY: -12,
              color: PULSE_THEME.textMuted,
              fontSize: '13px',
            },
            value: {
              show: true,
              offsetY: 8,
              color: PULSE_THEME.text,
              fontSize: '28px',
              fontWeight: 700,
              formatter: (value: number) => `${Number(value).toFixed(1)}`,
            },
            total: {
              show: false,
            },
          },
        },
      },
      colors: [PULSE_THEME.green],
      labels: ['Score'],
      legend: {
        show: false,
      },
    };
  }
}
