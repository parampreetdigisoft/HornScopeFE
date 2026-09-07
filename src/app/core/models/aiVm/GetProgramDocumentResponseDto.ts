export interface GetProgramDocumentResponseDto {
  climateProgramID: number;
  programName: string;
  noOfUsers: number;
  noOfFiles: number;
  fileTypes: string;
  filesSize?: number; // nullable in backend
}

export interface GetProgramPillarDocumentResponseDto {
  programDocumentID: number;
  climateProgramID: number;
  pillarID?: number;
  pillarName?: string;
  fileName: string;
  storedFileName: string;
  filePath: string;
  fileType: string;
  fileSize?: number;
  processingStatus: string;
  uploadedByUserID: number;
  uploadedBy: string;
}
