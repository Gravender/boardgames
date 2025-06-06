import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { subMonths, subYears } from "date-fns";
import { and, asc, count, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod/v4";

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
        rootHref: z.string(),
        segments: z.array(z.string()),
      }),
    )
    .query(async ({ ctx, input }) => {
      const crumbs: { name: string; path: string }[] = [];
      let href = input.rootHref;

      // static labels for non-ID, non-shared segments
      const STATIC: Record<string, string> = {
        games: "Games",
        players: "Players",
        groups: "Groups",
        locations: "Locations",
        "share-requests": "Share Requests",
        calendar: "Calendar",
        friends: "Friends",
        settings: "Settings",
        profile: "Profile",
        stats: "Stats",
        share: "Share",
        summary: "Summary",
        add: "Add",
        edit: "Edit",
      };

      for (let i = 0; i < input.segments.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const seg = input.segments[i]!;
        href += `/${seg}`;

        if (
          i >= 2 &&
          /^\d+$/.test(seg) &&
          /^\d+$/.test(input.segments[i - 1] ?? "") &&
          input.segments[i - 2] === "shared"
        ) {
          const id = Number(seg);
          const shared = await ctx.db.query.sharedMatch.findFirst({
            where: { id, sharedWithId: ctx.userId },
            with: { match: { columns: { name: true } } },
          });
          if (!shared) continue;
          crumbs.push({ name: shared.match.name, path: href });
          continue;
        }

        if (
          i >= 2 &&
          /^\d+$/.test(seg) &&
          /^\d+$/.test(input.segments[i - 1] ?? "") &&
          input.segments[i - 2] === "games"
        ) {
          const id = Number(seg);
          const match = await ctx.db.query.match.findFirst({
            where: { id, userId: ctx.userId },
            with: { game: { columns: { name: true } } },
          });
          if (!match) continue;
          crumbs.push({ name: match.name, path: href });
          continue;
        }
        if (/^\d+$/.test(seg)) {
          const id = Number(seg);
          const parent = input.segments[i - 1];
          const grand = input.segments[i - 2];

          // A) “shared” → resolve from sharedXxx tables
          if (parent === "shared" && grand) {
            switch (grand) {
              case "games": {
                const shared = await ctx.db.query.sharedGame.findFirst({
                  where: { id, sharedWithId: ctx.userId },
                  with: {
                    game: { columns: { name: true } },
                    linkedGame: { columns: { name: true } },
                  },
                });
                if (!shared) throw new TRPCError({ code: "NOT_FOUND" });
                const getName = () => {
                  if (shared.linkedGame) return shared.linkedGame.name;
                  return shared.game.name;
                };
                crumbs.push({ name: getName(), path: href });
                continue;
              }
              case "players": {
                const shared = await ctx.db.query.sharedPlayer.findFirst({
                  where: { id, sharedWithId: ctx.userId },
                  with: {
                    player: { columns: { name: true } },
                    linkedPlayer: { columns: { name: true } },
                  },
                });
                if (!shared) throw new TRPCError({ code: "NOT_FOUND" });
                const getName = () => {
                  if (shared.linkedPlayer) return shared.linkedPlayer.name;
                  return shared.player.name;
                };
                crumbs.push({ name: getName(), path: href });
                continue;
              }
              case "locations": {
                const shared = await ctx.db.query.sharedLocation.findFirst({
                  where: { id, sharedWithId: ctx.userId },
                  with: {
                    location: { columns: { name: true } },
                    linkedLocation: { columns: { name: true } },
                  },
                });
                if (!shared) throw new TRPCError({ code: "NOT_FOUND" });
                const getName = () => {
                  if (shared.linkedLocation) return shared.linkedLocation.name;
                  return shared.location.name;
                };
                crumbs.push({ name: getName(), path: href });
                continue;
              }
              case "share-requests": {
                crumbs.push({ name: `Shared Request #${id}`, path: href });
                continue;
              }
            }
            continue;
          }

          // B) regular resource IDs
          switch (parent) {
            case "games": {
              const row = await ctx.db.query.game.findFirst({
                where: { id, userId: ctx.userId },
                columns: { name: true },
              });
              if (!row) continue;
              crumbs.push({ name: row.name, path: href });
              break;
            }
            case "players": {
              const row = await ctx.db.query.player.findFirst({
                where: { id, createdBy: ctx.userId },
                columns: { name: true },
              });
              if (!row) continue;
              crumbs.push({ name: row.name, path: href });
              break;
            }
            case "groups": {
              const row = await ctx.db.query.group.findFirst({
                where: { id, createdBy: ctx.userId },
                columns: { name: true },
              });
              if (!row) continue;
              crumbs.push({ name: row.name, path: href });
              break;
            }
            case "locations": {
              const row = await ctx.db.query.location.findFirst({
                where: { id, createdBy: ctx.userId },
                columns: { name: true },
              });
              if (!row) continue;
              crumbs.push({ name: row.name, path: href });
              break;
            }
            case "share-requests": {
              crumbs.push({ name: `Request #${id}`, path: href });
              break;
            }
            case "calendar": {
              const dt = new Date(seg);
              if (isNaN(dt.getTime())) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Invalid date",
                });
              }
              crumbs.push({
                name: "Date",
                path: href,
              });
              break;
            }
            case "friends": {
              const returnedFriend = await ctx.db.query.friend.findFirst({
                where: {
                  userId: ctx.userId,
                  friendId: id,
                },
                with: {
                  friend: true,
                },
              });
              if (!returnedFriend) {
                return null;
              }
              const client = await clerkClient();

              const clerkUser = await client.users
                .getUser(returnedFriend.friend.clerkUserId)
                .catch((error) => {
                  console.error(error);
                });
              if (!clerkUser) continue;
              const getFullName = () => {
                if (clerkUser.fullName) {
                  return clerkUser.fullName;
                }
                if (clerkUser.firstName && clerkUser.lastName) {
                  return `${clerkUser.firstName} ${clerkUser.lastName}`;
                }
                if (clerkUser.firstName) {
                  return clerkUser.firstName;
                }
                if (clerkUser.lastName) {
                  return clerkUser.lastName;
                }
                return "Unknown";
              };
              crumbs.push({ name: getFullName(), path: href });
              break;
            }
            default: {
              // catch-all
              crumbs.push({ name: `#${id}`, path: href });
            }
          }
          continue;
        }

        if (seg === "shared" && i > 0) {
          continue;
        }

        //––– 3) Any other static segment –––
        const label =
          STATIC[seg] ??
          seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        crumbs.push({ name: label, path: href });
      }

      return crumbs;
    }),
  getGames: protectedUserProcedure.query(async ({ ctx }) => {
    const games = await ctx.db
      .select({
        id: game.id,
        name: game.name,
        lastPlayed: sql`max(${match.date})`.mapWith(match.date),
      })
      .from(game)
      .where(and(eq(game.userId, ctx.userId), isNull(game.deletedAt)))
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
      .where(and(eq(player.createdBy, ctx.userId), isNull(player.deletedAt)))
      .innerJoin(
        matchPlayer,
        and(eq(matchPlayer.playerId, player.id), isNull(matchPlayer.deletedAt)),
      )
      .innerJoin(
        match,
        and(
          eq(match.id, matchPlayer.matchId),
          eq(match.finished, true),
          isNull(match.deletedAt),
        ),
      )
      .innerJoin(game, and(eq(game.id, match.gameId), isNull(game.deletedAt)))
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
      .where(
        and(eq(location.createdBy, ctx.userId), isNull(location.deletedAt)),
      )
      .innerJoin(
        match,
        and(eq(match.locationId, location.id), isNull(match.deletedAt)),
      )
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
      .where(
        and(
          eq(match.userId, ctx.userId),
          eq(match.finished, true),
          isNull(match.deletedAt),
        ),
      )
      .innerJoin(
        game,
        and(
          eq(match.gameId, game.id),
          eq(game.userId, ctx.userId),
          isNull(game.deletedAt),
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
      .where(and(eq(game.userId, ctx.userId), isNull(game.deletedAt)))
      .innerJoin(
        match,
        and(
          eq(match.gameId, game.id),
          gte(match.date, subYears(new Date(), 1)),
          isNull(match.deletedAt),
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
      .where(and(eq(game.userId, ctx.userId), isNull(game.deletedAt)))
      .innerJoin(
        match,
        and(
          eq(match.gameId, game.id),
          isNull(match.deletedAt),
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
      .innerJoin(
        matchPlayer,
        and(eq(matchPlayer.playerId, player.id), isNull(matchPlayer.deletedAt)),
      )
      .innerJoin(
        match,
        and(eq(match.id, matchPlayer.matchId), isNull(match.deletedAt)),
      )
      .innerJoin(game, and(eq(match.gameId, game.id), isNull(game.deletedAt)))
      .where(
        and(
          eq(player.createdBy, ctx.userId),
          eq(match.userId, ctx.userId),
          sql`${match.date} >= now() - interval '1 year'`,
        ),
      )
      .groupBy(player.id)
      .orderBy(desc(count(match.id)), player.name)
      .as("sq");
    const playersWithImages = await ctx.db
      .select({
        id: sq.id,
        name: sq.name,
        image: image,
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
      .innerJoin(
        player,
        and(eq(player.id, matchPlayer.playerId), isNull(player.deletedAt)),
      )
      .innerJoin(
        match,
        and(eq(match.id, matchPlayer.matchId), isNull(match.deletedAt)),
      )
      .innerJoin(game, and(eq(match.gameId, game.id), isNull(game.deletedAt)))
      .where(
        and(
          eq(player.isUser, true),
          eq(match.finished, true),
          sql`${match.date} >= now() - interval '1 year'`,
          isNull(matchPlayer.deletedAt),
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
      .innerJoin(
        matchPlayer,
        and(eq(match.id, matchPlayer.matchId), isNull(matchPlayer.deletedAt)),
      )
      .innerJoin(
        player,
        and(eq(matchPlayer.playerId, player.id), isNull(player.deletedAt)),
      )
      .innerJoin(game, and(eq(match.gameId, game.id), isNull(game.deletedAt)))
      .where(
        and(
          eq(player.isUser, true),
          sql`${match.date} >= now() - interval '2 year'`,
          eq(match.finished, true),
          isNull(match.deletedAt),
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
      .innerJoin(
        matchPlayer,
        and(eq(match.id, matchPlayer.matchId), isNull(matchPlayer.deletedAt)),
      )
      .innerJoin(
        player,
        and(eq(matchPlayer.playerId, player.id), isNull(player.deletedAt)),
      )
      .innerJoin(game, and(eq(match.gameId, game.id), isNull(game.deletedAt)))
      .where(
        and(
          eq(player.isUser, true),
          sql`${match.date} >= now() - interval '1 year'`,
          eq(match.finished, true),
          isNull(match.deletedAt),
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
