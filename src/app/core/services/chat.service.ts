import { computed, Injectable, signal } from '@angular/core';
import { Observable, interval, Subject, takeUntil, BehaviorSubject, map, Subscription } from 'rxjs';
import {
  ChatMessage,
  ChatResponseDto,
  ProgramChatRequestDto,
  CrossComparisionChatRequestDto,
  GlobalChatRequestDto
} from '../models/chat/ChatMessage';
import { UserService } from './user.service';
import { ProgramVM } from '../models/ProgramVM';
import { PillarsVM } from '../models/PillersVM';
import { HttpService } from '../http/http.service';
import { ToasterService } from './toaster.service';
import { ResultResponseDto } from '../models/ResultResponseDto';
import { AIAssistantFAQDto } from '../models/chat/AIAssistantFAQDto';
import { UserRole } from '../enums/UserRole';
import { ChatProgramExecutiveSlidesResponse, ProgramExecutiveSlidesResult } from '../models/chat/ChatProgramExecutiveSlidesResponse';
import { ChatEmergingTrendsResponse } from '../models/chat/EmergingTrendsResponse';
import { PillarLiveSignalsResult } from '../models/chat/PillarLiveSignalsResponse';
import { AiProgramPillarResponseDto } from '../models/aiVm/AiProgramPillarResponseDto';

@Injectable({ providedIn: 'root' })
export class ChatService {

  // ─── State ────────────────────────────────────────────────────────────────
  isOpen = signal(false);
  isTyping = signal(false);
  selectedProgram = signal<ProgramVM | null>(null);
  selectedPillar = signal<PillarsVM | null>(null);
  selectedfaq = signal<AIAssistantFAQDto | null>(null);
  messages = signal<ChatMessage[]>([]);
  programs = new BehaviorSubject<ProgramVM[]>([]);
  pillars = new BehaviorSubject<PillarsVM[]>([]);
  faqs = new BehaviorSubject<AIAssistantFAQDto[]>([]);
  crossComparisionprogramIDs = new BehaviorSubject<number[]>([]);
  quickQuestions = computed(() => this.selectedProgram() ? this.ProgramQuickQuestions : this.globalQuickQuestions)

  // ─── Cancellation tokens ──────────────────────────────────────────────────
  /**
   * Emitting on cancelStream$ stops an active typewriter interval via takeUntil.
   * A new Subject is created per sendMessage() call so old ones don't interfere.
   */
  private cancelStream$ = new Subject<void>();

  /**
   * Holds the active HTTP subscription so it can be aborted before the API
   * responds (the "API in flight" path in the cancel flow).
   */
  private activeRequest$: Subscription | null = null;

  /**
   * Keeps the full text that the backend returned so that stopGeneration()
   * can flush it instantly instead of discarding the answer.
   */
  private pendingFullText = '';
  private pendingAssistantId = '';

