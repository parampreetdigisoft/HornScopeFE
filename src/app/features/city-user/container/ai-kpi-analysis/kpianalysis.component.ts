import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnChanges, OnInit, ViewChild } from '@angular/core';
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
export class KPIAnalysisComponent implements OnInit {
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
