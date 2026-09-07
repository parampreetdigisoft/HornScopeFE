import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AiProgramSummeryDto } from 'src/app/core/models/aiVm/AiProgramSummeryDto';
import { environment } from 'src/environments/environment';

import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/share.module';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserService } from 'src/app/core/services/user.service';
import { AiEditableFieldComponent } from '../ai-editable-field/ai-editable-field.component';
import { AiEditToolbarComponent } from '../ai-edit-toolbar/ai-edit-toolbar.component';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserRole } from 'src/app/core/enums/UserRole';
import { AiEditableFieldConfig, UpdateAIProgramScoreDto } from 'src/app/core/models/aiVm/UpdateAiScoreDtos';

const PROGRAM_EVIDENCE_FIELDS: AiEditableFieldConfig[] = [
  { key: 'structuralEvidence', label: 'Structural Evidence', type: 'textarea', showInTable: true },
  { key: 'operationalEvidence', label: 'Operational Evidence', type: 'textarea', showInTable: true },
  { key: 'outcomeEvidence', label: 'Outcome Evidence', type: 'textarea', showInTable: true },
  { key: 'perceptionEvidence', label: 'Perception Evidence', type: 'textarea', showInTable: true },
  { key: 'temporalScope', label: 'Temporal Scope', type: 'textarea', showInTable: true },
  { key: 'distortionScreening', label: 'Distortion Screening', type: 'textarea', showInTable: true },
  { key: 'geopoliticalShock', label: 'Geopolitical Shock', type: 'textarea', showInTable: true },
  { key: 'financeShock', label: 'Finance Shock', type: 'textarea', showInTable: true },
  { key: 'legitimacyShock', label: 'Legitimacy Shock', type: 'textarea', showInTable: true },
  { key: 'stressScoreAdjustment', label: 'Stress Score Adjustment', type: 'textarea', showInTable: true },
  { key: 'inclusionEquityAdjustment', label: 'Inclusion & Equity Adjustment', type: 'textarea', showInTable: true },
  { key: 'opacityRisk', label: 'Opacity Risk', type: 'textarea', showInTable: true },
  { key: 'nonCompensationNote', label: 'Non Compensation Note', type: 'textarea', showInTable: true },
  { key: 'relationalIntegrity', label: 'Relational Integrity', type: 'textarea', showInTable: true },
  { key: 'institutionalCapacity', label: 'Institutional Capacity', type: 'textarea', showInTable: true },
  { key: 'primarySource', label: 'Primary Source', type: 'textarea', showInTable: true },
  { key: 'crossPillarPatterns', label: 'Cross Domain Patterns', type: 'textarea', showInTable: true },
  { key: 'equityAssessment', label: 'Equity Assessment', type: 'textarea', showInTable: true },
  { key: 'strategicRecommendation', label: 'Strategic Recommendation', type: 'textarea', showInTable: true },
  { key: 'assessmentValueNote', label: 'Data Transparency Note', type: 'textarea', showInTable: true },
  { key: 'keyFindings', label: 'Key Findings', type: 'textarea', showInTable: true },
  { key: 'recommendations', label: 'Recommendations', type: 'textarea', showInTable: true },
];

@Component({
  selector: 'app-view-program-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, MatTooltipModule, AiEditToolbarComponent,
    AiEditableFieldComponent],
  templateUrl: './view-program-detail.component.html',
  styleUrl: './view-program-detail.component.css'
})
export class ViewProgramDetailComponent implements OnChanges {
  @Input() program?: AiProgramSummeryDto | null = null;
  @Output() closeSidebar?: boolean | null = null;
  @Output() dataSaved = new EventEmitter<void>();
  urlBase = environment.apiUrl;
  
  aiComputationService = inject(AiComputationService);
  router = inject(Router);
  userService = inject(UserService);
  toaster = inject(ToasterService);
  editMode = false;
  saving = false;
  draft: Record<string, string | number | null> = {};
  evidenceFields = PROGRAM_EVIDENCE_FIELDS;
  
  get canEdit(): boolean {
    const role = this.userService.userInfo?.role;
    return role === UserRole.Admin || role === UserRole.Analyst;
  }

  get hasProgramScoreRecord(): boolean {
    return (this.program?.climateProgramID ?? 0) > 0
      && this.program?.aiProgress !== null
      && this.program?.aiProgress !== undefined;
  }

