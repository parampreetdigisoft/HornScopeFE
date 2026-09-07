export interface ProgramDetailsDto {
  climateProgramID: number;
  totalEvaluation: number;
  totalScore: number;
  scoreProgress: number;
  totalPillar: number;
  totalAnsPillar: number;
  totalQuestion: number;
  ansQuestion: number;
  avgHighScore: number;
  avgLowerScore: number;
  pillars: ProgramPillarDetailsDto[];
}

export interface ProgramPillarDetailsDto {
  pillarID: number;
  pillarName: string;
  totalScore: number;
  scoreProgress: number;
  totalPillar: number;
  totalAnsPillar: number;
  totalQuestion: number;
  ansQuestion: number;
  avgHighScore: number;
  avgLowerScore: number;
  totalUnKnown: number;
  totalNA: number;
  isAccess: number;
}
