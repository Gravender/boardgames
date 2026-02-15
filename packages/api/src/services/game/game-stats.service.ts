import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";

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
  AggregatedScoresheet,
  AggregatedScoresheetMap,
  GamePlayerStatsAccEntry,
  GetGameScoresheetStatsScoreSheetType,
  MatchResult,
  MatchResultByPlayerEntry,
  MatchRoundEntry,
} from "./game-stats.service.types";
import type {
  GetGamePlayerStatsArgs,
  GetGameScoresheetStatsArgs,
  GetGameStatsHeaderArgs,
} from "./game.service.types";
import { gameStatsRepository } from "../../repositories/game/game-stats.repository";
import { gameRepository } from "../../repositories/game/game.repository";
import { scoresheetRepository } from "../../repositories/scoresheet/scoresheet.repository";

/** One shared round from getAllSharedScoresheetsWithRounds (round + optional linked id). */
type SharedRoundWithRound = Awaited<
  ReturnType<typeof scoresheetRepository.getAllSharedScoresheetsWithRounds>
>[number]["sharedRounds"][number];

/** One shared scoresheet from getAllSharedScoresheetsWithRounds. */
type SharedScoresheetWithRounds = Awaited<
  ReturnType<typeof scoresheetRepository.getAllSharedScoresheetsWithRounds>
>[number];

/** One scoresheet from getAllScoresheetsWithRounds. */
type OriginalScoresheetWithRounds = Awaited<
  ReturnType<typeof scoresheetRepository.getAllScoresheetsWithRounds>
>[number];

function buildOriginalScoresheetEntry(
  originalScoresheet: OriginalScoresheetWithRounds,
): Extract<GetGameScoresheetStatsScoreSheetType[number], { type: "original" }> {
  return {
    type: "original",
    scoresheetId: originalScoresheet.id,
    canonicalScoresheetId: originalScoresheet.parentId ?? originalScoresheet.id,
    name: originalScoresheet.name,
    isDefault: originalScoresheet.type === "Default",
    targetScore: originalScoresheet.targetScore,
    roundsScore: originalScoresheet.roundsScore,
    winCondition: originalScoresheet.winCondition,
    isCoop: originalScoresheet.isCoop,
    rounds: originalScoresheet.rounds.map((round) => ({
      id: round.id,
      name: round.name,
      type: round.type,
      order: round.order,
      score: round.score,
      color: round.color,
      lookup: round.lookup,
      modifier: round.modifier,
    })),
  };
}

function mapSharedRounds(
  sharedRounds: SharedRoundWithRound[],
): GetGameScoresheetStatsScoreSheetType[number]["rounds"] {
  return sharedRounds.map((sharedRound) => {
    const round = sharedRound.round;
    const id = sharedRound.linkedRoundId ?? round.id;
    return {
      id,
      name: round.name,
      type: round.type,
      order: round.order,
      score: round.score,
      color: round.color,
      lookup: round.lookup,
      modifier: round.modifier,
    };
  });
}

function buildSharedScoresheetEntry(
  sharedScoresheet: SharedScoresheetWithRounds,
  rounds: GetGameScoresheetStatsScoreSheetType[number]["rounds"],
): GetGameScoresheetStatsScoreSheetType[number] {
  const s = sharedScoresheet.scoresheet;
  return {
    type: "shared",
    scoresheetId: s.id,
    canonicalScoresheetId: s.parentId ?? s.id,
    sharedId: sharedScoresheet.id,
    name: s.name,
    isDefault: sharedScoresheet.isDefault,
    permission: sharedScoresheet.permission,
    isCoop: s.isCoop,
    targetScore: s.targetScore,
    roundsScore: s.roundsScore,
    winCondition: s.winCondition,
    rounds,
  };
}

async function collectScoresheetsForOriginalGame(
  userId: string,
  gameId: number,
  tx: TransactionType,
): Promise<GetGameScoresheetStatsScoreSheetType> {
  const returnedGame = await gameRepository.getGameWithLinkedGames(
    { id: gameId, createdBy: userId },
    tx,
  );
  if (!returnedGame) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Game not found.",
    });
  }
  const originalScoresheets =
    await scoresheetRepository.getAllScoresheetsWithRounds(
      { createdBy: userId, gameId: returnedGame.id },
      tx,
    );
  const sharedScoresheets =
    await scoresheetRepository.getAllSharedScoresheetsWithRounds(
      {
        sharedWithId: userId,
        sharedGameIds: returnedGame.linkedGames.map((lg) => lg.id),
      },
      tx,
    );
  const scoresheets: GetGameScoresheetStatsScoreSheetType = [];
  for (const s of originalScoresheets) {
    scoresheets.push(buildOriginalScoresheetEntry(s));
  }
  for (const s of sharedScoresheets) {
    scoresheets.push(
      buildSharedScoresheetEntry(s, mapSharedRounds(s.sharedRounds)),
    );
  }
  return scoresheets;
}

async function collectScoresheetsForSharedGame(
  userId: string,
  sharedGameId: number,
  tx: TransactionType,
): Promise<GetGameScoresheetStatsScoreSheetType> {
  const returnedSharedGame = await gameRepository.getSharedGame(
    { id: sharedGameId, sharedWithId: userId },
    tx,
  );
  if (!returnedSharedGame) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Shared game not found.",
    });
  }
  const sharedScoresheets =
    await scoresheetRepository.getAllSharedScoresheetsWithRounds(
      { sharedWithId: userId, sharedGameIds: [returnedSharedGame.id] },
      tx,
    );
  const scoresheets: GetGameScoresheetStatsScoreSheetType = [];
  for (const s of sharedScoresheets) {
    scoresheets.push(
      buildSharedScoresheetEntry(s, mapSharedRounds(s.sharedRounds)),
    );
  }
  return scoresheets;
}

