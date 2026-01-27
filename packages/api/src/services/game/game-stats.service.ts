import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import type { GetGameStatsHeaderOutputType } from "../../repositories/game/game.repository.types";
import type {
  GetGamePlayerStatsOutputType,
  GetGameScoresheetStatsOutputType,
  GetGameScoresheetStatsPlayerSchemaType,
  GetGameScoresheetStatsRoundSchemaType,
} from "../../routers/game/game.output";
import type { GetGameScoresheetStatsScoreSheetType } from "./game-stats.service.types";
import type {
  GetGamePlayerStatsArgs,
  GetGameScoresheetStatsArgs,
  GetGameStatsHeaderArgs,
} from "./game.service.types";
import { gameRepository } from "../../repositories/game/game.repository";
import { scoresheetRepository } from "../../routers/scoresheet/repository/scoresheet.repository";

class GameStatsService {
  public async getGameStatsHeader(
    args: GetGameStatsHeaderArgs,
  ): Promise<GetGameStatsHeaderOutputType> {
    return gameRepository.getGameStatsHeader({
      input: args.input,
      userId: args.ctx.userId,
    });
  }

  public async getGamePlayerStats(
    args: GetGamePlayerStatsArgs,
  ): Promise<GetGamePlayerStatsOutputType> {
    const matchPlayers = await gameRepository.getGamePlayerStatsData({
      input: args.input,
      userId: args.ctx.userId,
    });

    const acc = new Map<
      string,
      | {
          id: number;
          type: "original";
          name: string;
          image: {
            name: string;
            url: string | null;
            type: "file" | "svg";
            usageType: "player";
          } | null;
          coopMatches: number;
          competitiveMatches: number;
          coopWins: number;
          competitiveWins: number;
        }
      | {
          sharedId: number;
          type: "shared";
          name: string;
          image: {
            name: string;
            url: string | null;
            type: "file" | "svg";
            usageType: "player";
          } | null;
          coopMatches: number;
          competitiveMatches: number;
          coopWins: number;
          competitiveWins: number;
        }
    >();

    for (const mp of matchPlayers) {
      const key = `${mp.playerId}`;
      let p = acc.get(key);
      if (!p) {
        if (mp.image !== null && mp.image.usageType !== "player") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Image is not of type player.",
          });
        }
        if (mp.type === "shared") {
          if (mp.sharedId === null) {
            continue;
          }
          p = {
            sharedId: mp.sharedId,
            type: "shared",
            name: mp.name,
            image: mp.image
              ? {
                  name: mp.image.name,
                  url: mp.image.url,
                  type: mp.image.type,
                  usageType: "player" as const,
                }
              : null,
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
            image: mp.image
              ? {
                  name: mp.image.name,
                  url: mp.image.url,
                  type: mp.image.type,
                  usageType: "player" as const,
                }
              : null,
            coopMatches: 0,
            competitiveMatches: 0,
            coopWins: 0,
            competitiveWins: 0,
          };
        }
        acc.set(key, p);
      }
      if (mp.isCoop) {
        p.coopMatches++;
        if (mp.winner) p.coopWins++;
      } else {
        p.competitiveMatches++;
        if (mp.winner) p.competitiveWins++;
      }
    }

    const players = Array.from(acc.values()).map((p) => ({
      ...p,
      coopWinRate: p.coopMatches > 0 ? p.coopWins / p.coopMatches : 0,
      competitiveWinRate:
        p.competitiveMatches > 0 ? p.competitiveWins / p.competitiveMatches : 0,
    }));

    return { players };
  }

  public async getGameScoresheetStats(
    args: GetGameScoresheetStatsArgs,
  ): Promise<GetGameScoresheetStatsOutputType> {
    const { input, ctx } = args;

    // Get accessible scoresheets using the service
    const response = await db.transaction(async (tx) => {
      const scoresheets: GetGameScoresheetStatsScoreSheetType = [];
      if (input.type === "original") {
        const returnedGame = await gameRepository.getGame(
          {
            id: input.id,
            createdBy: ctx.userId,
            with: {
              linkedGames: {
                where: {
                  sharedWithId: ctx.userId,
                },
              },
            },
          },
          tx,
        );
        if (!returnedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found.",
          });
        }
        const originalScoresheets = await scoresheetRepository.getAll(
          {
            createdBy: ctx.userId,
            gameId: returnedGame.id,
          },
          tx,
        );
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: ctx.userId,
            where: {
              sharedGameId: {
                in: returnedGame.linkedGames.map((lg) => lg.id),
              },
            },
          },
          tx,
        );
        for (const originalScoresheet of originalScoresheets) {
          scoresheets.push({
            scoresheetType: "original",
            scoresheetId: originalScoresheet.id,
            name: originalScoresheet.name,
            isDefault: originalScoresheet.type === "Default",
            targetScore: originalScoresheet.targetScore,
            roundsScore: originalScoresheet.roundsScore,
            winCondition: originalScoresheet.winCondition,
            isCoop: originalScoresheet.isCoop,
          });
        }
        for (const sharedScoresheet of sharedScoresheets) {
          scoresheets.push({
            scoresheetId: sharedScoresheet.scoresheet.id,
            scoresheetType: "shared",
            sharedId: sharedScoresheet.id,
            name: sharedScoresheet.scoresheet.name,
            isDefault: sharedScoresheet.isDefault,
            permission: sharedScoresheet.permission,
            isCoop: sharedScoresheet.scoresheet.isCoop,
            targetScore: sharedScoresheet.scoresheet.targetScore,
            roundsScore: sharedScoresheet.scoresheet.roundsScore,
            winCondition: sharedScoresheet.scoresheet.winCondition,
          });
        }
      } else {
        const returnedSharedGame = await gameRepository.getSharedGame(
          {
            id: input.sharedGameId,
            sharedWithId: ctx.userId,
          },
          tx,
        );
        if (!returnedSharedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared game not found.",
          });
        }
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: ctx.userId,
            where: {
              sharedGameId: returnedSharedGame.id,
            },
          },
          tx,
        );
        for (const sharedScoresheet of sharedScoresheets) {
          scoresheets.push({
            scoresheetId: sharedScoresheet.id,
            scoresheetType: "shared",
            sharedId: sharedScoresheet.id,
            name: sharedScoresheet.scoresheet.name,
            isDefault: sharedScoresheet.isDefault,
            permission: sharedScoresheet.permission,
            isCoop: sharedScoresheet.scoresheet.isCoop,
            targetScore: sharedScoresheet.scoresheet.targetScore,
            roundsScore: sharedScoresheet.scoresheet.roundsScore,
            winCondition: sharedScoresheet.scoresheet.winCondition,
          });
        }
      }

      const rawData = await gameRepository.getGameScoresheetStatsData({
        input,
        userId: ctx.userId,
        tx,
      });
      return {
        scoresheets,
        rawData,
      };
    });

    if (response.rawData.length === 0) {
      return [];
    }

    // First pass: aggregate data
    const scoresheetMap = this.aggregateScoresheetData(response.rawData);

    // Second pass: calculate stats
    return this.calculateScoresheetStats(
      scoresheetMap,
      response.scoresheets,
      input,
    );
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
      ReturnType<typeof gameRepository.getGameScoresheetStatsData>
    >,
  ): Map<
    number,
    {
      id: number;
      name: string;
      rounds: Map<
        number,
        {
          id: number;
          name: string;
          type: "Numeric" | "Checkbox";
          order: number;
          color: string | null;
          lookup: number | null;
          modifier: number | null;
          score: number;
          players: Map<
            string,
            {
              playerId: number;
              playerSharedId: number | null;
              playerLinkedId: number | null;
              name: string;
              type: "original" | "shared";
              scores: { date: Date; score: number | null }[];
              plays: number;
            }
          >;
          allScores: number[];
          allChecked: number;
          matchRounds: Map<
            number,
            {
              roundParentId: number;
              roundOrder: number;
              playerRounds: { score: number | null }[];
            }[]
          >;
        }
      >;
      scoresheetRoundsScore: "Aggregate" | "Manual" | "Best Of" | "None";
      scoresheetWinCondition:
        | "Manual"
        | "Highest Score"
        | "Lowest Score"
        | "No Winner"
        | "Target Score";
    }
  > {
    const scoresheetMap = new Map<
      number,
      {
        id: number;
        name: string;
        rounds: Map<
          number,
          {
            id: number;
            name: string;
            type: "Numeric" | "Checkbox";
            order: number;
            color: string | null;
            lookup: number | null;
            modifier: number | null;
            score: number;
            players: Map<
              string,
              {
                playerId: number;
                playerSharedId: number | null;
                playerLinkedId: number | null;
                name: string;
                type: "original" | "shared";
                scores: { date: Date; score: number | null }[];
                plays: number;
              }
            >;
            allScores: number[];
            allChecked: number;
            matchRounds: Map<
              number,
              {
                roundParentId: number;
                roundOrder: number;
                playerRounds: { score: number | null }[];
              }[]
            >;
          }
        >;
        scoresheetRoundsScore: "Aggregate" | "Manual" | "Best Of" | "None";
        scoresheetWinCondition:
          | "Manual"
          | "Highest Score"
          | "Lowest Score"
          | "No Winner"
          | "Target Score";
      }
    >();

    for (const row of rawData) {
      if (!row.scoresheetParentId || !row.roundParentId) continue;

      let scoresheet = scoresheetMap.get(row.scoresheetParentId);
      if (!scoresheet) {
        if (!row.scoresheetParentName) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Scoresheet parent name is required",
          });
        }
        scoresheet = {
          id: row.scoresheetParentId,
          name: row.scoresheetParentName,
          rounds: new Map(),
          scoresheetRoundsScore: row.scoresheetRoundsScore,
          scoresheetWinCondition: row.scoresheetWinCondition,
        };
        scoresheetMap.set(row.scoresheetParentId, scoresheet);
      }

      let round = scoresheet.rounds.get(row.roundParentId);
      if (!round) {
        if (!row.roundParentName) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Round parent name is required",
          });
        }
        round = {
          id: row.roundParentId,
          name: row.roundParentName,
          type: row.roundParentType,
          order: row.roundOrder,
          color: row.roundParentColor,
          lookup: row.roundParentLookup,
          modifier: row.roundParentModifier,
          score: row.roundParentScore,
          players: new Map(),
          allScores: [],
          allChecked: 0,
          matchRounds: new Map(),
        };
        scoresheet.rounds.set(row.roundParentId, round);
      }

      const playerKey = `${row.playerType}-${row.playerId}`;
      let player = round.players.get(playerKey);
      if (!player) {
        player = {
          playerId: row.playerId,
          playerSharedId: row.playerSharedId,
          playerLinkedId: row.playerLinkedId,
          name: row.playerName,
          type:
            row.playerType === "linked"
              ? "shared"
              : row.playerType === "not-shared"
                ? "original"
                : row.playerType,
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
        // For checkbox rounds, count if checked (score > 0 or non-null)
        if (round.type === "Checkbox" && row.roundPlayerScore > 0) {
          round.allChecked++;
        }
      } else if (round.type === "Checkbox") {
        // For checkbox, null might mean unchecked, but we still count the play
        player.scores.push({
          date: row.matchDate,
          score: null,
        });
        player.plays++;
      }

      // Track rounds per match for deciding round analysis
      let matchRounds = round.matchRounds.get(row.matchId);
      if (!matchRounds) {
        matchRounds = [];
        round.matchRounds.set(row.matchId, matchRounds);
      }
      let matchRound = matchRounds.find(
        (mr) => mr.roundParentId === row.roundParentId,
      );
      if (!matchRound) {
        matchRound = {
          roundParentId: row.roundParentId,
          roundOrder: row.roundOrder,
          playerRounds: [],
        };
        matchRounds.push(matchRound);
      }
      matchRound.playerRounds.push({ score: row.roundPlayerScore });
    }

    return scoresheetMap;
  }

  private calculateScoresheetStats(
    scoresheetMap: ReturnType<typeof this.aggregateScoresheetData>,
    accessibleScoresheets: GetGameScoresheetStatsScoreSheetType,
    input: GetGameScoresheetStatsArgs["input"],
  ): GetGameScoresheetStatsOutputType {
    const result: GetGameScoresheetStatsOutputType = [];

    for (const [scoresheetId, scoresheet] of scoresheetMap) {
      const rounds: GetGameScoresheetStatsRoundSchemaType[] = [];

      for (const [roundId, round] of scoresheet.rounds) {
        // Calculate round-level stats based on round type
        let avgScore: number | null = null;
        let volatility: number | null = null;
        let checkRate: number | null = null;

        if (round.type === "Numeric") {
          // For numeric rounds, calculate average and volatility
          avgScore =
            round.allScores.length > 0
              ? round.allScores.reduce((a, b) => a + b, 0) /
                round.allScores.length
              : null;
          volatility = this.calculateStdDev(round.allScores);
        } else {
          // For checkbox rounds, calculate check rate (percentage of times checked)
          const totalPlays = Array.from(round.players.values()).reduce(
            (sum, player) => sum + player.plays,
            0,
          );
          checkRate =
            totalPlays > 0 ? (round.allChecked / totalPlays) * 100 : null;
        }

        // Calculate player stats
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
                .map((s) => s.score)
                .filter((s): s is number => s !== null);

              if (validScores.length > 0) {
                if (scoresheet.scoresheetWinCondition === "Lowest Score") {
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
              // For checkbox rounds, calculate check rate (percentage of times checked)
              const checkedCount = player.scores.filter(
                (s) => s.score !== null && s.score > 0,
              ).length;
              checkRate =
                player.plays > 0 ? (checkedCount / player.plays) * 100 : null;
            }

            if (player.type === "original") {
              return {
                type: "original" as const,
                playerId: player.playerId,
                name: player.name,
                avgScore,
                bestScore,
                worstScore,
                checkRate,
                plays: player.plays,
                scores: player.scores,
              };
            } else {
              const sharedId = player.playerSharedId;
              if (!sharedId) {
                // Skip players without sharedId for shared type
                return null;
              }
              return {
                type: "shared" as const,
                sharedId,
                name: player.name,
                avgScore,
                bestScore,
                worstScore,
                checkRate,
                plays: player.plays,
                scores: player.scores,
              };
            }
          })
          .filter((p) => p !== null);

        rounds.push({
          id: roundId,
          name: round.name,
          type: round.type,
          order: round.order,
          color: round.color,
          lookup: round.lookup,
          modifier: round.modifier,
          score: round.score,
          avgScore,
          volatility,
          checkRate,
          players: players,
        });
      }

      // Sort rounds by order
      rounds.sort((a, b) => {
        return a.order - b.order;
      });

      // Determine if scoresheet is original or shared using pre-fetched data
      if (input.type === "original") {
        const parentScoresheet = accessibleScoresheets.find(
          (s) => s.scoresheetId === scoresheetId,
        );
        if (parentScoresheet) {
          if (parentScoresheet.scoresheetType === "original") {
            result.push({
              type: "original",
              id: scoresheetId,
              name: scoresheet.name,
              isDefault: parentScoresheet.isDefault,
              winCondition: scoresheet.scoresheetWinCondition,
              isCoop: parentScoresheet.isCoop,
              roundsScore: scoresheet.scoresheetRoundsScore,
              targetScore: parentScoresheet.targetScore,
              rounds,
            });
          } else {
            result.push({
              type: "shared",
              sharedId: parentScoresheet.sharedId,
              name: scoresheet.name,
              permission: parentScoresheet.permission,
              isDefault: parentScoresheet.isDefault,
              winCondition: scoresheet.scoresheetWinCondition,
              isCoop: parentScoresheet.isCoop,
              roundsScore: scoresheet.scoresheetRoundsScore,
              targetScore: parentScoresheet.targetScore,
              rounds,
            });
          }
        }
      } else {
        const parentScoresheet = accessibleScoresheets.find(
          (s) => s.scoresheetId === scoresheetId,
        );
        if (parentScoresheet) {
          if (parentScoresheet.scoresheetType === "shared") {
            result.push({
              type: "shared",
              sharedId: parentScoresheet.sharedId,
              name: scoresheet.name,
              permission: parentScoresheet.permission,
              isDefault: parentScoresheet.isDefault,
              winCondition: scoresheet.scoresheetWinCondition,
              isCoop: parentScoresheet.isCoop,
              roundsScore: scoresheet.scoresheetRoundsScore,
              targetScore: parentScoresheet.targetScore,
              rounds,
            });
          } else {
            result.push({
              type: "original",
              id: scoresheetId,
              name: scoresheet.name,
              isDefault: parentScoresheet.isDefault,
              winCondition: scoresheet.scoresheetWinCondition,
              isCoop: parentScoresheet.isCoop,
              roundsScore: scoresheet.scoresheetRoundsScore,
              targetScore: parentScoresheet.targetScore,
              rounds,
            });
          }
        }
      }
    }

    return result;
  }
}

export const gameStatsService = new GameStatsService();
