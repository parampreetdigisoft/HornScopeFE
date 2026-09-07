import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { AiCountryPillarVM } from 'src/app/core/models/aiVm/AiCountryPillarResponseDto';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserService } from 'src/app/core/services/user.service';
import { UserRole } from 'src/app/core/enums/UserRole';
import { AiEditToolbarComponent } from 'src/app/shared/standAlone/ai-edit-toolbar/ai-edit-toolbar.component';
import { AiEditableFieldComponent } from 'src/app/shared/standAlone/ai-editable-field/ai-editable-field.component';
import {
  AiEditableFieldConfig,
  mapCitationsForUpdate,
  UpdateAIPillarScoreDto
} from 'src/app/core/models/aiVm/UpdateAiScoreDtos';
import { AiEditService } from 'src/app/core/services/ai-edit-audit.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { FormsModule } from '@angular/forms';
import { AIEditAccessDto } from 'src/app/core/models/aiVm/AiEditDtos';

const PILLAR_TEXT_FIELDS: AiEditableFieldConfig[] = [
  { key: 'evidenceSummary', label: 'Evidence Summary', type: 'textarea' },
  { key: 'structuralEvidence', label: 'Structural Evidence', type: 'textarea' },
  { key: 'operationalEvidence', label: 'Operational Evidence', type: 'textarea' },
  { key: 'outcomeEvidence', label: 'Outcome Evidence', type: 'textarea' },
  { key: 'perceptionEvidence', label: 'Perception Evidence', type: 'textarea' },
  { key: 'temporalScope', label: 'Temporal Scope', type: 'textarea' },
  { key: 'distortionScreening', label: 'Distortion Screening', type: 'textarea' },
  { key: 'relationalIntegrity', label: 'Relational Integrity', type: 'textarea' },
  { key: 'stressPoliticalShock', label: 'Political Shock', type: 'textarea' },
  { key: 'stressEconomicShock', label: 'Economic Shock', type: 'textarea' },
  { key: 'stressNarrativeShock', label: 'Narrative Shock', type: 'textarea' },
  { key: 'stressScoreAdjustment', label: 'Stress Score Adjustment', type: 'textarea' },
  { key: 'inequalityAdjustment', label: 'Inequality Adjustment', type: 'textarea' },
  { key: 'opacityRisk', label: 'Opacity Risk', type: 'textarea' },
  { key: 'nonCompensationNote', label: 'Non-Compensation Note', type: 'textarea' },
  { key: 'redFlag', label: 'Red Flags', type: 'textarea' },
  { key: 'geographicEquityNote', label: 'Geographic Equity Note', type: 'textarea' },
  { key: 'institutionalAssessment', label: 'Institutional Assessment', type: 'textarea' },
  { key: 'dataGapAnalysis', label: 'Data Gap Analysis', type: 'textarea' },
];

@Component({
  selector: 'app-view-ai-pillar-details',
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
  templateUrl: './view-ai-pillar-details.component.html',
  styleUrl: './view-ai-pillar-details.component.css'
})
export class ViewAiPillarDetailsComponent implements OnChanges {
  @Input() pillar?: AiCountryPillarVM | null = null;
  @Input() aiTrustLevels?: AITrustLevelVM[];
  @Output() dataSaved = new EventEmitter<void>();
  @Output() closeSidebar?: boolean | null = null;
  

  urlBase = environment.apiUrl;
  userService = inject(UserService);
  aiEditService = inject(AiEditService);
  currentYear = new Date().getFullYear();
  toaster = inject(ToasterService);

  editMode = false;
  saving = false;
  submitting = false;
  editAccess: AIEditAccessDto | null = null;
  draft: Record<string, string | number | null> = {};
  citationDrafts: Record<number, Record<string, string | number | null>> = {};
  textFields = PILLAR_TEXT_FIELDS;

  get canEdit(): boolean {
    const role = this.userService.userInfo?.role;
    if (role === UserRole.Admin) return true;
    if (role === UserRole.Analyst) return !!this.editAccess?.canEdit;
    return false;
  }

  get isAnalyst(): boolean {
    return this.userService.userInfo?.role === UserRole.Analyst;
  }

  get averageScore(): number {
    const ai = this.getDraftNumber('aiProgress') ?? this.pillar?.aiProgress ?? 0;
    const evaluator = this.getDraftNumber('evaluatorScore') ?? this.pillar?.evaluatorScore ?? 0;
    return (ai + evaluator) / 2;
  }

