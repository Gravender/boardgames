import { currentUser } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { player, user } from "@board-games/db/schema";
import { selectUserSchema } from "@board-games/db/zodSchema";

import {
  createTRPCRouter,
  protectedProcedure,
  protectedUserProcedure,
  publicProcedure,
} from "../trpc";

export const userRouter = createTRPCRouter({
  hasGames: protectedUserProcedure.query(async ({ ctx }) => {
    const gameExists = await ctx.db.query.game.findFirst({
      where: {
        userId: ctx.userId,
        deletedAt: {
          isNull: true,
        },
      },
      columns: {
        id: true,
      },
    });
    if (!gameExists) {
      return false;
    }
    return true;
  }),
  getUser: protectedProcedure
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
          const clerkUser = await currentUser();
          const [insertedUser] = await tx
            .insert(user)
            .values({
              clerkUserId: input.userId,
              email: clerkUser?.emailAddresses[0]?.emailAddress,
              name: clerkUser?.fullName,
            })
            .returning();
          if (!insertedUser)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not insert user",
            });
          const [insertedPlayer] = await tx
            .insert(player)
            .values({
              name: clerkUser?.fullName ?? "",
              createdBy: insertedUser.id,
              isUser: true,
            })
            .returning();
          if (!insertedPlayer)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not insert player",
            });
          return "User created";
        } else {
          return "User already exists";
        }
      });
      return result;
    }),
});
