import { VCP_CHART } from './ahi-chart-theme';

export type AiKpiPillarTooltipPillar = {
  pillarName: string;
  isAccess: boolean;
  aiProgress?: number | null;
  evaluatorScore?: number | null;
  discrepancy?: number | null;
};

const tooltipShellStyle = `
  padding: 14px 16px;
  min-width: 220px;
  background: linear-gradient(160deg, #12243f 0%, #0d1a30 100%);
  border-radius: 12px;
  box-shadow: ${VCP_CHART.tooltipShadow};
  border: 1px solid rgba(92, 140, 200, 0.35);
  font-family: Poppins, Inter, system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: ${VCP_CHART.text};
`;

/** Consistent dark-console tooltip for AI KPI pillar bar charts. */
export function buildAiKpiPillarTooltipHtml(pillar: AiKpiPillarTooltipPillar): string {
  if (!pillar.isAccess) {
    return `
      <div style="${tooltipShellStyle}">
        <div style="font-weight: 700; font-size: 14px; color: #ffffff; margin-bottom: 8px;">
          ${pillar.pillarName}
        </div>
        <div style="color: ${VCP_CHART.textMuted}; font-size: 12px; line-height: 1.5;">
          Upgrade your plan to unlock real insights
        </div>
      </div>
    `;
  }

  const discrepancy = pillar.discrepancy ?? 0;
  const discrepancyColor = VCP_CHART.discrepancy;

  return `
    <div style="${tooltipShellStyle}">
      <div style="
        font-weight: 700;
        font-size: 14px;
        color: #ffffff;
        margin-bottom: 10px;
        border-bottom: 1px solid rgba(92, 140, 200, 0.28);
        padding-bottom: 8px;
      ">
        ${pillar.pillarName}
      </div>
      <div style="display: grid; row-gap: 6px;">
        <div style="display: flex; justify-content: space-between; gap: 16px;">
          <span style="color: ${VCP_CHART.textMuted};">AI Score</span>
          <span style="font-weight: 600; color: ${VCP_CHART.primary};">
            ${(pillar.aiProgress ?? 0).toFixed(2)}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px;">
          <span style="color: ${VCP_CHART.textMuted};">Evaluation</span>
          <span style="font-weight: 600; color: ${VCP_CHART.secondary};">
            ${(pillar.evaluatorScore ?? 0).toFixed(2)}
          </span>
        </div>
        <div style="
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding-top: 6px;
          margin-top: 6px;
          border-top: 1px dashed rgba(92, 140, 200, 0.28);
        ">
          <span style="color: ${VCP_CHART.textMuted};">Discrepancy</span>
          <span style="font-weight: 600; color: ${discrepancyColor};">
            ${discrepancy.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  `;
}

export type AiKpiClientProgressTooltipPillar = {
  pillarName: string;
  isAccess: boolean;
  aiProgress?: number | null;
};

/** Dark-console tooltip for client KPI progress area chart. */
export function buildAiKpiClientProgressTooltipHtml(
  pillar: AiKpiClientProgressTooltipPillar,
  progressColor: string
): string {
  if (!pillar.isAccess) {
    return buildAiKpiPillarTooltipHtml(pillar);
  }

  const progressPercent = pillar.aiProgress ?? 0;
  const statusText =
    progressPercent >= 75
      ? 'Excellent Performance'
      : progressPercent >= 50
        ? 'Strong Score'
        : progressPercent >= 25
          ? 'Steady Growth'
          : 'Early Stage';

  return `
    <div style="${tooltipShellStyle}">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      ">
        <div>
          <div style="font-weight: 700; font-size: 14px; color: #ffffff; margin-bottom: 6px;">
            ${pillar.pillarName}
          </div>
          <div style="
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            color: ${progressColor};
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(92, 140, 200, 0.22);
          ">
            ${statusText}
          </div>
        </div>
        <div style="font-size: 24px; font-weight: 800; color: ${progressColor}; line-height: 1;">
          ${progressPercent.toFixed(0)}
        </div>
      </div>

      <div style="margin-bottom: 4px;">
        <div style="
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 600;
          color: ${VCP_CHART.textMuted};
        ">
          <span>Progress</span>
          <span style="color: ${VCP_CHART.text};">${progressPercent.toFixed(1)}</span>
        </div>
        <div style="
          width: 100%;
          height: 10px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
        ">
          <div style="
            width: ${progressPercent}%;
            height: 100%;
            background: linear-gradient(90deg, ${progressColor} 0%, ${progressColor}cc 100%);
            border-radius: 10px;
          "></div>
        </div>
      </div>
    </div>
  `;
}
