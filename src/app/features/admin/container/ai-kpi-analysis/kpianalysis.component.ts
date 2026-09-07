import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnChanges, OnInit, ViewChild } from '@angular/core';

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
  ApexDataLabels,
  ApexGrid
} from 'ng-apexcharts';
import { ActivatedRoute, Router } from '@angular/router';
import { AiProgramPillarResponseDto, AiProgramPillarVM } from 'src/app/core/models/aiVm/AiProgramPillarResponseDto';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { ChartTableRowDto } from 'src/app/core/models/CompareProgramResponseDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { SharedModule } from 'src/app/shared/share.module';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { environment } from 'src/environments/environment';
import { ViewAiPillarDetailsComponent } from '../../../../shared/standAlone/view-ai-pillar-details/view-ai-pillar-details.component';
import { AdminService } from 'src/app/features/admin/admin.service';
import { UserService } from 'src/app/core/services/user.service';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { CommonService } from 'src/app/core/services/common.service';
import { RegeneratePilalrAiSearchDto } from 'src/app/core/models/aiVm/RegenerateAiSearchDto';
import { RegenerateAiScoreAndAddViewerComponent } from 'src/app/shared/standAlone/regenerate-ai-score-and-add-viewer/regenerate-ai-score-and-add-viewer.component';
import { UtcToLocalTooltipDirective } from 'src/app/shared/directives/utc-to-local-tooltip.directive';
import { AiProgramSummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestPdfDto';
import { DocumentFormat } from 'src/app/core/enums/documentFormat';
import { buildAiKpiPillarTooltipHtml } from 'src/app/core/constants/ai-kpi-pillar-tooltip.util';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  fill: ApexFill;
  states: ApexStates;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
};

