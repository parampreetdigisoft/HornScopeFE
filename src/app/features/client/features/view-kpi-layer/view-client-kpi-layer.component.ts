import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { GetAnalyticalLayerResultDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { environment } from 'src/environments/environment';
import {
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexChart,
  ApexFill,
  ChartComponent,
  ApexStroke
} from "ng-apexcharts";
import { SharedModule } from 'src/app/shared/share.module';
import { CommonModule } from '@angular/common';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { SummarizeKpiRequestDto, SummarizeKpiResponseDto } from 'src/app/core/models/SummarizeKpiDto';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { UserRole } from 'src/app/core/enums/UserRole';
import { VCP_CHART } from 'src/app/core/constants/ahi-chart-theme';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  stroke: ApexStroke;
};

@Component({
  selector: 'app-view-client-kpi-layer',
  standalone: true,
  imports: [SharedModule, CommonModule],
  templateUrl: './view-client-kpi-layer.component.html',
  styleUrl: './view-client-kpi-layer.component.css'
})
export class ViewClientKpiLayerComponent implements OnInit, OnChanges {

  @Input() selectedLayer?: GetAnalyticalLayerResultDto | null = null;
  @Input() listPage?: number;
  urlBase = environment.apiUrl;
  get program() {
    return this.selectedLayer?.program;
  }

  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;

  canShowAiSummary = false;
  isSummarizing = false;
  aiSummary: SummarizeKpiResponseDto | null = null;
  aiSummaryError: string | null = null;
  summaryCache = new Map<number, SummarizeKpiResponseDto>();
  summarizingLayerId: number | null = null;

  constructor(
    private userService: UserService,
    private aiComputationService: AiComputationService,
    private toaster: ToasterService,
  ) {}
  
