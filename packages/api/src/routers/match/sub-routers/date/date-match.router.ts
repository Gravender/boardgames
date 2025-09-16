import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "~/trpc";
import { getMatchesByDateInput } from "./date-match.input";
import {
  getMatchesByCalenderOutput,
  getMatchesByDateOutput,
} from "./date-match.output";
import { dateMatchService } from "./service/date-match.service";

export const dateMatchRouter = {
  getMatchesByDate: protectedUserProcedure
    .input(getMatchesByDateInput)
    .output(getMatchesByDateOutput)
    .mutation(async ({ ctx, input }) => {
      return dateMatchService.getMatchesByDate({ ctx, input });
    }),
  getMatchesByCalender: protectedUserProcedure
    .output(getMatchesByCalenderOutput)
    .mutation(async ({ ctx }) => {
      return dateMatchService.getMatchesByCalender({ ctx });
    }),
} satisfies TRPCRouterRecord;
