import { PaginationRequest } from "./PaginationRequest";

export interface GetQuestionRequest extends PaginationRequest {
  pillarID?: number;
}
export interface GetQuestionByCountryMappingResponse {
  assessmentID: number;
  userCountryMappingID: number;
  displayOrder: number;
  submittedPillarDisplayOrder: number;
  lastPillarDisplayOrder: number;
  pillarID: number;
  pillarName: string;
  description: string;
  questions:AssessmentQuestionResponse[];
}

export interface GetQuestionByCountryResponse extends GetQuestionResponse {
  assessmentID: number;
  pillarDisplayOrder: number;
}

export interface GetQuestionResponse extends AddQuestionRequest {
  displayOrder: number;
  pillarName: string;
}

export interface QuestionOption {
  optionID: number;
  questionID: number;
  optionText: string;
  scoreValue?: string;
  displayOrder?: number;
  label?: string;
}

export interface AddQuestionRequest {
  questionID: number;
  pillarID: number;
  weightID: number;
  questionText: string;
  questionOptions: QuestionOption[];
}
export interface AddBulkQuestionsDto {
  questions: AddQuestionRequest[]
}

export interface AssessmentQuestionResponse {
  questionID: number;
  pillarID: number;
  responseID: number;
  questionText: string;
  isSelected: boolean;
  questionOptions: AssessmentQuestionOptionResponse[];
  history: HistoryQuestionAnswerRawDto[];
}

export interface AssessmentQuestionOptionResponse  extends QuestionOption {
  isSelected: boolean;
  justification:string
  source:string
}
export interface HistoryQuestionAnswerRawDto  extends AssessmentQuestionOptionResponse {
  fullName:string
  userID:number
}