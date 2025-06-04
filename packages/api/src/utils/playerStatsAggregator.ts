import type z from "zod/v4";
import { compareAsc } from "date-fns";

import type {
  selectScoreSheetSchema,
  selectTeamSchema,
} from "@board-games/db/zodSchema";

type Matches = {
  id: number;
  type: "original" | "shared";
  date: Date;
  name: string;
  teams: z.infer<typeof selectTeamSchema>[];
  duration: number;
  finished: boolean;
  won: boolean;
  hasUser: boolean;
  players: {
    id: number;
    type: "original" | "shared";
    name: string;
    isUser: boolean;
    isWinner: boolean;
    score: number | null;
    imageUrl: string | undefined;
    teamId: number | null;
    placement: number;
  }[];
  gameImageUrl: string | undefined;
  gameName: string | undefined;
  gameId: number | undefined;
  scoresheet: z.infer<typeof selectScoreSheetSchema>;
  linkedGameId: number | undefined;
}[];
export function aggregatePlayerStats(matches: Matches) {
  matches.sort((a, b) => compareAsc(a.date, b.date));
  const players = matches.reduce(
    (acc, match) => {
      if (!match.finished) return acc;
      match.players.forEach((player) => {
        const accPlayer = acc[`${player.type}-${player.id}`];

        const gameStatKey = getGameStatKey(match);
        if (!accPlayer) {
          const tempPlacements: Record<number, number> = {};
          tempPlacements[player.placement] = 1;
          acc[`${player.type}-${player.id}`] = {
            id: player.id,
            type: player.type,
            name: player.name,
            plays: 1,
            isUser: player.isUser,
            wins: player.isWinner ? 1 : 0,
            winRate: player.isWinner ? 1 : 0,
            imageUrl: player.imageUrl,
            placements: player.placement > 0 ? tempPlacements : {},
            playtime: match.duration,
            streaks: {
              current: { type: player.isWinner ? "win" : "loss", count: 1 },
              longest: { type: player.isWinner ? "win" : "loss", count: 1 },
            },
            recentForm: player.isWinner ? ["win"] : ["loss"],
            gameStats: {
              [gameStatKey]: createGameStats(gameStatKey, match, player),
            },
          };
        } else {
          if (player.placement > 0) {
            const currentPlacement = accPlayer.placements[player.placement];
            if (currentPlacement) {
              accPlayer.placements[player.placement] = currentPlacement + 1;
            } else {
              accPlayer.placements[player.placement] = 1;
            }
          }
          accPlayer.plays++;
          if (player.isWinner) accPlayer.wins++;
          accPlayer.playtime += match.duration;
          accPlayer.recentForm.push(player.isWinner ? "win" : "loss");
          const current = accPlayer.streaks.current;
          if (
            (player.isWinner && current.type === "win") ||
            (!player.isWinner && current.type === "loss")
          ) {
            current.count++;
          } else {
            current.type = player.isWinner ? "win" : "loss";
            current.count = 1;
          }

          const longest = accPlayer.streaks.longest;
          if (
            current.count > longest.count ||
            (current.type === longest.type && current.count === longest.count)
          ) {
            longest.type = current.type;
            longest.count = current.count;
          }

          const gameStats = accPlayer.gameStats[gameStatKey];
          if (gameStats) {
            gameStats.plays++;
            gameStats.playtime += match.duration;
            if (player.isWinner) gameStats.wins++;
            if (player.score != null) {
              gameStats.scores.push(player.score);

              if (match.scoresheet.winCondition === "Highest Score") {
                gameStats.bestScore =
                  gameStats.bestScore !== null
                    ? Math.max(gameStats.bestScore, player.score)
                    : player.score;
                gameStats.worstScore =
                  gameStats.worstScore !== null
                    ? Math.min(gameStats.worstScore, player.score)
                    : player.score;
              } else if (match.scoresheet.winCondition === "Lowest Score") {
                gameStats.bestScore =
                  gameStats.bestScore !== null
                    ? Math.min(gameStats.bestScore, player.score)
                    : player.score;
                gameStats.worstScore =
                  gameStats.worstScore !== null
                    ? Math.max(gameStats.worstScore, player.score)
                    : player.score;
              } else {
                gameStats.bestScore = null;
                gameStats.worstScore = null;
              }
            }
          } else {
            accPlayer.gameStats[gameStatKey] = createGameStats(
              gameStatKey,
              match,
              player,
            );
          }
        }
      });
      return acc;
    },
    {} as Record<
      string,
      {
        id: number;
        type: "original" | "shared";
        name: string;
        isUser: boolean;
        plays: number;
        wins: number;
        winRate: number;
        imageUrl: string | undefined;
        placements: Record<number, number>;
        playtime: number;
        streaks: {
          current: { type: "win" | "loss"; count: number };
          longest: { type: "win" | "loss"; count: number };
        };
        recentForm: ("win" | "loss")[];
        gameStats: Record<
          string,
          {
            id: string;
            name: string;
            plays: number;
            wins: number;
            winRate: number;
            bestScore: number | null;
            worstScore: number | null;
            averageScore: number | null;
            playtime: number;
            scores: number[];
          }
        >;
      }
    >,
  );
  return Object.values(players)
    .map((player) => ({
      ...player,
      winRate: player.wins / player.plays,
      gameStats: Object.values(player.gameStats)
        .map((gameStats) => ({
          ...gameStats,
          winRate: gameStats.wins / gameStats.plays,
          averageScore:
            gameStats.scores.length > 0
              ? gameStats.scores.reduce((acc, cur) => acc + cur, 0) /
                gameStats.scores.length
              : null,
        }))
        .toSorted((a, b) => {
          if (a.plays !== b.plays) {
            return b.plays - a.plays;
          }
          return b.winRate - a.winRate;
        }),
    }))
    .toSorted((a, b) => {
      if (a.plays !== b.plays) {
        return b.plays - a.plays;
      }
      return b.winRate - a.winRate;
    });
}
const getGameStatKey = (match: Matches[number]) => {
  if (match.type === "shared" && match.linkedGameId) {
    return `original-${match.linkedGameId}`;
  }
  return `${match.type}-${match.gameId}`;
};
const createGameStats = (
  id: string,
  match: Matches[number],
  player: Matches[number]["players"][number],
) => ({
  id,
  name: match.gameName ?? "",
  plays: 1,
  wins: player.isWinner ? 1 : 0,
  winRate: player.isWinner ? 1 : 0,
  bestScore: player.score ?? null,
  worstScore: player.score ?? null,
  averageScore: player.score ?? null,
  playtime: match.duration,
  scores: player.score != null ? [player.score] : [],
});
