import { CommonModule } from '@angular/common';
declare var bootstrap: any; // use Bootstrap JS API
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
  ApexStroke,
  ApexGrid
} from 'ng-apexcharts';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { AnalystService } from '../../analyst.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { SharedModule } from 'src/app/shared/share.module';
import { environment } from 'src/environments/environment';
import { UserService } from 'src/app/core/services/user.service';
import { CommonService } from 'src/app/core/services/common.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { ChartTableRowDto } from 'src/app/core/models/CompareCountryResponseDto';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ChangeDetectorRef, Component, OnChanges, OnInit, ViewChild } from '@angular/core';
import { RegeneratePilalrAiSearchDto } from 'src/app/core/models/aiVm/RegenerateAiSearchDto';
import { AiCountryPillarResponseDto, AiCountryPillarVM } from 'src/app/core/models/aiVm/AiCountryPillarResponseDto';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { ViewAiPillarDetailsComponent } from '../../../../shared/standAlone/view-ai-pillar-details/view-ai-pillar-details.component';
import { RegenerateAiScoreAndAddViewerComponent } from 'src/app/shared/standAlone/regenerate-ai-score-and-add-viewer/regenerate-ai-score-and-add-viewer.component';
import { UtcToLocalTooltipDirective } from 'src/app/shared/directives/utc-to-local-tooltip.directive';
import { AiCountrySummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiCountrySummeryRequestPdfDto';
import { buildAiKpiGroupedBarChartOptions } from 'src/app/core/constants/ai-kpi-analysis-chart.util';

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
  stroke: ApexStroke;
  grid?: ApexGrid;
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
  currentYear = new Date().getFullYear();
  selectedYear = this.currentYear;
  pillers: PillarsVM[] = [];
  selectedCountry!: number;
  countries: CountryVM[] | null = [];
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions> = {};
  aiCountryPillarResponseDto: AiCountryPillarResponseDto | null = null;
  selectedAiCountryPillar: AiCountryPillarVM | null = null;
  isLoader: boolean = false;
  chartTableData: ChartTableRowDto[] = [];
  selectedIndex: number = -1;
  aiTrustLevels: AITrustLevelVM[] = [];
  loading: boolean = false;
  isOpenResearchBox: boolean = false;
  selectedChangedStatusIndex: number = -1;
  constructor(
    private analystService: AnalystService,
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
      let cid = +params['countryID'] || null;
      let sYear = +params['year'] || this.selectedYear;
      if (cid) {
        this.selectedCountry = Number(cid);
        this.selectedYear = Number(sYear);
      }
    });
    this.getCountryUserCountries();
    this.getAITrustLevels();
  }

  getSelectedCountry() {
    let country = this.countries?.find(x => x.countryID == this.selectedCountry);
    if (!country) return;

    country.aiScore = this.selectedAiCountryPillar?.aiScore ?? 0;
    country.aiCompletionRate = this.selectedAiCountryPillar?.aiCompletionRate ?? 0;
    return country;
  }

  getAITrustLevels() {
    this.aiComputationService.getAITrustLevels().subscribe((p) => {
      this.aiTrustLevels = p.result || [];
    });
  }

  getCountryUserCountries() {
    this.analystService.getAllCountriesByUserId(this.userService.userInfo?.userID ?? 0).subscribe({
      next: (p) => {

        this.countries = p.result || [];
        if (this.countries?.length && !this.selectedCountry) {
          this.selectedCountry = this.countries[0].countryID;
        }
        this.getAICountryPillars();
      },
      error: () => {
        this.toaster.showError("There is an error please Try again");
        this.getAICountryPillars();
      }
    });
  }

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.countryName?.toLowerCase().includes(term) ||
      item.countryAliasName?.toLowerCase().includes(term)
    );
  }
  getAICountryPillars() {
    this.closeSidebar();

    if (!this.selectedCountry) {
      this.toaster.showWarning("Please select at least one country to view data.");
      return;
    }
    this.isLoader = true;

    let payload: AiCountrySummeryRequestPdfDto = {
      countryID: this.selectedCountry,
      year: this.selectedYear
    }
    this.aiComputationService.getAICountryPillars(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded && res.result != null) {
          this.aiCountryPillarResponseDto = res.result;

          this.buildPillarComparisonChart();
        }
        else {
          this.toaster.showInfo("No comparison data available for the selected countries.");
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
    const data = [...(this.aiCountryPillarResponseDto?.pillars ?? [])].sort(
      (a, b) => Number(b.isAccess) - Number(a.isAccess)
    );

    const aiSeries = data.map(x =>
      x.isAccess ? (x.aiProgress ?? 0) : getLockedScore(x.pillarID)
    );

    const evaluatorSeries = data.map(x =>
      x.isAccess ? (x.evaluatorScore ?? 0) : getLockedScore(x.pillarID)
    );

    const discrepancySeries = data.map(x =>
      x.isAccess ? (x.discrepancy ?? 0) : getLockedScore(x.pillarID)
    );

    this.chartOptions = buildAiKpiGroupedBarChartOptions({
      pillars: data,
      aiSeries,
      evaluatorSeries,
      discrepancySeries,
    });
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  viewDetails(pillar: AiCountryPillarVM) {
    this.selectedAiCountryPillar = pillar;
    const sidebarEl = document.getElementById('kpiLayerSidebar');
    const offcanvas = new bootstrap.Offcanvas(sidebarEl);

    // Clear selection when sidebar closes
    sidebarEl?.addEventListener('hidden.bs.offcanvas', () => {
      this.selectedAiCountryPillar = null;
      this.cdr.detectChanges();
    }, { once: true });

    offcanvas.show();
  }

  closeSidebar(): void {
    const sidebarEl = document.getElementById('kpiLayerSidebar');

    if (!sidebarEl) {
      return;
    }

    const offcanvas = bootstrap.Offcanvas.getInstance(sidebarEl);

    if (offcanvas) {
      offcanvas.hide();
    }
  }

  viewQuestions(pillar: AiCountryPillarVM) {
    this.router.navigate(['/admin/ai/questions-analysis'], {
      queryParams: {
        countryID: this.selectedCountry,
        pillarID: pillar.pillarID,
        year: this.selectedYear
      }
    });
  }

  opendialog(pillar: AiCountryPillarVM) {
    this.isOpenResearchBox = true;
    this.selectedAiCountryPillar = pillar;
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
    if (this.selectedAiCountryPillar) {
      this.loading = true;
      payload.pillarID = this.selectedAiCountryPillar.pillarID;

      this.aiComputationService.regenerateSinglePillarAiSearch(payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.getAICountryPillars();
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
