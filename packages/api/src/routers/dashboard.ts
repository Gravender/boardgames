import { TRPCError } from "@trpc/server";
import { compareAsc, subMonths } from "date-fns";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod/v4";

import {
  game,
  group,
  groupPlayer,
  location,
  match,
  matchPlayer,
  player,
} from "@board-games/db/schema";

import type { Player, PlayerMatch } from "../utils/player";
import { protectedUserProcedure } from "../trpc";
import { aggregatePlayerStats } from "../utils/player";

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
            where: { id, createdBy: ctx.userId },
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
                where: { id, createdBy: ctx.userId },
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
                  friendId: seg,
                },
                with: {
                  friend: true,
                },
              });
              if (!returnedFriend) {
                return null;
              }

              crumbs.push({ name: returnedFriend.friend.name, path: href });
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
      .where(and(eq(game.createdBy, ctx.userId), isNull(game.deletedAt)))
      .leftJoin(match, eq(game.id, match.gameId))
      .groupBy(game.id)
      .orderBy(desc(count(match)), asc(game.name))
      .limit(5);
    return games;
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
          eq(match.createdBy, ctx.userId),
          eq(match.finished, true),
          isNull(match.deletedAt),
        ),
      )
      .innerJoin(
        game,
        and(
          eq(match.gameId, game.id),
          eq(game.createdBy, ctx.userId),
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
    const originalGames = await ctx.db.query.game.findMany({
      where: {
        createdBy: ctx.userId,
        deletedAt: {
          isNull: true,
        },
      },

      with: {
        image: true,
        matches: {
          where: {
            finished: true,
            deletedAt: {
              isNull: true,
            },
          },
        },
        linkedGames: {
          where: {
            sharedWithId: ctx.userId,
          },
          with: {
            sharedMatches: {
              where: {
                sharedWithId: ctx.userId,
              },
              with: {
                match: {
                  where: {
                    finished: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const sharedGames = await ctx.db.query.sharedGame.findMany({
      where: {
        sharedWithId: ctx.userId,
        linkedGameId: {
          isNull: true,
        },
      },
      with: {
        game: {
          with: {
            image: true,
          },
        },
        sharedMatches: {
          where: {
            sharedWithId: ctx.userId,
          },
          with: {
            match: {
              where: {
                finished: true,
              },
            },
          },
        },
      },
    });
    const gamesWithImages = originalGames.map<{
      id: number;
      type: "original" | "shared";
      name: string;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "game" | "player" | "match";
      } | null;
      matches: number;
      duration: number;
    }>((game) => {
      const linkedMatches = game.linkedGames.flatMap((linkedGame) =>
        linkedGame.sharedMatches.filter((sMatch) => sMatch.match !== null),
      );
      const linkedDuration = linkedMatches.reduce((acc, match) => {
        return acc + (match.match?.duration ?? 0);
      }, 0);
      return {
        id: game.id,
        type: "original" as const,
        name: game.name,
        image: game.image,
        matches: game.matches.length + linkedMatches.length,
        duration:
          game.matches.reduce((acc, match) => {
            return acc + match.duration;
          }, 0) + linkedDuration,
      };
    });
    sharedGames.forEach((sharedGame) => {
      const linkedMatches = sharedGame.sharedMatches.filter(
        (sMatch) => sMatch.match !== null,
      );
      const linkedDuration = linkedMatches.reduce((acc, match) => {
        return acc + (match.match?.duration ?? 0);
      }, 0);
      gamesWithImages.push({
        id: sharedGame.id,
        type: "shared" as const,
        name: sharedGame.game.name,
        image: sharedGame.game.image,
        matches: linkedMatches.length,
        duration: linkedDuration,
      });
    });
    gamesWithImages.sort((a, b) => b.matches - a.matches);
    return gamesWithImages;
  }),
  getPlayersWIthMatches: protectedUserProcedure.query(async ({ ctx }) => {
    const originalMatches = await ctx.db.query.match.findMany({
      where: {
        createdBy: ctx.userId,
        finished: true,
        deletedAt: {
          isNull: true,
        },
      },
      with: {
        game: {
          with: {
            image: true,
          },
        },
        matchPlayers: {
          with: {
            player: {
              with: {
                image: true,
              },
            },
          },
        },
        location: true,
        teams: true,
        scoresheet: true,
      },
    });
    const sharedMatches = await ctx.db.query.sharedMatch.findMany({
      where: {
        sharedWithId: ctx.userId,
      },
      with: {
        sharedGame: {
          with: {
            game: {
              with: {
                image: true,
              },
            },
            linkedGame: {
              where: {
                createdBy: ctx.userId,
              },
              with: {
                image: true,
              },
            },
          },
        },
        sharedMatchPlayers: {
          where: {
            sharedWithId: ctx.userId,
          },
          with: {
            sharedPlayer: {
              where: {
                sharedWithId: ctx.userId,
              },
              with: {
                player: {
                  with: {
                    image: true,
                  },
                },
                linkedPlayer: {
                  where: {
                    createdBy: ctx.userId,
                  },
                  with: {
                    image: true,
                  },
                },
              },
            },
            matchPlayer: true,
          },
        },
        match: {
          with: {
            location: true,
            teams: true,
            scoresheet: true,
          },
        },
      },
    });
    const playerGames: {
      type: "shared" | "original";
      id: number;
      name: string;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "game" | "player" | "match";
      } | null;
    }[] = [];
    const playerMatches = originalMatches.map<PlayerMatch>((originalMatch) => {
      const matchPlayers = originalMatch.matchPlayers;
      const foundGame = playerGames.find(
        (pGame) =>
          pGame.id === originalMatch.game.id && pGame.type === "original",
      );
      const foundUser = matchPlayers.find((mp) => mp.player.isUser);
      if (!foundGame) {
        playerGames.push({
          type: "original",
          id: originalMatch.game.id,
          name: originalMatch.game.name,
          image: originalMatch.game.image,
        });
      }
      return {
        id: originalMatch.id,
        type: "original" as const,
        date: originalMatch.date,
        name: originalMatch.name,
        teams: originalMatch.teams,
        duration: originalMatch.duration,
        finished: originalMatch.finished,
        gameId: originalMatch.game.id,
        gameName: originalMatch.game.name,
        gameImage: originalMatch.game.image,
        locationName: originalMatch.location?.name,
        players: matchPlayers.map<Player>((matchPlayer) => {
          const foundGame = playerGames.find(
            (pGame) =>
              pGame.id === originalMatch.game.id && pGame.type === "original",
          );
          if (!foundGame) {
            playerGames.push({
              type: "original",
              id: originalMatch.game.id,
              name: originalMatch.game.name,
              image: originalMatch.game.image,
            });
          }
          return {
            id: matchPlayer.player.id,
            type: "original" as const,
            name: matchPlayer.player.name,
            isWinner: matchPlayer.winner ?? false,
            isUser: matchPlayer.player.isUser,
            score: matchPlayer.score,
            image: matchPlayer.player.image
              ? {
                  name: matchPlayer.player.image.name,
                  url: matchPlayer.player.image.url,
                  type: matchPlayer.player.image.type,
                  usageType: "player" as const,
                }
              : null,
            teamId: matchPlayer.teamId,
            placement: matchPlayer.placement,
          };
        }),
        scoresheet: originalMatch.scoresheet,
        outcome: {
          score: foundUser?.score ?? null,
          isWinner: foundUser?.winner ?? false,
          placement: foundUser?.placement ?? null,
        },
        linkedGameId: undefined,
      };
    });
    sharedMatches.forEach((sharedMatch) => {
      const sharedGame = sharedMatch.sharedGame;
      const linkedGame = sharedGame.linkedGame;
      const foundGame = playerGames.find(
        (pGame) =>
          pGame.id === (sharedGame.linkedGameId ?? sharedGame.id) &&
          pGame.type === (sharedGame.linkedGameId ? "original" : "shared"),
      );
      if (!foundGame) {
        playerGames.push({
          type: sharedGame.linkedGameId
            ? ("original" as const)
            : ("shared" as const),
          id: sharedGame.linkedGameId ?? sharedGame.id,
          name: linkedGame?.name ?? sharedGame.game.name,
          image: linkedGame ? linkedGame.image : sharedGame.game.image,
        });
      }
      playerMatches.push({
        id: sharedMatch.id,
        type: "shared" as const,
        date: sharedMatch.match.date,
        name: sharedMatch.match.name,
        teams: sharedMatch.match.teams,
        duration: sharedMatch.match.duration,
        finished: sharedMatch.match.finished,
        gameId: sharedMatch.sharedGame.id,
        gameName: linkedGame ? linkedGame.name : sharedGame.game.name,
        gameImage: linkedGame ? linkedGame.image : sharedGame.game.image,
        locationName: sharedMatch.match.location?.name,
        players: sharedMatch.sharedMatchPlayers
          .map((sharedMatchPlayer) => {
            const sharedPlayer = sharedMatchPlayer.sharedPlayer;
            const linkedPlayer = sharedPlayer?.linkedPlayer;
            if (sharedPlayer) {
              if (linkedPlayer) {
                return {
                  id: linkedPlayer.id,
                  type: "original" as const,
                  name: linkedPlayer.name,
                  isUser: linkedPlayer.isUser,
                  isWinner: sharedMatchPlayer.matchPlayer.winner ?? false,
                  score: sharedMatchPlayer.matchPlayer.score,
                  image: linkedPlayer.image
                    ? {
                        name: linkedPlayer.image.name,
                        url: linkedPlayer.image.url,
                        type: linkedPlayer.image.type,
                        usageType: "player" as const,
                      }
                    : null,
                  teamId: sharedMatchPlayer.matchPlayer.teamId,
                  placement: sharedMatchPlayer.matchPlayer.placement,
                };
              }
              return {
                id: sharedPlayer.id,
                type: "shared" as const,
                name: sharedPlayer.player.name,
                isUser: sharedPlayer.player.isUser,
                isWinner: sharedMatchPlayer.matchPlayer.winner ?? false,
                score: sharedMatchPlayer.matchPlayer.score,
                image: sharedPlayer.player.image
                  ? {
                      name: sharedPlayer.player.image.name,
                      url: sharedPlayer.player.image.url,
                      type: sharedPlayer.player.image.type,
                      usageType: "player" as const,
                    }
                  : null,
                teamId: sharedMatchPlayer.matchPlayer.teamId,
                placement: sharedMatchPlayer.matchPlayer.placement,
              };
            }
            return null;
          })
          .filter((player) => player !== null),
        scoresheet: sharedMatch.match.scoresheet,

        outcome: {
          score: null,
          isWinner: false,
          placement: null,
        },
        linkedGameId:
          sharedMatch.sharedGame.linkedGameId ?? sharedMatch.sharedGame.id,
      });
    });
    playerMatches.sort((a, b) => compareAsc(b.date, a.date));
    const playersStats = aggregatePlayerStats(playerMatches);
    playersStats.sort((a, b) => {
      if (a.plays > 20 && b.plays > 20)
        return b.competitiveWinRate - a.competitiveWinRate;
      if (a.plays > 10 && b.plays > 10)
        return b.competitiveWins - a.competitiveWins;
      return b.plays - a.plays;
    });
    return playersStats;
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
      5: { placement: "5th+", count: 0 },
    };

    // Ensure placementCounts is processed safely
    placementCounts.forEach((p) => {
      if (p.placement !== null) {
        const placement = p.placement;

        if (
          placement >= 1 &&
          placement <= 5 &&
          formattedPlacements[placement]
        ) {
          formattedPlacements[placement].count = Number(p.count);
        } else if (formattedPlacements[5]) {
          formattedPlacements[5].count =
            Number(p.count) + Number(formattedPlacements[5].count);
        }
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
  getUserStats: protectedUserProcedure.query(async ({ ctx }) => {
    const findUserPlayer = await ctx.db.query.player.findFirst({
      where: {
        isUser: true,
        createdBy: ctx.userId,
        deletedAt: {
          isNull: true,
        },
      },
    });
    if (!findUserPlayer) {
      await ctx.db.insert(player).values({
        createdBy: ctx.userId,
        name: ctx.session.user.name,
        isUser: true,
      });
    }
    const returnedPlayer = await ctx.db.query.player.findFirst({
      where: {
        isUser: true,
        createdBy: ctx.userId,
        deletedAt: {
          isNull: true,
        },
      },
      with: {
        image: true,
        matchPlayers: {
          with: {
            match: {
              with: {
                game: {
                  with: {
                    image: true,
                  },
                },
                location: true,
              },
            },
          },
        },
        sharedLinkedPlayers: {
          with: {
            sharedMatchPlayers: {
              where: {
                sharedWithId: ctx.userId,
              },
              with: {
                matchPlayer: true,
                sharedMatch: {
                  with: {
                    sharedGame: {
                      with: {
                        game: {
                          with: {
                            image: true,
                          },
                        },
                        linkedGame: {
                          where: {
                            createdBy: ctx.userId,
                          },
                          with: {
                            image: true,
                          },
                        },
                      },
                    },
                    match: {
                      with: {
                        location: true,
                        teams: true,
                        scoresheet: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!returnedPlayer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Player not found.",
      });
    }
    const playerGames: {
      type: "shared" | "original";
      id: number;
      name: string;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "game" | "player" | "match";
      } | null;
      plays: number;
      duration: number;
      wins: number;
      lastPlayed: Date;
    }[] = [];
    returnedPlayer.matchPlayers.forEach((mPlayer) => {
      const foundGame = playerGames.find(
        (pGame) =>
          pGame.id === mPlayer.match.gameId && pGame.type === "original",
      );
      if (!foundGame) {
        playerGames.push({
          type: "original",
          id: mPlayer.match.gameId,
          name: mPlayer.match.game.name,
          image: mPlayer.match.game.image,
          plays: 1,
          duration: mPlayer.match.duration,
          wins: mPlayer.winner ? 1 : 0,
          lastPlayed: mPlayer.match.date,
        });
      } else {
        foundGame.plays += 1;
        foundGame.duration += mPlayer.match.duration;
        if (mPlayer.winner) {
          foundGame.wins += 1;
        }
        if (mPlayer.match.date > foundGame.lastPlayed) {
          foundGame.lastPlayed = mPlayer.match.date;
        }
      }
    }, []);
    returnedPlayer.sharedLinkedPlayers.forEach((linkedPlayer) => {
      linkedPlayer.sharedMatchPlayers.forEach((mPlayer) => {
        const sharedMatch = mPlayer.sharedMatch;
        const sharedMatchMatch = sharedMatch.match;
        const sharedGame = sharedMatch.sharedGame;
        const linkedGame = sharedGame.linkedGame;
        const foundGame = playerGames.find(
          (pGame) =>
            pGame.id === (sharedGame.linkedGameId ?? sharedGame.id) &&
            pGame.type === (sharedGame.linkedGameId ? "original" : "shared"),
        );
        if (!foundGame) {
          playerGames.push({
            type: sharedGame.linkedGameId
              ? ("original" as const)
              : ("shared" as const),
            id: sharedGame.linkedGameId ?? sharedGame.id,
            name: linkedGame?.name ?? sharedGame.game.name,
            image: linkedGame ? linkedGame.image : sharedGame.game.image,
            plays: 1,
            duration: sharedMatchMatch.duration,
            wins: mPlayer.matchPlayer.winner ? 1 : 0,
            lastPlayed: sharedMatchMatch.date,
          });
        } else {
          foundGame.plays += 1;
          foundGame.duration += sharedMatchMatch.duration;
          if (mPlayer.matchPlayer.winner) {
            foundGame.wins += 1;
          }
          if (sharedMatchMatch.date > foundGame.lastPlayed) {
            foundGame.lastPlayed = sharedMatchMatch.date;
          }
        }
      });
    });
    const gamesWithWinRate = playerGames.map((game) => ({
      id: game.id,
      type: game.type,
      name: game.name,
      image: game.image,
      plays: game.plays,
      duration: game.duration,
      wins: game.wins,
      winRate: game.plays > 0 ? (game.wins / game.plays) * 100 : 0,
      lastPlayed: game.lastPlayed,
    }));
    gamesWithWinRate.sort((a, b) => {
      if (a.plays > 20 && b.plays > 20) return b.winRate - a.winRate;
      if (a.plays > 10 && b.plays > 10) return b.wins - a.wins;
      return b.plays - a.plays;
    });
    return gamesWithWinRate;
  }),
};
