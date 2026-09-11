import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgSelectDefaultsDirective } from 'src/app/shared/directives/ng-select-defaults.directive';
import { DashboardModeResponseDto, SignalCardDto } from 'src/app/core/models/CountrySignalDashboardDto';
import {
  DIAGNOSTIC_FAMILIES,
  DiagnosticFamily,
} from 'src/app/core/constants/relational-diagnostics.catalog';
import {
  GlanceBarChartOptions,
  GlanceDonutChartOptions,
  buildGlanceBarChartOptions,
  buildGlanceDonutChartOptions,
} from 'src/app/core/constants/dashboard-glance-charts.util';

declare var bootstrap: any;

export type DiagnosticsPanelMode = 'relational' | 'composite';

interface ScoredKpiCard {
  code: string;
  name: string;
  icon: string;
  measures: string;
  formula?: string;
  riskIndicator?: string;
  aiScore: number | null;
  manualScore: number | null;
  condition: string;
  aiCondition: string;
  manualCondition: string;
  aiDescriptor: string;
  manualDescriptor: string;
  signal: SignalCardDto;
}

@Component({
  selector: 'app-dashboard-diagnostics-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgSelectDefaultsDirective, NgApexchartsModule],
  templateUrl: './dashboard-diagnostics-panel.component.html',
  styleUrl: './dashboard-diagnostics-panel.component.css',
})
export class DashboardDiagnosticsPanelComponent implements OnChanges, OnDestroy {
  @Input() mode: DiagnosticsPanelMode = 'relational';
  @Input() countryName = 'Selected country';
  @Input() dashboard: DashboardModeResponseDto | null = null;
  @Input() loading = false;
  @Input() selectedFamilyId = 'A';
  @Input() showGlanceCharts = false;
  @Input() showManual = true;
  @Output() familyChange = new EventEmitter<string>();

  readonly families = DIAGNOSTIC_FAMILIES;
  selectedDetail: ScoredKpiCard | null = null;
  glanceBarChartOptions: Partial<GlanceBarChartOptions> | null = null;
  glanceDonutChartOptions: Partial<GlanceDonutChartOptions> | null = null;
  private readonly detailModalId = 'dashboardDiagnosticsDetailModal';

