import { UserRoleValue } from "src/app/core/enums/UserRole";

export interface CountryUserSignUpDto extends LoginRequestDto{
  fullName: string;
  phone: string;
  //countryID: number;
  role: UserRoleValue;
  isConfrimed:boolean;
  is2FAEnabled:boolean;
}
export interface LoginRequestDto
{
  email: string;
  password: string;
}
