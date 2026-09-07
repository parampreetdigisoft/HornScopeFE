import { Injectable } from '@angular/core';
import { HttpService } from '../http/http.service';
import { map } from 'rxjs';
import { AiCountrySummeryDto } from '../models/aiVm/AiCountrySummeryDto';
import { AiCountryDocumentRequestDto, AiCountryPillarDocumentRequestDto, AiCountrySummeryRequestDto, AiPillarQuetionsRequestDto, DeleteCountryDocumentRequestDto } from '../models/aiVm/AiCountrySummeryRequestDto';
import { PaginationResponse } from '../models/PaginationResponse';
import { AiCountryPillarResponseDto } from '../models/aiVm/AiCountryPillarResponseDto';
import { ResultResponseDto } from '../models/ResultResponseDto';
import { AITrustLevelVM } from '../models/aiVm/AITrustLevelVM';
import { AIEstimatedQuestionScoreDto } from '../models/aiVm/AIEstimatedQuestionScoreDto';
import { AiCrossCountryResponseDto } from '../models/aiVm/AiCrossCountryResponseDto';
import { ChangedAiCountryEvaluationStatusDto } from '../models/aiVm/ChangedAiCountryEvaluationStatusDto';
import { RegenerateAiSearchDto } from '../models/aiVm/RegenerateAiSearchDto';
import { AiCountrySummeryRequestPdfDto } from '../models/aiVm/AiCountrySummeryRequestPdfDto';
import { AITransferAssessmentRequestDto } from '../models/aiVm/AITransferAssessmentRequestDto';
import { DownloadReportDto } from '../models/aiVm/DownloadReportDto';
import { GetCountryDocumentResponseDto, GetCountryPillarDocumentResponseDto } from '../models/aiVm/GetCountryDocumentResponseDto';
import { SummarizeKpiRequestDto, SummarizeKpiResponseDto } from '../models/SummarizeKpiDto';

@Injectable({
  providedIn: 'root'
})
export class AiComputationService {

  constructor(private http: HttpService) { }

  public getAITrustLevels() {
    return this.http
      .get(`AiComputation/getAITrustLevels`)
      .pipe(map((x) => x as ResultResponseDto<AITrustLevelVM[]>));
  }

  public getAICountries(request: AiCountrySummeryRequestDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAICountries`, request)
      .pipe(map((x) => x as PaginationResponse<AiCountrySummeryDto>));
  }
  public getAICountryPillars(request: AiCountrySummeryRequestPdfDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAICountryPillars`, request)
      .pipe(map((x) => x as ResultResponseDto<AiCountryPillarResponseDto>));
  }
  public getAIPillarQuestions(request: AiPillarQuetionsRequestDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAIPillarQuestions`, request)
      .pipe(map((x) => x as PaginationResponse<AIEstimatedQuestionScoreDto>));
  }
  public aiCountryDetailsReport(request: AiCountrySummeryRequestPdfDto) {
    return this.http
      .ImportFile(`AiComputation/aiCountryDetailsReport`, request);
  }
  public aiAllCountriesDetailReport(payload: DownloadReportDto) {
    if (!payload.countryIDs || payload.countryIDs.length === 0) {
      delete payload.countryIDs; // 🔥 removes it completely
    }
    return this.http
      .ImportFile(`AiComputation/aiAllCountryDetailsReport`, payload);
  }
  public aiPillarDetailsReport(request: AiCountrySummeryRequestPdfDto) {
    return this.http
      .ImportFile(`AiComputation/aiPillarDetailsReport`, request);
  }
  public getAICrossCountryPillars(ids: number[]) {
    let payload = { countryIDs: ids };
    return this.http.post(`AiComputation/getAICrossCountryPillars`, payload).pipe(map(x => x as ResultResponseDto<AiCrossCountryResponseDto>));;
  }
  public changedAiCountryEvaluationStatus(payload: ChangedAiCountryEvaluationStatusDto) {
    return this.http.post(`AiComputation/changedAiCountryEvaluationStatus`, payload).pipe(map(x => x as ResultResponseDto<boolean>));;
  }
  public regenerateAiSearch(payload: RegenerateAiSearchDto) {
    return this.http.post(`AiComputation/regenerateAiSearch`, payload).pipe(map(x => x as ResultResponseDto<boolean>));;
  }
  public addComment(payload: any) {
    return this.http.post(`AiComputation/addComment`, payload).pipe(map(x => x as ResultResponseDto<boolean>));;
  }
  public regenerateSinglePillarAiSearch(payload: RegenerateAiSearchDto) {
    return this.http.post(`AiComputation/regeneratePillarAiSearch`, payload).pipe(map(x => x as ResultResponseDto<boolean>));;
  }

  public aiResultTransfer(payload: AITransferAssessmentRequestDto) {
    return this.http.post(`AiComputation/aiResultTransfer`, payload).pipe(map(x => x as ResultResponseDto<string>));;
  }
  public reCalculateKpis() {
    return this.http
      .get(`AiComputation/reCalculateKpis`)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }

  public uploadAiDocuments(formdata: FormData) {
    return this.http
      .UploadFile(`AiComputation/uploadAiDocuments`, formdata)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }

  public getAICountryDocuments(request: AiCountryDocumentRequestDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAICountryDocuments`, request)
      .pipe(map((x) => x as PaginationResponse<GetCountryDocumentResponseDto>));
  }

  public getAICountryPillarDocuments(request: AiCountryPillarDocumentRequestDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAICountryPillarDocuments`, request)
      .pipe(map((x) => x as ResultResponseDto<GetCountryPillarDocumentResponseDto[]>));
  }

  public deleteDocument(request: DeleteCountryDocumentRequestDto) {
    return this.http
      .post(`AiComputation/deleteDocument`, request)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }

  public downloadDocument(countryDocumentID: number) {
    return this.http
      .ImportFile(`AiComputation/downloadDocument/` + countryDocumentID);
  }  
  
  public summarizeKpiPerformance(params: SummarizeKpiRequestDto) {
    return this.http.post(`Kpi/SummarizeKpiPerformance`, params).pipe(map(x=> x as ResultResponseDto<SummarizeKpiResponseDto>))
  }    
}
