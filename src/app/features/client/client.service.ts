import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { HttpService } from 'src/app/core/http/http.service';
import { UserService } from 'src/app/core/services/user.service';
import { ProgramVM } from '../../core/models/ProgramVM';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { ProgramHistoryDto, GetProgramsSubmitionHistoryResponseDto, GetProgramQuestionHistoryResponseDto, UserProgramRequestDto } from 'src/app/core/models/ProgramHistoryDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { GetProgramPillarHistoryRequestDto } from 'src/app/core/models/AssessmentRequest';
import { QuestionsByUserPillarsResponsetDto } from 'src/app/core/models/GetQuestionHistoryResponseDto ';
import { PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { AnalyticalLayerResponseDto, GetAnalyticalLayerRequestDto, GetAnalyticalLayerResultDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { CompareProgramResponseDto } from 'src/app/core/models/CompareProgramResponseDto';
import { CompareProgramRequestDto } from 'src/app/core/models/CompareProgramRequestDto';
import { AiProgramPillarResponseDto } from 'src/app/core/models/aiVm/AiProgramPillarResponseDto';
import { AiProgramSummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestPdfDto';
import { GetMutiplekpiLayerRequestDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto';
import { GetMutiplekpiLayerResultsDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto';
import { DashboardModeResponseDto } from 'src/app/core/models/ProgramSignalDashboardDto';
import { StaffProgramGetPillarInfoRequestDto } from './models/StaffProgramGetPillarInfoRequestDto';
import { ProgramDetailsDto } from './models/ProgramDetailsDto';
import { ProgramPillarQuestionDetailsDto } from './models/ProgramPillarQuestionDetailsDto';
import { AddClientKpisProgramAndPillar } from './models/AddClientKpisProgramAndPillar';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  public staffProgramMappingIDSubject$ = new BehaviorSubject<number | null>(null);

  constructor(private http: HttpService, private userService: UserService) { }
  
  public getAllPillars() {
    return this.http.get(`Public/GetAllPillarAsync`).pipe(map(x => x as ResultResponseDto<PillarsVM[]>));
  }

  public getAllPrograms() {
    return this.http.get(`Public/getAllPrograms`).pipe(map(x => x as ResultResponseDto<ProgramVM[]>));
  }

  public getClientPrograms() {
    return this.http.get(`Client/getClientPrograms`).pipe(map(x => x as ResultResponseDto<ProgramVM[]>));
  }

  public getProgramsProgressByUserId() {
    return this.http.get(`Client/getProgramsProgressByUserId`).pipe(map(x => x as ResultResponseDto<GetProgramsSubmitionHistoryResponseDto[]>));
  }

  public getProgramQuestionHistory(request: UserProgramRequestDto) {
    return this.http.getWithQueryParams(`Client/getProgramQuestionHistory`, request).pipe(map(x => x as GetProgramQuestionHistoryResponseDto));
  }

  public getPrograms(request: PaginationUserRequest) {
    return this.http.getWithQueryParams(`Client/programs`, request).pipe(map(x => x as PaginationResponse<ProgramVM>));;
  }

  public getProgramDetails(request: UserProgramRequestDto) {
    return this.http.getWithQueryParams(`Client/getProgramDetails`, request).pipe(map(x => x as ResultResponseDto<ProgramDetailsDto>));
  }

  public getProgramPillarDetails(request: StaffProgramGetPillarInfoRequestDto) {
    return this.http.getWithQueryParams(`Client/GetProgramPillarDetails`, request).pipe(map(x => x as ResultResponseDto<ProgramPillarQuestionDetailsDto[]>));
  }

  public getClientKpi() {
    return this.http.get(`Client/getProgramUserKpi`).pipe(map(x => x as ResultResponseDto<AnalyticalLayerResponseDto[]>));;
  }

  public addClientKpisProgramAndPillar(request: AddClientKpisProgramAndPillar) {
    return this.http.post(`Client/addClientKpisProgramAndPillar`, request).pipe(map(x => x as ResultResponseDto<string>));
  }

  public comparePrograms(request: CompareProgramRequestDto) {
    return this.http.post(`Client/comparePrograms`, request).pipe(map(x => x as ResultResponseDto<CompareProgramResponseDto>));
  }

  public getAIProgramPillars(request: AiProgramSummeryRequestPdfDto) {
    return this.http
      .getWithQueryParams(`Client/getAIProgramPillars`,request)
      .pipe(map((x) => x as ResultResponseDto<AiProgramPillarResponseDto>));
  }

  public getAllProgramsByUserId(userId: number) {
    return this.http.get(`Program/getAllProgramsByUserId/` + userId).pipe(map(x => x as ResultResponseDto<ProgramVM[]>));;
  }

  public exportPillarsHistoryByUserId(request: GetProgramPillarHistoryRequestDto) {
    return this.http.ImportFile(`Pillar/ExportPillarsHistoryByUserId`, request);
  }

  public getQuestionsHistoryByPillar(request: GetProgramPillarHistoryRequestDto) {
    return this.http.getWithQueryParams(`Question/getQuestionsHistoryByPillar`, request).pipe(map(x => x as ResultResponseDto<QuestionsByUserPillarsResponsetDto[]>));
  }

  public GetAnalyticalLayerResults(request: GetAnalyticalLayerRequestDto) {
    return this.http.getWithQueryParams(`Kpi/GetAnalyticalLayerResults`, request).pipe(map(x => x as PaginationResponse<GetAnalyticalLayerResultDto>));;
  }

  public GetAllKpi() {
    return this.http.get(`Kpi/GetAllKpi`).pipe(map(x => x as ResultResponseDto<AnalyticalLayerResponseDto[]>));;
  }

  public getMutiplekpiLayerResults(payload: GetMutiplekpiLayerRequestDto) {
    return this.http.post(`kpi/getMutiplekpiLayerResults`, payload).pipe(map(x => x as ResultResponseDto<GetMutiplekpiLayerResultsDto>));;
  }

  public getAmbitionDeliveryIndexDashboard(climateProgramID: number) {
    return this.http.getWithQueryParams(`Dashboard/getAmbitionDeliveryIndexDashboard`, { climateProgramID })
      .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }

  public getDiplomaticRiskDashboard(climateProgramID: number) {
    return this.http.getWithQueryParams(`Dashboard/getDiplomaticRiskDashboard`, { climateProgramID })
      .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }
  
  public getReadinessScorecardDashboard(climateProgramID: number) {
    return this.http.getWithQueryParams(`Dashboard/getReadinessScorecardDashboard`, { climateProgramID })
      .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }
  
  public exportCompareProgramsClients(params: any) {
    return this.http.ImportFile(`Client/ExportComparePrograms`, params);
  }

}
