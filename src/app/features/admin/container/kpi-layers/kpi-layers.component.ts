import { GetAnalyticalLayerResultDto, AnalyticalLayerResponseDto, GetAnalyticalLayerRequestDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { UserService } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { AdminService } from '../../admin.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/share.module';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { debounceTime, Subject } from 'rxjs';
import { CommonService } from 'src/app/core/services/common.service';
declare var bootstrap: any; // 👈 use Bootstrap JS API
@Component({
  standalone: true,
  imports: [CommonModule, SharedModule, SparklineScoreComponent, CircularScoreComponent],
  selector: 'app-kpi-layers',
  templateUrl: './kpi-layers.component.html',
  styleUrl: './kpi-layers.component.css'
})
export class KpiLayersComponent {
  urlBase = environment.apiUrl;
  selectedKpi: GetAnalyticalLayerResultDto | null | undefined = null;
  selectedclimateProgramID?: number;
  selectedkpiLayerID?: number;
  kpiLayersResponse: PaginationResponse<GetAnalyticalLayerResultDto> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  loading: boolean = false;
  isLoader: boolean = false;
  kpis: AnalyticalLayerResponseDto[] = [];
  programList: ProgramVM[] = [];
  $kpiChanged = new Subject();
  kpiLayers: GetAnalyticalLayerResultDto[] = [];
  kpiSearchFn = (term: string, item: any) => this.customSearchFn(term, item, 'kpi');
  programSearchFn = (term: string, item: any) => this.customSearchFn(term, item, 'program');
  constructor(private adminService: AdminService, private toaster: ToasterService, private userService: UserService, public commonService:CommonService) { }

  ngOnInit(): void {
    this.getAnalyticalLayerResults(1);
    this.getProgramUserPrograms();
    this.GetAllKpi();
    this.$kpiChanged.pipe(debounceTime(1000)).subscribe(x => {
      this.getAnalyticalLayerResults();
    });
  }
  kpiChanged() {
    this.$kpiChanged.next(true);
  }
  
  getAnalyticalLayerResults(currentPage: any = 1) {
    this.kpiLayersResponse = undefined;
    this.isLoader = true;
    let payload: GetAnalyticalLayerRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: 'CalValue5',
      pageNumber: currentPage,
      pageSize: this.pageSize,
      userId: this.userService?.userInfo?.userID
    }
    if (this.selectedclimateProgramID != undefined && this.selectedclimateProgramID != 0) {
      payload.climateProgramID = this.selectedclimateProgramID;
    }
    if (this.selectedkpiLayerID != undefined && this.selectedkpiLayerID != 0) {
      payload.layerID = this.selectedkpiLayerID;
    }
    this.adminService.getAnalyticalLayerResults(payload).subscribe(kpiLayers => {
      this.kpiLayersResponse = kpiLayers;
      this.totalRecords = kpiLayers.totalRecords;
      this.currentPage = currentPage;
      this.pageSize = kpiLayers.pageSize;
      this.isLoader = false;
    });
  }

  ngOnDestroy(): void {
  }

  viewDetails(program: GetAnalyticalLayerResultDto) {   
    this.selectedKpi = program;  
    const sidebarEl = document.getElementById('kpiLayerSidebar');
    const offcanvas = new bootstrap.Offcanvas(sidebarEl);
    offcanvas.show();
  }
  GetAllKpi() {
    this.adminService.GetAllKpi().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.kpis = res.result ?? [];
        }
      }
    });
  }
  getProgramUserPrograms() {
    this.adminService.getAllProgramsByUserId(this.userService.userInfo.userID ?? 0).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.programList = res.result ?? [];
        }
      }
    });
  }

  getConditionByid(layer: GetAnalyticalLayerResultDto) {
    return layer?.fiveLevelInterpretations?.find(x => x.interpretationID == layer.interpretationID)?.condition || '';
  }

  customSearchFn(term: string, item: any, type: 'kpi' | 'program') {
    term = term.toLowerCase();
    if (type === 'kpi') {
      return (
        item.layerCode?.toLowerCase().includes(term) ||
        item.layerName?.toLowerCase().includes(term)
      );
    } else if (type === 'program') {
      return (
        item.programName?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term) ||
        item.year?.toString().includes(term)
      );
    }
    return false;
  }
}
