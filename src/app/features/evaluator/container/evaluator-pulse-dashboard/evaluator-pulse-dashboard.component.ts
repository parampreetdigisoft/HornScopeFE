import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EvaluatorService } from '../../evaluator.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { CommonService } from 'src/app/core/services/common.service';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import {
  GetProgramQuestionHistoryResponseDto,
  ProgramHistoryDto,
  UserProgramRequestDto,
} from 'src/app/core/models/ProgramHistoryDto';
import { PulseSummaryCard } from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard.models';
import {
  PULSE_THEME,
  PulseAreaChartOptions,
  PulseRadialChartOptions,
  buildPulseRadialChart,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-chart.util';
import {
  formatPulseScore,
  isPulseGapScore,
  pulseConditionClass,
  pulseProgramSearchFn,
  pulseScoreProgress,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-ui.util';
import { ahiCompletionColor, ahiScoreColor, VCP_CHART } from 'src/app/core/constants/ahi-chart-theme';

@Component({
  selector: 'app-evaluator-pulse-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgApexchartsModule, MatTooltipModule],
  templateUrl: './evaluator-pulse-dashboard.component.html',
  styleUrl: '../../../../shared/pulse-insight-dashboard/pulse-dashboard.shared.css',
  encapsulation: ViewEncapsulation.None,
})
export class EvaluatorPulseDashboardComponent implements OnInit {
  readonly customSearchFn = pulseProgramSearchFn;
  readonly formatScore = formatPulseScore;
  readonly scoreProgress = pulseScoreProgress;
  readonly isGapScore = isPulseGapScore;
  readonly conditionClass = pulseConditionClass;

  isPageLoader = false;
  programs: ProgramVM[] | null = [];
  selectedPrograms: number | '' | null = '';
  programHistory: ProgramHistoryDto | null = null;
  questionHistory: GetProgramQuestionHistoryResponseDto | null = null;

  summaryCards: PulseSummaryCard[] = [];
  pillarChartOptions: Partial<PulseAreaChartOptions> | null = null;
  radialChartOptions: Partial<PulseRadialChartOptions> | null = null;

  constructor(
    private evaluatorService: EvaluatorService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.isPageLoader = true;
    this.getAllProgramsByUserId();
    this.getProgramHistory();
  }

  getAllProgramsByUserId(): void {
    this.evaluatorService.getAllProgramsByUserId(this.userService?.userInfo?.userID).subscribe({
      next: (res) => {
        this.isPageLoader = false;
        this.programs = res.result;
        if (this.programs?.length) {
          this.selectedPrograms = this.programs[0].climateProgramID;
          this.getProgramQuestionHistory();
        }
      },
      error: () => {
        this.isPageLoader = false;
      },
    });
  }

  getProgramHistory(): void {
    this.evaluatorService.getProgramHistory(this.userService?.userInfo?.userID ?? 0).subscribe({
      next: (res) => {
        this.programHistory = res.result;
        this.buildSummaryCards();
        this.radialChartOptions = buildPulseRadialChart(this.programHistory, 'simple');
      },
    });
  }

  getProgramQuestionHistory(): void {
    if (!this.userService?.userInfo?.userID || !this.selectedPrograms) return;
    const request: UserProgramRequestDto = {
      userID: this.userService.userInfo.userID,
      climateProgramID: Number(this.selectedPrograms),
    };
    this.isPageLoader = true;
    this.evaluatorService.getProgramQuestionHistory(request).subscribe({
      next: (res) => {
        this.questionHistory = res;
        this.buildPillarChartOptions(this.questionHistory);
        this.isPageLoader = false;
      },
      error: () => {
        this.pillarChartOptions = null;
        this.isPageLoader = false;
      },
    });
  }

  onProgramChange(): void {
    this.getProgramQuestionHistory();
  }

  private buildPillarChartOptions(history: GetProgramQuestionHistoryResponseDto | null): void {
    if (!history?.pillars?.length) {
      this.pillarChartOptions = null;
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

    this.pillarChartOptions = {
      series: [
        {
          name: 'Manual Score',
          data: seriesData,
        },
      ],
      chart: {
        type: 'bar',
        height: chartHeight,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
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
      colors: [...VCP_CHART.pillarBar],
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
            color: VCP_CHART.text,
          },
          offsetY: 0,
        },
        labels: {
          style: {
            fontSize: '12px',
            fontWeight: 600,
            colors: VCP_CHART.textMuted,
          },
          formatter: (value: string) => `${value}`,
        },
        axisBorder: {
          show: true,
          color: VCP_CHART.border,
          offsetY: 0,
        },
        axisTicks: {
          show: true,
          color: VCP_CHART.grid,
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
            colors: VCP_CHART.textMuted,
          },
          offsetX: -50,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      grid: {
        show: true,
        borderColor: VCP_CHART.grid,
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
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        },
        onDatasetHover: { highlightDataSeries: true },
        custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
          const meta = w.config.series[0].data[dataPointIndex].meta;
          const percentage = series[seriesIndex][dataPointIndex].toFixed(1);
          const completion = meta.completionRate.toFixed(1);
          const barColor = w.config.series[0].data[dataPointIndex].fillColor;
          const completionColor = ahiCompletionColor(Number(completion));
          const progressWidth = Math.min(completion, 100);

          return `
          <div style="background: ${PULSE_THEME.card}; border-radius: 12px; box-shadow: ${VCP_CHART.tooltipShadow}; overflow: hidden; border: 1px solid ${barColor}55; font-family: Poppins, sans-serif; min-width: 400px;">
            <div style="background: linear-gradient(135deg, ${barColor}cc 0%, ${barColor}88 100%); padding: 16px 20px; position: relative; overflow: hidden; min-height: 60px;">
              <div style="font-weight: 800; font-size: 15px; color: #ffffff; position: relative; z-index: 1; line-height: 1.5; word-wrap: break-word;">
                ${meta.pillarName}
              </div>
            </div>
            <div style="padding: 18px 20px; background: ${PULSE_THEME.card};">
              <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; padding: 12px; background: rgba(92, 140, 200, 0.08); border-radius: 8px; border: 1px solid ${VCP_CHART.border};">
                <span style="color: ${VCP_CHART.textMuted}; font-weight: 600; font-size: 13px; flex-shrink: 0;">Score</span>
                <span style="color: ${barColor}; font-weight: 900; font-size: 24px;">${percentage}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px; padding: 10px 12px; background: rgba(92, 140, 200, 0.06); border-left: 3px solid ${barColor}; border-radius: 6px;">
                <span style="color: ${VCP_CHART.textMuted}; font-weight: 600; font-size: 12px; flex-shrink: 0; white-space: nowrap;">Questions Answered</span>
                <span style="color: ${VCP_CHART.text}; font-weight: 700; font-size: 15px;">
                  ${meta.ansQuestion} / ${meta.totalQuestion}
                </span>
              </div>
              <div style="margin-top: 14px;">
                <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 8px;">
                  <span style="color: ${VCP_CHART.textMuted}; font-weight: 600; font-size: 12px; flex-shrink: 0; white-space: nowrap;">Completion Rate</span>
                  <span style="color: ${completionColor}; font-weight: 800; font-size: 16px; flex-shrink: 0;">${completion}%</span>
                </div>
                <div style="width: 100%; height: 10px; background: rgba(92, 140, 200, 0.15); border-radius: 12px; overflow: hidden;">
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
        truncated = suffixWord ? `${truncated}...${suffixWord.charAt(0).toLowerCase()}` : `${truncated}...`;
      } else if (firstWord.length > maxLength || words.length > 1) {
        truncated = `${truncated}...`;
      }

      shortNames.push(truncated);
    });

    return shortNames;
  }

  private getBarColor(scoreProgress: number, maxNumber: number): string {
    if (scoreProgress === 0) {
      return VCP_CHART.pillarBar[0];
    }
    const normalized = maxNumber > 0 ? (scoreProgress / maxNumber) * 100 : 0;
    return ahiScoreColor(normalized);
  }

  private buildSummaryCards(): void {
    const h = this.programHistory;
    this.summaryCards = [
      {
        title: 'Total Programs',
        value: h?.totalProgram ?? 0,
        subtitle: 'Assigned Programs',
        icon: 'bi-buildings',
        accent: 'blue',
      },
      {
        title: 'Active',
        value: h?.activeProgram ?? 0,
        subtitle: 'Active assessments',
        icon: 'bi-clipboard2-check',
        accent: 'teal',
      },
      {
        title: 'In Progress',
        value: h?.inprocessProgram ?? 0,
        subtitle: 'Manual in progress',
        icon: 'bi-hourglass-split',
        accent: 'cyan',
      },
      {
        title: 'Completed',
        value: h?.compeleteProgram ?? 0,
        subtitle: 'Manual completed',
        icon: 'bi-check2-all',
        accent: 'green',
      },
    ];
  }

  trackByTitle(_: number, item: PulseSummaryCard): string {
    return item.title;
  }

  exportProgramPillar(): void {
    const program = this.programs?.find((x) => x.climateProgramID == this.selectedPrograms);
    if (this.questionHistory?.pillars && program) {
      const exportData = this.questionHistory.pillars.map((x) => ({
        programName: program.programName,
        PillarName: x.pillarName,
        Score: x.scoreProgress?.toFixed(2),
        AnsweredQuestion: x.ansQuestion,
        TotalQuestion: x.totalQuestion,
      }));
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning('Please select program to export the records');
    }
  }
}
