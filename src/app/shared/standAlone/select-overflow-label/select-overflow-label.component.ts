import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { fitSelectLabels } from 'src/app/core/constants/select-overflow.util';

@Component({
  selector: 'app-select-overflow-label',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-overflow-label.component.html',
  styleUrl: './select-overflow-label.component.css',
})
export class SelectOverflowLabelComponent implements AfterViewInit, OnDestroy {
  visibleLabels: string[] = [];
  extraCount = 0;
  fullTitle = '';

  private labels: string[] = [];
  private resizeObserver?: ResizeObserver;
  private measureCanvas?: HTMLCanvasElement;

  @Input() set items(value: string[] | null | undefined) {
    const next = (value ?? []).filter((label) => !!label?.trim());
    if (next.join('\0') === this.labels.join('\0')) {
      return;
    }
    this.labels = next;
    this.fullTitle = next.join(', ');
    this.recompute();
  }

  constructor(
    private host: ElementRef<HTMLElement>,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    const container = this.selectContainer;
    if (container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => this.recompute());
      });
      this.resizeObserver.observe(container);
    }
    this.recompute();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private get selectContainer(): HTMLElement | null {
    return this.host.nativeElement.closest('.ng-select-container');
  }

  private recompute(): void {
    const available = this.availableWidth();
    const result = fitSelectLabels(this.labels, available, (text) => this.measureText(text));
    this.visibleLabels = result.visible;
    this.extraCount = result.extra;
  }

  private availableWidth(): number {
    const container = this.selectContainer;
    if (!container) {
      return 160;
    }
    const clear = container.querySelector('.ng-clear-wrapper') as HTMLElement | null;
    const arrow = container.querySelector('.ng-arrow-wrapper') as HTMLElement | null;
    const reserved =
      (clear?.offsetWidth || 0) +
      (arrow?.offsetWidth || 0) +
      20;
    return Math.max(72, container.clientWidth - reserved);
  }

  private measureText(text: string): number {
    if (typeof document === 'undefined') {
      return text.length * 8;
    }
    if (!this.measureCanvas) {
      this.measureCanvas = document.createElement('canvas');
    }
    const ctx = this.measureCanvas.getContext('2d');
    if (!ctx) {
      return text.length * 8;
    }
    const style = getComputedStyle(this.host.nativeElement);
    const fontFamily = style.fontFamily || 'Segoe UI, sans-serif';
    ctx.font = `650 12px ${fontFamily}`;
    return ctx.measureText(text).width;
  }
}
