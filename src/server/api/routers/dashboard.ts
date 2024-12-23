import { format, subMonths } from "date-fns";
import { and, count, desc, eq, gte, lte, max, sql } from "drizzle-orm";
import { z } from "zod";

import { game, image, match, matchPlayer, player } from "~/server/db/schema";

import { protectedUserProcedure } from "../trpc";

export const dashboardRouter = {
  getBreadCrumbs: protectedUserProcedure
    .input(
      z.object({
        type: z.enum(["games", "players", "match"]),
        path: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.type === "games") {
        const result = await ctx.db.query.game.findFirst({
          where: eq(game.id, input.path),
          columns: {
            id: true,
            name: true,
          },
        });
        if (result) return result;
      }
      if (input.type === "players") {
        const result = await ctx.db.query.player.findFirst({
          where: eq(player.id, input.path),
          columns: {
            id: true,
            name: true,
          },
        });
        if (result) return result;
      }
      if (input.type === "match") {
        const result = await ctx.db.query.match.findFirst({
          where: eq(match.id, input.path),
          with: {
            game: true,
          },
        });
        if (result) return result;
      }
      return null;
    }),
  getGames: protectedUserProcedure.query(async ({ ctx }) => {
    const games = await ctx.db
      .select({
        id: game.id,
        name: game.name,
        lastPlayed: sql`max(${match.date})`.mapWith(match.date),
      })
      .from(game)
      .where(and(eq(game.userId, ctx.userId), eq(game.deleted, false)))
      .leftJoin(match, eq(game.id, match.gameId))
      .groupBy(game.id)
      .orderBy(max(match.date), game.name)
      .limit(5);
    return games;
  }),
  getPlayers: protectedUserProcedure.query(async ({ ctx }) => {
    const players = await ctx.db
      .select({
        id: player.id,
        name: player.name,
      })
      .from(player)
      .where(eq(player.createdBy, ctx.userId))
      .leftJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
      .groupBy(player.id)
      .orderBy(desc(count(matchPlayer)), player.name)
      .limit(5);
    return players;
  }),
  getMatchesByMonth: protectedUserProcedure.query(async ({ ctx }) => {
    const matches = await ctx.db
      .select({
        id: match.id,
        date: match.date,
      })
      .from(match)
      .innerJoin(
        game,
        and(
          eq(match.gameId, game.id),
          eq(game.userId, ctx.userId),
          eq(game.deleted, false),
        ),
      );
    const currentYear: number = new Date().getFullYear();
    const currentMonth: number = new Date().getMonth();
    type MatchPerMonth = {
      January: number;
      February: number;
      March: number;
      April: number;
      May: number;
      June: number;
      July: number;
      August: number;
      September: number;
      October: number;
      November: number;
      December: number;
    };
    const monthNames: string[] = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ] as const;
    const matchesPerMonth: MatchPerMonth = matches.reduce<MatchPerMonth>(
      (acc, match) => {
        if (match.date.getFullYear() === currentYear) {
          const month = monthNames[
            match.date.getMonth()
          ] as keyof MatchPerMonth;
          if (match.date.getMonth() <= currentMonth) {
            acc[month] = acc[month] + 1;
          }
        }
        return acc;
      },
      {
        January: 0,
        February: 0,
        March: 0,
        April: 0,
        May: 0,
        June: 0,
        July: 0,
        August: 0,
        September: 0,
        October: 0,
        November: 0,
        December: 0,
      },
    );
    return {
      played: matches.length,
      months: monthNames
        .map((month, index) => {
          if (index > currentMonth) {
            return null;
          }
          return {
            month,
            played: matchesPerMonth[month as keyof MatchPerMonth],
          };
        })
        .filter((month) => month !== null),
    };
  }),
  getUniqueGames: protectedUserProcedure.query(async ({ ctx }) => {
    const games = await ctx.db
      .select({
        id: game.id,
        name: game.name,
        matches: count(match.id),
      })
      .from(game)
      .where(and(eq(game.userId, ctx.userId), eq(game.deleted, false)))
      .innerJoin(
        match,
        and(
          eq(match.gameId, game.id),
          gte(match.date, subMonths(new Date(), 1)),
        ),
      )
      .groupBy(game.id)
      .orderBy(count(match.id), game.name);
    const lastMonthGames = await ctx.db
      .select({
        id: game.id,
        name: game.name,
        matches: count(match.id),
      })
      .from(game)
      .where(and(eq(game.userId, ctx.userId), eq(game.deleted, false)))
      .innerJoin(
        match,
        and(
          eq(match.gameId, game.id),
          gte(match.date, subMonths(new Date(), 2)),
          lte(match.date, subMonths(new Date(), 1)),
        ),
      )
      .groupBy(game.id)
      .orderBy(count(match.id), game.name);
    return {
      lastMonthGames: lastMonthGames.length,
      currentMonthGames: games.length,
      games: games,
    };
  }),
  getPlayersWIthMatches: protectedUserProcedure.query(async ({ ctx }) => {
    const sq = ctx.db
      .select({
        id: player.id,
        name: player.name,
        imageId: player.imageId,
        matches: sql<number>`count(${match.id})`.as("matches"),
        duration: sql<number>`sum(${match.duration})`.as("duration"),
      })
      .from(player)
      .innerJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
      .innerJoin(match, eq(match.id, matchPlayer.matchId))
      .innerJoin(game, and(eq(match.gameId, game.id), eq(game.deleted, false)))
      .where(eq(player.createdBy, ctx.userId))
      .groupBy(player.id)
      .orderBy(desc(count(match.id)), player.name)
      .as("sq");
    const playersWithImages = await ctx.db
      .select({
        id: sq.id,
        name: sq.name,
        imageUrl: image.url,
        matches: sq.matches,
        duration: sq.duration,
      })
      .from(image)
      .rightJoin(sq, eq(image.id, sq.imageId))
      .orderBy(desc(sq.matches));
    return playersWithImages.slice(0, 5);
  }),
};
