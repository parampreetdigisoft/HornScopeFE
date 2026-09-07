import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
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
import { catchError, debounceTime, map, Observable, of, Subscription, switchMap } from "rxjs";
import { AdminService } from "../../admin.service";
import { TieredAccessPlanValue } from "src/app/core/enums/TieredAccessPlan";
import { PillarsVM } from "src/app/core/models/PillersVM";

@Component({
  selector: "app-add-update-client",
  templateUrl: "./add-update-client.component.html",
  styleUrl: "./add-update-client.component.css",
})
export class AddUpdateClientComponent implements OnInit {
  @Input() client: GetUserByRoleResponse | null = null;
  @Input() programs: ProgramVM[] | null = [];
  @Output() clientChange = new EventEmitter<UpdateInviteUserDto | null>();
  @Output() closeProgramUserModel = new EventEmitter<boolean>();
  @Output() bulkImportChange = new EventEmitter<UpdateInviteUserDto[] | null>();
  @ViewChild("fileInput") fileInput!: ElementRef<HTMLInputElement>;
  @Input() loading: boolean = false;
  @Input() pillars: PillarsVM[] = [];

  alertMsg = "";
  excelData: any;
  isSubmitted: boolean = false;
  requiredHeaders = ["FullName", "Email", "Phone", "ProgramName"];
  clientForm: FormGroup = this.fb.group({});
  tierOptions = [
    { label: "Basic", value: TieredAccessPlanValue.Basic },
    { label: "Standard", value: TieredAccessPlanValue.Standard },
    { label: "Premium", value: TieredAccessPlanValue.Premium },
  ];
  pillarLimits: Record<number, { min: number; max: number; name: string }> = {
    1: { min: 1, max: 7, name: "Basic" },
    2: { min: 1, max: 12, name: "Standard" },
  };
  /** Premium: select programs manually, or all (BE expands) */
  premiumGeoMode: "select" | "all" = "select";
  limitMessages: { [key: string]: string } = {};
  private tierSub?: Subscription;
  private previousTier: TieredAccessPlanValue | null = null;

