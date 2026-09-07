import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { ProgramVM } from "../../../../core/models/ProgramVM";
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ValidationErrors, Validators } from "@angular/forms";
import {
  InviteUserDto,
  UpdateInviteUserDto,
} from "../../../../core/models/AnalystVM";
import { GetUserByRoleResponse } from "../../../../core/models/GetUserByRoleResponse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { UserRoleValue } from "src/app/core/enums/UserRole";
import { UserService } from "src/app/core/services/user.service";
import { catchError, debounceTime, map, Observable, of, switchMap } from "rxjs";
import { AdminService } from "../../admin.service";


@Component({
  selector: "app-add-update-analyst",
  templateUrl: "./add-update-analyst.component.html",
  styleUrl: "./add-update-analyst.component.css",
})
export class AddUpdateAnalystComponent implements OnInit {
  @Input() analyst: GetUserByRoleResponse | null = null;
  @Input() programs: ProgramVM[] | null = [];
  @Output() analystChange = new EventEmitter<UpdateInviteUserDto | null>();
  @Output() closeAnalystModel = new EventEmitter<boolean>();
  @Output() bulkImportChange = new EventEmitter<UpdateInviteUserDto[] | null>();
  @ViewChild("fileInput") fileInput!: ElementRef<HTMLInputElement>;
  @Input() loading: boolean = false;
 
  alertMsg = "";
  excelData: any;
  isSubmitted: boolean = false;
  requiredHeaders = ["FullName", "Email", "Phone", "ProgramName"];
  analystForm: FormGroup<any> = this.fb.group({});

  constructor(private fb: FormBuilder, private userService: UserService,private adminService: AdminService,) { 
  }
  ngOnInit(): void {
    this.initializeForm();    
  }
  initializeForm() {
    this.analystForm = this.fb.group({
      fullName: [this.analyst?.fullName, [Validators.required]],
      email: this.fb.control(
        this.analyst?.email,
        {
          validators: [Validators.required, Validators.email],
          asyncValidators: [this.emailExistsValidator()],
          updateOn: 'blur'
        }
      ),
      phone: [this.analyst?.phone, [Validators.required]],
      program: [
        this.analyst?.climatePrograms?.map((x) => x?.climateProgramID) ?? [],
        [Validators.required],
      ],
    });
  }
emailExistsValidator(): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {

    if (!control.value) {
      return of(null);
    }

    return of(control.value).pipe(
      debounceTime(500),
      switchMap(email =>
        this.adminService.checkEmailExist({
          email: email,
          userId: this.analyst?.userID ?? 0
        })
      ),
      map((exists: boolean) => {      
        return exists ? { emailExists: true } : null;
      }),
      catchError(() => of(null))
    );
  };
}

  ngOnChanges(changes: SimpleChanges): void {
    this.alertMsg = "";
    this.isSubmitted = false;
    if (this.analyst && this.analyst.climatePrograms) {
      const selectedclimateProgramIDs = this.analyst.climatePrograms.map(c => c.climateProgramID);
      this.analystForm.patchValue({
        program: selectedclimateProgramIDs
      });
    }
  } 


  onSubmit() {
    this.isSubmitted = true;
    if (this.analystForm.valid) {
      const programData: UpdateInviteUserDto = {
        ...this.analystForm.value,
        userID: this.analyst?.userID ?? 0,
        climateProgramID: this.analystForm.value.program,
      };
      this.analystChange.emit(programData);
    }
  }
  downloadTemplate() {
    const headers = ["FullName", "Email", "Phone", "ProgramName"];

    const sampleRow = {
      FullName: "FullName of Analyst",
      Email: "Enter Email of Analyst",
      Phone: "Enter Phone Number of Analyst",
      ProgramName:
        "Enter program name separated by comma, like :- COP Negotiation Transparency Initiative, Renewable Energy Transition Program, Climate Resilience and Adaptation Program",
    };

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([sampleRow], {
      header: headers,
    });
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AnalystTemplate");

    const excelBuffer: any = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });
    const data: Blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(data, "AnalystTemplate.xlsx");
  }
  onFileChange(evt: any) {
    this.alertMsg = "";
    const target: DataTransfer = <DataTransfer>evt.target;
    if (target.files.length !== 1) return;

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: "binary" });
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      const jsonData = <any[]>XLSX.utils.sheet_to_json(ws, { defval: "" });

      // ✅ Header validation
      const headers = Object.keys(jsonData[0] || {});
      const missingHeaders = this.requiredHeaders.filter(
        (h) => !headers.includes(h)
      );
      if (missingHeaders.length > 0) {
        this.alertMsg = `Invalid file format. Missing headers: ${missingHeaders.join(
          ", "
        )}`;
        this.fileInput.nativeElement.value = "";
        return;
      }

      // ✅ Validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[0-9+\-\s()]+$/;

      const excelData: InviteUserDto[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        const fullName = String(row["FullName"] || "").trim();
        const email = String(row["Email"] || "").trim();
        const phone = String(row["Phone"] || "").trim();
        const programName = String(row["ProgramName"] || "").trim();

        const isCompletelyBlank = !fullName && !email && !phone && !programName;
        if (isCompletelyBlank) {
          continue;
        }
        // ✅ Required check
        if (!fullName || !email || !phone || !programName) {
          this.alertMsg = `Row ${i + 2}: All fields are required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        if (fullName.toLowerCase() === "FullName of Analyst".toLowerCase()) {
          continue;
        }

        // ✅ Email validation
        if (!emailRegex.test(email)) {
          this.alertMsg = `Row ${i + 2}: Invalid email format (${email}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        if (
          excelData.some((c) => c.email.toLowerCase() === email.toLowerCase())
        ) {
          this.alertMsg = `Row ${i + 2}: Duplicate email name (${email}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        // ✅ Phone validation
        if (!phoneRegex.test(phone)) {
          this.alertMsg = `Row ${
            i + 2
          }: Invalid phone number format (${phone}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        // ✅ Construct DTO (invitedUserID/userID can be handled later by API)
        const dto: InviteUserDto = {
          invitedUserID: this.userService.userInfo?.userID ?? 0,
          fullName,
          email,
          phone,
          password: email,
          role: UserRoleValue.Analyst,
          climateProgramID: this.getProgramByName(programName),
        };
        excelData.push(dto);
      }
      this.excelData = excelData;
      if (this.excelData.length == 0)
      {
        this.alertMsg = "The uploaded file does not contain any valid records.";
      }
    };
    reader.readAsBinaryString(target.files[0]);
  }

  getProgramByName(programNames: string): number[] {
    if (!programNames) return [];
    return programNames
      .split(",")
      .map((name) => name.trim())
      .map((name) => this.programs?.find((c) => c.programName === name)?.climateProgramID)
      .filter((id): id is number => id !== undefined);
  }

  bulkImport() {
    if (this.excelData.length > 0 && this.fileInput.nativeElement.value != "") {
      this.bulkImportChange.emit(this.excelData);
      this.fileInput.nativeElement.value = "";
      this.excelData = [];
    }
  }
  closeModel() {
    if (this.fileInput?.nativeElement?.value)
      this.fileInput.nativeElement.value = "";
    this.alertMsg = "";
    this.closeAnalystModel.emit(true);
  }

  numberOnly(event: KeyboardEvent): void {
  const key = event.key;
  if (!/^[0-9+]$/.test(key)) {
    event.preventDefault();
  }
}
}
