import { eq } from "drizzle-orm";
import { z } from "zod";

import { friend } from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const friendsRouter = createTRPCRouter({
  sendFriendRequest: protectedUserProcedure
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(friend).values({
        userId: ctx.userId,
        friendId: input.friendId,
        status: "pending",
      });

      return { success: true, message: "Friend request sent." };
    }),

  acceptFriendRequest: protectedUserProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(friend)
        .set({ status: "accepted" })
        .where(eq(friend.id, input.requestId));

      return { success: true, message: "Friend request accepted." };
    }),

  rejectFriendRequest: protectedUserProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(friend)
        .set({ status: "rejected" })
        .where(eq(friend.id, input.requestId));

      return { success: true, message: "Friend request rejected." };
    }),

  getFriends: protectedUserProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select()
      .from(friend)
      .where(eq(friend.userId, ctx.userId));
  }),
});
