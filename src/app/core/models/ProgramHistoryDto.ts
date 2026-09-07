import { GetProgramSubmitionHistoryResponseDto } from "src/app/core/models/AssessmentResponse";

export interface ProgramHistoryDto {
  totalProgram: number;
  totalAnalyst: number;
  totalEvaluator: number;
  activeProgram: number;
  totalAccessProgram: number;
  compeleteProgram: number;
  inprocessProgram: number;
  avgHighScore: number;
  avgLowerScore: number;
  overallVitalityScore: number;
  finalizeProgram: number;
  unFinalize: number;
}
export interface GetProgramQuestionHistoryResponseDto
  extends GetProgramSubmitionHistoryResponseDto {
  pillars: ProgramPillarQuestionHistoryResponseDto[];
}

export interface ProgramPillarQuestionHistoryResponseDto {
  pillarID: number;
  pillarName: string;
  score: number;
  scoreProgress: number;
  ansPillar: number;
  totalQuestion: number;
  ansQuestion: number;
  imagePath: string;
  isAccess: boolean;
}

export interface GetProgramsSubmitionHistoryResponseDto
  extends GetProgramSubmitionHistoryResponseDto {
  programName: string;
}
export interface ProgramPillarHistoryResponseDto
  extends ProgramPillarQuestionHistoryResponseDto {
  userID: number;
  fullName: string;
}

export interface UserProgramRequestDto extends UserProgramPillarDashboardRequestDto {
  userID: number;
}

export interface UserProgramPillarDashboardRequestDto {
  climateProgramID: number;
}
