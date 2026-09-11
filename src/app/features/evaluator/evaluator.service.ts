import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpService } from 'src/app/core/http/http.service';
import { SendRequestMailToUpdateCountry } from 'src/app/core/models/AnalystVM';
import { AddAssessmentDto, GetAssessmentQuestionRequestDto, GetAssessmentRequestDto, GetProgramProgressHistoryRequestDto } from 'src/app/core/models/AssessmentRequest';
import { AssessmentWithProgressVM, GetAssessmentQuestionResponseDto, GetAssessmentResponse } from 'src/app/core/models/AssessmentResponse';
import { CountryHistoryDto, GetCountryQuestionHistoryResponseDto, UserCountryRequestDto } from 'src/app/core/models/countryHistoryDto';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { CompareCountryRequestDto } from 'src/app/core/models/CompareCountryRequestDto';
import { CompareCountryResponseDto } from 'src/app/core/models/CompareCountryResponseDto';
import { GetAnalyticalLayerRequestDto, GetAnalyticalLayerResultDto, AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { GetUserByRoleRequestDto, GetUserByRoleResponse } from 'src/app/core/models/GetUserByRoleResponse';
import { PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { CountryMappingPillerRequestDto } from 'src/app/core/models/QuestionRequest';
import { GetQuestionByCountryMappingResponse } from 'src/app/core/models/QuestionResponse';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';

@Injectable({
  providedIn: 'root'
})
export class EvaluatorService {

  constructor(private http: HttpService) { }

  public userCountryMappingIDSubject$ = new BehaviorSubject<number | null>(null);

  public sendMailForEditAssessment(data: SendRequestMailToUpdateCountry) {
    return this.http.post(`Auth/sendMailForEditAssessment`, data).pipe(map(x => x as ResultResponseDto<string>));
  }

  public getCountries(request: PaginationUserRequest) {
    return this.http.getWithQueryParams(`Country/countries`, request).pipe(map(x => x as PaginationResponse<CountryVM>));;
  }
  public getAllCountriesByUserId(userId: number) {
    return this.http.get(`Country/getAllCountryByUserId/` + userId).pipe(map(x => x as ResultResponseDto<CountryVM[]>));;
  }
  public getAiAccessCountry(userId: number) {
    return this.http.get(`Country/getAiAccessCountry`).pipe(map(x => x as ResultResponseDto<CountryVM[]>));;
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

  public getAllPillars() {
    return this.http.get(`Pillar/Pillars`).pipe(map(x => x as PillarsVM[]));
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
  public getCountryQuestionHistory(request: UserCountryRequestDto) {
    return this.http.getWithQueryParams(`AssessmentResponse/getCountryQuestionHistory`, request).pipe(map(x => x as GetCountryQuestionHistoryResponseDto));
  }
  public getQuestionsByCountryId(payload: CountryMappingPillerRequestDto) {
    return this.http.getWithQueryParams(`Question/getQuestionsByCountryMappingId`, payload).pipe(map(x => x as ResultResponseDto<GetQuestionByCountryMappingResponse>));
  }
  public ExportQuestions(userCountryMappingID: number) {
    return this.http.ImportFile(`Question/ExportAssessment/` + userCountryMappingID);
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
}
