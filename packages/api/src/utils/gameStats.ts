import type {
  roundTypes,
  scoreSheetWinConditions,
} from "@board-games/db/constants";

export function updateRoundStatistics(
  playerRounds: {
    id: number;
    roundId: number;
    score: number | null;
  }[],
  scoresheetRounds: {
    id: number;
    parentId: number | null;
    name: string;
    type: (typeof roundTypes)[number];
    score: number;
    order: number;
  }[],
  winCondition: (typeof scoreSheetWinConditions)[number],
  matchDate: Date,
  isWinner: boolean,
) {
  const tempPlayerRounds: Record<
    number,
    {
      id: number;
      bestScore: number | null;
      worstScore: number | null;
      scores: { date: Date; score: number | null; isWin: boolean }[];
    }
  > = {};

  playerRounds.forEach((pRound) => {
    const foundRound = scoresheetRounds.find(
      (round) => round.id === pRound.roundId,
    );
    if (foundRound?.parentId) {
      const tempPlayerRound = tempPlayerRounds[foundRound.parentId];
      if (!tempPlayerRound) {
        tempPlayerRounds[foundRound.parentId] = {
          id: foundRound.parentId,
          bestScore:
            winCondition === "Lowest Score" || winCondition === "Highest Score"
              ? pRound.score
              : null,
          worstScore:
            winCondition === "Lowest Score" || winCondition === "Highest Score"
              ? pRound.score
              : null,
          scores: [
            {
              date: matchDate,
              score: pRound.score,
              isWin: isWinner,
            },
          ],
        };
      } else {
        if (pRound.score !== null) {
          if (winCondition === "Lowest Score") {
            tempPlayerRound.bestScore = tempPlayerRound.bestScore
              ? Math.min(tempPlayerRound.bestScore, pRound.score)
              : pRound.score;
            tempPlayerRound.worstScore = tempPlayerRound.worstScore
              ? Math.max(tempPlayerRound.worstScore, pRound.score)
              : pRound.score;
          } else if (winCondition === "Highest Score") {
            tempPlayerRound.bestScore = tempPlayerRound.bestScore
              ? Math.max(tempPlayerRound.bestScore, pRound.score)
              : pRound.score;
            tempPlayerRound.worstScore = tempPlayerRound.worstScore
              ? Math.min(tempPlayerRound.worstScore, pRound.score)
              : pRound.score;
          }
        }
        tempPlayerRound.scores.push({
          date: matchDate,
          score: pRound.score,
          isWin: isWinner,
        });
      }
    }
  });

  return tempPlayerRounds;
}
