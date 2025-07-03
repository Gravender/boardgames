import type z from "zod/v4";

import type {
  roundTypes,
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import type { selectScoreSheetSchema } from "@board-games/db/zodSchema";

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
interface PlayerMatch {
  type: "original" | "shared";
  id: number;
  gameId: number;
  date: Date;
  location: {
    type: "shared" | "linked" | "original";
    name: string;
  } | null;
  won: boolean;
  placement: number | null;
  score: number | null;
  name: string;
  duration: number;
  finished: boolean;
  comment: string | null;
  scoresheet: {
    id: number;
    parentId: number | null;
    winCondition: (typeof scoreSheetWinConditions)[number];
    roundScore: (typeof scoreSheetRoundsScore)[number];
    targetScore: z.infer<typeof selectScoreSheetSchema>["targetScore"];
    isCoop: z.infer<typeof selectScoreSheetSchema>["isCoop"];
    rounds: {
      id: number;
      parentId: number | null;
      name: string;
      type: (typeof roundTypes)[number];
      score: number;
      order: number;
    }[];
  };
  players: {
    id: number;
    type: "original" | "shared";
    name: string;
    isWinner: boolean | null;
    isUser: boolean;
    score: number | null;
    placement: number;
    image: {
      name: string;
      url: string | null;
      type: "file" | "svg";
      usageType: "player" | "match" | "game";
    } | null;
    team: {
      id: number;
      name: string;
      matchId: number;
      details: string | null;
      createdAt: Date;
      updatedAt: Date | null;
    } | null;
    playerRounds: {
      id: number;
      roundId: number;
      score: number | null;
    }[];
  }[];
  winners: {
    id: number;
    name: string;
    isWinner: boolean | null;
    score: number | null;
    team: {
      id: number;
      name: string;
      matchId: number;
      details: string | null;
      createdAt: Date;
      updatedAt: Date | null;
    } | null;
  }[];
}
export function headToHeadStats(playerMatches: PlayerMatch[]) {
  const headToHead = playerMatches.reduce(
    (acc, match) => {
      if (!match.finished) {
        return acc;
      }
      const currentPlayerData = match.players.find((p) => p.isUser);
      if (!currentPlayerData) {
        return acc;
      }

      match.players
        .filter((opponent) => !opponent.isUser)
        .forEach((opponent) => {
          const key = `${opponent.type}-${opponent.id}`;
          acc[key] ??= {
            player: opponent,
            wins: 0,
            losses: 0,
            ties: 0,
            playtime: 0,
            matches: 0,
            coopWins: 0,
            coopLosses: 0,
            coopPlays: 0,
            competitiveWins: 0,
            competitiveLosses: 0,
            competitiveTies: 0,
            competitivePlays: 0,
            teamLosses: 0,
            teamWins: 0,
          };
          const cpWin = currentPlayerData.isWinner;
          const opWin = opponent.isWinner;
          if (match.finished) {
            acc[key].matches++;
            if (
              (currentPlayerData.placement > 0 &&
                opponent.placement > 0 &&
                currentPlayerData.placement === opponent.placement) ||
              (cpWin && opWin)
            ) {
              acc[key].ties++;
            } else if (
              cpWin ||
              (currentPlayerData.placement > 0 &&
                opponent.placement > 0 &&
                currentPlayerData.placement < opponent.placement)
            ) {
              acc[key].wins++;
            } else if (
              opWin ||
              (currentPlayerData.placement > 0 &&
                opponent.placement > 0 &&
                currentPlayerData.placement > opponent.placement)
            ) {
              acc[key].losses++;
            }
            if (match.scoresheet.isCoop) {
              acc[key].coopPlays++;
              if (cpWin && opWin) {
                acc[key].coopWins++;
              } else {
                acc[key].coopLosses++;
              }
            }
            if (!match.scoresheet.isCoop) {
              acc[key].competitivePlays++;
              if (
                (cpWin && !opWin) ||
                (currentPlayerData.placement > 0 &&
                  opponent.placement > 0 &&
                  currentPlayerData.placement < opponent.placement)
              ) {
                acc[key].competitiveWins++;
              } else if (
                (!cpWin && opWin) ||
                (currentPlayerData.placement > 0 &&
                  opponent.placement > 0 &&
                  currentPlayerData.placement > opponent.placement)
              ) {
                acc[key].competitiveLosses++;
              } else {
                acc[key].competitiveTies++;
              }
            }
            if (
              currentPlayerData.team?.id === opponent.team?.id &&
              !match.scoresheet.isCoop &&
              currentPlayerData.team?.id
            ) {
              if (currentPlayerData.isWinner) {
                acc[key].teamWins++;
              } else {
                acc[key].teamLosses++;
              }
            }
          }
        });

      return acc;
    },
    {} as Record<
      string,
      {
        player: {
          id: number;
          type: "original" | "shared";
          name: string;
          isUser: boolean;
          isWinner: boolean | null;
          score: number | null;
          image: {
            name: string;
            url: string | null;
            type: "file" | "svg";
            usageType: "player" | "match" | "game";
          } | null;
          team: {
            id: number;
            name: string;
            matchId: number;
            details: string | null;
            createdAt: Date;
            updatedAt: Date | null;
          } | null;
          placement: number | null;
        };
        wins: number;
        losses: number;
        ties: number;
        teamWins: number;
        teamLosses: number;
        playtime: number;
        coopWins: number;
        coopLosses: number;
        coopPlays: number;
        competitiveWins: number;
        competitiveLosses: number;
        competitiveTies: number;
        competitivePlays: number;
        matches: number;
      }
    >,
  );

  const headToHeadArray = Object.values(headToHead);
  headToHeadArray.sort((a, b) => {
    const aTotalGames = a.wins + a.losses;
    const bTotalGames = b.wins + b.losses;
    const aWinRate = aTotalGames > 0 ? a.wins / aTotalGames : 0;
    const bWinRate = bTotalGames > 0 ? b.wins / bTotalGames : 0;
    if (aTotalGames > 10 && bTotalGames > 10) {
      return bWinRate - aWinRate;
    }
    return bTotalGames - aTotalGames;
  });
  return headToHeadArray;
}
