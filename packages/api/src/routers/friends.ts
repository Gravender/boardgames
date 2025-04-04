import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  friend,
  friendRequest,
  sharedGame,
  sharedMatch,
  sharedPlayer,
} from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

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
      where: and(
        eq(friendRequest.requesteeId, ctx.userId),
        eq(friendRequest.status, "pending"),
      ),
      with: {
        user: true,
      },
    });
  }),

  getSentFriendRequests: protectedUserProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.friendRequest.findMany({
      where: and(
        eq(friendRequest.userId, ctx.userId),
        eq(friendRequest.status, "pending"),
      ),
      with: {
        user: true,
      },
    });
  }),
  getFriends: protectedUserProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.friend.findMany({
      where: eq(friend.userId, ctx.userId),
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
        where: and(
          eq(friend.userId, ctx.userId),
          eq(friend.friendId, input.friendId),
        ),
        with: {
          friend: {
            columns: {
              name: true,
              clerkUserId: false,
              email: true,
              createdAt: true,
              updatedAt: false,
              id: false,
            },
            with: {
              gamesShared: {
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
                where: eq(sharedGame.sharedWithId, ctx.userId),
                orderBy: desc(sharedGame.createdAt),
                with: {
                  matches: true,
                  scoresheets: true,
                  game: {
                    columns: {
                      name: true,
                    },
                  },
                },
              },
              playersShared: {
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
                where: eq(sharedPlayer.sharedWithId, ctx.userId),
                orderBy: desc(sharedPlayer.createdAt),
                with: {
                  player: {
                    columns: {
                      name: true,
                    },
                  },
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
              gamesShared: {
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
                where: eq(sharedGame.ownerId, ctx.userId),
                orderBy: desc(sharedGame.createdAt),
                with: {
                  matches: true,
                  scoresheets: true,
                  game: {
                    columns: {
                      name: true,
                    },
                  },
                },
              },
              playersShared: {
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
                where: eq(sharedPlayer.ownerId, ctx.userId),
                orderBy: desc(sharedPlayer.createdAt),
                with: {
                  player: {
                    columns: {
                      name: true,
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
      console.log(returnedFriend.user);
      return returnedFriend;
    }),
  getFriendMetaData: protectedUserProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.friend.findFirst({
        where: and(
          eq(friend.userId, ctx.userId),
          eq(friend.friendId, input.friendId),
        ),
        with: {
          friend: true,
        },
      });
    }),
});
