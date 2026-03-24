import type { GetPlayerGameWinRateChartsOutputType } from "../../routers/player/player-insights.output";

export type RunningWinRatePoint = {
  matchDate: Date;
  matchIndex: number;
  cumulativeMatches: number;
  cumulativeWins: number;
  winRate: number;
};

/** Map a match into one of 12 month slots for the 12 calendar months ending at `windowEnd`. */
export const monthSlotForMatchInWindow = (
  matchDate: Date,
  windowEnd: Date,
): number => {
  const endY = windowEnd.getUTCFullYear();
  const endM = windowEnd.getUTCMonth();
  const start = new Date(Date.UTC(endY, endM - 11, 1));
  const match = new Date(
    Date.UTC(matchDate.getUTCFullYear(), matchDate.getUTCMonth(), 1),
  );
  const slot =
    (match.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (match.getUTCMonth() - start.getUTCMonth()) +
    1;
  if (slot < 1) {
    return 1;
  }
  if (slot > 12) {
    return 12;
  }
  return slot;
};

const formatMonthLabelShortUtc = (d: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(d);

/** Labels for the 12 calendar months ending at `windowEnd` (UTC month boundaries). */
export const buildMonthSlotLabelsUtc = (windowEnd: Date): string[] => {
  const endY = windowEnd.getUTCFullYear();
  const endM = windowEnd.getUTCMonth();
  const labels: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(endY, endM - 11 + i, 1));
    labels.push(formatMonthLabelShortUtc(d));
  }
  return labels;
};

export const collapseRunningPointsByMonthSlot = (
  points: RunningWinRatePoint[],
  windowEnd: Date,
): GetPlayerGameWinRateChartsOutputType["series"]["byTime"]["last12Months"] => {
  const withSlot = points.map((p) => ({
    ...p,
    monthSlot: monthSlotForMatchInWindow(p.matchDate, windowEnd),
    monthLabelShort: formatMonthLabelShortUtc(p.matchDate),
  }));
  const bySlot = new Map<number, (typeof withSlot)[number]>();
  for (const p of withSlot) {
    const prev = bySlot.get(p.monthSlot);
    if (
      !prev ||
      p.matchDate.getTime() > prev.matchDate.getTime()
    ) {
      bySlot.set(p.monthSlot, p);
    }
  }
  return [...bySlot.values()].toSorted((a, b) => a.monthSlot - b.monthSlot);
};
