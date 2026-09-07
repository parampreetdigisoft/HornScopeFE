import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonService } from 'src/app/core/services/common.service';

@Component({
  selector: 'app-circular-score',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './circular-score.component.html',
  styleUrl: './circular-score.component.css'
})
export class CircularScoreComponent implements OnInit, OnChanges {

  commonService = inject(CommonService);
  @Input() value: number | null = null;
  @Input() tooltipText: string = '';
  /** Optional center label (e.g. absolute count) while `value` drives the ring 0–100. */
  @Input() centerText: string | null = null;

  formattedValue: string = '';
  symbol: string = '';
  circumference: number = 2 * Math.PI * 20;
  dashOffset: number = 0;
  isShortValue = false;
  isLongValue = false;
  isNegative = false;

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.value === null || isNaN(this.value)) {
      this.formattedValue = 'NA';
      this.isShortValue = true;
      this.isLongValue = false;
      this.isNegative = false;
      this.dashOffset = this.circumference;
      return;
    }

    const val = Number(this.value);
    this.isNegative = val < 0;
    this.formattedValue = val == 100 || val == 0 ? val.toFixed(0) : val.toFixed(2);
    this.isShortValue = this.formattedValue.length <= 3;
    this.isLongValue = this.formattedValue.length >= 5;

    const progress = Math.min(Math.abs(val) / 100, 1);
    this.dashOffset = this.circumference * (1 - progress);
  }

  /** Ring stroke — high scores gold, low scores bronze/danger, negatives alert */
  getColor(value: number): string {
    if (value < 0) return '#B5502E';
    if (value >= 90) return '#D4B86A';
    if (value >= 80) return '#C9A85A';
    if (value >= 70) return '#C5A05A';
    if (value >= 60) return '#5A9B8A';
    if (value >= 50) return '#A67C3D';
    if (value >= 40) return '#8B6B32';
    if (value >= 30) return '#C46A3A';
    if (value >= 20) return '#B5502E';
    if (value >= 10) return '#7A8A9A';
    return '#7A8A9A';
  }

  /** Center label — high contrast on dark tables */
  getColorR(value: number): string {
    if (value < 0) return '#E08A6A';
    if (value >= 70) return '#E8EEF4';
    if (value >= 40) return '#D4B86A';
    return '#E08A6A';
  }
}
