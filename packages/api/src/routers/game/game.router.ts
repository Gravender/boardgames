import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { gameEditService } from "../../services/game/game-edit.service";
import { gameAnalyticsLinkService } from "../../services/game/game-analytics-link.service";
import { gameImportService } from "../../services/game/game-import.service";
import { gameInsightsService } from "../../services/game/game-insights.service";
import { gameListService } from "../../services/game/game-list.service";
import { gameMatchesService } from "../../services/game/game-matches.service";
import { gameScoresheetService } from "../../services/game/game-scoresheet.service";
import { gameStatsService } from "../../services/game/game-stats.service";
import { gameService } from "../../services/game/game.service";
import { protectedUserProcedure } from "../../trpc";
import {
  createGameInput,
  editGameInput,
  getGameInput,
  getSharedScoresheetAnalyticsLinkStateInput,
  importBGGGamesInput,
  linkSharedRoundsAnalyticsInput,
  linkSharedScoresheetAnalyticsInput,
} from "./game.input";
import {
  createGameOutput,
  deleteGameOutput,
  editGameOutput,
  getGameInsightsOutput,
  getGameMatchesOutput,
  getGameOutput,
  getGamePlayerStatsOutput,
  getGameRolesOutput,
  getGameScoresheetsOutput,
  getGameScoresheetStatsOutput,
  getGameScoreSheetsWithRoundsOutput,
  getGamesOutput,
  getGameStatsHeaderOutput,
  getGameToShareOutput,
  getSharedScoresheetAnalyticsLinkStateOutput,
  importBGGGamesOutput,
  linkSharedRoundsAnalyticsOutput,
  linkSharedScoresheetAnalyticsOutput,
} from "./game.output";

export const gameRouter = {
  getGames: protectedUserProcedure
    .output(getGamesOutput)
    .query(async ({ ctx }) => {
      return gameListService.getGames({ ctx });
    }),
  getGameToShare: protectedUserProcedure
    .input(z.object({ id: z.number() }))
    .output(getGameToShareOutput)
    .query(async ({ ctx, input }) => {
      return gameListService.getGameToShare({ ctx, input });
    }),
  deleteGame: protectedUserProcedure
    .input(z.object({ id: z.number() }))
    .output(deleteGameOutput)
    .mutation(async ({ ctx, input }) => {
      return gameService.deleteGame({ ctx, input });
    }),
  importBGGGames: protectedUserProcedure
    .input(importBGGGamesInput)
    .output(importBGGGamesOutput)
    .mutation(async ({ ctx, input }) => {
      return gameImportService.importBGGGames({ ctx, input });
    }),
  create: protectedUserProcedure
    .input(createGameInput)
    .output(createGameOutput)
    .mutation(async ({ ctx, input }) => {
      return gameService.createGame({
        ctx,
        input,
      });
    }),
  updateGame: protectedUserProcedure
    .input(editGameInput)
    .output(editGameOutput)
    .mutation(async ({ ctx, input }) => {
      await gameEditService.editGame({
        ctx: {
          userId: ctx.userId,
          posthog: ctx.posthog,
          deleteFiles: ctx.deleteFiles,
        },
        input,
      });
    }),
  getGame: protectedUserProcedure
    .input(getGameInput)
    .output(getGameOutput)
    .query(async ({ ctx, input }) => {
      return gameService.getGame({
        ctx,
        input,
      });
    }),
  gameMatches: protectedUserProcedure
    .input(getGameInput)
    .output(getGameMatchesOutput)
    .query(async ({ ctx, input }) => {
      return gameMatchesService.getGameMatches({
        ctx,
        input,
      });
    }),
  getGameStatsHeader: protectedUserProcedure
    .input(getGameInput)
    .output(getGameStatsHeaderOutput)
    .query(async ({ ctx, input }) => {
      return gameStatsService.getGameStatsHeader({
        ctx,
        input,
      });
    }),
  getGamePlayerStats: protectedUserProcedure
    .input(getGameInput)
    .output(getGamePlayerStatsOutput)
    .query(async ({ ctx, input }) => {
      return gameStatsService.getGamePlayerStats({ ctx, input });
    }),
  gameRoles: protectedUserProcedure
    .input(getGameInput)
    .output(getGameRolesOutput)
    .query(async ({ ctx, input }) => {
      return gameMatchesService.getGameRoles({
        ctx,
        input,
      });
    }),
  gameScoresheets: protectedUserProcedure
    .input(getGameInput)
    .output(getGameScoresheetsOutput)
    .query(async ({ ctx, input }) => {
      return gameScoresheetService.getGameScoresheets({
        ctx,
        input,
      });
    }),
  gameScoreSheetsWithRounds: protectedUserProcedure
    .input(getGameInput)
    .output(getGameScoreSheetsWithRoundsOutput)
    .query(async ({ ctx, input }) => {
      return gameScoresheetService.getGameScoreSheetsWithRounds({
        ctx,
        input,
      });
    }),
  getGameScoresheetStats: protectedUserProcedure
    .input(getGameInput)
    .output(getGameScoresheetStatsOutput)
    .query(async ({ ctx, input }) => {
      return gameStatsService.getGameScoresheetStats({
        ctx,
        input,
      });
    }),
  getSharedScoresheetAnalyticsLinkState: protectedUserProcedure
    .input(getSharedScoresheetAnalyticsLinkStateInput)
    .output(getSharedScoresheetAnalyticsLinkStateOutput)
    .query(async ({ ctx, input }) => {
      return gameAnalyticsLinkService.getSharedScoresheetAnalyticsLinkState({
        ctx,
        input,
      });
    }),
  linkSharedScoresheetAnalytics: protectedUserProcedure
    .input(linkSharedScoresheetAnalyticsInput)
    .output(linkSharedScoresheetAnalyticsOutput)
    .mutation(async ({ ctx, input }) => {
      await gameAnalyticsLinkService.linkSharedScoresheetAnalytics({
        ctx,
        input,
      });
    }),
  linkSharedRoundsAnalytics: protectedUserProcedure
    .input(linkSharedRoundsAnalyticsInput)
    .output(linkSharedRoundsAnalyticsOutput)
    .mutation(async ({ ctx, input }) => {
      await gameAnalyticsLinkService.linkSharedRoundsAnalytics({
        ctx,
        input,
      });
    }),
  getGameInsights: protectedUserProcedure
    .input(getGameInput)
    .output(getGameInsightsOutput)
    .query(async ({ ctx, input }) => {
      return gameInsightsService.getGameInsights({
        ctx,
        input,
      });
    }),
} satisfies TRPCRouterRecord;
