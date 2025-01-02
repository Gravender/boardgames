import { subMonths } from "date-fns";
import { and, count, desc, eq, gte, lte, max, sql } from "drizzle-orm";
import { z } from "zod";

import {
  game,
  group,
  groupPlayer,
  image,
  match,
  matchPlayer,
  player,
} from "~/server/db/schema";

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
        if (result)
          return {
            name: result.name,
          };
      }
      if (input.type === "players") {
        const result = await ctx.db.query.player.findFirst({
          where: eq(player.id, input.path),
          columns: {
            id: true,
            name: true,
          },
        });
        if (result)
          return {
            name: result.name,
          };
      }
      if (input.type === "match") {
        const result = await ctx.db.query.match.findFirst({
          where: eq(match.id, input.path),
          with: {
            game: true,
          },
        });
        if (result)
          return {
            name: result.name,
            game: {
              name: result.game.name,
            },
          };
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
    games.sort((a, b) => a.name.localeCompare(b.name));
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
    players.sort((a, b) => a.name.localeCompare(b.name));
    return players;
  }),
  getGroups: protectedUserProcedure.query(async ({ ctx }) => {
    const groups = await ctx.db
      .select({
        id: group.id,
        name: group.name,
      })
      .from(group)
      .where(eq(group.createdBy, ctx.userId))
      .innerJoin(groupPlayer, eq(groupPlayer.groupId, group.id))
      .groupBy(group.id)
      .orderBy(desc(count(groupPlayer)), group.name)
      .limit(5);
    groups.sort((a, b) => a.name.localeCompare(b.name));
    return groups;
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
    type MonthName =
      | "January"
      | "February"
      | "March"
      | "April"
      | "May"
      | "June"
      | "July"
      | "August"
      | "September"
      | "October"
      | "November"
      | "December";

    const monthsPlayed = (year: Date) => {
      const last12Months: {
        year: number;
        month: number;
        name: MonthName;
      }[] = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(year, i);
        return {
          year: date.getFullYear(),
          month: date.getMonth(),
          name: date.toLocaleString("default", { month: "long" }) as MonthName,
        };
      }).reverse();

      const matchesPerMonth = last12Months.reduce(
        (acc, { year, month, name }) => {
          acc[name] = matches.filter(
            (match) =>
              match.date.getFullYear() === year &&
              match.date.getMonth() === month,
          ).length;
          return acc;
        },
        {} as Record<MonthName, number>,
      );
      const matchesPerMonthLastYear = last12Months.reduce(
        (acc, { year, month, name }) => {
          acc[name] = matches.filter(
            (match) =>
              match.date.getFullYear() === year - 1 &&
              match.date.getMonth() === month,
          ).length;
          return acc;
        },
        {} as Record<MonthName, number>,
      );
      return last12Months.map(({ name }) => ({
        month: name,
        thisYear: matchesPerMonth[name] || 0,
        lastYear: matchesPerMonthLastYear[name] || 0,
      }));
    };

    return {
      played: matches.length,
      months: monthsPlayed(new Date()),
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
