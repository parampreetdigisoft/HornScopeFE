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
  countryID: number[]; 
  isAllCountries?: boolean;
}

export interface UpdateInviteUserDto extends InviteUserDto {
  userID: number;
}
export interface InviteBulkUserDto {
  users: InviteUserDto[];
}
export interface SendRequestMailToUpdateCountry {
    userID: number;
    mailToUserID: number;
    userCountryMappingID: number;
}