  ngOnInit(): void {
    this.updateAiSummaryVisibility();
    this.clearSummaryCache();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ApexGetPieOptions();
    if (changes['listPage'] && !changes['listPage'].firstChange) {
      this.clearSummaryCache();
    } 
    if (changes['selectedLayer']) {
      this.restoreCachedSummary();
    }
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  getConditionByid() {
    let condition = this.selectedLayer?.fiveLevelInterpretations?.find(x => x.interpretationID == this.selectedLayer?.interpretationID)?.condition ?? 'NA';
    condition = condition.split(' ')[0];
    return condition;
  }
  private updateAiSummaryVisibility(): void {
    const role = this.userService.userInfo?.role;
    this.canShowAiSummary = role === UserRole.ProgramUser;
  }

  generateAiSummary(): void {
    if (!this.canShowAiSummary || this.isSummarizing) return;

    const layerResultID = this.selectedLayer?.layerResultID;
    if (!layerResultID) {
      this.toaster.showError('KPI result is missing. Please reopen the KPI details.');
      return;
    }

    this.isSummarizing = true;
    this.summarizingLayerId = layerResultID;
    this.aiSummaryError = null;

    const payload: SummarizeKpiRequestDto = { layerResultID };
    this.aiComputationService.summarizeKpiPerformance(payload).subscribe({
      next: (res) => {
        const response = res as ResultResponseDto<SummarizeKpiResponseDto>;
        const isCurrentRow = this.selectedLayer?.layerResultID === layerResultID;
        if (this.summarizingLayerId === layerResultID) {
          this.summarizingLayerId = null;
        }
        if (isCurrentRow) {
          this.isSummarizing = false;
        }
        if (response?.succeeded && response.result?.summary) {
          this.summaryCache.set(layerResultID, response.result);
          if (isCurrentRow) {
            this.aiSummary = response.result;
            this.aiSummaryError = null;
          }
        } else {
          const message = response?.errors?.[0] || 'Failed to generate AI summary. Please try again.';
          if (isCurrentRow) {
            this.aiSummary = this.summaryCache.get(layerResultID) ?? null;
            this.aiSummaryError = this.aiSummary ? null : message;
          }
          this.toaster.showError(message);
        }
      },
      error: () => {
         const isCurrentRow = this.selectedLayer?.layerResultID === layerResultID;
        if (this.summarizingLayerId === layerResultID) {
          this.summarizingLayerId = null;
        }
        if (isCurrentRow) {
          this.isSummarizing = false;
          this.aiSummary = this.summaryCache.get(layerResultID) ?? null;
          this.aiSummaryError = this.aiSummary
            ? null
            : 'Unable to reach the AI service. Please try again later.';
          if (this.aiSummaryError) {
            this.toaster.showError(this.aiSummaryError);
          }
        } else {
          this.toaster.showError('Unable to reach the AI service. Please try again later.');
        }
      }
    });
  }

  private restoreCachedSummary(): void {
    const layerResultID = this.selectedLayer?.layerResultID;
    this.aiSummaryError = null;
    this.aiSummary = layerResultID != null ? this.summaryCache.get(layerResultID) ?? null : null;
    this.isSummarizing = layerResultID != null && this.summarizingLayerId === layerResultID;
  }

  clearSummaryCache(): void {
    this.summaryCache.clear();
    this.summarizingLayerId = null;
    this.aiSummary = null;
    this.aiSummaryError = null;
    this.isSummarizing = false;
  }

  getAiConditionByid() {
    let condition = this.selectedLayer?.fiveLevelInterpretations?.find(x => x.interpretationID == this.selectedLayer?.aiInterpretationID)?.condition ?? 'NA';
    condition = condition.split(' ')[0];
    return condition;
  }

  get interpretaions() {
    return this.selectedLayer?.fiveLevelInterpretations;
  }

  getCalculatedValue() {
    const value = this.selectedLayer?.calValue5;
    const aiValue = this.selectedLayer?.aiCalValue5;

    // Return the value rounded to 2 decimal places but keep it as number
    return value !== undefined && value !== null
      ? Math.round((value + Number.EPSILON) * 100) / 100
      : value ?? 0;
  }

  get getAiCalculatedValue() {
    const aiValue = this.selectedLayer?.aiCalValue5 == 100 || this.selectedLayer?.aiCalValue5 == 0 ? this.selectedLayer?.aiCalValue5?.toFixed(0) : this.selectedLayer?.aiCalValue5?.toFixed(2);
    return aiValue !== undefined && aiValue !== null ? aiValue : '0';
  }
  
  get getEvaluationCalculatedValue() {
    const aiValue = this.selectedLayer?.calValue5 == 100 || this.selectedLayer?.calValue5 == 0 ? this.selectedLayer?.calValue5?.toFixed(0) : this.selectedLayer?.calValue5?.toFixed(2);
    return aiValue !== undefined && aiValue !== null ? aiValue : '0';
  }

  ApexGetPieOptions() {
    const round = (val: number) =>
      Math.round((val + Number.EPSILON) * 100) / 100;

    const aiValue = this.selectedLayer?.aiCalValue5 ?? 0;
    const value = round(aiValue);
    const displayValue =
      aiValue === 100 || aiValue === 0 ? aiValue.toFixed(0) : aiValue.toFixed(2);

    this.chartOptions = {
      series: [Math.max(0, value)],
      chart: {
        height: 360,
        type: 'radialBar',
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 900,
        },
        toolbar: { show: false },
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 225,
          hollow: {
            margin: 0,
            size: '70%',
            background: 'transparent',
          },
          track: {
            background: 'rgba(92, 140, 200, 0.12)',
            strokeWidth: '67%',
            margin: 0,
          },
          dataLabels: {
            show: true,
            name: {
              offsetY: -10,
              show: true,
              color: VCP_CHART.textMuted,
              fontSize: '17px',
            },
            value: {
              formatter: () => displayValue,
              color: VCP_CHART.text,
              fontSize: '36px',
              show: true,
            },
          },
        },
      },
      fill: {
        type: 'solid',
        colors: [VCP_CHART.primary],
      },
      stroke: {
        lineCap: 'round',
      },
      labels: ['Score'],
    };
  }

}

