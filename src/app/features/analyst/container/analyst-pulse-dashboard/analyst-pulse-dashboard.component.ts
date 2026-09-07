import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { AnalystService } from '../../analyst.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { CommonService } from 'src/app/core/services/common.service';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import {
  GetProgramsSubmitionHistoryResponseDto,
  ProgramHistoryDto,
  UserProgramRequestDto,
} from 'src/app/core/models/ProgramHistoryDto';
import { AiProgramPillarDashboardResponseDto } from 'src/app/core/models/AiProgramPillarDashboardResponseDto';
import { DashboardModeResponseDto } from 'src/app/core/models/ProgramSignalDashboardDto';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import {
  PulseIndexHero,
  PulseKpiCard,
  PulseKpiTab,
  PulseSummaryCard,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard.models';
import {
  PulseAreaChartOptions,
  PulseLineChartOptions,
  PulseRadialChartOptions,
  buildPulseKpiCards,
  buildPulsePillarAreaChart,
  buildPulseProgressLineChart,
  buildPulseRadialChart,
  getSignalAiScore,
  getSignalManualScore,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-chart.util';
import {
  PULSE_KPI_TABS,
  closePulseKpiModal,
  formatPulseScore,
  isPulseGapScore,
  openPulseKpiModal,
  pulseConditionClass,
  pulseProgramSearchFn,
  pulseScoreProgress,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-ui.util';

@Component({
  selector: 'app-analyst-pulse-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgApexchartsModule, MatTooltipModule],
  templateUrl: './analyst-pulse-dashboard.component.html',
  styleUrl: '../../../../shared/pulse-insight-dashboard/pulse-dashboard.shared.css',
  encapsulation: ViewEncapsulation.None,
})
export class AnalystPulseDashboardComponent implements OnInit {
  readonly kpiTabs = PULSE_KPI_TABS;
  readonly customSearchFn = pulseProgramSearchFn;
  readonly formatScore = formatPulseScore;
  readonly scoreProgress = pulseScoreProgress;
  readonly isGapScore = isPulseGapScore;
  readonly conditionClass = pulseConditionClass;

  isPageLoader = false;
  isKpiLoader = false;
  programs: ProgramVM[] | null = [];
  selectedPrograms: number | '' | null = '';
  programHistory: ProgramHistoryDto | null = null;
  pillarResponse: AiProgramPillarDashboardResponseDto | null = null;
  modeDashboard: DashboardModeResponseDto | null = null;
  activeKpiTab: PulseKpiTab = 'ambitionDelivery';
  selectedKpi: PulseKpiCard | null = null;

  summaryCards: PulseSummaryCard[] = [];
  kpiCards: PulseKpiCard[] = [];
  indexHero: PulseIndexHero | null = null;
  pillarChartOptions: Partial<PulseAreaChartOptions> | null = null;
  radialChartOptions: Partial<PulseRadialChartOptions> | null = null;
  progressChartOptions: Partial<PulseLineChartOptions> | null = null;

  private readonly kpiModalId = 'analystPulseKpiDetailModal';

  constructor(
    private analystService: AnalystService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isPageLoader = true;
    this.getAllProgramsByUserId();
    this.getProgramHistory();
    this.getProgramsProgressByUserId();
  }

  getAllProgramsByUserId(): void {
    this.analystService.getAllProgramsByUserId(this.userService?.userInfo?.userID).subscribe({
      next: (res) => {
        this.programs = res.result;
        this.isPageLoader = false;
        if (this.programs?.length) {
          this.selectedPrograms = this.programs[0].climateProgramID;
          this.getProgramPillarHistory();
        }
      },
      error: () => {
        this.isPageLoader = false;
      },
    });
  }

  getProgramHistory(): void {
    this.analystService.getProgramHistory(this.userService?.userInfo?.userID ?? 0).subscribe({
      next: (res) => {
        this.programHistory = res.result;
        this.buildSummaryCards();
        this.radialChartOptions = buildPulseRadialChart(this.programHistory, 'full');
      },
    });
  }

  getProgramsProgressByUserId(): void {
    this.analystService.getProgramsProgressByUserId(this.userService?.userInfo?.userID ?? 0).subscribe({
      next: (res) => {
        if (res.succeeded && res.result?.length) {
          this.progressChartOptions = buildPulseProgressLineChart(
            res.result as GetProgramsSubmitionHistoryResponseDto[],
            { showAi: true, showManual: true }
          );
        }
      },
    });
  }

  getProgramPillarHistory(): void {
    if (!this.userService?.userInfo?.userID || !this.selectedPrograms) return;
    const request: UserProgramRequestDto = {
      userID: this.userService.userInfo.userID,
      climateProgramID: Number(this.selectedPrograms),
    };
    this.isPageLoader = true;
    this.analystService.getProgramPillarHistory(request).subscribe({
      next: (res) => {
        this.pillarResponse = res.result;
        this.refreshDerivedViews();
        this.loadModeDashboard(false);
      },
      error: () => {
        this.isPageLoader = false;
      },
    });
  }

  onProgramChange(): void {
    this.activeKpiTab = 'ambitionDelivery';
    this.getProgramPillarHistory();
  }

  setKpiTab(tab: PulseKpiTab): void {
    if (this.activeKpiTab === tab) return;
    this.activeKpiTab = tab;
    this.loadModeDashboard(true);
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
          showManual: true,
        });
        this.buildIndexHero();
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
      return this.analystService.getDiplomaticRiskDashboard(climateProgramID);
    }
    if (this.activeKpiTab === 'institutionalReadiness') {
      return this.analystService.getReadinessScorecardDashboard(climateProgramID);
    }
    return this.analystService.getAmbitionDeliveryIndexDashboard(climateProgramID);
  }

  private refreshDerivedViews(): void {
    const pillars = this.pillarResponse?.pillars ?? [];
    this.pillarChartOptions = buildPulsePillarAreaChart(pillars, { showAi: true, showManual: true });
    this.buildIndexHero();
  }

  private buildSummaryCards(): void {
    const h = this.programHistory;
    this.summaryCards = [
      {
        title: 'Total Programs',
        value: h?.totalProgram ?? 0,
        subtitle: 'Assigned Programs',
        icon: 'bi-buildings',
        accent: 'teal',
      },
      {
        title: 'Active',
        value: h?.activeProgram ?? 0,
        subtitle: 'In assessment',
        icon: 'bi-activity',
        accent: 'blue',
      },
      {
        title: 'In Progress',
        value: h?.inprocessProgram ?? 0,
        subtitle: 'Ongoing work',
        icon: 'bi-hourglass-split',
        accent: 'green',
      },
      {
        title: 'Completed',
        value: h?.compeleteProgram ?? 0,
        subtitle: 'Finished programs',
        icon: 'bi-check2-circle',
        accent: 'cyan',
      },
    ];
  }

  private buildIndexHero(): void {
    const program = this.programs?.find((p) => p.climateProgramID === this.selectedPrograms);
    const d = this.modeDashboard;
    const pillars = this.pillarResponse?.pillars ?? [];
    const vcpCard = this.kpiCards[0];
    const adgCard = this.kpiCards[1];
    const avgFromPillars =
      pillars.length > 0
        ? pillars.reduce((s, p) => s + (Number(p.aiValue ?? 0) + Number(p.evaluationValue ?? 0)) / 2, 0) /
          pillars.length
        : 0;
    const aiScore = vcpCard?.aiScore ?? (d ? Number(d.aiProgramScore ?? 0) : avgFromPillars);
    const manualScore =
      vcpCard?.manualScore ?? (d ? Number(d.manualProgramScore ?? d.manualValue ?? 0) : avgFromPillars);
    const aiCondition =
      d?.vcpCondition ||
      vcpCard?.aiCondition ||
      vcpCard?.condition ||
      (Number(aiScore) >= 70 ? 'Stable' : Number(aiScore) >= 40 ? 'Watch' : 'Critical');
    const signals = d?.primarySignals?.length ? d.primarySignals : d?.signals ?? [];
    const adgCode = adgCard?.code || signals[1]?.code || signals[1]?.layerCode || 'ADG';
    const adgAiScore = adgCard?.aiScore ?? getSignalAiScore(signals[1]) ?? 0;
    const adgManualScore = adgCard?.manualScore ?? getSignalManualScore(signals[1]) ?? 0;
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
      overallLabel: `AI ${Number(aiScore).toFixed(1)}/100 · Manual ${Number(manualScore).toFixed(1)}/100 · ${aiCondition}`,
      stats: [
        { label: 'AI Score', value: Number(aiScore).toFixed(1) },
        { label: 'Manual Score', value: Number(manualScore).toFixed(1) },
        {
          label: adgCode,
          value: Number(adgAiScore).toFixed(1),
        },
        {
          label: `${adgCode} Manual`,
          value: Number(adgManualScore).toFixed(1),
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
    this.router.navigate(['/analyst/ai/program-analysis'], { queryParams });
  }

  exportProgramPillar(): void {
    const program = this.programs?.find((x) => x.climateProgramID == this.selectedPrograms);
    if (this.pillarResponse?.pillars && program) {
      const exportData = this.pillarResponse.pillars.map((x) => ({
        programName: program.programName,
        PillarName: x.pillarName,
        AIScore: x.aiValue?.toFixed(2),
        EvaluationScore: x.evaluationValue?.toFixed(2),
      }));
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning('Please select program to export the records');
    }
  }
}
