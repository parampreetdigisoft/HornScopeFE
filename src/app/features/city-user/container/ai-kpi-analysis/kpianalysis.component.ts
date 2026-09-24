import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SharedModule } from 'src/app/shared/share.module';
import { ChartTableRowDto, CompareCountryResponseDto } from "src/app/core/models/CompareCountryResponseDto";
import { environment } from "src/environments/environment";
import { CountryVM } from 'src/app/core/models/CountryVM';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { CountryUserService } from 'src/app/features/city-user/country-user.service';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { AiCountryPillarResponseDto, AiCountryPillarVM } from 'src/app/core/models/aiVm/AiCountryPillarResponseDto';
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
  ApexGrid,
  ApexMarkers
} from 'ng-apexcharts';
import { buildAiKpiAreaChartOptions } from 'src/app/core/constants/ai-kpi-analysis-chart.util';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { ActivatedRoute, Router } from '@angular/router';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { ViewAiPillarDetailsComponent } from '../../features/view-ai-pillar-details/view-ai-pillar-details.component';
import { AiCountrySummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiCountrySummeryRequestPdfDto';
import { CommonService } from 'src/app/core/services/common.service';
import { DocumentFormat } from 'src/app/core/enums/documentFormat';

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
  markers: ApexMarkers;
  grid: ApexGrid;
};

@Component({
  selector: 'app-kpianalysis',
  standalone: true,
  imports: [CommonModule, SharedModule, CircularScoreComponent, SparklineScoreComponent, ViewAiPillarDetailsComponent],
  templateUrl: './kpianalysis.component.html',
  styleUrl: './kpianalysis.component.css'
})
export class KPIAnalysisComponent implements OnInit, OnDestroy {
  urlBase = environment.apiUrl;
  currentYear = new Date().getFullYear();
  selectedYear = this.currentYear;
  pillers: PillarsVM[] = [];
  selectedCountry?: number;
  countries: CountryVM[] | null = [];
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions> = {};
  aiCountryPillarResponseDto: AiCountryPillarResponseDto | null = null;
  selectedAiCountryPillar: AiCountryPillarVM | null = null;
  isLoader: boolean = false;
  chartTableData: ChartTableRowDto[] = [];
  selectedIndex: number = -1;
  aiTrustLevels: AITrustLevelVM[] = [];
  selectedPillars: AiCountryPillarVM[] = [];
  isReportExporting: boolean = false;
  reportMenuOpen = false;
  private selectedPillarIds = new Set<number>();
  private reportMenuDismissBound = false;
  private readonly dismissReportMenu = () => this.closeReportMenu();

