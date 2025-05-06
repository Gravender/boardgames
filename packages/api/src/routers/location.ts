import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { location, match, sharedLocation } from "@board-games/db/schema";
import {
  insertLocationSchema,
  selectLocationSchema,
} from "@board-games/db/zodSchema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const locationRouter = createTRPCRouter({
  getLocations: protectedUserProcedure.query(async ({ ctx }) => {
    const userLocations = await ctx.db.query.location.findMany({
      where: {
        createdBy: ctx.userId,
      },
      with: {
        matches: true,
        sharedMatches: {
          where: {
            sharedWithId: ctx.userId,
          },
        },
      },
      orderBy: (location, { asc }) => asc(location.name),
    });
    const sharedLocations = await ctx.db.query.sharedLocation.findMany({
      where: {
        sharedWithId: ctx.userId,
        linkedLocationId: {
          isNull: true,
        },
      },
      with: {
        sharedMatches: {
          where: {
            sharedWithId: ctx.userId,
          },
        },
        location: true,
      },
    });
    return [
      ...userLocations.map((location) => ({
        type: "original" as const,
        ...location,
        matches: location.matches.length + location.sharedMatches.length,
      })),
      ...sharedLocations.map((sharedLocation) => ({
        type: "shared" as const,
        ...sharedLocation.location,
        isDefault: sharedLocation.isDefault,
        permission: sharedLocation.permission,
        id: sharedLocation.id,
        locationId: sharedLocation.locationId,
        matches: sharedLocation.sharedMatches.length,
      })),
    ];
  }),
  getLocation: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.location.findFirst({
        where: {
          id: input.id,
          createdBy: ctx.userId,
        },
        with: {
          matches: {
            with: {
              game: {
                with: {
                  image: true,
                },
              },
              matchPlayers: {
                with: {
                  player: true,
                },
              },
            },
          },
          sharedMatches: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              match: true,
              sharedGame: {
                with: {
                  linkedGame: {
                    with: {
                      image: true,
                    },
                  },
                  game: {
                    with: {
                      image: true,
                    },
                  },
                },
              },
              sharedMatchPlayers: {
                with: {
                  matchPlayer: true,
                  sharedPlayer: {
                    with: {
                      linkedPlayer: true,

                      player: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!result) return null;
      const locationMatches: {
        type: "original" | "shared";
        id: number;
        gameId: number;
        date: Date;
        name: string;
        finished: boolean;
        won: boolean;
        players: {
          id: number;
          name: string;
        }[];
        gameImageUrl: string | undefined;
        gameName: string | undefined;
      }[] = [
        ...result.matches.map((m) => {
          return {
            type: "original" as const,
            id: m.id,
            gameId: m.gameId,
            date: m.date,
            name: m.name,
            finished: m.finished,
            won:
              m.matchPlayers.findIndex(
                (player) =>
                  player.winner && player.player.userId === ctx.userId,
              ) !== -1,
            players: m.matchPlayers.map((matchPlayer) => {
              return {
                id: matchPlayer.player.id,
                name: matchPlayer.player.name,
              };
            }),
            gameImageUrl: m.game.image?.url,
            gameName: m.game.name,
          };
        }),
        ...result.sharedMatches.map((m) => {
          const linkedGame = m.sharedGame.linkedGame;
          const mPlayers = m.sharedMatchPlayers
            .map((sharedMatchPlayer) => {
              if (sharedMatchPlayer.sharedPlayer === null) {
                return null;
              }
              if (sharedMatchPlayer.sharedPlayer.linkedPlayer === null) {
                return {
                  type: "shared" as const,
                  isUser: false,
                  id: sharedMatchPlayer.sharedPlayer.id,
                  name: sharedMatchPlayer.sharedPlayer.player.name,
                  placement: sharedMatchPlayer.matchPlayer.placement,
                  winner: sharedMatchPlayer.matchPlayer.winner,
                };
              }
              return {
                type: "original" as const,
                isUser:
                  sharedMatchPlayer.sharedPlayer.linkedPlayer.userId ===
                  ctx.userId,

                id: sharedMatchPlayer.sharedPlayer.linkedPlayer.id,
                name: sharedMatchPlayer.sharedPlayer.linkedPlayer.name,
                placement: sharedMatchPlayer.matchPlayer.placement,
                winner: sharedMatchPlayer.matchPlayer.winner,
              };
            })
            .filter((p) => p !== null);
          if (linkedGame) {
            return {
              type: "shared" as const,
              id: m.id,
              gameId: m.sharedGame.id,
              date: m.match.date,
              name: m.match.name,
              finished: m.match.finished,
              won:
                mPlayers.findIndex(
                  (player) => player.winner && player.isUser,
                ) !== -1,
              players: mPlayers,
              gameImageUrl: linkedGame.image?.url,
              gameName: linkedGame.name,
            };
          }
          return {
            type: "shared" as const,
            id: m.id,
            gameId: m.sharedGame.id,
            date: m.match.date,
            name: m.match.name,
            finished: m.match.finished,
            won:
              mPlayers.findIndex((player) => player.winner && player.isUser) !==
              -1,
            players: mPlayers,
            gameImageUrl: m.sharedGame.game.image?.url,
            gameName: m.sharedGame.game.name,
          };
        }),
      ];
      return {
        id: result.id,
        name: result.name,
        isDefault: result.isDefault,
        matches: locationMatches,
      };
    }),
  create: protectedUserProcedure
    .input(insertLocationSchema.pick({ name: true, isDefault: true }))
    .mutation(async ({ ctx, input }) => {
      if (input.isDefault) {
        await ctx.db
          .update(location)
          .set({ isDefault: false })
          .where(eq(location.createdBy, ctx.userId));
      }
      const result = (
        await ctx.db
          .insert(location)
          .values({
            name: input.name,
            isDefault: input.isDefault,
            createdBy: ctx.userId,
          })
          .returning()
      )[0];
      if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return result;
    }),
  update: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(location)
        .set({
          name: input.name,
        })
        .where(eq(location.id, input.id))
        .returning();
    }),
  editDefaultLocation: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
        isDefault: z.boolean(),
        type: z.enum(["original", "shared"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(location)
          .set({ isDefault: false })
          .where(eq(location.createdBy, ctx.userId));
        await tx
          .update(sharedLocation)
          .set({ isDefault: false })
          .where(eq(sharedLocation.sharedWithId, ctx.userId));
        if (input.type === "original") {
          await tx
            .update(location)
            .set({ isDefault: input.isDefault })
            .where(eq(location.id, input.id));
        } else {
          await tx
            .update(sharedLocation)
            .set({ isDefault: input.isDefault })
            .where(eq(sharedLocation.id, input.id));
        }
      });
    }),
  deleteLocation: protectedUserProcedure
    .input(selectLocationSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(match)
        .set({ locationId: null })
        .where(eq(match.locationId, input.id));
      await ctx.db.delete(location).where(eq(location.id, input.id));
    }),
});
