import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import { image, insertImageSchema } from "~/server/db/schema";

export const imageRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(insertImageSchema.omit({ userId: true, id: true }))
    .mutation(async ({ ctx, input }) => {
      const dbImage = await ctx.db
        .insert(image)
        .values({ ...input, userId: ctx.userId })
        .returning();
      if (!dbImage[0]?.id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return dbImage[0];
    }),
});
