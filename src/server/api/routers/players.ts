import { get } from "http";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import { player } from "~/server/db/schema";

export const playerRouter = createTRPCRouter({
  getPlayers: protectedUserProcedure.query(async ({ ctx }) => {
    let players = await ctx.db.query.player.findMany({
      where: and(eq(player.createdBy, ctx.userId)),
      with: { matches: true, image: true },
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
