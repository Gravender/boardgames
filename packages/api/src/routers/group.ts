import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  group,
  groupPlayer,
  insertGroupSchema,
  insertPlayerSchema,
  selectGroupSchema,
} from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const groupRouter = createTRPCRouter({
  getGroups: protectedUserProcedure.query(async ({ ctx }) => {
    return ctx.db.query.group.findMany({
      where: eq(group.createdBy, ctx.userId),
      with: {
        groupsByPlayer: true,
      },
    });
  }),
  create: protectedUserProcedure
    .input(
      insertGroupSchema
        .pick({ name: true })
        .required({ name: true })
        .extend({
          players: z.array(
            insertPlayerSchema
              .pick({
                id: true,
              })
              .required({ id: true }),
          ),
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const returnedGroup = (
        await ctx.db
          .insert(group)
          .values({
            createdBy: ctx.userId,
            name: input.name,
          })
          .returning()
      )[0];
      if (!returnedGroup) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      await ctx.db.insert(groupPlayer).values(
        input.players.map((player) => ({
          groupId: returnedGroup.id,
          playerId: player.id,
        })),
      );
    }),
  update: protectedUserProcedure
    .input(
      insertGroupSchema.pick({ name: true, id: true }).required({ id: true }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = (
        await ctx.db
          .update(group)
          .set({
            name: input.name,
          })
          .where(eq(group.id, input.id))
          .returning()
      )[0];
      if (!result)
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      return result;
    }),
  updatePlayers: protectedUserProcedure
    .input(
      z.object({
        group: selectGroupSchema.pick({ id: true }),
        playersToAdd: z.array(
          insertPlayerSchema
            .pick({
              id: true,
            })
            .required({ id: true }),
        ),
        playersToRemove: z.array(
          insertPlayerSchema
            .pick({
              id: true,
            })
            .required({ id: true }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.playersToAdd.length > 0) {
        await ctx.db.insert(groupPlayer).values(
          input.playersToAdd.map((player) => ({
            groupId: input.group.id,
            playerId: player.id,
          })),
        );
      }
      if (input.playersToRemove.length > 0) {
        await ctx.db.delete(groupPlayer).where(
          and(
            inArray(
              groupPlayer.playerId,
              input.playersToRemove.map((player) => player.id),
            ),
            eq(groupPlayer.groupId, input.group.id),
          ),
        );
      }
    }),
  deleteGroup: protectedUserProcedure
    .input(selectGroupSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(groupPlayer).where(eq(groupPlayer.groupId, input.id));
      await ctx.db
        .delete(group)
        .where(and(eq(group.id, input.id), eq(group.createdBy, ctx.userId)));
    }),
});
