import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid, ApexLegend, ApexMarkers, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis, ChartComponent } from 'ng-apexcharts';
import { CompareCountryKpiDetailComponent } from 'src/app/shared/standAlone/compare-country-kpi-detail/compare-country-kpi-detail.component';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SelectOverflowLabelComponent } from 'src/app/shared/standAlone/select-overflow-label/select-overflow-label.component';
import { GetMutiplekpiLayerRequestDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto';
import { GetMutiplekpiLayerResultsDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto';
import { CompareCountryResponseDto, ChartTableRowDto } from 'src/app/core/models/CompareCountryResponseDto';
import { AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { CompareCountryRequestDto } from 'src/app/core/models/CompareCountryRequestDto';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonService } from 'src/app/core/services/common.service';
import { UserDataShareService } from '../../user-data-share.service';
import { SharedModule } from 'src/app/shared/share.module';
import { environment } from 'src/environments/environment';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { CountryUserService } from '../../country-user.service';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';
import { computeKpiChartYRange } from 'src/app/core/constants/kpi-comparison-chart.util';
declare var bootstrap: any; 
export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  markers: ApexMarkers;
  legend: ApexLegend;
  grid: ApexGrid;
};

@Component({
  standalone: true,
  selector: 'app-comparison',
  templateUrl: './comparison.component.html',
  styleUrl: './comparison.component.css',
  imports: [CommonModule, SharedModule, CircularScoreComponent, CompareCountryKpiDetailComponent, SelectOverflowLabelComponent]
})
export class ComparisonComponent implements OnInit, OnDestroy {

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
  public chartOptions: Partial<ChartOptions> = {};
  compareCountryResponseDto: CompareCountryResponseDto | null = null;
  isLoader: boolean = false;
  environment = environment.apiUrl;
  chartTableData: ChartTableRowDto[] = [];
  $kpiChanged = new Subject();
  mutipleCitykpiLayerResults: GetMutiplekpiLayerResultsDto | null = null;
  viewDetailIndex = -1;
  downloadkpiSpinnerEnable =false;
  constructor(
    private countryUserService: CountryUserService,
    private toaster: ToasterService,
    public commonService: CommonService,
    private userDataShareService: UserDataShareService
  ) {

  }
  ngOnDestroy(): void {
    this.userDataShareService.compareCountry.set([]);
  }

  ngOnInit(): void {
    this.isLoader = true;
    this.selectedCountries = this.userDataShareService.compareCountry()?.map(x => x.countryID) ?? [];
    this.countryUserService
    this.GetAllKpi();
    this.getCountryUserCountries();
    this.$kpiChanged.pipe(debounceTime(1000)).subscribe(x => {
      this.compareCountries();
    });
  }

  kpiChanged() {
    this.$kpiChanged.next(true);
  }
  GetAllKpi() {
    this.countryUserService.GetAllKpi().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.kpis = res.result ?? [];
          this.totalRecords = this.kpis.length;
        }
      }
    });
  }
  getCountryUserCountries() {
    this.countryUserService.getCountryUserCountries().subscribe((p) => {
      this.isLoader = false;
      this.countries = p.result || [];
      if (this.countries?.length && this.selectedCountries.length < 2) {
        this.selectedCountries = this.countries.slice(0, 2).map(x => x.countryID);
      }
      this.compareCountries();
    });
  }
  getMutiplekpiLayerResults(layerID: number, viewDetailIndex:number) {

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
    this.countryUserService.getMutiplekpiLayerResults(payload).subscribe({
      next: (res) => {
        this.viewDetailIndex = -1;
        if (res.succeeded) {
          this.mutipleCitykpiLayerResults = res.result || null;
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
    this.countryUserService.compareCountries(payload).subscribe({
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

    const colorPalette = this.commonService.kpiColors;
    let series: any[] = [];
    let strokeDashArray: number[] = [];

    (this.compareCountryResponseDto?.series ?? []).forEach((countryData, index) => {
      // Skip the last country if AI View is enabled (assuming last country is AI benchmark)
      if (index === (this.compareCountryResponseDto?.series ?? []).length - 1) {
        return;
      }

      const baseColor = colorPalette[index % colorPalette.length];

      // Evaluation series (solid line)
      series.push({
        name: `${countryData.name}`,
        data: countryData.aiData,
        color: baseColor,
        type: 'line'
      });
      strokeDashArray.push(0); // Solid line
    });

    const yRange = computeKpiChartYRange(series);

    let option: Partial<ChartOptions> = {
      series: series,
      chart: {
        height: 400,
        type: "line",
        background: 'transparent',
        foreColor: '#8FA3B5',
        zoom: {
          enabled: false,
          type: 'x'
        },
        toolbar: {
          show: true,
          tools: {
            download: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        } as any
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: "smooth",
        width: 3,
        dashArray: strokeDashArray // Different dash patterns for each series
      },
      markers: {
        size: 5,
        strokeWidth: 2,
        hover: {
          size: 7,
          sizeOffset: 3
        }
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'center',
        fontSize: '13px',
        fontWeight: 500,
        labels: { colors: '#E8EEF4' },
        markers: {
          width: 20,
          height: 3,
          radius: 0
        } as any,
        itemMargin: {
          horizontal: 15,
          vertical: 5
        },
        onItemClick: {
          toggleDataSeries: true
        },
        onItemHover: {
          highlightDataSeries: true
        }
      },
      grid: {
        borderColor: '#16324A',
        strokeDashArray: 3,
        row: {
          colors: ['rgba(197,160,90,0.06)', 'transparent'],
          opacity: 0.5
        },
        xaxis: {
          lines: {
            show: true
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        },
        padding: {
          top: 0,
          right: 10,
          bottom: 0,
          left: 10
        }
      },
      xaxis: {
        type: "category",
        categories: this.compareCountryResponseDto?.categories,
        labels: {
          rotate: -15,
          rotateAlways: true,
          style: {
            fontSize: '11px',
            fontWeight: 500,
            colors: '#8FA3B5'
          },
          trim: false
        },
        tooltip: {
          enabled: false
        },
        axisBorder: {
          show: true,
          color: '#7A8A9A'
        },
        axisTicks: {
          show: true,
          color: '#7A8A9A'
        }
      },
      yaxis: {
        min: yRange.min,
        max: yRange.max,
        forceNiceScale: true,
        decimalsInFloat: 0,
        labels: {
          show: true,
          formatter: (val: number) => parseInt(val.toString(), 10).toString(),
          style: {
            fontSize: '12px',
            fontWeight: 500,
            colors: ['#8FA3B5']
          }
        },
        title: {
          text: "Score",
          style: {
            fontSize: '14px',
            fontWeight: 600,
            color: '#E8EEF4'
          }
        },
        axisBorder: {
          show: true,
          color: '#7A8A9A'
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const layerCode = this.compareCountryResponseDto?.categories?.[dataPointIndex] ?? "";
          const layerName = kpiMap.get(layerCode) ?? "";

          let tooltipHtml = `
          <div style="padding: 12px; background: #123049; border: 1px solid #1E3D5C; border-radius: 8px; box-shadow: 0 12px 32px rgba(0,0,0,0.45); min-width: 250px;">
            <div style="font-weight: 600; margin-bottom: 10px; color: #E8EEF4; font-size: 13px; border-bottom: 2px solid #1E3D5C; padding-bottom: 6px;">
              ${layerCode} - ${layerName}
            </div>
        `;

          // Group evaluation and AI values together
          const countries = this.compareCountryResponseDto?.series ?? [];
          countries.forEach((country, idx) => {
            // Skip last country if it's the AI benchmark
            if (idx === countries.length - 1) {
              return;
            }
            const aiValue = country.aiData?.[dataPointIndex];
            const color = colorPalette[idx % colorPalette.length];

            tooltipHtml += `
              <div style="margin: 8px 0; padding: 8px; background: linear-gradient(135deg, #16324A 0%, #123049 100%); border-radius: 6px; border-left: 3px solid ${color};">
                <div style="font-weight: 600; color: ${color}; margin-bottom: 6px; font-size: 12px;">
                  ${country.name}
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
                  <span style="color: #8FA3B5;">📊 Score:</span>
                  <span style="font-weight: 600; color: #E8EEF4;">${aiValue.toFixed(2)}</span>
                </div>
            `;
            tooltipHtml += `</div>`;
          });

          tooltipHtml += '</div>';
          return tooltipHtml;
        }
      }
    };

    this.chartOptions = option;
  }

  getCountryImage(countryID: number): string {
    return this.countries?.find(c => c.countryID === countryID)?.image || '';
  }

  getCountryScore(countryID: number, isAi: boolean = false): string {
    const country = this.countries?.find(c => c.countryID === countryID);
    if (isAi) {
      return country?.aiScore?.toFixed(2) || '0';
    }
    return country?.score?.toFixed(2) || '0';
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

    return avgPeerCountryScore.toFixed(2);
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
  this.countryUserService.exportCompareCountriesCountryUsers(params)
    .subscribe({
      next: (res: Blob) => {
        this.downloadkpiSpinnerEnable = false;
        const url = window.URL.createObjectURL(res);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Country_Comparison.xlsx";
        a.click();
        window.URL.revokeObjectURL(url); // good practice
      },

      error: (err) => {
        this.downloadkpiSpinnerEnable = false;
        this.toaster.showError(
          err?.error?.message || "Failed to export data. Please try again."
        );
      }
    });
}
}