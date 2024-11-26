import { TRPCError } from "@trpc/server";
import { and, count, eq, sql } from "drizzle-orm";
import { string, z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import {
  game,
  insertGameSchema,
  matches,
  selectGameSchema,
} from "~/server/db/schema";

export const gameRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(insertGameSchema.omit({ userId: true, id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(game).values({ ...input, userId: ctx.userId });
    }),
  getGame: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      return ctx.db
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
        })
        .from(game)
        .where(
          and(
            eq(game.userId, ctx.userId),
            eq(game.id, input.id),
            eq(game.deleted, false),
          ),
        );
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
      .where(and(eq(game.userId, ctx.userId), eq(game.deleted, false)))
      .leftJoin(matches, eq(game.id, matches.gameId))
      .groupBy(game.id)
      .orderBy(game.name);
    return games;
  }),
  updateGame: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        ownedBy: z.boolean().nullish(),
        gameImg: z.string().nullish(),
        playersMin: z.number().nullish(),
        playersMax: z.number().nullish(),
        playtimeMin: z.number().nullish(),
        playtimeMax: z.number().nullish(),
        yearPublished: z.number().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(game)
        .set({ ...input })
        .where(eq(game.id, input.id));
    }),
  deleteGame: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(game)
        .set({ deleted: true })
        .where(and(eq(game.id, input.id), eq(game.userId, ctx.userId)));
    }),
});
