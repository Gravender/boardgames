import { TRPCError } from "@trpc/server";
import { count, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import { game, user, insertGameSchema, matches } from "~/server/db/schema";

export const gameRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(insertGameSchema.partial({ userId: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(game).values({ ...input, userId: ctx.userId });
    }),
  getGames: protectedUserProcedure.query(async ({ ctx }) => {
    const games = await ctx.db
      .select({
        id: game.id,
        name: game.name,
        gameImg: game.gameImg,
        players: {
          min: game.playersMin,
          max: game.playersMax,
        },
        playtime: {
          min: game.playtimeMin,
          max: game.playtimeMax,
        },
        yearPublished: game.yearPublished,
        ownedBy: game.ownedBy,
        games: count(matches.id),
        lastPlayed: sql`max(${matches.createdAt})`.mapWith(matches.createdAt),
      })
      .from(game)
      .where(eq(game.userId, ctx.userId))
      .leftJoin(matches, eq(game.id, matches.gameId))
      .groupBy(game.id)
      .orderBy(game.name);
    return games;
  }),
});
