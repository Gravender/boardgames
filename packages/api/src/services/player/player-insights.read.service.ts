import { db } from "@board-games/db/client";
import type { TransactionType } from "@board-games/db/client";

import { assertFound } from "../../utils/databaseHelpers";
import type {
  GetPlayerCountStatsOutputType,
  GetPlayerFavoriteGamesOutputType,
  GetPlayerGameWinRateChartsOutputType,
  GetPlayerMatchHistoryTimelineOutputType,
  GetPlayerPerformanceSummaryOutputType,
  GetPlayerPlacementDistributionOutputType,
  GetPlayerPlayedWithGroupsOutputType,
  GetPlayerRecentMatchesOutputType,
  GetPlayerScoreTrendsOutputType,
  GetPlayerStreaksOutputType,
  GetPlayerTopRivalsOutputType,
  GetPlayerTopTeammatesOutputType,
  PlayerInsightsIdentityType,
  PlayerInsightsPlayedWithGroupType,
  PlayerInsightsTargetType,
} from "../../routers/player/player.output";
import type { PlayerInsightChronologicalRow } from "../../repositories/player/player-insights.repository";
import { playerInsightsRepository } from "../../repositories/player/player-insights.repository";
import { playerRepository } from "../../repositories/player/player.repository";
import { mapPlayerImageRowWithLogging } from "../../utils/image";
import { playerInsightsMatchQueryService } from "./player-insights-match-query.service";
import type { GetPlayerInsightsArgs } from "./player.service.types";

type InsightMatchRow = Awaited<
  ReturnType<typeof playerInsightsMatchQueryService.getPlayerInsightMatchRows>
>[number];

type InsightMatchParticipant = InsightMatchRow["participants"][number];

class PlayerInsightsReadService {
  private async getInsightsTarget(
    args: GetPlayerInsightsArgs,
    tx?: TransactionType,
  ): Promise<PlayerInsightsTargetType> {
    const { ctx, input } = args;
    if (input.type === "original") {
      const player = await playerRepository.getPlayer(
        {
          id: input.id,
          createdBy: ctx.userId,
        },
        tx,
      );
      assertFound(
        player,
        { userId: ctx.userId, value: input },
        "Player not found.",
      );
      return {
        type: "original",
        id: player.id,
        permissions: "edit",
      };
    }
    const sharedPlayer = await playerRepository.getSharedPlayer(
      {
        id: input.sharedPlayerId,
        sharedWithId: ctx.userId,
      },
      tx,
    );
    assertFound(
      sharedPlayer,
      { userId: ctx.userId, value: input },
      "Shared player not found.",
    );
    return {
      type: "shared",
      sharedPlayerId: sharedPlayer.id,
      permissions: sharedPlayer.permission,
    };
  }

  private async getRows(args: GetPlayerInsightsArgs) {
    const rows =
      await playerInsightsMatchQueryService.getPlayerInsightMatchRows(args);
    return rows.toSorted((a, b) => b.date.getTime() - a.date.getTime());
  }

  /** Matches SQL `isWinSql` / `isTieSql` in player-insights.repository.ts */
  private getOutcomeLabelFromFields(args: {
    outcomeWinner: boolean | null;
    outcomePlacement: number | null;
    outcomeScore: number | null;
  }): "win" | "loss" | "tie" {
    if (args.outcomeWinner === true) {
      return "win";
    }
    if (args.outcomePlacement === null && args.outcomeScore === null) {
      return "tie";
    }
    if (args.outcomePlacement === 1) {
      return "win";
    }
    return "loss";
  }

  private getOutcomeLabel(row: InsightMatchRow): "win" | "loss" | "tie" {
    return this.getOutcomeLabelFromFields({
      outcomeWinner: row.outcomeWinner,
      outcomePlacement: row.outcomePlacement,
      outcomeScore: row.outcomeScore,
    });
  }

