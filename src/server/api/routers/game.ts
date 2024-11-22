import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import { game, user, insertGameSchema } from "~/server/db/schema";

export const gameRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(insertGameSchema.partial({ userId: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(game).values({ ...input, userId: ctx.userId });
    }),
  getGames: protectedUserProcedure.query(async ({ ctx }) => {
    const games = await ctx.db
      .select()
      .from(game)
      .where(eq(game.userId, ctx.userId));
    return games;
  }),
});
