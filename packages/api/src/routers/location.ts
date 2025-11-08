import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";

import {
  location,
  match,
  sharedLocation,
  sharedMatch,
  shareRequest,
} from "@board-games/db/schema";
import { insertLocationSchema } from "@board-games/db/zodSchema";

import { protectedUserProcedure } from "../trpc";
import { getLocationsOutput } from "./location/location.output";
import { locationService } from "./location/service/location.service";
import { locationSharedRouter } from "./location/sub-routers/shared/shared-location.router";

export const locationRouter = {
  getLocations: protectedUserProcedure
    .output(getLocationsOutput)
    .query(async ({ ctx }) => {
      return locationService.getLocations({
        ctx,
      });
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
          deletedAt: {
            isNull: true,
          },
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
        gameImage: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "game" | "player" | "match";
        } | null;
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
                (player) => player.winner && player.player.isUser,
              ) !== -1,
            players: m.matchPlayers.map((matchPlayer) => {
              return {
                id: matchPlayer.player.id,
                name: matchPlayer.player.name,
              };
            }),
            gameImage: m.game.image,
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
                isUser: sharedMatchPlayer.sharedPlayer.linkedPlayer.isUser,

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
              gameImage: linkedGame.image,
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
            gameImage: m.sharedGame.game.image,
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
      const result = await ctx.db.transaction(async (transaction) => {
        if (input.isDefault) {
          await transaction
            .update(location)
            .set({ isDefault: false })
            .where(eq(location.createdBy, ctx.userId));
          await transaction
            .update(sharedLocation)
            .set({ isDefault: false })
            .where(eq(sharedLocation.sharedWithId, ctx.userId));
        }
        return (
          await transaction
            .insert(location)
            .values({
              name: input.name,
              isDefault: input.isDefault,
              createdBy: ctx.userId,
            })
            .returning()
        )[0];
      });
      if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return result;
    }),
  update: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
        type: z.literal("shared").or(z.literal("original")),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (transaction) => {
        if (input.type === "original") {
          await transaction
            .update(location)
            .set({
              name: input.name,
            })
            .where(eq(location.id, input.id));
        }
        if (input.type === "shared") {
          const sharedLocation =
            await transaction.query.sharedLocation.findFirst({
              where: {
                id: input.id,
                sharedWithId: ctx.userId,
              },
            });
          if (!sharedLocation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shared location not found.",
            });
          }
          await transaction
            .update(location)
            .set({
              name: input.name,
            })
            .where(eq(location.id, sharedLocation.locationId));
        }
      });
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
    .input(z.object({ id: z.number(), type: z.enum(["original", "shared"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        if (input.type === "original") {
          await tx
            .update(sharedLocation)
            .set({ linkedLocationId: null })
            .where(eq(sharedLocation.linkedLocationId, input.id));
          await tx
            .update(match)
            .set({ locationId: null })
            .where(eq(match.locationId, input.id));
          await tx
            .update(location)
            .set({ deletedAt: new Date() })
            .where(eq(location.id, input.id));
        }
        if (input.type === "shared") {
          await tx
            .update(sharedMatch)
            .set({ sharedLocationId: null })
            .where(eq(sharedMatch.sharedLocationId, input.id));
          const [deletedLocation] = await tx
            .delete(sharedLocation)
            .where(eq(sharedLocation.id, input.id))
            .returning();
          if (deletedLocation) {
            await tx
              .update(shareRequest)
              .set({
                status: "rejected",
              })
              .where(
                and(
                  eq(shareRequest.sharedWithId, ctx.userId),
                  eq(shareRequest.itemType, "location"),
                  eq(shareRequest.itemId, deletedLocation.id),
                  eq(shareRequest.status, "accepted"),
                ),
              );
          }
        }
      });
    }),
  shared: locationSharedRouter,
} satisfies TRPCRouterRecord;
