import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

import { groupPlayer } from "@board-games/db/schema";
import { selectGroupSchema } from "@board-games/db/zodSchema";

import { protectedUserProcedure } from "../trpc";

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
} satisfies TRPCRouterRecord;
