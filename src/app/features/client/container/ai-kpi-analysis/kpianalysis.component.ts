import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnChanges, OnInit, ViewChild } from '@angular/core';
import { SharedModule } from 'src/app/shared/share.module';
import { ChartTableRowDto, CompareProgramResponseDto } from "src/app/core/models/CompareProgramResponseDto";
import { environment } from "src/environments/environment";
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { ClientService } from 'src/app/features/client/client.service';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { AiProgramPillarResponseDto, AiProgramPillarVM } from 'src/app/core/models/aiVm/AiProgramPillarResponseDto';
declare var bootstrap: any; // 👈 use Bootstrap JS API

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexTooltip,
  ApexPlotOptions,
  ApexLegend,
  ApexFill,
  ApexStates,
  ChartComponent,
  ApexDataLabels
} from 'ng-apexcharts';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { ActivatedRoute, Router } from '@angular/router';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { ViewAiPillarDetailsComponent } from '../../features/view-ai-pillar-details/view-ai-pillar-details.component';
import { AiProgramSummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestPdfDto';
import { CommonService } from 'src/app/core/services/common.service';
import { buildAiKpiClientProgressTooltipHtml } from 'src/app/core/constants/ai-kpi-pillar-tooltip.util';
import { ahiScoreColor, VCP_CHART } from 'src/app/core/constants/ahi-chart-theme';

export type ChartOptions = {
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
  selector: 'app-kpianalysis',
  standalone: true,
  imports: [CommonModule, SharedModule, CircularScoreComponent, SparklineScoreComponent, ViewAiPillarDetailsComponent],
  templateUrl: './kpianalysis.component.html',
  styleUrl: './kpianalysis.component.css'
})
export class KPIAnalysisComponent implements OnInit {
  urlBase = environment.apiUrl;
  pillers: PillarsVM[] = [];
  selectedProgram?: number;
  programs: ProgramVM[] | null = [];
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions> = {};
  aiProgramPillarResponseDto: AiProgramPillarResponseDto | null = null;
  selectedAiProgramPillar: AiProgramPillarVM | null = null;
  isLoader: boolean = false;
  chartTableData: ChartTableRowDto[] = [];
  selectedIndex: number = -1;
  aiTrustLevels: AITrustLevelVM[] = [];

  constructor(
    private clientService: ClientService,
    private toaster: ToasterService,
    private aiComputationService: AiComputationService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    public commonService: CommonService
  ) {

  }

  ngOnInit(): void {
    this.isLoader = true;
    this.route.queryParams.subscribe(params => {
      let cid = +params['climateProgramID'] || null;

      if (cid) {
        this.selectedProgram = Number(cid);
      }
    });
    this.getClientPrograms();
    this.getAITrustLevels();
  }
  getAITrustLevels() {
    this.aiComputationService.getAITrustLevels().subscribe((p) => {
      this.aiTrustLevels = p.result || [];
    });
  }

  getClientPrograms() {
    this.clientService.getClientPrograms().subscribe({
      next: (p) => {

        this.programs = p.result || [];
        if (this.programs?.length && !this.selectedProgram) {
          this.selectedProgram = this.programs[0].climateProgramID;
        }
        this.getAIProgramPillars();
      },
      error: () => {
        this.toaster.showError("There is an error please Try again");
        this.getAIProgramPillars();
      }
    });
  }

