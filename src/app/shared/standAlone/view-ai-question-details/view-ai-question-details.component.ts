import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AIEstimatedQuestionScoreDto } from 'src/app/core/models/aiVm/AIEstimatedQuestionScoreDto';
import { UserService } from 'src/app/core/services/user.service';
import { UserRole } from 'src/app/core/enums/UserRole';
import { AiEditToolbarComponent } from '../ai-edit-toolbar/ai-edit-toolbar.component';
import { AiEditableFieldComponent } from '../ai-editable-field/ai-editable-field.component';
import {
  AiEditableFieldConfig,
  UpdateAIEstimatedQuestionScoreDto
} from 'src/app/core/models/aiVm/UpdateAiScoreDtos';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ToasterService } from 'src/app/core/services/toaster.service';

const QUESTION_TEXT_FIELDS: AiEditableFieldConfig[] = [
  { key: 'evidenceSummary', label: 'Evidence Summary', type: 'textarea' },
  { key: 'redFlag', label: 'Red Flag', type: 'textarea' },
  { key: 'inclusionEquityAdjustment', label: 'Inclusion & Equity Adjustment', type: 'textarea' },
  { key: 'structuralEvidence', label: 'Structural Evidence', type: 'textarea' },
  { key: 'operationalEvidence', label: 'Operational Evidence', type: 'textarea' },
  { key: 'outcomeEvidence', label: 'Outcome Evidence', type: 'textarea' },
  { key: 'perceptionEvidence', label: 'Perception Evidence', type: 'textarea' },
  { key: 'temporalScope', label: 'Temporal Scope', type: 'textarea' },
  { key: 'distortionScreening', label: 'Distortion Screening', type: 'textarea' },
  { key: 'relationalDependencies', label: 'Relational Dependencies', type: 'textarea' },
  { key: 'stressGeopoliticalShock', label: 'Geopolitical Shock', type: 'textarea' },
  { key: 'stressFinanceShock', label: 'Finance Shock', type: 'textarea' },
  { key: 'stressLegitimacyShock', label: 'Legitimacy Shock', type: 'textarea' },
  { key: 'stressOverallResilienceShock', label: 'Overall Resilience', type: 'textarea' },
  { key: 'opacityRisk', label: 'Opacity Risk', type: 'textarea' },
];

const QUESTION_SOURCE_FIELDS: AiEditableFieldConfig[] = [
  { key: 'sourceType', label: 'Source Type', type: 'text' },
  { key: 'sourceName', label: 'Source Name', type: 'text' },
  { key: 'sourceURL', label: 'Source URL', type: 'text' },
  { key: 'sourceDataYear', label: 'Data Year', type: 'number', max: new Date().getFullYear() },
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
  aiComputationService = inject(AiComputationService);
  toaster = inject(ToasterService);

  editMode = false;
  saving = false;
  draft: Record<string, string | number | null> = {};
  textFields = QUESTION_TEXT_FIELDS;
  sourceFields = QUESTION_SOURCE_FIELDS;

  get canEdit(): boolean {
    const role = this.userService.userInfo?.role;
    return role === UserRole.Admin || role === UserRole.Analyst;
  }

  get hasQuestionScoreRecord(): boolean {
    return (this.question?.climateProgramID ?? 0) > 0
      && (this.question?.questionID ?? 0) > 0
      && (this.question?.year ?? 0) > 0;
  }

  get averageScore(): number {
    const ai = this.getDraftNumber('aiScore') ?? this.question?.aiScore ?? 0;
    const evaluator = this.question?.evaluatorScore ?? 0;
    return (ai + evaluator) / 2;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['question']) {
      this.editMode = false;
      this.resetDraft();
    }
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
    const evaluator = question?.evaluatorScore ?? 0;
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
      climateProgramID: this.question.climateProgramID,
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
      stressGeopoliticalShock: this.getDraftString('stressGeopoliticalShock'),
      stressFinanceShock: this.getDraftString('stressFinanceShock'),
      stressLegitimacyShock: this.getDraftString('stressLegitimacyShock'),
      stressOverallResilienceShock: this.getDraftString('stressOverallResilienceShock'),
      inclusionEquityAdjustment: this.getDraftString('inclusionEquityAdjustment'),
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
    this.aiComputationService.updateAIEstimatedQuestionScore(payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.succeeded) {
          this.applyDraftToQuestion();
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
      confidenceLevel: this.question.confidenceLevel ?? null,
      sourcesConsulted: this.question.sourcesConsulted ?? null,
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
