import { get } from "http";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import { match, player, selectGameSchema } from "~/server/db/schema";

export const playerRouter = createTRPCRouter({
  getPlayers: protectedUserProcedure
    .input(
      z.object({
        game: selectGameSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      let players = await ctx.db.query.player.findMany({
        where: and(eq(player.createdBy, ctx.userId)),
        with: {
          matches: {
            where: eq(match.id, input.game.id),
          },
          image: true,
        },
      });
      if (players.length === 0) {
        await ctx.db
          .insert(player)
          .values({ createdBy: ctx.userId, userId: ctx.userId, name: "Me" });
        players = await ctx.db.query.player.findMany({
          where: and(eq(player.createdBy, ctx.userId)),
          with: { matches: true, image: true },
        });
      }
      return players.map((player) => {
        return {
          id: player.id,
          name: player.name,
          matches: player.matches.length,
          imageUrl: player.image?.url,
        };
      });
    }),
});
