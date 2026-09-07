export interface SummarizeKpiRequestDto {
  layerResultID: number;
}

export interface SummarizeKpiResponseDto {
  summary: string;
  scoreInterpretation?: string | null;
  keyTakeaways: string[];
  outlook?: string | null;
}
