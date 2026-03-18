import type { TRPCRouterRecord } from "@trpc/server";

import { playerService } from "../../services/player/player.service";
import { protectedUserProcedure } from "../../trpc";
import { getPlayerInput, getPlayersByGameInput } from "./player.input";
import {
  getPlayerOutput,
  getPlayersByGameOutput,
  getPlayersOutput,
  getPlayersForMatchOutput,
  getRecentMatchWithPlayersOutput,
} from "./player.output";

export const playerRouter = {
  getPlayers: protectedUserProcedure
    .output(getPlayersOutput)
    .query(async ({ ctx }) => {
      return playerService.getPlayers({
        ctx,
      });
    }),
  getPlayersByGame: protectedUserProcedure
    .input(getPlayersByGameInput)
    .output(getPlayersByGameOutput)
    .query(async ({ ctx, input }) => {
      return playerService.getPlayersByGame({
        ctx,
        input,
      });
    }),
  getPlayer: protectedUserProcedure
    .input(getPlayerInput)
    .output(getPlayerOutput)
    .query(async ({ ctx, input }) => {
      return playerService.getPlayer({
        ctx,
        input,
      });
    }),
  getPlayersForMatch: protectedUserProcedure
    .output(getPlayersForMatchOutput)
    .query(async ({ ctx }) => {
      return playerService.getPlayersForMatch({
        ctx,
      });
    }),
  getRecentMatchWithPlayers: protectedUserProcedure
    .output(getRecentMatchWithPlayersOutput)
    .query(async ({ ctx }) => {
      return playerService.getRecentMatchWithPlayers({
        ctx,
      });
    }),
} satisfies TRPCRouterRecord;
