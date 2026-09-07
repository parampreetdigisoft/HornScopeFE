import { Injectable } from "@angular/core";
import * as XLSX from "xlsx";
import * as FileSaver from "file-saver";
import { ResultResponseDto } from "../models/ResultResponseDto";
import { UserService } from "./user.service";
import { BehaviorSubject, map, tap } from "rxjs";
import { HttpService } from "../http/http.service";
import { UpdateUserResponseDto, UserInfo } from "../models/UserInfo";
import { ToasterService } from "./toaster.service";
import { GetUserByRoleResponse } from "../models/GetUserByRoleResponse";
import { ProgramUserRow } from "../models/ProgramUserRow";

@Injectable({
  providedIn: "root",
})
export class CommonService {
  location: string | null = null;


  constructor(private http: HttpService, private userService: UserService, private toaster: ToasterService) { }

  public getUserInfo() {
    return this.http
      .get(`User/getUserInfo`)
      .pipe(map((x) => x as ResultResponseDto<UserInfo>));
  }

  public updateUser(formData: FormData) {
    return this.http
      .UploadFile(`Auth/updateUser`, formData)
      .pipe(map((x) => x as ResultResponseDto<UpdateUserResponseDto>));
  }

  public refreshToken() {
    this.userService.isTokenRefresh = new Date(Date.now() + 35 * 60 * 1000);
    let userRes = this.userService?.userInfo;
    if (userRes == null) {
      this.userService.RedirectBasedOnRole();
    }

    return this.http.post(`Auth/refreshToken`, { userID: userRes?.userID })
      .pipe(
        map(x => x as ResultResponseDto<UserInfo | any>),
        tap((user) => {
          if (user) {
            var rememberMe = userRes?.rememberMe;
            user.result.rememberMe = rememberMe;
            this.userService.userInfo = user.result;
          }
        }));
  }

