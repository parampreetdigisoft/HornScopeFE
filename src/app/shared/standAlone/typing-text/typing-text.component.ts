import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';

@Component({
  selector: 'app-typing-text',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './typing-text.component.html',
  styleUrls: ['./typing-text.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TypingTextComponent implements OnDestroy, OnChanges {

  @Input() text: string = '';
  @Input() speed: number = 40;
  @Input() numberOfWordAfterHideText: number = 7;

  displayedText: string = '';
  isExpanded: boolean = false;
  shouldShowToggle: boolean = false;
  isTypingCompleted: boolean = false;

  private intervalId: any = null;
  private typingStopIndex: number = 0;
  private limitedText: string = '';
  private fullText: string = '';
  private wasFullyTypedOnce: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Only restart typing if text actually changed
    if (changes['text'] && changes['text'].currentValue !== changes['text'].previousValue) {
      this.resetAndStartTyping();
    }
  }

  /** Prefer real newlines so each numbered point wraps (also converts legacy "||"). */
  private get displaySourceText(): string {
    if (!this.text) {
      return '';
    }
    return this.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s*\|\|\s*/g, '\n')
      .replace(/\s+(?=\d+\))/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  /**
   * Complete reset of component state
   */
  private resetAndStartTyping(): void {
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Reset all state variables
    this.displayedText = '';
    this.isExpanded = false;
    this.shouldShowToggle = false;
    this.isTypingCompleted = false;
    this.typingStopIndex = 0;
    this.limitedText = '';
    this.fullText = '';
    this.wasFullyTypedOnce = false;

    const source = this.displaySourceText;

    // Validate input before starting
    if (!source) {
      this.isTypingCompleted = true;
      this.cdr.markForCheck();
      return;
    }

    // Start typing animation
    this.startInitialTyping(source);
  }

  /**
   * Initial typing until word limit exceeded
   */
  private startInitialTyping(source: string = this.displaySourceText): void {
    let index = 0;

    this.intervalId = setInterval(() => {
      // Safety check
      if (!source || index >= source.length) {
        this.finishTyping(source);
        return;
      }

      this.displayedText += source[index];
      index++;

      // Check word count
      const words = this.displayedText.trim().split(/\s+/);

      if (words.length > this.numberOfWordAfterHideText) {
        this.shouldShowToggle = true;
        clearInterval(this.intervalId);
        this.intervalId = null;

        // Create limited text
        this.limitedText = words.slice(0, this.numberOfWordAfterHideText).join(' ') + '...';
        this.displayedText = this.limitedText;
        this.typingStopIndex = index;
        this.isTypingCompleted = true;

        this.cdr.markForCheck();
        return;
      }

      // Check if finished
      if (index >= source.length) {
        this.finishTyping(source);
      }

      this.cdr.markForCheck();
    }, this.speed);
  }

  /**
   * Lazy typing when user clicks "Show More" the first time
   */
  private startLazyTyping(): void {
    const source = this.displaySourceText;
    // Safety check
    if (!source) {
      this.finishTyping(source);
      return;
    }

    let index = Math.max(0, this.typingStopIndex - 3);
    this.displayedText = this.displayedText.slice(0, -Math.min(4, this.displayedText.length));

    this.intervalId = setInterval(() => {
      // Safety check
      if (!source || index >= source.length) {
        this.finishTyping(source);
        return;
      }

      this.displayedText += source[index];
      index++;

      if (index >= source.length) {
        this.finishTyping(source);
      }

      this.cdr.markForCheck();
    }, this.speed);
  }

  /**
   * Finish typing and store full text
   */
  private finishTyping(source: string = this.displaySourceText): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isTypingCompleted = true;
    this.fullText = source;
    this.wasFullyTypedOnce = true;
    this.cdr.markForCheck();
  }

  /**
   * Toggle between expanded and collapsed states
   */
  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      // SHOW MORE
      if (this.wasFullyTypedOnce) {
        // Already typed before - instant display
        this.displayedText = this.fullText;
        this.isTypingCompleted = true;
        this.cdr.markForCheck();
      } else {
        // Type remaining text with animation
        this.isTypingCompleted = false;
        this.startLazyTyping();
      }
    } else {
      // SHOW LESS
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.displayedText = this.limitedText;
      this.isTypingCompleted = true;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}