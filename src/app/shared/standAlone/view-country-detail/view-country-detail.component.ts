import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { AiCountrySummeryDto } from 'src/app/core/models/aiVm/AiCountrySummeryDto';
import { environment } from 'src/environments/environment';

import {
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexChart,
  ChartComponent,
  ApexLegend,
  ApexStates,
  ApexTooltip
} from "ng-apexcharts";
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/share.module';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserService } from 'src/app/core/services/user.service';
import { UserRole } from 'src/app/core/enums/UserRole';
import { AiEditToolbarComponent } from 'src/app/shared/standAlone/ai-edit-toolbar/ai-edit-toolbar.component';
import { AiEditableFieldComponent } from 'src/app/shared/standAlone/ai-editable-field/ai-editable-field.component';
import { AiEditableFieldConfig, UpdateAICountryScoreDto } from 'src/app/core/models/aiVm/UpdateAiScoreDtos';
import { AiEditService } from 'src/app/core/services/ai-edit-audit.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { FormsModule } from '@angular/forms';
import { AIEditAccessDto } from 'src/app/core/models/aiVm/AiEditDtos';
import { buildCountryScoreRadialOptions } from 'src/app/core/constants/country-score-radial.util';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  states: ApexStates;
  tooltip: ApexTooltip;
};

const COUNTRY_EVIDENCE_FIELDS: AiEditableFieldConfig[] = [
  { key: 'keyDevelopments', label: 'Key Developments', type: 'textarea', showInTable: true },
  { key: 'criticalRisks', label: 'Critical Risks', type: 'textarea', showInTable: true },
  { key: 'gaps', label: 'Gaps', type: 'textarea', showInTable: true },
  { key: 'keyFindings', label: 'Key Findings', type: 'textarea', showInTable: true },
  { key: 'recommendations', label: 'Recommendations', type: 'textarea', showInTable: true },
  { key: 'structuralEvidence', label: 'Structural Evidence', type: 'textarea', showInTable: true },
  { key: 'operationalEvidence', label: 'Operational Evidence', type: 'textarea', showInTable: true },
  { key: 'outcomeEvidence', label: 'Outcome Evidence', type: 'textarea', showInTable: true },
  { key: 'perceptionEvidence', label: 'Perception Evidence', type: 'textarea', showInTable: true },
  { key: 'temporalScope', label: 'Temporal Scope', type: 'textarea', showInTable: true },
  { key: 'distortionScreening', label: 'Distortion Screening', type: 'textarea', showInTable: true },
  { key: 'politicalShock', label: 'Political Shock', type: 'textarea', showInTable: true },
  { key: 'economicShock', label: 'Economic Shock', type: 'textarea', showInTable: true },
  { key: 'narrativeShock', label: 'Narrative Shock', type: 'textarea', showInTable: true },
  { key: 'stressScoreAdjustment', label: 'Stress Score Adjustment', type: 'textarea', showInTable: true },
  { key: 'inequalityAdjustment', label: 'Inequality Adjustment', type: 'textarea', showInTable: true },
  { key: 'opacityRisk', label: 'Opacity Risk', type: 'textarea', showInTable: true },
  { key: 'nonCompensationNote', label: 'Non Compensation Note', type: 'textarea', showInTable: true },
  { key: 'relationalIntegrity', label: 'Relational Integrity', type: 'textarea', showInTable: true },
  { key: 'institutionalCapacity', label: 'Institutional Capacity', type: 'textarea', showInTable: true },
  { key: 'primarySource', label: 'Primary Source', type: 'textarea', showInTable: true },
  { key: 'crossPillarPatterns', label: 'Cross Domain Patterns', type: 'textarea', showInTable: true },
  { key: 'equityAssessment', label: 'Equity Assessment', type: 'textarea', showInTable: true },
  { key: 'conflictRiskOutlook', label: 'Conflict Risk Outlook', type: 'textarea', showInTable: true },
  { key: 'strategicRecommendation', label: 'Strategic Recommendation', type: 'textarea', showInTable: true },
  { key: 'dataTransparencyNote', label: 'Data Transparency Note', type: 'textarea', showInTable: true },
];

