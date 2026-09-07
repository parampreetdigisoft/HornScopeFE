import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpService } from 'src/app/core/http/http.service';
import { SendRequestMailToUpdateProgram } from 'src/app/core/models/AnalystVM';
import { AddAssessmentDto, GetAssessmentQuestionRequestDto, GetAssessmentRequestDto, GetProgramProgressHistoryRequestDto } from 'src/app/core/models/AssessmentRequest';
import { AssessmentWithProgressVM, GetAssessmentQuestionResponseDto, GetAssessmentResponse } from 'src/app/core/models/AssessmentResponse';
import { ProgramHistoryDto, GetProgramQuestionHistoryResponseDto, UserProgramRequestDto } from 'src/app/core/models/ProgramHistoryDto';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { CompareProgramRequestDto } from 'src/app/core/models/CompareProgramRequestDto';
import { CompareProgramResponseDto } from 'src/app/core/models/CompareProgramResponseDto';
import { GetAnalyticalLayerRequestDto, GetAnalyticalLayerResultDto, AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { GetUserByRoleRequestDto, GetUserByRoleResponse } from 'src/app/core/models/GetUserByRoleResponse';
import { PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { ProgramMappingPillerRequestDto } from 'src/app/core/models/QuestionRequest';
import { GetQuestionByProgramMappingResponse } from 'src/app/core/models/QuestionResponse';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { DashboardModeResponseDto } from 'src/app/core/models/ProgramSignalDashboardDto';

@Injectable({
  providedIn: 'root'
})
export class EvaluatorService {

  constructor(private http: HttpService) { }

  public staffProgramMappingIDSubject$ = new BehaviorSubject<number | null>(null);

  public sendMailForEditAssessment(data: SendRequestMailToUpdateProgram) {
    return this.http.post(`Auth/sendMailForEditAssessment`, data).pipe(map(x => x as ResultResponseDto<string>));
  }

  public getPrograms(request: PaginationUserRequest) {
    return this.http.getWithQueryParams(`Program/programs`, request).pipe(map(x => x as PaginationResponse<ProgramVM>));;
  }

  public getAllProgramsByUserId(userId: number) {
    return this.http.get(`Program/getAllProgramsByUserId/` + userId).pipe(map(x => x as ResultResponseDto<ProgramVM[]>));;
  }

  public getAiAccessProgram(userId: number) {
    return this.http.get(`Program/getAiAccessProgram`).pipe(map(x => x as ResultResponseDto<ProgramVM[]>));;
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

  public getAllPillars() {
    return this.http.get(`Pillar/Pillars`).pipe(map(x => x as PillarsVM[]));
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

  public getProgramQuestionHistory(request: UserProgramRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getProgramQuestionHistory`, request).pipe(map(x => x as GetProgramQuestionHistoryResponseDto));
  }

  public getQuestionsByProgramID(payload: ProgramMappingPillerRequestDto) {
    return this.http.getWithQueryParams(`Question/getQuestionsByProgramMappingId`, payload).pipe(map(x => x as ResultResponseDto<GetQuestionByProgramMappingResponse>));
  }

  public ExportQuestions(staffProgramMappingID: number) {
    return this.http.ImportFile(`Question/ExportAssessment/` + staffProgramMappingID);
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
