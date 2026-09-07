import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { environment } from 'src/environments/environment';

import { CommonModule } from '@angular/common';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { AiProgramPillarVM } from 'src/app/core/models/aiVm/AiProgramPillarResponseDto';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiEditableFieldComponent } from '../ai-editable-field/ai-editable-field.component';
import { AiEditToolbarComponent } from '../ai-edit-toolbar/ai-edit-toolbar.component';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { UserRole } from 'src/app/core/enums/UserRole';
import {
  AiEditableFieldConfig,
  mapCitationsForUpdate,
  UpdateAIDataSourceCitationDto,
  UpdateAIPillarScoreDto
} from 'src/app/core/models/aiVm/UpdateAiScoreDtos';

const PILLAR_EVIDENCE_FIELDS: AiEditableFieldConfig[] = [
  { key: 'structuralEvidence', label: 'Structural Evidence', type: 'textarea', showInTable: true },
  { key: 'operationalEvidence', label: 'Operational Evidence', type: 'textarea', showInTable: true },
  { key: 'outcomeEvidence', label: 'Outcome Evidence', type: 'textarea', showInTable: true },
  { key: 'perceptionEvidence', label: 'Perception Evidence', type: 'textarea', showInTable: true },
  { key: 'temporalScope', label: 'Temporal Scope', type: 'textarea', showInTable: true },
  { key: 'distortionScreening', label: 'Distortion Screening', type: 'textarea', showInTable: true },
  { key: 'relationalIntegrity', label: 'Relational Integrity', type: 'textarea', showInTable: true },
  { key: 'stressGeopoliticalShock', label: 'Geopolitical Shock', type: 'textarea', showInTable: true },
  { key: 'stressFinanceShock', label: 'Finance Shock', type: 'textarea', showInTable: true },
  { key: 'stressLegitimacyShock', label: 'Legitimacy Shock', type: 'textarea', showInTable: true },
  { key: 'stressScoreAdjustment', label: 'Stress Score Adjustment', type: 'textarea', showInTable: true },
  { key: 'inclusionEquityAdjustment', label: 'Inclusion & Equity Adjustment', type: 'textarea', showInTable: true },
  { key: 'opacityRisk', label: 'Opacity Risk', type: 'textarea', showInTable: true },
  { key: 'nonCompensationNote', label: 'Non-Compensation Note', type: 'textarea', showInTable: true },
  { key: 'redFlag', label: 'Red Flags', type: 'textarea', showInTable: true },
  { key: 'inclusionAccessNote', label: 'Inclusion & Access Note', type: 'textarea', showInTable: true },
  { key: 'institutionalAssessment', label: 'Institutional Assessment', type: 'textarea', showInTable: true },
  { key: 'dataGapAnalysis', label: 'Data Gap Analysis', type: 'textarea', showInTable: true },
];