  constructor(
    private countryUserService: CountryUserService,
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
  getAITrustLevels() {
    this.aiComputationService.getAITrustLevels().subscribe((p) => {
      this.aiTrustLevels = p.result || [];
    });
  }

  getCountryUserCountries() {
    this.countryUserService.getCountryUserCountries().subscribe({
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

  getAICountryPillars() {
    this.clearPillarSelection();
    if (!this.selectedCountry) {
      this.toaster.showWarning("Please select at least one country to view data.");
      return;
    }
    this.isLoader = true;
    let payload: AiCountrySummeryRequestPdfDto = {
      countryID: this.selectedCountry,
      year: this.selectedYear
    }
    this.countryUserService.getAICountryPillars(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded && res.result != null) {
          this.aiCountryPillarResponseDto = res.result;

          this.buildPillarComparisonChart();
        }
        else {
          this.toaster.showInfo("No comparison data available for the selected countries.");
          this.aiCountryPillarResponseDto=null;
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

  viewQuestions(pillar: AiCountryPillarVM) {
    this.router.navigate(['/countryuser/ai/questions-analysis'], {
      queryParams: {
        countryID: this.selectedCountry,
        pillarID: pillar.pillarID,
        year:this.selectedYear
      }
    });
  }
  get accessiblePillars(): AiCountryPillarVM[] {
    return (this.aiCountryPillarResponseDto?.pillars ?? []).filter(pillar => pillar.isAccess);
  }

  get isAllPillarsSelected(): boolean {
    const currentData = this.accessiblePillars;
    return currentData.length > 0 && currentData.every(pillar => this.selectedPillarIds.has(pillar.pillarID));
  }

  get isSomePillarsSelected(): boolean {
    const currentData = this.accessiblePillars;
    return currentData.some(pillar => this.selectedPillarIds.has(pillar.pillarID)) && !this.isAllPillarsSelected;
  }

  isPillarSelected(pillar: AiCountryPillarVM): boolean {
    return this.selectedPillarIds.has(pillar.pillarID);
  }

  allPillarsSelected(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    const currentData = this.accessiblePillars;

    if (isChecked) {
      currentData.forEach(pillar => {
        if (!this.selectedPillarIds.has(pillar.pillarID)) {
          this.selectedPillarIds.add(pillar.pillarID);
          this.selectedPillars.push(pillar);
        }
      });
      return;
    }

    currentData.forEach(pillar => this.selectedPillarIds.delete(pillar.pillarID));
    const currentIds = new Set(currentData.map(pillar => pillar.pillarID));
    this.selectedPillars = this.selectedPillars.filter(pillar => !currentIds.has(pillar.pillarID));
  }

  pillarSelected(event: Event, pillar: AiCountryPillarVM) {
    if (!pillar.isAccess) {
      return;
    }

    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      if (!this.selectedPillarIds.has(pillar.pillarID)) {
        this.selectedPillarIds.add(pillar.pillarID);
        this.selectedPillars.push(pillar);
      }
      return;
    }

    this.selectedPillarIds.delete(pillar.pillarID);
    this.selectedPillars = this.selectedPillars.filter(item => item.pillarID !== pillar.pillarID);
  }

  ngOnDestroy(): void {
    this.unbindReportMenuDismiss();
  }

  @HostListener('document:click')
  @HostListener('window:resize')
  closeReportMenu(): void {
    if (!this.reportMenuOpen) {
      return;
    }
    this.reportMenuOpen = false;
    this.unbindReportMenuDismiss();
  }

  toggleReportMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isReportExporting) {
      return;
    }
    if (this.reportMenuOpen) {
      this.closeReportMenu();
      return;
    }

    this.reportMenuOpen = true;
    this.bindReportMenuDismiss();
  }

  private bindReportMenuDismiss(): void {
    if (this.reportMenuDismissBound) {
      return;
    }
    document.addEventListener('scroll', this.dismissReportMenu, true);
    this.reportMenuDismissBound = true;
  }

  private unbindReportMenuDismiss(): void {
    if (!this.reportMenuDismissBound) {
      return;
    }
    document.removeEventListener('scroll', this.dismissReportMenu, true);
    this.reportMenuDismissBound = false;
  }

  aiSelectedPillarsReport(format: string = 'pdf') {
    if (this.isReportExporting) {
      return;
    }
    if (!this.selectedCountry) {
      this.toaster.showWarning('Please select a country to download the report.');
      return;
    }
    if (!this.selectedPillars.length) {
      this.toaster.showWarning('Please select at least one domain to download the report.');
      return;
    }

    this.isReportExporting = true;
    const payload: AiCountrySummeryRequestPdfDto = {
      countryID: this.selectedCountry,
      year: this.selectedYear,
      pillarIDs: this.selectedPillars.map(pillar => pillar.pillarID),
      format
    };

    this.aiComputationService.aiPillarDetailsReport(payload).subscribe({
      next: (blob) => {
        this.isReportExporting = false;
        if (blob && blob.size > 0) {
          const ext = format == DocumentFormat.Pdf ? 'pdf' : 'docx';
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const reportName = this.selectedPillars.length === 1
            ? this.selectedPillars[0].pillarName
            : `${ this.countries?.find(x => x.countryID === this.selectedCountry)?.countryName ?? 'Report'}_Domains`;
          link.download = `${reportName}_Details_${new Date().toISOString().split('T')[0]}.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          this.toaster.showSuccess('Report generated successfully');
        } else {
          this.toaster.showWarning('No data available for the selected domains or the report could not be generated.');
        }
      },
      error: () => {
        this.isReportExporting = false;
        this.toaster.showError('There is an error occure please try again');
      }
    });
  }

  private clearPillarSelection() {
    this.selectedPillarIds.clear();
    this.selectedPillars = [];
  }

  aiPillarDetailsReport(country: AiCountryPillarVM, selectedIndex: number) {
    if(this.selectedIndex != -1) return;
    this.selectedIndex = selectedIndex;
    let payload: AiCountrySummeryRequestPdfDto = {
      countryID: country.countryID,
      year: this.selectedYear,
      pillarID: country.pillarID
    }
    this.aiComputationService.aiPillarDetailsReport(payload).subscribe({
      next: (blob) => {
        this.selectedIndex = -1;
        if (blob) {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${country.pillarName}_Details_${new Date().toISOString().split('T')[0]}.pdf`;

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
    const getLockedScore = (pillarId: number) => 15 + (pillarId * 7) % 20;
    const data = [...(this.aiCountryPillarResponseDto?.pillars ?? [])].sort(
      (a, b) => Number(b.isAccess) - Number(a.isAccess)
    );
    const series = data.map((x) =>
      x.isAccess ? (x.aiProgress ?? 0) : getLockedScore(x.pillarID)
    );
    this.chartOptions = buildAiKpiAreaChartOptions({ pillars: data, series });
  }

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.countryName?.toLowerCase().includes(term) ||
      item.countryAliasName?.toLowerCase().includes(term)
    );
  }
}
