import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { HttpService } from 'src/app/core/http/http.service';
import { UserService } from 'src/app/core/services/user.service';
import { CountryVM } from '../../core/models/CountryVM';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { CountryHistoryDto, GetCountriesSubmitionHistoryResponseDto, GetCountryQuestionHistoryResponseDto, UserCountryRequestDto } from 'src/app/core/models/countryHistoryDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { GetCountryPillarHistoryRequestDto } from 'src/app/core/models/AssessmentRequest';
import { QuestionsByUserPillarsResponsetDto } from 'src/app/core/models/GetQuestionHistoryResponseDto ';
import { PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { CountryDetailsDto } from './models/CountryDetailsDto';
import { UserCountryGetPillarInfoRequestDto } from './models/UserCountryGetPillarInfoRequestDto';
import { CountryPillarQuestionDetailsDto } from './models/CountryPillarQuestionDetailsDto';
import { AnalyticalLayerResponseDto, GetAnalyticalLayerRequestDto, GetAnalyticalLayerResultDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { CompareCountryResponseDto } from 'src/app/core/models/CompareCountryResponseDto';
import { CompareCountryRequestDto } from 'src/app/core/models/CompareCountryRequestDto';
import { AiCountryPillarResponseDto } from 'src/app/core/models/aiVm/AiCountryPillarResponseDto';
import { AiCountrySummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiCountrySummeryRequestPdfDto';
import { GetMutiplekpiLayerRequestDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerRequestDto';
import { GetMutiplekpiLayerResultsDto } from 'src/app/core/models/aiVm/GetMutiplekpiLayerResultsDto';
import { DashboardModeResponseDto } from 'src/app/core/models/CountrySignalDashboardDto';

@Injectable({
  providedIn: 'root'
})
export class CountryUserService {

  public userCountryMappingIDSubject$ = new BehaviorSubject<number | null>(null);

  constructor(private http: HttpService, private userService: UserService) { }
  public getAllPillars() {
    return this.http.get(`Public/GetAllPillarAsync`).pipe(map(x => x as ResultResponseDto<PillarsVM[]>));
  }
  public getAllCountries() {
    return this.http.get(`Public/getAllCountries`).pipe(map(x => x as ResultResponseDto<CountryVM[]>));
  }
  public getCountryUserCountries() {
    return this.http.get(`CountryUser/getCountryUserCountries`).pipe(map(x => x as ResultResponseDto<CountryVM[]>));
  }
  public getCountryHistory() {
    return this.http.get(`CountryUser/getCountryHistory`).pipe(map(x => x as ResultResponseDto<CountryHistoryDto>));
  }
  public getCountriesProgressByUserId() {
    return this.http.get(`CountryUser/getCountriesProgressByUserId`).pipe(map(x => x as ResultResponseDto<GetCountriesSubmitionHistoryResponseDto[]>));
  }
  public getCountryQuestionHistory(request: UserCountryRequestDto) {
    return this.http.getWithQueryParams(`CountryUser/getCountryQuestionHistory`, request).pipe(map(x => x as GetCountryQuestionHistoryResponseDto));
  }
  public getCountries(request: PaginationUserRequest) {
    return this.http.getWithQueryParams(`CountryUser/countries`, request).pipe(map(x => x as PaginationResponse<CountryVM>));;
  }
  public getCountryDetails(request: UserCountryRequestDto) {
    return this.http.getWithQueryParams(`CountryUser/getCountryDetails`, request).pipe(map(x => x as ResultResponseDto<CountryDetailsDto>));
  }
  public getCountryPillarDetails(request: UserCountryGetPillarInfoRequestDto) {
    return this.http.getWithQueryParams(`CountryUser/GetCountryPillarDetails`, request).pipe(map(x => x as ResultResponseDto<CountryPillarQuestionDetailsDto[]>));
  }
  public getCountryUserKpi() {
    return this.http.get(`CountryUser/getCountryUserKpi`).pipe(map(x => x as ResultResponseDto<AnalyticalLayerResponseDto[]>));;
  }
  public addCountryUserKpisCountryAndPillar(request: any) {
    return this.http.post(`CountryUser/addCountryUserKpisCountryAndPillar`, request).pipe(map(x => x as ResultResponseDto<string>));
  }
  public compareCountries(request: CompareCountryRequestDto) {
    return this.http.post(`CountryUser/compareCountries`, request).pipe(map(x => x as ResultResponseDto<CompareCountryResponseDto>));
  }
  public getAICountryPillars(request: AiCountrySummeryRequestPdfDto) {
    return this.http
      .getWithQueryParams(`CountryUser/getAICountryPillars`,request)
      .pipe(map((x) => x as ResultResponseDto<AiCountryPillarResponseDto>));
  }

  public getAllCountriesByUserId(userId: number) {
    return this.http.get(`Country/getAllCountryByUserId/` + userId).pipe(map(x => x as ResultResponseDto<CountryVM[]>));;
  }

  public exportPillarsHistoryByUserId(request: GetCountryPillarHistoryRequestDto) {
    return this.http.ImportFile(`Pillar/ExportPillarsHistoryByUserId`, request);
  }
  public getQuestionsHistoryByPillar(request: GetCountryPillarHistoryRequestDto) {
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
  public exportCompareCountriesCountryUsers(params: any) {
    return this.http.ImportFile(`CountryUser/ExportCompareCountries`, params);
  }
}
