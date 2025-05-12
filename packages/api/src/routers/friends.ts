import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { friend, friendRequest } from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GameAgg = {
  type: "Original" | "Shared";
  id: number;
  name: string;
  imageUrl: string | null;
  plays: number;
  wins: number;
  winRate: number;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MatchRecord = {
  type: "Original" | "Shared";
  id: number;
  name: string;
  date: Date;
  duration: number;
  finished: boolean;
  gameId: number;
  gameName: string;
  locationName?: string;
  players: {
    playerId: number;
    name: string;
    score: number | null;
    isWinner: boolean;
    placement: number | null;
  }[];
  outcome: {
    score: number | null;
    isWinner: boolean;
    placement: number | null;
  };
};
export const friendsRouter = createTRPCRouter({
  sendFriendRequest: protectedUserProcedure
    .input(z.object({ requesteeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(friendRequest).values({
        userId: ctx.userId,
        requesteeId: input.requesteeId,
        status: "pending",
      });

      return { success: true, message: "Friend request sent." };
    }),

  acceptFriendRequest: protectedUserProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [request] = await ctx.db
        .update(friendRequest)
        .set({ status: "accepted" })
        .where(eq(friendRequest.id, input.requestId))
        .returning();

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db
        .insert(friend)
        .values({ userId: ctx.userId, friendId: request.userId });
      await ctx.db
        .insert(friend)
        .values({ userId: request.userId, friendId: ctx.userId });

      return { success: true, message: "Friend request accepted." };
    }),

  rejectFriendRequest: protectedUserProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(friendRequest)
        .set({ status: "rejected" })
        .where(eq(friendRequest.id, input.requestId));

      return { success: true, message: "Friend request rejected." };
    }),
  cancelFriendRequest: protectedUserProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(friendRequest)
        .where(eq(friendRequest.id, input.requestId));

      return { success: true, message: "Friend request cancelled." };
    }),
  unFriend: protectedUserProcedure
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (transaction) => {
        await transaction
          .delete(friend)
          .where(
            and(
              eq(friend.userId, ctx.userId),
              eq(friend.friendId, input.friendId),
            ),
          );
        await transaction
          .delete(friend)
          .where(
            and(
              eq(friend.friendId, ctx.userId),
              eq(friend.userId, input.friendId),
            ),
          );
        await transaction
          .update(friendRequest)
          .set({ status: "rejected" })
          .where(eq(friendRequest.requesteeId, input.friendId));
        await transaction
          .update(friendRequest)
          .set({ status: "rejected" })
          .where(eq(friendRequest.requesteeId, ctx.userId));
      });
      return { success: true, message: "Friend removed." };
    }),

  getFriendRequests: protectedUserProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.friendRequest.findMany({
      where: {
        requesteeId: ctx.userId,
        status: "pending",
      },
      with: {
        user: true,
      },
    });
  }),

  getSentFriendRequests: protectedUserProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.friendRequest.findMany({
      where: {
        userId: ctx.userId,
        status: "pending",
      },
      with: {
        requestee: true,
      },
    });
  }),
  getFriends: protectedUserProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.friend.findMany({
      where: {
        userId: ctx.userId,
      },
      with: {
        friend: true,
      },
    });
  }),
  getFriend: protectedUserProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ ctx, input }) => {
      const returnedFriend = await ctx.db.query.friend.findFirst({
        columns: {
          friendId: false,
          userId: false,
          createdAt: false,
          updatedAt: false,
          id: true,
        },
        where: {
          userId: ctx.userId,
          friendId: input.friendId,
        },
        with: {
          friend: {
            columns: {
              name: true,
              clerkUserId: true,
              email: true,
              createdAt: true,
              updatedAt: false,
              id: false,
            },
            with: {
              sharedGamesOwner: {
                columns: {
                  gameId: false,
                  linkedGameId: true,
                  ownerId: false,
                  sharedWithId: false,
                  permission: true,
                  createdAt: true,
                  updatedAt: false,
                  id: true,
                },
                where: {
                  sharedWithId: ctx.userId,
                },
                orderBy: {
                  createdAt: "desc",
                },
                with: {
                  sharedMatches: {
                    with: {
                      match: true,
                    },
                  },
                  sharedScoresheets: {
                    with: {
                      scoresheet: true,
                    },
                  },
                  game: {
                    columns: {
                      name: true,
                    },
                  },
                },
              },
              sharedPlayersOwner: {
                columns: {
                  playerId: false,
                  linkedPlayerId: true,
                  ownerId: false,
                  sharedWithId: false,
                  permission: true,
                  createdAt: true,
                  updatedAt: false,
                  id: true,
                },
                where: {
                  sharedWithId: ctx.userId,
                },
                orderBy: {
                  createdAt: "desc",
                },
                with: {
                  player: {
                    columns: {
                      name: true,
                    },
                  },
                },
              },
              sharedLocationsOwner: {
                with: {
                  location: true,
                },
              },
            },
          },
          user: {
            columns: {
              name: false,
              clerkUserId: false,
              email: false,
              createdAt: false,
              updatedAt: false,
              id: false,
            },
            with: {
              sharedGamesOwner: {
                columns: {
                  gameId: false,
                  linkedGameId: true,
                  ownerId: false,
                  sharedWithId: false,
                  permission: true,
                  createdAt: true,
                  updatedAt: false,
                  id: true,
                },
                where: {
                  sharedWithId: input.friendId,
                },
                orderBy: {
                  createdAt: "desc",
                },
                with: {
                  sharedMatches: {
                    with: {
                      match: true,
                    },
                  },
                  sharedScoresheets: {
                    with: {
                      scoresheet: true,
                    },
                  },
                  game: {
                    columns: {
                      name: true,
                    },
                  },
                },
              },
              sharedPlayersOwner: {
                columns: {
                  playerId: false,
                  linkedPlayerId: true,
                  ownerId: false,
                  sharedWithId: false,
                  permission: true,
                  createdAt: true,
                  updatedAt: false,
                  id: true,
                },
                where: {
                  sharedWithId: input.friendId,
                },
                orderBy: {
                  createdAt: "desc",
                },
                with: {
                  player: {
                    columns: {
                      name: true,
                    },
                  },
                },
              },
              sharedLocationsOwner: {
                with: {
                  location: true,
                },
              },
            },
          },
          friendSetting: true,
          friendPlayer: {
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
                      teams: true,
                      matchPlayers: {
                        with: {
                          player: true,
                        },
                      },
                    },
                  },
                },
              },
              sharedLinkedPlayers: {
                where: {
                  sharedWithId: ctx.userId,
                },
                with: {
                  sharedMatchPlayers: {
                    where: {
                      sharedWithId: ctx.userId,
                    },
                    with: {
                      sharedMatch: {
                        with: {
                          match: {
                            with: {
                              teams: true,
                            },
                          },
                          sharedGame: {
                            with: {
                              game: {
                                with: {
                                  image: true,
                                },
                              },
                              linkedGame: {
                                with: {
                                  image: true,
                                },
                              },
                            },
                          },
                          sharedLocation: {
                            with: {
                              location: true,
                              linkedLocation: true,
                            },
                          },
                          sharedMatchPlayers: {
                            with: {
                              matchPlayer: true,
                              sharedPlayer: {
                                with: {
                                  player: true,
                                  linkedPlayer: true,
                                },
                              },
                            },
                          },
                        },
                      },
                      matchPlayer: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!returnedFriend) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Friend not found" });
      }
      const client = await clerkClient();

      const clerkUser = await client.users
        .getUser(returnedFriend.friend.clerkUserId)
        .catch((error) => {
          console.error(error);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Friend not found",
          });
        });
      // … after fetching `returnedFriend` …

      // --- 4) aggregate “shared with” (you → friend) and “shared to” (friend → you) ---

      type SharedEntry = {
        id: number;
        name: string;
        permission: "view" | "edit";
        createdAt: Date;
      } & (
        | {
            type: "game";
            matches: {
              id: number;
              permission: "view" | "edit";
              name: string;
              userId: number | null;
              gameId: number;
              scoresheetId: number;
              createdAt: Date;
              updatedAt: Date | null;
              deletedAt: Date | null;
              date: Date;
              duration: number;
              finished: boolean;
              running: boolean;
              locationId: number | null;
              comment: string | null;
            }[];
            scoresheets: {
              id: number;
              permission: "view" | "edit";
              name: string;
              gameId: number;
              userId: number | null;
              createdAt: Date;
              updatedAt: Date | null;
              deletedAt: Date | null;
              isCoop: boolean;
              winCondition:
                | "Manual"
                | "Highest Score"
                | "Lowest Score"
                | "No Winner"
                | "Target Score";
              targetScore: number;
              roundsScore: "Manual" | "Aggregate" | "Best Of";
              type: "Template" | "Default" | "Match" | "Game";
            }[];
          }
        | {
            type: "player";
          }
        | {
            type: "location";
          }
      );

      const sharedWith: SharedEntry[] = [];
      const sharedTo: SharedEntry[] = [];

      // helper to push entries
      function collectShares(
        targetArr: SharedEntry[],
        gamesOwner: {
          id: number;
          createdAt: Date;
          linkedGameId: number | null;
          permission: "view" | "edit";
          game: {
            name: string;
          };
          sharedMatches: {
            id: number;
            ownerId: number;
            sharedWithId: number;
            matchId: number;
            sharedGameId: number;
            sharedLocationId: number | null;
            permission: "view" | "edit";
            createdAt: Date;
            updatedAt: Date | null;
            match: {
              id: number;
              name: string;
              userId: number | null;
              gameId: number;
              scoresheetId: number;
              createdAt: Date;
              updatedAt: Date | null;
              deletedAt: Date | null;
              date: Date;
              duration: number;
              finished: boolean;
              running: boolean;
              locationId: number | null;
              comment: string | null;
            };
          }[];
          sharedScoresheets: {
            id: number;
            ownerId: number;
            sharedWithId: number;
            scoresheetId: number;
            sharedGameId: number;
            permission: "view" | "edit";
            createdAt: Date;
            updatedAt: Date | null;
            scoresheet: {
              id: number;
              name: string;
              gameId: number;
              userId: number | null;
              createdAt: Date;
              updatedAt: Date | null;
              deletedAt: Date | null;
              isCoop: boolean;
              winCondition:
                | "Manual"
                | "Highest Score"
                | "Lowest Score"
                | "No Winner"
                | "Target Score";
              targetScore: number;
              roundsScore: "Manual" | "Aggregate" | "Best Of";
              type: "Template" | "Default" | "Match" | "Game";
            };
          }[];
        }[],
        playersOwner: {
          id: number;
          createdAt: Date;
          permission: "view" | "edit";
          linkedPlayerId: number | null;
          player: {
            name: string;
          };
        }[],
        locationOwner: {
          id: number;
          ownerId: number;
          sharedWithId: number;
          locationId: number;
          linkedLocationId: number | null;
          isDefault: boolean;
          permission: "view" | "edit";
          createdAt: Date;
          updatedAt: Date | null;
          location: {
            name: string;
          };
        }[],
      ) {
        // game-level shares
        for (const sg of gamesOwner) {
          // the game itself

          const matches = sg.sharedMatches.map((sm) => ({
            ...sm.match,
            id: sm.id,
            permission: sm.permission,
          }));
          // matches under that game
          const scoresheets = sg.sharedScoresheets.map((ss) => ({
            ...ss.scoresheet,
            id: ss.id,
            permission: ss.permission,
          }));
          targetArr.push({
            id: sg.id,
            type: "game" as const,
            name: sg.game.name,
            permission: sg.permission,
            createdAt: sg.createdAt,
            matches,
            scoresheets,
          });
        }

        // player-level shares
        for (const sp of playersOwner) {
          targetArr.push({
            id: sp.id,
            name: sp.player.name,
            type: "player" as const,
            permission: sp.permission,
            createdAt: sp.createdAt,
          });
        }
        for (const sl of locationOwner) {
          targetArr.push({
            id: sl.id,
            name: sl.location.name,
            type: "location" as const,
            permission: sl.permission,
            createdAt: sl.createdAt,
          });
        }
      }

      // “You → friend”
      collectShares(
        sharedWith,
        returnedFriend.user.sharedGamesOwner,
        returnedFriend.user.sharedPlayersOwner,
        returnedFriend.user.sharedLocationsOwner,
      );

      // “Friend → you”
      collectShares(
        sharedTo,
        returnedFriend.friend.sharedGamesOwner,
        returnedFriend.friend.sharedPlayersOwner,
        returnedFriend.friend.sharedLocationsOwner,
      );

      const rawFP = returnedFriend.friendPlayer;
      if (!rawFP)
        return {
          linkedPlayerFound: false as const,
          clerkUser: {
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            username: clerkUser.username,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            imageUrl: clerkUser.imageUrl,
          },
          settings: returnedFriend.friendSetting,
          sharedWith,
          sharedTo,
          linkedPlayer: null,
        };

      const allMatches: MatchRecord[] = [];

      //— Original matches —
      rawFP.matchPlayers.forEach((mp) => {
        const m = mp.match;
        const others = m.matchPlayers.map((p) => ({
          playerId: p.playerId,
          name: p.player.name,
          score: p.score,
          isWinner: p.winner ?? false,
          placement: p.placement,
        }));
        allMatches.push({
          type: "Original",
          id: m.id,
          name: m.name,
          date: m.date,
          duration: m.duration,
          finished: m.finished,
          gameId: m.gameId,
          gameName: m.game.name,
          locationName: m.location?.name ?? undefined,
          players: others,
          outcome: {
            score: mp.score,
            isWinner: mp.winner ?? false,
            placement: mp.placement,
          },
        });
      });

      //— Shared matches —
      rawFP.sharedLinkedPlayers.forEach((lp) => {
        lp.sharedMatchPlayers.forEach((smp) => {
          const sm = smp.sharedMatch;
          const gameEntity = sm.sharedGame.linkedGame ?? sm.sharedGame.game;
          const players = sm.sharedMatchPlayers
            .filter((p) => p.sharedPlayer?.linkedPlayerId === rawFP.id)
            .map((p) => {
              const linkedPlayer = p.sharedPlayer?.linkedPlayer;
              if (linkedPlayer) {
                return {
                  playerId: linkedPlayer.id,
                  name: linkedPlayer.name,
                  score: p.matchPlayer.score,
                  isWinner: p.matchPlayer.winner ?? false,
                  placement: p.matchPlayer.placement,
                };
              } else if (p.sharedPlayer) {
                return {
                  playerId: p.sharedPlayer.playerId,
                  name: p.sharedPlayer.player.name,
                  score: p.matchPlayer.score,
                  isWinner: p.matchPlayer.winner ?? false,
                  placement: p.matchPlayer.placement,
                };
              }
              return false;
            })
            .filter((p) => p !== false);
          const locationName = sm.sharedLocation?.linkedLocation
            ? sm.sharedLocation.linkedLocation.name
            : sm.sharedLocation?.location.name;
          allMatches.push({
            type: "Shared",
            id: sm.match.id,
            name: sm.match.name,
            date: sm.match.date,
            duration: sm.match.duration,
            finished: sm.match.finished,
            gameId: gameEntity.id,
            gameName: gameEntity.name,
            locationName: locationName ?? undefined,
            players,
            outcome: {
              score: smp.matchPlayer.score,
              isWinner: smp.matchPlayer.winner ?? false,
              placement: smp.matchPlayer.placement,
            },
          });
        });
      });

      // sort newest first
      allMatches.sort((a, b) => compareAsc(b.date, a.date));

      const gameMap = new Map<number, GameAgg>();
      allMatches.forEach((m) => {
        const key = m.gameId;
        const isWin = m.outcome.isWinner ? 1 : 0;
        if (gameMap.has(key)) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const g = gameMap.get(key)!;
          g.plays += 1;
          g.wins += isWin;
          g.winRate = g.wins / g.plays;
        } else {
          // find image URL from either original or shared game
          let imageUrl: string | null = null;
          if (m.type === "Original") {
            const orig = rawFP.matchPlayers.find((x) => x.matchId === m.id);
            imageUrl = orig?.match.game.image?.url ?? null;
          } else {
            const smp = rawFP.sharedLinkedPlayers
              .flatMap((lp) => lp.sharedMatchPlayers)
              .find((x) => x.sharedMatch.match.id === m.id);
            const sg = smp?.sharedMatch.sharedGame;
            const linked = sg?.linkedGame;
            imageUrl = linked?.image?.url ?? sg?.game.image?.url ?? null;
          }

          gameMap.set(key, {
            type: m.type,
            id: key,
            name: m.gameName,
            imageUrl,
            plays: 1,
            wins: isWin,
            winRate: isWin,
          });
        }
      });

      const friendGames = Array.from(gameMap.values());

      const uniqueOpponents = new Set<number>();
      allMatches.forEach((m) =>
        m.players.forEach((p) => {
          if (p.playerId !== rawFP.id) uniqueOpponents.add(p.playerId);
        }),
      );

      const linkedPlayer = {
        id: rawFP.id,
        name: rawFP.name,
        imageUrl: rawFP.image?.url ?? null,
        players: uniqueOpponents.size,
        wins: allMatches.filter((m) => m.outcome.isWinner).length,
        winRate:
          allMatches.length === 0
            ? 0
            : allMatches.filter((m) => m.outcome.isWinner).length /
              allMatches.length,
        duration: allMatches.reduce((sum, m) => sum + m.duration, 0),
        matches: allMatches,
        friendGames,
      };
      return {
        linkedPlayerFound: true as const,
        clerkUser: {
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          username: clerkUser.username,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          imageUrl: clerkUser.imageUrl,
        },
        sharedWith,
        sharedTo,
        settings: returnedFriend.friendSetting,
        linkedPlayer: linkedPlayer,
      };
    }),
  getFriendMetaData: protectedUserProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.friend.findFirst({
        where: {
          userId: ctx.userId,
          friendId: input.friendId,
        },
        with: {
          friend: true,
        },
      });
    }),
});
