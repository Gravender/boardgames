import type { z } from "zod/v4";

import type {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/zodSchema";

interface scoreSheet {
  roundsScore: NonNullable<
    z.infer<typeof insertScoreSheetSchema>["roundsScore"]
  >;
  winCondition: NonNullable<
    z.infer<typeof insertScoreSheetSchema>["winCondition"]
  >;
  targetScore: z.infer<typeof insertScoreSheetSchema>["targetScore"] | null;
}
interface Round {
  score: NonNullable<z.infer<typeof insertRoundSchema>["score"]> | null;
}
/**
 * The function `calculateFinalScore` calculates the final score based on the rounds and scoring
 * criteria provided in the scoresheet.
 * @param {Round[]} rounds - The `rounds` parameter in the `calculateFinalScore` function is an array
 * of objects representing each round of a game or competition. Each object in the array typically
 * contains information about the round, such as the score achieved in that round.
 * @param {scoreSheet} scoresheet - The `scoresheet` parameter in the `calculateFinalScore` function
 * represents the scoring criteria for the rounds played. It contains information such as the type of
 * scoring method used (Aggregate or Best Of) and the win condition (Highest Score, Lowest Score, or
 * Target Score). The function calculates the final
 * @returns The `calculateFinalScore` function returns the final score based on the given rounds and
 * scoresheet criteria. The returned value depends on the conditions set in the `scoresheet` object. If
 * the `roundsScore` is "Aggregate", it calculates the total score by summing up all round scores. If
 * the `roundsScore` is "Best Of", it considers different win conditions ("Highest
 */
export function calculateFinalScore(rounds: Round[], scoresheet: scoreSheet) {
  if (rounds.length === 0) return null;

  if (scoresheet.roundsScore === "Aggregate") {
    return rounds.reduce<number | null>((acc, round) => {
      if (round.score != null) {
        if (acc != null) {
          return acc + round.score;
        }
        return round.score;
      }
      return acc;
    }, null);
  }
  if (scoresheet.roundsScore === "Best Of") {
    if (scoresheet.winCondition === "Highest Score") {
      return rounds.reduce<number | null>((acc, round) => {
        if (round.score != null) {
          if (acc != null) {
            return acc > round.score ? acc : round.score;
          }
          return round.score;
        }
        return acc;
      }, null);
    }
    if (scoresheet.winCondition === "Lowest Score") {
      return rounds.reduce<number | null>((acc, round) => {
        if (round.score != null) {
          if (acc != null) {
            return acc < round.score ? acc : round.score;
          }
          return round.score;
        }
        return acc;
      }, null);
    }
    if (scoresheet.winCondition === "Target Score") {
      if (scoresheet.targetScore == null) return null;
      const target = scoresheet.targetScore;
      return rounds.reduce<number | null>((acc, round) => {
        if (round.score != null) {
          if (acc != null) {
            if (acc === target) return acc;
            if (round.score === target) return round.score;
            const accClose = Math.abs(acc - target);
            const roundClose = Math.abs(round.score - target);
            return accClose < roundClose ? acc : round.score;
          }
          return round.score;
        }
        return acc;
      }, null);
    }
  }
  return null;
}
interface Player {
  id: number;
  rounds: Round[];
  teamId: number | null;
}

export function calculateFinalScores(
  players: Player[],
  scoresheet: scoreSheet,
) {
  return players.map((player) => ({
    id: player.id,
    score: calculateFinalScore(player.rounds, scoresheet),
    teamId: player.teamId,
  }));
}

export function calculatePlacement(players: Player[], scoresheet: scoreSheet) {
  const finalScores = calculateFinalScores(players, scoresheet);
  finalScores.sort((a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (scoresheet.winCondition === "Highest Score") {
      return b.score - a.score;
    }
    if (scoresheet.winCondition === "Lowest Score") {
      return a.score - b.score;
    }
    if (scoresheet.winCondition === "Target Score") {
      if (scoresheet.targetScore == null) return 0;
      if (a.score === b.score) {
        return 0;
      }
      if (a.score === scoresheet.targetScore) return -1;
      if (b.score === scoresheet.targetScore) return 1;
      const aDist = Math.abs(a.score - scoresheet.targetScore);
      const bDist = Math.abs(b.score - scoresheet.targetScore);
      return aDist - bDist;
    }
    return 0;
  });
  let placement = 1;
  const placements: { id: number; score: number | null; placement: number }[] =
    [];
  for (let i = 0; i < finalScores.length; i++) {
    if (
      i > 0 &&
      finalScores[i]?.score !== finalScores[i - 1]?.score &&
      (finalScores[i]?.teamId === null ||
        finalScores[i]?.teamId !== finalScores[i - 1]?.teamId)
    ) {
      const finalScoreSlice = finalScores.slice(0, i);
      const increment = finalScoreSlice.reduce((acc, curr) => {
        if (curr.teamId === null) {
          acc++;
        }
        return acc;
      }, 0);
      const uniqueTeams = new Set(
        finalScoreSlice
          .filter((score) => score.teamId !== null)
          .map((score) => score.teamId ?? 0),
      );
      placement = increment + 1 + uniqueTeams.size; // Adjust placement only if score changes
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
