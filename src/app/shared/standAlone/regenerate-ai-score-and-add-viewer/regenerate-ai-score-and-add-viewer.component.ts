import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgSelectDefaultsDirective } from '../../directives/ng-select-defaults.directive';
import { PublicUserResponse } from 'src/app/core/models/UserInfo';
import { AiCountrySummeryDto } from 'src/app/core/models/aiVm/AiCountrySummeryDto';

@Component({
  selector: 'app-regenerate-ai-score-and-add-viewer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, NgSelectDefaultsDirective],
  templateUrl: './regenerate-ai-score-and-add-viewer.component.html',
  styleUrl: './regenerate-ai-score-and-add-viewer.component.css'
})
export class RegenerateAiScoreAndAddViewerComponent implements OnChanges {

  @Input() country?: AiCountrySummeryDto | any | null = null;
  @Input() loading = false;
  @Input() evaluatorList: PublicUserResponse[] = [];
  @Output() regenerate = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<boolean>();
  @Input() importPillar = false;
  showRegenerateMissingQuestionsOption = false;
  assesmentForm!: FormGroup;

  /** AI options config (easy to extend later) */
  aiOptions: any[] = [];

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.showRegenerateMissingQuestionsOption = (this.country?.aiCompletionRate ?? 100) < 100;

    this.aiOptions = [
      { label: 'Pillar-level AI insights', control: 'pillarEnable', time: this.importPillar ? '5 min' : '30 min' },
      { label: 'Question-level AI insights', control: 'questionEnable', time: this.importPillar ? '1 hour' : '3 hours' }
    ];

    if (!this.importPillar) {
      this.aiOptions.unshift({ label: 'Country-level AI insights', control: 'countryEnable', time: '5 min' });
      this.aiOptions.unshift({ label: 'Immediate Situation', control: 'immediateSummaryEnable', time: '2 min' });
    }
    if (this.showRegenerateMissingQuestionsOption) {
      const completionRate = Math.round(this.country?.aiCompletionRate ?? 0);

      this.aiOptions.push({
        label: 'Import Missing Questions',
        control: 'regenerateMissingQuestionsEnable',
        time: this.importPillar
          ? '1 hour'
          : Math.max(1, 120 - completionRate) + ' min'
      });
    }

    if (this.assesmentForm) {
      this.assesmentForm.patchValue({
        countryID: this.country?.countryID ?? null,
        countryEnable: !this.importPillar,
        immediateSummaryEnable: !this.importPillar
      });
    }
  }

  initializeForm() {
    this.assesmentForm = this.fb.group({
      countryID: [this.country?.countryID],
      countryEnable: [!this.importPillar],
      immediateSummaryEnable: [!this.importPillar],
      regenerateMissingQuestionsEnable: [false],
      pillarEnable: [true],
      questionEnable: [false],
      viewerUserIDs: [[]]   // multiple viewers
    });
  }

  onSubmit() {
    if (!this.country) return;

    const payload = {
      ...this.assesmentForm.value
    };

    this.regenerate.emit(payload);
  }

  closeModel() {
    this.closeModal.emit(true);
  }
}