  private getOutcomeLabelFromChronological(
    row: PlayerInsightChronologicalRow,
  ): "win" | "loss" | "tie" {
    return this.getOutcomeLabelFromFields({
      outcomeWinner: row.outcomeWinner,
      outcomePlacement: row.outcomePlacement,
      outcomeScore: row.outcomeScore,
    });
  }

  private getTargetParticipant(args: {
    row: InsightMatchRow;
    input: GetPlayerInsightsArgs["input"];
  }) {
    const { row, input } = args;
    if (input.type === "original") {
      return row.participants.find(
        (participant) => participant.playerId === input.id,
      );
    }
    return row.participants.find(
      (participant) => participant.sharedPlayerId === input.sharedPlayerId,
    );
  }

  private async toIdentity(
    participant: InsightMatchParticipant,
    ctx: GetPlayerInsightsArgs["ctx"],
  ): Promise<PlayerInsightsIdentityType> {
    if (
      participant.playerType === "shared" &&
      participant.sharedPlayerId !== null
    ) {
      return {
        type: "shared",
        sharedId: participant.sharedPlayerId,
        id: participant.playerId,
        name: participant.name,
        image: await mapPlayerImageRowWithLogging({
          ctx,
          input: {
            image: participant.image,
            playerId: participant.playerId,
          },
        }),
      };
    }
    return {
      type: "original",
      id: participant.playerId,
      name: participant.name,
      image: await mapPlayerImageRowWithLogging({
        ctx,
        input: {
          image: participant.image,
          playerId: participant.playerId,
        },
      }),
    };
  }

  private compareResults(args: {
    target: InsightMatchParticipant;
    other: InsightMatchParticipant;
  }): "win" | "loss" | "tie" {
    const { target, other } = args;
    if (target.winner === true && other.winner !== true) {
      return "win";
    }
    if (target.winner !== true && other.winner === true) {
      return "loss";
    }
    if (target.placement !== null && other.placement !== null) {
      if (target.placement < other.placement) {
        return "win";
      }
      if (target.placement > other.placement) {
        return "loss";
      }
    }
    return "tie";
  }

