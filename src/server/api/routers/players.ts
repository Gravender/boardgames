import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import {
  game,
  image,
  insertPlayerSchema,
  match,
  matchPlayer,
  player,
  selectGameSchema,
  selectPlayerSchema,
} from "~/server/db/schema";

export const playerRouter = createTRPCRouter({
  getPlayersByGame: protectedUserProcedure
    .input(
      z.object({
        game: selectGameSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sq = ctx.db
        .select({
          playerId: player.id,
          matches: sql<number>`count(${match.id})`.as("matches"),
          name: player.name,
          imageId: player.imageId,
        })
        .from(player)
        .leftJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
        .leftJoin(
          match,
          and(
            eq(match.id, matchPlayer.matchId),
            eq(match.gameId, input.game.id),
          ),
        )
        .where(and(eq(player.createdBy, ctx.userId)))
        .groupBy(player.id)
        .orderBy(desc(count(match.id)))
        .as("sq");
      const players = await ctx.db
        .select({
          playerId: sq.playerId,
          matches: sq.matches,
          name: sq.name,
          imageUrl: image.url,
        })
        .from(image)
        .rightJoin(sq, eq(image.id, sq.imageId));
      if (players.length === 0) {
        //TODO use clerk to get name
        await ctx.db
          .insert(player)
          .values({ createdBy: ctx.userId, userId: ctx.userId, name: "Me" });
        const returnedPlayer = await ctx.db.query.player.findFirst({
          where: and(eq(player.createdBy, ctx.userId)),
          with: { image: true },
        });
        if (!returnedPlayer) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
        const returnPlay: {
          id: number;
          name: string;
          matches: number;
          imageUrl: string;
        } = {
          id: returnedPlayer.id,
          name: returnedPlayer.name,
          matches: 0,
          imageUrl: returnedPlayer.image?.url ?? "",
        };
        return [returnPlay];
      }
      return players.map<{
        id: number;
        name: string;
        matches: number;
        imageUrl: string;
      }>((player) => {
        return {
          id: player.playerId,
          name: player.name,
          matches: player.matches ?? 0,
          imageUrl: player?.imageUrl ?? "",
        };
      });
    }),
  getPlayers: protectedUserProcedure.query(async ({ ctx }) => {
    const sq = ctx.db
      .select({
        id: player.id,
        matches: sql<number>`count(${match.id})`.as("matches"),
        name: player.name,
        imageId: player.imageId,
        created: player.createdAt,
        lastPlayed: sql<Date>`max(${match.date})`
          .mapWith(match.date)
          .as("lastPlayed"),
        gameName: sql<string>`(
      SELECT ${game.name}
      FROM ${match}
      LEFT JOIN ${game} ON ${match.gameId} = ${game.id}
      WHERE ${match.id} = (
        SELECT ${match.id}
        FROM ${match}
        LEFT JOIN ${matchPlayer} ON ${match.id} = ${matchPlayer.matchId}
        WHERE ${matchPlayer.playerId} = ${player.id} and  ${match.finished} = true
        ORDER BY ${match.date} DESC
        LIMIT 1
      ) and ${match.finished} = true
    )`.as("gameName"),
        gameId: sql<number>`(
      SELECT ${game.id}
      FROM ${match}
      LEFT JOIN ${game} ON ${match.gameId} = ${game.id}
      WHERE ${match.id} = (
        SELECT ${match.id}
        FROM ${match}
        LEFT JOIN ${matchPlayer} ON ${match.id} = ${matchPlayer.matchId}
        WHERE ${matchPlayer.playerId} = ${player.id} and  ${match.finished} = true
        ORDER BY ${match.date} DESC
        LIMIT 1
      ) and ${match.finished} = true
    )`.as("gameId"),
      })
      .from(player)
      .leftJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
      .leftJoin(
        match,
        and(eq(match.id, matchPlayer.matchId), eq(match.finished, true)),
      )
      .where(eq(player.createdBy, ctx.userId))
      .groupBy(player.id, player.name, player.imageId)
      .as("sq");
    const playersWithImages = await ctx.db
      .select({
        id: sq.id,
        matches: sq.matches,
        name: sq.name,
        imageUrl: image.url,
        lastPlayed: sq.lastPlayed,
        gameName: sq.gameName,
        gameId: sq.gameId,
      })
      .from(image)
      .rightJoin(sq, eq(image.id, sq.imageId))
      .orderBy(desc(sq.matches));
    return playersWithImages;
  }),
  getPlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedPlayer = await ctx.db.query.player.findFirst({
        where: eq(player.id, input.id),
        with: {
          image: true,
          matchesByPlayer: {
            with: {
              match: {
                with: {
                  game: {
                    with: {
                      image: true,
                    },
                  },
                  matchPlayers: {
                    with: {
                      player: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!returnedPlayer) {
        return null;
      }
      const matches = returnedPlayer.matchesByPlayer.map((matchPlayer) => {
        return {
          id: matchPlayer.match.id,
          name: matchPlayer.match.name,
          date: matchPlayer.match.date,
          duration: matchPlayer.match.duration,
          finished: matchPlayer.match.finished,
          gameId: matchPlayer.match.game.id,
          gameName: matchPlayer.match.game.name,
          gameImageUrl: matchPlayer.match.game.image?.url,
          players: matchPlayer.match.matchPlayers.map((matchPlayer) => {
            return {
              id: matchPlayer.id,
              name: matchPlayer.player.name,
              score: matchPlayer.score,
              isWinner: matchPlayer.winner,
              playerId: matchPlayer.player.id,
            };
          }),
          outcome: {
            score: matchPlayer.score,
            isWinner: matchPlayer.winner,
          },
        };
      });
      matches.sort((a, b) => b.date.valueOf() - a.date.valueOf());
      const processedPlayer = {
        id: returnedPlayer.id,
        name: returnedPlayer.name,
        imageUrl: returnedPlayer.image?.url,
        matches: matches,
        duration: matches.reduce((acc, match) => {
          return acc + match.duration;
        }, 0),
        players: matches.reduce<number[]>((acc, match) => {
          match.players.forEach((player) => {
            if (!acc.find((p) => p === player.playerId)) {
              acc.push(player.playerId);
            }
          });
          return acc;
        }, []).length,
        winRate:
          matches.length > 0
            ? matches.reduce((acc, match) => {
                if (match.outcome.isWinner) {
                  return acc + 1;
                }
                return acc;
              }, 0) / matches.length
            : 0,
        games: matches
          .reduce<
            {
              id: number;
              name: string;
              imageUrl: string;
              wins: number;
              plays: number;
              winRate: number;
            }[]
          >((acc, match) => {
            const foundGame = acc.find((g) => g.id === match.gameId);
            if (foundGame) {
              foundGame.plays = foundGame.plays + 1;
              foundGame.wins =
                foundGame.wins + (match.outcome.isWinner ? 1 : 0);
              foundGame.winRate = foundGame.wins / foundGame.plays;
            } else {
              acc.push({
                id: match.gameId,
                name: match.gameName,
                imageUrl: match.gameImageUrl ?? "",
                wins: match.outcome.isWinner ? 1 : 0,
                plays: 1,
                winRate: (match.outcome.isWinner ? 1 : 0) / 1,
              });
            }
            return acc;
          }, [])
          .sort((a, b) => b.plays - a.plays),
      };
      return processedPlayer;
    }),
  create: protectedUserProcedure
    .input(insertPlayerSchema.pick({ name: true, imageId: true }))
    .mutation(async ({ ctx, input }) => {
      const returnedPlayer = await ctx.db
        .insert(player)
        .values({
          createdBy: ctx.userId,
          imageId: input.imageId,
          name: input.name,
        })
        .returning();
      if (!returnedPlayer[0]) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const returnedPlayerImage = await ctx.db.query.player.findFirst({
        where: and(
          eq(player.id, returnedPlayer[0].id),
          eq(player.createdBy, ctx.userId),
        ),
        with: {
          image: true,
        },
      });
      return {
        id: returnedPlayer[0].id,
        name: returnedPlayer[0].name,
        imageUrl: returnedPlayerImage?.image?.url ?? null,
        matches: 0,
      };
    }),
  update: protectedUserProcedure
    .input(
      insertPlayerSchema
        .pick({ id: true, imageId: true })
        .required({ id: true })
        .extend({ name: z.string().optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(player)
        .set({
          name: input.name,
          imageId: input.imageId,
        })
        .where(eq(player.id, input.id));
    }),
});
