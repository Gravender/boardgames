import type z from "zod/v4";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";

import type {
  selectScoreSheetSchema,
  selectTeamSchema,
} from "@board-games/db/zodSchema";

//Get Player
export interface Player {
  id: number;
  type: "original" | "shared";
  name: string;
  isUser: boolean;
  isWinner: boolean;
  score: number | null;
  image: {
    name: string;
    url: string | null;
    type: "file" | "svg";
    usageType: "player";
  } | null;
  teamId: number | null;
  placement: number | null;
}
export interface PlayerMatch {
  id: number;
  type: "shared" | "original";
  date: Date;
  name: string;
  teams: z.infer<typeof selectTeamSchema>[];
  duration: number;
  finished: boolean;
  gameId: number;
  gameName: string;
  gameImage: {
    name: string;
    url: string | null;
    type: "file" | "svg";
    usageType: "game" | "player" | "match";
  } | null;
  locationName: string | undefined;
  players: Player[];
  scoresheet: z.infer<typeof selectScoreSheetSchema>;
  outcome: {
    score: number | null;
    isWinner: boolean;
    placement: number | null;
  };
  linkedGameId: number | undefined;
}

export function aggregatePlayerStats(playerMatches: PlayerMatch[]) {
  const sortedMatches = playerMatches.sort((a, b) =>
    compareAsc(b.date, a.date),
  );
  const players = sortedMatches.reduce(
    (acc, match) => {
      if (!match.finished) return acc;
      match.players.forEach((player) => {
        const accPlayer = acc[`${player.type}-${player.id}`];

        const gameStatKey = getGameStatKey(match);
        if (!accPlayer) {
          const tempPlacements: Record<number, number> = {};
          if (player.placement != null && player.placement > 0)
            tempPlacements[player.placement] = 1;
          acc[`${player.type}-${player.id}`] = {
            id: player.id,
            type: player.type,
            name: player.name,
            plays: 1,
            isUser: player.isUser,
            wins: player.isWinner ? 1 : 0,
            winRate: player.isWinner ? 1 : 0,
            coopPlays: match.scoresheet.isCoop ? 1 : 0,
            coopWins: match.scoresheet.isCoop ? (player.isWinner ? 1 : 0) : 0,
            coopWinRate: match.scoresheet.isCoop
              ? player.isWinner
                ? 1
                : 0
              : 0,
            competitivePlays: match.scoresheet.isCoop ? 0 : 1,
            competitiveWins: match.scoresheet.isCoop
              ? 0
              : player.isWinner
                ? 1
                : 0,
            competitiveWinRate: match.scoresheet.isCoop
              ? 0
              : player.isWinner
                ? 1
                : 0,
            image: player.image,
            placements:
              player.placement != null && player.placement > 0
                ? tempPlacements
                : {},
            playtime: match.duration,
            streaks: {
              current: { type: player.isWinner ? "win" : "loss", count: 1 },
              longest: {
                type: "win",
                count: player.isWinner ? 1 : 0,
              },
            },
            recentForm: player.isWinner ? ["win"] : ["loss"],
            gameStats: {
              [gameStatKey]: createGameStats(match, player),
            },
          };
        } else {
          if (player.placement != null && player.placement > 0) {
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
          if (current.count > longest.count && current.type === longest.type) {
            longest.count = current.count;
          }
          if (match.scoresheet.isCoop) {
            accPlayer.coopPlays++;
            if (player.isWinner) accPlayer.coopWins++;
            accPlayer.coopWinRate = accPlayer.coopWins / accPlayer.coopPlays;
          } else {
            accPlayer.competitivePlays++;
            if (player.isWinner) accPlayer.competitiveWins++;
            accPlayer.competitiveWinRate =
              accPlayer.competitiveWins / accPlayer.competitivePlays;
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
            if (match.scoresheet.isCoop) {
              gameStats.coopPlays++;
              if (player.isWinner) gameStats.coopWins++;
              gameStats.coopWinRate = gameStats.coopWins / gameStats.coopPlays;
            }
            if (!match.scoresheet.isCoop) {
              gameStats.competitivePlays++;
              if (player.isWinner) gameStats.competitiveWins++;
              gameStats.competitiveWinRate =
                gameStats.competitiveWins / gameStats.competitivePlays;
            }
          } else {
            accPlayer.gameStats[gameStatKey] = createGameStats(match, player);
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
        coopPlays: number;
        coopWins: number;
        coopWinRate: number;
        competitivePlays: number;
        competitiveWins: number;
        competitiveWinRate: number;
        image: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "player";
        } | null;
        placements: Record<number, number>;
        playtime: number;
        streaks: {
          current: { type: "win" | "loss"; count: number };
          longest: { type: "win"; count: number };
        };
        recentForm: ("win" | "loss")[];
        gameStats: Record<
          string,
          {
            id: number;
            type: "original" | "shared";
            name: string;
            plays: number;
            wins: number;
            winRate: number;
            bestScore: number | null;
            worstScore: number | null;
            averageScore: number | null;
            playtime: number;
            scores: number[];
            // Cooperative game stats
            coopPlays: number;
            coopWins: number;
            coopWinRate: number;
            // Competitive game stats (derived)
            competitivePlays: number;
            competitiveWins: number;
            competitiveWinRate: number;
          }
        >;
      }
    >,
  );
  const playerStats = Object.values(players)
    .map((player) => ({
      ...player,
      winRate: player.wins / player.plays,
      gameStats: Object.values(player.gameStats)
        .map((gameStats) => ({
          ...gameStats,
          winRate: gameStats.wins / gameStats.plays,
          coopWinRate: gameStats.coopWins / gameStats.coopPlays,
          competitiveWinRate:
            gameStats.competitiveWins / gameStats.competitivePlays,
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
  return playerStats;
}
const getGameStatKey = (match: PlayerMatch) => {
  if (match.type === "shared" && match.linkedGameId) {
    return `original-${match.linkedGameId}`;
  }
  return `${match.type}-${match.gameId}`;
};
const createGameStats = (match: PlayerMatch, player: Player) => {
  return {
    id: match.linkedGameId ?? match.gameId,
    type:
      match.type === "shared" && match.linkedGameId
        ? ("original" as const)
        : match.type,
    name: match.gameName,
    plays: 1,
    wins: player.isWinner ? 1 : 0,
    winRate: player.isWinner ? 1 : 0,
    bestScore: player.score ?? null,
    worstScore: player.score ?? null,
    averageScore: player.score ?? null,
    playtime: match.duration,
    scores: player.score != null ? [player.score] : [],
    coopPlays: match.scoresheet.isCoop ? 1 : 0,
    coopWins: match.scoresheet.isCoop ? (player.isWinner ? 1 : 0) : 0,
    coopWinRate: match.scoresheet.isCoop ? (player.isWinner ? 1 : 0) : 0,
    competitivePlays: match.scoresheet.isCoop ? 0 : 1,
    competitiveWins: match.scoresheet.isCoop ? 0 : player.isWinner ? 1 : 0,
    competitiveWinRate: match.scoresheet.isCoop ? 0 : player.isWinner ? 1 : 0,
  };
};

export function teammateFrequency(
  playerMatches: PlayerMatch[],
  currentPlayer: {
    id: number;
    type: "original" | "shared";
  },
) {
  const teammateFrequency = playerMatches.reduce(
    (acc, match) => {
      const currentPlayerMatchPlayer = match.players.find(
        (p) => p.id === currentPlayer.id && p.type === currentPlayer.type,
      );
      if (!currentPlayerMatchPlayer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Current player data not found",
        });
      }
      match.players
        .filter(
          (matchPlayer) =>
            matchPlayer.teamId !== null &&
            matchPlayer.teamId === currentPlayerMatchPlayer.teamId &&
            !(
              matchPlayer.id === currentPlayer.id &&
              matchPlayer.type === currentPlayer.type
            ),
        )
        .forEach((matchPlayer) => {
          const teammateKey = `${matchPlayer.id}-${matchPlayer.type}`;
          acc[teammateKey] ??= {
            player: matchPlayer,
            count: 0,
            wins: 0,
          };
          acc[teammateKey].count++;

          // Check if both players won this match
          const playerWon = currentPlayerMatchPlayer.isWinner;
          const teammateWon = matchPlayer.isWinner;
          if (playerWon && teammateWon) {
            acc[teammateKey].wins++;
          }
        });
      return acc;
    },
    {} as Record<string, { player: Player; count: number; wins: number }>,
  );
  const teamMates = Object.values(teammateFrequency);
  teamMates.sort((a, b) => b.wins - a.wins);
  return teamMates;
}
export function headToHeadStats(
  playerMatches: PlayerMatch[],
  currentPlayer: {
    id: number;
    type: "original" | "shared";
  },
) {
  const headToHead = playerMatches.reduce(
    (acc, match) => {
      const currentPlayerData = match.players.find(
        (p) => p.id === currentPlayer.id && p.type === currentPlayer.type,
      );
      if (!currentPlayerData) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Current player data not found",
        });
      }
      const gameStatKey = getGameStatKey(match);

      match.players
        .filter(
          (opponent) =>
            !(
              opponent.id === currentPlayer.id &&
              opponent.type === currentPlayer.type
            ),
        )
        .forEach((opponent) => {
          const key = `${opponent.type}-${opponent.id}`;
          acc[key] ??= {
            player: opponent,
            wins: 0,
            losses: 0,
            ties: 0,
            playtime: 0,
            games: {
              [gameStatKey]: createGame(match, {
                wins: 0,
                losses: 0,
                ties: 0,
              }),
            },
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
          acc[key].games[gameStatKey] ??= createGame(match, {
            wins: 0,
            losses: 0,
            ties: 0,
          });
          acc[key].games[gameStatKey].plays++;
          acc[key].games[gameStatKey].playtime += match.duration;
          const cpWin = currentPlayerData.isWinner;
          const opWin = opponent.isWinner;
          if (match.finished) {
            acc[key].matches++;
            if (
              (currentPlayerData.placement !== null &&
                opponent.placement !== null &&
                currentPlayerData.placement === opponent.placement) ||
              (cpWin && opWin)
            ) {
              acc[key].ties++;
              acc[key].games[gameStatKey].ties++;
            } else if (
              cpWin ||
              (currentPlayerData.placement !== null &&
                opponent.placement !== null &&
                currentPlayerData.placement < opponent.placement)
            ) {
              acc[key].wins++;
              acc[key].games[gameStatKey].wins++;
            } else if (
              opWin ||
              (currentPlayerData.placement !== null &&
                opponent.placement !== null &&
                currentPlayerData.placement > opponent.placement)
            ) {
              acc[key].losses++;
              acc[key].games[gameStatKey].losses++;
            }
            if (match.scoresheet.isCoop) {
              acc[key].coopPlays++;
              if (cpWin && opWin) {
                acc[key].coopWins++;
                acc[key].games[gameStatKey].coopWins++;
              } else {
                acc[key].coopLosses++;
                acc[key].games[gameStatKey].coopLosses++;
              }
            }
            if (!match.scoresheet.isCoop) {
              acc[key].competitivePlays++;
              if (
                (cpWin && !opWin) ||
                (currentPlayerData.placement !== null &&
                  opponent.placement !== null &&
                  currentPlayerData.placement < opponent.placement)
              ) {
                acc[key].competitiveWins++;
                acc[key].games[gameStatKey].competitiveWins++;
              } else if (
                (!cpWin && opWin) ||
                (currentPlayerData.placement !== null &&
                  opponent.placement !== null &&
                  currentPlayerData.placement > opponent.placement)
              ) {
                acc[key].competitiveLosses++;
                acc[key].games[gameStatKey].competitiveLosses++;
              } else {
                acc[key].competitiveTies++;
                acc[key].games[gameStatKey].competitiveTies++;
              }
            }
            if (
              currentPlayerData.teamId === opponent.teamId &&
              !match.scoresheet.isCoop &&
              currentPlayerData.teamId !== null
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
        player: Player;
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
        games: Record<
          string,
          {
            id: number;
            type: "original" | "shared";
            name: string;
            plays: number;
            wins: number;
            losses: number;
            ties: number;
            playtime: number;
            coopPlays: number;
            coopWins: number;
            coopLosses: number;
            competitivePlays: number;
            competitiveWins: number;
            competitiveLosses: number;
            competitiveTies: number;
          }
        >;
        matches: number;
      }
    >,
  );

  return Object.values(headToHead).map((entry) => ({
    ...entry,
    games: Object.values(entry.games),
  }));
}
const createGame = (
  match: PlayerMatch,
  result: {
    wins: number;
    losses: number;
    ties: number;
  },
) => {
  return {
    id: match.linkedGameId ?? match.gameId,
    type:
      match.type === "shared" && match.linkedGameId
        ? ("original" as const)
        : match.type,
    name: match.gameName,
    plays: 1,
    wins: result.wins,
    losses: result.losses,
    ties: result.ties,
    playtime: match.duration,
    coopPlays: match.scoresheet.isCoop ? 1 : 0,
    coopWins: match.scoresheet.isCoop ? result.wins : 0,
    coopLosses: match.scoresheet.isCoop ? result.losses : 0,
    competitivePlays: match.scoresheet.isCoop ? 0 : 1,
    competitiveWins: match.scoresheet.isCoop ? 0 : result.wins,
    competitiveLosses: match.scoresheet.isCoop ? 0 : result.losses,
    competitiveTies: match.scoresheet.isCoop ? 0 : result.ties,
  };
};
export function getTeamStats(
  playerMatches: PlayerMatch[],
  currentPlayer: {
    id: number;
    type: "original" | "shared";
  },
) {
  let totalTeamGames = 0;
  let teamWins = 0;
  const teamMatches: {
    teamName: string;
    match: PlayerMatch;
    result: boolean;
    players: Player[];
  }[] = [];

  for (const match of playerMatches) {
    if (!match.finished) continue;

    const current = match.players.find(
      (p) => p.id === currentPlayer.id && p.type === currentPlayer.type,
    );
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (current === undefined || current.teamId === null) continue;

    // Only consider matches where player had teammates
    const teammates = match.players.filter(
      (p) =>
        p.teamId !== null &&
        p.teamId === current.teamId &&
        !(p.id === currentPlayer.id && p.type === currentPlayer.type),
    );

    if (teammates.length === 0) continue;

    totalTeamGames++;
    if (current.isWinner) teamWins++;

    const teamName = match.teams.find((t) => t.id === current.teamId)?.name;
    teamMatches.push({
      teamName: teamName ?? "Team",
      match,
      result: current.isWinner,
      players: teammates,
    });
  }

  return {
    totalTeamGames,
    teamWins,
    teamWinRate: totalTeamGames > 0 ? teamWins / totalTeamGames : 0,
    teamMatches,
  };
}
