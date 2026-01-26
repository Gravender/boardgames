import type { TRPCRouterRecord } from "@trpc/server";

import { gameService } from "../../services/game/game.service";
import { protectedUserProcedure } from "../../trpc";
import { getGameInput } from "./game.input";
import {
  getGameMatchesOutput,
  getGameOutput,
  getGamePlayerStatsOutput,
  getGameRolesOutput,
  getGameScoresheetsOutput,
  getGameScoreSheetsWithRoundsOutput,
  getGameStatsHeaderOutput,
} from "./game.output";

export const gameRouter = {
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
      return gameService.getGameStatsHeader({
        ctx,
        input,
      });
    }),
  getGamePlayerStats: protectedUserProcedure
    .input(getGameInput)
    .output(getGamePlayerStatsOutput)
    .query(async ({ ctx, input }) => {
      return gameService.getGamePlayerStats({ ctx, input });
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
} satisfies TRPCRouterRecord;
