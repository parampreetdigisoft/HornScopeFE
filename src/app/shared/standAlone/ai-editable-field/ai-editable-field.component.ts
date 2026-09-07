import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TypingTextComponent } from '../typing-text/typing-text.component';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { AiFieldType, CONFIDENCE_LEVEL_OPTIONS } from 'src/app/core/models/aiVm/UpdateAiScoreDtos';

@Component({
  selector: 'app-ai-editable-field',
  standalone: true,
  imports: [CommonModule, FormsModule, TypingTextComponent],
  templateUrl: './ai-editable-field.component.html',
  styleUrl: './ai-editable-field.component.css'
})
export class AiEditableFieldComponent {
  @Input() label = '';
  @Input() value: string | number | null | undefined = '';
  @Input() editMode = false;
  @Input() fieldType: AiFieldType = 'textarea';
  @Input() trustLevels: AITrustLevelVM[] = [];
  @Input() placeholder = '';
  @Input() min: number | null = 0;
  @Input() max: number | null = 100;
  @Input() step = 0;
  @Input() typingSpeed = 10;
  @Input() hideAfterWords = 7;
  @Input() showLabel = true;
  @Input() compact = false;
  @Input() scoreList = [-4,-3,-2,-1,0,1,2,3,4];

  @Output() valueChange = new EventEmitter<string | number | null>();

  confidenceOptions = CONFIDENCE_LEVEL_OPTIONS;

  get displayValue(): string {
    if (this.value === null || this.value === undefined || this.value === '') {
      return '';
    }
    return String(this.value);
  }

  get numericValue(): number | null {
    if (this.value === null || this.value === undefined || this.value === '') {
      return null;
    }
    const parsed = Number(this.value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  onTextChange(value: string) {
    this.valueChange.emit(value);
  }

  onNumberChange(value: string) {
    if (value === '' || value === null) {
      this.valueChange.emit(null);
      return;
    }
    const parsed = Number(value);
    this.valueChange.emit(Number.isNaN(parsed) ? null : parsed);
  }

  onSelectChange(value: string | number) {
    if (this.fieldType === 'trust') {
      const parsed = Number(value);
      this.valueChange.emit(Number.isNaN(parsed) ? null : parsed);
      return;
    }
    this.valueChange.emit(value);
  }

  getTrustLabel(id: number | null | undefined): string {
    if (id === null || id === undefined) {
      return 'NA';
    }
    return this.trustLevels.find(x => x.trustValue === id)?.trustName ?? 'NA';
  }
}