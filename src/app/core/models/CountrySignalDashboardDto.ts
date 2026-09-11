export type SignalCondition = 'Stable' | 'Watch' | 'Elevated' | 'Critical' | string;

export interface DashboardInterpretationDto {
  dashboardInterpretationID: number;
  dashboardModeID: number;
  minRange?: number | null;
  maxRange?: number | null;
  condition: string;
  description: string;
}

export interface SignalCardDto {
  layerID: number;
  layerCode: string;
  layerName: string;
  description: string;
  code: string;
  name: string;
  aiValue?: number;
  aiUpdatedAt: Date | null;
  aiCondition?: string;
  manualValue?: number;
  manualCondition?: string;
  manualUpdatedAt: Date | null;
  aiDescriptor: string;
  manualDescriptor: string;
  strategicAction?: string;
  interpretationID?: number;
  aiInterpretationValue?: string;
  manualInterpretationValue?: string;
  isAlert: boolean;
  isAccessible: boolean;
  displayOrder?: number | null;
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
  aiUpdatedAt: Date | null;
  manualUpdatedAt?: Date | null;
  condition?: string;
  conditionDescription?: string;
  manualCondition?: string;
  manualDescriptor?: string;
  layerCode?: string;
  isAlert?: boolean;
}

export interface DashboardModeResponseDto {
  countryID: number;
  dashboardModeID: number;
  modeName: string;
  description: string | null;
  year?: number;
  ami?: number;
  aiCountryScore?: number;
  manualCountryScore?: number;
  manualValue?: number;
  amiDirectionalMovement?: number;
  amiCondition?: string;
  manualCondition?: string;
  amiDescriptor?: string;
  manualDescriptor?: string;
  amiStrategicAction?: string;
  signals?: SignalCardDto[];
  questions?: DashboardQuestionScoreDto[];
  dashboardInterpretations?: DashboardInterpretationDto[];
}