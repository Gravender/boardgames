import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod/v4";

import {
  groupPlayer,
  matchPlayer,
  player,
  sharedPlayer,
} from "@board-games/db/schema";
import {
  insertPlayerSchema,
  selectGroupSchema,
  selectPlayerSchema,
} from "@board-games/db/zodSchema";
import { calculatePlacement } from "@board-games/shared";

import { playerService } from "../services/player/player.service";
import { protectedUserProcedure } from "../trpc";

const recomputePlacements = (
  matchPlayers: { id: number; placement: number | null }[],
  finalPlacements: { id: number; score: number | null }[],
) => {
  // map id -> original placement
  const originalPlacements = new Map(
    matchPlayers.map((p) => [p.id, p.placement]),
  );

  return finalPlacements.map((placement) => {
    const higher = finalPlacements.filter((candidate) => {
      if (candidate.score == null && placement.score == null) return false;
      if (candidate.score == null) return false;
      if (placement.score == null) return true;
      return candidate.score > placement.score;
    }).length;

    const tiedHigher = finalPlacements.filter((candidate) => {
      const candidatePlacement = originalPlacements.get(candidate.id);
      const currentPlacement = originalPlacements.get(placement.id);
      if (candidatePlacement == null || currentPlacement == null) return false;
      return (
        candidate.score === placement.score &&
        candidatePlacement < currentPlacement
      );
    }).length;

    return {
      id: placement.id,
      score: placement.score,
      placement: 1 + higher + tiedHigher,
    };
  });
};

