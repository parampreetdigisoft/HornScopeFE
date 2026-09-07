import { Component, OnInit, ViewChild } from "@angular/core";
import { ChartComponent } from "ng-apexcharts";
import { Subject, debounceTime } from "rxjs";
import { ProgramVM } from "src/app/core/models/ProgramVM";
import { CompareProgramRequestDto } from "src/app/core/models/CompareProgramRequestDto";
import { CompareProgramResponseDto, ChartTableRowDto } from "src/app/core/models/CompareProgramResponseDto";
import { AnalyticalLayerResponseDto } from "src/app/core/models/GetAnalyticalLayerResultDto";
import { PillarsVM } from "src/app/core/models/PillersVM";
import { CommonService } from "src/app/core/services/common.service";
import { ToasterService } from "src/app/core/services/toaster.service";
import { UserService } from "src/app/core/services/user.service";
import { environment } from "src/environments/environment";
import { AnalystService } from "../../analyst.service";
import { CommonModule } from "@angular/common";
import { SharedModule } from "src/app/shared/share.module";
import { CircularScoreComponent } from "src/app/shared/standAlone/circular-score/circular-score.component";
import { AiButtonComponent } from "src/app/shared/standAlone/ai-button/ai-button.component";
import { GetMutiplekpiLayerResultsDto } from "src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto";
import { GetMutiplekpiLayerRequestDto } from "src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto";
import { CompareProgramKpiDetailComponent } from "src/app/shared/standAlone/compare-program-kpi-detail/compare-program-kpi-detail.component";
import {
  KpiComparisonChartOptions,
  buildKpiComparisonChartOptions,
} from "src/app/core/constants/kpi-comparison-chart.util";
declare var bootstrap: any;

@Component({
  standalone: true,
  selector: 'app-kpi-comparision',
  templateUrl: './kpi-comparision.component.html',
  styleUrl: './kpi-comparision.component.css',
  imports: [CommonModule, SharedModule, CircularScoreComponent, AiButtonComponent, CompareProgramKpiDetailComponent]
})
export class KpiComparisionComponent implements OnInit {
  pillers: PillarsVM[] = [];
  selectedPrograms: number[] = [];
  selectedKpis: number[] = [];
  programs: ProgramVM[] | null = [];
  pageSize: number = 10;
  currentPage: number = 1;
  totalRecords: number = 10;
  kpis: AnalyticalLayerResponseDto[] = [];
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<KpiComparisonChartOptions> = {};
  compareProgramResponseDto: CompareProgramResponseDto | null = null;
  isLoader: boolean = false;
  environment = environment.apiUrl;
  chartTableData: ChartTableRowDto[] = [];
  $kpiChanged = new Subject();
  isAiViewEnabled: boolean = false;
  mutipleProgramkpiLayerResults: GetMutiplekpiLayerResultsDto | null = null;
  viewDetailIndex = -1;
  downloadkpiSpinnerEnable =false;
  constructor(
    private analystService: AnalystService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService
  ) {

  }

  ngOnInit(): void {
    this.isLoader = true;
    this.GetAllKpi();
    this.getProgramUserPrograms();
    this.$kpiChanged.pipe(debounceTime(1000)).subscribe(x => {
      this.comparePrograms();
    });
  }
  onAiViewToggle(value: boolean) {
    this.isAiViewEnabled = value; // 👈 REQUIRED
    this.getChartOptions();
  }
  kpiChanged() {
    this.$kpiChanged.next(true);
  }
  GetAllKpi() {
    this.analystService.GetAllKpi().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.kpis = res.result ?? [];
          this.totalRecords = this.kpis.length;
        }
      }
    });
  }
  getProgramUserPrograms() {
    this.analystService.getAllProgramsByUserId(this.userService.userInfo.userID ?? 0).subscribe((p) => {
      this.isLoader = false;
      this.programs = p.result || [];
      if (this.programs?.length && this.selectedPrograms.length < 2) {
        this.selectedPrograms = this.programs.slice(0, 2).map(x => x.climateProgramID);
        this.comparePrograms();
      }
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
    this.analystService.getMutiplekpiLayerResults(payload).subscribe({
      next: (res) => {
        this.viewDetailIndex = -1;
        if (res.succeeded) {
          this.mutipleProgramkpiLayerResults = res.result || null;
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
    this.analystService.comparePrograms(payload).subscribe({
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

    this.chartOptions = buildKpiComparisonChartOptions({
      programSeries: this.compareProgramResponseDto?.series ?? [],
      categories: this.compareProgramResponseDto?.categories,
      kpiMap,
      colorPalette: this.commonService.kpiColors,
      isAiViewEnabled: this.isAiViewEnabled,
    });
  }

  getProgramScore(climateProgramID: number, isAi: boolean = false): string {
    const program = this.programs?.find(c => c.climateProgramID === climateProgramID);
    if (isAi) {
      return program?.aiScore?.toFixed(2) || '0';
    }
    return program?.score?.toFixed(2) || '0';
  }

  getProgramImage(climateProgramID: number): string {
    return this.programs?.find(c => c.climateProgramID === climateProgramID)?.image || '';
  }


  getProgramName(climateProgramID: number): string {
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
}