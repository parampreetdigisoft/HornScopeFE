import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AiCountrySummeryDto } from 'src/app/core/models/aiVm/AiCountrySummeryDto';

@Component({
  selector: 'app-add-comment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-comment.component.html',
  styleUrls: ['./add-comment.component.css']
})
export class AddCommentComponent implements OnInit, OnChanges {

  @Input() country?: AiCountrySummeryDto | null = null;
  @Input() loading = false;

  @Output() onSubmit = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<boolean>();

  commentForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['country'] && this.commentForm) {
      this.commentForm.patchValue({
        countryID: this.country?.countryID
        
      });
    }
  }

  private buildForm(): void {
    this.commentForm = this.fb.group({
      countryID: [this.country?.countryID],
      comment: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  submit(): void {
    if (this.commentForm.invalid || !this.country) return;

    this.onSubmit.emit(this.commentForm.value);
  }

  closeModel(): void {
    this.closeModal.emit(true);
  }
}
