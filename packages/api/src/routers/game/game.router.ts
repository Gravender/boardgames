import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "../../trpc";
import { getGameInput } from "./game.input";
import {
  getGameMatchesOutput,
  getGameRolesOutput,
  getGameScoresheetsOutput,
} from "./game.output";
import { gameService } from "./service/game.service";

export const gameRouter = {
  gameMatches: protectedUserProcedure
    .input(getGameInput)
    .output(getGameMatchesOutput)
    .query(async ({ ctx, input }) => {
      return gameService.getGameMatches({
        ctx,
        input,
      });
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
} satisfies TRPCRouterRecord;
