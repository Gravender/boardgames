import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { selectUserSchema, user } from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  getUser: protectedUserProcedure
    .input(selectUserSchema.pick({ clerkUserId: true }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .selectDistinct()
        .from(user)
        .where(eq(user.clerkUserId, input.clerkUserId));
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return result;
    }),
});
