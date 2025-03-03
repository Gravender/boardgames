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
/**
 * The function `calculateFinalScores` takes an array of players and a scoresheet, then calculates the
 * final score for each player based on their rounds and the scoresheet.
 * @param {Player[]} players - An array of Player objects representing the players participating in the
 * game.
 * @param {scoreSheet} scoresheet - The `scoresheet` parameter is an object that contains the scoring
 * criteria for the game. It likely includes information such as point values for different actions or
 * achievements in the game. This object is used in the `calculateFinalScore` function to determine the
 * final score for each player based on their rounds played
 * @returns An array of objects containing the player's ID and their final score calculated based on
 * their rounds and the scoresheet.
 */
export function calculateFinalScores(
  players: Player[],
  scoresheet: scoreSheet,
) {
  return players.map((player) => ({
    id: player.id,
    score: calculateFinalScore(player.rounds, scoresheet),
  }));
}
/**
 * The function `calculatePlacement` determines the placement of players based on their scores
 * according to the specified win condition.
 * @param {Player[]} players - The `players` parameter in the `calculatePlacement` function is an array
 * of objects representing players. Each player object typically contains information such as an `id`,
 * `name`, and other relevant data about the player participating in the game or competition.
 * @param {scoreSheet} scoresheet - The `scoresheet` parameter in the `calculatePlacement` function
 * represents the score sheet used in the game. It contains information such as the win condition
 * (whether it's based on the highest score, lowest score, or a target score) and possibly other
 * game-specific details like the target score for the
 * @returns The function `calculatePlacement` returns an array of objects containing the player's ID,
 * score, and placement based on the sorting criteria specified in the function.
 */
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
