import { GetUserByRoleResponse } from "./GetUserByRoleResponse";

export interface ProgramUserRow extends GetUserByRoleResponse {
  programsText?: string;
  programsExpand?: boolean;
  showProgramsToggle?: boolean;
}