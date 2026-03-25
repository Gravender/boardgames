import type {
  InsightMatchParticipant,
  InsightMatchRow,
} from "./player-insights.read.types";

/**
 * Matches SQL `insightWinSql` / `insightTieSql` in player-insights.repository.ts.
 * Tie outcomes do not advance or reset win streaks in streak calculations.
 */
export const getOutcomeLabelFromFields = (args: {
  outcomeWinner: boolean | null;
  outcomePlacement: number | null;
  outcomeScore: number | null;
}): "win" | "loss" | "tie" => {
  if (args.outcomeWinner === true) {
    return "win";
  }
  if (args.outcomePlacement === null && args.outcomeScore === null) {
    return "tie";
  }
  if (args.outcomePlacement === 1) {
    return "win";
  }
  return "loss";
};

export const getOutcomeLabelForRow = (
  row: InsightMatchRow,
): "win" | "loss" | "tie" =>
  getOutcomeLabelFromFields({
    outcomeWinner: row.outcomeWinner,
    outcomePlacement: row.outcomePlacement,
    outcomeScore: row.outcomeScore,
  });

/**
 * Rivals head-to-head: better finish (lower placement number) wins. Same
 * placement ⇒ tie. For Manual win condition only: if both are marked winner
 * or neither is, count as tie; otherwise use placement when present, else
 * winner flags.
 */
export const compareRivalHeadToHead = (args: {
  row: InsightMatchRow;
  target: InsightMatchParticipant;
  other: InsightMatchParticipant;
}): "win" | "loss" | "tie" => {
  const { row, target, other } = args;

  if (row.scoresheetWinCondition === "Manual") {
    const bothWon = target.winner === true && other.winner === true;
    const bothNotWinner = target.winner !== true && other.winner !== true;
    if (bothWon || bothNotWinner) {
      return "tie";
    }
  }

  if (target.placement !== null && other.placement !== null) {
    if (target.placement < other.placement) {
      return "win";
    }
    if (target.placement > other.placement) {
      return "loss";
    }
    return "tie";
  }

  if (target.winner === true && other.winner !== true) {
    return "win";
  }
  if (target.winner !== true && other.winner === true) {
    return "loss";
  }
  return "tie";
};
