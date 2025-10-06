import type { TRPCRouterRecord } from "@trpc/server";

import { getMatchInput } from "~/routers/match/match.input";
import { protectedUserProcedure } from "~/trpc";
import { updateMatchService } from "./service/update-match.service";
import {
  updateMatchCommentInput,
  updateMatchDetailsInput,
  updateMatchManualWinnerInput,
  updateMatchPlacementsInput,
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
  updateMatchFinish: protectedUserProcedure
    .input(getMatchInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.updateMatchFinish({ ctx, input });
    }),
  updateMatchFinalScores: protectedUserProcedure
    .input(getMatchInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.updateMatchFinalScores({ ctx, input });
    }),
  updateMatchManualWinner: protectedUserProcedure
    .input(updateMatchManualWinnerInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.updateMatchManualWinner({ ctx, input });
    }),
  updateMatchPlacements: protectedUserProcedure
    .input(updateMatchPlacementsInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.updateMatchPlacements({ ctx, input });
    }),
  updateMatchComment: protectedUserProcedure
    .input(updateMatchCommentInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.updateMatchComment({ ctx, input });
    }),
  updateMatchDetails: protectedUserProcedure
    .input(updateMatchDetailsInput)
    .mutation(async ({ ctx, input }) => {
      await updateMatchService.updateMatchDetails({ ctx, input });
    }),
} satisfies TRPCRouterRecord;
