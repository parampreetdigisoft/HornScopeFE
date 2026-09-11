import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { HttpService } from 'src/app/core/http/http.service';
import { PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { UserService } from 'src/app/core/services/user.service';
import { CountryVM } from '../../core/models/CountryVM';
import { GetUserByRoleRequestDto, GetUserByRoleResponse } from '../../core/models/GetUserByRoleResponse';
import { InviteBulkUserDto, InviteUserDto, SendRequestMailToUpdateCountry, UpdateInviteUserDto } from '../../core/models/AnalystVM';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { CountryMappingPillerRequestDto} from 'src/app/core/models/QuestionRequest';
import { AddAssessmentDto, ChangeAssessmentStatusRequestDto, GetAssessmentQuestionRequestDto, GetAssessmentRequestDto, GetCountryPillarHistoryRequestDto, GetCountryPillarHistoryRequestNewDto, GetProgramProgressHistoryRequestDto, TransferAssessmentRequestDto } from 'src/app/core/models/AssessmentRequest';
import { AssessmentWithProgressVM, GetAssessmentQuestionResponseDto, GetAssessmentResponse } from 'src/app/core/models/AssessmentResponse';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { GetQuestionByCountryMappingResponse } from 'src/app/core/models/QuestionResponse';
import { GetAssignUserDto, PublicUserResponse } from 'src/app/core/models/UserInfo';
import { CountryHistoryDto, GetCountriesSubmitionHistoryResponseDto, UserCountryPillarDashboardRequestDto } from 'src/app/core/models/countryHistoryDto';
import { QuestionsByUserPillarsResponsetDto } from 'src/app/core/models/GetQuestionHistoryResponseDto ';
import { PillarsHistoryResponse } from 'src/app/core/models/PillarsUserHistoryResponse';
import { CompareCountryRequestDto } from 'src/app/core/models/CompareCountryRequestDto';
import { CompareCountryResponseDto } from 'src/app/core/models/CompareCountryResponseDto';
import { GetAnalyticalLayerRequestDto, GetAnalyticalLayerResultDto, AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { AiCountryPillarDashboardResponseDto } from 'src/app/core/models/AiCountryPillarDashboardResponseDto';
import { GetMutiplekpiLayerRequestDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto';
import { GetMutiplekpiLayerResultsDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto';
import { DashboardModeResponseDto } from 'src/app/core/models/CountrySignalDashboardDto';

@Injectable({
  providedIn: 'root'
})
export class AnalystService {

  public userCountryMappingIDSubject$ = new BehaviorSubject<number | null>(null);


  constructor(private http: HttpService, private userService: UserService) { }
  public getCountries(request: PaginationUserRequest) {
    return this.http.getWithQueryParams(`Country/countries`, request).pipe(map(x => x as PaginationResponse<CountryVM>));;
  }
  public getAllCountriesByUserId(userId: number) {
    return this.http.get(`Country/getAllCountryByUserId/` + userId).pipe(map(x => x as ResultResponseDto<CountryVM[]>));;
  }
  public getCountryByUserIdForAssessment(userId: number) {
    return this.http.get(`Country/getCountryByUserIdForAssessment/` + userId).pipe(map(x => x as ResultResponseDto<CountryVM[]>));;
  }
  public getCountryHistory(userID: number, updatedAt: string) {
    return this.http.get(`Country/getCountryHistory/` + updatedAt).pipe(map(x => x as ResultResponseDto<CountryHistoryDto>));
  }

  public getEvaluator(request: GetUserByRoleRequestDto) {
    return this.http.getWithQueryParams(`User/GetUserByRoleWithAssignedCountry`, request).pipe(map(x => x as PaginationResponse<GetUserByRoleResponse>));
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
  public sendMailForEditAssessment(data: SendRequestMailToUpdateCountry) {
    return this.http.post(`Auth/sendMailForEditAssessment`, data).pipe(map(x => x as ResultResponseDto<string>));
  }

  public deleteEvaluator(id: number) {
    return this.http.delete(`Auth/deleteUser` + id).pipe(map(x => x as ResultResponseDto<boolean>));
  }
  public unAssignCountry(data: any) {
    return this.http.post(`Country/unAssignCountry`, data).pipe(map(x => x as ResultResponseDto<unknown>));
  }
  public getCountriesProgressByUserId(userID: number, updatedAt: string) {
    return this.http.get(`Country/getCountriesProgressByUserId/`+ updatedAt).pipe(map(x => x as ResultResponseDto<GetCountriesSubmitionHistoryResponseDto[]>));
  } 
  public getAllPillars() {
    return this.http.get(`Pillar/Pillars`).pipe(map(x => x as PillarsVM[]));
  }
  public exportPillarsHistoryByUserId(request: GetCountryPillarHistoryRequestDto) {
    return this.http.ImportFile(`Pillar/ExportPillarsHistoryByUserId`, request);
  }
  // public getQuestionsByCountryId(payload: CountryMappingPillerRequestDto) {
  //   return this.http.getWithQueryParams(`Question/getQuestionsByCityMappingId`, payload).pipe(map(x => x as ResultResponseDto<GetQuestionByCountryMappingResponse>));
  // }
  public ExportQuestions(userCountryMappingID: number) {
    return this.http.ImportFile(`Question/ExportAssessment/` + userCountryMappingID);
  }
  public getQuestionsHistoryByPillar(request: GetCountryPillarHistoryRequestDto) {
    return this.http.getWithQueryParams(`Question/getQuestionsHistoryByPillar`, request).pipe(map(x => x as ResultResponseDto<QuestionsByUserPillarsResponsetDto[]>));
  }
  public saveAssessment(payload: AddAssessmentDto) {
    return this.http.post(`AssessmentResponse/saveAssessment`, payload).pipe(map(x => x as ResultResponseDto<string>));
  }
  public getAssessmentResults(payload: GetAssessmentRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getAssessmentResults`, payload).pipe(map(x => x as PaginationResponse<GetAssessmentResponse>));
  }
  public getAssessmentQuestoins(payload: GetAssessmentQuestionRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getAssessmentQuestoins`, payload).pipe(map(x => x as PaginationResponse<GetAssessmentQuestionResponseDto>));
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
  public getCountryPillarHistory(request: UserCountryPillarDashboardRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getCountryPillarHistory`, request).pipe(map(x => x as ResultResponseDto<AiCountryPillarDashboardResponseDto>));
  }
  public GetAnalyticalLayerResults(request: GetAnalyticalLayerRequestDto) {
    return this.http.getWithQueryParams(`Kpi/GetAnalyticalLayerResults`, request).pipe(map(x => x as PaginationResponse<GetAnalyticalLayerResultDto>));;
  }
  public GetAllKpi() {
    return this.http.get(`Kpi/GetAllKpi`).pipe(map(x => x as ResultResponseDto<AnalyticalLayerResponseDto[]>));;
  }
  public compareCountries(request: CompareCountryRequestDto) {
    return this.http.post(`Kpi/compareCountries`, request).pipe(map(x => x as ResultResponseDto<CompareCountryResponseDto>));
  }
  public getResponsesByUserId(request: GetCountryPillarHistoryRequestNewDto) {
    return this.http.post(`Pillar/GetResponsesByUserId`, request).pipe(map(x => x as PaginationResponse<PillarsHistoryResponse>));
  }

  public GetEvaluatorByAnalyst(payload: GetAssignUserDto) {
    return this.http.getWithQueryParams(`User/GetEvaluatorByAnalyst`, payload).pipe(map(x => x as ResultResponseDto<PublicUserResponse[]>));
  }
  public getMutiplekpiLayerResults(payload: GetMutiplekpiLayerRequestDto) {
    return this.http.post(`kpi/getMutiplekpiLayerResults`, payload).pipe(map(x => x as ResultResponseDto<GetMutiplekpiLayerResultsDto>));;
  }

  public getQuestionsByCountryId(payload: CountryMappingPillerRequestDto) {
    return this.http.getWithQueryParams(`Question/getQuestionsByCountryMappingIdForAnalyst`, payload).pipe(map(x => x as ResultResponseDto<GetQuestionByCountryMappingResponse>));
  }

   public getRelationalDiagnosticsDashboard(countryID: number, year: number, familyGroup: string) {
      return this.http.getWithQueryParams(`Dashboard/getRelationalDiagnosticsDashboard`, { countryID, year, familyGroup })
        .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }
  public getCompositeDiagnosticsDashboard(countryID: number, year: number) {
    return this.http.getWithQueryParams(`Dashboard/getCompositeDiagnosticsDashboard`, { countryID, year })
    .pipe(map(x => x as ResultResponseDto<DashboardModeResponseDto>));
  }
}
