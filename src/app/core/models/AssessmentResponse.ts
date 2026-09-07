import { AssessmentPhase } from "../enums/AssessmentPhase";

export interface GetAssessmentResponse {
  assessmentID:number;
  userCountryMappingID:number
  createdAt:Date | string;
  countryID: number;
  continent: string;
  countryName: string;
  isActive: boolean;
  userID: number;
  userName: string;
  score?: number |null;   // float in C# maps to number in TS
  assignedByUser: string;
  assignedByUserId: number;
  assessmentPhase?:AssessmentPhase;
  assessmentYear: number;
  totalUnknown?: number;
  totalNA?: number;
}

export interface GetAssessmentQuestionResponseDto {
  assessmentID: number;
  userID: number;
  pillerID: number;
  pillarName:string;
  questoinID: number;  // keeping same spelling as C#; can rename to questionID if desired
  questionText: string;
  questionOptionText: string;
  justification: string;
  source: string;
  score: number | null;   // nullable enum
  showComment?: boolean;
  showSource?: boolean;
}

export interface AssessmentWithProgressVM {
  assessmentID: number;
  score: number;
  totalPillar: number;
  totalAnsPillar: number;
  totalQuestion: number;
  totalAnsQuestion: number;
  currentProgress:number
}

export interface GetCountrySubmitionHistoryResponseDto {
  countryID: number;
  totalAssessment: number;
  score: number;
  aiScore: number;
  scoreProgress: number;
  totalPillar: number;
  totalAnsPillar: number;
  totalQuestion: number;
  ansQuestion: number;
}

