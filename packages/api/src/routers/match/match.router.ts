import type { TRPCRouterRecord } from "@trpc/server";

import { matchService } from "../../services/match/match.service";
import { protectedUserProcedure } from "../../trpc";
import {
  createMatchInput,
  deleteMatchInput,
  editMatchInput,
  getMatchInput,
  getMatchPlayersAndTeamsInput,
  getMatchScoresheetInput,
} from "./match.input";
import {
  createMatchOutput,
  editMatchOutput,
  getMatchOutput,
  getMatchPlayersAndTeamsOutput,
  getMatchScoresheetOutput,
  getMatchSummaryOutput,
} from "./match.output";
import { dateMatchRouter } from "./sub-routers/date/date-match.router";
import { updateMatchRouter } from "./sub-routers/update-match/update-match.router";

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
  getMatch: protectedUserProcedure
    .input(getMatchInput)
    .output(getMatchOutput)
    .query(async ({ ctx, input }) => {
      return matchService.getMatch({
        ctx,
        input,
      });
    }),
  getMatchScoresheet: protectedUserProcedure
    .input(getMatchScoresheetInput)
    .output(getMatchScoresheetOutput)
    .query(async ({ ctx, input }) => {
      return matchService.getMatchScoresheet({
        ctx,
        input,
      });
    }),
  getMatchPlayersAndTeams: protectedUserProcedure
    .input(getMatchPlayersAndTeamsInput)
    .output(getMatchPlayersAndTeamsOutput)
    .query(async ({ ctx, input }) => {
      return matchService.getMatchPlayersAndTeams({
        ctx,
        input,
      });
    }),
  getMatchSummary: protectedUserProcedure
    .input(getMatchInput)
    .output(getMatchSummaryOutput)
    .query(async ({ ctx, input }) => {
      return matchService.getMatchSummary({
        ctx,
        input,
      });
    }),
  deleteMatch: protectedUserProcedure
    .input(deleteMatchInput)
    .mutation(async ({ ctx, input }) => {
      await matchService.deleteMatch({
        ctx,
        input,
      });
    }),
  editMatch: protectedUserProcedure
    .input(editMatchInput)
    .output(editMatchOutput)
    .mutation(async ({ ctx, input }) => {
      return matchService.editMatch({
        ctx,
        input,
      });
    }),
  update: updateMatchRouter,
  date: dateMatchRouter,
} satisfies TRPCRouterRecord;
