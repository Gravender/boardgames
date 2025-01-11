import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, max, sql } from "drizzle-orm";
import { z } from "zod";

import {
  game,
  image,
  insertGameSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
  match,
  round,
  scoresheet,
  selectGameSchema,
} from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

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
              type: "Default",
            })
            .returning()
        )[0]?.id;
        if (!scoresheetId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
        await ctx.db.insert(round).values({
          name: "Round 1",
          scoresheetId: scoresheetId,
          type: "Numeric",
          order: 1,
        });
      } else {
        const scoresheetId = (
          await ctx.db
            .insert(scoresheet)
            .values({
              ...input.scoresheet,
              userId: ctx.userId,
              gameId: returningGame[0].id,
              type: "Default",
            })
            .returning()
        )[0]?.id;
        if (!scoresheetId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const rounds = input.rounds.map((round, index) => ({
          ...round,
          scoresheetId: scoresheetId,
          order: index + 1,
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
              matchPlayers: {
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
        imageUrl: result.image?.url,
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
              match.matchPlayers.findIndex(
                (player) =>
                  player.winner && player.player.userId === ctx.userId,
              ) !== -1,
            name: match.name,
            finished: match.finished,
          };
        }),
      };
    }),
  getGameMetaData: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = (
        await ctx.db
          .select({ id: game.id, name: game.name, image: image.url })
          .from(game)
          .where(eq(game.id, input.id))
          .leftJoin(image, eq(game.imageId, image.id))
          .limit(1)
      )[0];
      if (!result) return null;
      return {
        id: result.id,
        name: result.name,
        imageUrl: result.image,
      };
    }),
  getEditGame: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: and(eq(game.id, input.id), eq(game.userId, ctx.userId)),
        with: {
          image: true,
          scoresheets: {
            with: {
              rounds: {
                orderBy: round.order,
              },
            },
            where: (scoresheets, { eq }) => eq(scoresheets.type, "Default"),
          },
        },
      });
      if (!result) return null;
      const resultScoresheet = result.scoresheets[0];
      const resultRounds = resultScoresheet?.rounds;
      if (!resultScoresheet) return null;
      return {
        id: result.id,
        name: result.name,
        imageUrl: result.image?.url ?? "",
        playersMin: result.playersMin,
        playersMax: result.playersMax,
        playtimeMin: result.playtimeMin,
        playtimeMax: result.playtimeMax,
        yearPublished: result.yearPublished,
        ownedBy: result.ownedBy,
        scoresheet: {
          id: resultScoresheet.id,
          name: resultScoresheet.name,
          winCondition: resultScoresheet.winCondition,
          isCoop: resultScoresheet.isCoop,
          roundsScore: resultScoresheet.roundsScore,
          targetScore: resultScoresheet.targetScore,
        },
        rounds: resultRounds ?? [],
      };
    }),
  getGameStats: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: eq(game.id, input.id),
        with: {
          image: true,
          matches: {
            with: {
              matchPlayers: {
                with: {
                  player: {
                    with: {
                      image: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!result) return null;
      const matches = result.matches.map((match) => {
        const winners = match.matchPlayers.filter((player) => player.winner);
        return {
          id: match.id,
          date: match.date,
          won:
            match.matchPlayers.findIndex(
              (player) => player.winner && player.player.userId === ctx.userId,
            ) !== -1,
          name: match.name,
          duration: match.duration,
          finished: match.finished,
          players: match.matchPlayers.map((player) => {
            return {
              id: player.player.id,
              name: player.player.name,
              isWinner: player.winner,
              score: player.score,
              imageUrl: player.player.image?.url,
            };
          }),
          winners: winners.map((player) => {
            return {
              id: player.player.id,
              name: player.player.name,
              isWinner: player.winner,
              score: player.score,
            };
          }),
        };
      });
      matches.sort((a, b) => b.date.getTime() - a.date.getTime());
      const players = matches.reduce(
        (acc, match) => {
          match.players.forEach((player) => {
            const accPlayer = acc[player.id];
            if (!accPlayer) {
              acc[player.id] = {
                id: player.id,
                name: player.name,
                plays: 1,
                wins: player.isWinner ? 1 : 0,
                winRate: player.isWinner ? 1 : 0,
                imageUrl: player.imageUrl ?? "",
              };
            } else {
              accPlayer.plays++;
              if (player.isWinner) accPlayer.wins++;
              accPlayer.winRate = accPlayer.wins / accPlayer.plays;
            }
          });
          return acc;
        },
        {} as Record<
          number,
          {
            id: number;
            name: string;
            plays: number;
            wins: number;
            winRate: number;
            imageUrl: string;
          }
        >,
      );
      const duration = matches.reduce((acc, match) => {
        return acc + match.duration;
      }, 0);
      return {
        id: result.id,
        name: result.name,
        yearPublished: result.yearPublished,
        imageUrl: result.image?.url ?? "",
        ownedBy: result.ownedBy,
        matches: matches,
        duration: duration,
        players: Object.values(players),
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
        lastPlayed: sql`max(${match.date})`.mapWith(match.date),
      })
      .from(game)
      .where(and(eq(game.userId, ctx.userId), eq(game.deleted, false)))
      .leftJoin(image, eq(game.imageId, image.id))
      .leftJoin(match, eq(game.id, match.gameId))
      .groupBy(game.id, image.url)
      .orderBy(max(match.date), game.name);
    return games;
  }),

  updateGame: protectedUserProcedure
    .input(
      z.object({
        game: z.object({
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
        scoresheet: insertScoreSheetSchema
          .pick({
            id: true,
            winCondition: true,
            isCoop: true,
            roundsScore: true,
            targetScore: true,
          })
          .required({ id: true })
          .extend({ name: z.string().optional() })
          .nullable(),
        roundsToEdit: z
          .array(
            insertRoundSchema
              .pick({
                id: true,
                type: true,
                score: true,
                color: true,
              })
              .required({ id: true })
              .extend({ name: z.string().optional() }),
          )
          .nullable(),
        roundsToAdd: z
          .array(
            insertRoundSchema
              .omit({
                createdAt: true,
                updatedAt: true,
                id: true,
              })
              .required({ name: true }),
          )
          .nullable(),
        roundsToDelete: z.array(z.number()).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(game)
        .set({ ...input.game })
        .where(eq(game.id, input.game.id));
      if (input.scoresheet) {
        await ctx.db
          .update(scoresheet)
          .set({ ...input.scoresheet })
          .where(eq(scoresheet.id, input.scoresheet.id));
      }
      if (input.roundsToEdit) {
        await Promise.all(
          input.roundsToEdit.map(async (roundToUpdate) => {
            await ctx.db
              .update(round)
              .set({ ...roundToUpdate })
              .where(eq(round.id, roundToUpdate.id));
          }),
        );
      }
      if (input.roundsToAdd) {
        await ctx.db.insert(round).values(input.roundsToAdd);
      }
      if (input.roundsToDelete) {
        await ctx.db
          .delete(round)
          .where(inArray(round.id, input.roundsToDelete));
      }
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
