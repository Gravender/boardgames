import type { z } from "zod";

import type {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/schema";

interface scoreSheet {
  roundsScore: NonNullable<
    z.infer<typeof insertScoreSheetSchema>["roundsScore"]
  >;
  winCondition: NonNullable<
    z.infer<typeof insertScoreSheetSchema>["winCondition"]
  >;
  targetScore: NonNullable<
    z.infer<typeof insertScoreSheetSchema>["targetScore"]
  >;
}
interface Round {
  score: NonNullable<z.infer<typeof insertRoundSchema>["score"]>;
}
export function calculateFinalScore(rounds: Round[], scoresheet: scoreSheet) {
  if (scoresheet.roundsScore === "Aggregate") {
    return rounds.reduce((acc, round) => {
      return acc + round.score;
    }, 0);
  }
  if (scoresheet.roundsScore === "Best Of") {
    if (scoresheet.winCondition === "Highest Score") {
      return rounds.reduce((acc, round) => {
        return acc > round.score ? acc : round.score;
      }, -Infinity);
    }
    if (scoresheet.winCondition === "Lowest Score") {
      return rounds.reduce((acc, round) => {
        return acc < round.score ? acc : round.score;
      }, Infinity);
    }
    if (scoresheet.winCondition === "Target Score") {
      return rounds.reduce((acc, round) => {
        if (acc === scoresheet.targetScore) return acc;
        if (round.score === scoresheet.targetScore) return round.score;
        const accClose = Math.abs(acc - scoresheet.targetScore);
        const roundClose = Math.abs(round.score - scoresheet.targetScore);
        return accClose < roundClose ? acc : round.score;
      }, rounds[0]?.score ?? 0);
    }
  }
  return 0;
}
interface Player {
  id: number;
  rounds: Round[];
}
export function calculateFinalScores(
  players: Player[],
  scoresheet: scoreSheet,
) {
  return players.map((player) => ({
    id: player.id,
    score: calculateFinalScore(player.rounds, scoresheet),
  }));
}
export function calculatePlacement(players: Player[], scoresheet: scoreSheet) {
  const finalScores = calculateFinalScores(players, scoresheet);
  finalScores.sort((a, b) => {
    if (scoresheet.winCondition === "Highest Score") {
      return b.score - a.score;
    }
    if (scoresheet.winCondition === "Lowest Score") {
      return a.score - b.score;
    }
    if (scoresheet.winCondition === "Target Score") {
      if (a.score == b.score) {
        return 0;
      }
      if (a.score === scoresheet.targetScore) return -1;
      if (b.score === scoresheet.targetScore) return 1;
    }
    return 0;
  });
  let placement = 1;
  const placements: { id: number; score: number; placement: number }[] = [];

  for (let i = 0; i < finalScores.length; i++) {
    if (i > 0 && finalScores[i]?.score !== finalScores[i - 1]?.score) {
      placement = i + 1; // Adjust placement only if score changes
    }
    placements.push({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: finalScores[i]!.id,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      score: finalScores[i]!.score,
      placement,
    });
  }

  return placements;
}
