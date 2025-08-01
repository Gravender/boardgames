import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { scoresheet } from "@board-games/db/schema";
import {
  insertScoreSheetSchema,
  selectScoreSheetSchema,
} from "@board-games/db/zodSchema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const scoresheetRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(insertScoreSheetSchema.omit({ createdBy: true, id: true }))
    .mutation(async ({ ctx, input }) => {
      const returnedScoreSheet = await ctx.db
        .insert(scoresheet)
        .values({ ...input, createdBy: ctx.userId })
        .returning();
      if (!returnedScoreSheet[0]?.id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return returnedScoreSheet[0];
    }),
  getScoresheet: protectedUserProcedure
    .input(selectScoreSheetSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: scoresheet.id,
          name: scoresheet.name,
          isCoop: scoresheet.isCoop,
          winCondition: scoresheet.winCondition,
          roundsScore: scoresheet.roundsScore,
          is_template: scoresheet.type,
        })
        .from(scoresheet)
        .where(eq(scoresheet.id, input.id));
    }),
});
