import { TRPCError } from "@trpc/server";

import type { GetGameStatsHeaderOutputType } from "../../repositories/game/game.repository.types";
import type {
  GetGamePlayerStatsOutputType,
  GetGameScoresheetStatsOutputType,
  GetGameScoresheetStatsOverallPlayerSchemaType,
  GetGameScoresheetStatsPlayerSchemaType,
  GetGameScoresheetStatsRoundSchemaType,
} from "../../routers/game/game.output";
import type {
  AggregatedRound,
  AggregatedRoundPlayer,
  AggregatedScoresheetFamily,
  AggregatedScoresheetMap,
  GamePlayerStatsAccEntry,
  GamePlayerStatsPlayerImage,
  MatchResult,
  MatchResultByPlayerEntry,
} from "./game-stats.service.types";
import type {
  GetGamePlayerStatsArgs,
  GetGameScoresheetStatsArgs,
  GetGameStatsHeaderArgs,
} from "./game.service.types";
import { gameStatsRepository } from "../../repositories/game/game-stats.repository";
import { gameRepository } from "../../repositories/game/game.repository";
import { playerRepository } from "../../repositories/player/player.repository";
import { mapPlayerImageRowWithLogging } from "../../utils/image";

const sharedPlayerTypes = new Set(["shared", "linked"]);

class GameStatsService {
  public async getGameStatsHeader(
    args: GetGameStatsHeaderArgs,
  ): Promise<GetGameStatsHeaderOutputType> {
    const { input, ctx } = args;

    await this.assertGameAccessible(input, ctx.userId);

    const userPlayerId = await playerRepository.getUserPlayerIdForUser({
      userId: ctx.userId,
    });
    if (userPlayerId === null) {
      return {
        winRate: 0,
        avgPlaytime: 0,
        totalPlaytime: 0,
        userTotalPlaytime: 0,
        userAvgPlaytime: 0,
        overallMatchesPlayed: 0,
        userMatchesPlayed: 0,
      };
    }

    const stats = await gameStatsRepository.getGameStatsHeaderData({
      input,
      userId: ctx.userId,
      userPlayerId,
    });

    const winRate =
      stats.userMatchesPlayed > 0
        ? (stats.userWins / stats.userMatchesPlayed) * 100
        : 0;

    return {
      winRate: Number(Number(winRate).toFixed(2)),
      avgPlaytime: Number(Number(stats.avgPlaytime).toFixed(0)),
      totalPlaytime: Number(stats.totalPlaytime),
      userTotalPlaytime: Number(stats.userTotalPlaytime),
      userAvgPlaytime: Number(Number(stats.userAvgPlaytime).toFixed(0)),
      overallMatchesPlayed: Number(stats.overallMatchesPlayed),
      userMatchesPlayed: Number(stats.userMatchesPlayed),
    };
  }

  public async getGamePlayerStats(
    args: GetGamePlayerStatsArgs,
  ): Promise<GetGamePlayerStatsOutputType> {
    const { input, ctx } = args;

    await this.assertGameAccessible(input, ctx.userId);

    const matchPlayers = await gameStatsRepository.getGamePlayerStatsData({
      input,
      userId: ctx.userId,
    });

    const acc = new Map<string, GamePlayerStatsAccEntry>();

    for (const mp of matchPlayers) {
      const key = `${mp.playerId}`;
      let p = acc.get(key);
      if (!p) {
        let playerImage: Awaited<
          ReturnType<typeof mapPlayerImageRowWithLogging>
        > | null = null;
        if (mp.image !== null) {
          playerImage = await mapPlayerImageRowWithLogging({
            ctx,
            input: {
              image: mp.image,
              playerId: mp.playerId,
            },
          });
          if (playerImage === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Player image mapping failed for playerId ${mp.playerId}, image id ${mp.image.id}.`,
            });
          }
        }
        const imageForStats: GamePlayerStatsPlayerImage | null =
          mp.image === null || playerImage === null
            ? null
            : { id: mp.image.id, ...playerImage };
        if (sharedPlayerTypes.has(mp.type)) {
          if (mp.sharedId === null) {
            continue;
          }
          p = {
            sharedId: mp.sharedId,
            type: "shared",
            name: mp.name,
            image: imageForStats,
            coopMatches: 0,
            competitiveMatches: 0,
            coopWins: 0,
            competitiveWins: 0,
          };
        } else {
          p = {
            id: mp.playerId,
            type: "original",
            name: mp.name,
            image: imageForStats,
            coopMatches: 0,
            competitiveMatches: 0,
            coopWins: 0,
            competitiveWins: 0,
          };
        }
        acc.set(key, p);
      }
      const entry = acc.get(key);
      if (!entry) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Game player stats accumulator missing entry for key ${key} (playerId ${mp.playerId}).`,
        });
      }
      if (mp.isCoop) {
        entry.coopMatches++;
        if (mp.winner) entry.coopWins++;
      } else {
        entry.competitiveMatches++;
        if (mp.winner) entry.competitiveWins++;
      }
    }

    const players = Array.from(acc.values()).map((p) =>
      Object.assign({}, p, {
        coopWinRate: p.coopMatches > 0 ? p.coopWins / p.coopMatches : 0,
        competitiveWinRate:
          p.competitiveMatches > 0
            ? p.competitiveWins / p.competitiveMatches
            : 0,
      }),
    );

    return { players };
  }

