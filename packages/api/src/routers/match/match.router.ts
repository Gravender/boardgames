import type { TRPCRouterRecord } from "@trpc/server";

import {
  createMatchInput,
  getMatchInput,
  getMatchPlayersAndTeamsInput,
  getMatchScoresheetInput,
} from "~/routers/match/match.input";
import {
  createMatchOutput,
  getMatchOutput,
  getMatchPlayersAndTeamsOutput,
  getMatchScoresheetOutput,
} from "~/routers/match/match.output";
import { matchService } from "~/routers/match/service/match.service";
import { protectedUserProcedure } from "~/trpc";

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
} satisfies TRPCRouterRecord;
