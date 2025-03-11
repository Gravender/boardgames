import { subMonths, subYears } from "date-fns";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import {
  game,
  group,
  groupPlayer,
  image,
  location,
  match,
  matchPlayer,
  player,
} from "@board-games/db/schema";

import { protectedUserProcedure } from "../trpc";

export const dashboardRouter = {
  getBreadCrumbs: protectedUserProcedure
    .input(
      z.object({
        type: z.enum(["games", "players", "match", "groups"]),
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
      if (input.type === "groups") {
        const result = await ctx.db.query.group.findFirst({
          where: eq(group.id, input.path),
        });
        if (result)
          return {
            name: result.name,
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
      .orderBy(desc(count(match)), asc(game.name))
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
      .innerJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
      .innerJoin(
        match,
        and(eq(match.id, matchPlayer.matchId), eq(match.finished, true)),
      )
      .innerJoin(game, and(eq(game.id, match.gameId), eq(game.deleted, false)))
      .groupBy(player.id)
      .orderBy(desc(count(matchPlayer)), asc(player.name))
      .limit(5);
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
    return groups;
  }),
  getLocations: protectedUserProcedure.query(async ({ ctx }) => {
    const locations = await ctx.db
      .select({
        id: location.id,
        name: location.name,
      })
      .from(location)
      .where(eq(location.createdBy, ctx.userId))
      .innerJoin(match, eq(match.locationId, location.id))
      .groupBy(location.id)
      .orderBy(desc(count(match)), location.name)
      .limit(5);
    return locations;
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
          eq(match.finished, true),
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
          gte(match.date, subYears(new Date(), 1)),
        ),
      )
      .groupBy(game.id)
      .orderBy(desc(count(match.id)), game.name);
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
          gte(match.date, subYears(new Date(), 2)),
          lte(match.date, subYears(new Date(), 1)),
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
      .innerJoin(game, eq(match.gameId, game.id))
      .where(
        and(
          eq(player.createdBy, ctx.userId),
          eq(match.userId, ctx.userId),
          sql`${match.date} >= now() - interval '1 year'`,
          eq(game.deleted, false),
        ),
      )
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
    return playersWithImages.slice(0, 10);
  }),
  getUserPlacements: protectedUserProcedure.query(async ({ ctx }) => {
    const placementCounts = await ctx.db
      .select({
        placement: matchPlayer.placement,
        count: sql<number>`COUNT(*)`,
      })
      .from(matchPlayer)
      .innerJoin(player, eq(player.id, matchPlayer.playerId))
      .innerJoin(match, eq(match.id, matchPlayer.matchId))
      .innerJoin(game, eq(match.gameId, game.id))
      .where(
        and(
          eq(player.userId, ctx.userId),
          eq(match.finished, true),
          sql`${match.date} >= now() - interval '1 year'`,
          eq(game.deleted, false),
        ),
      )
      .groupBy(matchPlayer.placement);
    const formattedPlacements: Record<
      number,
      { placement: string; count: number }
    > = {
      1: { placement: "1st", count: 0 },
      2: { placement: "2nd", count: 0 },
      3: { placement: "3rd", count: 0 },
      4: { placement: "4th", count: 0 },
      5: { placement: "5th", count: 0 },
      6: { placement: "6th+", count: 0 },
    };

    // Ensure placementCounts is processed safely
    placementCounts.forEach((p) => {
      const placement = p.placement ?? 6;

      if (placement >= 1 && placement <= 5 && formattedPlacements[placement]) {
        formattedPlacements[placement].count = Number(p.count);
      } else if (formattedPlacements[6]) {
        formattedPlacements[6].count =
          Number(p.count) + Number(formattedPlacements[6].count);
      }
    });

    // Convert object to array format
    const placementData = Object.values(formattedPlacements);
    return placementData;
  }),
  getUserWinPercentage: protectedUserProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select({
        month: sql<string>`to_char(${match.date}, 'Mon')`,
        monthNum: sql<number>`extract(month from ${match.date})`,
        year: sql<number>`extract(year from ${match.date})`,
        totalMatches: sql<number>`COUNT(${match.id})`,
        wins: sql<number>`SUM(CASE WHEN ${matchPlayer.winner} THEN 1 ELSE 0 END)`,
      })
      .from(match)
      .innerJoin(matchPlayer, eq(match.id, matchPlayer.matchId))
      .innerJoin(player, eq(matchPlayer.playerId, player.id))
      .innerJoin(game, eq(match.gameId, game.id))
      .where(
        and(
          eq(player.userId, ctx.userId),
          sql`${match.date} >= now() - interval '2 year'`,
          eq(match.finished, true),
          eq(game.deleted, false),
        ),
      )
      .groupBy(
        sql`to_char(${match.date}, 'Mon'), extract(month from ${match.date}), extract(year from ${match.date})`,
      )
      .orderBy(
        sql`extract(year from ${match.date}), extract(month from ${match.date})`,
      );

    if (results.length === 0) {
      return {
        overtime: [],
        monthToMonth: [],
      };
    }

    let numMatches = 0;
    let numWins = 0;
    const formattedResults = {
      overtime: results
        .map((row) => {
          numMatches += Number(row.totalMatches);
          numWins += Number(row.wins);

          return {
            month: row.month,
            year: row.year,
            winPercentage:
              numMatches > 0 ? ((numWins / numMatches) * 100).toFixed(2) : 0,
          };
        })
        .filter((_, index) => {
          return index + 1 >= results.length / 2;
        }),
      monthToMonth: results
        .map((row) => ({
          month: row.month,
          year: row.year,
          winPercentage:
            row.totalMatches > 0 ? (row.wins / row.totalMatches) * 100 : 0,
        }))
        .filter((_, index) => {
          return index + 1 >= results.length / 2;
        }),
    };
    return formattedResults;
  }),
  getDaysPlayed: protectedUserProcedure.query(async ({ ctx }) => {
    const daysPlayed = await ctx.db
      .select({
        day: sql<string>`to_char(${match.date}, 'Day')`,
        matches: sql<number>`count(${match.id})`,
      })
      .from(match)
      .innerJoin(matchPlayer, eq(match.id, matchPlayer.matchId))
      .innerJoin(player, eq(matchPlayer.playerId, player.id))
      .innerJoin(game, eq(match.gameId, game.id))
      .where(
        and(
          eq(player.userId, ctx.userId),
          sql`${match.date} >= now() - interval '1 year'`,
          eq(match.finished, true),
          eq(game.deleted, false),
        ),
      )
      .groupBy(
        sql`to_char(${match.date}, 'Day'), extract(dow from ${match.date})`,
      )
      .orderBy(sql`extract(dow from ${match.date})`);

    return daysPlayed.map((day) => ({
      day: day.day.trim(),
      matches: Number(day.matches),
    }));
  }),
};
