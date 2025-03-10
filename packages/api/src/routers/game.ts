import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, sql } from "drizzle-orm";
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
import { baseRoundSchema, editScoresheetSchema } from "@board-games/shared";

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
        scoresheets: z.array(
          z.object({
            scoresheet: insertScoreSheetSchema
              .omit({
                id: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
                type: true,
                gameId: true,
              })
              .required({ name: true }),
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
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [returningGame] = await ctx.db
        .insert(game)
        .values({ ...input.game, userId: ctx.userId })
        .returning();
      if (!returningGame?.id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      if (input.scoresheets.length === 0) {
        const scoresheetId = (
          await ctx.db
            .insert(scoresheet)
            .values({
              name: "Default",
              userId: ctx.userId,
              gameId: returningGame.id,
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
        for (const inputScoresheet of input.scoresheets) {
          const [returnedScoresheet] = await ctx.db
            .insert(scoresheet)
            .values({
              ...inputScoresheet.scoresheet,
              userId: ctx.userId,
              gameId: returningGame.id,
              type: "Game",
            })
            .returning();
          if (!returnedScoresheet) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }

          const rounds = inputScoresheet.rounds.map((round, index) => ({
            ...round,
            scoresheetId: returnedScoresheet.id,
            order: index + 1,
          }));
          await ctx.db.insert(round).values(rounds);
        }
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
        columns: {
          id: true,
          name: true,
          playersMin: true,
          playersMax: true,
          playtimeMin: true,
          playtimeMax: true,
          yearPublished: true,
          ownedBy: true,
        },
        where: and(eq(game.id, input.id), eq(game.userId, ctx.userId)),
        with: {
          image: true,
          scoresheets: {
            columns: {
              id: true,
              name: true,
              winCondition: true,
              isCoop: true,
              roundsScore: true,
              targetScore: true,
            },
            with: {
              rounds: {
                columns: {
                  id: true,
                  name: true,
                  type: true,
                  score: true,
                  color: true,
                  lookup: true,
                  modifier: true,
                  order: true,
                },
                orderBy: round.order,
              },
            },
            where: inArray(scoresheet.type, ["Game", "Default"]),
          },
        },
      });
      if (!result) return null;
      return {
        game: {
          id: result.id,
          name: result.name,
          imageUrl: result.image?.url ?? "",
          playersMin: result.playersMin,
          playersMax: result.playersMax,
          playtimeMin: result.playtimeMin,
          playtimeMax: result.playtimeMax,
          yearPublished: result.yearPublished,
          ownedBy: result.ownedBy ?? false,
        },
        scoresheets: result.scoresheets.map((scoresheet) => ({
          ...scoresheet,
          rounds: scoresheet.rounds.map((round) => ({
            ...round,
            roundId: round.id,
          })),
        })),
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
        createdAt: game.createdAt,
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
      .groupBy(game.id, image.url);
    return games
      .map((returnedGame) => ({
        ...returnedGame,
        lastPlayed: returnedGame.games < 1 ? null : returnedGame.lastPlayed,
      }))
      .toSorted((a, b) => {
        if (a.lastPlayed && b.lastPlayed) {
          return b.lastPlayed.getTime() - a.lastPlayed.getTime();
        } else if (a.lastPlayed && !b.lastPlayed) {
          return b.createdAt.getTime() - a.lastPlayed.getTime();
        } else if (!a.lastPlayed && b.lastPlayed) {
          return b.lastPlayed.getTime() - a.createdAt.getTime();
        } else {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
      });
  }),

  updateGame: protectedUserProcedure
    .input(
      z.object({
        game: z.discriminatedUnion("type", [
          z.object({
            type: z.literal("updateGame"),
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
          z.object({ type: z.literal("default"), id: z.number() }),
        ]),
        scoresheets: z.array(
          z.discriminatedUnion("type", [
            z.object({
              type: z.literal("New"),
              scoresheet: editScoresheetSchema,
              rounds: z.array(
                baseRoundSchema.extend({
                  order: z.number(),
                }),
              ),
            }),
            z.object({
              type: z.literal("Update Scoresheet"),
              scoresheet: editScoresheetSchema.omit({ name: true }).extend({
                id: z.number(),
                name: z.string().optional(),
              }),
            }),
            z.object({
              type: z.literal("Update Scoresheet & Rounds"),
              scoresheet: editScoresheetSchema
                .omit({ name: true })
                .extend({
                  id: z.number(),
                  name: z.string().optional(),
                })
                .nullable(),
              roundsToEdit: z.array(
                baseRoundSchema
                  .omit({ name: true, order: true })
                  .extend({ id: z.number(), name: z.string().optional() }),
              ),
              roundsToAdd: z.array(
                baseRoundSchema.extend({
                  scoresheetId: z.number(),
                  order: z.number(),
                }),
              ),
              roundsToDelete: z.array(z.number()),
            }),
          ]),
        ),
        scoresheetsToDelete: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.game.type === "updateGame") {
        await ctx.db
          .update(game)
          .set({ ...input.game })
          .where(eq(game.id, input.game.id));
      }
      if (input.scoresheets.length > 0) {
        await ctx.db.transaction(async (transaction) => {
          for (const inputScoresheet of input.scoresheets) {
            if (inputScoresheet.type === "New") {
              const [returnedScoresheet] = await transaction
                .insert(scoresheet)
                .values({
                  name: inputScoresheet.scoresheet.name,
                  winCondition: inputScoresheet.scoresheet.winCondition,
                  isCoop: inputScoresheet.scoresheet.isCoop,
                  roundsScore: inputScoresheet.scoresheet.roundsScore,
                  targetScore: inputScoresheet.scoresheet.targetScore,

                  userId: ctx.userId,
                  gameId: input.game.id,
                  type: "Game",
                })
                .returning();
              if (!returnedScoresheet) {
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
              }

              const roundsToInsert = inputScoresheet.rounds.map(
                (round, index) => ({
                  name: round.name,
                  type: round.type,
                  score: round.score,
                  color: round.color,
                  lookup: round.lookup,
                  modifier: round.modifier,
                  scoresheetId: returnedScoresheet.id,
                  order: index + 1,
                }),
              );
              await transaction.insert(round).values(roundsToInsert);
            }
            if (inputScoresheet.type === "Update Scoresheet") {
              await transaction
                .update(scoresheet)
                .set({
                  name: inputScoresheet.scoresheet.name,
                  winCondition: inputScoresheet.scoresheet.winCondition,
                  isCoop: inputScoresheet.scoresheet.isCoop,
                  roundsScore: inputScoresheet.scoresheet.roundsScore,
                  targetScore: inputScoresheet.scoresheet.targetScore,
                })
                .where(eq(scoresheet.id, inputScoresheet.scoresheet.id));
            }
            if (inputScoresheet.type === "Update Scoresheet & Rounds") {
              if (inputScoresheet.scoresheet !== null) {
                await transaction
                  .update(scoresheet)
                  .set({
                    name: inputScoresheet.scoresheet.name,
                    winCondition: inputScoresheet.scoresheet.winCondition,
                    isCoop: inputScoresheet.scoresheet.isCoop,
                    roundsScore: inputScoresheet.scoresheet.roundsScore,
                    targetScore: inputScoresheet.scoresheet.targetScore,
                  })
                  .where(eq(scoresheet.id, inputScoresheet.scoresheet.id));
              }
              if (inputScoresheet.roundsToEdit.length > 0) {
                const ids = inputScoresheet.roundsToEdit.map((p) => p.id);
                const nameSqlChunks: SQL[] = [sql`(case`];
                const scoreSqlChunks: SQL[] = [sql`(case`];
                const typeSqlChunks: SQL[] = [sql`(case`];
                const colorSqlChunks: SQL[] = [sql`(case`];
                const lookupSqlChunks: SQL[] = [sql`(case`];
                const modifierSqlChunks: SQL[] = [sql`(case`];
                for (const inputRound of inputScoresheet.roundsToEdit) {
                  nameSqlChunks.push(
                    sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.name}::varchar`}`,
                  );
                  scoreSqlChunks.push(
                    sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.score}::integer`}`,
                  );
                  typeSqlChunks.push(
                    sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.type}::varchar`}`,
                  );
                  colorSqlChunks.push(
                    sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.color}::varchar`}`,
                  );
                  lookupSqlChunks.push(
                    sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.lookup}::integer`}`,
                  );
                  modifierSqlChunks.push(
                    sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.modifier}::integer`}`,
                  );
                }
                nameSqlChunks.push(sql`end)`);
                scoreSqlChunks.push(sql`end)`);
                typeSqlChunks.push(sql`end)`);
                colorSqlChunks.push(sql`end)`);
                lookupSqlChunks.push(sql`end)`);
                modifierSqlChunks.push(sql`end)`);

                // Join each array of CASE chunks into a single SQL expression
                const finalNameSql = sql.join(nameSqlChunks, sql.raw(" "));
                const finalScoreSql = sql.join(scoreSqlChunks, sql.raw(" "));
                const finalTypeSql = sql.join(typeSqlChunks, sql.raw(" "));
                const finalColorSql = sql.join(colorSqlChunks, sql.raw(" "));
                const finalLookupSql = sql.join(lookupSqlChunks, sql.raw(" "));
                const finalModifierSql = sql.join(
                  modifierSqlChunks,
                  sql.raw(" "),
                );

                // Perform the bulk update
                await transaction
                  .update(round)
                  .set({
                    name: finalNameSql,
                    score: finalScoreSql,
                    type: finalTypeSql,
                    color: finalColorSql,
                    lookup: finalLookupSql,
                    modifier: finalModifierSql,
                  })
                  .where(inArray(round.id, ids));
              }
              if (inputScoresheet.roundsToAdd.length > 0) {
                await transaction
                  .insert(round)
                  .values(inputScoresheet.roundsToAdd);
              }
              if (inputScoresheet.roundsToDelete.length > 0) {
                await transaction
                  .delete(round)
                  .where(inArray(round.id, inputScoresheet.roundsToDelete));
              }
            }
          }
        });
      }
      if (input.scoresheetsToDelete.length > 0) {
        await ctx.db
          .delete(round)
          .where(inArray(round.scoresheetId, input.scoresheetsToDelete));
        await ctx.db
          .delete(scoresheet)
          .where(inArray(scoresheet.id, input.scoresheetsToDelete));
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
