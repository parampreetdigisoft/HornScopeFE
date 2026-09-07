export interface GetCountryDocumentResponseDto {
  countryID: number;
  countryName: string;
  noOfUsers: number;
  noOfFiles: number;
  fileTypes: string;
  filesSize?: number; // nullable in backend
}

export interface GetCountryPillarDocumentResponseDto {
  countryDocumentID: number;
  countryID: number;
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
