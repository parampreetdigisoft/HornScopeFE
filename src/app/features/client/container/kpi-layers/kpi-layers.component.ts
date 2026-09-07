import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';
import { ClientService } from '../../client.service';
import { UserDataShareService } from '../../user-data-share.service';
import { AnalyticalLayerResponseDto, GetAnalyticalLayerRequestDto, GetAnalyticalLayerResultDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { debounceTime, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/share.module';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { ViewClientKpiLayerComponent } from '../../features/view-kpi-layer/view-client-kpi-layer.component';
import { CommonService } from 'src/app/core/services/common.service';
declare var bootstrap: any; // 👈 use Bootstrap JS API
@Component({
  standalone: true,
  imports: [CommonModule,SparklineScoreComponent,CircularScoreComponent,ViewClientKpiLayerComponent,SharedModule],
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
  constructor(private clientService: ClientService, private toaster: ToasterService, private userService: UserService, private router: Router, private userDataService: UserDataShareService, public commonService:CommonService) { }

  ngOnInit(): void {
    this.GetAnalyticalLayerResults(1);
    this.getClientPrograms();
    this.GetAllKpi();
    this.$kpiChanged.pipe(debounceTime(1000)).subscribe(x => {
      this.GetAnalyticalLayerResults();
    });
  }
  kpiChanged() {
    this.$kpiChanged.next(true);
  }
  GetAnalyticalLayerResults(currentPage: any = 1) {
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
      payload.climateProgramID = this.selectedclimateProgramID
    }
      if (this.selectedkpiLayerID != undefined && this.selectedkpiLayerID != 0) {
      payload.layerID = this.selectedkpiLayerID
    }
    this.clientService.GetAnalyticalLayerResults(payload).subscribe(kpiLayers => {
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
    this.clientService.getClientKpi().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.kpis = res.result ?? [];
        }
      }
    });
  }
  getClientPrograms() {
    this.clientService.getClientPrograms().subscribe({
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
  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.layerCode?.toLowerCase().includes(term) ||
      item.layerName?.toLowerCase().includes(term)
    );
  }
}
