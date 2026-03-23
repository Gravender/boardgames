import type { RouterOutputs } from "@board-games/api";

export type InsightOutcomeFields = {
  placement: number | null;
  score: number | null;
  isWinner: boolean | null;
};

export type InsightScoresheetWinCondition =
  RouterOutputs["newPlayer"]["getPlayerRecentMatches"]["matches"][number]["scoresheetWinCondition"];

/**
 * Aligns with `getOutcomeLabelFromFields` / `insightWinSql` in the API: win if
 * `isWinner === true`, else tie if both placement and score are null, else win if
 * placement is 1, else loss.
 */
export const deriveInsightOutcomeKind = (
  o: InsightOutcomeFields,
): "win" | "loss" | "tie" => {
  if (o.isWinner === true) {
    return "win";
  }
  if (o.placement === null && o.score === null) {
    return "tie";
  }
  if (o.placement === 1) {
    return "win";
  }
  return "loss";
};

/**
 * How to show placement/score in lists — mirrors game stats: manual (and no-winner)
 * matches do not imply ordered placement; show score only unless placement exists.
 */
export const formatInsightOutcomeStatsLine = (args: {
  outcome: Pick<InsightOutcomeFields, "placement" | "score">;
  winCondition: InsightScoresheetWinCondition;
}): string | null => {
  const { outcome, winCondition } = args;
  if (winCondition === "Manual" || winCondition === "No Winner") {
    if (outcome.score !== null) {
      return `Score ${outcome.score}`;
    }
    return null;
  }
  const parts: string[] = [];
  if (outcome.placement !== null) {
    parts.push(`Place #${outcome.placement}`);
  }
  if (outcome.score !== null) {
    parts.push(`Score ${outcome.score}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
};

export const isManualWinCondition = (
  w: InsightScoresheetWinCondition,
): boolean => w === "Manual";
