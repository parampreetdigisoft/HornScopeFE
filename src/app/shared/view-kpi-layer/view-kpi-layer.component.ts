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
import { UserService } from 'src/app/core/services/user.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserRole } from 'src/app/core/enums/UserRole';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { SummarizeKpiRequestDto, SummarizeKpiResponseDto } from 'src/app/core/models/SummarizeKpiDto';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { AMI_CHART } from 'src/app/core/constants/ahi-chart-theme';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  stroke: ApexStroke;
  colors: string[];
};

@Component({
  selector: 'app-view-kpi-layer',
  templateUrl: './view-kpi-layer.component.html',
  styleUrl: './view-kpi-layer.component.css'
})
export class ViewKpiLayerComponent implements OnInit, OnChanges {

  @Input() selectedLayer?: GetAnalyticalLayerResultDto | null = null;
  @Input() listPage?: number;
  urlBase = environment.apiUrl;
  get country() {
    return this.selectedLayer?.country;
  }
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;

  canShowAiSummary = false;
  isSummarizing = false;
  aiSummary: SummarizeKpiResponseDto | null = null;
  aiSummaryError: string | null = null;
  private summaryCache = new Map<number, SummarizeKpiResponseDto>();
  private summarizingLayerId: number | null = null;
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
    this.updateAiSummaryVisibility();
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

  private updateAiSummaryVisibility(): void {
    const role = this.userService.userInfo?.role;
    this.canShowAiSummary =
      role === UserRole.Admin ||
      role === UserRole.Analyst ||
      role === UserRole.CountryUser;
  }

  generateAiSummary(): void {
    if (!this.canShowAiSummary || this.isSummarizing) return;

    const layerResultID = this.selectedLayer?.layerResultID;
    if (!layerResultID) {
      this.toaster.showError('KPI result is missing. Please reopen the KPI details.');
      return;
    }

    this.isSummarizing = true;
    this.aiSummaryError = null;
    this.summarizingLayerId = layerResultID;
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

  getConditionByid() {
    let condition = this.selectedLayer?.fiveLevelInterpretations?.find(x => x.interpretationID == this.selectedLayer?.interpretationID)?.condition ?? 'NA';
    condition = condition.split(' ')[0];
    return condition;
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


  getCalculatedValues() {
    const value = this.selectedLayer?.calValue5 ?? 0;
    const aiValue = this.selectedLayer?.aiCalValue5 ?? 0;

    const round = (val: number) =>
      Math.round((val + Number.EPSILON) * 100) / 100;

    return {
      manual: round(value),
      ai: round(aiValue)
    };
  }
  ApexGetPieOptions() {
    const { manual, ai } = this.getCalculatedValues();

    this.chartOptions = {
      series: [Math.min(Math.abs(manual), 100), Math.min(Math.abs(ai), 100)],
      colors: [AMI_CHART.primary, AMI_CHART.primaryMid],
      chart: {
        height: 240,
        type: "radialBar",
        background: "transparent",
        foreColor: AMI_CHART.text,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 225,
          hollow: {
            size: "55%",
            background: "transparent"
          },
          track: {
            background: AMI_CHART.grid,
            strokeWidth: "100%"
          },
          dataLabels: {
            show: true,
            name: {
              fontSize: "12px",
              color: AMI_CHART.primaryMid
            },
            value: {
              fontSize: "16px",
              fontWeight: 600,
              color: AMI_CHART.text,
              formatter: (val: number) => `${val}`
            },
            total: {
              show: true,
              label: "Manual vs AI",
              color: AMI_CHART.primaryMid,
              formatter: () => `${manual} / ${ai}`
            }
          }
        }
      },
      fill: {
        type: "solid",
        colors: [AMI_CHART.primary, AMI_CHART.primaryMid]
      },
      stroke: {
        lineCap: "round"
      },
      labels: ["Manual Score", "AI Score"]
    };
  }
}