@Component({
  selector: 'app-kpianalysis',
  standalone: true,
  imports: [CommonModule, SharedModule, CircularScoreComponent, SparklineScoreComponent, ViewAiPillarDetailsComponent, RegenerateAiScoreAndAddViewerComponent, UtcToLocalTooltipDirective],
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
  aiTrustLevels: AITrustLevelVM[] = [];
  aiProgramPillarResponseDto: AiProgramPillarResponseDto | null = null;
  selectedAiProgramPillar: AiProgramPillarVM | null = null;
  isLoader: boolean = false;
  chartTableData: ChartTableRowDto[] = [];
  selectedIndex: number = -1;
  loading: boolean = false;
  isOpenResearchBox: boolean = false;
  selectedChangedStatusIndex: number = -1;
  constructor(
    private adminService: AdminService,
    private toaster: ToasterService,
    private userService: UserService,
    private aiComputationService: AiComputationService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    public commonService: CommonService
  ) { }

  ngOnInit(): void {
    this.isLoader = true;
    this.route.queryParams.subscribe(params => {
      let cid = +params['climateProgramID'] || null;

      if (cid) {
        this.selectedProgram = Number(cid);
      }
    });
    this.getProgramUserPrograms();
    this.getAITrustLevels();
  }

  getSelectedProgram() {
    let program  = this.programs?.find(x => x.climateProgramID == this.selectedProgram);
    if(!program) return;
    program.aiScore = this.selectedAiProgramPillar?.aiScore ?? 0;
    program.aiCompletionRate = this.selectedAiProgramPillar?.aiCompletionRate ?? 0;
    return  program;
  }

  getAITrustLevels() {
    this.aiComputationService.getAITrustLevels().subscribe((p) => {      
      this.aiTrustLevels = p.result || [];
    });
  }
  getProgramUserPrograms() {
    this.adminService.getAllProgramsByUserId(this.userService.userInfo?.userID ?? 0).subscribe({
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
      climateProgramID: this.selectedProgram,
    }
    this.aiComputationService.getAIProgramPillars(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded && res.result != null) {
          this.aiProgramPillarResponseDto = res.result;

          this.buildPillarComparisonChart();
        }
        else {
          this.toaster.showInfo("No comparison data available for the selected programs.");
        }
      },
      error: (err) => {
        this.isLoader = false;
        this.toaster.showError("Failed to load comparison data.");
      }
    });
  }

  buildPillarComparisonChart() {
    // 🔹 Stable fake score generator for locked pillars (15–35)
    const getLockedScore = (pillarId: number) => {
      return 15 + (pillarId * 7) % 20;
    };

    // 1️⃣ Reorder: accessible first, locked last
    const data = [...(this.aiProgramPillarResponseDto?.pillars ?? [])].sort(
      (a, b) => Number(b.isAccess) - Number(a.isAccess)
    );

    // 2️⃣ Generate categories (pillar names)
    const categories = this.buildUniqueCategories(data);

    // 3️⃣ Series (real data for access, placeholder for locked)
    const aiSeries = data.map(x =>
      x.isAccess ? (x.aiProgress ?? 0) : getLockedScore(x.pillarID)
    );

    const evaluatorSeries = data.map(x =>
      x.isAccess ? (x.evaluatorScore ?? 0) : getLockedScore(x.pillarID)
    );

    const discrepancySeries = data.map(x =>
      x.isAccess ? (x.discrepancy ?? 0) : getLockedScore(x.pillarID)
    );

    const colors = [
      '#3b9eff',
      '#A8E063',
      '#FFB84D',
    ];

    const allValues = [
      ...aiSeries,
      ...evaluatorSeries,
      ...discrepancySeries
    ].filter(v => v !== null && v !== undefined && !isNaN(Number(v))).map(v => Number(v));
    const dataMin = allValues.length ? Math.min(...allValues) : 0;
    const dataMax = allValues.length ? Math.max(...allValues) : 100;
    const yMin = dataMin < 0 ? Math.floor(dataMin / 10) * 10 : 0;
    const yMax = Math.max(100, Math.ceil(dataMax / 10) * 10);

    this.chartOptions = {
      series: [
        { name: 'AI Score', data: aiSeries },
        { name: 'Evaluation Score', data: evaluatorSeries },
        { name: 'Discrepancy', data: discrepancySeries }
      ],

      chart: {
        type: 'bar',
        height: 420,
        toolbar: { show: false },
        zoom: {
          enabled: false
        },
        animations: {
          enabled: true,
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },

      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 5,
          borderRadiusApplication: "end",
          distributed: false,
          dataLabels: {
            position: 'top' // Force labels to top of bars
          }
        }
      },

      dataLabels: {
        enabled: false,
        formatter: (val: number, opts) => {
          const pillar = data[opts.dataPointIndex];

          // 🔒 Hide label for locked pillars
          if (!pillar.isAccess) {
            return '';
          }

          return `${Math.round(val)}`;
        },
        offsetY: -10, // Position above bar
        style: {
          fontSize: '10px',
          fontWeight: 200,
          colors: ['#faf8d1ff']
        },
        background: {
          enabled: true,
          foreColor: '#0906aaff',
          padding: 4,
          borderRadius: 2,
          borderWidth: 0,
          opacity: 0.9
        }
      },
      xaxis: {
        categories: categories,
        labels: {
          rotate: -45,
          rotateAlways: false,
          style: {
            fontSize: '11px',
            colors: '#C9D6EA'
          }
        },
        axisBorder: {
          color: 'rgba(92, 140, 200, 0.35)'
        },
        axisTicks: {
          color: 'rgba(92, 140, 200, 0.35)'
        }
      },

      yaxis: {
        title: {
          text: 'Score',
          style: {
            color: '#C9D6EA',
            fontWeight: 600
          }
        },
        min: yMin,
        max: yMax,
        forceNiceScale: true,
        labels: {
          style: {
            colors: '#C9D6EA'
          },
          formatter: (val) => {
            return val !== null && val !== undefined && !isNaN(val) ? `${Math.round(val)}` : '';
          }
        }
      },

      grid: {
        borderColor: 'rgba(92, 140, 200, 0.22)',
        strokeDashArray: 4,
        xaxis: {
          lines: { show: false }
        }
      },

      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.15,
          gradientToColors: [
            '#6CB8FF',
            '#C5F066',
            '#FFD080',
          ],
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.85,
          stops: [0, 100]
        }
      },
      colors: colors,

      states: {
        hover: {
          filter: { type: 'none' }
        },
        active: {
          filter: { type: 'none' }
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: 'dark',
        custom: ({ dataPointIndex }) => buildAiKpiPillarTooltipHtml(data[dataPointIndex]),
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        offsetY: 0,
        labels: {
          colors: '#E8EEF8'
        },
        markers: {
          strokeWidth: 0
        }
      }
    };
  }

   customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term) ||
      item.year?.toString().includes(term)
    );
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
    this.router.navigate(['/admin/ai/questions-analysis'], {
      queryParams: {
        climateProgramID: this.selectedProgram,
        pillarID: pillar.pillarID
      }
    });
  }
  buildUniqueCategories(data: { pillarName: string }[]): string[] {
    const used = new Set<string>();
    return data.map(item => {
      if (!item.pillarName) return '';

      const words = item.pillarName.trim().split(/\s+/);
      let label = '';

      for (let i = 1; i <= words.length; i++) {
        const candidate =
          i < words.length
            ? words.slice(0, i).join(' ')
            : words.join(' ');

        if (!used.has(candidate)) {
          label = candidate + (i < words.length ? '...' : '');
          used.add(candidate);
          break;
        }
      }

      // absolute fallback (should not happen)
      if (!label) {
        label = words[0] + '...';
      }

      return label;
    });
  }

  aiPillarDetailsReport(program: AiProgramPillarVM, selectedIndex: number, format: string) {
    if (this.selectedIndex != -1) return;
    this.selectedIndex = selectedIndex;
    let payload: AiProgramSummeryRequestPdfDto = {
      climateProgramID: program.climateProgramID,
      pillarID: program.pillarID,
      format:format
    }
    this.aiComputationService.aiPillarDetailsReport(payload).subscribe({
      next: (blob) => {
        this.selectedIndex = -1;
        if (blob) {
          // Create download link
          const ext = format == DocumentFormat.Pdf ? 'pdf' : 'docx';          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;

          link.download = `${program.pillarName}_Details_${new Date().toISOString().split('T')[0]}..${ext}`;

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
  opendialog(pillar: AiProgramPillarVM) {
    this.isOpenResearchBox = true;
    this.selectedAiProgramPillar = pillar;
    setTimeout(() => {
      const modalEl = document.getElementById("RegenerateAIScoreModal");
      if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
          modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.show(); // ✅ use show()
      }
    }, 100);
  }

  closeModal() {
    const modalEl = document.getElementById("RegenerateAIScoreModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    this.isOpenResearchBox = false;
  }

  regenerateAiSearch(payload: RegeneratePilalrAiSearchDto) {
    if (this.selectedAiProgramPillar) {
      this.loading = true;
      payload.pillarID = this.selectedAiProgramPillar.pillarID;

      this.aiComputationService.regenerateSinglePillarAiSearch(payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.getAIProgramPillars();
          this.selectedChangedStatusIndex = -1;
          if (res.succeeded) {
            this.toaster.showSuccess(res.messages.join(", "));
          } else {
            this.toaster.showError(res.errors.join(", "));
          }
          this.closeModal();
        },
        error: () => {
          this.loading = false;
          this.toaster.showError('There is an error occure please try again');
          this.selectedChangedStatusIndex = -1;
          this.closeModal();
        }
      });
    } else {
      this.toaster.showWarning('Please try again');
      this.closeModal();
    }
  }
}
