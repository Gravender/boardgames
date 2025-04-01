import { TRPCError } from "@trpc/server";
import { and, eq, gt, lt, sql } from "drizzle-orm";
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
  requestShare: protectedUserProcedure
    .input(
      z
        .object({
          itemId: z.number(),
          expiresAt: z.date().optional(),
          permission: z.enum(["view", "edit"]),
        })
        .and(
          z.discriminatedUnion("itemType", [
            z.object({
              itemType: z.literal("match"),
              sharedWithId: z.number().optional(),
              sharedGame: z.object({
                gameId: z.number(),
                permission: z.enum(["view", "edit"]),
              }),
            }),
            z.object({
              itemType: z.literal("game"),
              sharedWithId: z.number().optional(),
              sharedMatches: z.array(
                z.object({
                  matchId: z.number(),
                  permission: z.enum(["view", "edit"]),
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
            }),
            z.object({
              itemType: z.literal("player"),
              sharedWithId: z.number().optional(),
              sharedMatches: z.array(
                z.object({
                  matchId: z.number(),
                  permission: z.enum(["view", "edit"]),
                  sharedGame: z.object({
                    gameId: z.number(),
                    permission: z.enum(["view", "edit"]),
                  }),
                }),
              ),
            }),
            z.object({
              itemType: z.literal("scoresheet"),
              sharedWithId: z.number(),
            }),
          ]),
        ),
    )
    .mutation(async ({ ctx, input }) => {
      // Check user preferences before inserting a share request
      if (input.sharedWithId) {
        const recipientSettings =
          await ctx.db.query.userSharingPreference.findFirst({
            where: eq(userSharingPreference.userId, input.sharedWithId),
          });

        if (recipientSettings?.allowSharing === "none") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User does not allow sharing.",
          });
        }
      }
      if (input.itemType === "match") {
        const [returnedMatch] = await ctx.db
          .select()
          .from(match)
          .where(and(eq(match.id, input.itemId), eq(match.userId, ctx.userId)));
        if (!returnedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared Match not found",
          });
        }
      }
      if (input.itemType === "game") {
        const [returnedGame] = await ctx.db
          .select()
          .from(game)
          .where(and(eq(game.id, input.itemId), eq(game.userId, ctx.userId)));
        if (!returnedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared Game not found",
          });
        }
      }
      if (input.itemType === "player") {
        const [returnedPlayer] = await ctx.db
          .select()
          .from(player)
          .where(
            and(eq(player.id, input.itemId), eq(player.createdBy, ctx.userId)),
          );
        if (!returnedPlayer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared Player not found",
          });
        }
      }
      if (input.itemType === "scoresheet") {
        const [returnedScoresheet] = await ctx.db
          .select()
          .from(scoresheet)
          .where(
            and(
              eq(scoresheet.id, input.itemId),
              eq(scoresheet.userId, ctx.userId),
            ),
          );
        if (!returnedScoresheet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared Scoresheet not found",
          });
        }
        const [returnedSharedGame] = await ctx.db
          .select()
          .from(sharedGame)
          .where(
            and(
              eq(sharedGame.gameId, returnedScoresheet.gameId),
              eq(sharedGame.ownerId, ctx.userId),
              eq(sharedGame.sharedWithId, input.sharedWithId),
            ),
          );
        if (!returnedSharedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared Game not found",
          });
        }
      }
      const existingShare = await ctx.db.query.shareRequest.findFirst({
        where: and(
          eq(shareRequest.itemId, input.itemId),
          eq(shareRequest.itemType, input.itemType),
          eq(shareRequest.ownerId, ctx.userId),
          input.sharedWithId
            ? eq(shareRequest.sharedWithId, input.sharedWithId)
            : sql`1=1`,
          and(
            eq(shareRequest.status, "pending"),
            lt(shareRequest.expiresAt, new Date()),
          ),
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
        return { success: false, message: "There is already a pending share" };
      }

      // Insert new share request
      const [newShare] = await ctx.db
        .insert(shareRequest)
        .values({
          ownerId: ctx.userId,
          sharedWithId: input.sharedWithId ?? null, // If null, it's a public link
          itemType: input.itemType,
          itemId: input.itemId,
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

      if (input.itemType === "game") {
        for (const matchToShare of input.sharedMatches) {
          const existingSharedMatch = await ctx.db.query.shareRequest.findFirst(
            {
              where: and(
                eq(shareRequest.itemId, matchToShare.matchId),
                eq(shareRequest.itemType, "match"),
                eq(shareRequest.ownerId, ctx.userId),
                input.sharedWithId
                  ? eq(shareRequest.sharedWithId, input.sharedWithId)
                  : sql`1=1`,
                and(
                  eq(shareRequest.status, "pending"),
                  gt(shareRequest.expiresAt, new Date()),
                ),
              ),
              orderBy: shareRequest.createdAt,
            },
          );
          //check if the match is already shared with the user or the previous share request has expired
          if (!existingSharedMatch) {
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: input.sharedWithId ?? null,
              itemType: "match",
              itemId: matchToShare.matchId,
              permission: matchToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });
          }
        }
        for (const scoresheetToShare of input.scoresheetsToShare) {
          const existingSharedScoresheet =
            await ctx.db.query.sharedScoresheet.findFirst({
              where: and(
                eq(shareRequest.itemId, scoresheetToShare.scoresheetId),
                eq(shareRequest.itemType, "scoresheet"),
                eq(shareRequest.ownerId, ctx.userId),
                input.sharedWithId
                  ? eq(shareRequest.sharedWithId, input.sharedWithId)
                  : sql`1=1`,
                and(
                  eq(shareRequest.status, "pending"),
                  gt(shareRequest.expiresAt, new Date()),
                ),
              ),
              orderBy: shareRequest.createdAt,
            });
          if (!existingSharedScoresheet) {
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: input.sharedWithId ?? null,
              itemType: "scoresheet",
              itemId: scoresheetToShare.scoresheetId,
              permission: scoresheetToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });
          }
        }
      }
      if (input.itemType === "player") {
        for (const matchToShare of input.sharedMatches) {
          const existingSharedMatch = await ctx.db.query.shareRequest.findFirst(
            {
              where: and(
                eq(shareRequest.itemId, matchToShare.matchId),
                eq(shareRequest.itemType, "match"),
                eq(shareRequest.ownerId, ctx.userId),
                input.sharedWithId
                  ? eq(shareRequest.sharedWithId, input.sharedWithId)
                  : sql`1=1`,
                and(
                  eq(shareRequest.status, "pending"),
                  gt(shareRequest.expiresAt, new Date()),
                ),
              ),
              orderBy: shareRequest.createdAt,
            },
          );
          if (!existingSharedMatch) {
            const existingSharedGame = await ctx.db.query.sharedGame.findFirst({
              where: and(
                eq(sharedGame.ownerId, ctx.userId),
                eq(sharedGame.sharedWithId, ctx.userId),
                eq(sharedGame.gameId, matchToShare.sharedGame.gameId),
              ),
            });
            if (!existingSharedGame) {
              await ctx.db.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: input.sharedWithId ?? null,
                itemType: "game",
                itemId: matchToShare.sharedGame.gameId,
                permission: matchToShare.sharedGame.permission,
                parentShareId: newShare.id,
                expiresAt: input.expiresAt ?? null,
              });
            }
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: input.sharedWithId ?? null,
              itemType: "match",
              itemId: matchToShare.matchId,
              permission: matchToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });
          }
        }
      }
      if (input.itemType === "match") {
        const existingSharedGame = await ctx.db.query.sharedGame.findFirst({
          where: and(
            eq(sharedGame.ownerId, ctx.userId),
            eq(sharedGame.sharedWithId, ctx.userId),
            eq(sharedGame.gameId, input.sharedGame.gameId),
          ),
        });
        if (!existingSharedGame) {
          await ctx.db.insert(shareRequest).values({
            ownerId: ctx.userId,
            sharedWithId: input.sharedWithId ?? null,
            itemType: "game",
            itemId: input.sharedGame.gameId,
            permission: input.sharedGame.permission,
            parentShareId: newShare.id,
            expiresAt: input.expiresAt ?? null,
          });
        }
      }

      const shareableUrl = `/share/${newShare.token}`;

      return { success: true, shareableUrl };
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
