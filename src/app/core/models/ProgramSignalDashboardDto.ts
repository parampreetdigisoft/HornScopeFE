import { NarrativeDto, SignalCardDto } from "./SignalCardDto";

export type SignalCondition = 'Stable' | 'Watch' | 'Elevated' | 'Critical' | string;

export interface DashboardInterpretationDto {
  dashboardInterpretationID: number;
  dashboardModeID: number;
  minRange?: number | null;
  maxRange?: number | null;
  condition: string;
  description: string;
}

export interface DashboardQuestionScoreDto {
  questionID: number;
  questionDescription: string;
  aiScore: number | null;
  aiTotalScore: number | null;
  aiTotalAns: number | null;
  aiTotalNA: number | null;
  aiTotalUnknown: number | null;
  evaluationScore?: number | null;
  evaluationTotalScore?: number | null;
  evaluationTotalAns?: number | null;
  evaluationTotalNA?: number | null;
  evaluationTotalUnknown?: number | null;
  evaluationUpdatedAt?: Date | null;
  aiUpdatedAt: Date | null;
}

export interface DashboardModeResponseDto {
  climateProgramID: number;
  dashboardModeID: number;
  modeName: string;
  description: string | null;
  year: number;
  vcp: number;
  aiProgramScore: number;
  manualProgramScore: number;
  manualValue: number;
  vcpDirectionalMovement: number;
  vcpCondition: string;
  manualCondition: string;
  vcpDescriptor: string;
  manualDescriptor: string;
  vcpStrategicAction: string;
  signals: SignalCardDto[];
  primarySignals: SignalCardDto[];
  secondarySignals: SignalCardDto[];
  narratives: NarrativeDto[];
  questions?: DashboardQuestionScoreDto[];
  dashboardInterpretations?: DashboardInterpretationDto[];
}