  get discrepancy(): number {
    const ai = this.getDraftNumber('aiProgress') ?? this.program?.aiProgress ?? 0;
    const evaluator = this.getDraftNumber('evaluatorScore') ?? this.program?.evaluatorScore ?? 0;
    return Math.abs(evaluator - ai);
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['program']) {
      this.editMode = false;
      this.resetDraft();
    }
  }

  viewPillars() {
    this.router.navigate([`/${this.userService.userInfo?.role?.toLowerCase()}/ai/kpi-analysis`], {
      queryParams: {
        climateProgramID: this.program?.climateProgramID
      }
    });
  }

    startEdit() {
    this.resetDraft();
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    this.resetDraft();
  }

  saveChanges() {
    if (!this.program) {
      return;
    }

    const payload: UpdateAIProgramScoreDto = {
      climateProgramID: this.program.climateProgramID,
      year: this.program.year,
      confidenceLevel: this.getDraftString('confidenceLevel'),
      evidenceSummary: this.getDraftString('evidenceSummary'),
      keyFindings: this.getDraftString('keyFindings'),
      recommendations: this.getDraftString('recommendations'),
      structuralEvidence: this.getDraftString('structuralEvidence'),
      operationalEvidence: this.getDraftString('operationalEvidence'),
      outcomeEvidence: this.getDraftString('outcomeEvidence'),
      perceptionEvidence: this.getDraftString('perceptionEvidence'),
      temporalScope: this.getDraftString('temporalScope'),
      distortionScreening: this.getDraftString('distortionScreening'),
      geopoliticalShock: this.getDraftString('geopoliticalShock'),
      financeShock: this.getDraftString('financeShock'),
      legitimacyShock: this.getDraftString('legitimacyShock'),
      stressScoreAdjustment: this.getDraftString('stressScoreAdjustment'),
      inclusionEquityAdjustment: this.getDraftString('inclusionEquityAdjustment'),
      opacityRisk: this.getDraftString('opacityRisk'),
      nonCompensationNote: this.getDraftString('nonCompensationNote'),
      relationalIntegrity: this.getDraftString('relationalIntegrity'),
      institutionalCapacity: this.getDraftString('institutionalCapacity'),
      primarySource: this.getDraftString('primarySource'),
      crossPillarPatterns: this.getDraftString('crossPillarPatterns'),
      equityAssessment: this.getDraftString('equityAssessment'),
      strategicRecommendation: this.getDraftString('strategicRecommendation'),
      assessmentValueNote: this.getDraftString('assessmentValueNote'),
    };

    this.saving = true;
    this.aiComputationService.updateAIProgramScore(payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.succeeded) {
          this.applyDraftToProgram();
          this.editMode = false;
          this.toaster.showSuccess(res.messages?.join(', ') || 'Changes saved successfully.');
          this.dataSaved.emit();
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
    'keyFindings',
    'recommendations',
  ]);

  getFieldValue(key: string): string | number | null {
    let value: string | number | null;
    if (this.editMode && key in this.draft) {
      value = this.draft[key];
    } else {
      value = (this.program as any)?.[key] ?? null;
    }
    if (typeof value === 'string' && ViewProgramDetailComponent.LIST_FIELDS.has(key)) {
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
  }
  getExecutiveSummery() {
    const evidenceSummary = this.getFieldValue('evidenceSummary');
    return evidenceSummary ?? '';
  }

  shouldShowEvidenceRow(field: AiEditableFieldConfig): boolean {
    if (this.editMode) {
      return true;
    }
    const value = this.getFieldValue(field.key);
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  private resetDraft() {
    if (!this.program) {
      this.draft = {};
      return;
    }

    this.draft = {
      aiProgress: this.program.aiProgress ?? null,
      evaluatorScore: this.program.evaluatorScore ?? null,
      confidenceLevel: this.program.confidenceLevel ?? null,
      evidenceSummary: this.program.evidenceSummary ?? null,
    };

    this.evidenceFields.forEach(field => {
      this.draft[field.key] = (this.program as any)?.[field.key] ?? null;
    });
  }

  private applyDraftToProgram() {
    if (!this.program) {
      return;
    }

    Object.keys(this.draft).forEach(key => {
      (this.program as any)[key] = this.draft[key];
    });
    this.program.discrepancy = this.discrepancy;
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
}
