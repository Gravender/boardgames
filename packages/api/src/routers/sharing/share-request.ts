import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { game, shareRequest } from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../../trpc";

export const shareRequestRouter = createTRPCRouter({
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
              const existingShareScoresheet =
                await ctx.db.query.shareRequest.findFirst({
                  where: {
                    itemId: defaultScoreSheet.id,
                    itemType: "scoresheet",
                    ownerId: ctx.userId,
                    sharedWithId: friendToShareTo.id,
                    parentShareId: newShare.id,
                  },
                });
              if (!existingShareScoresheet) {
                await ctx.db.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  sharedWithId: friendToShareTo.id,
                  itemType: "scoresheet",
                  itemId: defaultScoreSheet.id,
                  permission: input.permission,
                  expiresAt: input.expiresAt ?? null,
                  parentShareId: newShare.id,
                });
              }
            } else if (gamesScoreSheets[0]) {
              const existingShareScoresheet =
                await ctx.db.query.shareRequest.findFirst({
                  where: {
                    itemId: gamesScoreSheets[0].id,
                    itemType: "scoresheet",
                    ownerId: ctx.userId,
                    sharedWithId: friendToShareTo.id,
                    parentShareId: newShare.id,
                  },
                });
              if (!existingShareScoresheet) {
                await ctx.db.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  sharedWithId: friendToShareTo.id,
                  itemType: "scoresheet",
                  itemId: gamesScoreSheets[0].id,
                  permission: input.permission,
                  expiresAt: input.expiresAt ?? null,
                  parentShareId: newShare.id,
                });
              }
            }

            if (matchToShare.includePlayers) {
              for (const matchPlayer of returnedMatch.matchPlayers) {
                const existingSharePlayer =
                  await ctx.db.query.shareRequest.findFirst({
                    where: {
                      itemId: matchPlayer.player.id,
                      itemType: "player",
                      ownerId: ctx.userId,
                      sharedWithId: friendToShareTo.id,
                      parentShareId: newShare.id,
                    },
                  });
                if (!existingSharePlayer) {
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
  rejectShareRequest: protectedUserProcedure
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
          .set({ status: "rejected" })
          .where(eq(shareRequest.id, input.requestId));
        await tx
          .update(shareRequest)
          .set({ status: "rejected" })
          .where(
            inArray(
              shareRequest.id,
              existingRequest.childShareRequests.map((child) => child.id),
            ),
          );

        return input.requestId;
      });
      return {
        id: response,
        success: true,
        message: "Share request rejected.",
      };
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
        await tx.delete(shareRequest).where(
          inArray(
            shareRequest.parentShareId,
            existingRequest.childShareRequests.map((child) => child.id),
          ),
        );
        await tx
          .delete(shareRequest)
          .where(eq(shareRequest.parentShareId, existingRequest.id));
        await tx
          .delete(shareRequest)
          .where(eq(shareRequest.id, existingRequest.id));
        return input.requestId;
      });
      return response;
    }),
});
