import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { PublicUserResponse } from 'src/app/core/models/UserInfo';
import { AiProgramSummeryDto } from 'src/app/core/models/aiVm/AiProgramSummeryDto';

@Component({
  selector: 'app-regenerate-ai-score-and-add-viewer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './regenerate-ai-score-and-add-viewer.component.html',
  styleUrl: './regenerate-ai-score-and-add-viewer.component.css'
})
export class RegenerateAiScoreAndAddViewerComponent implements OnInit, OnChanges {

  @Input() program?: AiProgramSummeryDto | any | null = null;
  @Input() loading = false;
  @Input() evaluatorList: PublicUserResponse[] = [];
  @Output() regenerate = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<boolean>();
  @Input() importPillar = false;
  showRegenerateMissingQuestionsOption = false;
  assesmentForm!: FormGroup;

  /** AI options config (easy to extend later) */
  aiOptions: any[] = [];

  constructor(private fb: FormBuilder, private ctx: ChangeDetectorRef) {
    this.initializeForm();
  }
  ngOnInit(): void {
    // Form is initialized in constructor so [formGroup] is always available.
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.showRegenerateMissingQuestionsOption = this.program?.aiCompletionRate < 100;

    this.aiOptions = [
      { label: 'Pillar-level AI insights', control: 'pillarEnable', time: this.importPillar ? 5 +' '+'min' : 30 +' '+ 'min' },
      { label: 'Question-level AI insights', control: 'questionEnable', time: this.importPillar ? 1 +' '+ 'hour' : 3 +' '+'hours' }
    ];

    if (!this.importPillar) {
      this.aiOptions.unshift({ label: 'Program-level AI insights', control: 'programEnable', time: 5 +' '+'min' });
      // this.aiOptions.unshift({ label: 'Immediate Situation', control: 'immediateSummaryEnable', time: 2 +' '+'min' });
    }
    if (this.showRegenerateMissingQuestionsOption)
    {
      const completionRate = Math.round(this.program?.aiCompletionRate ?? 0);

      this.aiOptions.push({
        label: 'Import Missing Questions',
        control: 'regenerateMissingQuestionsEnable',
        time: this.importPillar
          ? 1 +' '+ 'hour'
          : Math.max(1, 120 - completionRate) +' '+ 'min'
      });
    }
// this.ctx.detectChanges();
    this.assesmentForm.patchValue({
      climateProgramID: this.program?.climateProgramID ?? null,
      programEnable: !this.importPillar
    });
  }

  initializeForm() {
    this.assesmentForm = this.fb.group({
      climateProgramID: [this.program?.climateProgramID],
      programEnable: [!this.importPillar],
      // immediateSummaryEnable: [!this.importPillar],
      regenerateMissingQuestionsEnable: [false],
      pillarEnable: [true],
      questionEnable: [false],
      viewerUserIDs: [[]]   // multiple viewers
    });
  }

  onSubmit() {
    if (!this.program) return;

    const payload = {
      ...this.assesmentForm.value
    };

    this.regenerate.emit(payload);
  }

  closeModel() {
    this.closeModal.emit(true);
  }
}
