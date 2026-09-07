export class RegenerateAiSearchDto {
  climateProgramID!: number;
  programEnable = false;
  pillarEnable = false;
  questionEnable = false;
  viewerUserIDs: number[] = [];
  regenerateMissingQuestionsEnable = false;
}

export class RegeneratePilalrAiSearchDto  extends RegenerateAiSearchDto{
  pillarID!: number;
}
