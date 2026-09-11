import { Component, OnInit, ViewChild } from '@angular/core';
import { ChartComponent } from 'ng-apexcharts';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { CompareCountryRequestDto } from 'src/app/core/models/CompareCountryRequestDto';
import { CompareCountryResponseDto, ChartTableRowDto } from 'src/app/core/models/CompareCountryResponseDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { CommonService } from 'src/app/core/services/common.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';
import { AdminService } from '../../admin.service';
import { AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { debounceTime, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/share.module';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SelectOverflowLabelComponent } from 'src/app/shared/standAlone/select-overflow-label/select-overflow-label.component';
import { AiButtonComponent } from 'src/app/shared/standAlone/ai-button/ai-button.component';
import { GetMutiplekpiLayerRequestDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto';
import { GetMutiplekpiLayerResultsDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto';
import { CompareCountryKpiDetailComponent } from 'src/app/shared/standAlone/compare-country-kpi-detail/compare-country-kpi-detail.component';
import {
  KpiComparisonChartOptions,
  buildKpiComparisonChartOptions,
} from 'src/app/core/constants/kpi-comparison-chart.util';
declare var bootstrap: any;

@Component({
  standalone: true,
  selector: 'app-kpi-comparision',
  templateUrl: './kpi-comparision.component.html',
  styleUrl: './kpi-comparision.component.css',
  imports: [CommonModule, SharedModule, CircularScoreComponent, AiButtonComponent, CompareCountryKpiDetailComponent, SelectOverflowLabelComponent]

})
export class KpiComparisionComponent implements OnInit {
  selectedYear = new Date().getFullYear();
  pillers: PillarsVM[] = [];
  selectedCountries: number[] = [];
  selectedKpis: number[] = [];
  countries: CountryVM[] | null = [];
  pageSize: number = 10;
  currentPage: number = 1;
  totalRecords: number = 10;
  kpis: AnalyticalLayerResponseDto[] = [];
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<KpiComparisonChartOptions> = {};
  compareCountryResponseDto: CompareCountryResponseDto | null = null;
  isLoader: boolean = false;
  environment = environment.apiUrl;
  chartTableData: ChartTableRowDto[] = [];
  $kpiChanged = new Subject();
  isAiViewEnabled: boolean = false;
  mutipleCountrykpiLayerResults: GetMutiplekpiLayerResultsDto | null = null;
  viewDetailIndex = -1;
  downloadkpiSpinnerEnable =false;
  constructor(
    private adminService: AdminService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService
  ) {

  }

  ngOnInit(): void {
    this.isLoader = true;
    this.GetAllKpi();
    this.getCountryUserCountries();
    this.$kpiChanged.pipe(debounceTime(1000)).subscribe(x => {
      this.compareCountries();
    });
  }
  onAiViewToggle(value: boolean) {
    this.isAiViewEnabled = value; // REQUIRED
    this.getChartOptions();
  }
  kpiChanged() {
    this.$kpiChanged.next(true);
  }
  GetAllKpi() {
    this.adminService.GetAllKpi().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.kpis = res.result ?? [];
          this.totalRecords = this.kpis.length;
        }
      }
    });
  }
  getCountryUserCountries() {
    this.adminService.getAllCountriesByUserId(this.userService.userInfo.userID ?? 0).subscribe((p) => {
      this.isLoader = false;
      this.countries = p.result || [];
      if (this.countries?.length && this.selectedCountries.length < 2) {
        this.selectedCountries = this.countries.slice(0, 2).map(x => x.countryID);
        this.compareCountries();
      }
    });
  }
  getMutiplekpiLayerResults(layerID: number, viewDetailIndex: number) {

    if (this.selectedCountries.length < 1) {
      this.compareCountryResponseDto = null;
      this.getChartOptions();
      this.toaster.showWarning("Please select at least one country to view data.");
      return;
    }

    this.viewDetailIndex = viewDetailIndex;

    let payload: GetMutiplekpiLayerRequestDto = {
      countryIDs: this.selectedCountries,
      year: this.selectedYear,
      layerID: layerID
    }
    this.adminService.getMutiplekpiLayerResults(payload).subscribe({
      next: (res) => {
        this.viewDetailIndex = -1;
        if (res.succeeded) {
          this.mutipleCountrykpiLayerResults = res.result || null;
          const sidebarEl = document.getElementById('kpiLayerSidebar');
          const offcanvas = new bootstrap.Offcanvas(sidebarEl);
          offcanvas.show();
        }
        else {
          this.toaster.showInfo("No comparison data available for the selected countries.");
        }
      },
      error: (err) => {
        this.viewDetailIndex = -1;
        this.toaster.showError("Failed to load comparison data.");
      }
    });
  }
  compareCountries(currentPage = 1) {
    if (this.selectedCountries.length < 1) {
      this.compareCountryResponseDto = null;
      this.getChartOptions();
      this.toaster.showWarning("Please select at least one country to view data.");
      return;
    }
    this.isLoader = true;
    this.currentPage = currentPage;

    let payload: CompareCountryRequestDto = {
      countries: this.selectedCountries,
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      Kpis: this.selectedKpis
    }
    this.adminService.compareCountries(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.compareCountryResponseDto = res.result || null;
          this.getChartOptions();
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

  getChartOptions() {
    this.chartTableData = this.compareCountryResponseDto?.tableData ?? [];

    if (!this.chartTableData?.length) {
      this.totalRecords = 0;
    } else {
      this.totalRecords = this.kpis.length;
    }

    const kpiMap = new Map(
      this.chartTableData.map(x => [x.layerCode, x.layerName])
    );

    this.chartOptions = buildKpiComparisonChartOptions({
      countrySeries: this.compareCountryResponseDto?.series ?? [],
      categories: this.compareCountryResponseDto?.categories,
      kpiMap,
      colorPalette: this.commonService.kpiColors,
      isAiViewEnabled: this.isAiViewEnabled,
    });
  }
  getCountryScore(countryID: number, isAi: boolean = false): string {
    const country = this.countries?.find(c => c.countryID === countryID);
    if (isAi) {
      return country?.aiScore?.toFixed(1) || '0';
    }
    return country?.score?.toFixed(1) || '0';
  }

  getCountryImage(countryID: number): string {
    return this.countries?.find(c => c.countryID === countryID)?.image || '';
  }

  getCountry(countryID: number): string {
    return this.countries?.find(c => c.countryID === countryID)?.countryName || '';
  }

  getCountryContinent(countryID: number): string {
    return this.countries?.find(c => c.countryID === countryID)?.continent || '';
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  getPeerScore(): string {

    if (!this.chartTableData?.length) return 'NA';

    const peerCountries = this.countries?.filter(country =>
      this.chartTableData[0].countryValues?.some(row => row.countryID === country.countryID)
    ) ?? [];

    const avgPeerCountryScore =
      peerCountries.length > 0
        ? peerCountries.reduce((sum, row) => sum + (row.score ?? 0), 0) / peerCountries.length
        : 0;

    return avgPeerCountryScore.toFixed(1);
  }
  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.layerCode?.toLowerCase().includes(term) ||
      item.layerName?.toLowerCase().includes(term)
    );
  }

  get selectedKpiCodes(): string[] {
    return this.selectedKpis
      .map((id) => this.kpis.find((kpi) => kpi.layerID === id)?.layerCode ?? '')
      .filter(Boolean);
  }

  get selectedCountryNames(): string[] {
    return this.selectedCountries
      .map((id) => this.countries?.find((country) => country.countryID === id)?.countryName ?? '')
      .filter(Boolean);
  }

  exportData() {
    if (!this.selectedCountries.length) {
      this.toaster.showWarning("Please select countries");
      return;
    }
    const params = {
      countries: this.selectedCountries.join(','),
      kpis: null,
      updatedAt: new Date().toISOString()
    };

    this.downloadkpiSpinnerEnable = true;
    this.adminService.exportCompareCountries(params)
      .subscribe({
        next: (res: Blob) => {
          const url = window.URL.createObjectURL(res);
          const a = document.createElement("a");
          a.href = url;
          a.download = "Country_Comparison.xlsx";
          a.click();
          window.URL.revokeObjectURL(url); // good practice
          this.downloadkpiSpinnerEnable = false;
        },

        error: (err) => {
          this.downloadkpiSpinnerEnable = false;
          // Show user-friendly message
          this.toaster.showError(
            err?.error?.message || "Failed to export data. Please try again."
          );
        }
      });
  }
}