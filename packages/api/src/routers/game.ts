import type { SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import type {
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundPlayerSchema,
} from "@board-games/db/schema";
import {
  game,
  image,
  insertGameSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
  location,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
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
  getGameScoresheets: protectedUserProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ ctx, input }) => {
      const returnedScoresheets = await ctx.db.query.scoresheet.findMany({
        where: and(
          eq(scoresheet.userId, ctx.userId),
          eq(scoresheet.gameId, input.gameId),
          or(eq(scoresheet.type, "Default"), eq(scoresheet.type, "Game")),
        ),
      });
      return returnedScoresheets;
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
  insertGames: protectedUserProcedure
    .input(
      z.object({
        games: z.array(
          z.object({
            bggId: z.number(),
            bggName: z.string(),
            bggYear: z.number(),
            cooperative: z.boolean(),
            designers: z.string(),
            highestWins: z.boolean(),
            id: z.number(),
            isBaseGame: z.number(),
            isExpansion: z.number(),
            maxPlayerCount: z.number(),
            maxPlayTime: z.number(),
            minAge: z.number(),
            minPlayerCount: z.number(),
            minPlayTime: z.number(),
            modificationDate: z.string(),
            name: z.string(),
            noPoints: z.boolean(),
            preferredImage: z.number(),
            previouslyPlayedAmount: z.number(),
            rating: z.number(),
            urlImage: z.string(),
            urlThumb: z.string(),
            usesTeams: z.boolean(),
          }),
        ),
        plays: z.array(
          z.object({
            bggId: z.number(),
            bggLastSync: z.string().optional(),
            durationMin: z.number(),
            entryDate: z.string(),
            expansionPlays: z.array(z.unknown()),
            gameRefId: z.number(),
            ignored: z.boolean(),
            importPlayId: z.number(),
            locationRefId: z.number(),
            manualWinner: z.boolean(),
            metaData: z.string().optional(),
            modificationDate: z.string(),
            nemestatsId: z.number(),
            playDate: z.string(),
            playDateYmd: z.number(),
            playerScores: z.array(
              z.object({
                newPlayer: z.boolean(),
                playerRefId: z.number(),
                rank: z.number(),
                score: z.string(),
                seatOrder: z.number(),
                startPlayer: z.boolean(),
                winner: z.boolean(),
                team: z.string().optional(),
              }),
            ),
            playImages: z.string(),
            rating: z.number(),
            rounds: z.number(),
            scoringSetting: z.number(),
            usesTeams: z.boolean(),
            uuid: z.string(),
            comments: z.string().optional(),
          }),
        ),
        players: z.array(
          z.object({
            bggUsername: z.string().optional(),
            id: z.number(),
            isAnonymous: z.boolean(),
            modificationDate: z.string(),
            name: z.string(),
            uuid: z.string(),
          }),
        ),
        locations: z.array(
          z.object({
            id: z.number(),
            modificationDate: z.string(),
            name: z.string(),
            uuid: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentGames = await ctx.db.query.game.findMany({
        where: eq(game.userId, ctx.userId),
      });
      if (currentGames.length > 0) {
        return null;
      }
      const mappedGames = input.games.map((game) => ({
        name: game.name,
        minPlayers: game.minPlayerCount,
        maxPlayers: game.maxPlayerCount,
        playingTime: game.maxPlayTime,
        minPlayTime: game.minPlayTime,
        maxPlayTime: game.maxPlayTime,
        yearPublished: game.bggYear,
        age: game.minAge,
        noPoints: game.noPoints,
        isCoop: game.cooperative,
        description: "", // No direct mapping in Root, so leaving empty
        plays: input.plays
          .filter((play) => play.gameRefId === game.id)
          .map((play) => ({
            name: game.name,
            participants: play.playerScores.map((playerScore) => {
              const player = input.players.find(
                (p) => p.id === playerScore.playerRefId,
              );
              return {
                name: player?.name,
                order: playerScore.seatOrder,
                score:
                  playerScore.score !== "" && !game.noPoints
                    ? Number(playerScore.score)
                    : undefined,
                finishPlace: playerScore.rank,
                isWinner: playerScore.winner,
                team: playerScore.team,
                isNew: playerScore.newPlayer,
              };
            }),
            dateLong: new Date(play.playDate).getTime(),
            dateString: play.playDate,
            duration: play.durationMin,
            isFinished: true, // No direct mapping
            comment: play.comments,
            location: input.locations.find(
              (loc) => loc.id === play.locationRefId,
            ) && {
              name: input.locations.find((loc) => loc.id === play.locationRefId)
                ?.name,
            },
            usesTeams: play.usesTeams,
          })),
      }));

      for (const mappedGame of mappedGames) {
        const [returningGame] = await ctx.db
          .insert(game)
          .values({
            name: mappedGame.name,
            description: mappedGame.description,
            ownedBy: false,
            yearPublished: mappedGame.yearPublished,
            playersMin: mappedGame.minPlayers,
            playersMax: mappedGame.maxPlayers,
            playtimeMin: mappedGame.minPlayTime,
            playtimeMax: mappedGame.maxPlayTime,
            userId: ctx.userId,
          })
          .returning();
        if (!returningGame) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create game",
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const winConditionOptions = insertScoreSheetSchema
          .required()
          .pick({ winCondition: true }).shape.winCondition.options;
        let winCondition: (typeof winConditionOptions)[number] =
          "Highest Score";
        if (mappedGame.noPoints) {
          winCondition = "Manual";
        }
        const [returnedScoresheet] = await ctx.db
          .insert(scoresheet)
          .values({
            name: "Default",
            userId: ctx.userId,
            gameId: returningGame.id,
            isCoop: mappedGame.isCoop,
            type: "Default",
            winCondition: winCondition,
          })
          .returning();
        if (!returnedScoresheet) {
          throw new Error("Failed to create scoresheet");
        }
        await ctx.db.insert(round).values({
          name: "Round 1",
          order: 1,
          type: "Numeric",
          scoresheetId: returnedScoresheet.id,
        });
        for (const [index, play] of mappedGame.plays.entries()) {
          const currentLocations = await ctx.db.query.location.findMany();
          const currentLocation =
            play.location && "name" in play.location && play.location.name
              ? play.location
              : undefined;
          let locationId = currentLocations.find(
            (location) => location.name === currentLocation?.name,
          )?.id;
          if (!locationId && currentLocation?.name) {
            const [newLocation] = await ctx.db
              .insert(location)
              .values({ createdBy: ctx.userId, name: currentLocation.name })
              .returning();
            locationId = newLocation?.id;
          }
          const [playScoresheet] = await ctx.db
            .insert(scoresheet)
            .values({
              name: returnedScoresheet.name,
              gameId: returnedScoresheet.gameId,
              userId: ctx.userId,
              isCoop: returnedScoresheet.isCoop,
              winCondition: returnedScoresheet.winCondition,
              targetScore: returnedScoresheet.targetScore,
              roundsScore: returnedScoresheet.roundsScore,
              type: "Match",
            })
            .returning();
          if (!playScoresheet) {
            throw new Error("Failed to create scoresheet");
          }
          const [insertedRound] = await ctx.db
            .insert(round)
            .values({
              name: "Round 1",
              order: 1,
              type: "Numeric",
              scoresheetId: playScoresheet.id,
            })
            .returning();
          if (!insertedRound) {
            throw new Error("Failed to create round");
          }
          const matchToInsert: z.infer<typeof insertMatchSchema> = {
            userId: ctx.userId,
            scoresheetId: playScoresheet.id,
            gameId: returningGame.id,
            name: `${mappedGame.name} #${index + 1}`,
            date: new Date(play.dateString),
            finished: play.isFinished,
            locationId: locationId,
          };
          const [returningMatch] = await ctx.db
            .insert(match)
            .values(matchToInsert)
            .returning();
          if (!returningMatch) {
            throw new Error("Failed to create match");
          }
          const playersToInsert: z.infer<typeof insertPlayerSchema>[] =
            play.participants.map((player) => ({
              name: player.name ?? "Unknown",
              createdBy: ctx.userId,
            }));

          // Fetch current players for the user
          let currentPlayers = await ctx.db
            .select({ id: player.id, name: player.name })
            .from(player)
            .where(eq(player.createdBy, ctx.userId));

          // Filter out existing players
          const newPlayers = playersToInsert.filter(
            (player) =>
              !currentPlayers.some(
                (existingPlayer) => existingPlayer.name === player.name,
              ),
          );

          // Insert new players only if there are any
          if (newPlayers.length > 0) {
            const insertedPlayers = await ctx.db
              .insert(player)
              .values(newPlayers)
              .returning();
            currentPlayers = currentPlayers.concat(insertedPlayers); // Update currentPlayers with newly inserted ones
          }

          const calculatePlacement = (playerName: string) => {
            const sortedParticipants = [...play.participants];
            sortedParticipants.sort((a, b) => {
              if (a.score !== undefined && b.score !== undefined) {
                return b.score - a.score; // Higher scores get a better position
              }
              return a.order - b.order; // Otherwise, use seat order as a fallback
            });
            let placement = 1;
            let prevScore = -1;
            for (const [
              playerIndex,
              sortPlayer,
            ] of sortedParticipants.entries()) {
              if (playerIndex > 0 && prevScore !== sortPlayer.score) {
                placement = playerIndex + 1;
              }
              prevScore = sortPlayer.score ?? 0;
              if (sortPlayer.name === playerName) {
                return placement;
              }
            }
            return 0;
          };

          const matchPlayersToInsert: z.infer<
            typeof insertMatchPlayerSchema
          >[] = play.participants.map((player) => {
            const foundPlayer = currentPlayers.find(
              (p) => p.name === player.name,
            );
            if (!foundPlayer) {
              throw new Error(
                `Error player ${player.name} not Found Game:${mappedGame.name} Play:${play.name}`,
              );
            }
            if (
              play.participants.every(
                (p) => p.finishPlace === player.finishPlace,
              ) &&
              !play.participants.every((p) => p.isWinner === player.isWinner) &&
              !mappedGame.isCoop
            ) {
              return {
                matchId: returningMatch.id,
                playerId: foundPlayer.id,
                score: player.score,
                winner: player.isWinner,
                order: player.order,
                placement: calculatePlacement(player.name ?? ""),
              };
            }
            return {
              matchId: returningMatch.id,
              playerId: foundPlayer.id,
              score: player.score,
              winner: player.isWinner,
              order: player.order,
              placement: player.finishPlace,
            };
          });
          const matchPlayers = await ctx.db
            .insert(matchPlayer)
            .values(matchPlayersToInsert)
            .returning();
          const roundPlayersToInsert: z.infer<
            typeof insertRoundPlayerSchema
          >[] = matchPlayers.map((matchPlayer) => {
            return {
              roundId: insertedRound.id,
              matchPlayerId: matchPlayer.id,
              score: Number(matchPlayer.score),
            };
          });
          await ctx.db.insert(roundPlayer).values(roundPlayersToInsert);
        }
      }
    }),
});
