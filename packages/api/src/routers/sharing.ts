import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import type {
  selectGameSchema,
  selectMatchSchema,
  selectPlayerSchema,
  selectScoreSheetSchema,
} from "@board-games/db/zodSchema";
import {
  friend,
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
            where: {
              id: matchToShare.matchId,
              userId: ctx.userId,
            },
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

          await ctx.db.insert(shareRequest).values({
            ownerId: ctx.userId,
            sharedWithId: null,
            itemType: "match",
            itemId: matchToShare.matchId,
            permission: matchToShare.permission,
            parentShareId: newShare.id,
            expiresAt: input.expiresAt ?? null,
          });
          if (matchToShare.includePlayers) {
            for (const matchPlayer of returnedMatch.matchPlayers) {
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
        for (const scoresheetToShare of input.scoresheetsToShare) {
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
              where: {
                userId: friendToShareTo.id,
              },
            });

          if (recipientSettings?.allowSharing === "none") {
            shareMessages.push({
              success: false,
              message: `User ${recipientSettings.userId} does not allow sharing.`,
            });
            continue;
          }

          const existingShare = await ctx.db.query.shareRequest.findFirst({
            where: {
              itemId: input.gameId,
              itemType: "game",
              ownerId: ctx.userId,
              sharedWithId: friendToShareTo.id,
              OR: [
                { status: "accepted" },
                {
                  status: "pending",

                  parentShareId: {
                    isNull: true,
                  },
                },
              ],
            },
          });
          if (existingShare && existingShare.status === "pending") {
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
              where: {
                id: matchToShare.matchId,
                userId: ctx.userId,
              },
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
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: friendToShareTo.id,
              itemType: "match",
              itemId: matchToShare.matchId,
              permission: matchToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });

            if (matchToShare.includePlayers) {
              for (const matchPlayer of returnedMatch.matchPlayers) {
                const existingSharedMatchPlayer =
                  await ctx.db.query.shareRequest.findFirst({
                    where: {
                      itemId: matchPlayer.player.id,
                      itemType: "player",
                      ownerId: ctx.userId,
                      sharedWithId: friendToShareTo.id,
                      status: "accepted",
                    },
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
      const result = await ctx.db.transaction(async (tx) => {
        const returnedMatch = await tx.query.match.findFirst({
          where: {
            id: input.matchId,
            userId: ctx.userId,
          },
          with: {
            matchPlayers: true,
          },
        });
        if (!returnedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found",
          });
        }
        if (input.type === "link") {
          // Insert new share request
          const [newShare] = await tx
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

          await tx.insert(shareRequest).values({
            ownerId: ctx.userId,
            sharedWithId: null,
            itemType: "game",
            itemId: returnedMatch.gameId,
            permission: input.permission,
            expiresAt: input.expiresAt ?? null,
            parentShareId: newShare.id,
          });
          const gamesScoreSheets = await tx.query.scoresheet.findMany({
            where: {
              gameId: returnedMatch.gameId,
              userId: ctx.userId,
              OR: [
                {
                  type: "Default",
                },
                {
                  type: "Game",
                },
              ],
            },
          });
          const defaultScoreSheet = gamesScoreSheets.find(
            (sheet) => sheet.type === "Default",
          );
          if (defaultScoreSheet) {
            await tx.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "scoresheet",
              itemId: defaultScoreSheet.id,
              permission: input.permission,
              expiresAt: input.expiresAt ?? null,
              parentShareId: newShare.id,
            });
          } else if (gamesScoreSheets[0]) {
            await tx.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "scoresheet",
              itemId: gamesScoreSheets[0].id,
              permission: input.permission,
              expiresAt: input.expiresAt ?? null,
              parentShareId: newShare.id,
            });
          } else {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Scoresheet not created",
            });
          }

          if (input.includePlayers) {
            for (const matchPlayer of returnedMatch.matchPlayers) {
              await tx.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: null,
                itemType: "player",
                itemId: matchPlayer.playerId,
                permission: "view",
                parentShareId: newShare.id,
                expiresAt: input.expiresAt ?? null,
              });
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
              await tx.query.userSharingPreference.findFirst({
                where: {
                  userId: friendToShareTo.id,
                },
              });

            if (recipientSettings?.allowSharing === "none") {
              shareMessages.push({
                success: false,
                message: `User ${recipientSettings.userId} does not allow sharing.`,
              });
              continue;
            }
            const existingShare = await tx.query.shareRequest.findFirst({
              where: {
                itemId: input.matchId,
                itemType: "match",
                ownerId: ctx.userId,
                sharedWithId: friendToShareTo.id,
                OR: [
                  {
                    status: "pending",
                    expiresAt: {
                      gt: new Date(),
                    },
                    parentShareId: {
                      isNull: true,
                    },
                  },
                  { status: "accepted" },
                ],
              },
            });
            if (existingShare && existingShare.status === "pending") {
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
            const [newShare] = await tx
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
            const returnedSharedGameRequest =
              await tx.query.shareRequest.findFirst({
                where: {
                  itemId: returnedMatch.gameId,
                  itemType: "game",
                  ownerId: ctx.userId,
                  sharedWithId: friendToShareTo.id,
                  status: "accepted",
                },
              });
            if (!returnedSharedGameRequest) {
              await tx.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: friendToShareTo.id,
                itemType: "game",
                itemId: returnedMatch.gameId,
                permission: input.permission,
                expiresAt: input.expiresAt ?? null,
                parentShareId: newShare.id,
              });
              const gamesScoreSheets = await tx.query.scoresheet.findMany({
                where: {
                  gameId: returnedMatch.gameId,
                  userId: ctx.userId,
                  OR: [
                    {
                      type: "Default",
                    },
                    {
                      type: "Game",
                    },
                  ],
                },
              });
              const defaultScoreSheet = gamesScoreSheets.find(
                (sheet) => sheet.type === "Default",
              );
              if (defaultScoreSheet) {
                await tx.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  sharedWithId: null,
                  itemType: "scoresheet",
                  itemId: defaultScoreSheet.id,
                  permission: input.permission,
                  expiresAt: input.expiresAt ?? null,
                  parentShareId: newShare.id,
                });
              } else if (gamesScoreSheets[0]) {
                await tx.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  sharedWithId: null,
                  itemType: "scoresheet",
                  itemId: gamesScoreSheets[0].id,
                  permission: input.permission,
                  expiresAt: input.expiresAt ?? null,
                  parentShareId: newShare.id,
                });
              }
            } else {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "No games scoresheets found",
              });
            }
            if (input.includePlayers) {
              for (const matchPlayer of returnedMatch.matchPlayers) {
                const existingSharedMatchPlayer =
                  await tx.query.shareRequest.findFirst({
                    where: {
                      itemId: matchPlayer.playerId,
                      itemType: "player",
                      ownerId: ctx.userId,
                      sharedWithId: friendToShareTo.id,
                      status: "accepted",
                    },
                  });
                if (!existingSharedMatchPlayer) {
                  await tx.insert(shareRequest).values({
                    ownerId: ctx.userId,
                    sharedWithId: friendToShareTo.id,
                    itemType: "player",
                    itemId: matchPlayer.playerId,
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
      });
      return result;
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
        where: {
          id: input.playerId,
          createdBy: ctx.userId,
        },
      });

      if (!returnedPlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared Player not found",
        });
      }
      if (input.type === "link") {
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
            where: {
              id: matchToShare.matchId,
              userId: ctx.userId,
            },
            with: {
              matchPlayers: true,
            },
          });
          if (!returnedMatch) {
            shareMessages.push({
              success: false,
              message: `Match ${matchToShare.matchId} not found.`,
            });
            continue;
          }

          await ctx.db.insert(shareRequest).values({
            ownerId: ctx.userId,
            sharedWithId: null,
            itemType: "match",
            itemId: matchToShare.matchId,
            permission: matchToShare.permission,
            parentShareId: newShare.id,
            expiresAt: input.expiresAt ?? null,
          });

          await ctx.db.insert(shareRequest).values({
            ownerId: ctx.userId,
            sharedWithId: null,
            itemType: "game",
            itemId: returnedMatch.gameId,
            permission: matchToShare.permission,
            parentShareId: newShare.id,
            expiresAt: input.expiresAt ?? null,
          });
          const gamesScoreSheets = await ctx.db.query.scoresheet.findMany({
            where: {
              gameId: returnedMatch.gameId,
              userId: ctx.userId,
              OR: [
                {
                  type: "Default",
                },
                {
                  type: "Game",
                },
              ],
            },
          });
          const defaultScoreSheet = gamesScoreSheets.find(
            (sheet) => sheet.type === "Default",
          );
          if (defaultScoreSheet) {
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "scoresheet",
              itemId: defaultScoreSheet.id,
              permission: input.permission,
              expiresAt: input.expiresAt ?? null,
              parentShareId: newShare.id,
            });
          } else if (gamesScoreSheets[0]) {
            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "scoresheet",
              itemId: gamesScoreSheets[0].id,
              permission: input.permission,
              expiresAt: input.expiresAt ?? null,
              parentShareId: newShare.id,
            });
          } else {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "No games scoresheets found",
            });
          }

          if (matchToShare.includePlayers) {
            for (const matchPlayer of returnedMatch.matchPlayers) {
              await ctx.db.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: null,
                itemType: "player",
                itemId: matchPlayer.playerId,
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
              where: {
                userId: friendToShareTo.id,
              },
            });

          if (recipientSettings?.allowSharing === "none") {
            shareMessages.push({
              success: false,
              message: `User ${recipientSettings.userId} does not allow sharing.`,
            });
            continue;
          }
          const existingShare = await ctx.db.query.shareRequest.findFirst({
            where: {
              itemId: input.playerId,
              itemType: "player",
              ownerId: ctx.userId,
              sharedWithId: friendToShareTo.id,
              OR: [
                { status: "accepted" },
                {
                  status: "pending",
                  expiresAt: {
                    gt: new Date(),
                  },
                  parentShareId: {
                    isNull: true,
                  },
                },
              ],
            },
          });

          if (existingShare && existingShare.status === "pending") {
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
              where: {
                id: matchToShare.matchId,
                userId: ctx.userId,
              },
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

            //check if the match is already shared with the user or the previous share request has expired

            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: friendToShareTo.id,
              itemType: "match",
              itemId: matchToShare.matchId,
              permission: matchToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });

            await ctx.db.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: friendToShareTo.id,
              itemType: "game",
              itemId: returnedMatch.gameId,
              permission: matchToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });
            const gamesScoreSheets = await ctx.db.query.scoresheet.findMany({
              where: {
                gameId: returnedMatch.gameId,
                userId: ctx.userId,
                OR: [{ type: "Default" }, { type: "Game" }],
              },
            });
            const defaultScoreSheet = gamesScoreSheets.find(
              (sheet) => sheet.type === "Default",
            );
            if (defaultScoreSheet) {
              await ctx.db.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: null,
                itemType: "scoresheet",
                itemId: defaultScoreSheet.id,
                permission: input.permission,
                expiresAt: input.expiresAt ?? null,
                parentShareId: newShare.id,
              });
            } else if (gamesScoreSheets[0]) {
              await ctx.db.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: null,
                itemType: "scoresheet",
                itemId: gamesScoreSheets[0].id,
                permission: input.permission,
                expiresAt: input.expiresAt ?? null,
                parentShareId: newShare.id,
              });
            }

            if (matchToShare.includePlayers) {
              for (const matchPlayer of returnedMatch.matchPlayers) {
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
      const response = await ctx.db.transaction(async (tx) => {
        const existingRequest = await tx.query.shareRequest.findFirst({
          where: {
            id: input.requestId,
            sharedWithId: ctx.userId,
          },
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
        await tx
          .update(shareRequest)
          .set({ status: input.accept ? "accepted" : "rejected" })
          .where(eq(shareRequest.id, input.requestId));
        await tx
          .update(shareRequest)
          .set({ status: input.accept ? "accepted" : "rejected" })
          .where(
            inArray(
              shareRequest.id,
              existingRequest.childShareRequests.map((child) => child.id),
            ),
          );
        if (input.accept) {
          if (existingRequest.itemType === "match") {
            const [returnedMatch] = await tx
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
            const childGameShareRequest =
              existingRequest.childShareRequests.find(
                (childShareRequest) =>
                  childShareRequest.itemType === "game" &&
                  childShareRequest.itemId === returnedMatch.gameId,
              );
            const returnedSharedGame = await tx.query.sharedGame.findFirst({
              where: {
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                gameId: returnedMatch.gameId,
              },
            });
            if (childGameShareRequest) {
              if (!returnedSharedGame) {
                const [insertedSharedGame] = await tx
                  .insert(sharedGame)
                  .values({
                    ownerId: childGameShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    gameId: childGameShareRequest.itemId,
                    permission: childGameShareRequest.permission,
                  })
                  .returning();
                if (!insertedSharedGame) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Shared Game not created successfully",
                  });
                }

                await tx.insert(sharedMatch).values({
                  ownerId: existingRequest.ownerId,
                  sharedWithId: ctx.userId,
                  matchId: existingRequest.itemId,
                  sharedGameId: insertedSharedGame.id,
                  permission: existingRequest.permission,
                });
              } else {
                const sharedMatchExists = await tx.query.sharedMatch.findFirst({
                  where: {
                    ownerId: existingRequest.ownerId,
                    sharedWithId: ctx.userId,
                    matchId: existingRequest.itemId,
                  },
                });
                if (!sharedMatchExists) {
                  await tx.insert(sharedMatch).values({
                    ownerId: existingRequest.ownerId,
                    sharedWithId: ctx.userId,
                    matchId: existingRequest.itemId,
                    sharedGameId: returnedSharedGame.id,
                    permission: existingRequest.permission,
                  });
                }
              }
            } else {
              if (!returnedSharedGame) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Shared Game not found",
                });
              }
              const sharedMatchExists = await tx.query.sharedMatch.findFirst({
                where: {
                  ownerId: existingRequest.ownerId,
                  sharedWithId: ctx.userId,
                  matchId: existingRequest.itemId,
                  sharedGameId: returnedSharedGame.gameId,
                },
              });
              if (!sharedMatchExists) {
                await tx.insert(sharedMatch).values({
                  ownerId: existingRequest.ownerId,
                  sharedWithId: ctx.userId,
                  matchId: existingRequest.itemId,
                  sharedGameId: returnedSharedGame.gameId,
                  permission: existingRequest.permission,
                });
              }
            }
            for (const childShareRequest of existingRequest.childShareRequests.filter(
              (child) => child.itemType !== "game",
            )) {
              if (childShareRequest.itemType === "player") {
                const sharedPlayerExists =
                  await tx.query.sharedPlayer.findFirst({
                    where: {
                      ownerId: childShareRequest.ownerId,
                      sharedWithId: ctx.userId,
                      playerId: childShareRequest.itemId,
                    },
                  });
                if (sharedPlayerExists) {
                  continue;
                }
                const [returnedSharedPlayer] = await tx
                  .insert(sharedPlayer)
                  .values({
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    playerId: childShareRequest.itemId,
                    permission: childShareRequest.permission,
                  })
                  .returning();
                if (!returnedSharedPlayer) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Shared Player not created successfully",
                  });
                }
              }
              if (childShareRequest.itemType === "scoresheet") {
                const sharedScoresheetExists =
                  await tx.query.sharedScoresheet.findFirst({
                    where: {
                      ownerId: childShareRequest.ownerId,
                      sharedWithId: ctx.userId,
                      scoresheetId: childShareRequest.itemId,
                    },
                  });
                if (!sharedScoresheetExists) {
                  const returnedScoresheet =
                    await tx.query.scoresheet.findFirst({
                      where: {
                        id: childShareRequest.itemId,
                        userId: childShareRequest.ownerId,
                      },
                    });
                  if (!returnedScoresheet) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Scoresheet not found.",
                    });
                  }
                  const returnedSharedGame =
                    await tx.query.sharedGame.findFirst({
                      where: {
                        ownerId: childShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        gameId: returnedScoresheet.gameId,
                      },
                    });
                  if (!returnedSharedGame) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Shared Game not found",
                    });
                  }
                  await tx.insert(sharedScoresheet).values({
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    scoresheetId: childShareRequest.itemId,
                    permission: childShareRequest.permission,
                    sharedGameId: returnedSharedGame.id,
                  });
                }
              }
            }
          }
          if (existingRequest.itemType === "game") {
            const [returnedGame] = await tx
              .select()
              .from(game)
              .where(
                and(
                  eq(game.id, existingRequest.itemId),
                  eq(game.userId, existingRequest.ownerId),
                ),
              );
            if (!returnedGame) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Game not found.",
              });
            }
            const sharedGameExists = await tx.query.sharedGame.findFirst({
              where: {
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                gameId: existingRequest.itemId,
              },
            });
            if (sharedGameExists) {
              for (const childShareRequest of existingRequest.childShareRequests) {
                if (childShareRequest.itemType === "scoresheet") {
                  const sharedScoresheetExists =
                    await tx.query.sharedScoresheet.findFirst({
                      where: {
                        ownerId: childShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        scoresheetId: childShareRequest.itemId,
                      },
                    });
                  if (sharedScoresheetExists) {
                    continue;
                  }
                  await tx.insert(sharedScoresheet).values({
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    scoresheetId: childShareRequest.itemId,
                    permission: childShareRequest.permission,
                    sharedGameId: sharedGameExists.id,
                  });
                }
                if (childShareRequest.itemType === "match") {
                  const sharedMatchExists =
                    await tx.query.sharedMatch.findFirst({
                      where: {
                        ownerId: childShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        matchId: childShareRequest.itemId,
                        sharedGameId: sharedGameExists.gameId,
                      },
                    });
                  if (sharedMatchExists) {
                    continue;
                  }
                  await tx.insert(sharedMatch).values({
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    matchId: childShareRequest.itemId,
                    sharedGameId: sharedGameExists.id,
                    permission: childShareRequest.permission,
                  });
                }
                if (childShareRequest.itemType === "player") {
                  const sharedPlayerExists =
                    await tx.query.sharedPlayer.findFirst({
                      where: {
                        ownerId: childShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        playerId: childShareRequest.itemId,
                      },
                    });
                  if (sharedPlayerExists) {
                    continue;
                  }
                  await tx.insert(sharedPlayer).values({
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    playerId: childShareRequest.itemId,
                    permission: childShareRequest.permission,
                  });
                }
              }
            } else {
              const [returnedSharedGame] = await tx
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
                  const sharedScoresheetExists =
                    await tx.query.sharedScoresheet.findFirst({
                      where: {
                        ownerId: childShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        scoresheetId: childShareRequest.itemId,
                      },
                    });
                  if (sharedScoresheetExists) {
                    continue;
                  }
                  await tx.insert(sharedScoresheet).values({
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    scoresheetId: childShareRequest.itemId,
                    permission: childShareRequest.permission,
                    sharedGameId: returnedSharedGame.id,
                  });
                }
                if (childShareRequest.itemType === "match") {
                  const sharedMatchExists =
                    await tx.query.sharedMatch.findFirst({
                      where: {
                        ownerId: childShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        matchId: childShareRequest.itemId,
                        sharedGameId: returnedSharedGame.id,
                      },
                    });
                  if (sharedMatchExists) {
                    continue;
                  }
                  await tx.insert(sharedMatch).values({
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    matchId: childShareRequest.itemId,
                    sharedGameId: returnedSharedGame.id,
                    permission: childShareRequest.permission,
                  });
                }
                if (childShareRequest.itemType === "player") {
                  const sharedPlayerExists =
                    await tx.query.sharedPlayer.findFirst({
                      where: {
                        ownerId: childShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        playerId: childShareRequest.itemId,
                      },
                    });
                  if (sharedPlayerExists) {
                    continue;
                  }
                  await tx.insert(sharedPlayer).values({
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    playerId: childShareRequest.itemId,
                    permission: childShareRequest.permission,
                  });
                }
              }
            }
          }
          if (existingRequest.itemType === "player") {
            const sharedPlayerExists = await tx.query.sharedPlayer.findFirst({
              where: {
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                playerId: existingRequest.itemId,
              },
            });
            if (!sharedPlayerExists) {
              await tx.insert(sharedPlayer).values({
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                playerId: existingRequest.itemId,
                permission: existingRequest.permission,
              });
              const childGameShareRequests =
                existingRequest.childShareRequests.filter(
                  (childShareRequest) => childShareRequest.itemType === "game",
                );
              const childScoreSheetShareRequests =
                existingRequest.childShareRequests.filter(
                  (childShareRequest) =>
                    childShareRequest.itemType === "scoresheet",
                );
              const childMatchShareRequests =
                existingRequest.childShareRequests.filter(
                  (childShareRequest) => childShareRequest.itemType === "match",
                );
              for (const childShareRequest of childGameShareRequests) {
                const sharedGameExists = await tx.query.sharedGame.findFirst({
                  where: {
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    gameId: childShareRequest.itemId,
                  },
                });
                if (sharedGameExists) {
                  continue;
                }
                await tx.insert(sharedGame).values({
                  ownerId: childShareRequest.ownerId,
                  sharedWithId: ctx.userId,
                  gameId: childShareRequest.itemId,
                  permission: childShareRequest.permission,
                });
              }
              for (const childShareRequest of childMatchShareRequests) {
                const returnedMatch = await ctx.db.query.match.findFirst({
                  where: {
                    id: childShareRequest.itemId,
                    userId: childShareRequest.ownerId,
                  },
                });
                if (!returnedMatch) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Match not found.",
                  });
                }
                const returnedSharedGame = await tx.query.sharedGame.findFirst({
                  where: {
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    gameId: returnedMatch.gameId,
                  },
                });
                if (!returnedSharedGame) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Shared Game not found",
                  });
                }
                const sharedMatchExists = await tx.query.sharedMatch.findFirst({
                  where: {
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    matchId: childShareRequest.itemId,
                    sharedGameId: returnedSharedGame.gameId,
                  },
                });
                if (sharedMatchExists) {
                  continue;
                }
                await tx.insert(sharedMatch).values({
                  ownerId: childShareRequest.ownerId,
                  sharedWithId: ctx.userId,
                  matchId: childShareRequest.itemId,
                  sharedGameId: returnedSharedGame.id,
                  permission: childShareRequest.permission,
                });
              }
              for (const childShareRequest of childScoreSheetShareRequests) {
                const sharedScoresheetExists =
                  await tx.query.sharedScoresheet.findFirst({
                    where: {
                      ownerId: childShareRequest.ownerId,
                      sharedWithId: ctx.userId,
                      scoresheetId: childShareRequest.itemId,
                    },
                  });
                if (sharedScoresheetExists) {
                  continue;
                }
                const returnedScoresheet = await tx.query.scoresheet.findFirst({
                  where: {
                    id: childShareRequest.itemId,
                    userId: childShareRequest.ownerId,
                  },
                });
                if (!returnedScoresheet) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Scoresheet not found.",
                  });
                }
                const returnedSharedGame = await tx.query.sharedGame.findFirst({
                  where: {
                    ownerId: childShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    gameId: returnedScoresheet.gameId,
                  },
                });
                if (!returnedSharedGame) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Shared Game not found",
                  });
                }
                await tx.insert(sharedScoresheet).values({
                  ownerId: childShareRequest.ownerId,
                  sharedWithId: ctx.userId,
                  scoresheetId: childShareRequest.itemId,
                  permission: childShareRequest.permission,
                  sharedGameId: returnedSharedGame.id,
                });
              }
            }
          }
          if (existingRequest.itemType === "scoresheet") {
            const sharedScoresheetExists =
              await tx.query.sharedScoresheet.findFirst({
                where: {
                  ownerId: existingRequest.ownerId,
                  sharedWithId: ctx.userId,
                  scoresheetId: existingRequest.itemId,
                },
              });
            if (!sharedScoresheetExists) {
              const [returnedScoresheet] = await tx
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
              const [returnedSharedGame] = await tx
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
              await tx.insert(sharedScoresheet).values({
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                scoresheetId: existingRequest.itemId,
                permission: existingRequest.permission,
                sharedGameId: returnedSharedGame.id,
              });
            }
          }
        }

        return input.requestId;
      });
      return {
        id: response,
        accept: input.accept,
      };
    }),
  acceptGameShareRequest: protectedUserProcedure
    .input(
      z.object({
        requestId: z.number(),
        linkedGameId: z.number().optional(),
        scoresheets: z
          .array(
            z.object({
              sharedId: z.number(),
              accept: z.boolean(),
            }),
          )
          .min(1),
        matches: z.array(
          z.object({
            sharedId: z.number(),
            accept: z.boolean(),
          }),
        ),
        players: z.array(
          z.object({
            sharedId: z.number(),
            accept: z.boolean(),
            linkedId: z.number().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (tx) => {
        const existingRequest = await tx.query.shareRequest.findFirst({
          where: {
            id: input.requestId,
            sharedWithId: ctx.userId,
          },
        });

        if (!existingRequest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Share request not found.",
          });
        }
        const [returnedGame] = await tx
          .select()
          .from(game)
          .where(
            and(
              eq(game.id, existingRequest.itemId),
              eq(game.userId, existingRequest.ownerId),
            ),
          );
        if (!returnedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found.",
          });
        }
        await tx
          .update(shareRequest)
          .set({ status: "accepted" })
          .where(eq(shareRequest.id, input.requestId));
        let sharedGameExists = await tx.query.sharedGame.findFirst({
          where: {
            ownerId: existingRequest.ownerId,
            sharedWithId: ctx.userId,
            gameId: existingRequest.itemId,
          },
        });
        if (!sharedGameExists) {
          const [returnedSharedGame] = await tx
            .insert(sharedGame)
            .values({
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              gameId: existingRequest.itemId,
              permission: existingRequest.permission,
              linkedGameId: input.linkedGameId,
            })
            .returning();
          if (!returnedSharedGame) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared Game not created successfully",
            });
          }
          sharedGameExists = returnedSharedGame;
        }
        for (const scoresheetShareRequest of input.scoresheets) {
          const returnedScoresheetRequest =
            await tx.query.shareRequest.findFirst({
              where: {
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                id: scoresheetShareRequest.sharedId,
              },
            });
          if (!returnedScoresheetRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Scoresheet request not found.",
            });
          }
          const returnedScoresheet = await tx.query.scoresheet.findFirst({
            where: {
              id: returnedScoresheetRequest.itemId,
              userId: existingRequest.ownerId,
            },
          });
          if (!returnedScoresheet) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Scoresheet not found.",
            });
          }
          await tx
            .update(shareRequest)
            .set({
              status: scoresheetShareRequest.accept ? "accepted" : "rejected",
            })
            .where(eq(shareRequest.id, returnedScoresheetRequest.id));
          if (scoresheetShareRequest.accept) {
            const sharedScoresheetExists =
              await tx.query.sharedScoresheet.findFirst({
                where: {
                  ownerId: returnedScoresheetRequest.ownerId,
                  sharedWithId: ctx.userId,
                  scoresheetId: returnedScoresheetRequest.itemId,
                },
              });
            if (!sharedScoresheetExists) {
              await tx.insert(sharedScoresheet).values({
                ownerId: returnedScoresheetRequest.ownerId,
                sharedWithId: ctx.userId,
                scoresheetId: returnedScoresheetRequest.itemId,
                permission: returnedScoresheetRequest.permission,

                sharedGameId: sharedGameExists.id,
              });
            }
          }
        }
        for (const matchShareRequest of input.matches) {
          const returnedMatchRequest = await tx.query.shareRequest.findFirst({
            where: {
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              id: matchShareRequest.sharedId,
            },
          });
          if (!returnedMatchRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Match request not found.",
            });
          }
          const returnedMatch = await tx.query.match.findFirst({
            where: {
              id: returnedMatchRequest.itemId,
              userId: existingRequest.ownerId,
            },
          });
          if (!returnedMatch) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Match not found.",
            });
          }
          await tx
            .update(shareRequest)
            .set({
              status: matchShareRequest.accept ? "accepted" : "rejected",
            })
            .where(eq(shareRequest.id, returnedMatchRequest.id));
          if (matchShareRequest.accept) {
            const sharedMatchExists = await tx.query.sharedMatch.findFirst({
              where: {
                ownerId: returnedMatchRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: returnedMatchRequest.itemId,
              },
            });
            if (!sharedMatchExists) {
              await tx.insert(sharedMatch).values({
                ownerId: returnedMatchRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: returnedMatchRequest.itemId,
                sharedGameId: sharedGameExists.id,
                permission: returnedMatchRequest.permission,
              });
            }
          }
        }
        for (const playerShareRequest of input.players) {
          const returnedPlayerRequest = await tx.query.shareRequest.findFirst({
            where: {
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              id: playerShareRequest.sharedId,
            },
          });
          if (!returnedPlayerRequest) {
            const message = `Player request ${playerShareRequest.sharedId} not found.`;
            throw new TRPCError({
              code: "NOT_FOUND",
              message: message,
            });
          }
          const returnedPlayer = await tx.query.player.findFirst({
            where: {
              id: returnedPlayerRequest.itemId,
              createdBy: returnedPlayerRequest.ownerId,
            },
          });
          if (!returnedPlayer) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Player not found.",
            });
          }

          await tx
            .update(shareRequest)
            .set({
              status: playerShareRequest.accept ? "accepted" : "rejected",
            })
            .where(eq(shareRequest.id, returnedPlayerRequest.id));
          if (playerShareRequest.accept) {
            const sharedPlayerExists = await tx.query.sharedPlayer.findFirst({
              where: {
                ownerId: returnedPlayerRequest.ownerId,
                sharedWithId: ctx.userId,
                playerId: returnedPlayerRequest.itemId,
              },
            });
            if (!sharedPlayerExists) {
              if (playerShareRequest.linkedId) {
                const linkedPlayer = await tx.query.player.findFirst({
                  where: {
                    id: playerShareRequest.linkedId,
                    createdBy: ctx.userId,
                  },
                });
                if (!linkedPlayer) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Linked player not found.",
                  });
                }
              }
              await tx.insert(sharedPlayer).values({
                ownerId: returnedPlayerRequest.ownerId,
                sharedWithId: ctx.userId,
                playerId: returnedPlayerRequest.itemId,
                permission: returnedPlayerRequest.permission,
                linkedPlayerId: playerShareRequest.linkedId,
              });
            }
          }
        }
        return sharedGameExists;
      });
      return response;
    }),
  acceptMatchShareRequest: protectedUserProcedure
    .input(
      z
        .object({
          type: z.literal("Create Share Game"),
          requestId: z.number(),
          shareGameRequestId: z.number(),
          linkedGameId: z.number().optional(),
          scoresheets: z
            .array(
              z.object({
                sharedId: z.number(),
                accept: z.boolean(),
              }),
            )
            .min(1),
          players: z.array(
            z.object({
              sharedId: z.number(),
              accept: z.boolean(),
              linkedId: z.number().optional(),
            }),
          ),
        })
        .or(
          z.object({
            type: z.literal("Share Game Exists"),
            requestId: z.number(),
            players: z.array(
              z.object({
                sharedId: z.number(),
                accept: z.boolean(),
                linkedId: z.number().optional(),
              }),
            ),
          }),
        ),
    )
    .mutation(async ({ ctx, input }) => {
      let matchAndGame = {
        matchId: -1,
        gameId: -1,
      };

      const response = await ctx.db.transaction(async (tx) => {
        const existingRequest = await tx.query.shareRequest.findFirst({
          where: {
            id: input.requestId,
            sharedWithId: ctx.userId,
          },
        });

        if (!existingRequest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Share request not found.",
          });
        }
        const [returnedMatch] = await tx
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
        await tx
          .update(shareRequest)
          .set({ status: "accepted" })
          .where(eq(shareRequest.id, input.requestId));
        if (input.type === "Create Share Game") {
          const [shareGameRequest] = await tx
            .update(shareRequest)
            .set({ status: "accepted" })
            .where(eq(shareRequest.id, input.shareGameRequestId))
            .returning();
          if (!shareGameRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Share game request not found.",
            });
          }
          let sharedGameExists = await tx.query.sharedGame.findFirst({
            where: {
              ownerId: shareGameRequest.ownerId,
              sharedWithId: ctx.userId,
              gameId: shareGameRequest.itemId,
            },
          });
          if (!sharedGameExists) {
            const [returnedSharedGame] = await tx
              .insert(sharedGame)
              .values({
                ownerId: shareGameRequest.ownerId,
                sharedWithId: ctx.userId,
                gameId: shareGameRequest.itemId,
                permission: shareGameRequest.permission,
                linkedGameId: input.linkedGameId,
              })
              .returning();
            if (!returnedSharedGame) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Game not created successfully",
              });
            }
            sharedGameExists = returnedSharedGame;
          }
          const existingSharedMatch = await tx.query.sharedMatch.findFirst({
            where: {
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              matchId: existingRequest.itemId,
            },
          });
          if (!existingSharedMatch) {
            const [returnedSharedMatch] = await tx
              .insert(sharedMatch)
              .values({
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: existingRequest.itemId,
                sharedGameId: sharedGameExists.id,
                permission: existingRequest.permission,
              })
              .returning();
            if (!returnedSharedMatch) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Match not created successfully",
              });
            }
            matchAndGame = {
              gameId: returnedSharedMatch.sharedGameId,
              matchId: returnedSharedMatch.id,
            };
          } else {
            matchAndGame = {
              gameId: existingSharedMatch.sharedGameId,
              matchId: existingSharedMatch.id,
            };
          }

          for (const scoresheetShareRequest of input.scoresheets) {
            const returnedScoresheetRequest =
              await tx.query.shareRequest.findFirst({
                where: {
                  ownerId: existingRequest.ownerId,
                  sharedWithId: ctx.userId,
                  id: scoresheetShareRequest.sharedId,
                },
              });
            if (!returnedScoresheetRequest) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Scoresheet request not found.",
              });
            }
            await tx
              .update(shareRequest)
              .set({
                status: scoresheetShareRequest.accept ? "accepted" : "rejected",
              })
              .where(eq(shareRequest.id, returnedScoresheetRequest.id));
            if (scoresheetShareRequest.accept) {
              const returnedScoresheet = await tx.query.scoresheet.findFirst({
                where: {
                  id: returnedScoresheetRequest.itemId,
                  userId: returnedScoresheetRequest.ownerId,
                },
              });
              if (!returnedScoresheet) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Scoresheet not found.",
                });
              }
              const existingSharedScoresheet =
                await tx.query.sharedScoresheet.findFirst({
                  where: {
                    ownerId: returnedScoresheetRequest.ownerId,
                    sharedWithId: ctx.userId,
                    scoresheetId: returnedScoresheetRequest.itemId,
                  },
                });
              if (!existingSharedScoresheet) {
                await tx.insert(sharedScoresheet).values({
                  ownerId: returnedScoresheetRequest.ownerId,
                  sharedWithId: ctx.userId,
                  scoresheetId: returnedScoresheetRequest.itemId,
                  permission: returnedScoresheetRequest.permission,
                  sharedGameId: sharedGameExists.id,
                });
              }
            }
          }
        }
        if (input.type === "Share Game Exists") {
          const [returnedSharedGame] = await tx
            .select()
            .from(sharedGame)
            .where(
              and(
                eq(sharedGame.ownerId, existingRequest.ownerId),
                eq(sharedGame.sharedWithId, ctx.userId),
                eq(sharedGame.gameId, returnedMatch.gameId),
              ),
            );
          if (!returnedSharedGame) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shared Game not found",
            });
          }
          const existingSharedMatch = await tx.query.sharedMatch.findFirst({
            where: {
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              matchId: existingRequest.itemId,
            },
          });
          if (!existingSharedMatch) {
            const [returnedSharedMatch] = await tx
              .insert(sharedMatch)
              .values({
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: existingRequest.itemId,
                sharedGameId: returnedSharedGame.id,
                permission: existingRequest.permission,
              })
              .returning();
            if (!returnedSharedMatch) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Match not created successfully",
              });
            }
            matchAndGame = {
              gameId: returnedSharedMatch.sharedGameId,
              matchId: returnedSharedMatch.id,
            };
          } else {
            matchAndGame = {
              gameId: existingSharedMatch.sharedGameId,
              matchId: existingSharedMatch.id,
            };
          }
        }
        for (const matchPlayer of input.players) {
          const returnedPlayerRequest = await tx.query.shareRequest.findFirst({
            where: {
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              id: matchPlayer.sharedId,
            },
          });
          if (!returnedPlayerRequest) {
            const message = `Player request ${matchPlayer.sharedId} not found.`;
            throw new TRPCError({
              code: "NOT_FOUND",
              message: message,
            });
          }
          await tx
            .update(shareRequest)
            .set({
              status: matchPlayer.accept ? "accepted" : "rejected",
            })
            .where(eq(shareRequest.id, returnedPlayerRequest.id));
          if (matchPlayer.accept) {
            const returnedPlayer = await tx.query.player.findFirst({
              where: {
                id: returnedPlayerRequest.itemId,
                createdBy: returnedPlayerRequest.ownerId,
              },
            });
            if (!returnedPlayer) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Player not found.",
              });
            }
            const sharedPlayerExists = await tx.query.sharedPlayer.findFirst({
              where: {
                ownerId: returnedPlayerRequest.ownerId,
                sharedWithId: ctx.userId,
                playerId: returnedPlayerRequest.itemId,
              },
            });
            if (!sharedPlayerExists) {
              await tx.insert(sharedPlayer).values({
                ownerId: returnedPlayerRequest.ownerId,
                sharedWithId: ctx.userId,
                playerId: returnedPlayerRequest.itemId,
                permission: returnedPlayerRequest.permission,
                linkedPlayerId: matchPlayer.linkedId,
              });
            }
          }
        }
        if (matchAndGame.gameId !== -1) {
          return { success: true, ...matchAndGame };
        }
      });
      return response;
    }),

  cancelShareRequest: protectedUserProcedure
    .input(
      z.object({
        requestId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (tx) => {
        const existingRequest = await tx.query.shareRequest.findFirst({
          where: {
            id: input.requestId,
            ownerId: ctx.userId,
          },
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
        tx.delete(shareRequest).where(
          inArray(
            shareRequest.id,
            existingRequest.childShareRequests.map((child) => child.id),
          ),
        );
        tx.delete(shareRequest).where(eq(shareRequest.id, existingRequest.id));
        return input.requestId;
      });
      return response;
    }),

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
  getShareRequest: protectedUserProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ ctx, input }) => {
      const sharedItem = await ctx.db.query.shareRequest.findFirst({
        where: {
          id: input.requestId,
          sharedWithId: ctx.userId,
          status: "pending",
        },
        with: {
          childShareRequests: true,
          owner: true,
        },
      });

      if (!sharedItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared item not found.",
        });
      }

      const childItems: (
        | {
            itemType: "game";
            shareId: number;
            item: z.infer<typeof selectGameSchema>;
            permission: "view" | "edit";
          }
        | {
            itemType: "match";
            shareId: number;
            item: z.infer<typeof selectMatchSchema>;
            permission: "view" | "edit";
          }
        | {
            itemType: "scoresheet";
            shareId: number;
            item: z.infer<typeof selectScoreSheetSchema>;
            permission: "view" | "edit";
          }
        | {
            itemType: "player";
            shareId: number;
            item: z.infer<typeof selectPlayerSchema>;
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
                  eq(game.userId, sharedItem.ownerId),
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
              shareId: childShareRequest.id,
              item: returnGame,
              permission: childShareRequest.permission,
            });
          }
          if (childShareRequest.itemType === "match") {
            const returnedMatch = await ctx.db.query.match.findFirst({
              where: {
                id: childShareRequest.itemId,
                userId: sharedItem.ownerId,
              },
              with: {
                location: true,
                matchPlayers: {
                  with: {
                    player: true,
                  },
                },
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
              shareId: childShareRequest.id,
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
              shareId: childShareRequest.id,
              item: returnedScoresheet,
              permission: childShareRequest.permission,
            });
          }
          if (childShareRequest.itemType === "player") {
            const [returnedPlayer] = await ctx.db
              .select()
              .from(player)
              .where(
                and(
                  eq(player.id, childShareRequest.itemId),
                  eq(player.createdBy, sharedItem.ownerId),
                ),
              );
            if (!returnedPlayer) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Player not found",
              });
            }
            childItems.push({
              itemType: "player",
              shareId: childShareRequest.id,
              item: returnedPlayer,
              permission: childShareRequest.permission,
            });
          }
        }
      }
      if (sharedItem.itemType === "game") {
        const returnedGame = await ctx.db.query.game.findFirst({
          where: {
            id: sharedItem.itemId,
          },
        });
        if (!returnedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found.",
          });
        }
        return {
          itemType: "game" as const,
          item: returnedGame,
          permission: sharedItem.permission,
          childItems: childItems,
        };
      } else if (sharedItem.itemType === "match") {
        const returnedMatch = await ctx.db.query.match.findFirst({
          where: {
            id: sharedItem.itemId,
          },
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
        });
        if (!returnedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found.",
          });
        }
        const returnedSharedGame = await ctx.db.query.sharedGame.findFirst({
          where: {
            gameId: returnedMatch.gameId,
          },
          with: {
            game: {
              with: {
                image: true,
              },
            },
            linkedGame: {
              with: {
                image: true,
              },
            },
          },
        });
        if (
          childItems.find((item) => item.itemType === "game") &&
          returnedSharedGame !== undefined
        ) {
          return {
            itemType: "match" as const,
            item: returnedMatch,
            permission: sharedItem.permission,
            childItems: childItems,
          };
        } else {
          return {
            itemType: "match" as const,
            item: returnedMatch,
            permission: sharedItem.permission,
            childItems: childItems,
            sharedGame: returnedSharedGame,
          };
        }
      } else if (sharedItem.itemType === "player") {
        const returnedPlayer = await ctx.db.query.player.findFirst({
          where: {
            id: sharedItem.itemId,
          },
        });
        if (!returnedPlayer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Player not found.",
          });
        }
        return {
          itemType: "player" as const,
          item: returnedPlayer,
          permission: sharedItem.permission,
          childItems: childItems,
        };
      } else {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found.",
        });
      }
    }),
  getUserGamesForLinking: protectedUserProcedure.query(async ({ ctx }) => {
    const games = await ctx.db.query.game.findMany({
      where: {
        deleted: false,
        userId: ctx.userId,
      },
      with: {
        matches: {
          with: {
            matchPlayers: {
              with: {
                player: true,
              },
            },
            location: true,
          },
        },
      },
    });
    return games;
  }),
  getUserPlayersForLinking: protectedUserProcedure.query(async ({ ctx }) => {
    const players = await ctx.db.query.player.findMany({
      where: {
        createdBy: ctx.userId,
      },
    });
    return players;
  }),
  getIncomingShareRequests: protectedUserProcedure.query(async ({ ctx }) => {
    const sharedItems = await ctx.db.query.shareRequest.findMany({
      where: {
        sharedWithId: ctx.userId,
        parentShareId: {
          isNull: true,
        },
      },
      with: {
        childShareRequests: true,
        owner: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const mappedItems = (
      await Promise.all(
        sharedItems.map(async (sharedItem) => {
          if (sharedItem.itemType === "game") {
            const returnedGame = await ctx.db.query.game.findFirst({
              where: {
                id: sharedItem.itemId,
                userId: sharedItem.ownerId,
              },
            });
            return {
              type: "game" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              name: returnedGame?.name,
              ownerName: sharedItem.owner.name,
              permission: sharedItem.permission,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              id: sharedItem.id,
              matches: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "match",
              ).length,
              scoresheets: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "scoresheet",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
            };
          }
          if (sharedItem.itemType === "match") {
            const returnedMatch = await ctx.db.query.match.findFirst({
              where: {
                id: sharedItem.itemId,
                userId: sharedItem.ownerId,
              },
            });
            return {
              type: "match" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              id: sharedItem.id,
              name: returnedMatch?.name,
              ownerName: sharedItem.owner.name,
              permission: sharedItem.permission,
              game: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "game",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
            };
          }
          if (sharedItem.itemType === "player") {
            const returnedPlayer = await ctx.db.query.player.findFirst({
              where: {
                id: sharedItem.itemId,
                createdBy: sharedItem.ownerId,
              },
            });
            return {
              type: "player" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              id: sharedItem.id,
              name: returnedPlayer?.name,
              ownerName: sharedItem.owner.name,
              permission: sharedItem.permission,
              matches: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "match",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
            };
          }
          return null;
        }),
      )
    ).filter((item) => item !== null);
    return mappedItems;
  }),
  getOutgoingShareRequests: protectedUserProcedure.query(async ({ ctx }) => {
    const sharedItems = await ctx.db.query.shareRequest.findMany({
      where: {
        ownerId: ctx.userId,
        parentShareId: {
          isNull: true,
        },
      },
      with: {
        childShareRequests: true,
        sharedWith: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const mappedItems = (
      await Promise.all(
        sharedItems.map(async (sharedItem) => {
          if (sharedItem.itemType === "game") {
            const returnedGame = await ctx.db.query.game.findFirst({
              where: {
                id: sharedItem.itemId,
                userId: sharedItem.ownerId,
              },
            });
            return {
              type: "game" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              name: returnedGame?.name,
              sharedWith: sharedItem.sharedWith?.name,
              permission: sharedItem.permission,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              token: sharedItem.token,
              id: sharedItem.id,
              matches: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "match",
              ).length,
              scoresheets: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "scoresheet",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
            };
          }
          if (sharedItem.itemType === "match") {
            const returnedMatch = await ctx.db.query.match.findFirst({
              where: {
                id: sharedItem.itemId,
                userId: sharedItem.ownerId,
              },
            });
            return {
              type: "match" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              id: sharedItem.id,
              name: returnedMatch?.name,
              sharedWith: sharedItem.sharedWith?.name,
              permission: sharedItem.permission,
              token: sharedItem.token,
              game: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "game",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
            };
          }
          if (sharedItem.itemType === "player") {
            const returnedPlayer = await ctx.db.query.player.findFirst({
              where: {
                id: sharedItem.itemId,
                userId: sharedItem.ownerId,
              },
            });
            return {
              type: "player" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              id: sharedItem.id,
              name: returnedPlayer?.name,
              sharedWith: sharedItem.sharedWith?.name,
              permission: sharedItem.permission,
              token: sharedItem.token,
              matches: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "match",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
            };
          }
          return null;
        }),
      )
    ).filter((item) => item !== null);
    return mappedItems;
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
        where: {
          id: input.sharedPlayerId,
        },
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
          where: {
            id: input.linkedPlayerId,
            createdBy: ctx.userId,
          },
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
        where: {
          id: input.sharedGameId,
        },
      });

      if (!sharedGameEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared game not found.",
        });
      }

      if (input.linkedGameId) {
        const gameEntry = await ctx.db.query.game.findFirst({
          where: {
            id: input.linkedGameId,
            userId: ctx.userId,
          },
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
