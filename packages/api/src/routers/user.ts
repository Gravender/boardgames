import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "../trpc";

export const userRouter = {
  hasGames: protectedUserProcedure.query(async ({ ctx }) => {
    const gameExists = await ctx.db.query.game.findFirst({
      where: {
        createdBy: ctx.userId,
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
} satisfies TRPCRouterRecord;
