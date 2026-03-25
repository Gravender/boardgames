import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

import { groupPlayer } from "@board-games/db/schema";
import { selectGroupSchema } from "@board-games/db/zodSchema";

import { playerService } from "../services/player/player.service";
import { protectedUserProcedure } from "../trpc";
import {
  createPlayerInput,
  deletePlayerInput,
  getPlayerToShareInput,
  updatePlayerInput,
} from "./player/player.input";
import {
  createPlayerOutput,
  deletePlayerOutput,
  getPlayerToShareOutput,
  updatePlayerOutput,
} from "./player/player.output";

export const playerRouter = {
  getPlayersByGroup: protectedUserProcedure
    .input(
      z.object({
        group: selectGroupSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const groupResponse = await ctx.db.query.group.findFirst({
        where: {
          createdBy: ctx.userId,
          id: input.group.id,
        },
      });
      if (!groupResponse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found.",
        });
      }
      const players = await ctx.db.query.player.findMany({
        where: {
          createdBy: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
        columns: {
          id: true,
          name: true,
          isUser: true,
        },
        with: {
          matches: {
            where: {
              finished: true,
            },
          },
          image: true,
          sharedLinkedPlayers: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              sharedMatches: {
                where: {
                  sharedWithId: ctx.userId,
                },
              },
            },
          },
        },
        extras: {
          inGroup: (table) => sql<boolean>`EXISTS (
            SELECT 1
            FROM ${groupPlayer}
            WHERE ${groupPlayer.groupId} = ${input.group.id}
              AND ${groupPlayer.playerId} = ${table.id}
          )`,
        },
      });
      const mappedGroupResponse: {
        id: number;
        inGroup: boolean;
        name: string;
        image: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "player" | "match" | "game";
        } | null;
        matches: number;
      }[] = players.map((p) => {
        return {
          id: p.id,
          inGroup: p.inGroup,
          name: p.name,
          image: p.image,
          matches:
            p.matches.length +
            p.sharedLinkedPlayers.flatMap(
              (linkedPlayer) => linkedPlayer.sharedMatches,
            ).length,
        };
      });

      return mappedGroupResponse;
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
  create: protectedUserProcedure
    .input(createPlayerInput)
    .output(createPlayerOutput)
    .mutation(async ({ ctx, input }) => {
      return playerService.createPlayer({
        ctx: {
          userId: ctx.userId,
        },
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
} satisfies TRPCRouterRecord;