  get isPremium(): boolean {
    return Number(this.clientForm?.get("tier")?.value) === TieredAccessPlanValue.Premium;
  }

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.bindTierChanges();
  }

  ngOnDestroy(): void {
    this.tierSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.alertMsg = "";
    this.isSubmitted = false;
    this.limitMessages = {};

    if (!this.clientForm?.contains("tier")) {
      return;
    }

    // Full reset only when switching Add/Edit user
    if (changes["client"]) {
      this.patchFormFromInputs();
      return;
    }

    // Pillars loaded late: backfill Premium pillar IDs without resetting other fields
    if (changes["pillars"] && this.isPremium) {
      this.applyPremiumPillars();
    }
  }

  private buildForm(): void {
    this.clientForm = this.fb.group({
      fullName: [null, [Validators.required]],
      email: this.fb.control(
        null,
        {
          validators: [Validators.required, Validators.email],
          asyncValidators: [this.emailExistsValidator()],
          updateOn: 'blur'
        }
      ),
      phone: [null, [Validators.required]],
      tier: [null, [Validators.required]],
      pillars: [[], [Validators.required]],
      program: [[], [Validators.required]],
    });
    this.patchFormFromInputs();
  }

  private bindTierChanges(): void {
    this.tierSub?.unsubscribe();
    this.tierSub = this.clientForm.get("tier")?.valueChanges.subscribe((tier) => {
      this.onTierChanged(Number(tier));
    });
  }

  private patchFormFromInputs(): void {
    const selectedProgramIds = this.client?.climatePrograms?.map((c) => c.climateProgramID) ?? [];
    const totalPrograms = this.programs?.length ?? 0;
    const tier = this.client?.tier != null ? Number(this.client.tier) : null;
    const isPremium = tier === TieredAccessPlanValue.Premium;
    const hasAllPrograms =
      isPremium && totalPrograms > 0 && selectedProgramIds.length >= totalPrograms;

    this.premiumGeoMode = hasAllPrograms ? "all" : "select";
    this.previousTier = tier;

    this.clientForm.reset(
      {
        fullName: this.client?.fullName ?? null,
        email: this.client?.email ?? null,
        phone: this.client?.phone ?? null,
        tier: tier,
        pillars: isPremium
          ? this.getAllPillarIds()
          : this.client?.pillars ?? [],
        program: hasAllPrograms ? [] : selectedProgramIds,
      },
      { emitEvent: false }
    );

    this.applyTierValidators(tier);
    if (isPremium) {
      this.applyPremiumPillars();
      if (hasAllPrograms) {
        this.clientForm.get("program")?.clearValidators();
        this.clientForm.get("program")?.updateValueAndValidity({ emitEvent: false });
      }
    }
  }

  private onTierChanged(tier: number): void {
    this.limitMessages = {};
    const wasPremium = this.previousTier === TieredAccessPlanValue.Premium;
    const isPremium = tier === TieredAccessPlanValue.Premium;
    this.previousTier = Number.isFinite(tier) ? (tier as TieredAccessPlanValue) : null;

    if (isPremium) {
      this.premiumGeoMode = "select";
      this.applyPremiumPillars();
      this.clientForm.get("pillars")?.clearValidators();
      this.clientForm.get("pillars")?.updateValueAndValidity({ emitEvent: false });
      this.clientForm.get("program")?.setValidators([Validators.required]);
      this.clientForm.get("program")?.updateValueAndValidity({ emitEvent: false });
    } else {
      if (wasPremium) {
        this.clientForm.patchValue({ pillars: [] }, { emitEvent: false });
        if (this.premiumGeoMode === "all") {
          this.clientForm.patchValue({ program: [] }, { emitEvent: false });
        }
        this.premiumGeoMode = "select";
      }
      this.clientForm.get("pillars")?.setValidators([Validators.required]);
      this.clientForm.get("pillars")?.updateValueAndValidity({ emitEvent: false });
      this.clientForm.get("program")?.setValidators([Validators.required]);
      this.clientForm.get("program")?.updateValueAndValidity({ emitEvent: false });
      this.checkSelectionLimit("pillars");
      this.checkSelectionLimit("program");
    }
  }

  private applyTierValidators(tier: number | null): void {
    if (tier === TieredAccessPlanValue.Premium) {
      this.clientForm.get("pillars")?.clearValidators();
    } else {
      this.clientForm.get("pillars")?.setValidators([Validators.required]);
    }
    this.clientForm.get("pillars")?.updateValueAndValidity({ emitEvent: false });
    this.clientForm.get("program")?.setValidators([Validators.required]);
    this.clientForm.get("program")?.updateValueAndValidity({ emitEvent: false });
  }

  onPremiumGeoModeChange(mode: "select" | "all"): void {
    this.premiumGeoMode = mode;
    this.limitMessages["program"] = "";
    if (mode === "all") {
      this.clientForm.patchValue({ program: [] }, { emitEvent: false });
      this.clientForm.get("program")?.clearValidators();
      this.clientForm.get("program")?.updateValueAndValidity({ emitEvent: false });
    } else {
      this.clientForm.get("program")?.setValidators([Validators.required]);
      this.clientForm.get("program")?.updateValueAndValidity({ emitEvent: false });
    }
  }

  private getAllPillarIds(): number[] {
    return (this.pillars ?? []).map((p) => p.pillarID);
  }

  private applyPremiumPillars(): void {
    this.clientForm.patchValue({ pillars: this.getAllPillarIds() }, { emitEvent: false });
  }

  emailExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }
      return of(control.value).pipe(
        debounceTime(500),
        switchMap((email) =>
          this.adminService.checkEmailExist({
            email: email,
            userId: this.client?.userID ?? 0,
          })
        ),
        map((exists: boolean) => (exists ? { emailExists: true } : null)),
        catchError(() => of(null))
      );
    };
  }

  onSubmit() {
    this.isSubmitted = true;

    if (this.isPremium) {
      this.applyPremiumPillars();
      if (this.premiumGeoMode === "all") {
        this.clientForm.patchValue({ program: [] }, { emitEvent: false });
        this.clientForm.get("program")?.clearValidators();
        this.clientForm.get("program")?.updateValueAndValidity({ emitEvent: false });
      }
    } else {
      this.checkSelectionLimit("pillars");
      this.checkSelectionLimit("program");
      if (this.limitMessages["pillars"] || this.limitMessages["program"]) {
        return;
      }
    }

    if (this.clientForm.invalid) {
      return;
    }

    if (this.isPremium && this.premiumGeoMode === "select") {
      const selected = this.clientForm.get("program")?.value || [];
      if (!Array.isArray(selected) || selected.length < 1) {
        this.limitMessages["program"] = "Please select at least one program.";
        return;
      }
    }

    const isAllPrograms = this.isPremium && this.premiumGeoMode === "all";
    const programData: UpdateInviteUserDto = {
      fullName: this.clientForm.value.fullName,
      email: this.clientForm.value.email,
      phone: this.clientForm.value.phone,
      password: "",
      role: UserRoleValue.ProgramUser,
      tier: this.clientForm.value.tier,
      pillars: this.isPremium ? this.getAllPillarIds() : this.clientForm.value.pillars,
      invitedUserID: 0,
      userID: this.client?.userID ?? 0,
      climateProgramID: isAllPrograms ? [] : this.clientForm.value.program ?? [],
      isAllPrograms,
    };
    this.clientChange.emit(programData);
  }

  downloadTemplate() {
    const headers = ["FullName", "Email", "Phone", "ProgramName"];
    const sampleRow = {
      FullName: "FullName of Program User",
      Email: "Enter Email of Program User",
      Phone: "Enter Phone Number of Program User",
      ProgramName: "Enter program name separated by comma, like :- COP Negotiation Transparency Initiative, Renewable Energy Transition Program, Climate Resilience and Adaptation Program",
    };
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ProgramUserTemplate");
    const excelBuffer: any = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data: Blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "ProgramUserTemplate.xlsx");
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

      const headers = Object.keys(jsonData[0] || {});
      const missingHeaders = this.requiredHeaders.filter((h) => !headers.includes(h));
      if (missingHeaders.length > 0) {
        this.alertMsg = `Invalid file format. Missing headers: ${missingHeaders.join(", ")}`;
        this.fileInput.nativeElement.value = "";
        return;
      }

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
        if (isCompletelyBlank) continue;
        if (!fullName || !email || !phone || !programName) {
          this.alertMsg = `Row ${i + 2}: All fields are required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        if (fullName.toLowerCase() === "FullName of Analyst".toLowerCase()) continue;
        if (!emailRegex.test(email)) {
          this.alertMsg = `Row ${i + 2}: Invalid email format (${email}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        if (excelData.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
          this.alertMsg = `Row ${i + 2}: Duplicate email name (${email}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        if (!phoneRegex.test(phone)) {
          this.alertMsg = `Row ${i + 2}: Invalid phone number format (${phone}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        const dto: InviteUserDto = {
          invitedUserID: this.userService.userInfo?.userID ?? 0,
          fullName,
          email,
          phone,
          password: email,
          role: UserRoleValue.ProgramUser,
          climateProgramID: this.getProgramByName(programName),
        };
        excelData.push(dto);
      }
      this.excelData = excelData;
      if (this.excelData.length == 0) {
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
    if (this.fileInput?.nativeElement?.value) this.fileInput.nativeElement.value = "";
    this.alertMsg = "";
    this.isSubmitted = false;
    this.limitMessages = {};
    this.premiumGeoMode = "select";
    this.previousTier = null;
    this.clientForm.reset(
      {
        fullName: null,
        email: null,
        phone: null,
        tier: null,
        pillars: [],
        program: [],
      },
      { emitEvent: false }
    );
    this.closeProgramUserModel.emit(true);
  }

  numberOnly(event: KeyboardEvent): void {
    const key = event.key;
    if (!/^[0-9+]$/.test(key)) {
      event.preventDefault();
    }
  }

  checkSelectionLimit(controlName: string) {
    const control = this.clientForm.get(controlName);
    const selected = control?.value || [];
    const tier = Number(this.clientForm.get("tier")?.value);
    let message = "";

    if (!Array.isArray(selected)) {
      this.limitMessages[controlName] = "";
      return;
    }

    const limits = this.pillarLimits[tier];

    if (controlName === "program") {
      if (this.isPremium && this.premiumGeoMode === "all") {
        this.limitMessages[controlName] = "";
        return;
      }
      if (selected.length < 1) {
        message = "Please select at least one program.";
      }
      else if (selected.length > limits?.max) {
        control?.patchValue(selected.slice(0, limits.max));
        message = `${limits.name} plan allows maximum ${limits.max} program.`;
      } else if (selected.length < limits?.min) {
        message = `${limits.name} plan requires at least ${limits.min} program.`;
      }
      
      this.limitMessages[controlName] = message;
      return;
    }

    if (controlName === "pillars") {
      if (this.isPremium) {
        this.limitMessages[controlName] = "";
        return;
      }
      if (!limits) {
        this.limitMessages[controlName] = "Please select a tier first.";
        return;
      }
      if (selected.length > limits?.max) {
        control?.patchValue(selected.slice(0, limits.max));
        message = `${limits.name} plan allows maximum ${limits.max} pillars.`;
      } else if (selected.length < limits?.min) {
        message = `${limits.name} plan requires at least ${limits.min} pillar.`;
      }
      this.limitMessages[controlName] = message;
    }
  }

  trackByFn(item: any) {
    return item.pillarID;
  }
}