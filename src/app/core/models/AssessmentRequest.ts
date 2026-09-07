import { AssessmentPhase } from "../enums/AssessmentPhase";
import { ExportType } from "../enums/exportEnum";
import { UserRoleValue } from "../enums/UserRole";
import { PaginationUserRequest } from "./PaginationRequest";


export interface AddAssessmentDto {
  assessmentID: number;
  userCountryMappingID: number;
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
  countryID?: number | null;
  role?: UserRoleValue | null;
  updatedAt?: string;
}


export interface GetCountryPillarHistoryRequestDto {
  countryID: number;
  userID: number;
  pillarID?: number;
  updatedAt:string;
  exportType: ExportType;
}
export interface GetCountryPillarHistoryRequestNewDto extends PaginationUserRequest {
  countryID: number;
  pillarID?: number | null;
  updatedAt:string;
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
  userCountryMappingID: number;
  assessmentID: number | null;
}