  getAIProgramPillars() {
    if (!this.selectedProgram) {
      this.toaster.showWarning("Please select at least one program to view data.");
      return;
    }
    this.isLoader = true;
    let payload: AiProgramSummeryRequestPdfDto = {
      climateProgramID: this.selectedProgram
    }
    this.clientService.getAIProgramPillars(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded && res.result != null) {
          this.aiProgramPillarResponseDto = res.result;

          this.buildPillarComparisonChart();
        }
        else {
          this.toaster.showInfo("No comparison data available for the selected programs.");
          this.aiProgramPillarResponseDto=null;
          this.buildPillarComparisonChart();
        }
      },
      error: (err) => {
        this.isLoader = false;
        this.toaster.showError("Failed to load comparison data.");
      }
    });
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  viewDetails(pillar: AiProgramPillarVM) {
    this.selectedAiProgramPillar = pillar;
    const sidebarEl = document.getElementById('kpiLayerSidebar');
    const offcanvas = new bootstrap.Offcanvas(sidebarEl);

    // Clear selection when sidebar closes
    sidebarEl?.addEventListener('hidden.bs.offcanvas', () => {
      this.selectedAiProgramPillar = null;
      this.cdr.detectChanges();
    }, { once: true });

    offcanvas.show();
  }

  viewQuestions(pillar: AiProgramPillarVM) {
    this.router.navigate(['/programuser/ai/questions-analysis'], {
      queryParams: {
        climateProgramID: this.selectedProgram,
        pillarID: pillar.pillarID
      }
    });
  }
  aiPillarDetailsReport(program: AiProgramPillarVM, selectedIndex: number) {
    if(this.selectedIndex != -1) return;
    this.selectedIndex = selectedIndex;
    let payload: AiProgramSummeryRequestPdfDto = {
      climateProgramID: program.climateProgramID,
      pillarID: program.pillarID
    }
    this.aiComputationService.aiPillarDetailsReport(payload).subscribe({
      next: (blob) => {
        this.selectedIndex = -1;
        if (blob) {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${program.pillarName}_Details_${new Date().toISOString().split('T')[0]}.pdf`;

          // Trigger download
          document.body.appendChild(link);
          link.click();

          // Cleanup
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          this.toaster.showSuccess('Report generated successfully')
        }
      },
      error: () => {
        this.toaster.showError('There is an error occure please try again');
        this.selectedIndex = -1;
      }
    });
  }

  buildPillarComparisonChart() {
    const getLockedScore = (pillarId: number) => {
      return 15 + (pillarId * 7) % 20;
    };

    const data = [...(this.aiProgramPillarResponseDto?.pillars ?? [])].sort(
      (a, b) => Number(b.isAccess) - Number(a.isAccess)
    );

    const categories = this.buildUniqueCategories(data);
    const aiSeries = data.map(x =>
      x.isAccess ? (x.aiProgress ?? 0) : getLockedScore(x.pillarID)
    );

    const allValues = aiSeries.filter(v => v !== null && v !== undefined && !isNaN(Number(v))).map(v => Number(v));
    const dataMin = allValues.length ? Math.min(...allValues) : 0;
    const dataMax = allValues.length ? Math.max(...allValues) : 100;
    const yMin = dataMin < 0 ? Math.floor(dataMin / 10) * 10 : 0;
    const yMax = Math.max(100, Math.ceil(dataMax / 10) * 10);

    this.chartOptions = {
      series: [{
        name: 'Progress',
        data: aiSeries
      }],

      colors: [VCP_CHART.primary],

      chart: {
        type: 'area',
        height: 420,
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false },
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
        enabled: true,
        formatter: (val: number, opts) => {
          const pillar = data[opts.dataPointIndex];
          if (!pillar.isAccess) return '';
          return `${Math.round(val)}`;
        },
        offsetY: -10,
        style: {
          fontSize: '11px',
          fontWeight: 700,
          colors: ['#E8EEF8']
        },
        background: {
          enabled: true,
          foreColor: '#E8EEF8',
          padding: 6,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: 'rgba(92, 140, 200, 0.35)',
          opacity: 0.95
        }
      },

      stroke: {
        curve: 'smooth',
        width: 3,
        colors: ['#3B9EFF']
      },

      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.55,
          opacityTo: 0.06,
          stops: [0, 85, 100],
          colorStops: [
            { offset: 0, color: VCP_CHART.primary, opacity: 0.65 },
            { offset: 50, color: VCP_CHART.primaryMid, opacity: 0.3 },
            { offset: 100, color: VCP_CHART.deep, opacity: 0.04 }
          ]
        }
      },

      markers: {
        size: data.map(p => p.isAccess ? 6 : 4),
        colors: data.map(p => p.isAccess ? this.PillarColorByScore(p) : '#6b7c93'),
        strokeColors: VCP_CHART.deep,
        strokeWidth: 2,
        hover: {
          size: 8,
          sizeOffset: 3
        }
      },

      xaxis: {
        categories: categories,
        labels: {
          rotate: -45,
          style: {
            fontSize: '11px',
            fontWeight: 500,
            colors: '#C9D6EA'
          }
        },
        axisBorder: {
          show: true,
          color: 'rgba(92, 140, 200, 0.35)'
        },
        axisTicks: {
          show: true,
          color: 'rgba(92, 140, 200, 0.35)'
        }
      },

      yaxis: {
        title: {
          text: 'Score',
          style: {
            fontSize: '13px',
            fontWeight: 600,
            color: '#C9D6EA'
          }
        },
        min: yMin,
        max: yMax,
        forceNiceScale: true,
        labels: {
          formatter: (val) => val !== null && val !== undefined && !isNaN(val) ? `${Math.round(val)}` : '',
          style: {
            fontSize: '12px',
            colors: '#C9D6EA'
          }
        }
      },

      grid: {
        borderColor: 'rgba(92, 140, 200, 0.22)',
        strokeDashArray: 4,
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
        custom: ({ dataPointIndex }) => {
          const pillar = data[dataPointIndex];
          return buildAiKpiClientProgressTooltipHtml(
            pillar,
            this.PillarColorByScore(pillar)
          );
        },
      },

      legend: {
        show: false
      }
    };
  }

  PillarColorByScore(pillar: any): string {
    return ahiScoreColor(pillar.aiProgress ?? 0);
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
