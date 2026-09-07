import { map, Subject, tap } from 'rxjs';
import { Injectable } from '@angular/core';
import { CountryVM } from '../../core/models/CountryVM';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { PillarKpiMappingDto } from 'src/app/core/models/PillarKpiMappingDto';
import { HttpService } from 'src/app/core/http/http.service';
import { UserService } from 'src/app/core/services/user.service';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { CountryPillerRequestDto } from 'src/app/core/models/QuestionRequest';
import { PaginationCountryRequest, PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { CompareCountryRequestDto } from 'src/app/core/models/CompareCountryRequestDto';
import { CompareCountryResponseDto } from 'src/app/core/models/CompareCountryResponseDto';
import { GetAssignUserDto, PublicUserResponse } from 'src/app/core/models/UserInfo';
import { PillarsHistoryResponse } from 'src/app/core/models/PillarsUserHistoryResponse';
import { InviteBulkUserDto, InviteUserDto, UpdateInviteUserDto } from '../../core/models/AnalystVM';
import { CountryHistoryDto, UserCountryPillarDashboardRequestDto } from '../../core/models/countryHistoryDto';
import { QuestionsByUserPillarsResponsetDto } from 'src/app/core/models/GetQuestionHistoryResponseDto ';
import { AiCountryPillarDashboardResponseDto } from 'src/app/core/models/AiCountryPillarDashboardResponseDto';
import { GetUserByRoleRequestDto, GetUserByRoleResponse } from '../../core/models/GetUserByRoleResponse';
import { AddBulkQuestionsDto, AddQuestionRequest, GetQuestionRequest, GetQuestionResponse } from 'src/app/core/models/QuestionResponse';
import { AssessmentWithProgressVM, GetAssessmentQuestionResponseDto, GetAssessmentResponse } from 'src/app/core/models/AssessmentResponse';
import { AnalyticalLayerResponseDto, GetAnalyticalLayerRequestDto, GetAnalyticalLayerResultDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { AnalyticalLayerPillarMappingDTO } from 'src/app/core/models/AnalyticalLayerPillarMapping';
import { ChangeAssessmentStatusRequestDto, GetAssessmentQuestionRequestDto, GetAssessmentRequestDto, GetCountryPillarHistoryRequestDto, GetCountryPillarHistoryRequestNewDto, TransferAssessmentRequestDto } from 'src/app/core/models/AssessmentRequest';
import { GetMutiplekpiLayerRequestDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto';
import { GetMutiplekpiLayerResultsDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto';
import { EmailExistDto } from 'src/app/core/models/EmailExistDto';
import { ExportCountryWithOptionDto } from 'src/app/core/models/ExportCountryWithOptionDto';
import { DashboardModeResponseDto } from 'src/app/core/models/CountrySignalDashboardDto';

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

  public getCountries(request: PaginationCountryRequest) {
    return this.http
      .getWithQueryParams(`Country/countries`, request)
      .pipe(map((x) => x as PaginationResponse<CountryVM>));
  }
  public getAllCountriesByUserId(userId: number) {
    return this.http
      .get(`Country/getAllCountryByUserId/` + userId)
      .pipe(map((x) => x as ResultResponseDto<CountryVM[]>));
  }

  public addBulkCountry(data: any) {
    return this.http
      .post(`Country/addBulkCountry`, data)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }
  public AddUpdateCountry(formdata: FormData) {
    return this.http
      .UploadFile(`Country/AddUpdateCountry`, formdata)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }

  public editCountry(id: number, data: any) {
    return this.http
      .put(`Country/edit/` + id, data)
      .pipe(map((x) => x as ResultResponseDto<CountryVM>));
  }

  public deleteCountry(id: number) {
    return this.http
      .delete(`Country/delete/` + id)
      .pipe(map((x) => x as ResultResponseDto<boolean>));
  }
  public getCountryHistory(userID: number, updatedAt: string) {
    return this.http
      .get(`Country/getCountryHistory/` + updatedAt)
      .pipe(map((x) => x as ResultResponseDto<CountryHistoryDto>));
  }
  public exportCountries(request: ExportCountryWithOptionDto) {
    return this.http.ImportFile(`Country/exportCountries`, request);
  }

  public getUserListByRole(request: GetUserByRoleRequestDto) {
    return this.http
      .getWithQueryParams(`User/GetUserByRoleWithAssignedCountry`, request)
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
    return this.http
      .get(`Kpi/getKPIDetailsByLayerID/${layerID}`)
      .pipe(map((x) => x as ResultResponseDto<AnalyticalLayerPillarMappingDTO[]>));
  }

  public deletePillar(id: number) {
    return this.http
      .delete(`Pillar/` + id)
      .pipe(map((x) => x as ResultResponseDto<boolean>));
  }

  public getResponsesByUserId(request: GetCountryPillarHistoryRequestNewDto) {
    return this.http.post(`Pillar/GetResponsesByUserId`, request).pipe(map(x => x as PaginationResponse<PillarsHistoryResponse>));
  }
  public getPillarsHistoryByUserId(request: GetCountryPillarHistoryRequestDto) {
    return this.http
      .post(`Pillar/GetPillarsHistoryByUserId`, request)
      .pipe(map((x) => x as ResultResponseDto<PillarsHistoryResponse[]>));
  }
  public exportPillarsHistoryByUserId(request: GetCountryPillarHistoryRequestDto) {
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
  public getQuestionsHistoryByPillar(request: GetCountryPillarHistoryRequestDto) {
    return this.http
      .getWithQueryParams(`Question/getQuestionsHistoryByPillar`, request)
      .pipe(
        map((x) => x as ResultResponseDto<QuestionsByUserPillarsResponsetDto[]>)
      );
  }
  public saveAssessment(payload: CountryPillerRequestDto) {
    return this.http
      .post(`AssessmentResponse/saveAssessment`, payload)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }
  public getAssessmentResults(payload: GetAssessmentRequestDto) {
    return this.http
      .getWithQueryParams(`AssessmentResponse/getAssessmentResults`, payload)
      .pipe(map((x) => x as PaginationResponse<GetAssessmentResponse>));
  }
  public getAssessmentQuestoins(payload: GetAssessmentQuestionRequestDto) {
    return this.http
      .getWithQueryParams(`AssessmentResponse/getAssessmentQuestoins`, payload)
      .pipe(
        map((x) => x as PaginationResponse<GetAssessmentQuestionResponseDto>)
      );
  }
  public getAssessmentProgressHistory(assessmentID: number) {
    return this.http
      .get(`AssessmentResponse/getAssessmentProgressHistory/` + assessmentID)
      .pipe(map((x) => x as ResultResponseDto<AssessmentWithProgressVM>));
  }

  public getCountryPillarHistory(request: UserCountryPillarDashboardRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getCountryPillarHistory`, request).pipe(map(x => x as ResultResponseDto<AiCountryPillarDashboardResponseDto>));
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
  public getUsersAssignedToCountry(countryID: number) {
    return this.http
      .get(`User/getUsersAssignedToCountry/` + countryID)
      .pipe(map((x) => x as ResultResponseDto<GetAssessmentResponse[]>));
  }
  public GetEvaluatorByAnalyst(payload: GetAssignUserDto) {
    return this.http
      .getWithQueryParams(`User/GetEvaluatorByAnalyst`, payload)
      .pipe(map((x) => x as ResultResponseDto<PublicUserResponse[]>));
  }
  public GetAnalyticalLayerResults(request: GetAnalyticalLayerRequestDto) {
    return this.http
      .getWithQueryParams(`Kpi/GetAnalyticalLayerResults`, request)
      .pipe(map((x) => x as PaginationResponse<GetAnalyticalLayerResultDto>));
  }
  public GetAllKpi() {
    return this.http
      .get(`Kpi/GetAllKpi`)
      .pipe(map((x) => x as ResultResponseDto<AnalyticalLayerResponseDto[]>));
  }
  public compareCountries(request: CompareCountryRequestDto) {
    return this.http.post(`Kpi/compareCountries`, request).pipe(map(x => x as ResultResponseDto<CompareCountryResponseDto>));
  }
  public getMutiplekpiLayerResults(payload: GetMutiplekpiLayerRequestDto) {
    return this.http.post(`Kpi/getMutiplekpiLayerResults`, payload).pipe(map(x => x as ResultResponseDto<GetMutiplekpiLayerResultsDto>));;
  }
  public exportCompareCountries(params: any) {
    return this.http.ImportFile(`Kpi/ExportCompareCountries`, params);
  }
  public getPeaceStressTestDashboard(countryID: number, year: number) {
      return this.http.getWithQueryParams(`Dashboard/getPeaceStressTestDashboard`, { countryID, year })
        .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }
  public getEarlyWarningDashboard(countryID: number, year: number) {
    return this.http.getWithQueryParams(`Dashboard/getEarlyWarningDashboard`, { countryID, year })
    .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }
  public getResilienceScorecard(countryID: number, year: number) {
    return this.http.getWithQueryParams(`Dashboard/getResilienceScorecard`, { countryID, year })
    .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }
}
