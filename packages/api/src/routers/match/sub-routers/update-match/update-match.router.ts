import type { TRPCRouterRecord } from "@trpc/server";

import { getMatchInput } from "~/routers/match/match.input";
import { protectedUserProcedure } from "~/trpc";
import { updateMatchService } from "./service/update-match.service";

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
} satisfies TRPCRouterRecord;
