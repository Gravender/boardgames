import type { TRPCRouterRecord } from "@trpc/server";

import { createMatchInput } from "~/routers/match/match.input";
import { matchService } from "~/routers/match/service/match.service";
import { protectedUserProcedure } from "~/trpc";
import { createMatchOutput } from "./match.output";

export const matchRouter = {
  createMatch: protectedUserProcedure
    .input(createMatchInput)
    .output(createMatchOutput)
    .mutation(async ({ ctx, input }) => {
      return matchService.createMatch({
        ctx,
        input,
      });
    }),
} satisfies TRPCRouterRecord;