  private async buildPlayedWithGroups(args: {
    rows: InsightMatchRow[];
    input: GetPlayerInsightsArgs["input"];
    ctx: GetPlayerInsightsArgs["ctx"];
  }): Promise<PlayerInsightsPlayedWithGroupType[]> {
    const grouped = new Map<string, PlayerInsightsPlayedWithGroupType>();
    for (const row of args.rows) {
      const targetParticipant = this.getTargetParticipant({
        row,
        input: args.input,
      });
      if (!targetParticipant) {
        continue;
      }
      const filteredParticipants = row.participants.filter(
        (participant) => participant.playerId !== targetParticipant.playerId,
      );
      const members: PlayerInsightsIdentityType[] = [];
      for (const participant of filteredParticipants) {
        members.push(await this.toIdentity(participant, args.ctx));
      }
      members.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        return a.name.localeCompare(b.name);
      });
      const groupKey = members
        .map((member) =>
          member.type === "shared"
            ? `${member.type}-${member.sharedId}`
            : `${member.type}-${member.id}`,
        )
        .join("|");
      if (groupKey.length === 0) {
        continue;
      }
      const matchEntry =
        await playerInsightsMatchQueryService.mapMatchEntryFromRow({
          ctx: args.ctx,
          input: {
            matchId: row.matchId,
            sharedMatchId: row.sharedMatchId,
            matchType: row.matchType,
            date: row.date,
            isCoop: row.isCoop,
            gameId: row.gameId,
            sharedGameId: row.sharedGameId,
            gameType: row.gameType,
            gameName: row.gameName,
            gameImage: row.gameImage,
            outcomePlacement: row.outcomePlacement,
            outcomeScore: row.outcomeScore,
            outcomeWinner: row.outcomeWinner,
            playerCount: row.participants.length,
          },
        });
      const existing = grouped.get(groupKey);
      const result = members.every((member) => {
        const participant = row.participants.find((player) => {
          if (member.type === "shared") {
            return player.sharedPlayerId === member.sharedId;
          }
          return player.playerId === member.id;
        });
        if (!participant) {
          return false;
        }
        return (
          this.compareResults({
            target: targetParticipant,
            other: participant,
          }) === "win"
        );
      })
        ? "win"
        : "loss";
      if (!existing) {
        grouped.set(groupKey, {
          groupKey,
          members,
          matches: 1,
          winsWithGroup: result === "win" ? 1 : 0,
          winRateWithGroup: result === "win" ? 1 : 0,
          avgPlacement: row.outcomePlacement,
          avgScore: row.outcomeScore,
          recentMatches: [matchEntry],
        });
        continue;
      }
      existing.matches += 1;
      if (result === "win") {
        existing.winsWithGroup += 1;
      }
      existing.winRateWithGroup =
        existing.matches > 0 ? existing.winsWithGroup / existing.matches : 0;
      const placements = [existing.avgPlacement, row.outcomePlacement].filter(
        (value): value is number => value !== null,
      );
      existing.avgPlacement =
        placements.length > 0
          ? placements.reduce((acc, value) => acc + value, 0) /
            placements.length
          : null;
      const scores = [existing.avgScore, row.outcomeScore].filter(
        (value): value is number => value !== null,
      );
      existing.avgScore =
        scores.length > 0
          ? scores.reduce((acc, value) => acc + value, 0) / scores.length
          : null;
      existing.recentMatches = [...existing.recentMatches, matchEntry]
        .toSorted((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);
    }
    return Array.from(grouped.values()).toSorted(
      (a, b) => b.matches - a.matches,
    );
  }

  public async getPlayerPerformanceSummary(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPerformanceSummaryOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const rollup =
        await playerInsightsRepository.getPerformanceRollup(repoArgs);
      const recentForm = await playerInsightsRepository.getRecentForm(
        repoArgs,
        10,
      );
      return {
        player,
        overall: {
          totalMatches: rollup.totalMatches,
          wins: rollup.wins,
          losses: rollup.losses,
          ties: rollup.ties,
          winRate: rollup.winRate,
          avgPlacement: rollup.avgPlacement,
          avgScore: rollup.avgScore,
          totalPlaytime: rollup.totalPlaytime,
        },
        modeBreakdown: {
          coop: {
            matches: rollup.coopMatches,
            wins: rollup.coopWins,
            winRate:
              rollup.coopMatches > 0 ? rollup.coopWins / rollup.coopMatches : 0,
          },
          competitive: {
            matches: rollup.competitiveMatches,
            wins: rollup.competitiveWins,
            winRate:
              rollup.competitiveMatches > 0
                ? rollup.competitiveWins / rollup.competitiveMatches
                : 0,
          },
        },
        recentForm,
      };
    });
  }

  public async getPlayerFavoriteGames(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerFavoriteGamesOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const aggregates =
        await playerInsightsRepository.getFavoriteGamesAggregates(repoArgs);
      const games: GetPlayerFavoriteGamesOutputType["games"] = [];
      for (const row of aggregates) {
        const game = await playerInsightsMatchQueryService.mapGameEntryFromRow({
          ctx: args.ctx,
          input: {
            gameId: row.canonicalGameId,
            sharedGameId: row.sharedGameId,
            gameType: row.gameVisibilitySource,
            gameName: row.gameName,
            gameImage: row.gameImage,
          },
        });
        if (game.type === "shared") {
          games.push({
            type: "shared" as const,
            id: game.id,
            sharedGameId: game.sharedGameId,
            name: game.name,
            image: game.image,
            plays: row.plays,
            wins: row.wins,
            winRate: row.plays > 0 ? row.wins / row.plays : 0,
            avgScore: row.avgScore,
            lastPlayed: new Date(row.lastPlayed as string | Date),
          });
        } else {
          games.push({
            type: "original" as const,
            id: game.id,
            name: game.name,
            image: game.image,
            plays: row.plays,
            wins: row.wins,
            winRate: row.plays > 0 ? row.wins / row.plays : 0,
            avgScore: row.avgScore,
            lastPlayed: new Date(row.lastPlayed as string | Date),
          });
        }
      }
      const sorted = games.toSorted((a, b) => {
        if (a.plays !== b.plays) {
          return b.plays - a.plays;
        }
        return b.winRate - a.winRate;
      });
      return {
        player,
        games: sorted,
      };
    });
  }

  public async getPlayerRecentMatches(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerRecentMatchesOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const summaries =
        await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
          ...args,
          tx,
          order: "desc",
          limit: 20,
        });
      const matches: GetPlayerRecentMatchesOutputType["matches"] = [];
      for (const row of summaries) {
        matches.push(
          await playerInsightsMatchQueryService.mapMatchEntryFromRow({
            ctx: args.ctx,
            input: {
              matchId: row.matchId,
              sharedMatchId: row.sharedMatchId,
              matchType: row.matchType,
              date: row.date,
              isCoop: row.isCoop,
              gameId: row.gameId,
              sharedGameId: row.sharedGameId,
              gameType: row.gameType,
              gameName: row.gameName,
              gameImage: row.gameImage,
              outcomePlacement: row.outcomePlacement,
              outcomeScore: row.outcomeScore,
              outcomeWinner: row.outcomeWinner,
              playerCount: row.playerCount,
            },
          }),
        );
      }
      return {
        player,
        matches,
      };
    });
  }

  public async getPlayerGameWinRateCharts(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerGameWinRateChartsOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const rollup =
        await playerInsightsRepository.getPerformanceRollup(repoArgs);
      const gameAgg =
        await playerInsightsRepository.getFavoriteGamesAggregates(repoArgs);
      const monthly =
        await playerInsightsRepository.getMonthlyWinRateBuckets(repoArgs);
      return {
        player,
        series: {
          byGame: gameAgg.map((row) => ({
            gameIdKey:
              row.gameVisibilitySource === "original"
                ? `original-${row.canonicalGameId}`
                : `shared-${row.sharedGameId ?? row.canonicalGameId}`,
            gameName: row.gameName,
            winRate: row.plays > 0 ? row.wins / row.plays : 0,
            matches: row.plays,
          })),
          byMode: [
            {
              mode: "coop" as const,
              matches: rollup.coopMatches,
              winRate:
                rollup.coopMatches > 0
                  ? rollup.coopWins / rollup.coopMatches
                  : 0,
            },
            {
              mode: "competitive" as const,
              matches: rollup.competitiveMatches,
              winRate:
                rollup.competitiveMatches > 0
                  ? rollup.competitiveWins / rollup.competitiveMatches
                  : 0,
            },
          ],
          byTime: monthly.map((bucket) => ({
            periodStart: bucket.periodStart,
            periodEnd: bucket.periodEnd,
            matches: bucket.matches,
            wins: bucket.wins,
            winRate: bucket.matches > 0 ? bucket.wins / bucket.matches : 0,
          })),
        },
      };
    });
  }

  public async getPlayerTopRivals(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopRivalsOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const r = await this.getRows({ ...args, tx });
      return { player: p, rows: r };
    });
    const rivals = new Map<
      string,
      {
        opponent: PlayerInsightsIdentityType;
        matches: number;
        winsVs: number;
        lossesVs: number;
        tiesVs: number;
      }
    >();
    for (const row of rows) {
      const target = this.getTargetParticipant({ row, input: args.input });
      if (!target) {
        continue;
      }
      for (const participant of row.participants) {
        if (participant.playerId === target.playerId) {
          continue;
        }
        if (target.teamId !== null && participant.teamId === target.teamId) {
          continue;
        }
        const opponent = await this.toIdentity(participant, args.ctx);
        const key =
          opponent.type === "shared"
            ? `shared-${opponent.sharedId}`
            : `original-${opponent.id}`;
        const existing = rivals.get(key);
        const result = this.compareResults({ target, other: participant });
        if (!existing) {
          rivals.set(key, {
            opponent,
            matches: 1,
            winsVs: result === "win" ? 1 : 0,
            lossesVs: result === "loss" ? 1 : 0,
            tiesVs: result === "tie" ? 1 : 0,
          });
          continue;
        }
        existing.matches += 1;
        if (result === "win") existing.winsVs += 1;
        if (result === "loss") existing.lossesVs += 1;
        if (result === "tie") existing.tiesVs += 1;
      }
    }
    return {
      player,
      rivals: Array.from(rivals.values())
        .map((entry) => ({
          opponent: entry.opponent,
          matches: entry.matches,
          winsVs: entry.winsVs,
          lossesVs: entry.lossesVs,
          tiesVs: entry.tiesVs,
          winRateVs: entry.matches > 0 ? entry.winsVs / entry.matches : 0,
          recentDelta: entry.winsVs - entry.lossesVs,
        }))
        .toSorted((a, b) => b.matches - a.matches),
    };
  }

  public async getPlayerTopTeammates(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopTeammatesOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const r = await this.getRows({ ...args, tx });
      return { player: p, rows: r };
    });
    const teammates = new Map<
      string,
      {
        teammate: PlayerInsightsIdentityType;
        matchesTogether: number;
        winsTogether: number;
        placements: number[];
      }
    >();
    for (const row of rows) {
      const target = this.getTargetParticipant({ row, input: args.input });
      if (!target || target.teamId === null) {
        continue;
      }
      for (const participant of row.participants) {
        if (participant.playerId === target.playerId) {
          continue;
        }
        if (participant.teamId !== target.teamId) {
          continue;
        }
        const teammate = await this.toIdentity(participant, args.ctx);
        const key =
          teammate.type === "shared"
            ? `shared-${teammate.sharedId}`
            : `original-${teammate.id}`;
        const existing = teammates.get(key);
        if (!existing) {
          teammates.set(key, {
            teammate,
            matchesTogether: 1,
            winsTogether:
              target.winner === true && participant.winner === true ? 1 : 0,
            placements:
              target.placement !== null && participant.placement !== null
                ? [(target.placement + participant.placement) / 2]
                : [],
          });
          continue;
        }
        existing.matchesTogether += 1;
        if (target.winner === true && participant.winner === true) {
          existing.winsTogether += 1;
        }
        if (target.placement !== null && participant.placement !== null) {
          existing.placements.push(
            (target.placement + participant.placement) / 2,
          );
        }
      }
    }
    return {
      player,
      teammates: Array.from(teammates.values())
        .map((entry) => ({
          teammate: entry.teammate,
          matchesTogether: entry.matchesTogether,
          winsTogether: entry.winsTogether,
          winRateTogether:
            entry.matchesTogether > 0
              ? entry.winsTogether / entry.matchesTogether
              : 0,
          avgTeamPlacement:
            entry.placements.length > 0
              ? entry.placements.reduce((acc, value) => acc + value, 0) /
                entry.placements.length
              : null,
        }))
        .toSorted((a, b) => b.matchesTogether - a.matchesTogether),
    };
  }

  public async getPlayerPlayedWithGroups(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPlayedWithGroupsOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const r = await this.getRows({ ...args, tx });
      return { player: p, rows: r };
    });
    return {
      player,
      playedWithGroups: await this.buildPlayedWithGroups({
        rows,
        input: args.input,
        ctx: args.ctx,
      }),
    };
  }

  public async getPlayerMatchHistoryTimeline(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerMatchHistoryTimelineOutputType> {
    const { player, orderedRows } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const rows =
        await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
          ...args,
          tx,
          order: "asc",
        });
      return { player: p, orderedRows: rows };
    });
    let streak = 0;
    const timeline = [];
    for (const row of orderedRows) {
      const result = this.getOutcomeLabelFromFields({
        outcomeWinner: row.outcomeWinner,
        outcomePlacement: row.outcomePlacement,
        outcomeScore: row.outcomeScore,
      });
      const streakBefore = streak;
      streak = result === "win" ? streak + 1 : 0;
      const streakAfter = streak;
      const game = await playerInsightsMatchQueryService.mapGameEntryFromRow({
        ctx: args.ctx,
        input: {
          gameId: row.gameId,
          sharedGameId: row.sharedGameId,
          gameType: row.gameType,
          gameName: row.gameName,
          gameImage: row.gameImage,
        },
      });
      timeline.push({
        date: row.date,
        matchId: row.matchId,
        matchType: row.matchType,
        game,
        outcome: {
          placement: row.outcomePlacement,
          score: row.outcomeScore,
          isWinner: row.outcomeWinner ?? false,
        },
        delta: {
          streakBefore,
          streakAfter,
        },
      });
    }
    return {
      player,
      timeline,
    };
  }

  public async getPlayerStreaks(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerStreaksOutputType> {
    const { player, chronological, recentSummaries } = await db.transaction(
      async (tx) => {
        const p = await this.getInsightsTarget(args, tx);
        const chrono =
          await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
            ...args,
            tx,
            order: "asc",
          });
        const recent =
          await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
            ...args,
            tx,
            order: "desc",
            limit: 10,
          });
        return {
          player: p,
          chronological: chrono,
          recentSummaries: recent,
        };
      },
    );
    let currentType: "win" | "loss" = "loss";
    let currentCount = 0;
    let longestWin = {
      count: 0,
      rangeStart: null as Date | null,
      rangeEnd: null as Date | null,
    };
    let longestLoss = {
      count: 0,
      rangeStart: null as Date | null,
      rangeEnd: null as Date | null,
    };
    let runStart: Date | null = null;
    for (const row of chronological) {
      const result = this.getOutcomeLabelFromFields({
        outcomeWinner: row.outcomeWinner,
        outcomePlacement: row.outcomePlacement,
        outcomeScore: row.outcomeScore,
      });
      if (result === "tie") {
        continue;
      }
      if (currentCount === 0) {
        currentType = result;
        currentCount = 1;
        runStart = row.date;
      } else if (currentType === result) {
        currentCount += 1;
      } else {
        currentType = result;
        currentCount = 1;
        runStart = row.date;
      }
      if (currentType === "win" && currentCount > longestWin.count) {
        longestWin = {
          count: currentCount,
          rangeStart: runStart,
          rangeEnd: row.date,
        };
      }
      if (currentType === "loss" && currentCount > longestLoss.count) {
        longestLoss = {
          count: currentCount,
          rangeStart: runStart,
          rangeEnd: row.date,
        };
      }
    }
    return {
      player,
      streaks: {
        current: {
          type: currentType,
          count: currentCount,
        },
        longestWin,
        longestLoss,
        recent: recentSummaries.map((row) => ({
          date: row.date,
          result: this.getOutcomeLabelFromFields({
            outcomeWinner: row.outcomeWinner,
            outcomePlacement: row.outcomePlacement,
            outcomeScore: row.outcomeScore,
          }),
        })),
      },
    };
  }

  public async getPlayerCountStats(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerCountStatsOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const rows =
        await playerInsightsRepository.getCountStatsByTableSize(repoArgs);
      return {
        player,
        distribution: rows.map((r) => ({
          playerCount: r.playerCount,
          matches: r.matches,
          wins: r.wins,
          winRate: r.matches > 0 ? r.wins / r.matches : 0,
          avgPlacement: r.avgPlacement,
          avgScore: r.avgScore,
        })),
      };
    });
  }

  public async getPlayerPlacementDistribution(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPlacementDistributionOutputType> {
    const { player, dist } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const d = await playerInsightsRepository.getPlacementDistribution({
        userId: args.ctx.userId,
        input: args.input,
        tx,
      });
      return { player: p, dist: d };
    });
    const placementTotal = dist.placements.reduce((acc, p) => acc + p.count, 0);
    const bySizeMap = new Map<number, typeof dist.byGameSize>();
    for (const row of dist.byGameSize) {
      const list = bySizeMap.get(row.playerCount) ?? [];
      list.push(row);
      bySizeMap.set(row.playerCount, list);
    }
    const byGameSize = Array.from(bySizeMap.entries())
      .map(([playerCount, rowsForSize]) => {
        const total = rowsForSize.reduce((s, r) => s + r.count, 0);
        return {
          playerCount,
          placements: rowsForSize
            .map((r) => ({
              placement: r.placement,
              count: r.count,
              percentage: total > 0 ? r.count / total : 0,
            }))
            .toSorted((a, b) => a.placement - b.placement),
        };
      })
      .toSorted((a, b) => a.playerCount - b.playerCount);
    return {
      player,
      placements: dist.placements
        .map((p) => ({
          placement: p.placement,
          count: p.count,
          percentage: placementTotal > 0 ? p.count / placementTotal : 0,
        }))
        .toSorted((a, b) => a.placement - b.placement),
      byGameSize,
    };
  }

  public async getPlayerScoreTrends(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerScoreTrendsOutputType> {
    const { player, chronological } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const chrono = await playerInsightsRepository.getChronologicalOutcomes({
        userId: args.ctx.userId,
        input: args.input,
        tx,
      });
      return { player: p, chronological: chrono };
    });
    const byBucket = new Map<string, number[]>();
    for (const row of chronological) {
      if (row.outcomeScore === null) {
        continue;
      }
      const bucket = `${row.date.getUTCFullYear()}-${String(row.date.getUTCMonth() + 1).padStart(2, "0")}`;
      const scores = byBucket.get(bucket) ?? [];
      scores.push(row.outcomeScore);
      byBucket.set(bucket, scores);
    }
    const rolling = chronological.map((row, index) => {
      const window = chronological.slice(Math.max(0, index - 4), index + 1);
      const numericScores = window
        .map((item) => item.outcomeScore)
        .filter((value): value is number => value !== null);
      const wins = window.filter(
        (item) => this.getOutcomeLabelFromChronological(item) === "win",
      ).length;
      return {
        date: row.date,
        rollingAvgScore:
          numericScores.length > 0
            ? numericScores.reduce((acc, value) => acc + value, 0) /
              numericScores.length
            : null,
        rollingWinRate: window.length > 0 ? wins / window.length : 0,
        windowSize: window.length,
      };
    });
    return {
      player,
      trend: Array.from(byBucket.entries())
        .map(([dateBucket, scores]) => {
          const sorted = [...scores].toSorted((a, b) => a - b);
          const middle = Math.floor(sorted.length / 2);
          const medianScore =
            sorted.length === 0
              ? null
              : sorted.length % 2 === 0
                ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
                : (sorted[middle] ?? null);
          return {
            dateBucket,
            avgScore:
              scores.length > 0
                ? scores.reduce((acc, value) => acc + value, 0) / scores.length
                : null,
            medianScore,
            bestScore: scores.length > 0 ? Math.max(...scores) : null,
            worstScore: scores.length > 0 ? Math.min(...scores) : null,
            matches: scores.length,
          };
        })
        .toSorted((a, b) => a.dateBucket.localeCompare(b.dateBucket)),
      rolling,
    };
  }
}

export const playerInsightsReadService = new PlayerInsightsReadService();
