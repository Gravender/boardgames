import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
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
});
