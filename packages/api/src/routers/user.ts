import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { selectUserSchema, user } from "@board-games/db/schema";

import {
  createTRPCRouter,
  protectedUserProcedure,
  publicProcedure,
} from "../trpc";

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
  isInDb: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const [returnedUser] = await tx
          .select()
          .from(user)
          .where(eq(user.clerkUserId, input.userId));

        if (!returnedUser) {
          const [insertedUser] = await tx
            .insert(user)
            .values({ clerkUserId: input.userId })
            .returning();
          if (!insertedUser)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not insert user",
            });
          return "User created";
        } else {
          return "User already exists";
        }
      });
      return result;
    }),
});
