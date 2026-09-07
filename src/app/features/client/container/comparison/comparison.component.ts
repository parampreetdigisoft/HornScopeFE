import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid, ApexLegend, ApexMarkers, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis, ChartComponent } from 'ng-apexcharts';
import { CompareProgramKpiDetailComponent } from 'src/app/shared/standAlone/compare-program-kpi-detail/compare-program-kpi-detail.component';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { GetMutiplekpiLayerRequestDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto';
import { GetMutiplekpiLayerResultsDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto';
import { CompareProgramResponseDto, ChartTableRowDto } from 'src/app/core/models/CompareProgramResponseDto';
import { AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { CompareProgramRequestDto } from 'src/app/core/models/CompareProgramRequestDto';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonService } from 'src/app/core/services/common.service';
import { UserDataShareService } from '../../user-data-share.service';
import { SharedModule } from 'src/app/shared/share.module';
import { environment } from 'src/environments/environment';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { ClientService } from '../../client.service';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';
import { VCP_CHART } from 'src/app/core/constants/ahi-chart-theme';
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
  colors: string[];
};

@Component({
  standalone: true,
  selector: 'app-comparison',
  templateUrl: './comparison.component.html',
  styleUrl: './comparison.component.css',
  imports: [CommonModule, SharedModule, CircularScoreComponent,CompareProgramKpiDetailComponent]
})
export class ComparisonComponent implements OnInit, OnDestroy {
  pillers: PillarsVM[] = [];
  selectedPrograms: number[] = [];
  selectedKpis: number[] = [];
  programs: ProgramVM[] | null = [];
  pageSize: number = 10;
  currentPage: number = 1;
  totalRecords: number = 10;
  kpis: AnalyticalLayerResponseDto[] = [];
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions> = {};
  compareProgramResponseDto: CompareProgramResponseDto | null = null;
  isLoader: boolean = false;
  environment = environment.apiUrl;
  chartTableData: ChartTableRowDto[] = [];
  $kpiChanged = new Subject();
  mutipleCitykpiLayerResults: GetMutiplekpiLayerResultsDto | null = null;
  viewDetailIndex = -1;
  downloadkpiSpinnerEnable =false;
  constructor(
    private clientService: ClientService,
    private toaster: ToasterService,
    public commonService: CommonService,
    private userDataShareService: UserDataShareService
  ) {

  }
  ngOnDestroy(): void {
    this.userDataShareService.compareProgram.set([]);
  }

  ngOnInit(): void {
    this.isLoader = true;
    this.selectedPrograms = this.userDataShareService.compareProgram()?.map(x => x.climateProgramID) ?? [];
    this.GetAllKpi();
    this.getClientPrograms();
    this.$kpiChanged.pipe(debounceTime(1000)).subscribe(x => {
      this.comparePrograms();
    });
  }

  kpiChanged() {
    this.$kpiChanged.next(true);
  }
  GetAllKpi() {
    this.clientService.GetAllKpi().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.kpis = res.result ?? [];
          this.totalRecords = this.kpis.length;
        }
      }
    });
  }
  getClientPrograms() {
    this.clientService.getClientPrograms().subscribe((p) => {
      this.isLoader = false;
      this.programs = p.result || [];
      if (this.programs?.length && this.selectedPrograms.length < 2) {
        this.selectedPrograms = this.programs.slice(0, 2).map(x => x.climateProgramID);
      }
      this.comparePrograms();
    });
  }
  getMutiplekpiLayerResults(layerID: number, viewDetailIndex:number) {

    if (this.selectedPrograms.length < 1) {
      this.compareProgramResponseDto = null;
      this.getChartOptions();
      this.toaster.showWarning("Please select at least one program to view data.");
      return;
    }

    this.viewDetailIndex = viewDetailIndex;

    let payload: GetMutiplekpiLayerRequestDto = {
      climateProgramIDs: this.selectedPrograms,
      layerID: layerID
    }
    this.clientService.getMutiplekpiLayerResults(payload).subscribe({
      next: (res) => {
        this.viewDetailIndex = -1;
        if (res.succeeded) {
          this.mutipleCitykpiLayerResults = res.result || null;
          const sidebarEl = document.getElementById('kpiLayerSidebar');
          const offcanvas = new bootstrap.Offcanvas(sidebarEl);
          offcanvas.show();
        }
        else {
          this.toaster.showInfo("No comparison data available for the selected programs.");
        }
      },
      error: (err) => {
        this.viewDetailIndex = -1;
        this.toaster.showError("Failed to load comparison data.");
      }
    });
  }
  comparePrograms(currentPage = 1) {
    if (this.selectedPrograms.length < 1) {
      this.compareProgramResponseDto = null;
      this.getChartOptions();
      this.toaster.showWarning("Please select at least one program to view data.");
      return;
    }
    this.isLoader = true;
    this.currentPage = currentPage;

    let payload: CompareProgramRequestDto = {
      programs: this.selectedPrograms,
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      Kpis: this.selectedKpis
    }
    this.clientService.comparePrograms(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.compareProgramResponseDto = res.result || null;
          this.getChartOptions();
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
  getChartOptions() {
    this.chartTableData = this.compareProgramResponseDto?.tableData ?? [];

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
    const colors: string[] = [];
    (this.compareProgramResponseDto?.series ?? []).forEach((programData, index) => {
      // Skip the last program if AI View is enabled (assuming last program is AI benchmark)
      if (index === (this.compareProgramResponseDto?.series ?? []).length - 1) {
        return;
      }

      const baseColor = colorPalette[index % colorPalette.length];

      // Evaluation series (solid line)
      series.push({
        name: `${programData.name}`,
        data: programData.aiData,
        color: baseColor,
        type: 'line'
      });
      colors.push(baseColor);
      strokeDashArray.push(0); // Solid line
    });

    const allValues = series.flatMap(s => s.data ?? []).filter(v => v !== null && v !== undefined && !isNaN(Number(v))).map(v => Number(v));
    const dataMin = allValues.length ? Math.min(...allValues) : 0;
    const dataMax = allValues.length ? Math.max(...allValues) : 100;
    const yMin = dataMin < 0 ? Math.floor(dataMin / 10) * 10 : 0;
    const yMax = Math.max(100, Math.ceil(dataMax / 10) * 10);

    let option: Partial<ChartOptions> = {
      series: series,
      colors: colors,
      chart: {
        height: 400,
        type: "line",
        background: 'transparent',
        foreColor: VCP_CHART.textMuted,
        fontFamily: 'Poppins, sans-serif',
        zoom: { enabled: false, type: 'x' },
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
        } as any,
        dropShadow: {
          enabled: true,
          top: 0,
          left: 0,
          blur: 4,
          opacity: 0.25,
        }
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
        strokeColors: VCP_CHART.deep,
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
        labels: {
          colors: VCP_CHART.text
        },
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
        borderColor: VCP_CHART.grid,
        strokeDashArray: 4,
        row: {
          colors: ['rgba(59, 158, 255, 0.04)', 'transparent'],
          opacity: 1,
        },
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { top: 8, right: 12, bottom: 0, left: 8 },
      },
      xaxis: {
        type: "category",
        categories: this.compareProgramResponseDto?.categories,
        labels: {
          rotate: -15,
          rotateAlways: true,
          style: {
            fontSize: '11px',
            fontWeight: 500,
            colors: VCP_CHART.textMuted
          },
          trim: false
        },
        tooltip: {
          enabled: false
        },
        axisBorder: {
          show: true,
          color: VCP_CHART.border
        },
        axisTicks: {
          show: true,
          color: VCP_CHART.border
        }
      },
      yaxis: {
        min: yMin,
        max: yMax,
        forceNiceScale: true,
        decimalsInFloat: 0,
        labels: {
          show: true,
          formatter: (val: number) => (val != null && !isNaN(val) ? Math.round(val).toString() : ''),
          style: {
            fontSize: '12px',
            fontWeight: 500,
            colors: [VCP_CHART.textMuted]
          }
        },
        title: {
          text: "Score Difference",
          style: {
            fontSize: '14px',
            fontWeight: 600,
            color: VCP_CHART.text
          }
        },
        axisBorder: {
          show: true,
          color: VCP_CHART.border
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: 'dark',
        style: {
          fontSize: '12px',
          fontFamily: 'Poppins, sans-serif'
        },
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const layerCode = this.compareProgramResponseDto?.categories?.[dataPointIndex] ?? "";
          const layerName = kpiMap.get(layerCode) ?? "";

          let tooltipHtml = `
          <div style="padding: 14px 16px; min-width: 260px; background: linear-gradient(160deg, #12243f 0%, #0d1a30 100%); border-radius: 12px; box-shadow: ${VCP_CHART.tooltipShadow}; border: 1px solid rgba(92, 140, 200, 0.35); font-family: Poppins, sans-serif; color: #f8fafc;">
            <div style="font-weight: 700; margin-bottom: 10px; color: #ffffff; font-size: 13px; border-bottom: 1px solid rgba(92, 140, 200, 0.28); padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; background: linear-gradient(135deg, #3B9EFF, #A8E063); border-radius: 50%; display: inline-block;"></span>
              ${layerCode}${layerName ? ' - ' + layerName : ''}
            </div>
        `;

          // Group evaluation and AI values together
          const programs = this.compareProgramResponseDto?.series ?? [];
          programs.forEach((program, idx) => {
            // Skip last program if it's the AI benchmark
            if (idx === programs.length - 1) {
              return;
            }
            const aiValue = program.aiData?.[dataPointIndex];
            const color = colorPalette[idx % colorPalette.length];

            tooltipHtml += `
              <div style="margin: 8px 0; padding: 10px 12px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; border-left: 3px solid ${color}; border: 1px solid rgba(92, 140, 200, 0.18); border-left-width: 3px;">
                <div style="font-weight: 600; color: ${color}; margin-bottom: 6px; font-size: 13px;">
                  ${program.name}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                  <span style="color: #9AADC4;">Score</span>
                  <span style="font-weight: 700; color: #E8EEF8; font-size: 13px;">${aiValue != null && !isNaN(aiValue) ? Number(aiValue).toFixed(2) : '0.00'}</span>
                </div>
              </div>
            `;
          });

          tooltipHtml += '</div>';
          return tooltipHtml;
        }
      }
    };

    this.chartOptions = option;
  }

  getProgramImage(climateProgramID: number): string {
    return this.programs?.find(c => c.climateProgramID === climateProgramID)?.image || '';
  }

  getProgramScore(climateProgramID: number, isAi: boolean = false): string {
    const program = this.programs?.find(c => c.climateProgramID === climateProgramID);
    if (isAi) {
      return program?.aiScore?.toFixed(2) || '0';
    }
    return program?.score?.toFixed(2) || '0';
  }

  getProgram(climateProgramID: number): string {
    return this.programs?.find(c => c.climateProgramID === climateProgramID)?.programName || '';
  }

  // getProgramLocation(climateProgramID: number): string {
  //   return this.programs?.find(c => c.climateProgramID === climateProgramID)?.location || '';
  // }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  getPeerScore(): string {

    if (!this.chartTableData?.length) return 'NA';

    const peerPrograms = this.programs?.filter(program =>
      this.chartTableData[0].programValues?.some(row => row.climateProgramID === program.climateProgramID)
    ) ?? [];

    const avgPeerProgramScore =
      peerPrograms.length > 0
        ? peerPrograms.reduce((sum, row) => sum + (row.score ?? 0), 0) / peerPrograms.length
        : 0;

    return avgPeerProgramScore.toFixed(2);
  }

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.layerCode?.toLowerCase().includes(term) ||
      item.layerName?.toLowerCase().includes(term)
    );
  }
  exportData() { 
  if (!this.selectedPrograms.length) {
    this.toaster.showWarning("Please select programs");
    return;
  }
  const params = {
    programs: this.selectedPrograms.join(','),
    kpis: null,
    updatedAt: new Date().toISOString()
  };
 this.downloadkpiSpinnerEnable = true;
  this.clientService.exportCompareProgramsClients(params)
    .subscribe({
      next: (res: Blob) => {
        this.downloadkpiSpinnerEnable = false;
        const url = window.URL.createObjectURL(res);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Program_Comparison.xlsx";
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