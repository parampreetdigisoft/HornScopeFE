import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { HttpService } from 'src/app/core/http/http.service';
import { PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { UserService } from 'src/app/core/services/user.service';
import { ProgramVM } from '../../core/models/ProgramVM';
import { GetUserByRoleRequestDto, GetUserByRoleResponse } from '../../core/models/GetUserByRoleResponse';
import { InviteBulkUserDto, InviteUserDto, SendRequestMailToUpdateProgram, UpdateInviteUserDto } from '../../core/models/AnalystVM';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { ProgramMappingPillerRequestDto} from 'src/app/core/models/QuestionRequest';
import { AddAssessmentDto, ChangeAssessmentStatusRequestDto, GetAssessmentQuestionRequestDto, GetAssessmentRequestDto, GetProgramPillarHistoryRequestDto, GetProgramPillarHistoryRequestNewDto, GetProgramProgressHistoryRequestDto, TransferAssessmentRequestDto } from 'src/app/core/models/AssessmentRequest';
import { AssessmentWithProgressVM, GetAssessmentQuestionResponseDto, GetAssessmentResponse } from 'src/app/core/models/AssessmentResponse';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { GetQuestionByProgramMappingResponse } from 'src/app/core/models/QuestionResponse';
import { GetAssignUserDto, PublicUserResponse } from 'src/app/core/models/UserInfo';
import { ProgramHistoryDto, GetProgramsSubmitionHistoryResponseDto, UserProgramPillarDashboardRequestDto } from 'src/app/core/models/ProgramHistoryDto';
import { QuestionsByUserPillarsResponsetDto } from 'src/app/core/models/GetQuestionHistoryResponseDto ';
import { PillarsHistoryResponse } from 'src/app/core/models/PillarsUserHistoryResponse';
import { CompareProgramRequestDto } from 'src/app/core/models/CompareProgramRequestDto';
import { CompareProgramResponseDto } from 'src/app/core/models/CompareProgramResponseDto';
import { GetAnalyticalLayerRequestDto, GetAnalyticalLayerResultDto, AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { AiProgramPillarDashboardResponseDto } from 'src/app/core/models/AiProgramPillarDashboardResponseDto';
import { GetMutiplekpiLayerRequestDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto';
import { GetMutiplekpiLayerResultsDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto';
import { DashboardModeResponseDto } from 'src/app/core/models/ProgramSignalDashboardDto';

@Injectable({
  providedIn: 'root'
})
export class AnalystService {

  public staffProgramMappingIDSubject$ = new BehaviorSubject<number | null>(null);


  constructor(private http: HttpService, private userService: UserService) { }
  
  public getPrograms(request: PaginationUserRequest) {
    return this.http.getWithQueryParams(`Program/programs`, request).pipe(map(x => x as PaginationResponse<ProgramVM>));;
  }

  public getAllProgramsByUserId(userId: number) {
    return this.http.get(`Program/getAllProgramsByUserId/` + userId).pipe(map(x => x as ResultResponseDto<ProgramVM[]>));;
  }
  
  public getProgramByUserIdForAssessment(userId: number) {
    return this.http.get(`Program/getProgramByUserIdForAssessment/` + userId).pipe(map(x => x as ResultResponseDto<ProgramVM[]>));;
  }
  
  public getProgramHistory(userID: number) {
    return this.http.get(`Program/getProgramHistory`).pipe(map(x => x as ResultResponseDto<ProgramHistoryDto>));
  }

  public getEvaluator(request: GetUserByRoleRequestDto) {
    return this.http.getWithQueryParams(`User/GetUserByRoleWithAssignedProgram`, request).pipe(map(x => x as PaginationResponse<GetUserByRoleResponse>));
  }
  public addEvaluator(data: InviteUserDto) {
    return this.http.post(`Auth/InviteUser`, data).pipe(map(x => x as ResultResponseDto<unknown>));

  }
  public addBulkEvaluator(data: InviteBulkUserDto) {
    return this.http.post(`Auth/InviteBulkUser`, data).pipe(map(x => x as ResultResponseDto<unknown>));
  }
  public editEvaluator(data: UpdateInviteUserDto) {
    return this.http.post(`Auth/UpdateInviteUser`, data).pipe(map(x => x as ResultResponseDto<unknown>));
  }
  public sendMailForEditAssessment(data: SendRequestMailToUpdateProgram) {
    return this.http.post(`Auth/sendMailForEditAssessment`, data).pipe(map(x => x as ResultResponseDto<string>));
  }

  public deleteEvaluator(id: number) {
    return this.http.delete(`Auth/deleteUser` + id).pipe(map(x => x as ResultResponseDto<boolean>));
  }

  public unAssignProgram(data: any) {
    return this.http.post(`Program/unAssignProgram`, data).pipe(map(x => x as ResultResponseDto<unknown>));
  }

  public getProgramsProgressByUserId(userID: number) {
    return this.http.get(`Program/getProgramsProgressByUserId`).pipe(map(x => x as ResultResponseDto<GetProgramsSubmitionHistoryResponseDto[]>));
  }

  public getAllPillars() {
    return this.http.get(`Pillar/Pillars`).pipe(map(x => x as PillarsVM[]));
  }

  public exportPillarsHistoryByUserId(request: GetProgramPillarHistoryRequestDto) {
    return this.http.ImportFile(`Pillar/ExportPillarsHistoryByUserId`, request);
  }

  // public getQuestionsByclimateProgramID(payload: ProgramMappingPillerRequestDto) {
  //   return this.http.getWithQueryParams(`Question/getQuestionsByCityMappingId`, payload).pipe(map(x => x as ResultResponseDto<GetQuestionByProgramMappingResponse>));
  // }
  
  public ExportAssessment(staffProgramMappingID: number) {
    return this.http.ImportFile(`Question/ExportAssessment/` + staffProgramMappingID);
  }

  public getQuestionsHistoryByPillar(request: GetProgramPillarHistoryRequestDto) {
    return this.http.getWithQueryParams(`Question/getQuestionsHistoryByPillar`, request).pipe(map(x => x as ResultResponseDto<QuestionsByUserPillarsResponsetDto[]>));
  }

  public saveAssessment(payload: AddAssessmentDto) {
    return this.http.post(`AssessmentResponse/saveAssessment`, payload).pipe(map(x => x as ResultResponseDto<string>));
  }
  
  public getAssessmentResults(payload: GetAssessmentRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getAssessmentResults`, payload).pipe(map(x => x as PaginationResponse<GetAssessmentResponse>));
  }
  
  public getAssessmentQuestions(payload: GetAssessmentQuestionRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getAssessmentQuestions`, payload).pipe(map(x => x as PaginationResponse<GetAssessmentQuestionResponseDto>));
  }
  public ImportAssessment(formData: FormData) {
    return this.http.UploadFile(`AssessmentResponse/ImportAssessment`, formData).pipe(map(x => x as ResultResponseDto<string>));;
  }
  public getAssessmentProgressHistory(request: GetProgramProgressHistoryRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getAssessmentProgressHistory`, request).pipe(map(x => x as ResultResponseDto<AssessmentWithProgressVM>));
  }
  public changeAssessmentStatus(request: ChangeAssessmentStatusRequestDto) {
    return this.http.post(`AssessmentResponse/changeAssessmentStatus`, request).pipe(map(x => x as ResultResponseDto<string>));
  }
  public transferAssessment(request: TransferAssessmentRequestDto) {
    return this.http.post(`AssessmentResponse/transferAssessment`, request).pipe(map(x => x as ResultResponseDto<string>));
  }
  public getProgramPillarHistory(request: UserProgramPillarDashboardRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getProgramPillarHistory`, request).pipe(map(x => x as ResultResponseDto<AiProgramPillarDashboardResponseDto>));
  }
  public GetAnalyticalLayerResults(request: GetAnalyticalLayerRequestDto) {
    return this.http.getWithQueryParams(`Kpi/GetAnalyticalLayerResults`, request).pipe(map(x => x as PaginationResponse<GetAnalyticalLayerResultDto>));;
  }
  public GetAllKpi() {
    return this.http.get(`Kpi/GetAllKpi`).pipe(map(x => x as ResultResponseDto<AnalyticalLayerResponseDto[]>));;
  }
  public comparePrograms(request: CompareProgramRequestDto) {
    return this.http.post(`Kpi/comparePrograms`, request).pipe(map(x => x as ResultResponseDto<CompareProgramResponseDto>));
  }
  public getResponsesByUserId(request: GetProgramPillarHistoryRequestNewDto) {
    return this.http.post(`Pillar/GetResponsesByUserId`, request).pipe(map(x => x as PaginationResponse<PillarsHistoryResponse>));
  }

  public GetEvaluatorByAnalyst(payload: GetAssignUserDto) {
    return this.http.getWithQueryParams(`User/GetEvaluatorByAnalyst`, payload).pipe(map(x => x as ResultResponseDto<PublicUserResponse[]>));
  }
  public getMutiplekpiLayerResults(payload: GetMutiplekpiLayerRequestDto) {
    return this.http.post(`kpi/getMutiplekpiLayerResults`, payload).pipe(map(x => x as ResultResponseDto<GetMutiplekpiLayerResultsDto>));;
  }

  public getQuestionsByProgramID(payload: ProgramMappingPillerRequestDto) {
    return this.http.getWithQueryParams(`Question/getQuestionsByProgramMappingIdForAnalyst`, payload).pipe(map(x => x as ResultResponseDto<GetQuestionByProgramMappingResponse>));
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
