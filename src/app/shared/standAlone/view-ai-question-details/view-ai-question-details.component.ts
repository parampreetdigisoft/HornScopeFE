import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AIEstimatedQuestionScoreDto } from 'src/app/core/models/aiVm/AIEstimatedQuestionScoreDto';
import { UserService } from 'src/app/core/services/user.service';
import { UserRole } from 'src/app/core/enums/UserRole';
import { AiEditToolbarComponent } from 'src/app/shared/standAlone/ai-edit-toolbar/ai-edit-toolbar.component';
import { AiEditableFieldComponent } from 'src/app/shared/standAlone/ai-editable-field/ai-editable-field.component';
import { AiEditableFieldConfig, UpdateAIEstimatedQuestionScoreDto } from 'src/app/core/models/aiVm/UpdateAiScoreDtos';
import { AiEditService } from 'src/app/core/services/ai-edit-audit.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { FormsModule } from '@angular/forms';
import { AIEditAccessDto } from 'src/app/core/models/aiVm/AiEditDtos';

const QUESTION_TEXT_FIELDS: AiEditableFieldConfig[] = [
  { key: 'evidenceSummary', label: 'Evidence Summary', type: 'textarea' },
  { key: 'redFlag', label: 'Red Flag', type: 'textarea' },
  { key: 'inequalityAdjustment', label: 'Inequality Adjustment', type: 'textarea' },
  { key: 'structuralEvidence', label: 'Structural Evidence', type: 'textarea' },
  { key: 'operationalEvidence', label: 'Operational Evidence', type: 'textarea' },
  { key: 'outcomeEvidence', label: 'Outcome Evidence', type: 'textarea' },
  { key: 'perceptionEvidence', label: 'Perception Evidence', type: 'textarea' },
  { key: 'temporalScope', label: 'Temporal Scope', type: 'textarea' },
  { key: 'distortionScreening', label: 'Distortion Screening', type: 'textarea' },
  { key: 'relationalDependencies', label: 'Relational Dependencies', type: 'textarea' },
  { key: 'stressPoliticalShock', label: 'Political Shock', type: 'textarea' },
  { key: 'stressEconomicShock', label: 'Economic Shock', type: 'textarea' },
  { key: 'stressNarrativeShock', label: 'Narrative Shock', type: 'textarea' },
  { key: 'opacityRisk', label: 'Opacity Risk', type: 'textarea' },
];

const QUESTION_SOURCE_FIELDS: AiEditableFieldConfig[] | any  = [
  { key: 'sourceType', label: 'Source Type', type: 'text' },
  { key: 'sourceName', label: 'Source Name', type: 'text' },
  { key: 'sourceURL', label: 'Source URL', type: 'text' },
  { key: 'sourceDataYear', label: 'Data Year', type: 'number', max:  new Date().getFullYear() },
  { key: 'sourceHierarchyLevel', label: 'Trust Level', type: 'trust' },
  { key: 'sourceDataExtract', label: 'Data Extract', type: 'textarea' },
];

@Component({
  selector: 'app-view-ai-question-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CircularScoreComponent,
    SparklineScoreComponent,
    MatTooltipModule,
    AiEditToolbarComponent,
    AiEditableFieldComponent
  ],
  templateUrl: './view-ai-question-details.component.html',
  styleUrl: './view-ai-question-details.component.css'
})
export class ViewAiQuestionDetailsComponent implements OnChanges {
  @Input() question?: AIEstimatedQuestionScoreDto | null = null;
  @Input() aiTrustLevels: AITrustLevelVM[] = [];
  @Output() dataSaved = new EventEmitter<void>();
  @Output() closeSidebar?: boolean | null = null;

  urlBase = environment.apiUrl;
  userService = inject(UserService);
  aiEditService = inject(AiEditService);
  toaster = inject(ToasterService);

  editMode = false;
  saving = false;
  submitting = false;
  requesting = false;
  editAccess: AIEditAccessDto | null = null;
  draft: Record<string, string | number | null> = {};
  textFields = QUESTION_TEXT_FIELDS;
  sourceFields = QUESTION_SOURCE_FIELDS;

  get canEdit(): boolean {
    const role = this.userService.userInfo?.role;
    if (role === UserRole.Admin) return true;
    if (role === UserRole.Analyst) return !!this.editAccess?.canEdit;
    return false;
  }

  get isAnalyst(): boolean {
    return this.userService.userInfo?.role === UserRole.Analyst;
  }

  get hasQuestionScoreRecord(): boolean {
    return (this.question?.countryID ?? 0) > 0
      && (this.question?.questionID ?? 0) > 0
      && (this.question?.year ?? 0) > 0;
  }

  get hasVisibleTextFields(): boolean {
    return this.editMode || this.textFields.some(field => this.shouldShowField(field));
  }