  public async getGameScoresheetStats(
    args: GetGameScoresheetStatsArgs,
  ): Promise<GetGameScoresheetStatsOutputType> {
    const { input, ctx } = args;

    await this.assertGameAccessible(input, ctx.userId);

    const rawData = await gameStatsRepository.getGameScoresheetStatsData({
      input,
      userId: ctx.userId,
    });

    if (rawData.length === 0) return [];

    const scoresheetMap = this.aggregateScoresheetData(rawData);
    return this.calculateScoresheetStats(scoresheetMap);
  }

  private async assertGameAccessible(
    input: GetGameStatsHeaderArgs["input"],
    userId: string,
  ) {
    if (input.type === "original") {
      const returnedGame = await gameRepository.getGameWithLinkedGames({
        id: input.id,
        createdBy: userId,
      });
      if (!returnedGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found.",
        });
      }
      return returnedGame;
    }

    const returnedSharedGame = await gameRepository.getSharedGame({
      id: input.sharedGameId,
      sharedWithId: userId,
    });
    if (!returnedSharedGame) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared game not found.",
      });
    }
    return returnedSharedGame;
  }

  private calculateStdDev(scores: number[]): number | null {
    if (scores.length < 2) return null;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;
    return Math.sqrt(variance);
  }

  private aggregateScoresheetData(
    rawData: Awaited<
      ReturnType<typeof gameStatsRepository.getGameScoresheetStatsData>
    >,
  ): AggregatedScoresheetMap {
    const scoresheetMap = new Map<string, AggregatedScoresheetFamily>();

    for (const row of rawData) {
      let scoresheet = scoresheetMap.get(row.analyticsGroupingKey);
      if (!scoresheet) {
        scoresheet = {
          analyticsGroupingScoresheetId: row.analyticsGroupingScoresheetId,
          analyticsGroupingScoresheetSourceType:
            row.analyticsGroupingScoresheetSourceType,
          analyticsGroupingKey: row.analyticsGroupingKey,
          linkageState: row.linkageState,
          name: row.analyticsScoresheetName,
          isCoop: row.analyticsScoresheetIsCoop,
          targetScore: row.analyticsScoresheetTargetScore,
          roundsScore: row.analyticsScoresheetRoundsScore,
          winCondition: row.analyticsScoresheetWinCondition,
          isDefault: row.analyticsScoresheetIsDefault,
          permission: row.analyticsScoresheetPermission ?? null,
          rounds: new Map<string, AggregatedRound>(),
          matchResultsByPlayer: new Map<string, MatchResultByPlayerEntry>(),
          contributingVisibleScoresheets: new Map(),
          contributingMatchIds: new Set<number>(),
        };
        scoresheetMap.set(row.analyticsGroupingKey, scoresheet);
      }

      const contributingKey = `${row.visibleScoresheetSourceType}:${row.visibleScoresheetId}`;
      const contributor = scoresheet.contributingVisibleScoresheets.get(
        contributingKey,
      ) ?? {
        visibleScoresheetId: row.visibleScoresheetId,
        visibleScoresheetSourceType: row.visibleScoresheetSourceType,
        name: row.visibleScoresheetName,
        matchIds: new Set<number>(),
      };
      contributor.matchIds.add(row.matchId);
      scoresheet.contributingVisibleScoresheets.set(
        contributingKey,
        contributor,
      );
      scoresheet.contributingMatchIds.add(row.matchId);

      let round = scoresheet.rounds.get(row.analyticsGroupingRoundKey);
      if (!round) {
        round = {
          id: row.analyticsGroupingRoundId,
          key: row.analyticsGroupingRoundKey,
          name: row.analyticsRoundName,
          type: row.analyticsRoundType,
          order: row.analyticsRoundOrder,
          color: row.analyticsRoundColor,
          lookup: row.analyticsRoundLookup,
          modifier: row.analyticsRoundModifier,
          score: row.analyticsRoundScore,
          players: new Map<string, AggregatedRoundPlayer>(),
          allScores: [],
          allChecked: 0,
          winningRoundScores: [],
          winningCheckedCount: 0,
          winningTotalPlays: 0,
        };
        scoresheet.rounds.set(row.analyticsGroupingRoundKey, round);
      }

      const playerType = sharedPlayerTypes.has(row.playerType)
        ? "shared"
        : "original";
      const playerKey = `${playerType}-${row.playerId}`;
      let player = round.players.get(playerKey);
      if (!player) {
        player = {
          playerId: row.playerId,
          playerSharedId: row.playerSharedId,
          playerLinkedId: row.playerLinkedId,
          name: row.playerName,
          type: playerType,
          scores: [],
          plays: 0,
        };
        round.players.set(playerKey, player);
      }

      if (row.roundPlayerScore !== null) {
        player.scores.push({
          date: row.matchDate,
          score: row.roundPlayerScore,
        });
        player.plays++;
        round.allScores.push(row.roundPlayerScore);
        if (round.type === "Checkbox" && row.roundPlayerScore > 0) {
          round.allChecked++;
        }
      } else if (round.type === "Checkbox") {
        player.scores.push({
          date: row.matchDate,
          score: null,
        });
        player.plays++;
      }

      if (row.matchPlayerWinner) {
        if (round.type === "Numeric" && row.roundPlayerScore !== null) {
          round.winningRoundScores.push(row.roundPlayerScore);
        } else if (round.type === "Checkbox") {
          round.winningTotalPlays++;
          if (row.roundPlayerScore !== null && row.roundPlayerScore > 0) {
            round.winningCheckedCount++;
          }
        }
      }

      let matchPlayerEntry = scoresheet.matchResultsByPlayer.get(playerKey);
      if (!matchPlayerEntry) {
        const image =
          row.playerImageName != null
            ? {
                name: row.playerImageName,
                url: row.playerImageUrl,
                type: row.playerImageType ?? "file",
                usageType: "player" as const,
              }
            : null;
        matchPlayerEntry = {
          type: player.type,
          playerId: row.playerId,
          playerSharedId: row.playerSharedId,
          name: row.playerName,
          image,
          isUser: row.playerIsUser,
          matches: new Map<number, MatchResult>(),
        };
        scoresheet.matchResultsByPlayer.set(playerKey, matchPlayerEntry);
      }
      matchPlayerEntry.matches.set(row.matchId, {
        date: row.matchDate,
        score: row.matchPlayerScore,
        winner: row.matchPlayerWinner ?? false,
      });
    }

    return scoresheetMap;
  }

  private calculateScoresheetStats(
    scoresheetMap: AggregatedScoresheetMap,
  ): GetGameScoresheetStatsOutputType {
    const result: GetGameScoresheetStatsOutputType = [];

    for (const scoresheet of scoresheetMap.values()) {
      const rounds: GetGameScoresheetStatsRoundSchemaType[] = [];

      for (const round of scoresheet.rounds.values()) {
        let avgScore: number | null = null;
        let volatility: number | null = null;
        let checkRate: number | null = null;
        let winningAvgScore: number | null = null;
        let winningCheckRate: number | null = null;

        if (round.type === "Numeric") {
          avgScore =
            round.allScores.length > 0
              ? round.allScores.reduce((a, b) => a + b, 0) /
                round.allScores.length
              : null;
          volatility = this.calculateStdDev(round.allScores);
          winningAvgScore =
            round.winningRoundScores.length > 0
              ? round.winningRoundScores.reduce((a, b) => a + b, 0) /
                round.winningRoundScores.length
              : null;
        } else {
          const totalPlays = Array.from(round.players.values()).reduce(
            (sum, player) => sum + player.plays,
            0,
          );
          checkRate =
            totalPlays > 0 ? (round.allChecked / totalPlays) * 100 : null;
          winningCheckRate =
            round.winningTotalPlays > 0
              ? (round.winningCheckedCount / round.winningTotalPlays) * 100
              : null;
        }

        const players: GetGameScoresheetStatsPlayerSchemaType[] = Array.from(
          round.players.values(),
        )
          .map<GetGameScoresheetStatsPlayerSchemaType | null>((player) => {
            let avgScore: number | null = null;
            let bestScore: number | null = null;
            let worstScore: number | null = null;
            let checkRate: number | null = null;

            if (round.type === "Numeric") {
              const validScores = player.scores
                .map((p) => p.score)
                .filter((p): p is number => p !== null);

              if (validScores.length > 0) {
                if (scoresheet.winCondition === "Lowest Score") {
                  bestScore = Math.min(...validScores);
                  worstScore = Math.max(...validScores);
                } else {
                  bestScore = Math.max(...validScores);
                  worstScore = Math.min(...validScores);
                }
                avgScore =
                  validScores.reduce((a, b) => a + b, 0) / validScores.length;
              }
            } else {
              const checkedCount = player.scores.filter(
                (p) => p.score !== null && p.score > 0,
              ).length;
              checkRate =
                player.plays > 0 ? (checkedCount / player.plays) * 100 : null;
            }

            if (player.type === "original") {
              return {
                type: "original",
                playerId: player.playerId,
                name: player.name,
                avgScore,
                bestScore,
                worstScore,
                checkRate,
                plays: player.plays,
                scores: player.scores,
              };
            }

            if (!player.playerSharedId) {
              return null;
            }

            return {
              type: "shared",
              sharedId: player.playerSharedId,
              name: player.name,
              avgScore,
              bestScore,
              worstScore,
              checkRate,
              plays: player.plays,
              scores: player.scores,
            };
          })
          .filter(
            (p): p is GetGameScoresheetStatsPlayerSchemaType => p !== null,
          );

        rounds.push({
          id: round.id,
          name: round.name,
          type: round.type,
          order: round.order,
          color: round.color,
          lookup: round.lookup,
          modifier: round.modifier,
          score: round.score,
          avgScore,
          volatility,
          winningAvgScore: round.type === "Numeric" ? winningAvgScore : null,
          checkRate,
          winningCheckRate: round.type === "Checkbox" ? winningCheckRate : null,
          players,
        });
      }

      rounds.sort((a, b) => a.order - b.order);

      const overallPlayers: GetGameScoresheetStatsOverallPlayerSchemaType[] =
        [];
      for (const p of scoresheet.matchResultsByPlayer.values()) {
        const matchList = Array.from(p.matches.values()).toSorted(
          (a, b) => a.date.getTime() - b.date.getTime(),
        );
        const numMatches = matchList.length;
        const wins = matchList.filter((m) => m.winner).length;
        const winRate = numMatches > 0 ? wins / numMatches : 0;
        const scores = matchList.map((m) => ({
          date: m.date,
          score: m.score,
          isWin: m.winner,
        }));
        const validScores = matchList
          .map((m) => m.score)
          .filter((x): x is number => x !== null);
        let avgScore: number | null = null;
        let bestScore: number | null = null;
        let worstScore: number | null = null;
        if (validScores.length > 0) {
          avgScore =
            validScores.reduce((a, b) => a + b, 0) / validScores.length;
          if (scoresheet.winCondition === "Lowest Score") {
            bestScore = Math.min(...validScores);
            worstScore = Math.max(...validScores);
          } else {
            bestScore = Math.max(...validScores);
            worstScore = Math.min(...validScores);
          }
        }
        if (p.type === "original") {
          overallPlayers.push({
            type: "original",
            playerId: p.playerId,
            name: p.name,
            numMatches,
            wins,
            winRate,
            avgScore,
            bestScore,
            worstScore,
            image: p.image,
            isUser: p.isUser,
            scores,
          });
        } else if (p.playerSharedId !== null) {
          overallPlayers.push({
            type: "shared",
            sharedId: p.playerSharedId,
            name: p.name,
            numMatches,
            wins,
            winRate,
            avgScore,
            bestScore,
            worstScore,
            image: p.image,
            isUser: p.isUser,
            scores,
          });
        }
      }

      const allFinalScores: number[] = [];
      const winningFinalScores: number[] = [];
      for (const p of scoresheet.matchResultsByPlayer.values()) {
        for (const m of p.matches.values()) {
          if (m.score !== null) {
            allFinalScores.push(m.score);
            if (m.winner) {
              winningFinalScores.push(m.score);
            }
          }
        }
      }
      const sheetAvgScore =
        allFinalScores.length > 0
          ? allFinalScores.reduce((a, b) => a + b, 0) / allFinalScores.length
          : null;
      const sheetWinningAvgScore =
        winningFinalScores.length > 0
          ? winningFinalScores.reduce((a, b) => a + b, 0) /
            winningFinalScores.length
          : null;

      const contributingVisibleScoresheets = Array.from(
        scoresheet.contributingVisibleScoresheets.values(),
      )
        .map((entry) => ({
          visibleScoresheetId: entry.visibleScoresheetId,
          visibleScoresheetSourceType: entry.visibleScoresheetSourceType,
          name: entry.name,
          matchCount: entry.matchIds.size,
        }))
        .toSorted((a, b) => a.name.localeCompare(b.name));

      if (scoresheet.analyticsGroupingScoresheetSourceType === "local") {
        result.push({
          type: "original",
          id: scoresheet.analyticsGroupingScoresheetId,
          name: scoresheet.name,
          isDefault: scoresheet.isDefault,
          plays: scoresheet.contributingMatchIds.size,
          avgScore: sheetAvgScore,
          winningAvgScore: sheetWinningAvgScore,
          analyticsGroupingScoresheetId:
            scoresheet.analyticsGroupingScoresheetId,
          analyticsGroupingScoresheetSourceType:
            scoresheet.analyticsGroupingScoresheetSourceType,
          analyticsGroupingKey: scoresheet.analyticsGroupingKey,
          linkageState: scoresheet.linkageState,
          contributingVisibleScoresheets,
          contributingMatchCount: scoresheet.contributingMatchIds.size,
          winCondition: scoresheet.winCondition,
          isCoop: scoresheet.isCoop,
          roundsScore: scoresheet.roundsScore,
          targetScore: scoresheet.targetScore,
          players: overallPlayers,
          rounds,
        });
      } else {
        result.push({
          type: "shared",
          sharedId: scoresheet.analyticsGroupingScoresheetId,
          name: scoresheet.name,
          permission: scoresheet.permission ?? "view",
          isDefault: scoresheet.isDefault,
          plays: scoresheet.contributingMatchIds.size,
          avgScore: sheetAvgScore,
          winningAvgScore: sheetWinningAvgScore,
          analyticsGroupingScoresheetId:
            scoresheet.analyticsGroupingScoresheetId,
          analyticsGroupingScoresheetSourceType:
            scoresheet.analyticsGroupingScoresheetSourceType,
          analyticsGroupingKey: scoresheet.analyticsGroupingKey,
          linkageState: scoresheet.linkageState,
          contributingVisibleScoresheets,
          contributingMatchCount: scoresheet.contributingMatchIds.size,
          winCondition: scoresheet.winCondition,
          isCoop: scoresheet.isCoop,
          roundsScore: scoresheet.roundsScore,
          targetScore: scoresheet.targetScore,
          players: overallPlayers,
          rounds,
        });
      }
    }

    return result.toSorted((a, b) =>
      a.name === b.name
        ? a.analyticsGroupingKey.localeCompare(b.analyticsGroupingKey)
        : a.name.localeCompare(b.name),
    );
  }
}

export const gameStatsService = new GameStatsService();
