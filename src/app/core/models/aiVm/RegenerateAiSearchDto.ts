export class RegenerateAiSearchDto {
  countryID!: number;
  countryEnable = false;
  pillarEnable = false;
  questionEnable = false;
  viewerUserIDs: number[] = [];
  regenerateMissingQuestionsEnable = false;
}
export class RegeneratePilalrAiSearchDto  extends RegenerateAiSearchDto{
  pillarID!: number;
}