@Component({
  selector: 'app-view-ai-pillar-details',
  standalone: true,
  imports: [
    CommonModule,
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
  @Input() pillar?: AiProgramPillarVM | null = null;
  @Input() aiTrustLevels?: AITrustLevelVM[];
  @Output() closeSidebar?: boolean | null = null;
  @Output() dataSaved = new EventEmitter<void>();

  urlBase = environment.apiUrl;
  editMode = false;
  saving = false;
  draft: Record<string, string | number | null> = {};
  citationDraft: UpdateAIDataSourceCitationDto[] = [];
  evidenceFields = PILLAR_EVIDENCE_FIELDS;

  aiComputationService = inject(AiComputationService);
  userService = inject(UserService);
  toaster = inject(ToasterService);

  get canEdit(): boolean {
    const role = this.userService.userInfo?.role;
    return role === UserRole.Admin || role === UserRole.Analyst;
  }

  get hasPillarScoreRecord(): boolean {
    return (this.pillar?.pillarScoreID ?? 0) > 0;
  }

  get averageProgress(): number {
    return (((this.pillar?.aiProgress ?? 0) + (this.pillar?.evaluatorScore ?? 0)) / 2);
  }

  get discrepancy(): number {
    const ai = this.pillar?.aiProgress ?? 0;
    const evaluator = this.pillar?.evaluatorScore ?? 0;
    return Math.abs(evaluator - ai);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pillar']) {
      this.editMode = false;
      this.resetDraft();
    }
  }

  startEdit() {
    if (!this.hasPillarScoreRecord) {
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
    if (!this.pillar || !this.hasPillarScoreRecord) {
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
      stressGeopoliticalShock: this.getDraftString('stressGeopoliticalShock'),
      stressFinanceShock: this.getDraftString('stressFinanceShock'),
      stressLegitimacyShock: this.getDraftString('stressLegitimacyShock'),
      stressScoreAdjustment: this.getDraftString('stressScoreAdjustment'),
      inclusionEquityAdjustment: this.getDraftString('inclusionEquityAdjustment'),
      opacityRisk: this.getDraftString('opacityRisk'),
      nonCompensationNote: this.getDraftString('nonCompensationNote'),
      inclusionAccessNote: this.getDraftString('inclusionAccessNote'),
      institutionalAssessment: this.getDraftString('institutionalAssessment'),
      dataGapAnalysis: this.getDraftString('dataGapAnalysis'),
      redFlag: this.getDraftString('redFlag'),
      dataSourceCitations: this.citationDraft,
    };

    this.saving = true;
    this.aiComputationService.updateAIPillarScore(payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.succeeded) {
          this.applyDraftToPillar();
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
    return (this.pillar as any)?.[key] ?? null;
  }

  setFieldValue(key: string, value: string | number | null) {
    this.draft[key] = value;
  }

  getCitationValue(citationID: number, field: keyof UpdateAIDataSourceCitationDto): string | number | null {
    const citation = this.citationDraft.find(c => c.citationID === citationID);
    return citation?.[field] ?? null;
  }

  setCitationValue(citationID: number, field: keyof UpdateAIDataSourceCitationDto, value: string | number | null) {
    const citation = this.citationDraft.find(c => c.citationID === citationID);
    if (citation) {
      (citation as any)[field] = value;
    }
  }

  shouldShowEvidenceSummary(): boolean {
    if (this.editMode) {
      return true;
    }
    const value = this.getFieldValue('evidenceSummary');
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  shouldShowEvidenceRow(field: AiEditableFieldConfig): boolean {
    if (this.editMode) {
      return true;
    }
    const value = this.getFieldValue(field.key);
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  shouldShowStressOverallResilience(): boolean {
    if (this.editMode) {
      return false;
    }
    const value = this.pillar?.stressOverallResilience;
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  getLabelById(id: number) {
    const tl = this.aiTrustLevels?.find(x => x.trustValue == id);
    return tl?.trustName ?? 'NA';
  }

  getLabelDesById(id: number) {
    const tl = this.aiTrustLevels?.find(x => x.trustValue == id);
    return (tl?.trustDescription ?? tl?.trustName) ?? 'NA';
  }

  private resetDraft() {
    if (!this.pillar) {
      this.draft = {};
      this.citationDraft = [];
      return;
    }

    this.draft = {
      confidenceLevel: this.pillar.confidenceLevel ?? null,
      evidenceSummary: this.pillar.evidenceSummary ?? null,
    };

    this.evidenceFields.forEach(field => {
      this.draft[field.key] = (this.pillar as any)?.[field.key] ?? null;
    });

    this.citationDraft = mapCitationsForUpdate(this.pillar.dataSourceCitations);
  }

  private applyDraftToPillar() {
    if (!this.pillar) {
      return;
    }

    Object.keys(this.draft).forEach(key => {
      (this.pillar as any)[key] = this.draft[key];
    });

    if (this.pillar.dataSourceCitations) {
      this.citationDraft.forEach(draftCitation => {
        const citation = this.pillar!.dataSourceCitations!.find(c => c.citationID === draftCitation.citationID);
        if (!citation) {
          return;
        }
        citation.sourceType = draftCitation.sourceType ?? citation.sourceType;
        citation.sourceName = draftCitation.sourceName ?? citation.sourceName;
        citation.sourceURL = draftCitation.sourceURL ?? citation.sourceURL;
        citation.dataYear = draftCitation.dataYear ?? citation.dataYear;
        citation.dataExtract = draftCitation.dataExtract ?? citation.dataExtract;
        citation.trustLevel = draftCitation.trustLevel ?? citation.trustLevel;
      });
    }
  }

  private getDraftString(key: string): string | null {
    const value = this.draft[key];
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return String(value);
  }
}
