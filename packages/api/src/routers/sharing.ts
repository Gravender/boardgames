import { TRPCError } from "@trpc/server";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";

import type {
  selectGameSchema,
  selectMatchSchema,
  selectScoreSheetSchema,
} from "@board-games/db/schema";
import {
  game,
  match,
  player,
  scoresheet,
  sharedGame,
  sharedMatch,
  sharedPlayer,
  sharedScoresheet,
  shareRequest,
  userSharingPreference,
} from "@board-games/db/schema";

import {
  createTRPCRouter,
  protectedUserProcedure,
  publicProcedure,
} from "../trpc";

export const sharingRouter = createTRPCRouter({
  requestShareGame: protectedUserProcedure
    .input(
      z
        .object({
          gameId: z.number(),
          permission: z.enum(["view", "edit"]),
          expiresAt: z.date().optional(),
          sharedMatches: z.array(
            z.object({
              matchId: z.number(),
              permission: z.enum(["view", "edit"]),
              includePlayers: z.boolean(),
            }),
          ),
          scoresheetsToShare: z
            .array(
              z.object({
                scoresheetId: z.number(),
                permission: z.enum(["view", "edit"]),
              }),
            )
            .min(1),
        })
        .and(
          z.discriminatedUnion("type", [
            z.object({
              type: z.literal("link"),
            }),
            z.object({
              type: z.literal("friends"),
              friends: z
                .array(
                  z.object({
                    id: z.number(),
                  }),
                )
                .min(1),
            }),
          ]),
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const [returnedGame] = await ctx.db
        .select()
        .from(game)
        .where(and(eq(game.id, input.gameId), eq(game.userId, ctx.userId)));
      if (!returnedGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared Game not found",
        });
      }
      if (input.type === "link") {
        const existingShare = await ctx.db.query.shareRequest.findFirst({
          where: and(
            eq(shareRequest.itemId, input.gameId),
            eq(shareRequest.itemType, "game"),
            eq(shareRequest.ownerId, ctx.userId),
            isNull(shareRequest.sharedWithId),
          ),
          orderBy: shareRequest.createdAt,
        });

        if (existingShare && existingShare.status === "rejected") {
          return { success: false, message: "This has already been rejected" };
        }
        if (
          existingShare &&
          existingShare.status === "pending" &&
          existingShare.expiresAt &&
          new Date() < existingShare.expiresAt
        ) {
          return {
            success: false,
            message: "There is already a pending share",
          };
        }
        if (existingShare && existingShare.status === "accepted") {
          return { success: false, message: "This has already been accepted" };
        }

        // Insert new share request
        const [newShare] = await ctx.db
          .insert(shareRequest)
          .values({
            ownerId: ctx.userId,
            sharedWithId: null,
            itemType: "game",
            itemId: input.gameId,
            permission: input.permission,
            expiresAt: input.expiresAt ?? null,
          })
          .returning();

        if (!newShare) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate share.",
          });
        }
        const shareMessages: {
          success: boolean;
          message: string;
        }[] = [];

        for (const matchToShare of input.sharedMatches) {
          const returnedMatch = await ctx.db.query.match.findFirst({
            where: and(
              eq(match.id, matchToShare.matchId),
              eq(match.userId, ctx.userId),
            ),
            with: {
              matchPlayers: {
                with: {
                  player: true,
                },
              },
            },
          });
          if (!returnedMatch) {
            shareMessages.push({
              success: false,
              message: `Match ${matchToShare.matchId} not found.`,
            });
            continue;
          }
          const existingSharedMatch = await ctx.db.query.shareRequest.findFirst(
            {
              where: and(
                eq(shareRequest.itemId, matchToShare.matchId),
                eq(shareRequest.itemType, "match"),
                eq(shareRequest.ownerId, ctx.userId),
                isNull(shareRequest.sharedWithId),
                or(
                  eq(shareRequest.status, "rejected"),
                  and(
                    eq(shareRequest.status, "pending"),
                    gt(shareRequest.expiresAt, new Date()),
                  ),
                  eq(shareRequest.status, "accepted"),
                ),
              ),
              orderBy: shareRequest.createdAt,
            },
          );
          //check if the match is already shared with the user or the previous share request has expired
          if (!existingSharedMatch) {
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "match",
              itemId: matchToShare.matchId,
              permission: matchToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });
          }
          if (matchToShare.includePlayers) {
            for (const matchPlayer of returnedMatch.matchPlayers) {
              const existingSharedMatchPlayer =
                await ctx.db.query.shareRequest.findFirst({
                  where: and(
                    eq(shareRequest.itemId, matchPlayer.player.id),
                    eq(shareRequest.itemType, "player"),
                    eq(shareRequest.ownerId, ctx.userId),
                    isNull(shareRequest.sharedWithId),
                    or(
                      eq(shareRequest.status, "rejected"),
                      and(
                        eq(shareRequest.status, "pending"),
                        gt(shareRequest.expiresAt, new Date()),
                      ),
                      eq(shareRequest.status, "accepted"),
                    ),
                  ),
                });
              if (!existingSharedMatchPlayer) {
                await ctx.db.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  sharedWithId: null,
                  itemType: "player",
                  itemId: matchPlayer.player.id,
                  permission: "view",
                  parentShareId: newShare.id,
                  expiresAt: input.expiresAt ?? null,
                });
              }
            }
          }
        }
        for (const scoresheetToShare of input.scoresheetsToShare) {
          const existingSharedScoresheet =
            await ctx.db.query.sharedScoresheet.findFirst({
              where: and(
                eq(shareRequest.itemId, scoresheetToShare.scoresheetId),
                eq(shareRequest.itemType, "scoresheet"),
                eq(shareRequest.ownerId, ctx.userId),
                isNull(shareRequest.sharedWithId),
                or(
                  eq(shareRequest.status, "rejected"),
                  and(
                    eq(shareRequest.status, "pending"),
                    gt(shareRequest.expiresAt, new Date()),
                  ),
                  eq(shareRequest.status, "accepted"),
                ),
              ),
              orderBy: shareRequest.createdAt,
            });
          if (!existingSharedScoresheet) {
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "scoresheet",
              itemId: scoresheetToShare.scoresheetId,
              permission: scoresheetToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });
          }
        }
        return {
          success: true,
          message: "Created share Link",
          shareableUrl: `/share/${newShare.token}`,
          shareMessages,
        };
      } else {
        const shareMessages: {
          success: boolean;
          message: string;
        }[] = [];
        for (const friendToShareTo of input.friends) {
          const recipientSettings =
            await ctx.db.query.userSharingPreference.findFirst({
              where: eq(userSharingPreference.userId, friendToShareTo.id),
            });

          if (recipientSettings?.allowSharing === "none") {
            shareMessages.push({
              success: false,
              message: `User ${recipientSettings.userId} does not allow sharing.`,
            });
            continue;
          }

          const existingShare = await ctx.db.query.shareRequest.findFirst({
            where: and(
              eq(shareRequest.itemId, input.gameId),
              eq(shareRequest.itemType, "game"),
              eq(shareRequest.ownerId, ctx.userId),
              eq(shareRequest.sharedWithId, friendToShareTo.id),
            ),
            orderBy: shareRequest.createdAt,
          });
          if (existingShare && existingShare.status === "rejected") {
            shareMessages.push({
              success: false,
              message: "This has already been rejected",
            });
            continue;
          }
          if (
            existingShare &&
            existingShare.status === "pending" &&
            existingShare.expiresAt &&
            new Date() < existingShare.expiresAt
          ) {
            shareMessages.push({
              success: false,
              message: "There is already a pending share",
            });
            continue;
          }
          if (existingShare && existingShare.status === "accepted") {
            shareMessages.push({
              success: false,
              message: "This has already been accepted",
            });
            continue;
          }
          const [newShare] = await ctx.db
            .insert(shareRequest)
            .values({
              ownerId: ctx.userId,
              sharedWithId: friendToShareTo.id,
              itemType: "game",
              itemId: input.gameId,
              permission: input.permission,
              expiresAt: input.expiresAt ?? null,
            })
            .returning();

          if (!newShare) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to generate share.",
            });
          }

          for (const matchToShare of input.sharedMatches) {
            const returnedMatch = await ctx.db.query.match.findFirst({
              where: and(
                eq(match.id, matchToShare.matchId),
                eq(match.userId, ctx.userId),
              ),
              with: {
                matchPlayers: {
                  with: {
                    player: true,
                  },
                },
              },
            });
            if (!returnedMatch) {
              shareMessages.push({
                success: false,
                message: `Match ${matchToShare.matchId} not found.`,
              });
              continue;
            }
            const existingSharedMatch =
              await ctx.db.query.shareRequest.findFirst({
                where: and(
                  eq(shareRequest.itemId, matchToShare.matchId),
                  eq(shareRequest.itemType, "match"),
                  eq(shareRequest.ownerId, ctx.userId),
                  eq(shareRequest.sharedWithId, friendToShareTo.id),
                  or(
                    eq(shareRequest.status, "rejected"),
                    and(
                      eq(shareRequest.status, "pending"),
                      gt(shareRequest.expiresAt, new Date()),
                    ),
                    eq(shareRequest.status, "accepted"),
                  ),
                ),
                orderBy: shareRequest.createdAt,
              });
            //check if the match is already shared with the user or the previous share request has expired
            if (!existingSharedMatch) {
              await ctx.db.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: friendToShareTo.id,
                itemType: "match",
                itemId: matchToShare.matchId,
                permission: matchToShare.permission,
                parentShareId: newShare.id,
                expiresAt: input.expiresAt ?? null,
              });
            }
            if (matchToShare.includePlayers) {
              for (const matchPlayer of returnedMatch.matchPlayers) {
                const existingSharedMatchPlayer =
                  await ctx.db.query.shareRequest.findFirst({
                    where: and(
                      eq(shareRequest.itemId, matchPlayer.player.id),
                      eq(shareRequest.itemType, "player"),
                      eq(shareRequest.ownerId, ctx.userId),
                      eq(shareRequest.sharedWithId, friendToShareTo.id),
                      or(
                        eq(shareRequest.status, "rejected"),
                        and(
                          eq(shareRequest.status, "pending"),
                          gt(shareRequest.expiresAt, new Date()),
                        ),
                        eq(shareRequest.status, "accepted"),
                      ),
                    ),
                  });
                if (!existingSharedMatchPlayer) {
                  await ctx.db.insert(shareRequest).values({
                    ownerId: ctx.userId,
                    sharedWithId: friendToShareTo.id,
                    itemType: "player",
                    itemId: matchPlayer.player.id,
                    permission: "view",
                    parentShareId: newShare.id,
                    expiresAt: input.expiresAt ?? null,
                  });
                }
              }
            }
          }
          for (const scoresheetToShare of input.scoresheetsToShare) {
            const existingSharedScoresheet =
              await ctx.db.query.sharedScoresheet.findFirst({
                where: and(
                  eq(shareRequest.itemId, scoresheetToShare.scoresheetId),
                  eq(shareRequest.itemType, "scoresheet"),
                  eq(shareRequest.ownerId, ctx.userId),
                  eq(shareRequest.sharedWithId, friendToShareTo.id),
                  or(
                    eq(shareRequest.status, "rejected"),
                    and(
                      eq(shareRequest.status, "pending"),
                      gt(shareRequest.expiresAt, new Date()),
                    ),
                    eq(shareRequest.status, "accepted"),
                  ),
                ),
                orderBy: shareRequest.createdAt,
              });
            if (!existingSharedScoresheet) {
              await ctx.db.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: friendToShareTo.id,
                itemType: "scoresheet",
                itemId: scoresheetToShare.scoresheetId,
                permission: scoresheetToShare.permission,
                parentShareId: newShare.id,
                expiresAt: input.expiresAt ?? null,
              });
            }
          }
          shareMessages.push({
            success: true,
            message: `Shared ${returnedGame.name} with ${friendToShareTo.id}`,
          });
        }
        return {
          success: shareMessages.filter((m) => m.success).length > 0,
          message: `Shared ${returnedGame.name} with ${shareMessages.filter((m) => m.success).length} friends / ${shareMessages.length} friends`,
          shareMessages,
        };
      }
    }),
  requestShareMatch: protectedUserProcedure
    .input(
      z
        .object({
          matchId: z.number(),
          permission: z.enum(["view", "edit"]),
          expiresAt: z.date().optional(),
          includePlayers: z.boolean(),
        })
        .and(
          z.discriminatedUnion("type", [
            z.object({
              type: z.literal("link"),
            }),
            z.object({
              type: z.literal("friends"),
              friends: z
                .array(
                  z.object({
                    id: z.number(),
                  }),
                )
                .min(1),
            }),
          ]),
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const returnedMatch = await ctx.db.query.match.findFirst({
        where: and(eq(match.id, input.matchId), eq(match.userId, ctx.userId)),
        with: {
          matchPlayers: {
            with: {
              player: true,
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared Match not found",
        });
      }
      if (input.type === "link") {
        const existingShare = await ctx.db.query.shareRequest.findFirst({
          where: and(
            eq(shareRequest.itemId, input.matchId),
            eq(shareRequest.itemType, "match"),
            eq(shareRequest.ownerId, ctx.userId),
            isNull(shareRequest.sharedWithId),
          ),
          orderBy: shareRequest.createdAt,
        });

        if (existingShare && existingShare.status === "rejected") {
          return { success: false, message: "This has already been rejected" };
        }
        if (
          existingShare &&
          existingShare.status === "pending" &&
          existingShare.expiresAt &&
          new Date() < existingShare.expiresAt
        ) {
          return {
            success: false,
            message: "There is already a pending share",
          };
        }
        if (existingShare && existingShare.status === "accepted") {
          return { success: false, message: "This has already been accepted" };
        }

        // Insert new share request
        const [newShare] = await ctx.db
          .insert(shareRequest)
          .values({
            ownerId: ctx.userId,
            sharedWithId: null,
            itemType: "match",
            itemId: input.matchId,
            permission: input.permission,
            expiresAt: input.expiresAt ?? null,
          })
          .returning();

        if (!newShare) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate share.",
          });
        }
        await ctx.db.insert(shareRequest).values({
          ownerId: ctx.userId,
          sharedWithId: null,
          itemType: "game",
          itemId: returnedMatch.gameId,
          permission: input.permission,
          expiresAt: input.expiresAt ?? null,
          parentShareId: newShare.id,
        });
        if (input.includePlayers) {
          for (const matchPlayer of returnedMatch.matchPlayers) {
            const existingSharedMatchPlayer =
              await ctx.db.query.shareRequest.findFirst({
                where: and(
                  eq(shareRequest.itemId, matchPlayer.player.id),
                  eq(shareRequest.itemType, "player"),
                  eq(shareRequest.ownerId, ctx.userId),
                  isNull(shareRequest.sharedWithId),
                  or(
                    eq(shareRequest.status, "rejected"),
                    and(
                      eq(shareRequest.status, "pending"),
                      gt(shareRequest.expiresAt, new Date()),
                    ),
                    eq(shareRequest.status, "accepted"),
                  ),
                ),
              });
            if (!existingSharedMatchPlayer) {
              await ctx.db.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: ctx.userId,
                itemType: "player",
                itemId: matchPlayer.player.id,
                permission: "view",
                parentShareId: newShare.id,
                expiresAt: input.expiresAt ?? null,
              });
            }
          }
        }
        return {
          success: true,
          message: "Created share Link",
          shareableUrl: `/share/${newShare.token}`,
        };
      } else {
        const shareMessages: {
          success: boolean;
          message: string;
        }[] = [];
        for (const friendToShareTo of input.friends) {
          const recipientSettings =
            await ctx.db.query.userSharingPreference.findFirst({
              where: eq(userSharingPreference.userId, friendToShareTo.id),
            });

          if (recipientSettings?.allowSharing === "none") {
            shareMessages.push({
              success: false,
              message: `User ${recipientSettings.userId} does not allow sharing.`,
            });
            continue;
          }
          const existingShare = await ctx.db.query.shareRequest.findFirst({
            where: and(
              eq(shareRequest.itemId, input.matchId),
              eq(shareRequest.itemType, "match"),
              eq(shareRequest.ownerId, ctx.userId),
              eq(shareRequest.sharedWithId, friendToShareTo.id),
            ),
            orderBy: shareRequest.createdAt,
          });
          if (existingShare && existingShare.status === "rejected") {
            shareMessages.push({
              success: false,
              message: "This has already been rejected",
            });
            continue;
          }
          if (
            existingShare &&
            existingShare.status === "pending" &&
            existingShare.expiresAt &&
            new Date() < existingShare.expiresAt
          ) {
            shareMessages.push({
              success: false,
              message: "There is already a pending share",
            });
            continue;
          }
          if (existingShare && existingShare.status === "accepted") {
            shareMessages.push({
              success: false,
              message: "This has already been accepted",
            });
            continue;
          }
          const [newShare] = await ctx.db
            .insert(shareRequest)
            .values({
              ownerId: ctx.userId,
              sharedWithId: friendToShareTo.id,
              itemType: "match",
              itemId: input.matchId,
              permission: input.permission,
              expiresAt: input.expiresAt ?? null,
            })
            .returning();
          if (!newShare) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to generate share.",
            });
          }
          await ctx.db.insert(shareRequest).values({
            ownerId: ctx.userId,
            sharedWithId: friendToShareTo.id,
            itemType: "game",
            itemId: returnedMatch.gameId,
            permission: input.permission,
            expiresAt: input.expiresAt ?? null,
            parentShareId: newShare.id,
          });
          if (input.includePlayers) {
            for (const matchPlayer of returnedMatch.matchPlayers) {
              const existingSharedMatchPlayer =
                await ctx.db.query.shareRequest.findFirst({
                  where: and(
                    eq(shareRequest.itemId, matchPlayer.player.id),
                    eq(shareRequest.itemType, "player"),
                    eq(shareRequest.ownerId, ctx.userId),
                    isNull(shareRequest.sharedWithId),
                    or(
                      eq(shareRequest.status, "rejected"),
                      and(
                        eq(shareRequest.status, "pending"),
                        gt(shareRequest.expiresAt, new Date()),
                      ),
                      eq(shareRequest.status, "accepted"),
                    ),
                  ),
                });
              if (!existingSharedMatchPlayer) {
                await ctx.db.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  sharedWithId: ctx.userId,
                  itemType: "player",
                  itemId: matchPlayer.player.id,
                  permission: "view",
                  parentShareId: newShare.id,
                  expiresAt: input.expiresAt ?? null,
                });
              }
            }
          }
          shareMessages.push({
            success: true,
            message: `Shared ${returnedMatch.name} with ${friendToShareTo.id}`,
          });
        }
        return {
          success: shareMessages.filter((m) => m.success).length > 0,
          message: `Shared ${returnedMatch.name} with ${shareMessages.filter((m) => m.success).length} friends / ${shareMessages.length} friends`,
          shareMessages,
        };
      }
    }),
  requestSharePlayer: protectedUserProcedure
    .input(
      z
        .object({
          playerId: z.number(),
          permission: z.enum(["view", "edit"]),
          expiresAt: z.date().optional(),
          sharedMatches: z.array(
            z.object({
              matchId: z.number(),
              permission: z.enum(["view", "edit"]),
              includePlayers: z.boolean(),
            }),
          ),
        })
        .and(
          z.discriminatedUnion("type", [
            z.object({
              type: z.literal("link"),
            }),
            z.object({
              type: z.literal("friends"),
              friends: z
                .array(
                  z.object({
                    id: z.number(),
                  }),
                )
                .min(1),
            }),
          ]),
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const returnedPlayer = await ctx.db.query.player.findFirst({
        where: and(
          eq(player.id, input.playerId),
          eq(player.createdBy, ctx.userId),
        ),
      });

      if (!returnedPlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared Player not found",
        });
      }
      if (input.type === "link") {
        const existingShare = await ctx.db.query.shareRequest.findFirst({
          where: and(
            eq(shareRequest.itemId, input.playerId),
            eq(shareRequest.itemType, "player"),
            eq(shareRequest.ownerId, ctx.userId),
            isNull(shareRequest.sharedWithId),
          ),
          orderBy: shareRequest.createdAt,
        });

        if (existingShare && existingShare.status === "rejected") {
          return { success: false, message: "This has already been rejected" };
        }
        if (
          existingShare &&
          existingShare.status === "pending" &&
          existingShare.expiresAt &&
          new Date() < existingShare.expiresAt
        ) {
          return {
            success: false,
            message: "There is already a pending share",
          };
        }
        if (existingShare && existingShare.status === "accepted") {
          return { success: false, message: "This has already been accepted" };
        }

        // Insert new share request
        const [newShare] = await ctx.db
          .insert(shareRequest)
          .values({
            ownerId: ctx.userId,
            sharedWithId: null,
            itemType: "player",
            itemId: input.playerId,
            permission: input.permission,
            expiresAt: input.expiresAt ?? null,
          })
          .returning();

        if (!newShare) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate share.",
          });
        }
        const shareMessages: {
          success: boolean;
          message: string;
        }[] = [];
        for (const matchToShare of input.sharedMatches) {
          const returnedMatch = await ctx.db.query.match.findFirst({
            where: and(
              eq(match.id, matchToShare.matchId),
              eq(match.userId, ctx.userId),
            ),
            with: {
              matchPlayers: {
                with: {
                  player: true,
                },
              },
            },
          });
          if (!returnedMatch) {
            shareMessages.push({
              success: false,
              message: `Match ${matchToShare.matchId} not found.`,
            });
            continue;
          }
          const existingSharedMatch = await ctx.db.query.shareRequest.findFirst(
            {
              where: and(
                eq(shareRequest.itemId, matchToShare.matchId),
                eq(shareRequest.itemType, "match"),
                eq(shareRequest.ownerId, ctx.userId),
                isNull(shareRequest.sharedWithId),
                or(
                  eq(shareRequest.status, "rejected"),
                  and(
                    eq(shareRequest.status, "pending"),
                    gt(shareRequest.expiresAt, new Date()),
                  ),
                  eq(shareRequest.status, "accepted"),
                ),
              ),
              orderBy: shareRequest.createdAt,
            },
          );
          //check if the match is already shared with the user or the previous share request has expired
          if (!existingSharedMatch) {
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "match",
              itemId: matchToShare.matchId,
              permission: matchToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });
          }
          const existingSharedGame = await ctx.db.query.sharedGame.findFirst({
            where: and(
              eq(shareRequest.itemId, returnedMatch.gameId),
              eq(shareRequest.itemType, "game"),
              eq(shareRequest.ownerId, ctx.userId),
              isNull(shareRequest.sharedWithId),
              or(
                eq(shareRequest.status, "rejected"),
                and(
                  eq(shareRequest.status, "pending"),
                  gt(shareRequest.expiresAt, new Date()),
                ),
                eq(shareRequest.status, "accepted"),
              ),
            ),
            orderBy: shareRequest.createdAt,
          });
          if (!existingSharedGame) {
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "game",
              itemId: returnedMatch.gameId,
              permission: matchToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });
          }
          if (matchToShare.includePlayers) {
            for (const matchPlayer of returnedMatch.matchPlayers) {
              const existingSharedMatchPlayer =
                await ctx.db.query.shareRequest.findFirst({
                  where: and(
                    eq(shareRequest.itemId, matchPlayer.player.id),
                    eq(shareRequest.itemType, "player"),
                    eq(shareRequest.ownerId, ctx.userId),
                    isNull(shareRequest.sharedWithId),
                    or(
                      eq(shareRequest.status, "rejected"),
                      and(
                        eq(shareRequest.status, "pending"),
                        gt(shareRequest.expiresAt, new Date()),
                      ),
                      eq(shareRequest.status, "accepted"),
                    ),
                  ),
                });
              if (!existingSharedMatchPlayer) {
                await ctx.db.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  sharedWithId: null,
                  itemType: "player",
                  itemId: matchPlayer.player.id,
                  permission: "view",
                  parentShareId: newShare.id,
                  expiresAt: input.expiresAt ?? null,
                });
              }
            }
          }
        }
        return {
          success: true,
          message: "Created share Link",
          shareMessages,
          shareableUrl: `/share/${newShare.token}`,
        };
      } else {
        const shareMessages: {
          success: boolean;
          message: string;
        }[] = [];
        for (const friendToShareTo of input.friends) {
          const recipientSettings =
            await ctx.db.query.userSharingPreference.findFirst({
              where: eq(userSharingPreference.userId, friendToShareTo.id),
            });

          if (recipientSettings?.allowSharing === "none") {
            shareMessages.push({
              success: false,
              message: `User ${recipientSettings.userId} does not allow sharing.`,
            });
            continue;
          }
          const existingShare = await ctx.db.query.shareRequest.findFirst({
            where: and(
              eq(shareRequest.itemId, input.playerId),
              eq(shareRequest.itemType, "player"),
              eq(shareRequest.ownerId, ctx.userId),
              eq(shareRequest.sharedWithId, friendToShareTo.id),
            ),
            orderBy: shareRequest.createdAt,
          });
          if (existingShare && existingShare.status === "rejected") {
            shareMessages.push({
              success: false,
              message: "This has already been rejected",
            });
            continue;
          }
          if (
            existingShare &&
            existingShare.status === "pending" &&
            existingShare.expiresAt &&
            new Date() < existingShare.expiresAt
          ) {
            shareMessages.push({
              success: false,
              message: "There is already a pending share",
            });
            continue;
          }
          if (existingShare && existingShare.status === "accepted") {
            shareMessages.push({
              success: false,
              message: "This has already been accepted",
            });
            continue;
          }
          const [newShare] = await ctx.db
            .insert(shareRequest)
            .values({
              ownerId: ctx.userId,
              sharedWithId: friendToShareTo.id,
              itemType: "player",
              itemId: input.playerId,
              permission: input.permission,
              expiresAt: input.expiresAt ?? null,
            })
            .returning();
          if (!newShare) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to generate share.",
            });
          }
          for (const matchToShare of input.sharedMatches) {
            const returnedMatch = await ctx.db.query.match.findFirst({
              where: and(
                eq(match.id, matchToShare.matchId),
                eq(match.userId, ctx.userId),
              ),
              with: {
                matchPlayers: {
                  with: {
                    player: true,
                  },
                },
              },
            });
            if (!returnedMatch) {
              shareMessages.push({
                success: false,
                message: `Match ${matchToShare.matchId} not found.`,
              });
              continue;
            }
            const existingSharedMatch =
              await ctx.db.query.shareRequest.findFirst({
                where: and(
                  eq(shareRequest.itemId, matchToShare.matchId),
                  eq(shareRequest.itemType, "match"),
                  eq(shareRequest.ownerId, ctx.userId),
                  eq(shareRequest.sharedWithId, friendToShareTo.id),
                  or(
                    eq(shareRequest.status, "rejected"),
                    and(
                      eq(shareRequest.status, "pending"),
                      gt(shareRequest.expiresAt, new Date()),
                    ),
                    eq(shareRequest.status, "accepted"),
                  ),
                ),
                orderBy: shareRequest.createdAt,
              });
            //check if the match is already shared with the user or the previous share request has expired
            if (!existingSharedMatch) {
              await ctx.db.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: friendToShareTo.id,
                itemType: "match",
                itemId: matchToShare.matchId,
                permission: matchToShare.permission,
                parentShareId: newShare.id,
                expiresAt: input.expiresAt ?? null,
              });
            }
            const existingSharedGame = await ctx.db.query.sharedGame.findFirst({
              where: and(
                eq(shareRequest.itemId, returnedMatch.gameId),
                eq(shareRequest.itemType, "game"),
                eq(shareRequest.ownerId, ctx.userId),
                eq(shareRequest.sharedWithId, friendToShareTo.id),
                or(
                  eq(shareRequest.status, "rejected"),
                  and(
                    eq(shareRequest.status, "pending"),
                    gt(shareRequest.expiresAt, new Date()),
                  ),
                  eq(shareRequest.status, "accepted"),
                ),
              ),
              orderBy: shareRequest.createdAt,
            });
            if (!existingSharedGame) {
              await ctx.db.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: friendToShareTo.id,
                itemType: "game",
                itemId: returnedMatch.gameId,
                permission: matchToShare.permission,
                parentShareId: newShare.id,
                expiresAt: input.expiresAt ?? null,
              });
            }
            if (matchToShare.includePlayers) {
              for (const matchPlayer of returnedMatch.matchPlayers) {
                const existingSharedMatchPlayer =
                  await ctx.db.query.shareRequest.findFirst({
                    where: and(
                      eq(shareRequest.itemId, matchPlayer.player.id),
                      eq(shareRequest.itemType, "player"),
                      eq(shareRequest.ownerId, ctx.userId),
                      eq(shareRequest.sharedWithId, friendToShareTo.id),
                      or(
                        eq(shareRequest.status, "rejected"),
                        and(
                          eq(shareRequest.status, "pending"),
                          gt(shareRequest.expiresAt, new Date()),
                        ),
                        eq(shareRequest.status, "accepted"),
                      ),
                    ),
                  });
                if (!existingSharedMatchPlayer) {
                  await ctx.db.insert(shareRequest).values({
                    ownerId: ctx.userId,
                    sharedWithId: friendToShareTo.id,
                    itemType: "player",
                    itemId: matchPlayer.player.id,
                    permission: "view",
                    parentShareId: newShare.id,
                    expiresAt: input.expiresAt ?? null,
                  });
                }
              }
            }
          }
          shareMessages.push({
            success: true,
            message: `Shared ${returnedPlayer.name} with ${friendToShareTo.id}`,
          });
        }
        return {
          success: shareMessages.filter((m) => m.success).length > 0,
          message: `Shared ${returnedPlayer.name} with ${shareMessages.filter((m) => m.success).length} friends / ${shareMessages.length} friends`,
          shareMessages,
        };
      }
    }),
  respondToShareRequest: protectedUserProcedure
    .input(
      z.object({
        requestId: z.number(),
        accept: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the share request
      const existingRequest = await ctx.db.query.shareRequest.findFirst({
        where: and(
          eq(shareRequest.id, input.requestId),
          eq(shareRequest.sharedWithId, ctx.userId),
        ),
        with: {
          childShareRequests: true,
        },
      });

      if (!existingRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share request not found.",
        });
      }

      // Update status
      await ctx.db
        .update(shareRequest)
        .set({ status: input.accept ? "accepted" : "rejected" })
        .where(eq(shareRequest.id, input.requestId));
      for (const childShareRequest of existingRequest.childShareRequests) {
        await ctx.db
          .update(shareRequest)
          .set({ status: input.accept ? "accepted" : "rejected" })
          .where(eq(shareRequest.id, childShareRequest.id));
      }
      if (input.accept) {
        if (existingRequest.itemType === "match") {
          const [returnedMatch] = await ctx.db
            .select()
            .from(match)
            .where(
              and(
                eq(match.id, existingRequest.itemId),
                eq(match.userId, existingRequest.ownerId),
              ),
            );
          if (!returnedMatch) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Match not found.",
            });
          }
          const childGameShareRequest = existingRequest.childShareRequests.find(
            (childShareRequest) =>
              childShareRequest.itemType === "game" &&
              childShareRequest.itemId === returnedMatch.gameId,
          );
          if (childGameShareRequest) {
            const [returnedSharedGame] = await ctx.db
              .insert(sharedGame)
              .values({
                ownerId: childGameShareRequest.ownerId,
                sharedWithId: ctx.userId,
                gameId: childGameShareRequest.itemId,
                permission: childGameShareRequest.permission,
              })
              .returning();
            if (!returnedSharedGame) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Game not created successfully",
              });
            }
            await ctx.db.insert(sharedMatch).values({
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              matchId: existingRequest.itemId,
              sharedGameId: returnedSharedGame.id,
              permission: existingRequest.permission,
            });
          } else {
            const returnedSharedGame = await ctx.db.query.sharedGame.findFirst({
              where: and(
                eq(sharedGame.ownerId, existingRequest.ownerId),
                eq(sharedGame.sharedWithId, ctx.userId),
                eq(sharedGame.gameId, returnedMatch.gameId),
              ),
            });
            if (!returnedSharedGame) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Game not found",
              });
            }
            await ctx.db.insert(sharedMatch).values({
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              matchId: existingRequest.itemId,
              sharedGameId: returnedSharedGame.gameId,
              permission: existingRequest.permission,
            });
          }
        }
        if (existingRequest.itemType === "game") {
          const [returnedSharedGame] = await ctx.db
            .insert(sharedGame)
            .values({
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              gameId: existingRequest.itemId,
              permission: existingRequest.permission,
            })
            .returning();
          if (!returnedSharedGame) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared Game not created successfully",
            });
          }
          for (const childShareRequest of existingRequest.childShareRequests) {
            if (childShareRequest.itemType === "scoresheet") {
              await ctx.db.insert(sharedScoresheet).values({
                ownerId: childShareRequest.ownerId,
                sharedWithId: ctx.userId,
                scoresheetId: childShareRequest.itemId,
                permission: childShareRequest.permission,
                sharedGameId: returnedSharedGame.id,
              });
            }
            if (childShareRequest.itemType === "match") {
              await ctx.db.insert(sharedMatch).values({
                ownerId: childShareRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: childShareRequest.itemId,
                sharedGameId: returnedSharedGame.id,
                permission: childShareRequest.permission,
              });
            }
          }
        }
        if (existingRequest.itemType === "player") {
          await ctx.db.insert(sharedPlayer).values({
            ownerId: existingRequest.ownerId,
            sharedWithId: ctx.userId,
            playerId: existingRequest.itemId,
            permission: existingRequest.permission,
          });
          const childGameShareRequests =
            existingRequest.childShareRequests.filter(
              (childShareRequest) => childShareRequest.itemType === "game",
            );
          const childMatchShareRequests =
            existingRequest.childShareRequests.filter(
              (childShareRequest) => childShareRequest.itemType === "match",
            );
          for (const childShareRequest of childGameShareRequests) {
            await ctx.db.insert(sharedGame).values({
              ownerId: childShareRequest.ownerId,
              sharedWithId: ctx.userId,
              gameId: childShareRequest.itemId,
              permission: childShareRequest.permission,
            });
          }
          for (const childShareRequest of childMatchShareRequests) {
            const returnedMatch = await ctx.db.query.match.findFirst({
              where: and(
                eq(match.id, childShareRequest.itemId),
                eq(match.userId, childShareRequest.ownerId),
              ),
            });
            if (!returnedMatch) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Match not found.",
              });
            }
            const returnedSharedGame = await ctx.db.query.sharedGame.findFirst({
              where: and(
                eq(sharedGame.ownerId, childShareRequest.ownerId),
                eq(sharedGame.sharedWithId, ctx.userId),
                eq(sharedGame.gameId, returnedMatch.gameId),
              ),
            });
            if (!returnedSharedGame) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Game not found",
              });
            }
            await ctx.db.insert(sharedMatch).values({
              ownerId: childShareRequest.ownerId,
              sharedWithId: ctx.userId,
              matchId: childShareRequest.itemId,
              sharedGameId: returnedSharedGame.id,
              permission: childShareRequest.permission,
            });
          }
        }
        if (existingRequest.itemType === "scoresheet") {
          const [returnedScoresheet] = await ctx.db
            .select()
            .from(scoresheet)
            .where(
              and(
                eq(scoresheet.id, existingRequest.itemId),
                eq(scoresheet.userId, existingRequest.ownerId),
              ),
            );
          if (!returnedScoresheet) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Scoresheet not found.",
            });
          }
          const [returnedSharedGame] = await ctx.db
            .select()
            .from(sharedGame)
            .where(
              and(
                eq(sharedGame.gameId, returnedScoresheet.gameId),
                eq(sharedGame.sharedWithId, ctx.userId),
              ),
            );
          if (!returnedSharedGame) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shared Game not found",
            });
          }
          await ctx.db.insert(sharedScoresheet).values({
            ownerId: existingRequest.ownerId,
            sharedWithId: ctx.userId,
            scoresheetId: existingRequest.itemId,
            permission: existingRequest.permission,
            sharedGameId: returnedSharedGame.id,
          });
        }
      }

      return {
        success: true,
        message: input.accept
          ? "You have accepted the share request."
          : "You have rejected the share request.",
      };
    }),

  getSharedItemByToken: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sharedItem = await ctx.db.query.shareRequest.findFirst({
        where: eq(shareRequest.token, input.token),
        with: {
          childShareRequests: true,
        },
      });

      if (!sharedItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared item not found.",
        });
      }

      // Check expiration
      if (sharedItem.expiresAt && new Date() > sharedItem.expiresAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This link has expired.",
        });
      }

      // Fetch item
      let content;
      if (sharedItem.itemType === "game") {
        content = await ctx.db.query.game.findFirst({
          where: eq(game.id, sharedItem.itemId),
        });
      } else if (sharedItem.itemType === "match") {
        content = await ctx.db.query.match.findFirst({
          where: eq(match.id, sharedItem.itemId),
        });
      } else {
        content = await ctx.db.query.player.findFirst({
          where: eq(player.id, sharedItem.itemId),
        });
      }

      if (!content) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found.",
        });
      }
      const childItems: (
        | {
            itemType: "game";
            item: z.infer<typeof selectGameSchema>;
            permission: "view" | "edit";
          }
        | {
            itemType: "match";
            item: z.infer<typeof selectMatchSchema>;
            permission: "view" | "edit";
          }
        | {
            itemType: "scoresheet";
            item: z.infer<typeof selectScoreSheetSchema>;
            permission: "view" | "edit";
          }
      )[] = [];
      if (sharedItem.childShareRequests.length > 0) {
        for (const childShareRequest of sharedItem.childShareRequests) {
          if (childShareRequest.itemType === "game") {
            const [returnGame] = await ctx.db
              .select()
              .from(game)
              .where(
                and(
                  eq(game.id, childShareRequest.itemId),
                  eq(game.userId, childShareRequest.ownerId),
                ),
              );
            if (!returnGame) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Game not found",
              });
            }
            childItems.push({
              itemType: "game",
              item: returnGame,
              permission: childShareRequest.permission,
            });
          }
          if (childShareRequest.itemType === "match") {
            const [returnedMatch] = await ctx.db
              .select()
              .from(match)
              .where(
                and(
                  eq(match.id, childShareRequest.itemId),
                  eq(match.userId, sharedItem.ownerId),
                ),
              );
            if (!returnedMatch) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Match not found",
              });
            }
            childItems.push({
              itemType: "match",
              item: returnedMatch,
              permission: childShareRequest.permission,
            });
          }
          if (childShareRequest.itemType === "scoresheet") {
            const [returnedScoresheet] = await ctx.db
              .select()
              .from(scoresheet)
              .where(
                and(
                  eq(scoresheet.id, childShareRequest.itemId),
                  eq(scoresheet.userId, sharedItem.ownerId),
                ),
              );
            if (!returnedScoresheet) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Scoresheet not found",
              });
            }
            childItems.push({
              itemType: "scoresheet",
              item: returnedScoresheet,
              permission: childShareRequest.permission,
            });
          }
        }
      }

      return {
        success: true,
        itemType: sharedItem.itemType,
        item: content,
        childItems: childItems,
        permission: sharedItem.permission,
      };
    }),
  getIncomingShareRequests: protectedUserProcedure.query(async ({ ctx }) => {
    const sharedItems = await ctx.db.query.shareRequest.findMany({
      where: and(
        eq(shareRequest.sharedWithId, ctx.userId),
        isNull(shareRequest.parentShareId),
      ),
      with: {
        childShareRequests: true,
      },
      orderBy: shareRequest.createdAt,
    });

    return sharedItems;
  }),
  getOutgoingShareRequests: protectedUserProcedure.query(async ({ ctx }) => {
    const sharedItems = await ctx.db.query.shareRequest.findMany({
      where: and(
        eq(shareRequest.ownerId, ctx.userId),
        isNull(shareRequest.parentShareId),
      ),
      with: {
        childShareRequests: true,
      },
      orderBy: shareRequest.createdAt,
    });

    return sharedItems;
  }),
  linkSharedPlayer: protectedUserProcedure
    .input(
      z.object({
        sharedPlayerId: z.number(),
        linkedPlayerId: z.number().nullable(), // Can be unlinked
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the shared player exists
      const sharedPlayerEntry = await ctx.db.query.sharedPlayer.findFirst({
        where: eq(sharedPlayer.id, input.sharedPlayerId),
      });

      if (!sharedPlayerEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared player not found.",
        });
      }

      // Ensure the user owns the player they're linking to
      if (input.linkedPlayerId) {
        const playerEntry = await ctx.db.query.player.findFirst({
          where: and(
            eq(player.id, input.linkedPlayerId),
            eq(player.createdBy, ctx.userId),
          ),
        });

        if (!playerEntry) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not own this player.",
          });
        }
      }

      // Update shared player with linked player
      await ctx.db
        .update(sharedPlayer)
        .set({ linkedPlayerId: input.linkedPlayerId })
        .where(eq(sharedPlayer.id, input.sharedPlayerId));
      if (input.linkedPlayerId === null) {
        return {
          success: true,
          message: "Shared player unlinked successfully.",
        };
      }
      return { success: true, message: "Shared player linked successfully." };
    }),
  linkSharedGame: protectedUserProcedure
    .input(
      z.object({
        sharedGameId: z.number(),
        linkedGameId: z.number().nullable(), // Allow unlinking
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sharedGameEntry = await ctx.db.query.sharedGame.findFirst({
        where: eq(sharedGame.id, input.sharedGameId),
      });

      if (!sharedGameEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared game not found.",
        });
      }

      if (input.linkedGameId) {
        const gameEntry = await ctx.db.query.game.findFirst({
          where: and(
            eq(game.id, input.linkedGameId),
            eq(game.userId, ctx.userId),
          ),
        });

        if (!gameEntry) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not own this game.",
          });
        }
      }

      await ctx.db
        .update(sharedGame)
        .set({ linkedGameId: input.linkedGameId })
        .where(eq(sharedGame.id, input.sharedGameId));

      return {
        success: true,
        message: input.linkedGameId
          ? "Shared game linked successfully."
          : "Shared game unlinked successfully.",
      };
    }),
});
