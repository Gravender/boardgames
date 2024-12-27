import { TRPCError } from "@trpc/server";
import { add } from "date-fns";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import {
  group,
  groupPlayer,
  insertGroupSchema,
  insertPlayerSchema,
} from "~/server/db/schema";

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
});