@Component({
  selector: 'app-view-country-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    CircularScoreComponent,
    SparklineScoreComponent,
    MatTooltipModule,
    AiEditToolbarComponent,
    AiEditableFieldComponent
  ],
  templateUrl: './view-country-detail.component.html',
  styleUrl: './view-country-detail.component.css'
})
export class ViewCountryDetailComponent implements OnChanges {
  @Input() country?: AiCountrySummeryDto | null = null;
  @Output() dataSaved = new EventEmitter<void>();
  @Output() closeSidebar?: boolean | null = null;

  urlBase = environment.apiUrl;
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;

  router = inject(Router);
  userService = inject(UserService);
  aiEditService = inject(AiEditService);
  toaster = inject(ToasterService);

  editMode = false;
  saving = false;
  submitting = false;
  requesting = false;
  editAccess: AIEditAccessDto | null = null;
  draft: Record<string, string | number | null> = {};
  evidenceFields = COUNTRY_EVIDENCE_FIELDS;

  get canEdit(): boolean {
    const role = this.userService.userInfo?.role;
    if (role === UserRole.Admin) return true;
    if (role === UserRole.Analyst) return !!this.editAccess?.canEdit;
    return false;
  }

  get isAnalyst(): boolean {
    return this.userService.userInfo?.role === UserRole.Analyst;
  }

  get hasBannerActions(): boolean {
    if (!this.editAccess) {
      return false;
    }
    const canRequest = !this.editAccess.canEdit
      && this.editAccess.permissionStatus !== 'PendingRequest';
    const canSubmit = !!this.editAccess.hasPendingDraft && !!this.editAccess.sessionID;
    return canRequest || canSubmit;
  }

  get showEditAccessBanner(): boolean {
    return this.isAnalyst
      && !!this.editAccess
      && (!!this.editAccess.message || this.hasBannerActions);
  }

  get hasCountryScoreRecord(): boolean {
    return (this.country?.countryID ?? 0) > 0
      && this.country?.aiProgress !== null
      && this.country?.aiProgress !== undefined;
  }

  get averageProgress(): number {
    return (((this.getDraftNumber('aiProgress') ?? this.country?.aiProgress ?? 0) +
      (this.getDraftNumber('evaluatorScore') ?? this.country?.evaluatorScore ?? 0)) / 2);
  }

