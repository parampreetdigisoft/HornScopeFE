import { FiveLevelInterpretation } from "./GetAnalyticalLayerResultDto";

export interface SignalCardDto {
  layerID: number;
  layerCode: string;
  layerName: string;
  description: string;
  code: string;
  name: string;
  value?: number;
  condition?: string;
  aiValue?: number;
  aiCondition?: string;
  manualValue?: number;
  manualCondition?: string;
  narrative: string;
  descriptor: string;
  strategicAction?: string;
  interpretationID?: number;
  aiInterpretationID?: number;
  manualInterpretationID?: number;
  isAlert: boolean;
  isAccessible: boolean;
  displayOrder?: number | null;
  interpretations: FiveLevelInterpretation[];
  climateProgramID?: number;
}

export interface NarrativeDto {
  headline: string;
  detail: string;
}
