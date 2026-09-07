import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { UpdateInviteUserDto } from 'src/app/core/models/AnalystVM';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { UserService } from 'src/app/core/services/user.service';
import { AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { TieredAccessPlanValue } from 'src/app/core/enums/TieredAccessPlan';
import { ClientService } from '../../client.service';

@Component({
  selector: 'app-choose-kpis',
  templateUrl: './choose-kpis.component.html',
  styleUrl: './choose-kpis.component.css'
})
export class ChooseKpisComponent {
  kpis: AnalyticalLayerResponseDto[] = [];
  programList: ProgramVM[] = [];
  @Input() pillars: PillarsVM[] = [];
  tier: TieredAccessPlanValue = TieredAccessPlanValue.Pending;
  @Output() kpiChange = new EventEmitter<any | null>();
  @Output() closeAnalystModel = new EventEmitter<boolean>();
  @Input() loading: boolean = false;
  alertMsg = "";
  excelData: any;
  isSubmitted: boolean = false;
  kpiForm: FormGroup<any> = this.fb.group({});
  pillarLimitMsg: string = '';
  limitMessages: { [key: string]: string } = {};
  premiumGeoMode: 'select' | 'all' = 'select';
  pillarLimits: any = {
    1: { min: 1, max: 7, name: 'Basic' },
    2: { min: 1, max: 12, name: 'Standard' }
  };

  get isPremium(): boolean {
    return this.tier === TieredAccessPlanValue.Premium;
  }

  constructor(private fb: FormBuilder, private clientService: ClientService, private userService: UserService) {
    this.tier = this.userService?.userInfo?.tier || TieredAccessPlanValue.Pending;
  }
  ngOnInit(): void {
    this.initializeForm();
    this.getAllPrograms();
    if (this.isPremium) {
      this.applyPremiumPillars();
      this.kpiForm.get('pillars')?.clearValidators();
      this.kpiForm.get('pillars')?.updateValueAndValidity({ emitEvent: false });
    }
  }
  initializeForm() {
    this.kpiForm = this.fb.group({
      pillars: [[], this.isPremium ? [] : [Validators.required]],
      programs: [[], [Validators.required]]
    });
  }
  trackByFn(item: any) {
    return item.pillarID;
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.alertMsg = "";
    this.isSubmitted = false;
    if (this.isPremium && this.pillars?.length) {
      this.applyPremiumPillars();
    }
  }

  GetAllKpi() {
    this.clientService.GetAllKpi().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.kpis = res.result ?? [];
        }
      }
    });
  }
  getAllPrograms() {
    this.clientService.getAllPrograms().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.programList = res.result ?? [];
        }
      }
    });
  }

  onPremiumGeoModeChange(mode: 'select' | 'all'): void {
    this.premiumGeoMode = mode;
    this.limitMessages['programs'] = '';
    if (mode === 'all') {
      this.kpiForm.patchValue({ programs: [] }, { emitEvent: false });
      this.kpiForm.get('programs')?.clearValidators();
      this.kpiForm.get('programs')?.updateValueAndValidity({ emitEvent: false });
    } else {
      this.kpiForm.get('programs')?.setValidators([Validators.required]);
      this.kpiForm.get('programs')?.updateValueAndValidity({ emitEvent: false });
    }
  }

  private applyPremiumPillars(): void {
    const allPillarIds = (this.pillars ?? []).map(p => p.pillarID);
    this.kpiForm.patchValue({ pillars: allPillarIds }, { emitEvent: false });
  }

  checkSelectionLimit(controlName: string) {
    const selected = this.kpiForm.get(controlName)?.value || [];
    let message = '';

    if (!Array.isArray(selected)) {
      this.limitMessages[controlName] = '';
      return;
    }

    if (controlName === 'programs') {
      if (this.isPremium && this.premiumGeoMode === 'all') {
        this.limitMessages[controlName] = '';
        return;
      }
      // if (selected.length < 1) {
      //   message = 'Please select at least one program.';
      // }
      this.limitMessages[controlName] = message;
      return;
    }

    if (controlName === 'pillars') {
      if (this.isPremium) {
        this.limitMessages[controlName] = '';
        return;
      }
      const limits = this.pillarLimits[this.tier];
      if (!limits) {
        this.limitMessages[controlName] = 'Invalid tier access.';
        return;
      }
      if (selected.length > limits.max) {
        this.kpiForm.patchValue({ pillars: selected.slice(0, limits.max) });
        message = `${limits.name} plan allows maximum ${limits.max} pillars.`;
      } else if (selected.length < limits.min) {
        message = `${limits.name} plan requires at least ${limits.min} pillar.`;
      }
      this.limitMessages[controlName] = message;
    }
  }

  onSubmit() {
    this.isSubmitted = true;
    const isAllPrograms = this.isPremium && this.premiumGeoMode === 'all';
    if (this.isPremium) {
      this.applyPremiumPillars();
      if (isAllPrograms) {
        this.kpiForm.patchValue({ programs: [] }, { emitEvent: false });
        this.kpiForm.get('programs')?.clearValidators();
        this.kpiForm.get('programs')?.updateValueAndValidity({ emitEvent: false });
      }
    }

    this.checkSelectionLimit('pillars');
    this.checkSelectionLimit('programs');
    if (this.limitMessages['pillars'] || this.limitMessages['programs']) {
      return;
    }

    if (this.kpiForm.valid) {
      this.kpiChange.emit({
        ...this.kpiForm.value,
        programs: isAllPrograms ? [] : this.kpiForm.value.programs,
        isAllPrograms
      });
    }
  }
  closeModel() {
    this.closeAnalystModel.emit(true);
  }
}
