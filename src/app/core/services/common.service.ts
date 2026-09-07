import { Injectable } from "@angular/core";
import * as XLSX from "xlsx";
import * as FileSaver from "file-saver";
import { ResultResponseDto } from "../models/ResultResponseDto";
import { UserService } from "./user.service";
import { BehaviorSubject, catchError, from, map, Observable, switchMap, tap } from "rxjs";
import { HttpService } from "../http/http.service";
import { UpdateUserResponseDto, UserInfo } from "../models/UserInfo";
import { CountryVM } from "../models/CountryVM";
import { GetNearestCountryRequestDto } from "../models/GetNearestCountryRequestDto";
import { ToasterService } from "./toaster.service";

@Injectable({
  providedIn: "root",
})
export class CommonService {
  latitude = 0;
  longitude = 0;

  private years = new BehaviorSubject<number[]>(this.getYearList(2025));

  constructor(private http: HttpService, private userService: UserService, private toaster: ToasterService) { }

  public getAllCountryByLocation(): Observable<ResultResponseDto<CountryVM[]>> {
    const payload: GetNearestCountryRequestDto = {
      userID: this.userService.userInfo.userID,
      latitude: this.latitude,
      longitude: this.longitude,
    };

    return this.http
      .getWithQueryParams('Country/getAllCountryByLocation', payload)
      .pipe(map((x) => x as ResultResponseDto<CountryVM[]>));
  }

  public getUserNearestCountry(): Observable<ResultResponseDto<CountryVM[]>> {
    if (navigator.geolocation) {
      return from(
        new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        })
      ).pipe(
        switchMap((position) => {
          this.latitude = position.coords.latitude;
          this.longitude = position.coords.longitude;
          return this.getAllCountryByLocation();
        }),
        catchError((error) => {
          console.error('Geolocation error:', error);
          this.toaster.showError(
            'Location access denied or unavailable. Showing all countries.'
          );
          return this.getAllCountryByLocation(); // fallback
        })
      );
    } else {
      this.toaster.showError('Geolocation not supported by this browser.');
      return this.getAllCountryByLocation();
    }
  }

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
  get applicateYears() {
    return this.years.value;
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
      Sheets: { "Domains Data": worksheet },
      SheetNames: ["Domains Data"],
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
      // Special case: one domain → center the bar
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
  getYearList(startYear: number): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];

    for (let year = startYear; year <= currentYear; year++) {
      years.push(year);
    }
    return years;
  }
  public getLatitudeLongitude(country: any) {
    const params = {
      q: country,
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
      "#B5502E",
      "#C46A3A",
      "#8A5A2B",
      "#A67C3D",
      "#C9A24A",
      "#D4B45E",
      "#E7C878",
      "#B7A25A",
      "#C9C7BF",
      "#EFE7D6",
      "#B5502E",
      "#C46A3A",
      "#8A5A2B",
      "#A67C3D",
      "#C9A24A",
      "#D4B45E",
      "#E7C878",
      "#B7A25A",
      "#C9C7BF",
      "#EFE7D6",
      "#B7A25A",
      "#C9C7BF",
      "#EFE7D6",
    ];
  }
  get radarColors() {
    return [
      {
        primary: '#E7C878',
        light: '#C9A24A',
        gradient: 'rgba(231, 200, 120, 0.28)'
      },
      {
        primary: '#C9A24A',
        light: '#8A5A2B',
        gradient: 'rgba(201, 162, 74, 0.28)'
      },
      {
        primary: '#C9C7BF',
        light: '#8B887E',
        gradient: 'rgba(201, 199, 191, 0.28)'
      },
      {
        primary: '#8A5A2B',
        light: '#A67C3D',
        gradient: 'rgba(138, 90, 43, 0.28)'
      },
      {
        primary: '#B7A25A',
        light: '#D4B45E',
        gradient: 'rgba(183, 162, 90, 0.28)'
      },
      {
        primary: '#D4B45E',
        light: '#E7C878',
        gradient: 'rgba(212, 180, 94, 0.28)'
      },
      {
        primary: '#A67C3D',
        light: '#C9A24A',
        gradient: 'rgba(166, 124, 61, 0.28)'
      },
      {
        primary: '#8B887E',
        light: '#C9C7BF',
        gradient: 'rgba(139, 136, 126, 0.28)'
      },
      {
        primary: '#B5502E',
        light: '#C46A3A',
        gradient: 'rgba(181, 80, 46, 0.28)'
      },
      {
        primary: '#EFE7D6',
        light: '#C9C7BF',
        gradient: 'rgba(239, 231, 214, 0.22)'
      }
    ];
  }

  get kpiColors() {
    return [
      "#E7C878",
      "#C9A24A",
      "#8A5A2B",
      "#C9C7BF",
      "#B7A25A",
      "#D4B45E",
      "#A67C3D",
      "#8B887E",
      "#EFE7D6",
      "#B5502E",
    ];
  }

}
