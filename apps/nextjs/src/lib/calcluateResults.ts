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
      return acc + (round.score ?? 0);
    }, 0);
  }
  if (scoresheet.roundsScore === "Best Of") {
    if (scoresheet.winCondition === "Highest Score") {
      return rounds.reduce((acc, round) => {
        return acc > (round.score ?? -Infinity) ? acc : round.score;
      }, -Infinity);
    }
    if (scoresheet.winCondition === "Lowest Score") {
      return rounds.reduce((acc, round) => {
        return acc < (round.score ?? Infinity) ? acc : round.score;
      }, Infinity);
    }
    if (scoresheet.winCondition === "Target Score") {
      return rounds.reduce((acc, round) => {
        return acc === scoresheet.targetScore
          ? acc
          : round.score === scoresheet.targetScore
            ? round.score
            : acc;
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
export function calculateWinners(players: Player[], scoresheet: scoreSheet) {
  const finalScores = calculateFinalScores(players, scoresheet);
  if (scoresheet.winCondition === "Highest Score") {
    const maxScore = Math.max(...finalScores.map((player) => player.score));
    return finalScores.filter((player) => player.score === maxScore);
  }
  if (scoresheet.winCondition === "Lowest Score") {
    const minScore = Math.min(...finalScores.map((player) => player.score));
    return finalScores.filter((player) => player.score === minScore);
  }
  if (scoresheet.winCondition === "Target Score") {
    return finalScores.filter(
      (player) => player.score === scoresheet.targetScore,
    );
  }
  return [];
}
