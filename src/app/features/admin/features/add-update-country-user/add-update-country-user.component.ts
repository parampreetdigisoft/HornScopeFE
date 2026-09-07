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
import { CountryVM } from "../../../../core/models/CountryVM";
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
  selector: "app-add-update-country-user",
  templateUrl: "./add-update-country-user.component.html",
  styleUrl: "./add-update-country-user.component.css",
})
export class AddUpdateCountryUserComponent implements OnInit, OnDestroy {
  @Input() countryUser: GetUserByRoleResponse | null = null;
  @Input() countries: CountryVM[] | null = [];
  @Output() countryUserChange = new EventEmitter<UpdateInviteUserDto | null>();
  @Output() closeCountryUserModel = new EventEmitter<boolean>();
  @Output() bulkImportChange = new EventEmitter<UpdateInviteUserDto[] | null>();
  @ViewChild("fileInput") fileInput!: ElementRef<HTMLInputElement>;
  @Input() loading: boolean = false;
  @Input() pillars: PillarsVM[] = [];

  alertMsg = "";
  excelData: any;
  isSubmitted: boolean = false;
  requiredHeaders = ["FullName", "Email", "Phone", "CountryName"];
  countryUserForm: FormGroup = this.fb.group({});
  tierOptions = [
    { label: "Basic", value: TieredAccessPlanValue.Basic },
    { label: "Standard", value: TieredAccessPlanValue.Standard },
    { label: "Premium", value: TieredAccessPlanValue.Premium },
  ];
  pillarLimits: Record<number, { min: number; max: number; name: string }> = {
    1: { min: 1, max: 7, name: "Basic" },
    2: { min: 1, max: 12, name: "Standard" },
  };
  /** Premium: select countries manually, or all (BE expands) */
  premiumGeoMode: "select" | "all" = "select";
  limitMessages: { [key: string]: string } = {};
  private tierSub?: Subscription;
  private previousTier: TieredAccessPlanValue | null = null;

  get isPremium(): boolean {
    return Number(this.countryUserForm?.get("tier")?.value) === TieredAccessPlanValue.Premium;
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

  get selectedFile(): File | null {
    return this.fileInput?.nativeElement?.files?.[0] || null;
  }

  get selectedFileName(): string {
    return this.selectedFile?.name || 'No file chosen';
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.alertMsg = "";
    this.isSubmitted = false;
    this.limitMessages = {};

    if (!this.countryUserForm?.contains("tier")) {
      return;
    }

    // Full reset only when switching Add/Edit user
    if (changes["countryUser"]) {
      this.patchFormFromInputs();
      return;
    }

    // Domains loaded late: backfill Premium domain IDs without resetting other fields
    if (changes["pillars"] && this.isPremium) {
      this.applyPremiumPillars();
    }
  }

  private buildForm(): void {
    this.countryUserForm = this.fb.group({
      fullName: [null, [Validators.required]],
      email: [null, [Validators.required, Validators.email], [this.emailExistsValidator()]],
      phone: [null, [Validators.required]],
      tier: [null, [Validators.required]],
      pillars: [[], [Validators.required]],
      country: [[], [Validators.required]],
    });
    this.patchFormFromInputs();
  }

  private bindTierChanges(): void {
    this.tierSub?.unsubscribe();
    this.tierSub = this.countryUserForm.get("tier")?.valueChanges.subscribe((tier) => {
      this.onTierChanged(Number(tier));
    });
  }

  private patchFormFromInputs(): void {
    const selectedCountryIds = this.countryUser?.countries?.map((c) => c.countryID) ?? [];
    const totalCountries = this.countries?.length ?? 0;
    const tier = this.countryUser?.tier != null ? Number(this.countryUser.tier) : null;
    const isPremium = tier === TieredAccessPlanValue.Premium;
    const hasAllCountries =
      isPremium && totalCountries > 0 && selectedCountryIds.length >= totalCountries;

    this.premiumGeoMode = hasAllCountries ? "all" : "select";
    this.previousTier = tier;

    this.countryUserForm.reset(
      {
        fullName: this.countryUser?.fullName ?? null,
        email: this.countryUser?.email ?? null,
        phone: this.countryUser?.phone ?? null,
        tier: tier,
        pillars: isPremium
          ? this.getAllPillarIds()
          : this.countryUser?.pillars ?? [],
        country: hasAllCountries ? [] : selectedCountryIds,
      },
      { emitEvent: false }
    );

    this.applyTierValidators(tier);
    if (isPremium) {
      this.applyPremiumPillars();
      if (hasAllCountries) {
        this.countryUserForm.get("country")?.clearValidators();
        this.countryUserForm.get("country")?.updateValueAndValidity({ emitEvent: false });
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
      this.countryUserForm.get("pillars")?.clearValidators();
      this.countryUserForm.get("pillars")?.updateValueAndValidity({ emitEvent: false });
      this.countryUserForm.get("country")?.setValidators([Validators.required]);
      this.countryUserForm.get("country")?.updateValueAndValidity({ emitEvent: false });
    } else {
      if (wasPremium) {
        this.countryUserForm.patchValue({ pillars: [] }, { emitEvent: false });
        if (this.premiumGeoMode === "all") {
          this.countryUserForm.patchValue({ country: [] }, { emitEvent: false });
        }
        this.premiumGeoMode = "select";
      }
      this.countryUserForm.get("pillars")?.setValidators([Validators.required]);
      this.countryUserForm.get("pillars")?.updateValueAndValidity({ emitEvent: false });
      this.countryUserForm.get("country")?.setValidators([Validators.required]);
      this.countryUserForm.get("country")?.updateValueAndValidity({ emitEvent: false });
      this.checkSelectionLimit("pillars");
      this.checkSelectionLimit("country");
    }
  }

  private applyTierValidators(tier: number | null): void {
    if (tier === TieredAccessPlanValue.Premium) {
      this.countryUserForm.get("pillars")?.clearValidators();
    } else {
      this.countryUserForm.get("pillars")?.setValidators([Validators.required]);
    }
    this.countryUserForm.get("pillars")?.updateValueAndValidity({ emitEvent: false });
    this.countryUserForm.get("country")?.setValidators([Validators.required]);
    this.countryUserForm.get("country")?.updateValueAndValidity({ emitEvent: false });
  }

  onPremiumGeoModeChange(mode: "select" | "all"): void {
    this.premiumGeoMode = mode;
    this.limitMessages["country"] = "";
    if (mode === "all") {
      this.countryUserForm.patchValue({ country: [] }, { emitEvent: false });
      this.countryUserForm.get("country")?.clearValidators();
      this.countryUserForm.get("country")?.updateValueAndValidity({ emitEvent: false });
    } else {
      this.countryUserForm.get("country")?.setValidators([Validators.required]);
      this.countryUserForm.get("country")?.updateValueAndValidity({ emitEvent: false });
    }
  }

  private getAllPillarIds(): number[] {
    return (this.pillars ?? []).map((p) => p.pillarID);
  }

  private applyPremiumPillars(): void {
    this.countryUserForm.patchValue({ pillars: this.getAllPillarIds() }, { emitEvent: false });
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
            userId: this.countryUser?.userID ?? 0,
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
        this.countryUserForm.patchValue({ country: [] }, { emitEvent: false });
        this.countryUserForm.get("country")?.clearValidators();
        this.countryUserForm.get("country")?.updateValueAndValidity({ emitEvent: false });
      }
    } else {
      this.checkSelectionLimit("pillars");
      this.checkSelectionLimit("country");
      if (this.limitMessages["pillars"] || this.limitMessages["country"]) {
        return;
      }
    }

    if (this.countryUserForm.invalid) {
      return;
    }

    if (this.isPremium && this.premiumGeoMode === "select") {
      const selected = this.countryUserForm.get("country")?.value || [];
      if (!Array.isArray(selected) || selected.length < 1) {
        this.limitMessages["country"] = "Please select at least one country.";
        return;
      }
    }

    const isAllCountries = this.isPremium && this.premiumGeoMode === "all";
    const countryData: UpdateInviteUserDto = {
      fullName: this.countryUserForm.value.fullName,
      email: this.countryUserForm.value.email,
      phone: this.countryUserForm.value.phone,
      password: "",
      role: UserRoleValue.CountryUser,
      tier: this.countryUserForm.value.tier,
      pillars: this.isPremium ? this.getAllPillarIds() : this.countryUserForm.value.pillars,
      invitedUserID: 0,
      userID: this.countryUser?.userID ?? 0,
      countryID: isAllCountries ? [] : this.countryUserForm.value.country ?? [],
      isAllCountries,
    };
    this.countryUserChange.emit(countryData);
  }

