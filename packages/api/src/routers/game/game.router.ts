import type { TRPCRouterRecord } from "@trpc/server";

import { gameInsightsService } from "../../services/game/game-insights.service";
import { gameStatsService } from "../../services/game/game-stats.service";
import { gameService } from "../../services/game/game.service";
import { protectedUserProcedure } from "../../trpc";
import { createGameInput, editGameInput, getGameInput } from "./game.input";
import {
  createGameOutput,
  editGameOutput,
  getGameInsightsOutput,
  getGameMatchesOutput,
  getGameOutput,
  getGamePlayerStatsOutput,
  getGameRolesOutput,
  getGameScoresheetsOutput,
  getGameScoresheetStatsOutput,
  getGameScoreSheetsWithRoundsOutput,
  getGameStatsHeaderOutput,
} from "./game.output";

export const gameRouter = {
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
      await gameService.editGame({
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
      return gameService.getGameMatches({
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
      return gameService.getGameRoles({
        ctx,
        input,
      });
    }),
  gameScoresheets: protectedUserProcedure
    .input(getGameInput)
    .output(getGameScoresheetsOutput)
    .query(async ({ ctx, input }) => {
      return gameService.getGameScoresheets({
        ctx,
        input,
      });
    }),
  gameScoreSheetsWithRounds: protectedUserProcedure
    .input(getGameInput)
    .output(getGameScoreSheetsWithRoundsOutput)
    .query(async ({ ctx, input }) => {
      return gameService.getGameScoreSheetsWithRounds({
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
