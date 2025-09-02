import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { match } from "@board-games/db/schema";

import { getMatchInput } from "~/routers/match/match.input";
import { protectedUserProcedure } from "~/trpc";

export const updateMatchRouter = {
  matchStart: protectedUserProcedure
    .input(getMatchInput)
    .mutation(async ({ ctx, input }) => {
      if (input.type === "original") {
        const returnedMatch = await ctx.db.query.match.findFirst({
          where: {
            id: input.id,
            createdBy: ctx.userId,
            deletedAt: {
              isNull: true,
            },
          },
        });
        if (!returnedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found.",
          });
        }
        await ctx.db
          .update(match)
          .set({
            running: true,
            finished: false,
            startTime: new Date(),
          })
          .where(and(eq(match.id, input.id), eq(match.createdBy, ctx.userId)));
      }
      if (input.type === "shared") {
        const returnedSharedMatch = await ctx.db.query.sharedMatch.findFirst({
          where: {
            matchId: input.id,
            sharedWithId: ctx.userId,
          },
        });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission !== "edit") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Does not have permission to start this match.",
          });
        }
        await ctx.db
          .update(match)
          .set({
            running: true,
            finished: false,
            startTime: new Date(),
          })
          .where(and(eq(match.id, input.id), eq(match.createdBy, ctx.userId)));
      }
    }),
} satisfies TRPCRouterRecord;
