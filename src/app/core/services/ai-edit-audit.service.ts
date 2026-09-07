import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { HttpService } from 'src/app/core/http/http.service';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import {
  AIEditAccessDto,
  AIEditChangeLogDto,
  AIEditHistoryRequestDto,
  AIEditPermissionDto,
  AIEditPermissionListRequestDto,
  AIEditSessionDetailDto,
  AIEditSessionDto,
  AIEditSessionListRequestDto,
  GrantAIEditPermissionDto,
  RequestAIEditPermissionDto,
  ReviewAIEditPermissionDto,
  ReviewAIEditSessionDto
} from 'src/app/core/models/aiVm/AiEditDtos';
import { UpdateAICountryScoreDto, UpdateAIPillarScoreDto, UpdateAIDataSourceCitationDto, UpdateAIEstimatedQuestionScoreDto } from '../models/aiVm/UpdateAiScoreDtos';

@Injectable({ providedIn: 'root' })
export class AiEditService {
  constructor(private http: HttpService) { }

  updateAICountryScore(payload: UpdateAICountryScoreDto) {
    return this.http.post(`AiEdit/updateAICountryScore`, payload).pipe(map(x => x as ResultResponseDto<boolean>));
  }

  updateAIPillarScore(payload: UpdateAIPillarScoreDto) {
    return this.http.post(`AiEdit/updateAIPillarScore`, payload).pipe(map(x => x as ResultResponseDto<boolean>));
  }

  updateAIDataSourceCitation(payload: UpdateAIDataSourceCitationDto) {
    return this.http.post(`AiEdit/updateAIDataSourceCitation`, payload).pipe(map(x => x as ResultResponseDto<boolean>));
  }

  updateAIEstimatedQuestionScore(payload: UpdateAIEstimatedQuestionScoreDto) {
    return this.http.post(`AiEdit/updateAIEstimatedQuestionScore`, payload).pipe(map(x => x as ResultResponseDto<boolean>));
  }

  getEditAccess(countryID: number, year: number) {
    return this.http
      .getWithQueryParams(`AiEdit/getEditAccess`, { countryID, year })
      .pipe(map((x) => x as ResultResponseDto<AIEditAccessDto>));
  }

  requestPermission(payload: RequestAIEditPermissionDto) {
    return this.http
      .post(`AiEdit/requestPermission`, payload)
      .pipe(map((x) => x as ResultResponseDto<AIEditPermissionDto>));
  }

  grantPermission(payload: GrantAIEditPermissionDto) {
    return this.http
      .post(`AiEdit/grantPermission`, payload)
      .pipe(map((x) => x as ResultResponseDto<AIEditPermissionDto[]>));
  }

  reviewPermission(payload: ReviewAIEditPermissionDto) {
    return this.http
      .post(`AiEdit/reviewPermission`, payload)
      .pipe(map((x) => x as ResultResponseDto<boolean>));
  }

  revokePermission(permissionID: number) {
    return this.http
      .post(`AiEdit/revokePermission/${permissionID}`, {})
      .pipe(map((x) => x as ResultResponseDto<boolean>));
  }

  getPermissions(request: AIEditPermissionListRequestDto) {
    return this.http
      .getWithQueryParams(`AiEdit/permissions`, request)
      .pipe(map((x) => x as PaginationResponse<AIEditPermissionDto>));
  }

  getSessions(request: AIEditSessionListRequestDto) {
    return this.http
      .getWithQueryParams(`AiEdit/sessions`, request)
      .pipe(map((x) => x as PaginationResponse<AIEditSessionDto>));
  }

  getSessionDetail(sessionID: number) {
    return this.http
      .get(`AiEdit/session/${sessionID}`)
      .pipe(map((x) => x as ResultResponseDto<AIEditSessionDetailDto>));
  }

  submitSession(sessionID: number) {
    return this.http
      .post(`AiEdit/submitSession/${sessionID}`, {})
      .pipe(map((x) => x as ResultResponseDto<AIEditSessionDto>));
  }

  reviewSession(payload: ReviewAIEditSessionDto) {
    return this.http
      .post(`AiEdit/reviewSession`, payload)
      .pipe(map((x) => x as ResultResponseDto<boolean>));
  }

  getHistory(request: AIEditHistoryRequestDto) {
    return this.http
      .getWithQueryParams(`AiEdit/history`, request)
      .pipe(map((x) => x as ResultResponseDto<AIEditChangeLogDto[]>));
  }

}