  get discrepancy(): number {
    const ai = this.getDraftNumber('aiProgress') ?? this.country?.aiProgress ?? 0;
    const evaluator = this.getDraftNumber('evaluatorScore') ?? this.country?.evaluatorScore ?? 0;
    return Math.abs(evaluator - ai);
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['country']) {
      this.editMode = false;
      this.resetDraft();
      this.loadEditAccess();
    }
    this.ApexGetPieOptions();
  }

  loadEditAccess() {
    if (!this.country?.countryID || !this.country?.year) {
      this.editAccess = null;
      return;
    }
    const role = this.userService.userInfo?.role;
    if (role !== UserRole.Admin && role !== UserRole.Analyst) {
      this.editAccess = null;
      return;
    }
    this.aiEditService.getEditAccess(this.country.countryID, this.country.year).subscribe({
      next: (res) => {
        this.editAccess = res.succeeded ? (res.result ?? null) : null;
      },
      error: () => {
        this.editAccess = null;
      }
    });
  }

  requestPermission() {
    if (!this.country) return;
    this.requesting = true;
    this.aiEditService.requestPermission({
      countryID: this.country.countryID,
      year: this.country.year
    }).subscribe({
      next: (res) => {
        this.requesting = false;
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages?.join(', ') || 'Edit permission requested.');
          this.loadEditAccess();
        } else {
          this.toaster.showError(res.errors?.join(', ') || 'Failed to request permission.');
        }
      },
      error: () => {
        this.requesting = false;
        this.toaster.showError('Failed to request permission.');
      }
    });
  }

  submitDraft() {
    if (!this.editAccess?.sessionID) return;
    this.submitting = true;
    this.aiEditService.submitSession(this.editAccess.sessionID).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages?.join(', ') || 'Draft submitted for admin approval.');
          this.loadEditAccess();
        } else {
          this.toaster.showError(res.errors?.join(', ') || 'Failed to submit draft.');
        }
      },
      error: () => {
        this.submitting = false;
        this.toaster.showError('Failed to submit draft.');
      }
    });
  }

  viewPillars() {
    this.router.navigate([`/${this.userService.userInfo?.role?.toLowerCase()}/ai/kpi-analysis`], {
      queryParams: {
        countryID: this.country?.countryID,
        year: this.country?.year
      }
    });
  }

  startEdit() {
    if (!this.hasCountryScoreRecord) {
      return;
    }
    this.resetDraft();
    this.editMode = true;
    this.ApexGetPieOptions();
  }

  cancelEdit() {
    this.editMode = false;
    this.resetDraft();
    this.ApexGetPieOptions();
  }

  saveChanges() {
    if (!this.country || !this.hasCountryScoreRecord) {
      return;
    }

    const payload: UpdateAICountryScoreDto = {
      countryID: this.country.countryID,
      year: this.country.year,
      confidenceLevel: this.getDraftString('confidenceLevel'),
      immediateSituationSummary: this.getDraftString('immediateSituationSummary'),
      evidenceSummary: this.getDraftString('evidenceSummary'),
      keyDevelopments: this.getDraftString('keyDevelopments'),
      criticalRisks: this.getDraftString('criticalRisks'),
      gaps: this.getDraftString('gaps'),
      keyFindings: this.getDraftString('keyFindings'),
      recommendations: this.getDraftString('recommendations'),
      structuralEvidence: this.getDraftString('structuralEvidence'),
      operationalEvidence: this.getDraftString('operationalEvidence'),
      outcomeEvidence: this.getDraftString('outcomeEvidence'),
      perceptionEvidence: this.getDraftString('perceptionEvidence'),
      temporalScope: this.getDraftString('temporalScope'),
      distortionScreening: this.getDraftString('distortionScreening'),
      politicalShock: this.getDraftString('politicalShock'),
      economicShock: this.getDraftString('economicShock'),
      narrativeShock: this.getDraftString('narrativeShock'),
      stressScoreAdjustment: this.getDraftString('stressScoreAdjustment'),
      inequalityAdjustment: this.getDraftString('inequalityAdjustment'),
      opacityRisk: this.getDraftString('opacityRisk'),
      nonCompensationNote: this.getDraftString('nonCompensationNote'),
      relationalIntegrity: this.getDraftString('relationalIntegrity'),
      institutionalCapacity: this.getDraftString('institutionalCapacity'),
      primarySource: this.getDraftString('primarySource'),
      crossPillarPatterns: this.getDraftString('crossPillarPatterns'),
      equityAssessment: this.getDraftString('equityAssessment'),
      conflictRiskOutlook: this.getDraftString('conflictRiskOutlook'),
      strategicRecommendation: this.getDraftString('strategicRecommendation'),
      dataTransparencyNote: this.getDraftString('dataTransparencyNote'),
    };

    this.saving = true;
    this.aiEditService.updateAICountryScore(payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.succeeded) {
          if (this.isAnalyst) {
            // Show this analyst's draft values locally; live AI DB stays unchanged until admin approves.
            this.applyDraftToCountry();
            this.editMode = false;
            this.resetDraft();
            this.loadEditAccess();
            this.dataSaved.emit();
          } else {
            this.applyDraftToCountry();
            this.editMode = false;
            this.ApexGetPieOptions();
            this.dataSaved.emit();
          }
          this.toaster.showSuccess(res.messages?.join(', ') || 'Changes saved successfully.');
        } else {
          this.toaster.showError(res.errors?.join(', ') || 'Failed to save changes.');
        }
      },
      error: () => {
        this.saving = false;
        this.toaster.showError('Failed to save changes. Please try again.');
      }
    });
  }

  private static readonly LIST_FIELDS = new Set([
    'keyDevelopments',
    'criticalRisks',
    'gaps',
    'keyFindings',
    'recommendations',
  ]);

  getFieldValue(key: string): string | number | null {
    let value: string | number | null;
    if (this.editMode && key in this.draft) {
      value = this.draft[key];
    } else {
      value = (this.country as any)?.[key] ?? null;
    }
    if (typeof value === 'string' && ViewCountryDetailComponent.LIST_FIELDS.has(key)) {
      return this.normalizeNumberedListText(value);
    }
    return value;
  }

  /** Convert legacy "||" / mid-line "2)" markers so each point starts on a new line. */
  private normalizeNumberedListText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s*\|\|\s*/g, '\n')
      .replace(/\s+(?=\d+\))/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  setFieldValue(key: string, value: string | number | null) {
    this.draft[key] = value;
    if (key === 'aiProgress' || key === 'evaluatorScore') {
      this.ApexGetPieOptions();
    }
  }

  getExecutiveSummery() {
    const immediate = this.toSummaryText(this.getFieldValue('immediateSituationSummary'));
    const countryScoreSummery = this.toSummaryText(this.getFieldValue('countryScoreSummery'));
    const evidenceSummary = this.toSummaryText(this.getFieldValue('evidenceSummary'));

    const parts: string[] = [];
    if (immediate) {
      parts.push(immediate);
    }
    const rest = [countryScoreSummery, evidenceSummary].filter(Boolean).join(' ');
    if (rest) {
      parts.push(rest);
    }
    return parts.join('\n\n');
  }

  private toSummaryText(value: string | number | null): string {
    if (value === null || value === undefined) {
      return '';
    }
    const text = String(value).trim();
    if (!text || text.toLowerCase() === 'null') {
      return '';
    }
    return text;
  }
  shouldShowEvidenceRow(field: AiEditableFieldConfig): boolean {
    if (this.editMode) {
      return true;
    }
    const value = this.getFieldValue(field.key);
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  private resetDraft() {
    if (!this.country) {
      this.draft = {};
      return;
    }

    this.draft = {
      aiProgress: this.country.aiProgress ?? null,
      evaluatorScore: this.country.evaluatorScore ?? null,
      confidenceLevel: this.country.confidenceLevel ?? null,
      countryScoreSummery: this.country.countryScoreSummery ?? null,
      immediateSituationSummary: this.country.immediateSituationSummary ?? null,
      evidenceSummary: this.country.evidenceSummary ?? null,
    };

    this.evidenceFields.forEach(field => {
      this.draft[field.key] = (this.country as any)?.[field.key] ?? null;
    });
  }

  private applyDraftToCountry() {
    if (!this.country) {
      return;
    }

    Object.keys(this.draft).forEach(key => {
      (this.country as any)[key] = this.draft[key];
    });
    this.country.discrepancy = this.discrepancy;
  }

  private getDraftString(key: string): string | null {
    const value = this.draft[key];
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return String(value);
  }

  private getDraftNumber(key: string): number | null {
    const value = this.draft[key];
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  ApexGetPieOptions() {
    this.chartOptions = buildCountryScoreRadialOptions({
      ai: this.getDraftNumber('aiProgress') ?? this.country?.aiProgress ?? 0,
      evaluator: this.getDraftNumber('evaluatorScore') ?? this.country?.evaluatorScore ?? 0,
      discrepancy: this.discrepancy,
      avg: this.averageProgress
    });
  }
}
