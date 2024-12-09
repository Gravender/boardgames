import { and, count, desc, eq, max, sql } from "drizzle-orm";

import { game, match, matchPlayer, player, user } from "~/server/db/schema";

import { publicProcedure } from "../trpc";

export const dashboardRouter = {
  getGames: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.userId) {
      return [];
    }
    const returnedUser = (
      await ctx.db
        .selectDistinct()
        .from(user)
        .where(eq(user.clerkUserId, ctx.auth.userId))
    )[0];
    if (!returnedUser) {
      return [];
    }
    const games = await ctx.db
      .select({
        id: game.id,
        name: game.name,
        lastPlayed: sql`max(${match.date})`.mapWith(match.date),
      })
      .from(game)
      .where(and(eq(game.userId, returnedUser.id), eq(game.deleted, false)))
      .leftJoin(match, eq(game.id, match.gameId))
      .groupBy(game.id)
      .orderBy(max(match.date), game.name)
      .limit(5);
    return games;
  }),
  getPlayers: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.userId) {
      return [];
    }
    const returnedUser = (
      await ctx.db
        .selectDistinct()
        .from(user)
        .where(eq(user.clerkUserId, ctx.auth.userId))
    )[0];
    if (!returnedUser) {
      return [];
    }
    const players = await ctx.db
      .select({
        id: player.id,
        name: player.name,
      })
      .from(player)
      .where(eq(player.createdBy, returnedUser.id))
      .leftJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
      .groupBy(player.id)
      .orderBy(desc(count(matchPlayer)), player.name)
      .limit(5);
    return players;
  }),
};
