import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "@board-games/api/trpc";

import { getMatchesByDateInput } from "./date-match.input";
import {
  getMatchesByCalendarOutput,
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
  getMatchesByCalendar: protectedUserProcedure
    .output(getMatchesByCalendarOutput)
    .mutation(async ({ ctx }) => {
      return dateMatchService.getMatchesByCalendar({ ctx });
    }),
} satisfies TRPCRouterRecord;
