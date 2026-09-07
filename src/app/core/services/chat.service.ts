import { computed, Injectable, signal } from '@angular/core';
import { Observable, interval, Subject, takeUntil, BehaviorSubject, map, Subscription } from 'rxjs';
import {
  ChatMessage,
  ChatResponseDto,
  CountryChatRequestDto,
  CrossComparisionChatRequestDto,
  GlobalChatRequestDto
} from '../models/chat/ChatMessage';
import { UserService } from './user.service';
import { CountryVM } from '../models/CountryVM';
import { PillarsVM } from '../models/PillersVM';
import { HttpService } from '../http/http.service';
import { ToasterService } from './toaster.service';
import { ResultResponseDto } from '../models/ResultResponseDto';
import { AIAssistantFAQDto } from '../models/chat/AIAssistantFAQDto';
import { UserRole } from '../enums/UserRole';
import { ChatCountryExecutiveSlidesResponse } from '../models/chat/ChatCountryExecutiveSlidesResponse';
import { ChatEmergingTrendsResponse } from '../models/chat/EmergingTrendsResponse';
import { PillarLiveSignalsResult } from '../models/chat/PillarLiveSignalsResponse';

@Injectable({ providedIn: 'root' })
export class ChatService {

  // ─── State ────────────────────────────────────────────────────────────────
  isOpen = signal(false);
  isTyping = signal(false);
  selectedCountry = signal<CountryVM | null>(null);
  selectedPillar = signal<PillarsVM | null>(null);
  selectedfaq = signal<AIAssistantFAQDto | null>(null);
  messages = signal<ChatMessage[]>([]);

  countries = new BehaviorSubject<CountryVM[]>([]);
  pillars = new BehaviorSubject<PillarsVM[]>([]);
  faqs = new BehaviorSubject<AIAssistantFAQDto[]>([]);

  crossComparisionCountryIDs = new BehaviorSubject<number[]>([]);

  quickQuestions = computed(() => this.selectedCountry() ? this.countryQuickQuestions : this.globalQuickQuestions)

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

  openWithContext(country?: CountryVM, pillar?: PillarsVM): void {
    if (country) this.selectedCountry.set(country);
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
    if (this.selectedCountry()) {
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

    const country = this.selectedCountry();
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

      if (country) {
        const payload: CountryChatRequestDto = {
          countryID: country.countryID,
          pillarID: pillar?.pillarID ?? 0,
          questionText: userText,
          fAQID: this.selectedfaq()?.faqid,
          historyText: histories,
        };

        this.activeRequest$ = this.askAboutCountry(payload).subscribe({
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

  getAllCountries(): void {
    if (this.countries.value.length > 0) return;
    this.getAllCountriesByUserId(this.userService?.userInfo?.userID).subscribe({
      next: res => this.countries.next(res.result ?? []),
    });
  }

  getPillars(): void {
    if (this.pillars.value.length > 0) return;
    this.getAllPillars().subscribe({
      next: res => this.pillars.next(res ?? []),
    });
  }

  getContriesCrossComparision() {
    let userText = "Provide a comprehensive comparative analysis of the selected countries across all HS pillars, highlighting healthcare performance, key market challenges, strengths, structural vulnerabilities, resilience indicators, emerging public market trends, and strategic recommendations for each pillar."

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

      if (this.crossComparisionCountryIDs.value.length > 0) {
        const payload: CrossComparisionChatRequestDto = {
          countryIDs: this.crossComparisionCountryIDs.value,
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
              this.crossComparisionCountryIDs.next([]);
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

  getCountrySlides(countryId: number): Observable<ResultResponseDto<ChatCountryExecutiveSlidesResponse>> {

    return this.http.post<ResultResponseDto<ChatCountryExecutiveSlidesResponse>>(
      `Chat/countrySlides`,
      countryId as any
    );
  }

  getEmergingTrendsAndIssues(countryCount = 6): Observable<ResultResponseDto<ChatEmergingTrendsResponse>> {
    return this.http
      .getWithQueryParams('Public/emergingTrendsAndIssues', { countryCount })
      .pipe(map(x => x as ResultResponseDto<ChatEmergingTrendsResponse>));
  }

  getPillarLiveSignals(): Observable<ResultResponseDto<PillarLiveSignalsResult>> {
    return this.http
      .get('Public/pillarLiveSignals')
      .pipe(map(x => x as ResultResponseDto<PillarLiveSignalsResult>));
  }

  private getAllCountriesByUserId(userId: number) {
    let url = this.userService.userInfo.role == UserRole.CountryUser ? 'CountryUser/getCountryUserCountries' : `Country/getAllCountryByUserId/${userId}`;

    return this.http
      .get(url)
      .pipe(map(x => x as ResultResponseDto<CountryVM[]>));
  }

  private getAllPillars() {
    let url = this.userService.userInfo.role == UserRole.CountryUser ? 'CountryUser/Pillars' : `Pillar/Pillars`;
    return this.http
      .get(url)
      .pipe(map(x => x as PillarsVM[]));
  }

  private getAssistantFAQDs() {
    return this.http
      .get('chat/getAssistantFAQDs')
      .pipe(map(x => x as ResultResponseDto<AIAssistantFAQDto[]>));
  }

  private askAboutCountry(request: CountryChatRequestDto) {
    return this.http
      .post('chat/askAboutCountry', request)
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

  // Questions for a single country
  countryQuickQuestions = [
    {
      label: 'Market Summary',
      question: 'Summarize the current market situation, key challenges, and recent developments in this country.'
    },
    {
      label: 'Market Priorities',
      question: 'What are the major market priorities, economic initiatives, and development programs currently underway in this country?'
    },
    {
      label: 'Market Risks',
      question: 'What are the most significant market risks, economic challenges, supply disruptions, or other market concerns affecting this country?'
    },
    {
      label: 'Recommendations',
      question: 'What recommendations can strengthen market performance, economic resilience, investment opportunities, and overall market stability in this country?'
    },
    {
      label: 'Recent Improvements',
      question: 'What recent improvements have been observed in this country’s market performance, economic conditions, investment environment, or business climate?'
    },
    {
      label: 'Risk Factors',
      question: 'What are the key factors affecting market outcomes in this country, including infrastructure, investment, trade, funding, governance, or environmental challenges?'
    },
    {
      label: 'Market Trends',
      question: 'What are the latest market trends, emerging opportunities, economic developments, trade activities, and investment trends in this country?'
    }
  ];

  // Questions for all African countries

  globalQuickQuestions = [
    {
      label: 'Market Summary',
      question: 'Summarize the overall market situation across African countries over the past few days.'
    },
    {
      label: 'Market Leaders',
      question: 'Which African countries are demonstrating the strongest market performance, economic growth, investment activity, and business environment recently?'
    },
    {
      label: 'Market Risks',
      question: 'What are the major market risks, economic challenges, supply disruptions, and financial concerns currently affecting African countries?'
    },
    {
      label: 'Recommendations',
      question: 'What are the key recommendations for strengthening market performance, economic resilience, investment, trade, and business environments across Africa?'
    },
    {
      label: 'Improved Countries',
      question: 'Which African countries have shown the most significant improvements in market performance, economic conditions, investment, and business activity recently?'
    },
    {
      label: 'High-Risk Countries',
      question: 'Which African countries are currently facing the highest market risks due to economic instability, political uncertainty, weak infrastructure, supply disruptions, or other market challenges?'
    },
    {
      label: 'Market Trends',
      question: 'What are the latest market trends, emerging investment opportunities, economic developments, trade activities, and regional market developments across Africa?'
    }
  ];
}