  get averageScore(): number {
    const ai = this.getDraftNumber('aiScore') ?? this.question?.aiScore ?? 0;
    const evaluator = this.getDraftNumber('evaluatorScore') ?? this.question?.evaluatorScore ?? 0;
    return (ai + evaluator) / 2;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['question']) {
      this.editMode = false;
      this.resetDraft();
      this.loadEditAccess();
    }
  }

  loadEditAccess() {
    if (!this.question?.countryID || !this.question?.year) {
      this.editAccess = null;
      return;
    }
    const role = this.userService.userInfo?.role;
    if (role !== UserRole.Admin && role !== UserRole.Analyst) {
      this.editAccess = null;
      return;
    }
    this.aiEditService.getEditAccess(this.question.countryID, this.question.year).subscribe({
      next: (res) => {
        this.editAccess = res.succeeded ? (res.result ?? null) : null;
      },
      error: () => { this.editAccess = null; }
    });
  }

  requestPermission() {
    if (!this.question) return;
    this.requesting = true;
    this.aiEditService.requestPermission({
      countryID: this.question.countryID,
      year: this.question.year
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

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  getLabelById(id: number) {
    return this.aiTrustLevels?.find(x => x.trustValue == id)?.trustName ?? 'NA';
  }

  getLabelDesById(id: number) {
    const tl = this.aiTrustLevels?.find(x => x.trustValue == id);
    return (tl?.trustDescription ?? tl?.trustName) ?? 'NA';
  }

  discrepancy(question: AIEstimatedQuestionScoreDto | null | undefined): number {
    const ai = this.editMode
      ? (this.getDraftNumber('aiScore') ?? 0)
      : (question?.aiScore ?? 0);
    const evaluator = this.editMode
      ? (this.getDraftNumber('evaluatorScore') ?? 0)
      : (question?.evaluatorScore ?? 0);
    return Math.abs(evaluator - ai);
  }

  startEdit() {
    if (!this.hasQuestionScoreRecord) {
      return;
    }
    this.resetDraft();
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    this.resetDraft();
  }

  saveChanges() {
    if (!this.question || !this.hasQuestionScoreRecord) {
      return;
    }

    const payload: UpdateAIEstimatedQuestionScoreDto = {
      countryID: this.question.countryID,
      pillarID: this.question.pillarID,
      questionID: this.question.questionID,
      year: this.question.year,
      aiScore: this.getDraftNumber('aiScore'),
      confidenceLevel: this.getDraftString('confidenceLevel'),
      sourcesConsulted: this.getDraftNumber('sourcesConsulted'),
      evidenceSummary: this.getDraftString('evidenceSummary'),
      structuralEvidence: this.getDraftString('structuralEvidence'),
      operationalEvidence: this.getDraftString('operationalEvidence'),
      outcomeEvidence: this.getDraftString('outcomeEvidence'),
      perceptionEvidence: this.getDraftString('perceptionEvidence'),
      temporalScope: this.getDraftString('temporalScope'),
      distortionScreening: this.getDraftString('distortionScreening'),
      relationalDependencies: this.getDraftString('relationalDependencies'),
      stressPoliticalShock: this.getDraftString('stressPoliticalShock'),
      stressEconomicShock: this.getDraftString('stressEconomicShock'),
      stressNarrativeShock: this.getDraftString('stressNarrativeShock'),
      inequalityAdjustment: this.getDraftString('inequalityAdjustment'),
      opacityRisk: this.getDraftString('opacityRisk'),
      redFlag: this.getDraftString('redFlag'),
      sourceType: this.getDraftString('sourceType'),
      sourceName: this.getDraftString('sourceName'),
      sourceURL: this.getDraftString('sourceURL'),
      sourceDataYear: this.getDraftNumber('sourceDataYear'),
      sourceHierarchyLevel: this.getDraftNumber('sourceHierarchyLevel'),
      sourceDataExtract: this.getDraftString('sourceDataExtract'),
    };

    this.saving = true;
    this.aiEditService.updateAIEstimatedQuestionScore(payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.succeeded) {
          if (this.isAnalyst) {
            // Show this analyst's draft values locally; live AI DB stays unchanged until admin approves.
            this.applyDraftToQuestion();
            this.editMode = false;
            this.resetDraft();
            this.loadEditAccess();
            this.dataSaved.emit();
          } else {
            this.applyDraftToQuestion();
            this.editMode = false;
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

  getFieldValue(key: string): string | number | null {
    if (this.editMode && key in this.draft) {
      return this.draft[key];
    }
    return (this.question as any)?.[key] ?? null;
  }

  setFieldValue(key: string, value: string | number | null) {
    this.draft[key] = value;
  }

  shouldShowField(field: AiEditableFieldConfig): boolean {
    if (this.editMode) {
      return true;
    }
    const value = this.getFieldValue(field.key);
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  private resetDraft() {
    if (!this.question) {
      this.draft = {};
      return;
    }

    this.draft = {
      aiScore: this.question.aiScore ?? null,
      evaluatorScore: this.question.evaluatorScore ?? null,
      confidenceLevel: this.question.confidenceLevel ?? null,
      sourcesConsulted: this.question.sourcesConsulted ?? null,
      year: this.question.year ?? null,
    };

    [...this.textFields, ...this.sourceFields].forEach(field => {
      this.draft[field.key] = (this.question as any)?.[field.key] ?? null;
    });
  }

  private applyDraftToQuestion() {
    if (!this.question) {
      return;
    }

    Object.keys(this.draft).forEach(key => {
      (this.question as any)[key] = this.draft[key];
    });
    this.question.discrepancy = this.discrepancy(this.question);
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
