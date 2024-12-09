import { get } from "http";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, max, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import {
  game,
  image,
  match,
  matchPlayer,
  player,
  selectGameSchema,
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
        .innerJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
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
});