  private readonly welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: '',
    timestamp: new Date(),
  };

  constructor(
    private http: HttpService,
    private userService: UserService,
    private toaster: ToasterService,
  ) {
    this.messages.set([this.welcomeMessage]);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  openWithContext(program?: ProgramVM, pillar?: PillarsVM): void {
    if (program) this.selectedProgram.set(program);
    if (pillar) this.selectedPillar.set(pillar);
    this.isOpen.set(true);
  }

  toggleOpen(): void { this.isOpen.update(v => !v); }
  closeChat(): void { this.isOpen.set(false); }

  clearHistory(): void { this.messages.set([this.welcomeMessage]); }

  /**
   * Stop any active generation immediately.
   *
   * Two cases handled:
   *  1. API still in flight → abort the HTTP request, show a cancelled notice.
   *  2. Typewriter animation running → flush the full response text instantly.
   */
  stopGeneration(): void {
    if (!this.isTyping()) return;

    if (this.activeRequest$ && !this.activeRequest$.closed) {
      // ── Case 1: API hasn't responded yet ──────────────────────────────────
      this.activeRequest$.unsubscribe();
      this.activeRequest$ = null;

      this.updateAssistantMessage(
        this.pendingAssistantId,
        '_Stopped._',
        false,
      );
      this.finalizeMessage(this.pendingAssistantId);
      this.isTyping.set(false);
    } else {
      // ── Case 2: Typewriter animation is running ───────────────────────────
      // Emit cancel so takeUntil inside typewriterStream() tears down the interval.
      this.cancelStream$.next();

      // Flush whatever text the backend returned (already stored in pendingFullText).
      if (this.pendingAssistantId) {
        this.updateAssistantMessage(this.pendingAssistantId, this.pendingFullText, false);
        this.finalizeMessage(this.pendingAssistantId);
      }
      this.isTyping.set(false);
    }

    // Reset pending state
    this.pendingFullText = '';
    this.pendingAssistantId = '';
  }

  /** Return top-4 predefined question matches for a user query. */
  filterQuestions(query: string): AIAssistantFAQDto[] {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    if (this.selectedProgram()) {
      return this.faqs.value
        .filter(pq => pq.questionText.toLowerCase().includes(q) && !pq.related.includes('global'))
      //.slice(0, 4);
    } else {
      return this.faqs.value
        .filter(pq => pq.questionText.toLowerCase().includes(q) && pq.related.includes('global'))
      //.slice(0, 4);
    }
  }

  /**
   * Send a user message and return an Observable that emits growing streamed text.
   *
   * Calling this while a previous message is still generating will automatically
   * call stopGeneration() first, so the UI never has two concurrent streams.
   */
  sendMessage(userText: string): Observable<string> {
    // Auto-cancel any in-progress generation before starting a new one.
    if (this.isTyping()) {
      this.stopGeneration();
    }

    // New cancel token per message
    this.cancelStream$ = new Subject<void>();

    const program = this.selectedProgram();
    const pillar = this.selectedPillar();

    const histories = this.messages()
      .slice(1)
      .slice(-3)
      .map(msg => {
        const content =
          msg.content.length > 200
            ? msg.content.substring(0, 150) + '...'
            : msg.content;

        return `${msg.role}: ${content}`;
      }).join('\n');

    // Add user message
    const userMsg: ChatMessage = {
      id: this.uid(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    this.messages.update(msgs => [...msgs, userMsg]);
    this.isTyping.set(true);

    return new Observable<string>(observer => {
      const assistantId = this.uid();
      this.pendingAssistantId = assistantId;

      const placeholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      this.messages.update(msgs => [...msgs, placeholder]);

      if (program) {
        const payload: ProgramChatRequestDto = {
          climateProgramID: program.climateProgramID,
          pillarID: pillar?.pillarID ?? 0,
          questionText: userText,
          fAQID: this.selectedfaq()?.faqid,
          historyText: histories,
        };

        this.activeRequest$ = this.askAboutProgram(payload).subscribe({
          next: res => {
            this.activeRequest$ = null; // HTTP done; typewriter phase begins

            if (res.succeeded) {
              const fullText = res.result?.responseText ?? '';
              this.pendingFullText = fullText;
              this.typewriterStream(fullText, assistantId, observer);
            } else {
              this.handleError(assistantId, observer, res.errors?.join(', ') ?? 'Unknown error');
            }
          },
          error: () => {
            this.activeRequest$ = null;
            this.handleError(assistantId, observer, 'Request failed. Please try again.');
          },
        });
      } else {
        const payload: GlobalChatRequestDto = {
          questionText: userText,
          fAQID: this.selectedfaq()?.faqid,
          historyText: histories,
        };

        this.activeRequest$ = this.askGlobalQuestion(payload).subscribe({
          next: res => {
            this.activeRequest$ = null; // HTTP done; typewriter phase begins

            if (res.succeeded) {
              const fullText = res.result?.responseText ?? '';
              this.pendingFullText = fullText;
              this.typewriterStream(fullText, assistantId, observer);
            } else {
              this.handleError(assistantId, observer, res.errors?.join(', ') ?? 'Unknown error');
            }
          },
          error: () => {
            this.activeRequest$ = null;
            this.handleError(assistantId, observer, 'Request failed. Please try again.');
          },
        });
      }
    });
  }

  // ─── Data fetches ─────────────────────────────────────────────────────────

  getFAQDs(): void {
    if (this.faqs.value.length > 0) return;
    this.getAssistantFAQDs().subscribe({
      next: res => this.faqs.next(res.result ?? []),
    });
  }

  getAllPrograms(): void {
    if (this.programs.value.length > 0) return;
    this.getAllProgramsByUserId(this.userService?.userInfo?.userID).subscribe({
      next: res => this.programs.next(res.result ?? []),
    });
  }

  getPillars(): void {
    if (this.pillars.value.length > 0) return;
    this.getAllPillars().subscribe({
      next: res => this.pillars.next(res ?? []),
    });
  }

  getProgramsCrossComparision() {
    let userText = "Provide a detailed comparative analysis of the selected programs across all VCP pillars, including key risks, opportunities, structural vulnerabilities, resilience indicators, emerging trends, and strategic observations for each pillar."

    if (this.isTyping()) {
      this.stopGeneration();
    }

    this.cancelStream$ = new Subject<void>();

    const histories = this.messages()
      .slice(1)
      .slice(-3)
      .map(msg => {
        const content =
          msg.content.length > 200
            ? msg.content.substring(0, 200) + '...'
            : msg.content;

        return `${msg.role}: ${content}`;
      }).join('\n');

    // Add user message
    const userMsg: ChatMessage = {
      id: this.uid(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    this.messages.update(msgs => [...msgs, userMsg]);
    this.isTyping.set(true);

    return new Observable<string>(observer => {
      const assistantId = this.uid();
      this.pendingAssistantId = assistantId;

      const placeholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      this.messages.update(msgs => [...msgs, placeholder]);

      if (this.crossComparisionprogramIDs.value.length > 0) {
        const payload: CrossComparisionChatRequestDto = {
          climateProgramIDs: this.crossComparisionprogramIDs.value,
          questionText: userText,
          historyText: histories,
        };

        this.activeRequest$ = this.crossComparisionquestion(payload).subscribe({
          next: res => {
            this.activeRequest$ = null; // HTTP done; typewriter phase begins

            if (res.succeeded) {
              const fullText = res.result?.responseText ?? '';
              this.pendingFullText = fullText;
              this.typewriterStream(fullText, assistantId, observer);
              this.crossComparisionprogramIDs.next([]);
            } else {
              this.handleError(assistantId, observer, res.errors?.join(', ') ?? 'Unknown error');
            }
          },
          error: () => {
            this.activeRequest$ = null;
            this.handleError(assistantId, observer, 'Request failed. Please try again.');
          },
        });
      }
    });
  }


  // ─── Private helpers ──────────────────────────────────────────────────────

  private typewriterStream(
    fullText: string,
    assistantId: string,
    observer: { next(v: string): void; complete(): void },
  ): void {
    let i = 0;
    const speed = 8; // ms per character

    interval(speed)
      .pipe(takeUntil(this.cancelStream$)) // ← torn down by stopGeneration()
      .subscribe({
        next: () => {
          i++;
          const chunk = fullText.substring(0, i);
          this.updateAssistantMessage(assistantId, chunk, true);
          observer.next(chunk);

          if (i >= fullText.length) {
            this.cancelStream$.next();   // self-complete
            this.finalizeMessage(assistantId);
            this.isTyping.set(false);
            this.pendingFullText = '';
            this.pendingAssistantId = '';
            observer.complete();
          }
        },
      });
  }

  private handleError(
    assistantId: string,
    observer: { next(v: string): void; complete(): void },
    message: string,
  ): void {
    this.toaster.showError(message);
    this.updateAssistantMessage(assistantId, `⚠️ ${message}`, false);
    this.finalizeMessage(assistantId);
    this.isTyping.set(false);
    this.pendingFullText = '';
    this.pendingAssistantId = '';
    observer.complete();
  }

  private updateAssistantMessage(id: string, content: string, isStreaming: boolean): void {
    this.messages.update(msgs =>
      msgs.map(m => m.id === id ? { ...m, content, isStreaming } : m)
    );
  }

  private finalizeMessage(id: string): void {
    this.messages.update(msgs =>
      msgs.map(m => m.id === id ? { ...m, isStreaming: false } : m)
    );
  }

  private uid(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }


  // ─── HTTP ─────────────────────────────────────────────────────────────────

  getProgramSlides(climateProgramID: number): Observable<ResultResponseDto<ChatProgramExecutiveSlidesResponse>> {

    return this.http.post<ResultResponseDto<ChatProgramExecutiveSlidesResponse>>(
      `Chat/ProgramSlides`,
      climateProgramID as any
    );
  }

  getProgramPillarScores(climateProgramID: number): Observable<ResultResponseDto<AiProgramPillarResponseDto>> {
    const payload = { climateProgramID };
    const url = this.userService.userInfo.role === UserRole.ProgramUser
      ? 'Client/getAIProgramPillars'
      : 'AiComputation/getAIProgramPillars';
    return this.http
      .getWithQueryParams(url, payload)
      .pipe(map(x => x as ResultResponseDto<AiProgramPillarResponseDto>));
  }

  /** Normalize ProgramSlides API payloads (direct or nested result). */
  unwrapProgramSlides(
    res: ResultResponseDto<ChatProgramExecutiveSlidesResponse> | null | undefined
  ): ProgramExecutiveSlidesResult | null {
    const outer = res?.result;
    if (!outer) return null;
    if ('program' in outer && outer.program) {
      return outer as unknown as ProgramExecutiveSlidesResult;
    }
    return (outer as ChatProgramExecutiveSlidesResponse)?.result ?? null;
  }

  getEmergingTrendsAndIssues(ProgramCount = 6): Observable<ResultResponseDto<ChatEmergingTrendsResponse>> {
    return this.http
      .getWithQueryParams('Public/emergingTrendsAndIssues', { ProgramCount })
      .pipe(map(x => x as ResultResponseDto<ChatEmergingTrendsResponse>));
  }

  getPillarLiveSignals(): Observable<ResultResponseDto<PillarLiveSignalsResult>> {
    return this.http
      .get('Public/pillarLiveSignals')
      .pipe(map(x => x as ResultResponseDto<PillarLiveSignalsResult>));
  }

  private getAllProgramsByUserId(userId: number) {
    let url = this.userService.userInfo.role == UserRole.ProgramUser ? 'Client/getClientPrograms' : `Program/getAllProgramsByUserId/${userId}`;

    return this.http
      .get(url)
      .pipe(map(x => x as ResultResponseDto<ProgramVM[]>));
  }

  private getAllPillars() {
    let url = this.userService.userInfo.role == UserRole.ProgramUser ? 'Client/Pillars' : `Pillar/Pillars`;
    return this.http
      .get(url)
      .pipe(map(x => x as PillarsVM[]));
  }

  private getAssistantFAQDs() {
    return this.http
      .get('chat/getAssistantFAQDs')
      .pipe(map(x => x as ResultResponseDto<AIAssistantFAQDto[]>));
  }

  private askAboutProgram(request: ProgramChatRequestDto) {
    return this.http
      .post('chat/askAboutProgram', request)
      .pipe(map(x => x as ResultResponseDto<ChatResponseDto>));
  }

  private askGlobalQuestion(request: GlobalChatRequestDto) {
    return this.http
      .post('chat/askglobalQuestion', request)
      .pipe(map(x => x as ResultResponseDto<ChatResponseDto>));
  }
  private crossComparisionquestion(request: CrossComparisionChatRequestDto) {
    return this.http
      .post('chat/crossComparision', request)
      .pipe(map(x => x as ResultResponseDto<ChatResponseDto>));
  }

  // Questions for a single climate program
  ProgramQuickQuestions = [
    {
      label: 'Program summary',
      question: 'Summarize this climate program\'s overall score, confidence level, and recent performance trends.'
    },
    {
      label: 'Pillar performance',
      question: 'How are the VCP pillars performing for this program, and which pillars show the strongest or weakest scores?'
    },
    {
      label: 'Evidence gaps',
      question: 'What evidence gaps, data transparency issues, or assessment limitations exist for this program?'
    },
    {
      label: 'Red flags',
      question: 'What red flags, stress-test vulnerabilities, or governance risks are identified for this climate program?'
    },
    {
      label: 'Mitigation & adaptation',
      question: 'What does the assessment of this program reveal about its mitigation ambition and adaptation readiness?'
    },
    {
      label: 'Recommendations',
      question: 'What strategic recommendations would improve this program\'s climate governance and pillar outcomes?'
    },
    {
      label: 'Cross-pillar patterns',
      question: 'What cross-pillar patterns, dependencies, or discrepancies stand out in this program\'s assessment?'
    }
  ];

  // Questions for all programs globally
  globalQuickQuestions = [
    {
      label: 'Portfolio overview',
      question: 'Provide an overview of climate program performance and scores across all programs in the portfolio.'
    },
    {
      label: 'Top performers',
      question: 'Which climate programs show the strongest overall scores and pillar performance recently?'
    },
    {
      label: 'At-risk programs',
      question: 'Which programs face the highest climate governance, resilience, or implementation risks?'
    },
    {
      label: 'Compare programs',
      question: 'Compare key pillar scores and risk indicators across the leading climate programs in the portfolio.'
    },
    {
      label: 'Mitigation leaders',
      question: 'Which programs demonstrate the strongest mitigation ambition and delivery progress?'
    },
    {
      label: 'Adaptation gaps',
      question: 'Where are the largest adaptation and resilience gaps across programs globally?'
    }
  ];
}