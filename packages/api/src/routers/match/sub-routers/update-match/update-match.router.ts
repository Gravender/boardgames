import type { TRPCRouterRecord } from "@trpc/server";

import { getMatchInput } from "~/routers/match/match.input";
import { protectedUserProcedure } from "~/trpc";
import { updateMatchService } from "./service/update-match.service";
import {
  updateMatchPlayerScoreInput,
  updateMatchScoreInput,
} from "./update-match.input";

export const updateMatchRouter = {
  matchStart: protectedUserProcedure
    .input(getMatchInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.matchStart({ ctx, input });
    }),
  matchPause: protectedUserProcedure
    .input(getMatchInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.matchPause({ ctx, input });
    }),
  matchResetDuration: protectedUserProcedure
    .input(getMatchInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.matchResetDuration({ ctx, input });
    }),
  updateMatchRoundScore: protectedUserProcedure
    .input(updateMatchScoreInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.updateMatchRoundScore({ ctx, input });
    }),
  updateMatchPlayerScore: protectedUserProcedure
    .input(updateMatchPlayerScoreInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.updateMatchPlayerScore({ ctx, input });
    }),
} satisfies TRPCRouterRecord;
