import { AssessmentPhase } from "../enums/AssessmentPhase";
import { ExportType } from "../enums/exportEnum";
import { UserRoleValue } from "../enums/UserRole";
import { PaginationUserRequest } from "./PaginationRequest";


export interface AddAssessmentDto {
  assessmentID: number;
  staffProgramMappingID: number;
  pillarID: number;
  responses: AddAssessmentResponseDto[];
  isAutoSave:boolean;
  isFinalized:boolean;
}

export interface AddAssessmentResponseDto {
  responseID: number;
  assessmentID: number;
  questionID: number;
  questionOptionID: number;
  score?: number | null;
  justification: string;
}

export interface GetAssessmentQuestionRequestDto extends PaginationUserRequest{
  pillarID?: number | null;
  assessmentID: number;
}

export interface GetAssessmentRequestDto extends PaginationUserRequest{
  subUserID?: number | null;
  climateProgramID?: number | null;
  role?: UserRoleValue | null;
}

export interface GetProgramPillarHistoryRequestDto {
  climateProgramID: number;
  userID: number;
  pillarID?: number;
  exportType: ExportType;
}
export interface GetProgramPillarHistoryRequestNewDto extends PaginationUserRequest {
  climateProgramID?: number;
  pillarID?: number;
}

export interface ChangeAssessmentStatusRequestDto {
  assessmentID: number;
  userID: number;
  assessmentPhase?: AssessmentPhase;
}

export interface TransferAssessmentRequestDto {
  assessmentID: number;
  transferToUserID: number;
}

export interface GetProgramProgressHistoryRequestDto {
  staffProgramMappingID: number;
  assessmentID: number | null;
}