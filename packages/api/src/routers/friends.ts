import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";

import { friend, friendRequest, friendSetting } from "@board-games/db/schema";

import { protectedUserProcedure } from "../trpc";
import { mapMatches } from "../utils/game";
import { collectShares } from "../utils/sharing";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GameAgg = {
  type: "Original" | "Shared";
  id: number;
  name: string;
  image: {
    name: string;
    url: string | null;
    type: "file" | "svg";
    usageType: "game";
  } | null;
  plays: number;
  wins: number;
  winRate: number;
};

export const friendsRouter = {
  sendFriendRequest: protectedUserProcedure
    .input(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("email"),
          email: z.string().email({
            message: "Please enter a valid email address.",
          }),
        }),

        z.object({
          type: z.literal("username"),
          username: z.string().min(3, {
            message: "Username must be at least 3 characters.",
          }),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const returnedUser = await ctx.db.query.user.findFirst({
        where:
          input.type === "email"
            ? {
                email: input.email,
              }
            : {
                username: input.username,
              },
      });
      if (!returnedUser) {
        return { success: false, message: "User Not Found" };
      }
      if (returnedUser.id === ctx.userId) {
        return {
          success: false,
          message: "You cannot send a friend request to yourself",
        };
      }
      const existingRequest = await ctx.db.query.friendRequest.findFirst({
        where: {
          userId: ctx.userId,
          requesteeId: returnedUser.id,
        },
      });
      if (existingRequest) {
        if (existingRequest.status === "rejected") {
          return { success: false, message: "Friend request already rejected" };
        }
        if (existingRequest.status === "accepted") {
          return { success: false, message: "Friend request already accepted" };
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (existingRequest.status === "pending") {
          return { success: false, message: "Friend request already pending" };
        }
      }
      await ctx.db.insert(friendRequest).values({
        userId: ctx.userId,
        requesteeId: returnedUser.id,
        status: "pending",
      });

      return {
        success: true,
        message: `Friend request sent to ${returnedUser.name}`,
      };
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
    .input(z.object({ friendId: z.string() }))
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
    const requests = await ctx.db.query.friendRequest.findMany({
      where: {
        requesteeId: ctx.userId,
        status: "pending",
      },
      with: {
        user: true,
      },
    });
    const mappedRequests: {
      id: number;
      status: "pending" | "accepted" | "rejected";
      name: string;
      userName: string | null;
      email: string | null;
      image: {
        name: string;
        url: string | null;
        type: "file";
        usageType: "player";
      } | null;
      createdAt: Date;
    }[] = requests.map((returnedRequest) => {
      return {
        id: returnedRequest.id,
        status: returnedRequest.status,
        name: returnedRequest.user.name,
        userName: returnedRequest.user.username,
        email: returnedRequest.user.email,
        image:
          returnedRequest.user.image !== ""
            ? {
                name: returnedRequest.user.name,
                url: returnedRequest.user.image,
                type: "file",
                usageType: "player",
              }
            : null,
        createdAt: returnedRequest.createdAt,
      };
    });
    return mappedRequests;
  }),

  getSentFriendRequests: protectedUserProcedure.query(async ({ ctx }) => {
    const requests = await ctx.db.query.friendRequest.findMany({
      where: {
        userId: ctx.userId,
        status: "pending",
      },
      with: {
        requestee: true,
      },
    });
    const mappedRequests: {
      id: number;
      status: "pending" | "accepted" | "rejected";
      name: string;
      userName: string | null;
      email: string | null;
      image: {
        name: string;
        url: string | null;
        type: "file";
        usageType: "player";
      } | null;
      createdAt: Date;
    }[] = requests.map((returnedRequest) => {
      return {
        id: returnedRequest.id,
        status: returnedRequest.status,
        name: returnedRequest.requestee.name,
        userName: returnedRequest.requestee.username,
        email: returnedRequest.requestee.email,
        image:
          returnedRequest.requestee.image !== ""
            ? {
                name: returnedRequest.requestee.name,
                url: returnedRequest.requestee.image,
                type: "file",
                usageType: "player",
              }
            : null,
        createdAt: returnedRequest.createdAt,
      };
    });
    return mappedRequests;
  }),
  getFriends: protectedUserProcedure.query(async ({ ctx }) => {
    const returnedFriends = await ctx.db.query.friend.findMany({
      where: {
        userId: ctx.userId,
      },
      with: {
        friend: true,
        friendPlayer: true,
      },
    });
    const mappedFriends: {
      id: string;
      name: string;
      userName: string | null;
      email: string | null;
      image: {
        name: string;
        url: string | null;
        type: "file";
        usageType: "player";
      } | null;
      createdAt: Date;
      linkedPlayerFound: boolean;
    }[] = returnedFriends.map((returnedFriend) => {
      return {
        id: returnedFriend.friend.id,
        name: returnedFriend.friend.name,
        userName: returnedFriend.friend.username,
        email: returnedFriend.friend.email,
        image:
          returnedFriend.friend.image !== ""
            ? {
                name: returnedFriend.friend.name,
                url: returnedFriend.friend.image,
                type: "file",
                usageType: "player",
              }
            : null,
        createdAt: returnedFriend.createdAt,
        linkedPlayerFound: returnedFriend.friendPlayer !== null,
      };
    });
    return mappedFriends;
  }),
  getFriend: protectedUserProcedure
    .input(z.object({ friendId: z.string() }))
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
              username: true,
              email: true,
              image: true,
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
                      match: {
                        columns: {
                          id: true,
                          comment: true,
                          name: true,
                          date: true,
                          finished: true,
                          duration: true,
                        },
                      },
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
              name: true,
              username: true,
              email: true,
              image: true,
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
                      match: {
                        columns: {
                          id: true,
                          comment: true,
                          name: true,
                          date: true,
                          finished: true,
                          duration: true,
                        },
                      },
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
                columns: {
                  id: true,
                  matchId: true,
                  playerId: true,
                  teamId: true,
                  winner: true,
                  score: true,
                  placement: true,
                  order: true,
                },
                with: {
                  match: {
                    columns: {
                      id: true,
                      gameId: true,
                      comment: true,
                      name: true,
                      date: true,
                      finished: true,
                      duration: true,
                    },
                    with: {
                      game: {
                        columns: {
                          id: true,
                          name: true,
                          playersMax: true,
                          playersMin: true,
                          playtimeMax: true,
                          playtimeMin: true,
                          yearPublished: true,
                        },
                        with: {
                          image: true,
                        },
                      },
                      location: {
                        columns: {
                          id: true,
                          name: true,
                        },
                      },
                      teams: {
                        columns: {
                          id: true,
                          name: true,
                        },
                      },
                      matchPlayers: {
                        columns: {
                          id: true,
                          matchId: true,
                          playerId: true,
                          teamId: true,
                          winner: true,
                          score: true,
                          placement: true,
                          order: true,
                        },
                        with: {
                          player: {
                            columns: {
                              id: true,
                              name: true,
                            },
                          },
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
                columns: {
                  id: true,
                  permission: true,
                },
                with: {
                  sharedMatchPlayers: {
                    where: {
                      sharedWithId: ctx.userId,
                    },
                    columns: {
                      id: true,
                      permission: true,
                      sharedMatchId: true,
                      sharedPlayerId: true,
                      matchPlayerId: true,
                    },
                    with: {
                      sharedMatch: {
                        columns: {
                          id: true,
                          permission: true,
                          sharedGameId: true,
                          sharedLocationId: true,
                        },
                        with: {
                          match: {
                            columns: {
                              id: true,
                              comment: true,
                              name: true,
                              date: true,
                              finished: true,
                              duration: true,
                            },
                            with: {
                              teams: true,
                            },
                          },
                          sharedGame: {
                            with: {
                              game: {
                                columns: {
                                  id: true,
                                  name: true,
                                  playersMax: true,
                                  playersMin: true,
                                  playtimeMax: true,
                                  playtimeMin: true,
                                  yearPublished: true,
                                },
                                with: {
                                  image: true,
                                },
                              },
                              linkedGame: {
                                columns: {
                                  id: true,
                                  name: true,
                                  playersMax: true,
                                  playersMin: true,
                                  playtimeMax: true,
                                  playtimeMin: true,
                                  yearPublished: true,
                                },
                                with: {
                                  image: true,
                                },
                              },
                            },
                          },
                          sharedLocation: {
                            columns: {
                              id: true,
                              permission: true,
                            },
                            with: {
                              location: {
                                columns: {
                                  id: true,
                                  name: true,
                                },
                              },
                              linkedLocation: {
                                columns: {
                                  id: true,
                                  name: true,
                                },
                              },
                            },
                          },
                          sharedMatchPlayers: {
                            with: {
                              matchPlayer: {
                                columns: {
                                  id: true,
                                  matchId: true,
                                  playerId: true,
                                  teamId: true,
                                  winner: true,
                                  score: true,
                                  placement: true,
                                  order: true,
                                },
                              },
                              sharedPlayer: {
                                with: {
                                  player: {
                                    columns: {
                                      id: true,
                                      name: true,
                                    },
                                  },
                                  linkedPlayer: {
                                    columns: {
                                      id: true,
                                      name: true,
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      matchPlayer: {
                        columns: {
                          id: true,
                          matchId: true,
                          playerId: true,
                          teamId: true,
                          winner: true,
                          score: true,
                          placement: true,
                          order: true,
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
      if (!returnedFriend) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Friend not found" });
      }

      // “You → friend”
      const sharedWith = collectShares(
        returnedFriend.user.sharedGamesOwner,
        returnedFriend.user.sharedPlayersOwner,
        returnedFriend.user.sharedLocationsOwner,
      );

      // “Friend → you”
      const sharedTo = collectShares(
        returnedFriend.friend.sharedGamesOwner,
        returnedFriend.friend.sharedPlayersOwner,
        returnedFriend.friend.sharedLocationsOwner,
      );

      const rawFP = returnedFriend.friendPlayer;
      if (!rawFP)
        return {
          id: returnedFriend.id,
          linkedPlayerFound: false as const,
          clerkUser: {
            name: returnedFriend.user.name,
            username: returnedFriend.user.username,
            email: returnedFriend.user.email,
            image:
              returnedFriend.user.image !== ""
                ? {
                    name: returnedFriend.user.name,
                    type: "file" as const,
                    usageType: "player" as const,
                    url: returnedFriend.user.image,
                  }
                : null,
          },
          settings: returnedFriend.friendSetting,
          sharedWith,
          sharedTo,
          linkedPlayer: null,
        };

      //— Shared matches —

      // sort newest first
      const allMatches = mapMatches(
        rawFP.matchPlayers,
        rawFP.sharedLinkedPlayers,
      );
      const gameMap = new Map<string, GameAgg>();
      allMatches.forEach((m) => {
        const key = `${m.gameId}-${m.type}`;
        const isWin = m.outcome.isWinner ? 1 : 0;
        const g = gameMap.get(key);
        if (g) {
          g.plays += 1;
          g.wins += isWin;
          g.winRate = g.wins / g.plays;
        } else {
          // find image  from either original or shared game
          let image: {
            name: string;
            url: string | null;
            type: "file" | "svg";
            usageType: "game";
          } | null = null;
          if (m.type === "Original") {
            const orig = rawFP.matchPlayers.find((x) => x.matchId === m.id);
            image = orig?.match.game.image
              ? {
                  name: orig.match.game.image.name,
                  url: orig.match.game.image.url,
                  type: orig.match.game.image.type,
                  usageType: "game" as const,
                }
              : null;
          } else {
            const smp = rawFP.sharedLinkedPlayers
              .flatMap((lp) => lp.sharedMatchPlayers)
              .find((x) => x.sharedMatch.match.id === m.id);
            const sg = smp?.sharedMatch.sharedGame;
            const linked = sg?.linkedGame;
            image = linked?.image
              ? {
                  name: linked.image.name,
                  url: linked.image.url,
                  type: linked.image.type,
                  usageType: "game" as const,
                }
              : null;
          }

          gameMap.set(key, {
            type: m.type,
            id: m.gameId,
            name: m.gameName,
            image,
            plays: 1,
            wins: isWin,
            winRate: isWin,
          });
        }
      });

      const friendGames = Array.from(gameMap.values()).sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

      const uniqueOpponents = new Set<number>();
      allMatches.forEach((m) =>
        m.players.forEach((p) => {
          if (p.playerId !== rawFP.id) uniqueOpponents.add(p.playerId);
        }),
      );

      const linkedPlayer = {
        id: rawFP.id,
        name: rawFP.name,
        image: rawFP.image,
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
        id: returnedFriend.id,
        linkedPlayerFound: true as const,
        clerkUser: {
          name: returnedFriend.user.name,
          username: returnedFriend.user.username,
          email: returnedFriend.user.email,
          image:
            returnedFriend.user.image !== ""
              ? {
                  name: returnedFriend.user.name,
                  type: "file" as const,
                  usageType: "player" as const,
                  url: returnedFriend.user.image,
                }
              : null,
        },
        sharedWith,
        sharedTo,
        settings: returnedFriend.friendSetting,
        linkedPlayer: linkedPlayer,
      };
    }),
  getFriendMetaData: protectedUserProcedure
    .input(z.object({ friendId: z.string() }))
    .query(async ({ ctx, input }) => {
      const returnedFriend = await ctx.db.query.friend.findFirst({
        where: {
          userId: ctx.userId,
          friendId: input.friendId,
        },
        with: {
          friend: true,
        },
      });
      if (!returnedFriend) {
        return null;
      }
      return {
        id: returnedFriend.friend.id,
        name: returnedFriend.friend.name,
        userName: returnedFriend.friend.username,
        email: returnedFriend.friend.email,
        image:
          returnedFriend.friend.image !== ""
            ? {
                name: returnedFriend.friend.name,
                url: returnedFriend.friend.image,
                type: "file",
                usageType: "player",
              }
            : null,
      };
    }),
  updateFriendSettings: protectedUserProcedure
    .input(
      z.object({
        friendId: z.number(),
        settings: z.object({
          autoShareMatches: z.boolean(),
          sharePlayersWithMatch: z.boolean(),
          includeLocationWithMatch: z.boolean(),
          defaultPermissionForMatches: z.enum(["view", "edit"]),
          defaultPermissionForPlayers: z.enum(["view", "edit"]),
          defaultPermissionForLocation: z.enum(["view", "edit"]),
          defaultPermissionForGame: z.enum(["view", "edit"]),
          autoAcceptMatches: z.boolean(),
          autoAcceptPlayers: z.boolean(),
          autoAcceptLocation: z.boolean(),
          autoAcceptGame: z.boolean(),
          allowSharedGames: z.boolean(),
          allowSharedPlayers: z.boolean(),
          allowSharedLocation: z.boolean(),
          allowSharedMatches: z.boolean(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const returnedFriend = await ctx.db.query.friend.findFirst({
        where: {
          userId: ctx.userId,
          id: input.friendId,
        },
        with: {
          friendSetting: true,
        },
      });
      if (!returnedFriend) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (!returnedFriend.friendSetting) {
        await ctx.db.insert(friendSetting).values({
          createdById: ctx.userId,
          friendId: input.friendId,
          ...input.settings,
        });
      } else {
        await ctx.db
          .update(friendSetting)
          .set(input.settings)
          .where(eq(friendSetting.id, returnedFriend.friendSetting.id));
      }
    }),
} satisfies TRPCRouterRecord;
