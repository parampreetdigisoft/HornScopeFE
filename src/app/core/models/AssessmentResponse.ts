import { AssessmentPhase } from "../enums/AssessmentPhase";

export interface GetAssessmentResponse {
  assessmentID: number;
  staffProgramMappingID: number;
  createdAt: Date | string;
  climateProgramID: number;
  programName: string;
  isActive: boolean;
  userID: number;
  userName: string;
  userRole: string;
  score?: number | null; // float in C# maps to number in TS
  assignedByUser: string;
  assignedByUserId: number;
  assessmentPhase?: AssessmentPhase;
  assessmentYear: number;
  totalIndeterminate?: number;
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

export interface GetProgramSubmitionHistoryResponseDto {
  climateProgramID: number;
  totalAssessment: number;
  score: number;
  aiScore: number;
  scoreProgress: number;
  totalPillar: number;
  totalAnsPillar: number;
  totalQuestion: number;
  ansQuestion: number;
}

