
export interface ProgramPillerRequestDto {
  climateProgramID :number;
  userID: number;
  pillarID?: number;
}


export interface ProgramMappingPillerRequestDto {
  staffProgramMappingID: number;
  pillarID?: number;
}