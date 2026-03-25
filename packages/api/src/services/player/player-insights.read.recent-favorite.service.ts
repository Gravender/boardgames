import { db } from "@board-games/db/client";

import type {
  GetPlayerFavoriteGamesOutputType,
  GetPlayerRecentMatchesOutputType,
} from "../../routers/player/player-insights.output";
import { playerInsightsRepository } from "../../repositories/player/player-insights.repository";
import { matchRepository } from "../../repositories/match/match.repository";
import { playerRepository } from "../../repositories/player/player.repository";
import { playerInsightsMatchQueryService } from "./player-insights-match-query.service";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import { isViewerSameAsProfileTarget } from "./player-insights.read.identity";
import { getInsightsTarget } from "./player-insights.read.target";

class PlayerRecentFavoriteReadService {
  public async getPlayerFavoriteGames(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerFavoriteGamesOutputType> {
    return db.transaction(async (tx) => {
      const player = await getInsightsTarget(args, tx);
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
        const lastPlayed = new Date(row.lastPlayed as string | Date);
        const winRate = row.plays > 0 ? row.wins / row.plays : 0;
        const base = {
          id: game.id,
          name: game.name,
          image: game.image,
          plays: row.plays,
          wins: row.wins,
          winRate,
          avgScore: row.avgScore,
          lastPlayed,
        };
        if (game.type === "shared") {
          games.push({
            ...base,
            type: "shared" as const,
            sharedGameId: game.sharedGameId,
          });
        } else {
          games.push({
            ...base,
            type: "original" as const,
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
      const player = await getInsightsTarget(args, tx);
      const summaries =
        await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
          ...args,
          tx,
          order: "desc",
        });

      const userPlayerId = await playerRepository.getUserPlayerIdForUser({
        userId: args.ctx.userId,
        tx,
      });

      let sharedLinkedPlayerId: number | null = null;
      if (args.input.type === "shared") {
        const sharedPlayer = await playerRepository.getSharedPlayer(
          {
            id: args.input.sharedPlayerId,
            sharedWithId: args.ctx.userId,
          },
          tx,
        );
        sharedLinkedPlayerId = sharedPlayer?.linkedPlayerId ?? null;
      }

      const sameAsProfile = isViewerSameAsProfileTarget(
        args.input,
        userPlayerId,
        sharedLinkedPlayerId,
      );

      const viewerByMatch =
        userPlayerId !== null && summaries.length > 0
          ? await matchRepository.getViewerOutcomesForCanonicalMatches({
              userId: args.ctx.userId,
              viewerPlayerId: userPlayerId,
              canonicalMatchIds: summaries.map((r) => r.matchId),
              tx,
            })
          : new Map();

      const matches: GetPlayerRecentMatchesOutputType["matches"] = [];
      for (const row of summaries) {
        const entry =
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
              scoresheetWinCondition: row.scoresheetWinCondition,
              outcomePlacement: row.outcomePlacement,
              outcomeScore: row.outcomeScore,
              outcomeWinner: row.outcomeWinner,
              playerCount: row.playerCount,
            },
          });
        const viewerRow = viewerByMatch.get(row.matchId);
        matches.push({
          ...entry,
          viewerParticipation:
            viewerRow !== undefined
              ? {
                  inMatch: true,
                  outcome: {
                    placement: viewerRow.placement,
                    score: viewerRow.score,
                    isWinner: viewerRow.winner,
                  },
                  isSameAsProfilePlayer: sameAsProfile,
                }
              : {
                  inMatch: false,
                  isSameAsProfilePlayer: false,
                },
        });
      }
      return {
        player,
        matches,
      };
    });
  }
}

export const playerRecentFavoriteReadService =
  new PlayerRecentFavoriteReadService();
