import { UserRoleValue } from "src/app/core/enums/UserRole";

export interface ClientSignUpDto extends LoginRequestDto{
  fullName: string;
  phone: string;
  //climateProgramID: number;
  role: UserRoleValue;
  isConfrimed:boolean;
  is2FAEnabled:boolean;
}

export interface LoginRequestDto
{
  email: string;
  password: string;
}