  constructor(private ngZone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dashboard'] || changes['showGlanceCharts']) {
      this.updateGlanceCharts();
    }
  }

  get selectedFamily(): DiagnosticFamily {
    return this.families.find((f) => f.id === this.selectedFamilyId) ?? this.families[0];
  }

  get familyRecords(): ScoredKpiCard[] {
    return this.kpiSignals.map((signal) => this.toCard(signal));
  }

  get compositeRecords(): ScoredKpiCard[] {
    return this.kpiSignals.map((signal) => this.toCard(signal));
  }

  get familyAverage(): number | null {
    return this.averageScore(this.familyRecords);
  }

  get compositeAverage(): number | null {
    return this.averageScore(this.compositeRecords);
  }

  formatScore(score: number | null | undefined): string {
    if (score === null || score === undefined || Number.isNaN(Number(score))) return 'NA';
    return Number(score).toFixed(1);
  }

  showScale(score: number | null | undefined): boolean {
    return score !== null && score !== undefined && !Number.isNaN(Number(score)) && Number(score) >= 0;
  }

  progress(score: number | null | undefined): number {
    if (score === null || score === undefined || Number.isNaN(Number(score))) return 0;
    return Math.max(0, Math.min(100, Math.abs(Number(score))));
  }

  statusTone(condition: string): string {
    const value = (condition || '').toLowerCase();
    if (
      value.includes('balanced') ||
      value.includes('strong') ||
      value.includes('coherent') ||
      value.includes('resilient') ||
      value.includes('stable') ||
      value.includes('functional')
    ) {
      return 'strong';
    }
    if (
      value.includes('developing') ||
      value.includes('strained') ||
      value.includes('watch') ||
      value.includes('moderate') ||
      value.includes('mixed')
    ) {
      return 'strained';
    }
    if (
      value.includes('critical') ||
      value.includes('weak') ||
      value.includes('collapse') ||
      value.includes('extreme') ||
      value.includes('fragile') ||
      value.includes('incoherent') ||
      value.includes('pariah') ||
      value.includes('client') ||
      value.includes('conflict')
    ) {
      return 'critical';
    }
    return 'none';
  }

  onFamilyChange(familyId: string): void {
    this.closeDetails();
    this.familyChange.emit(familyId || 'A');
  }

  openDetails(item: ScoredKpiCard, event?: Event): void {
    event?.stopPropagation();
    this.selectedDetail = item;
    setTimeout(() => this.showDetailModal(), 0);
  }

  closeDetails(): void {
    bootstrap.Modal.getInstance(this.getModalEl())?.hide();
  }

  ngOnDestroy(): void {
    const modalEl = this.getModalEl();
    modalEl?.removeEventListener('hidden.bs.modal', this.onModalHidden);
    bootstrap.Modal.getInstance(modalEl)?.dispose();
    this.removeStuckBackdrop();
    if (modalEl?.parentElement === document.body) {
      modalEl.remove();
    }
  }

  formatDate(value?: string | Date | null): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  }

  lastUpdatedLabel(value?: string | Date | null): string {
    if (!value) return 'Updated : N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Updated : N/A';
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Updated today';
    if (days === 1) return 'Updated 1 day ago';
    return `Updated ${days} days ago`;
  }

  private get allSignals(): SignalCardDto[] {
    const dashboard = this.dashboard;
    if (!dashboard) return [];
    const list = dashboard.signals ?? [];
    return [...list].sort((a, b) => Number(this.isAmi(b)) - Number(this.isAmi(a)));
  }

  private get kpiSignals(): SignalCardDto[] {
    return this.allSignals;
  }

  private isAmi(signal: SignalCardDto): boolean {
    return signal.layerID === 0 || (signal.layerCode || '').toUpperCase() === 'AMI';
  }

  private updateGlanceCharts(): void {
    if (!this.showGlanceCharts) {
      this.glanceBarChartOptions = null;
      this.glanceDonutChartOptions = null;
      return;
    }
    const signals = this.allSignals;
    this.glanceBarChartOptions = buildGlanceBarChartOptions(signals);
    this.glanceDonutChartOptions = buildGlanceDonutChartOptions(signals);
  }

  private averageScore(records: ScoredKpiCard[]): number | null {
    const scores = records
      .map((r) => (this.showManual ? r.aiScore ?? r.manualScore : r.aiScore))
      .filter((v): v is number => v !== null);
    if (!scores.length) return null;
    return scores.reduce((sum, v) => sum + v, 0) / scores.length;
  }

  private toCard(signal: SignalCardDto): ScoredKpiCard {
    const catalog = this.lookupCatalog(signal);
    const aiScore = this.toScore(signal.aiValue);
    const manualScore = this.toScore(signal.manualValue);
    const aiCondition = signal.aiCondition || signal.aiInterpretationValue || 'No Data';
    const manualCondition = signal.manualCondition || signal.manualInterpretationValue || 'No Data';
    return {
      code: this.isAmi(signal) ? 'AMI' : signal.code || signal.layerCode || catalog?.code || '',
      name: signal.name || signal.layerName || catalog?.name || 'Indicator',
      icon: this.isAmi(signal) ? 'bi-graph-up' : catalog?.icon || 'bi-broadcast',
      measures: catalog?.measures || signal.description || '',
      formula: catalog?.formula,
      riskIndicator: catalog?.riskIndicator,
      aiScore,
      manualScore,
      condition: aiCondition,
      aiCondition,
      manualCondition,
      aiDescriptor: signal.aiDescriptor || '',
      manualDescriptor: signal.manualDescriptor || '',
      signal,
    };
  }

  // getDisplayConditionClass(
  //   score: number | null | undefined,
  //   updatedAt: Date | string | null | undefined,
  //   question?: DashboardQuestionScoreDto,
  //   kind: 'ai' | 'manual' = 'ai'
  // ): string {
  //   if (this.hasScore(score) && this.isStaleUnverified(updatedAt)) return 'stale';
  //   if (question) {
  //     const condition = kind === 'manual' ? question.manualCondition : question.condition;
  //     if (condition) return this.getConditionClassFromLabel(condition);
  //   }
  //   return this.getConditionClass(score);
  // }
  
  private lookupCatalog(
    signal: SignalCardDto
  ): { code: string; name: string; icon: string; measures?: string; formula?: string; riskIndicator?: string } | undefined {
    const code = (signal.code || signal.layerCode || '').toUpperCase();
    const familyMatch = this.selectedFamily.diagnostics.find((item) => item.code.toUpperCase() === code);
    if (familyMatch) return { ...familyMatch, measures: familyMatch.measures };
    const all = this.families.flatMap((family) => family.diagnostics);
    return all.find((item) => item.code.toUpperCase() === code);
  }

  private toScore(value: number | null | undefined): number | null {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
    return Number(value);
  }

  private showDetailModal(): void {
    const modalEl = this.getModalEl();
    if (!modalEl) return;
    this.removeStuckBackdrop();
    if (modalEl.parentElement !== document.body) {
      document.body.appendChild(modalEl);
    }
    modalEl.removeEventListener('hidden.bs.modal', this.onModalHidden);
    modalEl.addEventListener('hidden.bs.modal', this.onModalHidden);
    bootstrap.Modal.getOrCreateInstance(modalEl, {
      backdrop: true,
      keyboard: true,
    }).show();
  }

  private onModalHidden = (): void => {
    this.ngZone.run(() => {
      this.selectedDetail = null;
    });
  };

  private getModalEl(): HTMLElement | null {
    return document.getElementById(this.detailModalId);
  }

  private removeStuckBackdrop(): void {
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }
}
