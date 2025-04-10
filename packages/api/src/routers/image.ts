import { TRPCError } from "@trpc/server";

import { image } from "@board-games/db/schema";
import { insertImageSchema } from "@board-games/db/zodSchema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const imageRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(insertImageSchema.omit({ userId: true, id: true }))
    .mutation(async ({ ctx, input }) => {
      const [dbImage] = await ctx.db
        .insert(image)
        .values({ ...input, userId: ctx.userId })
        .returning();
      if (!dbImage) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return dbImage;
    }),
});
