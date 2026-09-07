export enum AIEditPermissionStatus {
  PendingRequest = 0,
  Active = 1,
  Consumed = 2,
  Rejected = 3,
  Revoked = 4
}

export enum AIEditSessionStatus {
  Draft = 0,
  Submitted = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4
}

export enum AIEditEntityType {
  Country = 1,
  Pillar = 2,
  Question = 3,
  Citation = 4
}

export interface GrantAIEditPermissionDto {
  userID: number;
  countryID?: number | null;
  countryIDs?: number[] | null;
  year: number;
  notes?: string | null;
}

export interface RequestAIEditPermissionDto {
  countryID: number;
  year: number;
  notes?: string | null;
}

export interface ReviewAIEditPermissionDto {
  permissionID: number;
  approve: boolean;
  notes?: string | null;
}

export interface ReviewAIEditSessionDto {
  sessionID: number;
  approve: boolean;
  reviewComment?: string | null;
}

export interface AIEditPermissionListRequestDto {
  countryID?: number | null;
  year?: number | null;
  userID?: number | null;
  status?: number | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface AIEditSessionListRequestDto {
  countryID?: number | null;
  year?: number | null;
  userID?: number | null;
  status?: number | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface AIEditHistoryRequestDto {
  countryID?: number | null;
  year?: number | null;
  sessionID?: number | null;
  userID?: number | null;
  entityType?: number | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface AIEditPermissionDto {
  permissionID: number;
  userID: number;
  userName?: string | null;
  userEmail?: string | null;
  countryID: number;
  countryName?: string | null;
  year: number;
  status: AIEditPermissionStatus;
  statusName: string;
  requestedAt: string;
  grantedBy?: number | null;
  grantedByName?: string | null;
  grantedAt?: string | null;
  notes?: string | null;
  activeSessionID?: number | null;
}

export interface AIEditSessionDto {
  sessionID: number;
  permissionID: number;
  userID: number;
  userName?: string | null;
  countryID: number;
  countryName?: string | null;
  year: number;
  status: AIEditSessionStatus;
  statusName: string;
  createdAt: string;
  submittedAt?: string | null;
  reviewedBy?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  changeCount: number;
  fieldCount: number;
}

export interface AIEditChangeLogDto {
  changeLogID: number;
  sessionID?: number | null;
  entityType: AIEditEntityType;
  entityTypeName: string;
  entityRecordID: number;
  countryID: number;
  year: number;
  pillarID?: number | null;
  questionID?: number | null;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy: number;
  changedByName?: string | null;
  changedAt: string;
  saveBatchID: string;
  isPublished: boolean;
  changeSource: string;
}

export interface AIEditChangeCompareDto {
  entityType: AIEditEntityType;
  entityTypeName: string;
  entityRecordID: number;
  countryID: number;
  year: number;
  pillarID?: number | null;
  pillarName?: string | null;
  questionID?: number | null;
  questionText?: string | null;
  fieldName: string;
  baselineValue?: string | null;
  proposedValue?: string | null;
  editCount: number;
  firstChangedAt: string;
  lastChangedAt: string;
  trail: AIEditChangeLogDto[];
  showComment:boolean
}

export interface AIEditSessionDetailDto {
  session: AIEditSessionDto;
  changes: AIEditChangeCompareDto[];
}

export interface AIEditAccessDto {
  canEdit: boolean;
  hasPendingDraft: boolean;
  permissionID?: number | null;
  sessionID?: number | null;
  permissionStatus?: string | null;
  sessionStatus?: string | null;
  message?: string | null;
}
