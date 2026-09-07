import { PaginationRequest } from "../PaginationRequest";

export interface AiProgramSummeryRequestDto extends PaginationRequest {
  climateProgramID?:number;
}

export interface AiPillarQuestionsRequestDto extends AiProgramSummeryRequestDto {
  pillarID?:number;
}

export interface AiProgramDocumentRequestDto extends PaginationRequest {
  climateProgramID?:number;
}

export interface AiProgramPillarDocumentRequestDto {
  climateProgramID: number;
}

export interface DeleteProgramDocumentRequestDto {
  climateProgramID: number;
  programDocumentID?: number;
  isAll?: boolean;
}