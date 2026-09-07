import { map, Subject, tap } from 'rxjs';
import { Injectable } from '@angular/core';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { PillarKpiMappingDto } from 'src/app/core/models/PillarKpiMappingDto';
import { HttpService } from 'src/app/core/http/http.service';
import { UserService } from 'src/app/core/services/user.service';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { ProgramPillerRequestDto } from 'src/app/core/models/QuestionRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { CompareProgramRequestDto } from 'src/app/core/models/CompareProgramRequestDto';
import { CompareProgramResponseDto } from 'src/app/core/models/CompareProgramResponseDto';
import { GetAssignUserDto, PublicUserResponse } from 'src/app/core/models/UserInfo';
import { PillarsHistoryResponse } from 'src/app/core/models/PillarsUserHistoryResponse';
import { InviteBulkUserDto, InviteUserDto, UpdateInviteUserDto } from '../../core/models/AnalystVM';
import { ProgramHistoryDto, UserProgramPillarDashboardRequestDto } from '../../core/models/ProgramHistoryDto';
import { QuestionsByUserPillarsResponsetDto } from 'src/app/core/models/GetQuestionHistoryResponseDto ';
import { AiProgramPillarDashboardResponseDto } from 'src/app/core/models/AiProgramPillarDashboardResponseDto';
import { GetUserByRoleRequestDto, GetUserByRoleResponse } from '../../core/models/GetUserByRoleResponse';
import { AddBulkQuestionsDto, AddQuestionRequest, GetQuestionRequest, GetQuestionResponse } from 'src/app/core/models/QuestionResponse';
import { AssessmentWithProgressVM, GetAssessmentQuestionResponseDto, GetAssessmentResponse } from 'src/app/core/models/AssessmentResponse';
import { AnalyticalLayerResponseDto, GetAnalyticalLayerRequestDto, GetAnalyticalLayerResultDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { ChangeAssessmentStatusRequestDto, GetAssessmentQuestionRequestDto, GetAssessmentRequestDto, GetProgramPillarHistoryRequestDto, GetProgramPillarHistoryRequestNewDto, GetProgramProgressHistoryRequestDto, TransferAssessmentRequestDto } from 'src/app/core/models/AssessmentRequest';
import { GetMutiplekpiLayerRequestDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto';
import { GetMutiplekpiLayerResultsDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto';
import { EmailExistDto } from 'src/app/core/models/EmailExistDto';
// import { ExportProgramWithOptionDto } from 'src/app/core/models/ExportProgramsWithOptionDto';
import { DashboardModeResponseDto } from 'src/app/core/models/ProgramSignalDashboardDto';
import { PaginationProgramRequest } from 'src/app/core/models/PaginationRequest';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { ExportProgramsWithOptionDto } from 'src/app/core/models/ExportProgramsWithOptionDto';
import { AnalyticalLayerPillarMappingDTO } from 'src/app/core/models/AnalyticalLayerPillarMapping';

@Injectable({
  providedIn: "root",
})
export class AdminService {
  public errorMessage: Subject<any> = new Subject<any>();

  constructor(private http: HttpService, private userService: UserService) { }

  public login(email: string, password: string) {
    const data = JSON.stringify({ email, password });
    return this.http.post(`Auth/login`, data).pipe(
      tap((user: any) => {
        if (user) this.userService.userInfo = user;
      })
    );
  }

 public getPrograms(request: PaginationProgramRequest) {
    return this.http
      .getWithQueryParams(`Program/programs`, request)
      .pipe(map((x) => x as PaginationResponse<ProgramVM>));
  }

  public getAllProgramsByUserId(userId: number) {
    return this.http
      .get(`Program/getAllProgramsByUserId/` + userId)
      .pipe(map((x) => x as ResultResponseDto<ProgramVM[]>));
  }

  public addBulkPrograms(data: any) {
    return this.http
      .post(`Program/addBulkPrograms`, data)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }

  public addUpdateProgram(formdata: FormData) {
    return this.http
      .UploadFile(`Program/addUpdateProgram`, formdata)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }

  public editProgram(id: number, data: any) {
    return this.http
      .put(`Program/edit/` + id, data)
      .pipe(map((x) => x as ResultResponseDto<ProgramVM>));
  }

  public deleteProgram(id: number) {
    return this.http
      .delete(`Program/delete/` + id)
      .pipe(map((x) => x as ResultResponseDto<boolean>));
  }

  public getProgramHistory(userID: number) {
    return this.http
      .get(`Program/getProgramHistory` )
      .pipe(map((x) => x as ResultResponseDto<ProgramHistoryDto>));
  }
  public exportPrograms(request: ExportProgramsWithOptionDto) {
    return this.http
      .ImportFile(`Program/exportPrograms`, request);
  }

  public getUserListByRole(request: GetUserByRoleRequestDto) {
    return this.http
      .getWithQueryParams(`User/GetUserByRoleWithAssignedProgram`, request)
      .pipe(map((x) => x as PaginationResponse<GetUserByRoleResponse>));
  }
  public addAnalyst(data: InviteUserDto) {
    return this.http
      .post(`Auth/InviteUser`, data)
      .pipe(map((x) => x as ResultResponseDto<unknown>));
  }
  public addBulkAnalyst(data: InviteBulkUserDto) {
    return this.http
      .post(`Auth/InviteBulkUser`, data)
      .pipe(map((x) => x as ResultResponseDto<unknown>));
  }
  public editUser(data: UpdateInviteUserDto) {
    return this.http
      .post(`Auth/UpdateInviteUser`, data)
      .pipe(map((x) => x as ResultResponseDto<unknown>));
  }
  public checkEmailExist(data: EmailExistDto) {
    return this.http
      .post<EmailExistDto, ResultResponseDto<any>>('Auth/CheckEmailExist', data)
      .pipe(
        map(res => res.isExist ?? false)
      );
  }
  public deleteUser(id: number) {
    return this.http
      .delete(`Auth/deleteUser/` + id)
      .pipe(map((x) => x as ResultResponseDto<unknown>));
  }
  public getAllPillars() {
    return this.http.get(`Pillar/Pillars`).pipe(map((x) => x as PillarsVM[]));
  }

  public editAllPillars(id: number, data: FormData) {
    const formData = new FormData();
    return this.http
      .UploadFile(`Pillar/edit/${id}`, data)
      .pipe(map((x) => x as ResultResponseDto<boolean>));
  }

  public addPillar(data: FormData) {
    return this.http
      .UploadFile(`Pillar/add`, data)
      .pipe(map((x) => x as ResultResponseDto<PillarsVM>));
  }

  public getPillarKpiMappings(pillarId: number) {
    return this.http
      .get(`Pillar/${pillarId}/kpiMappings`)
      .pipe(map((x) => x as ResultResponseDto<PillarKpiMappingDto[]>));
  }

  public getKPIDetailsByLayerID(layerID: number) {
    return this.http.get(`Kpi/getKPIDetailsByLayerID/${layerID}`).pipe(map((x) => x as ResultResponseDto<AnalyticalLayerPillarMappingDTO[]>));
  }

  public deletePillar(id: number) {
    return this.http
      .delete(`Pillar/` + id)
      .pipe(map((x) => x as ResultResponseDto<boolean>));
  }

  public getResponsesByUserId(request: GetProgramPillarHistoryRequestNewDto) {
    return this.http.post(`Pillar/GetResponsesByUserId`, request).pipe(map(x => x as PaginationResponse<PillarsHistoryResponse>));
  }
  public getPillarsHistoryByUserId(request: GetProgramPillarHistoryRequestDto) {
    return this.http
      .post(`Pillar/GetPillarsHistoryByUserId`, request)
      .pipe(map((x) => x as ResultResponseDto<PillarsHistoryResponse[]>));
  }
  
  public exportPillarsHistoryByUserId(request: GetProgramPillarHistoryRequestDto) {
    return this.http.ImportFile(`Pillar/ExportPillarsHistoryByUserId`, request);
  }
  public getQuestions(data: GetQuestionRequest) {
    return this.http
      .getWithQueryParams(`Question/getQuestions`, data)
      .pipe(map((x) => x as PaginationResponse<GetQuestionResponse>));
  }

  public addUpdateQuestion(data: AddQuestionRequest) {
    return this.http
      .post(`Question/addUpdateQuestion`, data)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }
  public addBulkQuestions(data: AddBulkQuestionsDto) {
    return this.http
      .post(`Question/addBulkQuestions`, data)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }
  public deleteQuestion(id: number) {
    return this.http
      .delete(`Question/delete/` + id)
      .pipe(map((x) => x as boolean));
  }
  public getQuestionsHistoryByPillar(request: GetProgramPillarHistoryRequestDto) {
    return this.http
      .getWithQueryParams(`Question/getQuestionsHistoryByPillar`, request)
      .pipe(
        map((x) => x as ResultResponseDto<QuestionsByUserPillarsResponsetDto[]>)
      );
  }
  
  public saveAssessment(payload: ProgramPillerRequestDto) {
    return this.http
      .post(`AssessmentResponse/saveAssessment`, payload)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }
  public getAssessmentResults(payload: GetAssessmentRequestDto) {
    return this.http
      .getWithQueryParams(`AssessmentResponse/getAssessmentResults`, payload)
      .pipe(map((x) => x as PaginationResponse<GetAssessmentResponse>));
  }
  public getAssessmentQuestions(payload: GetAssessmentQuestionRequestDto) {
    return this.http
      .getWithQueryParams(`AssessmentResponse/getAssessmentQuestions`, payload)
      .pipe(
        map((x) => x as PaginationResponse<GetAssessmentQuestionResponseDto>)
      );
  }

  public getAssessmentProgressHistory(request: GetProgramProgressHistoryRequestDto) {
     return this.http.getWithQueryParams(`AssessmentResponse/getAssessmentProgressHistory`, request).pipe(map(x => x as ResultResponseDto<AssessmentWithProgressVM>));
  }

  public getProgramPillarHistory(request: UserProgramPillarDashboardRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getProgramPillarHistory`, request).pipe(map(x => x as ResultResponseDto<AiProgramPillarDashboardResponseDto>));
  }
  public changeAssessmentStatus(request: ChangeAssessmentStatusRequestDto) {
    return this.http
      .post(`AssessmentResponse/changeAssessmentStatus`, request)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }
  public transferAssessment(request: TransferAssessmentRequestDto) {
    return this.http
      .post(`AssessmentResponse/transferAssessment`, request)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }
  public getUsersAssignedToProgram(climateProgramID: number) {
    return this.http
      .get(`User/getUsersAssignedToProgram/` + climateProgramID)
      .pipe(map((x) => x as ResultResponseDto<GetAssessmentResponse[]>));
  }
  public GetEvaluatorByAnalyst(payload: GetAssignUserDto) {
    return this.http
      .getWithQueryParams(`User/GetEvaluatorByAnalyst`, payload)
      .pipe(map((x) => x as ResultResponseDto<PublicUserResponse[]>));
  }
  public getAnalyticalLayerResults(request: GetAnalyticalLayerRequestDto) {
    return this.http
      .getWithQueryParams(`Kpi/getAnalyticalLayerResults`, request)
      .pipe(map((x) => x as PaginationResponse<GetAnalyticalLayerResultDto>));
  }

  public GetAllKpi() {
    return this.http
      .get(`Kpi/GetAllKpi`)
      .pipe(map((x) => x as ResultResponseDto<AnalyticalLayerResponseDto[]>));
  }

  public GetAllKpiPillarMapping() {
    return this.http
    .get(`Kpi/GetAllKpiPillarMapping`)
    .pipe(map((x) => x as ResultResponseDto<AnalyticalLayerResponseDto[]>));
  }

  public comparePrograms(request: CompareProgramRequestDto) {
    return this.http.post(`Kpi/comparePrograms`, request).pipe(map(x => x as ResultResponseDto<CompareProgramResponseDto>));
  }
  public getMutiplekpiLayerResults(payload: GetMutiplekpiLayerRequestDto) {
    return this.http.post(`Kpi/getMutiplekpiLayerResults`, payload).pipe(map(x => x as ResultResponseDto<GetMutiplekpiLayerResultsDto>));;
  }
  public exportComparePrograms(params: any) {
    return this.http.ImportFile(`Kpi/ExportComparePrograms`, params);
  }
  public getPeaceStressTestDashboard(climateProgramID: number) {
      return this.http.getWithQueryParams(`Dashboard/getPeaceStressTestDashboard`, { climateProgramID })
        .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }
  public getEarlyWarningDashboard(climateProgramID: number) {
    return this.http.getWithQueryParams(`Dashboard/getEarlyWarningDashboard`, { climateProgramID })
    .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }
  public getResilienceScorecard(climateProgramID: number) {
    return this.http.getWithQueryParams(`Dashboard/getResilienceScorecard`, { climateProgramID })
    .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }

  public getAmbitionDeliveryIndexDashboard(climateProgramID: number) {
    return this.http
      .getWithQueryParams(`Dashboard/getAmbitionDeliveryIndexDashboard`, { climateProgramID })
      .pipe(map((x) => x as ResultResponseDto<DashboardModeResponseDto>));
  }

  public getDiplomaticRiskDashboard(climateProgramID: number) {
    return this.http
      .getWithQueryParams(`Dashboard/getDiplomaticRiskDashboard`, { climateProgramID })
      .pipe(map((x) => x as ResultResponseDto<DashboardModeResponseDto>));
  }

  public getReadinessScorecardDashboard(climateProgramID: number) {
    return this.http
      .getWithQueryParams(`Dashboard/getReadinessScorecardDashboard`, { climateProgramID })
      .pipe(map((x) => x as ResultResponseDto<DashboardModeResponseDto>));
  }
}