  get discrepancy(): number {
    const ai = this.getDraftNumber('aiProgress') ?? this.pillar?.aiProgress ?? 0;
    const evaluator = this.getDraftNumber('evaluatorScore') ?? this.pillar?.evaluatorScore ?? 0;
    return Math.abs(evaluator - ai);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pillar']) {
      this.editMode = false;
      this.resetDraft();
      this.loadEditAccess();
    }
  }

  loadEditAccess() {
    if (!this.pillar?.countryID || !this.pillar?.aiDataYear) {
      this.editAccess = null;
      return;
    }
    const role = this.userService.userInfo?.role;
    if (role !== UserRole.Admin && role !== UserRole.Analyst) {
      this.editAccess = null;
      return;
    }
    this.aiEditService.getEditAccess(this.pillar.countryID, this.pillar.aiDataYear).subscribe({
      next: (res) => {
        this.editAccess = res.succeeded ? (res.result ?? null) : null;
      },
      error: () => { this.editAccess = null; }
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

  startEdit() {
    this.resetDraft();
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    this.resetDraft();
  }

  saveChanges() {
    if (!this.pillar) {
      return;
    }

    const payload: UpdateAIPillarScoreDto = {
      pillarScoreID: this.pillar.pillarScoreID,
      confidenceLevel: this.getDraftString('confidenceLevel'),
      evidenceSummary: this.getDraftString('evidenceSummary'),
      structuralEvidence: this.getDraftString('structuralEvidence'),
      operationalEvidence: this.getDraftString('operationalEvidence'),
      outcomeEvidence: this.getDraftString('outcomeEvidence'),
      perceptionEvidence: this.getDraftString('perceptionEvidence'),
      temporalScope: this.getDraftString('temporalScope'),
      distortionScreening: this.getDraftString('distortionScreening'),
      relationalIntegrity: this.getDraftString('relationalIntegrity'),
      stressPoliticalShock: this.getDraftString('stressPoliticalShock'),
      stressEconomicShock: this.getDraftString('stressEconomicShock'),
      stressNarrativeShock: this.getDraftString('stressNarrativeShock'),
      stressScoreAdjustment: this.getDraftString('stressScoreAdjustment'),
      inequalityAdjustment: this.getDraftString('inequalityAdjustment'),
      opacityRisk: this.getDraftString('opacityRisk'),
      nonCompensationNote: this.getDraftString('nonCompensationNote'),
      geographicEquityNote: this.getDraftString('geographicEquityNote'),
      institutionalAssessment: this.getDraftString('institutionalAssessment'),
      dataGapAnalysis: this.getDraftString('dataGapAnalysis'),
      redFlag: this.getDraftString('redFlag'),
      dataSourceCitations: mapCitationsForUpdate(this.pillar.dataSourceCitations).map(c => ({
        ...c,
        sourceType: this.getCitationDraftString(c.citationID, 'sourceType'),
        sourceName: this.getCitationDraftString(c.citationID, 'sourceName'),
        sourceURL: this.getCitationDraftString(c.citationID, 'sourceURL'),
        dataYear: this.getCitationDraftNumber(c.citationID, 'dataYear'),
        dataExtract: this.getCitationDraftString(c.citationID, 'dataExtract'),
        trustLevel: this.getCitationDraftNumber(c.citationID, 'trustLevel'),
      }))
    };

    this.saving = true;
    this.aiEditService.updateAIPillarScore(payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.succeeded) {
          if (this.isAnalyst) {
            // Show this analyst's draft values locally; live AI DB stays unchanged until admin approves.
            this.applyDraftToPillar();
            this.editMode = false;
            this.resetDraft();
            this.loadEditAccess();
            this.dataSaved.emit();
          } else {
            this.applyDraftToPillar();
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
    return (this.pillar as any)?.[key] ?? null;
  }

  setFieldValue(key: string, value: string | number | null) {
    this.draft[key] = value;
  }

  getCitationValue(citationId: number, key: string): string | number | null {
    if (this.editMode && this.citationDrafts[citationId]?.[key] !== undefined) {
      return this.citationDrafts[citationId][key];
    }
    const citation = this.pillar?.dataSourceCitations?.find(x => x.citationID === citationId);
    return (citation as any)?.[key] ?? null;
  }

  setCitationValue(citationId: number, key: string, value: string | number | null) {
    if (!this.citationDrafts[citationId]) {
      this.citationDrafts[citationId] = {};
    }
    this.citationDrafts[citationId][key] = value;
  }

  shouldShowField(field: AiEditableFieldConfig): boolean {
    if (this.editMode) {
      return true;
    }
    const value = this.getFieldValue(field.key);
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  private resetDraft() {
    if (!this.pillar) {
      this.draft = {};
      this.citationDrafts = {};
      return;
    }

    this.draft = {
      aiProgress: this.pillar.aiProgress ?? null,
      evaluatorScore: this.pillar.evaluatorScore ?? null,
      confidenceLevel: this.pillar.confidenceLevel ?? null,
    };

    this.textFields.forEach(field => {
      this.draft[field.key] = (this.pillar as any)?.[field.key] ?? null;
    });

    this.citationDrafts = {};
    (this.pillar.dataSourceCitations ?? []).forEach(citation => {
      this.citationDrafts[citation.citationID] = {
        sourceType: citation.sourceType ?? null,
        sourceName: citation.sourceName ?? null,
        sourceURL: citation.sourceURL ?? null,
        dataYear: citation.dataYear ?? null,
        dataExtract: citation.dataExtract ?? null,
        trustLevel: citation.trustLevel ?? null,
      };
    });
  }

  private applyDraftToPillar() {
    if (!this.pillar) {
      return;
    }

    Object.keys(this.draft).forEach(key => {
      (this.pillar as any)[key] = this.draft[key];
    });
    this.pillar.discrepancy = this.discrepancy;

    (this.pillar.dataSourceCitations ?? []).forEach(citation => {
      const draft = this.citationDrafts[citation.citationID];
      if (!draft) {
        return;
      }
      Object.keys(draft).forEach(key => {
        (citation as any)[key] = draft[key];
      });
    });
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

  private getCitationDraftString(citationId: number, key: string): string | null {
    const value = this.citationDrafts[citationId]?.[key];
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return String(value);
  }

  private getCitationDraftNumber(citationId: number, key: string): number | null {
    const value = this.citationDrafts[citationId]?.[key];
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
