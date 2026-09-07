import { PulseKpiTab } from './pulse-dashboard.models';

declare var bootstrap: any;

export const PULSE_KPI_TABS: { id: PulseKpiTab; label: string; icon: string }[] = [
  { id: 'ambitionDelivery', label: 'Ambition–Delivery Index', icon: 'bi-bullseye' },
  { id: 'diplomaticRisk', label: 'Diplomatic Risk & Trust Index', icon: 'bi-shield-exclamation' },
  { id: 'institutionalReadiness', label: 'Institutional Readiness Scorecard', icon: 'bi-clipboard-check' },
];

export function pulseProgramSearchFn(term: string, item: any): boolean {
  const q = term.toLowerCase();
  return (
    item.programName?.toLowerCase().includes(q) ||
    item.location?.toLowerCase().includes(q) ||
    item.year?.toString().includes(q)
  );
}

export function formatPulseScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return 'N/A';
  return Number(score).toFixed(1);
}

/** Gap/delta KPI scores can fall outside the 0–100 program score range. */
export function isPulseGapScore(score: number | null | undefined): boolean {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return false;
  const n = Number(score);
  return n < 0 || n > 100;
}
/** Maps score to 0–100 bar width; supports gap scores from -100 to 100. */
export function pulseScoreProgress(score: number | null | undefined): number {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return 0;
  const n = Number(score);
  if (n < 0 || n > 100) {
    return Math.max(0, Math.min(100, (n + 100) / 2));
  }
  return Math.max(0, Math.min(100, n));
}

export function pulseConditionClass(condition?: string | null): string {
  const value = (condition || '').toLowerCase();
  if (value.includes('critical') || value.includes('fragile')) return 'critical';
  if (value.includes('elevated') || value.includes('high')) return 'elevated';
  if (value.includes('watch') || value.includes('developing')) return 'watch';
  return 'stable';
}

export function openPulseKpiModal(modalId: string): void {
  setTimeout(() => {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(modalEl);
    }
    modalInstance.show();
  }, 40);
}

export function closePulseKpiModal(modalId: string): void {
  const modalEl = document.getElementById(modalId);
  if (modalEl) {
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }
}
