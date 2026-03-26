import type { TRPCRouterRecord } from "@trpc/server";

import { playerService } from "../../services/player/player.service";
import { protectedUserProcedure } from "../../trpc";
import {
  createPlayerInput,
  deletePlayerInput,
  getPlayerToShareInput,
  getPlayersByGameInput,
  updatePlayerInput,
} from "./player.input";
import {
  createPlayerOutput,
  deletePlayerOutput,
  getPlayerToShareOutput,
  getPlayersByGameOutput,
  getPlayersForMatchOutput,
  getPlayersOutput,
  getRecentMatchWithPlayersOutput,
  updatePlayerOutput,
} from "./player.output";
import { playerStatsRouter } from "./sub-routers/stats/player-stats.router";

export const playerRouter = {
  create: protectedUserProcedure
    .input(createPlayerInput)
    .output(createPlayerOutput)
    .mutation(async ({ ctx, input }) => {
      return playerService.createPlayer({
        ctx: { userId: ctx.userId },
        input,
      });
    }),
  update: protectedUserProcedure
    .input(updatePlayerInput)
    .output(updatePlayerOutput)
    .mutation(async ({ ctx, input }) => {
      await playerService.updatePlayer({
        ctx: {
          userId: ctx.userId,
          posthog: ctx.posthog,
          deleteFiles: ctx.deleteFiles,
        },
        input,
      });
    }),
  deletePlayer: protectedUserProcedure
    .input(deletePlayerInput)
    .output(deletePlayerOutput)
    .mutation(async ({ ctx, input }) => {
      await playerService.deletePlayer({
        ctx: { userId: ctx.userId },
        input,
      });
    }),
  getPlayerToShare: protectedUserProcedure
    .input(getPlayerToShareInput)
    .output(getPlayerToShareOutput)
    .query(async ({ ctx, input }) => {
      return playerService.getPlayerToShare({
        ctx: { userId: ctx.userId },
        input,
      });
    }),
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
  stats: playerStatsRouter,
} satisfies TRPCRouterRecord;
