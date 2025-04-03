import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { friend, friendRequest } from "@board-games/db/schema";

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
});
