import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  computed,
  signal,
  effect,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { MarkdownPipe } from '../../directives/markdown.pipe';
import { ChatService } from 'src/app/core/services/chat.service';
import { MatTooltip } from '@angular/material/tooltip';
import { ChatMessage } from 'src/app/core/models/chat/ChatMessage';
import { NgSelectModule } from '@ng-select/ng-select';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { AIAssistantFAQDto } from 'src/app/core/models/chat/AIAssistantFAQDto';
import {
  ProgramExecutiveSlidesResult,
  PillarsUserHistroyResponseDto,
} from 'src/app/core/models/chat/ChatProgramExecutiveSlidesResponse';
import {
  PillarLiveSignalCard,
  PillarLiveSignalsResult,
} from 'src/app/core/models/chat/PillarLiveSignalsResponse';
import { CommonService } from 'src/app/core/services/common.service'; 
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe, MatTooltip, NgSelectModule],
  templateUrl: './chat-container.component.html',
  styleUrls: ['./chat-container.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatContainerComponent implements OnInit, OnDestroy {

  // ─── DI ───────────────────────────────────────────────────────────────────
  protected chatService = inject(ChatService);
  private cdr = inject(ChangeDetectorRef);
  private commonService = inject(CommonService);

  // ─── View refs ────────────────────────────────────────────────────────────
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;

  // ─── Local state ──────────────────────────────────────────────────────────
  inputText = signal('');
  suggestions = signal<AIAssistantFAQDto[]>([]);
  showSuggestions = signal(false);
  showContextPanel = signal(true);
  unreadCount = signal(0);
  programSlide: ProgramExecutiveSlidesResult | null = null;
  programSlidesLoading = signal(false);
  programPillarScores = signal<PillarsUserHistroyResponseDto[]>([]);
  programPillarsLoading = signal(false);
  pillarLiveSignals = signal<PillarLiveSignalsResult | null>(null);
  pillarLiveSignalsLoading = signal(false);
  pillarLiveSignalsError = signal<string | null>(null);
  selectedPillarSignalId = signal<number | null>(null);
  urlBase = environment.apiUrl;

  // ─── Service signal aliases ───────────────────────────────────────────────
  protected isOpen = this.chatService.isOpen;
  protected isTyping = this.chatService.isTyping;
  protected messages = this.chatService.messages;
  protected selectedProgram = this.chatService.selectedProgram;
  protected selectedPillar = this.chatService.selectedPillar;
  isExpanded = false;

  // ─── Computed ─────────────────────────────────────────────────────────────
  protected hasContext = computed(() =>
    !!this.chatService.selectedProgram() || !!this.chatService.selectedPillar()
  );

  protected contextLabel = computed<string | null>(() => {
    const c = this.chatService.selectedProgram();
    const p = this.chatService.selectedPillar();
    if (c && p) return `${c.programName} · ${p.pillarName}`;
    if (c) return c.programName;
    if (p) return p.pillarName;
    return null;
  });

  protected displayMessages = computed(() =>
    this.messages().filter(m => m.id !== 'welcome' && m.content?.trim())
  );

  protected showWorkspaceEmpty = computed(() => this.displayMessages().length === 0);

  /** Seconds for one full TRY ASKING marquee loop (scales with chip count). */
  protected railMarqueeDuration = computed(() => {
    const count = this.chatService.quickQuestions().length;
    return Math.max(28, count * 5);
  });

  readonly rotatingHeadlines = [
    'Welcome to VCP',
    'Surface stability signals across regions',
    'Interrogate program risk with pillar context',
    'Compare indices and emerging pressure points',
    'Brief on conflict trajectories and early warnings',
  ];

  readonly rotatingPlaceholders = [
    'Frame a program intelligence question…',
    'Which stability indicators matter for your decision?',
    'Ask about governance, security, or humanitarian drivers…',
    'Request a cross-program or regional assessment…',
  ];

  rotatingIndex = signal(0);
  placeholderIndex = signal(0);
  promptAnimating = signal(false);
  placeholderAnimating = signal(false);

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();
  private promptRotateId?: ReturnType<typeof setInterval>;
  private placeholderRotateId?: ReturnType<typeof setInterval>;

  sliderItems: any[] = [];
  currentSlide = 0;
  animate = false;
  intervalId: any;
  analysisModalOpen = signal(false);

  constructor() {
    // Auto-scroll whenever messages list grows
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });

    // Reset unread count & focus input when panel opens
    effect(() => {
      const open = this.isOpen();
      if (open) {
        this.unreadCount.set(0);
        setTimeout(() => this.inputField?.nativeElement?.focus(), 320);
      }
    });

    // Increment unread badge while panel is closed
    effect(() => {
      const msgs = this.messages();
      if (!this.isOpen() && msgs.length > 1) {
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant' && !last.isStreaming) {
          this.unreadCount.update(n => n + 1);
        }
      }
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.clearHistory();
    this.closeChat();
    this.clearContext();
    this.chatService.getAllPrograms();
    this.chatService.getPillars();
    this.chatService.getFAQDs();
    this.loadProgramSlides(0);
    this.startSlider();
    this.startPromptRotation();
    if (this.chatService.crossComparisionprogramIDs.value.length > 0) {
      this.getProgramsCrossComparision()
    }
  }

  onProgramChange(program: ProgramVM | null): void {
    this.analysisModalOpen.set(false);
    this.sliderItems = [];
    this.currentSlide = 0;
    this.isExpanded = false;
    this.programPillarScores.set([]);
    clearInterval(this.intervalId);
    this.chatService.selectedProgram.set(program ?? null);
    this.chatService.selectedPillar.set(null);

    if (program?.climateProgramID == null) {
      this.loadProgramSlides(0);
      return;
    }

    this.loadProgramSlides(program.climateProgramID, program);
  }

  private loadProgramSlides(climateProgramID: number, program?: ProgramVM | null): void {
    this.programSlide = null;
    this.programPillarScores.set([]);
    if (climateProgramID === 0) {
      this.sliderItems = [];
      clearInterval(this.intervalId);
    }
    this.programSlidesLoading.set(true);
    this.cdr.markForCheck();

    this.chatService.getProgramSlides(climateProgramID).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.programSlidesLoading.set(false);
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: res => {
        const data = this.chatService.unwrapProgramSlides(res);
        this.programSlide = data ?? null;

        if (!data) return;

        if (climateProgramID === 0) {
          this.sliderItems = [];
          this.cdr.markForCheck();
          return;
        }

        const pillars = data.program?.pillars ?? [];
        const mapped = pillars
          .map(p => ({
            pillarID: p.pillarID,
            pillarName: p.pillarName,
            imagePath: p.imagePath ?? '',
            pillarScore: p.pillarScore ?? 0,
            displayOrder: p.displayOrder ?? 0,
          }))
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        this.programPillarScores.set(mapped);

        const slidePillars = this.normalizeSlidePillars(data.program?.pillars);
        if (slidePillars.length && this.programSlide?.program) {
          this.programSlide = {
            ...this.programSlide,
            program: { ...this.programSlide.program, pillars: slidePillars },
          };
        }
        this.cdr.markForCheck();

        if (climateProgramID > 0) {
         // this.loadProgramPillarScores(climateProgramID);
        }

        const headerProgramName = data.program?.programName ?? program?.programName ?? 'Program';
        const headerLocation = data.program?.location ?? program?.location ?? '';
        const headerYear = data.program?.dataYear ?? program?.year ?? null;

        this.sliderItems = [
          {
            title: headerProgramName,
            headerMeta: this.formatProgramHeaderMeta(headerLocation, headerYear),
           }
        ];

        this.currentSlide = 0;
        this.startSlider();
        this.cdr.markForCheck();
      },
      error: () => {
        this.programSlide = null;
        this.programPillarScores.set([]);
        this.sliderItems = [];
        this.cdr.markForCheck();
      },
    });
  }

  private loadProgramPillarScores(climateProgramID: number): void {
    this.programPillarsLoading.set(true);
    this.cdr.markForCheck();

    this.chatService.getProgramPillarScores(climateProgramID).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.programPillarsLoading.set(false);
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: res => {
        const pillars = res?.result?.pillars ?? [];
        const mapped = pillars
          .map(p => ({
            pillarID: p.pillarID,
            pillarName: p.pillarName,
            imagePath: p.imagePath ?? '',
            pillarScore: p.aiScore ?? 0,
            displayOrder: p.displayOrder ?? 0,
          }))
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        this.programPillarScores.set(mapped);

        const existing = this.normalizeSlidePillars(this.programSlide?.program?.pillars);
        const merged = existing.length ? existing : mapped;

        if (merged.length && this.programSlide?.program) {
          this.programSlide = {
            ...this.programSlide,
            program: { ...this.programSlide.program, pillars: merged },
          };
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.programPillarScores.set([]);
        this.cdr.markForCheck();
      },
    });
  }

  private normalizeSlidePillars(
    pillars: PillarsUserHistroyResponseDto[] | null | undefined
  ): PillarsUserHistroyResponseDto[] {
    if (!Array.isArray(pillars) || !pillars.length) return [];
    return [...pillars]
      .map(p => ({
        pillarID: p.pillarID ?? (p as any).PillarID,
        pillarName: p.pillarName ?? (p as any).PillarName ?? '',
        imagePath: p.imagePath ?? (p as any).ImagePath ?? '',
        pillarScore: p.pillarScore ?? (p as any).PillarScore ?? null,
        displayOrder: p.displayOrder ?? (p as any).DisplayOrder ?? 0,
      }))
      .filter(p => p.pillarID != null)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.stopPromptRotation();
  }

  protected engineStatusLabel(): string {
    if (this.isTyping()) return 'Processing Intelligence';
    if (this.hasContext()) return 'Context locked';
    return 'Engine ready';
  }

  // ─── Toggle & Close ───────────────────────────────────────────────────────
  toggleChat(): void { this.chatService.toggleOpen(); }
  closeChat(): void { this.chatService.closeChat(); }

  // ─── Send ─────────────────────────────────────────────────────────────────
  sendMessage(): void {

    const text = this.inputText().trim();
    if (!text || this.isTyping()) return;

    this.inputText.set('');
    this.showSuggestions.set(false);
    this.suggestions.set([]);

    this.chatService
      .sendMessage(text)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.scrollToBottom(); this.cdr.markForCheck(); },
        complete: () => { this.scrollToBottom(); this.cdr.markForCheck(); },
        error: () => this.cdr.markForCheck(),
      });
  }

  // ─── Send ─────────────────────────────────────────────────────────────────
  getProgramsCrossComparision(): void {

    this.inputText.set('');
    this.showSuggestions.set(false);
    this.suggestions.set([]);

    this.chatService
      .getProgramsCrossComparision()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.scrollToBottom(); this.cdr.markForCheck(); },
        complete: () => { this.scrollToBottom(); this.cdr.markForCheck(); },
        error: () => this.cdr.markForCheck(),
      });
  }

  trackQuickQuestion(_index: number, item: { label: string }): string {
    return item.label;
  }

  sendQuickQuestion(text: string): void {
    if (this.isTyping()) return;
    this.inputText.set('');
    this.chatService
      .sendMessage(text)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.scrollToBottom(); this.cdr.markForCheck(); },
        complete: () => this.cdr.markForCheck(),
        error: () => this.cdr.markForCheck(),
      });
  }

  selectSuggestion(q: AIAssistantFAQDto): void {
    this.inputText.set(q.questionText);
    this.chatService.selectedfaq.set(q);

    this.showSuggestions.set(false);
    this.suggestions.set([]);
    setTimeout(() => this.sendMessage(), 50);
  }

  // ─── Input events ─────────────────────────────────────────────────────────
  onInputChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputText.set(value);
    this.chatService.selectedfaq.set(null);
    if (value.trim().length >= 2) {
      const filtered = this.chatService.filterQuestions(value);
      this.suggestions.set(filtered);
      this.showSuggestions.set(filtered.length > 0);
    } else {
      this.suggestions.set([]);
      this.showSuggestions.set(false);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
    if (event.key === 'Escape') {
      this.showSuggestions.set(false);
    }
  }

  closeSuggestions(): void {
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  // ─── Context panel ────────────────────────────────────────────────────────
  toggleContextPanel(): void { this.showContextPanel.update(v => !v); }


  onPillarChange(pillar: PillarsVM | null): void {
    this.chatService.selectedPillar.set(pillar ?? null);
  }

  clearContext(): void {
    this.chatService.selectedProgram.set(null);
    this.chatService.selectedPillar.set(null);
    this.chatService.selectedfaq.set(null);
  }

  clearHistory(): void { this.chatService.clearHistory(); }

  // ─── Scroll ───────────────────────────────────────────────────────────────
  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  // ─── Template helpers ─────────────────────────────────────────────────────
  trackById(_: number, msg: ChatMessage): string {
    return msg.id;
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  /** Pillars from program slide, AI scores, or global pillar catalog. */
  get sidebarPillars(): PillarsUserHistroyResponseDto[] {
    const fromSlide = this.normalizeSlidePillars(this.programSlide?.program?.pillars);
    if (fromSlide.length) return fromSlide;

    const fromScores = this.programPillarScores();
    if (fromScores.length) return fromScores;

    const global = this.chatService.pillars.value ?? [];
    if (global.length) {
      return global.map(p => ({
        pillarID: p.pillarID,
        pillarName: p.pillarName,
        imagePath: p.imagePath ?? '',
        pillarScore: 0,
        displayOrder: p.displayOrder ?? 0,
      }));
    }
    return [];
  }

  /** Pillar options for the header selector (program-scoped). */
  get programPillarSelectOptions(): PillarsVM[] {
    const pillars = this.sidebarPillars;
    if (pillars.length) {
      return pillars.map(p => ({
        pillarID: p.pillarID,
        pillarName: p.pillarName,
        description: '',
        displayOrder: p.displayOrder ?? 0,
        weight: 0,
        reliability: true,
        imagePath: p.imagePath,
      }));
    }
    return this.chatService.pillars.value ?? [];
  }

  protected pillarsPanelLoading(): boolean {
    return this.programSlidesLoading() || this.programPillarsLoading();
  }

  /** 0–100 peace index → VCP pillar palette (higher = more peaceful). */
  scoreToColor(value: number | null | undefined): string {
    const colors = this.commonService.PillarColors;
    if (value == null || isNaN(Number(value))) return '#E0E0E0';
    const v = Math.min(100, Math.max(0, Number(value)));
    if (v >= 90) return colors[0];
    if (v >= 80) return colors[1];
    if (v >= 70) return colors[2];
    if (v >= 60) return colors[3];
    if (v >= 50) return colors[4];
    if (v >= 40) return colors[5];
    if (v >= 30) return colors[6];
    if (v >= 20) return colors[7];
    if (v >= 10) return colors[8];
    return colors[9];
  }

  /** Pillar score 0–100 → bar / image accent color. */
  pillarScoreColor(score: number | null | undefined): string {
    return this.scoreToColor(this.normalizePillarScore(score));
  }

  pillarBarWidth(score: number | null | undefined): string {
    const pct = this.normalizePillarScore(score);
    if (pct == null) return '0%';
    return `${Math.max(0, pct)}%`;
  }

  private normalizePillarScore(score: number | null | undefined): number | null {
    if (score == null || isNaN(Number(score))) return null;
    return Math.min(100, Math.max(0, Number(score)));
  }

  /** Show tooltip when label is shortened by word limit or likely clipped in the sidebar. */
  shouldShowPillarNameTooltip(name: string | null | undefined, maxWords = 3): boolean {
    if (!name?.trim()) return false;
    const trimmed = name.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);

    if (words.length > maxWords) return true;

    // Narrow KEY PILLARS column still clips multi-word names via line-clamp.
    if (words.length >= 3) return true;

    return trimmed.length > 24;
  }

  peaceLevelLabel(score: number | null | undefined): string {
    if (score == null || isNaN(Number(score))) return '—';
    const v = Number(score);
    if (v >= 80) return 'Very High';
    if (v >= 60) return 'High ';
    if (v >= 40) return 'Moderate ';
    if (v >= 20) return 'Low ';
    return 'Very Low ';
  }

  rankPeaceIndex(rank: number | null | undefined, total: number | null | undefined): number {
    if (!rank || !total) return 50;
    return Math.min(100, Math.max(0, ((total - rank) / total) * 100));
  }

  trendChartColor(trend: string | null | undefined): string {
    if (!trend) return '#94a3b8';
    const t = trend.toLowerCase().trim();
    if (t.includes('improv') || t.startsWith('+') || t.includes('↑') || t.includes('up')) {
      return '#53c341';
    }
    if (t.includes('declin') || t.startsWith('-') || t.includes('↓') || t.includes('down') || t.includes('worsen')) {
      return '#ef4444';
    }
    return '#64748b';
  }

  trackPillarId(_: number, p: PillarsUserHistroyResponseDto): number {
    return p.pillarID;
  }

  protected glanceScoreLabel(): string {
    return this.selectedProgram() ? 'Health Score' : 'Average Score';
  }

  protected glanceRankLabel(): string {
    return 'Location Rank';
  }

  formatGlanceScore(score: number | null | undefined): string {
    if (score == null || isNaN(Number(score))) return '—';
    return Number(score).toFixed(1);
  }

  trendAccentColor(color: string | null | undefined): string {
    const map: Record<string, string> = {
      green: '#53c341',
      yellow: '#eab308',
      orange: '#f97316',
      red: '#ef4444',
      blue: '#3b82f6',
    };
    return map[(color ?? '').toLowerCase()] ?? '#A8E063';
  }

  loadPillarLiveSignals(): void {
    this.pillarLiveSignalsLoading.set(true);
    this.pillarLiveSignalsError.set(null);
    this.cdr.markForCheck();

    this.chatService.getPillarLiveSignals().pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.pillarLiveSignalsLoading.set(false);
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: res => {
        const payload = res?.succeeded ? res.result : null;
        const pillars = payload?.pillars?.filter(p => p?.pillarId && p?.sourceUrl) ?? [];

        if (!payload || pillars.length < 1) {
          this.pillarLiveSignals.set(null);
          this.pillarLiveSignalsError.set(
            res?.errors?.[0] ?? 'Unable to load pillar signals right now.'
          );
          return;
        }

        this.pillarLiveSignals.set({ ...payload, pillars });
        this.selectedPillarSignalId.set(pillars[0]?.pillarId ?? null);
        this.pillarLiveSignalsError.set(null);
        this.cdr.markForCheck();
      },
      error: () => {
        this.pillarLiveSignals.set(null);
        this.pillarLiveSignalsError.set('Unable to load pillar signals. Please try again.');
        this.cdr.markForCheck();
      },
    });
  }

  retryPillarLiveSignals(): void {
    this.loadPillarLiveSignals();
  }

  selectPillarSignal(card: PillarLiveSignalCard): void {
    this.selectedPillarSignalId.set(card.pillarId);
    this.cdr.markForCheck();
  }

  isPillarSignalSelected(card: PillarLiveSignalCard): boolean {
    return this.selectedPillarSignalId() === card.pillarId;
  }

  trackPillarSignal(_: number, card: PillarLiveSignalCard): number {
    return card.pillarId;
  }

  pillarSignalLabel(card: PillarLiveSignalCard): string {
    return card.pillarName ?? `Pillar ${card.pillarId}`;
  }

  formatTrendUpdatedAt(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  /** Search both program name and alias (also used as a fallback for pillar name) */
  customSearchFn(term: string, item: any): boolean {
    const t = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(t) ||
      item.programAliasName?.toLowerCase().includes(t) ||
      item.region?.toLowerCase().includes(t) ||
      item.pillarName?.toLowerCase().includes(t) ||
      false
    );
  }


  getTrendLabel(item: any): string {
    return item?.trend;
  }

  formatProgramHeaderMeta(
    location: string | null | undefined,
    year: number | string | null | undefined
  ): string {
    const segments: string[] = [];
    const safeLocation = location?.toString().trim();
    const safeYear = year?.toString().trim();

    if (safeLocation) segments.push(safeLocation);
    if (safeYear) segments.push(safeYear);

    return segments.join(' • ');
  }

  get activeAnalysisSlide(): { title?: string; subtitle?: string; trend?: string } | null {
    return this.sliderItems[this.currentSlide] ?? null;
  }

  openFullAnalysis(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (!this.activeAnalysisSlide?.subtitle?.trim()) return;
    this.analysisModalOpen.set(true);
    this.cdr.markForCheck();
  }

  closeFullAnalysis(): void {
    this.analysisModalOpen.set(false);
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.analysisModalOpen()) {
      this.closeFullAnalysis();
    }
  }

  navigateAnalysisInModal(delta: number, event?: Event): void {
    event?.stopPropagation();
    const len = this.sliderItems.length;
    if (len < 2) return;
    this.currentSlide = (this.currentSlide + delta + len) % len;
    this.cdr.markForCheck();
  }


  startSlider(): void {

    clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {

      // remove animation class
      this.animate = false;

      this.cdr.detectChanges();

      setTimeout(() => {

        // next slide
        this.currentSlide =
          (this.currentSlide + 1) % this.sliderItems.length;

        // trigger slide animation
        this.animate = true;

        this.cdr.detectChanges();

        // remove class again after animation
        setTimeout(() => {
          this.animate = false;
          this.cdr.detectChanges();
        }, 700);

      }, 50);

    }, 8000);
  }

  nextSlide(): void {

    this.animate = false;

    this.cdr.detectChanges();

    setTimeout(() => {

      this.currentSlide =
        (this.currentSlide + 1) % this.sliderItems.length;

      this.animate = true;

      this.cdr.detectChanges();

      setTimeout(() => {
        this.animate = false;
        this.cdr.detectChanges();
      }, 700);

    }, 50);

    this.startSlider();
  }

  prevSlide(): void {

    this.animate = false;

    this.cdr.detectChanges();

    setTimeout(() => {

      this.currentSlide =
        (this.currentSlide - 1 + this.sliderItems.length)
        % this.sliderItems.length;

      this.animate = true;

      this.cdr.detectChanges();

      setTimeout(() => {
        this.animate = false;
        this.cdr.detectChanges();
      }, 700);

    }, 50);

    this.startSlider();
  }

  goToSlide(index: number): void {

    if (index === this.currentSlide) {
      return;
    }

    this.animate = false;

    this.cdr.detectChanges();

    setTimeout(() => {

      this.currentSlide = index;

      this.animate = true;

      this.cdr.detectChanges();

      setTimeout(() => {

        this.animate = false;

        this.cdr.detectChanges();

      }, 700);

    }, 50);

    this.startSlider();
  }

  toggleSlide(): void {
    this.isExpanded = !this.isExpanded;
  }

  private startPromptRotation(): void {
    this.stopPromptRotation();
    this.promptRotateId = setInterval(() => this.advanceRotatingText('headline'), 5200);
    this.placeholderRotateId = setInterval(() => this.advanceRotatingText('placeholder'), 4800);
  }

  private stopPromptRotation(): void {
    if (this.promptRotateId) clearInterval(this.promptRotateId);
    if (this.placeholderRotateId) clearInterval(this.placeholderRotateId);
    this.promptRotateId = undefined;
    this.placeholderRotateId = undefined;
  }

  private advanceRotatingText(kind: 'headline' | 'placeholder'): void {
    if (kind === 'headline') {
      this.promptAnimating.set(true);
      setTimeout(() => {
        const next = (this.rotatingIndex() + 1) % this.rotatingHeadlines.length;
        this.rotatingIndex.set(next);
        this.promptAnimating.set(false);
        this.cdr.markForCheck();
      }, 320);
    } else if (!this.inputText().trim()) {
      this.placeholderAnimating.set(true);
      setTimeout(() => {
        const next = (this.placeholderIndex() + 1) % this.rotatingPlaceholders.length;
        this.placeholderIndex.set(next);
        this.placeholderAnimating.set(false);
        this.cdr.markForCheck();
      }, 280);
    }
  }

  getOrdinalSuffix(rank?: number): string {

    if (!rank) return '';

    const j = rank % 10;
    const k = rank % 100;

    if (j === 1 && k !== 11) {
      return 'st';
    }

    if (j === 2 && k !== 12) {
      return 'nd';
    }

    if (j === 3 && k !== 13) {
      return 'rd';
    }

    return 'th';
  }

}