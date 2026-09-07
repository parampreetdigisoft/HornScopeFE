import { Injectable } from '@angular/core';
import { HttpService } from '../http/http.service';
import { map } from 'rxjs';
import { AiProgramSummeryDto } from '../models/aiVm/AiProgramSummeryDto';
import { AiProgramDocumentRequestDto, AiProgramPillarDocumentRequestDto, AiProgramSummeryRequestDto, AiPillarQuestionsRequestDto, DeleteProgramDocumentRequestDto } from '../models/aiVm/AiProgramSummeryRequestDto';
import { PaginationResponse } from '../models/PaginationResponse';
import { AiProgramPillarResponseDto } from '../models/aiVm/AiProgramPillarResponseDto';
import { ResultResponseDto } from '../models/ResultResponseDto';
import { AITrustLevelVM } from '../models/aiVm/AITrustLevelVM';
import { AIEstimatedQuestionScoreDto } from '../models/aiVm/AIEstimatedQuestionScoreDto';
import { AiCrossProgramResponseDto } from '../models/aiVm/AiCrossProgramResponseDto';
import { ChangedAiProgramEvaluationStatusDto } from '../models/aiVm/ChangedAiProgramEvaluationStatusDto';
import { RegenerateAiSearchDto } from '../models/aiVm/RegenerateAiSearchDto';
import { AiProgramSummeryRequestPdfDto } from '../models/aiVm/AiProgramSummeryRequestPdfDto';
import { AITransferAssessmentRequestDto } from '../models/aiVm/AITransferAssessmentRequestDto';
import { DownloadReportDto } from '../models/aiVm/DownloadReportDto';
import { GetProgramDocumentResponseDto, GetProgramPillarDocumentResponseDto } from '../models/aiVm/GetProgramDocumentResponseDto';
import { UpdateAIPillarScoreDto, UpdateAIProgramScoreDto, UpdateAIEstimatedQuestionScoreDto } from '../models/aiVm/UpdateAiScoreDtos';
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

  public getAIPrograms(request: AiProgramSummeryRequestDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAIPrograms`, request)
      .pipe(map((x) => x as PaginationResponse<AiProgramSummeryDto>));
  }

  public updateAIProgramScore(payload: UpdateAIProgramScoreDto) {
    return this.http.post(`AiComputation/updateAIProgramScore`, payload).pipe(map(x => x as ResultResponseDto<boolean>));
   }

  public updateAIPillarScore(payload: UpdateAIPillarScoreDto) {
    return this.http.post(`AiComputation/updateAIPillarScore`, payload).pipe(map(x => x as ResultResponseDto<boolean>));
  }

  public updateAIEstimatedQuestionScore(payload: UpdateAIEstimatedQuestionScoreDto) {
    return this.http.post(`AiComputation/updateAIEstimatedQuestionScore`, payload).pipe(map(x => x as ResultResponseDto<boolean>));
  }

  public getAIProgramPillars(request: AiProgramSummeryRequestPdfDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAIProgramPillars`, request)
      .pipe(map((x) => x as ResultResponseDto<AiProgramPillarResponseDto>));
  }

  public getAIPillarQuestions(request: AiPillarQuestionsRequestDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAIPillarQuestions`, request)
      .pipe(map((x) => x as PaginationResponse<AIEstimatedQuestionScoreDto>));
  }

  public aiProgramDetailsReport(request: AiProgramSummeryRequestPdfDto) {
    return this.http
      .ImportFile(`AiComputation/aiProgramDetailsReport`, request);
  }

  public aiAllProgramsDetailReport(payload: DownloadReportDto) {
    if (!payload.climateProgramIDs || payload.climateProgramIDs.length === 0) {
      delete payload.climateProgramIDs; 
    }
    return this.http
      .ImportFile(`AiComputation/aiAllProgramDetailsReport`, payload);
  }

  public aiPillarDetailsReport(request: AiProgramSummeryRequestPdfDto) {
    return this.http
      .ImportFile(`AiComputation/aiPillarDetailsReport`, request);
  }

  public getAICrossProgramPillars(ids: number[]) {
    let payload = { climateProgramIDs: ids };
    return this.http.post(`AiComputation/getAICrossProgramPillars`, payload).pipe(map(x => x as ResultResponseDto<AiCrossProgramResponseDto>));;
  }

  public changedAiProgramEvaluationStatus(payload: ChangedAiProgramEvaluationStatusDto) {
    return this.http.post(`AiComputation/changedAiProgramEvaluationStatus`, payload).pipe(map(x => x as ResultResponseDto<boolean>));;
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

  public getAIProgramDocuments(request: AiProgramDocumentRequestDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAIProgramDocuments`, request)
      .pipe(map((x) => x as PaginationResponse<GetProgramDocumentResponseDto>));
  }

  public getAIProgramPillarDocuments(request: AiProgramPillarDocumentRequestDto) {
    return this.http
      .getWithQueryParams(`AiComputation/getAIProgramPillarDocuments`, request)
      .pipe(map((x) => x as ResultResponseDto<GetProgramPillarDocumentResponseDto[]>));
  }

  public deleteDocument(request: DeleteProgramDocumentRequestDto) {
    return this.http
      .post(`AiComputation/deleteDocument`, request)
      .pipe(map((x) => x as ResultResponseDto<string>));
  }

  public downloadDocument(programDocumentID: number) {
    return this.http
      .ImportFile(`AiComputation/downloadDocument/` + programDocumentID);
  }

  public summarizeKpiPerformance(params: SummarizeKpiRequestDto) {
    return this.http.post(`Kpi/SummarizeKpiPerformance`, params).pipe(map(x=> x as ResultResponseDto<SummarizeKpiResponseDto>))
  }  
}