  downloadTemplate() {
    const headers = ["FullName", "Email", "Phone", "countryName"];
    const sampleRow = {
      FullName: "FullName of Country User",
      Email: "Enter Email of Country User",
      Phone: "Enter Phone Number of Country User",
      countryName: "Enter country seprated by comma, like :- USA, Canada, Brazil",
    };
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CountryUserTemplate");
    const excelBuffer: any = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data: Blob = new Blob([excelBuffer], { type: "application/octet-stream" });
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
        const countryName = String(row["countryName"] || "").trim();
        const isCompletelyBlank = !fullName && !email && !phone && !countryName;
        if (isCompletelyBlank) continue;
        if (!fullName || !email || !phone || !countryName) {
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
          role: UserRoleValue.CountryUser,
          countryID: this.getCountryByName(countryName),
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

  getCountryByName(countryNames: string): number[] {
    if (!countryNames) return [];
    return countryNames
      .split(",")
      .map((name) => name.trim())
      .map((name) => this.countries?.find((c) => c.countryName === name)?.countryID)
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
    this.countryUserForm.reset(
      {
        fullName: null,
        email: null,
        phone: null,
        tier: null,
        pillars: [],
        country: [],
      },
      { emitEvent: false }
    );
    this.closeCountryUserModel.emit(true);
  }

  numberOnly(event: KeyboardEvent): void {
    const key = event.key;
    if (!/^[0-9+]$/.test(key)) {
      event.preventDefault();
    }
  }

  checkSelectionLimit(controlName: string) {
    const control = this.countryUserForm.get(controlName);
    const selected = control?.value || [];
    const tier = Number(this.countryUserForm.get("tier")?.value);
    let message = "";

    if (!Array.isArray(selected)) {
      this.limitMessages[controlName] = "";
      return;
    }

    const limits = this.pillarLimits[tier];

    if (controlName === "country") {
      if (this.isPremium && this.premiumGeoMode === "all") {
        this.limitMessages[controlName] = "";
        return;
      }
      if (selected.length < 1) {
        message = "Please select at least one country.";
      }
      else if (selected.length > limits?.max) {
        control?.patchValue(selected.slice(0, limits.max));
        message = `${limits.name} plan allows maximum ${limits.max} country.`;
      } else if (selected.length < limits?.min) {
        message = `${limits.name} plan requires at least ${limits.min} country.`;
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