class GameStatsService {
  public async getGameStatsHeader(
    args: GetGameStatsHeaderArgs,
  ): Promise<GetGameStatsHeaderOutputType> {
    return gameStatsRepository.getGameStatsHeader({
      input: args.input,
      userId: args.ctx.userId,
    });
  }

  public async getGamePlayerStats(
    args: GetGamePlayerStatsArgs,
  ): Promise<GetGamePlayerStatsOutputType> {
    const matchPlayers = await gameStatsRepository.getGamePlayerStatsData({
      input: args.input,
      userId: args.ctx.userId,
    });

    const acc = new Map<string, GamePlayerStatsAccEntry>();

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

    const response = await db.transaction(async (tx) => {
      const scoresheets =
        input.type === "original"
          ? await collectScoresheetsForOriginalGame(ctx.userId, input.id, tx)
          : await collectScoresheetsForSharedGame(
              ctx.userId,
              input.sharedGameId,
              tx,
            );
      const rawData = await gameStatsRepository.getGameScoresheetStatsData({
        input,
        userId: ctx.userId,
        tx,
      });
      return { scoresheets, rawData };
    });

    if (response.rawData.length === 0) return [];

    const scoresheetMap = this.aggregateScoresheetData(response.rawData);
    return this.calculateScoresheetStats(scoresheetMap, response.scoresheets);
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
    const scoresheetMap = new Map<number, AggregatedScoresheet>();

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
          rounds: new Map<number, AggregatedRound>(),
          scoresheetRoundsScore: row.scoresheetRoundsScore,
          scoresheetWinCondition: row.scoresheetWinCondition,
          matchResultsByPlayer: new Map<string, MatchResultByPlayerEntry>(),
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
          players: new Map<string, AggregatedRoundPlayer>(),
          allScores: [],
          allChecked: 0,
          matchRounds: new Map<number, MatchRoundEntry[]>(),
          winningRoundScores: [],
          winningCheckedCount: 0,
          winningTotalPlays: 0,
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

      // Winning round stats: only when this player won the match
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

      // Track match-level result per player for overall scoresheet stats (final score, winner)
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
    accessibleScoresheets: GetGameScoresheetStatsScoreSheetType,
  ): GetGameScoresheetStatsOutputType {
    const result: GetGameScoresheetStatsOutputType = [];

    // Stats are keyed by canonical scoresheet id (parent or self); match each
    // accessible scoresheet to its canonical stats and output one item per accessible entry.
    for (const s of accessibleScoresheets) {
      const scoresheet = scoresheetMap.get(s.canonicalScoresheetId);
      if (!scoresheet) continue;

      // Only include rounds that match this scoresheet's round list (linked or parent id).
      const allowedRoundIds = new Set(s.rounds.map((r) => r.id));

      const rounds: GetGameScoresheetStatsRoundSchemaType[] = [];

      for (const [roundId, round] of scoresheet.rounds) {
        if (!allowedRoundIds.has(roundId)) continue;
        // Calculate round-level stats based on round type
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
              const checkedCount = player.scores.filter(
                (p) => p.score !== null && p.score > 0,
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
            }
            const sharedId = player.playerSharedId;
            if (!sharedId) return null;
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
          })
          .filter(
            (p): p is GetGameScoresheetStatsPlayerSchemaType => p !== null,
          );

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
          winningAvgScore: round.type === "Numeric" ? winningAvgScore : null,
          checkRate,
          winningCheckRate: round.type === "Checkbox" ? winningCheckRate : null,
          players,
        });
      }

      rounds.sort((a, b) => a.order - b.order);

      // Overall stats per player: match count, wins, final score per match (N/A when no score)
      const overallPlayers: GetGameScoresheetStatsOverallPlayerSchemaType[] =
        [];
      for (const p of scoresheet.matchResultsByPlayer.values()) {
        const matchList = Array.from(p.matches.values()).sort(
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
          if (scoresheet.scoresheetWinCondition === "Lowest Score") {
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

      const plays = (() => {
        const matchIds = new Set<number>();
        for (const p of scoresheet.matchResultsByPlayer.values()) {
          for (const matchId of p.matches.keys()) {
            matchIds.add(matchId);
          }
        }
        return matchIds.size;
      })();

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

      if (s.type === "original") {
        result.push({
          type: "original",
          id: s.scoresheetId,
          name: s.name,
          isDefault: s.isDefault,
          plays,
          avgScore: sheetAvgScore,
          winningAvgScore: sheetWinningAvgScore,
          winCondition: scoresheet.scoresheetWinCondition,
          isCoop: s.isCoop,
          roundsScore: scoresheet.scoresheetRoundsScore,
          targetScore: s.targetScore,
          players: overallPlayers,
          rounds,
        });
      } else {
        result.push({
          type: "shared",
          sharedId: s.sharedId,
          name: s.name,
          permission: s.permission,
          isDefault: s.isDefault,
          plays,
          avgScore: sheetAvgScore,
          winningAvgScore: sheetWinningAvgScore,
          winCondition: scoresheet.scoresheetWinCondition,
          isCoop: s.isCoop,
          roundsScore: scoresheet.scoresheetRoundsScore,
          targetScore: s.targetScore,
          players: overallPlayers,
          rounds,
        });
      }
    }

    return result;
  }
}

export const gameStatsService = new GameStatsService();
