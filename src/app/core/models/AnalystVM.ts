import { TieredAccessPlanValue } from "../enums/TieredAccessPlan";

export interface RegisterDto {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: number;
  tier?:TieredAccessPlanValue | TieredAccessPlanValue.Pending;
  pillars?:number[]|[];
}

export interface InviteUserDto extends RegisterDto {
  invitedUserID: number;
  climateProgramID: number[]|[]; 
  isAllPrograms?: boolean;
}

export interface UpdateInviteUserDto extends InviteUserDto {
  userID: number;
}
export interface InviteBulkUserDto {
  users: InviteUserDto[];
}
export interface SendRequestMailToUpdateProgram {
    userID: number;
    mailToUserID: number;
    staffProgramMappingID: number;
}
