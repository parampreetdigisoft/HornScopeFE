import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-prompt',
  templateUrl: './prompt.component.html',
  styleUrl: './prompt.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class PromptComponent implements AfterViewInit, OnDestroy {
  @Input() title: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() confirmText: string = 'Yes';
  @Input() cancelText: string = 'Cancel';
  @Input() value: any;
  @Input() uniqueId = 'confirmModal';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private modalEl: HTMLElement | null = null;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    // Move modal to <body> so sticky/transformed ancestors cannot trap
    // stacking context and block clicks under the backdrop.
    this.modalEl = this.host.nativeElement.querySelector('.modal');
    if (this.modalEl && this.modalEl.parentElement !== document.body) {
      document.body.appendChild(this.modalEl);
    }
  }

  ngOnDestroy(): void {
    if (this.modalEl?.parentElement === document.body) {
      this.modalEl.remove();
    }
    this.modalEl = null;
  }

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
