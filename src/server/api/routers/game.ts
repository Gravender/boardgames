import { TRPCError } from "@trpc/server";
import { and, count, eq, sql } from "drizzle-orm";
import { string, z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import {
  game,
  image,
  insertGameSchema,
  insertScoreSheetSchema,
  match,
  round,
  scoresheet,
  selectGameSchema,
} from "~/server/db/schema";
import { insertRoundSchema } from "~/server/db/schema/round";

export const gameRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(
      z.object({
        game: insertGameSchema.omit({
          userId: true,
          id: true,
          createdAt: true,
          updatedAt: true,
        }),
        scoresheet: insertScoreSheetSchema
          .omit({
            id: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            type: true,
            gameId: true,
            roundsScore: true,
          })
          .required({ name: true })
          .or(z.null()),
        rounds: z.array(
          insertRoundSchema
            .omit({
              id: true,
              createdAt: true,
              updatedAt: true,
              scoresheetId: true,
            })
            .required({ name: true }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const returningGame = await ctx.db
        .insert(game)
        .values({ ...input.game, userId: ctx.userId })
        .returning();
      if (!returningGame[0]?.id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      if (!input.scoresheet) {
        const scoresheetId = (
          await ctx.db
            .insert(scoresheet)
            .values({
              name: "Default",
              userId: ctx.userId,
              gameId: returningGame[0].id,
            })
            .returning()
        )?.[0]?.id;
        if (!scoresheetId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
        await ctx.db.insert(round).values({
          name: "Round 1",
          scoresheetId: scoresheetId,
          type: "Numeric",
        });
      } else {
        const scoresheetId = (
          await ctx.db
            .insert(scoresheet)
            .values({
              ...input.scoresheet,
              userId: ctx.userId,
              gameId: returningGame[0].id,
            })
            .returning()
        )?.[0]?.id;
        if (!scoresheetId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const rounds = input.rounds.map((round) => ({
          ...round,
          scoresheetId: scoresheetId,
        })) ?? [{ name: "Round 1", type: "Numeric" }];
        await ctx.db.insert(round).values(rounds);
      }
    }),
  getGame: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: and(eq(game.id, input.id), eq(game.userId, ctx.userId)),
        with: {
          image: {
            columns: {
              url: true,
            },
          },
          matches: {
            with: {
              players: {
                with: {
                  player: true,
                },
              },
            },
            orderBy: (matches, { desc }) => [desc(matches.date)],
            where: (matches, { eq }) => eq(matches.userId, ctx.userId),
          },
        },
      });
      if (!result) return null;
      return {
        id: result.id,
        name: result.name,
        imageUrl: result?.image?.url,
        players: {
          min: result.playersMin,
          max: result.playersMax,
        },
        playtime: {
          min: result.playtimeMin,
          max: result.playtimeMax,
        },
        yearPublished: result.yearPublished,
        ownedBy: result.ownedBy,
        matches: result.matches.map((match) => {
          return {
            id: match.id,
            date: match.date,
            won:
              match.players.findIndex(
                (player) =>
                  player.winner && player.player.userId === ctx.userId,
              ) !== -1,
            name: match.name,
          };
        }),
      };
    }),
  getGameName: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: eq(game.id, input.id),
        columns: {
          name: true,
        },
      });
      if (!result) return null;
      return result.name;
    }),
  getGames: protectedUserProcedure.query(async ({ ctx }) => {
    const games = await ctx.db
      .select({
        id: game.id,
        name: game.name,
        players: {
          min: game.playersMin,
          max: game.playersMax,
        },
        playtime: {
          min: game.playtimeMin,
          max: game.playtimeMax,
        },
        yearPublished: game.yearPublished,
        image: image.url,
        ownedBy: game.ownedBy,
        games: count(match.id),
        lastPlayed: sql`max(${match.createdAt})`.mapWith(match.createdAt),
      })
      .from(game)
      .where(and(eq(game.userId, ctx.userId), eq(game.deleted, false)))
      .leftJoin(image, eq(game.imageId, image.id))
      .leftJoin(match, eq(game.id, match.gameId))
      .groupBy(game.id, image.url)
      .orderBy(game.name, image.url);
    return games;
  }),
  updateGame: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        ownedBy: z.boolean().nullish(),
        imageId: z.number().nullish(),
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
