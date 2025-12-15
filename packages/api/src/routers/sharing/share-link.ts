import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";

import type {
  selectGameSchema,
  selectLocationSchema,
  selectMatchSchema,
  selectScoreSheetSchema,
} from "@board-games/db/zodSchema";
import { game, scoresheet } from "@board-games/db/schema";

import { publicProcedure } from "../../trpc";

export const shareLinkRouter = {
  getSharedItemByToken: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sharedItem = await ctx.db.query.shareRequest.findFirst({
        where: {
          token: input.token,
        },
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
          where: {
            id: sharedItem.itemId,
          },
        });
      } else if (sharedItem.itemType === "match") {
        content = await ctx.db.query.match.findFirst({
          where: {
            id: sharedItem.itemId,
          },
        });
      } else {
        content = await ctx.db.query.player.findFirst({
          where: {
            id: sharedItem.itemId,
          },
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
            item: z.infer<typeof selectMatchSchema> & {
              location: z.infer<typeof selectLocationSchema> | null;
            };
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
                  eq(game.createdBy, childShareRequest.ownerId),
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
            const returnedMatch = await ctx.db.query.match.findFirst({
              where: {
                id: childShareRequest.itemId,
                createdBy: sharedItem.ownerId,
              },
              with: {
                location: true,
              },
            });
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
                  eq(scoresheet.createdBy, sharedItem.ownerId),
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
} satisfies TRPCRouterRecord;
