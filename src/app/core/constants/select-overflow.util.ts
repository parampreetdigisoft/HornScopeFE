export type SelectOverflowResult = {
  visible: string[];
  extra: number;
};

const CHIP_PAD_PX = 22;
const GAP_PX = 6;
const MORE_PAD_PX = 20;

function chipWidth(label: string, measure: (text: string) => number): number {
  return Math.ceil(measure(label)) + CHIP_PAD_PX;
}

function moreWidth(count: number, measure: (text: string) => number): number {
  if (count <= 0) return 0;
  return Math.ceil(measure(`+${count}`)) + MORE_PAD_PX;
}

/** Pack as many full labels as fit; remaining selections collapse to +N. Always keeps the first label. */
export function fitSelectLabels(
  labels: string[],
  availablePx: number,
  measure: (text: string) => number
): SelectOverflowResult {
  const names = (labels ?? []).map((label) => (label ?? '').trim()).filter(Boolean);
  if (!names.length) {
    return { visible: [], extra: 0 };
  }
  if (names.length === 1 || availablePx <= 0) {
    return { visible: names.slice(0, 1), extra: Math.max(0, names.length - 1) };
  }

  let used = 0;
  let count = 0;

  for (let i = 0; i < names.length; i++) {
    const remainingAfter = names.length - i - 1;
    const nextChip = chipWidth(names[i], measure);
    const gap = count > 0 ? GAP_PX : 0;
    const widthWithChip = used + gap + nextChip;
    const plus = remainingAfter > 0 ? GAP_PX + moreWidth(remainingAfter, measure) : 0;

    if (count === 0) {
      used = nextChip;
      count = 1;
      continue;
    }

    if (widthWithChip + plus <= availablePx) {
      used = widthWithChip;
      count++;
      continue;
    }

    break;
  }

  const visibleCount = Math.max(1, count);
  return {
    visible: names.slice(0, visibleCount),
    extra: names.length - visibleCount,
  };
}