export const playerRouter = {
  getPlayersByGame: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
        type: z.literal("original").or(z.literal("shared")),
      }),
    )
    .query(async ({ ctx, input }) => {
      return playerService.getPlayersByGame({
        ctx,
        input:
          input.type === "shared"
            ? {
                type: "shared",
                sharedId: input.id,
              }
            : {
                type: "original",
                id: input.id,
              },
      });
    }),
  getPlayersByGroup: protectedUserProcedure
    .input(
      z.object({
        group: selectGroupSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const groupResponse = await ctx.db.query.group.findFirst({
        where: {
          createdBy: ctx.userId,
          id: input.group.id,
        },
      });
      if (!groupResponse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found.",
        });
      }
      const players = await ctx.db.query.player.findMany({
        where: {
          createdBy: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
        columns: {
          id: true,
          name: true,
          isUser: true,
        },
        with: {
          matches: {
            where: {
              finished: true,
            },
          },
          image: true,
          sharedLinkedPlayers: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              sharedMatches: {
                where: {
                  sharedWithId: ctx.userId,
                },
              },
            },
          },
        },
        extras: {
          inGroup: (table) => sql<boolean>`EXISTS (
            SELECT 1
            FROM ${groupPlayer}
            WHERE ${groupPlayer.groupId} = ${input.group.id}
              AND ${groupPlayer.playerId} = ${table.id}
          )`,
        },
      });
      const mappedGroupResponse: {
        id: number;
        inGroup: boolean;
        name: string;
        image: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "player" | "match" | "game";
        } | null;
        matches: number;
      }[] = players.map((p) => {
        return {
          id: p.id,
          inGroup: p.inGroup,
          name: p.name,
          image: p.image,
          matches:
            p.matches.length +
            p.sharedLinkedPlayers.flatMap(
              (linkedPlayer) => linkedPlayer.sharedMatches,
            ).length,
        };
      });

      return mappedGroupResponse;
    }),
  getPlayers: protectedUserProcedure.query(async ({ ctx }) => {
    return playerService.getPlayers({
      ctx,
    });
  }),
  getPlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const response = await playerService.getPlayer({
        ctx,
        input: {
          id: input.id,
          type: "original",
        },
      });
      if (response.type !== "original") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Expected original player response.",
        });
      }
      return {
        id: response.id,
        isUser: response.isUser,
        createdAt: response.createdAt,
        name: response.name,
        image: response.image,
        stats: response.stats,
        teamStats: response.teamStats,
        teammateFrequency: response.teammateFrequency,
        headToHead: response.headToHead,
        matches: response.matches,
        games: response.games,
      };
    }),
  getPlayerToShare: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedPlayer = await ctx.db.query.player.findFirst({
        where: {
          id: input.id,
          createdBy: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          image: true,
          matchPlayers: {
            with: {
              match: {
                with: {
                  matchPlayers: {
                    with: {
                      player: true,
                      team: true,
                    },
                  },
                  game: {
                    with: {
                      image: true,
                    },
                  },
                  location: true,
                  teams: true,
                },
              },
            },
          },
        },
      });
      if (!returnedPlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found.",
        });
      }
      const filteredMatches = returnedPlayer.matchPlayers
        .filter((mPlayer) => mPlayer.match.finished)
        .map((mPlayer) => ({
          id: mPlayer.match.id,
          name: mPlayer.match.name,
          date: mPlayer.match.date,
          duration: mPlayer.match.duration,
          locationName: mPlayer.match.location?.name,
          comment: mPlayer.match.comment,
          gameId: mPlayer.match.gameId,
          gameName: mPlayer.match.game.name,
          gameImage: mPlayer.match.game.image,
          gameYearPublished: mPlayer.match.game.yearPublished,
          players: mPlayer.match.matchPlayers
            .map((matchPlayer) => ({
              id: matchPlayer.player.id,
              name: matchPlayer.player.name,
              score: matchPlayer.score,
              isWinner: matchPlayer.winner,
              playerId: matchPlayer.player.id,
              team: matchPlayer.team,
            }))
            .toSorted((a, b) => {
              if (a.team === null || b.team === null) {
                if (a.score === b.score) {
                  return a.name.localeCompare(b.name);
                }
                if (a.score === null) return 1;
                if (b.score === null) return -1;
                return b.score - a.score;
              }
              if (a.team.id === b.team.id) return 0;
              if (a.score === b.score) {
                return a.name.localeCompare(b.name);
              }
              if (a.score === null) return 1;
              if (b.score === null) return -1;
              return b.score - a.score;
            }),
          teams: mPlayer.match.teams,
        }));
      return {
        id: returnedPlayer.id,
        name: returnedPlayer.name,
        image: returnedPlayer.image,
        matches: filteredMatches,
      };
    }),
  create: protectedUserProcedure
    .input(
      insertPlayerSchema.pick({ name: true, imageId: true }).check((ctx) => {
        if (!ctx.value.name) {
          ctx.issues.push({
            code: "custom",
            input: ctx.value,
            message: "Name is required",
          });
        }
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return playerService.createPlayer({
        ctx: {
          userId: ctx.userId,
        },
        input,
      });
    }),
  update: protectedUserProcedure
    .input(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("original"),
          id: z.number(),
          updateValues: z.discriminatedUnion("type", [
            z.object({
              type: z.literal("name"),
              name: z.string().trim().min(1, "Name is required"),
            }),
            z.object({
              type: z.literal("imageId"),
              imageId: z.number(),
            }),
            z.object({
              type: z.literal("clearImage"),
            }),
            z.object({
              type: z.literal("nameAndImageId"),
              name: z.string().trim().min(1, "Name is required"),
              imageId: z.number(),
            }),
            z.object({
              type: z.literal("nameAndClearImage"),
              name: z.string().trim().min(1, "Name is required"),
            }),
          ]),
        }),
        z.object({
          type: z.literal("shared"),
          id: z.number(),
          name: z.string().trim().min(1, "Name is required"),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      await playerService.updatePlayer({
        ctx: {
          userId: ctx.userId,
          posthog: ctx.posthog,
          deleteFiles: ctx.deleteFiles,
        },
        input,
      });
    }),
  deletePlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const updatedMatchPlayers = await tx
          .update(matchPlayer)
          .set({ deletedAt: new Date() })
          .where(eq(matchPlayer.playerId, input.id))
          .returning();
        const matches = await tx.query.match.findMany({
          where: {
            id: {
              in: updatedMatchPlayers.map(
                (uMatchPlayer) => uMatchPlayer.matchId,
              ),
            },
          },
          with: {
            matchPlayers: {
              with: {
                playerRounds: true,
              },
            },
            scoresheet: true,
          },
        });
        for (const returnedMatch of matches) {
          if (returnedMatch.finished) {
            if (returnedMatch.scoresheet.winCondition !== "Manual") {
              const finalPlacements = calculatePlacement(
                returnedMatch.matchPlayers.map((mPlayer) => ({
                  id: mPlayer.id,
                  rounds: mPlayer.playerRounds.map((pRound) => ({
                    score: pRound.score,
                  })),
                  teamId: mPlayer.teamId,
                })),
                returnedMatch.scoresheet,
              );
              const recomputedPlacements = recomputePlacements(
                returnedMatch.matchPlayers.map((mPlayer) => ({
                  id: mPlayer.id,
                  placement: mPlayer.placement,
                })),
                finalPlacements,
              );
              for (const placement of recomputedPlacements) {
                await tx
                  .update(matchPlayer)
                  .set({
                    placement: placement.placement,
                    score: placement.score,
                    winner: placement.placement === 1,
                  })
                  .where(eq(matchPlayer.id, placement.id));
              }
            }
          }
        }
        await tx
          .update(player)
          .set({ deletedAt: new Date() })
          .where(eq(player.id, input.id));
        await tx
          .update(sharedPlayer)
          .set({ linkedPlayerId: null })
          .where(
            and(
              eq(sharedPlayer.sharedWithId, ctx.userId),
              eq(sharedPlayer.linkedPlayerId, input.id),
            ),
          );
      });
    }),
} satisfies TRPCRouterRecord;