  getStartOfYearLocal(year: number): string {
    return `${year}-01-01T00:00:00`;
  }
  exportExcel(data: any[]): void {
    // Convert JSON to worksheet
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // Set column width dynamically (based on longest value)
    const objectMaxLength: number[] = [];
    data.forEach((record) => {
      Object.keys(record).forEach((key, i) => {
        const columnLength = record[key] ? record[key].toString().length : 10;
        objectMaxLength[i] = Math.max(objectMaxLength[i] || 10, columnLength);
      });
    });

    worksheet["!cols"] = objectMaxLength.map((w) => ({ wch: w + 5 }));

    // Create workbook and add worksheet
    const workbook: XLSX.WorkBook = {
      Sheets: { "Pillars Data": worksheet },
      SheetNames: ["Pillars Data"],
    };

    // Generate Excel buffer
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    // Save file
    const fileName = `Pillars_Data_${new Date().getTime()}.xlsx`;
    FileSaver.saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      fileName
    );
  }

  GetPadding(n: number) {
    let paddingInner = 0.2;
    let paddingOuter = 0.1;

    if (n === 1) {
      // Special case: one pillar → center the bar
      paddingInner = 0.8;
      paddingOuter = 0.41;
    } else if (n < 15) {
      // Smoothly reduce padding from ~0.8 (for 2) down to ~0.25 (for 14)
      paddingInner = Math.max(0.25, 1 - n * 0.1); // e.g. 2→0.88, 10→0.4, 14→0.25
      paddingOuter = Math.max(0.1, 0.6 - n * 0.06); // e.g. 2→0.54, 10→0.3, 14→0.18
    } else if (n < 50) {
      paddingInner = 0.25;
      paddingOuter = 0.15;
    } else {
      paddingInner = 0.05;
      paddingOuter = 0.05;
    }
    return { paddingInner, paddingOuter };
  }

  public getLatitudeLongitude(Program: any) {
  const params = {
    q: Program,
    format: 'json',
    limit: 1
  };

  return this.http
    .getExternalApi('https://nominatim.openstreetmap.org/search', params)
    .pipe(map((x) => x as any[]));
}

  getGeneratedTime(utcDate: string | Date | null | undefined): string {
    if (!utcDate) return 'NA';

    // Ensure UTC parsing for string dates
    let parsedInput = utcDate;

    if (typeof utcDate === 'string') {
      parsedInput = utcDate.endsWith('Z') ? utcDate : utcDate + 'Z';
    }

    const generatedDate = new Date(parsedInput);

    // Invalid JS date check
    if (isNaN(generatedDate.getTime())) return 'NA';

    // Ignore .NET MinValue (0001-01-01)
    if (generatedDate.getFullYear() <= 1) return 'NA';

    const now = new Date();

    const diffMs = now.getTime() - generatedDate.getTime();

    // If future date, treat as NA
    if (diffMs < -90000) return 'NA';

    const safeDiffMs = Math.max(0, diffMs);

    const diffMinutes = Math.floor(safeDiffMs / (1000 * 60));
    const diffHours = Math.floor(safeDiffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(safeDiffMs / (1000 * 60 * 60 * 24));

    // Less than 10 minutes
    if (diffMinutes < 10) {
      return 'Just now';
    }

    // Less than 1 hour
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    }

    // Less than 24 hours
    if (diffHours < 24) {
      const remainingMinutes = diffMinutes % 60;
      return remainingMinutes > 0
        ? `${diffHours} hr ${remainingMinutes} min`
        : `${diffHours} hr`;
    }

    // 1 day or more
    const remainingHours = diffHours % 24;

    return remainingHours > 0
      ? `${diffDays} day${diffDays > 1 ? 's' : ''} ${remainingHours} hr`
      : `${diffDays} day${diffDays > 1 ? 's' : ''}`;
}

  researchStatusClass(date: Date | string | null | undefined): string {
    if (!date) return 'old';

    const parsedDate = new Date(date);

    // Invalid JS date
    if (isNaN(parsedDate.getTime())) return 'old';

    // Ignore .NET MinValue (0001-01-01)
    if (parsedDate.getFullYear() <= 1) return 'old';

    const diffHours =
      (Date.now() - parsedDate.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) return 'just-now';
    if (diffHours <= 72) return 'fresh';
    if (diffHours <= 240) return 'recent';

    return 'old';
  }
  isValidDate(date: any): boolean {
    if (!date) return false;

    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) return false;

    // Block .NET MinValue
    if (parsed.getFullYear() <= 1) return false;

    return true;
  }
  get PillarColors() {
    return [
      '#3B9EFF',
      '#A8E063',
      '#4CAF50',
      '#5CB8FF',
      '#FFB74D',
      '#81C784',
      '#64B5F6',
      '#CE93D8',
      '#26C6DA',
      '#FF8A65',
      '#90CAF9',
      '#C5F08A',
      '#FFCC80',
      '#80CBC4',
      '#F48FB1',
    ];
  }
  
  get radarColors() {
    return [
      {
        primary: '#3B9EFF',
        light: '#5CB8FF',
        gradient: 'rgba(59, 158, 255, 0.28)',
      },
      {
        primary: '#A8E063',
        light: '#C5F08A',
        gradient: 'rgba(168, 224, 99, 0.28)',
      },
      {
        primary: '#4CAF50',
        light: '#81C784',
        gradient: 'rgba(76, 175, 80, 0.28)',
      },
      {
        primary: '#FFB74D',
        light: '#FFCC80',
        gradient: 'rgba(255, 183, 77, 0.28)',
      },
      {
        primary: '#CE93D8',
        light: '#E1BEE7',
        gradient: 'rgba(206, 147, 216, 0.28)',
      },
      {
        primary: '#26C6DA',
        light: '#4DD0E1',
        gradient: 'rgba(38, 198, 218, 0.28)',
      },
      {
        primary: '#FF8A65',
        light: '#FFAB91',
        gradient: 'rgba(255, 138, 101, 0.28)',
      },
      {
        primary: '#64B5F6',
        light: '#90CAF9',
        gradient: 'rgba(100, 181, 246, 0.28)',
      },
    ];
  }

  get kpiColors() {
    return [
      '#3B9EFF',
      '#A8E063',
      '#4CAF50',
      '#5CB8FF',
      '#FFB74D',
      '#81C784',
      '#64B5F6',
      '#CE93D8',
      '#26C6DA',
      '#FF8A65',
    ];
  }

  public mapProgramUserRow(user: GetUserByRoleResponse): ProgramUserRow {
      const programsText = this.getProgramsText(user);
      return {
        ...user,
        programsText,
        programsExpand: false,
        showProgramsToggle: this.isLongProgramsText(programsText),
      };
    }
  
     getProgramsText(user: GetUserByRoleResponse): string {
      return (user.climatePrograms ?? [])
        .map((program) => program?.programName)
        .filter((name): name is string => !!name)
        .join(", ");
    }
  
    isLongProgramsText(text: string): boolean {
      if (!text) {
        return false;
      }
      const words = text.trim().split(/\s+/).filter(Boolean);
      return words.length > 16 || text.length > 72;
    }
}
