export interface AiProgramPillarDashboardResponseDto {
  climatePillarID: number;
  programName: string;
  evaluationValue: number;
  aiValue: number;
  pillars: ProgramPillarDashboardPillarValueDto[];
}

export interface ProgramPillarDashboardPillarValueDto {
  pillarID: number;
  pillarName: string;
  displayOrder: number;
  evaluationValue: number;
  aiValue: number;
}
