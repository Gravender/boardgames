import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { subDays } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";

import type { TransactionType } from "@board-games/db/client";
import type {
  selectSharedGameSchema,
  selectSharedLocationSchema,
  selectSharedMatchSchema,
  selectSharedPlayerSchema,
} from "@board-games/db/zodSchema";
import {
  game,
  sharedGame,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  sharedScoresheet,
  shareRequest,
} from "@board-games/db/schema";

import { scoresheetRepository } from "../../routers/scoresheet/repository/scoresheet.repository";
import { protectedUserProcedure } from "../../trpc";
import {
  createSharedScoresheetWithRounds,
  handleLocationSharing,
} from "../../utils/sharing";

export const shareRequestRouter = {
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
                    id: z.string(),
                  }),
                )
                .min(1),
            }),
          ]),
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (tx) => {
        const [returnedGame] = await tx
          .select()
          .from(game)
          .where(
            and(eq(game.id, input.gameId), eq(game.createdBy, ctx.userId)),
          );
        if (!returnedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared Game not found",
          });
        }
        if (input.type === "link") {
          // Insert new share request
          const [newShare] = await tx
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
            const returnedMatch = await tx.query.match.findFirst({
              where: {
                id: matchToShare.matchId,
                createdBy: ctx.userId,
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

            if (returnedMatch.locationId) {
              await tx.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: null,
                itemType: "location",
                itemId: returnedMatch.locationId,
                permission: matchToShare.permission,
                parentShareId: newShare.id,
                expiresAt: input.expiresAt ?? null,
              });
            }

            await tx.insert(shareRequest).values({
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
                await tx.insert(shareRequest).values({
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
            await tx.insert(shareRequest).values({
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
            const result2 = await requestShareGameToFriend(
              tx,
              friendToShareTo,
              shareMessages,
              ctx.userId,
              input,
              returnedGame,
            );
            if (!result2) {
              continue;
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
      });
      return response;
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
                    id: z.string(),
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
            createdBy: ctx.userId,
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

          if (returnedMatch.locationId) {
            await tx.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "location",
              itemId: returnedMatch.locationId,
              permission: newShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
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
              createdBy: ctx.userId,
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
            const result2 = await tx.transaction(async (tx2) => {
              const validationResult = await validateFriendSharingPermissions(
                tx2,
                ctx.userId,
                friendToShareTo.id,
              );

              if (!validationResult.success) {
                shareMessages.push({
                  success: false,
                  message: validationResult.message,
                });
                return false;
              }
              const returnedFriend = validationResult.friend;

              const friendSettings = await tx2.query.friendSetting.findFirst({
                where: {
                  createdById: returnedFriend.userId,
                  friendId: returnedFriend.id,
                },
              });
              const existingShare = await tx2.query.shareRequest.findFirst({
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
              if (existingShare?.status === "pending") {
                shareMessages.push({
                  success: false,
                  message: "There is already a pending share",
                });
                return false;
              }
              if (existingShare?.status === "accepted") {
                shareMessages.push({
                  success: false,
                  message: "This has already been accepted",
                });
                return false;
              }
              const [newShare] = await tx2
                .insert(shareRequest)
                .values({
                  ownerId: ctx.userId,
                  sharedWithId: friendToShareTo.id,
                  itemType: "match",
                  itemId: input.matchId,
                  permission: input.permission,
                  status: friendSettings?.autoAcceptMatches
                    ? "accepted"
                    : "pending",
                  expiresAt: input.expiresAt ?? null,
                })
                .returning();
              if (!newShare) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to generate share.",
                });
              }
              let returnedSharedLocation: z.infer<
                typeof selectSharedLocationSchema
              > | null = null;

              if (returnedMatch.locationId) {
                returnedSharedLocation = await handleLocationSharing(
                  tx2,
                  ctx.userId,
                  returnedMatch.locationId,
                  friendToShareTo.id,
                  friendSettings?.defaultPermissionForLocation ??
                    input.permission,
                  friendSettings?.autoAcceptLocation ?? false,
                  newShare.id,
                  input.expiresAt,
                );
              }

              const returnedSharedGameRequest =
                await tx2.query.shareRequest.findFirst({
                  where: {
                    itemId: returnedMatch.gameId,
                    itemType: "game",
                    ownerId: ctx.userId,
                    sharedWithId: friendToShareTo.id,
                    status: "accepted",
                  },
                });

              let returnedShareGame: z.infer<
                typeof selectSharedGameSchema
              > | null = null;
              if (!returnedSharedGameRequest) {
                await tx2.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  sharedWithId: friendToShareTo.id,
                  itemType: "game",
                  itemId: returnedMatch.gameId,
                  status: friendSettings?.autoAcceptMatches
                    ? "accepted"
                    : "pending",
                  permission: input.permission,
                  expiresAt: input.expiresAt ?? null,
                  parentShareId: newShare.id,
                });
                if (friendSettings?.autoAcceptMatches) {
                  const existingSharedGame =
                    await tx2.query.sharedGame.findFirst({
                      where: {
                        gameId: returnedMatch.gameId,
                        sharedWithId: friendToShareTo.id,
                        ownerId: ctx.userId,
                      },
                    });
                  if (!existingSharedGame) {
                    const [createdSharedGame] = await tx2
                      .insert(sharedGame)
                      .values({
                        ownerId: ctx.userId,
                        sharedWithId: friendToShareTo.id,
                        gameId: returnedMatch.gameId,
                        permission: friendSettings.defaultPermissionForGame,
                      })
                      .returning();
                    if (!createdSharedGame) {
                      throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to generate share.",
                      });
                    }
                    returnedShareGame = createdSharedGame;
                  }
                }
                const gamesScoreSheets = await tx2.query.scoresheet.findMany({
                  where: {
                    gameId: returnedMatch.gameId,
                    createdBy: ctx.userId,
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
                  await tx2.insert(shareRequest).values({
                    ownerId: ctx.userId,
                    sharedWithId: null,
                    itemType: "scoresheet",
                    itemId: defaultScoreSheet.id,
                    permission: input.permission,
                    status: friendSettings?.autoAcceptMatches
                      ? "accepted"
                      : "pending",
                    expiresAt: input.expiresAt ?? null,
                    parentShareId: newShare.id,
                  });
                  if (friendSettings?.autoAcceptMatches) {
                    const existingSharedScoresheet =
                      await tx2.query.sharedScoresheet.findFirst({
                        where: {
                          scoresheetId: defaultScoreSheet.id,
                          sharedWithId: friendToShareTo.id,
                          ownerId: ctx.userId,
                        },
                      });
                    if (!existingSharedScoresheet && returnedShareGame) {
                      const returnedScoresheet =
                        await tx2.query.scoresheet.findFirst({
                          where: {
                            id: defaultScoreSheet.id,
                          },
                          with: {
                            rounds: true,
                          },
                        });
                      if (!returnedScoresheet) {
                        throw new TRPCError({
                          code: "NOT_FOUND",
                          message: "Scoresheet not found.",
                        });
                      }
                      const [createdSharedScoresheet] = await tx2
                        .insert(sharedScoresheet)
                        .values({
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          scoresheetId: defaultScoreSheet.id,
                          sharedGameId: returnedShareGame.id,
                          permission:
                            friendSettings.defaultPermissionForMatches,
                          type: "game",
                        })
                        .returning();
                      if (!createdSharedScoresheet) {
                        throw new TRPCError({
                          code: "INTERNAL_SERVER_ERROR",
                          message: "Failed to generate share.",
                        });
                      }
                      const sharedScoresheetRoundsInput =
                        returnedScoresheet.rounds.map((round) => ({
                          roundId: round.id,
                          linkedRoundId: null,
                          sharedScoresheetId: createdSharedScoresheet.id,
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          permission:
                            friendSettings.defaultPermissionForMatches,
                        }));
                      if (sharedScoresheetRoundsInput.length > 0) {
                        await scoresheetRepository.insertSharedRounds(
                          { input: sharedScoresheetRoundsInput },
                          tx2,
                        );
                      }
                    }
                  }
                } else if (gamesScoreSheets[0]) {
                  await tx2.insert(shareRequest).values({
                    ownerId: ctx.userId,
                    sharedWithId: null,
                    itemType: "scoresheet",
                    itemId: gamesScoreSheets[0].id,
                    permission: input.permission,
                    status: friendSettings?.autoAcceptMatches
                      ? "accepted"
                      : "pending",
                    expiresAt: input.expiresAt ?? null,
                    parentShareId: newShare.id,
                  });
                  if (friendSettings?.autoAcceptMatches) {
                    const existingSharedScoresheet =
                      await tx2.query.sharedScoresheet.findFirst({
                        where: {
                          scoresheetId: gamesScoreSheets[0].id,
                          sharedWithId: friendToShareTo.id,
                          ownerId: ctx.userId,
                        },
                      });
                    if (!existingSharedScoresheet && returnedShareGame) {
                      const returnedScoresheet =
                        await tx2.query.scoresheet.findFirst({
                          where: {
                            id: gamesScoreSheets[0].id,
                          },
                          with: {
                            rounds: true,
                          },
                        });
                      if (!returnedScoresheet) {
                        throw new TRPCError({
                          code: "NOT_FOUND",
                          message: "Scoresheet not found.",
                        });
                      }
                      const [createdSharedScoresheet] = await tx2
                        .insert(sharedScoresheet)
                        .values({
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          scoresheetId: gamesScoreSheets[0].id,
                          sharedGameId: returnedShareGame.id,
                          permission:
                            friendSettings.defaultPermissionForMatches,
                          type: "game",
                        })
                        .returning();
                      if (!createdSharedScoresheet) {
                        throw new TRPCError({
                          code: "INTERNAL_SERVER_ERROR",
                          message: "Failed to generate share.",
                        });
                      }
                      const sharedScoresheetRoundsInput =
                        returnedScoresheet.rounds.map((round) => ({
                          roundId: round.id,
                          linkedRoundId: null,
                          sharedScoresheetId: createdSharedScoresheet.id,
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          permission:
                            friendSettings.defaultPermissionForMatches,
                        }));
                      if (sharedScoresheetRoundsInput.length > 0) {
                        await scoresheetRepository.insertSharedRounds(
                          { input: sharedScoresheetRoundsInput },
                          tx2,
                        );
                      }
                    }
                  }
                }
              } else {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message:
                    "Expected share game request not found, but scoresheet creation requires it",
                });
              }
              let returnedSharedMatch: z.infer<
                typeof selectSharedMatchSchema
              > | null = null;
              if (returnedShareGame && friendSettings?.autoAcceptMatches) {
                const returnedMatch = await tx2.query.match.findFirst({
                  where: {
                    id: input.matchId,
                    createdBy: ctx.userId,
                  },
                });
                if (!returnedMatch) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Match not found.",
                  });
                }
                const existingSharedMatch =
                  await tx2.query.sharedMatch.findFirst({
                    where: {
                      matchId: input.matchId,
                      sharedWithId: friendToShareTo.id,
                      ownerId: ctx.userId,
                    },
                  });
                if (!existingSharedMatch) {
                  const returnedScoresheet =
                    await tx2.query.scoresheet.findFirst({
                      where: {
                        id: returnedMatch.scoresheetId,
                        createdBy: returnedMatch.createdBy,
                      },
                      with: {
                        rounds: true,
                      },
                    });
                  if (!returnedScoresheet) {
                    throw new TRPCError({
                      code: "NOT_FOUND",
                      message: "Scoresheet not found.",
                    });
                  }
                  const [createdSharedScoresheet] = await tx2
                    .insert(sharedScoresheet)
                    .values({
                      ownerId: ctx.userId,
                      sharedWithId: friendToShareTo.id,
                      scoresheetId: returnedMatch.scoresheetId,
                      permission: friendSettings.defaultPermissionForMatches,
                      sharedGameId: returnedShareGame.id,
                      type: "match",
                    })
                    .returning();
                  if (!createdSharedScoresheet) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to generate share.",
                    });
                  }
                  const sharedScoresheetRoundsInput =
                    returnedScoresheet.rounds.map((round) => ({
                      roundId: round.id,
                      linkedRoundId: null,
                      sharedScoresheetId: createdSharedScoresheet.id,
                      ownerId: ctx.userId,
                      sharedWithId: friendToShareTo.id,
                      permission: friendSettings.defaultPermissionForMatches,
                    }));
                  if (sharedScoresheetRoundsInput.length > 0) {
                    await scoresheetRepository.insertSharedRounds(
                      { input: sharedScoresheetRoundsInput },
                      tx2,
                    );
                  }
                  const [createdSharedMatch] = await tx2
                    .insert(sharedMatch)
                    .values({
                      ownerId: ctx.userId,
                      sharedWithId: friendToShareTo.id,
                      sharedGameId: returnedShareGame.id,
                      matchId: input.matchId,
                      sharedScoresheetId: createdSharedScoresheet.id,
                      permission: friendSettings.defaultPermissionForMatches,
                      sharedLocationId: returnedSharedLocation?.id ?? undefined,
                    })
                    .returning();
                  if (!createdSharedMatch) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to generate share.",
                    });
                  }
                  returnedSharedMatch = createdSharedMatch;
                } else {
                  returnedSharedMatch = existingSharedMatch;
                }
              }
              if (input.includePlayers) {
                for (const matchPlayer of returnedMatch.matchPlayers) {
                  const existingSharedMatchPlayer =
                    await tx2.query.shareRequest.findFirst({
                      where: {
                        itemId: matchPlayer.playerId,
                        itemType: "player",
                        ownerId: ctx.userId,
                        sharedWithId: friendToShareTo.id,
                        status: "accepted",
                      },
                    });
                  if (!existingSharedMatchPlayer) {
                    await tx2.insert(shareRequest).values({
                      ownerId: ctx.userId,
                      sharedWithId: friendToShareTo.id,
                      itemType: "player",
                      itemId: matchPlayer.playerId,
                      permission: "view",
                      parentShareId: newShare.id,
                      expiresAt: input.expiresAt ?? null,
                      status: friendSettings?.autoAcceptPlayers
                        ? "accepted"
                        : "pending",
                    });
                  }
                  let returnedSharedPlayer: z.infer<
                    typeof selectSharedPlayerSchema
                  > | null = null;
                  if (friendSettings?.autoAcceptPlayers) {
                    const existingSharedPlayer =
                      await tx2.query.sharedPlayer.findFirst({
                        where: {
                          playerId: matchPlayer.playerId,
                          sharedWithId: friendToShareTo.id,
                          ownerId: ctx.userId,
                        },
                      });
                    if (!existingSharedPlayer) {
                      const [createdSharedPlayer] = await tx2
                        .insert(sharedPlayer)
                        .values({
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          playerId: matchPlayer.playerId,
                          permission:
                            friendSettings.defaultPermissionForPlayers,
                        })
                        .returning();
                      if (!createdSharedPlayer) {
                        throw new TRPCError({
                          code: "INTERNAL_SERVER_ERROR",
                          message: "Failed to generate share.",
                        });
                      }
                      returnedSharedPlayer = createdSharedPlayer;
                    } else {
                      returnedSharedPlayer = existingSharedPlayer;
                    }
                  }
                  if (returnedSharedMatch) {
                    const [returnedSharedMatchPlayer] = await tx2
                      .insert(sharedMatchPlayer)
                      .values({
                        ownerId: ctx.userId,
                        sharedWithId: friendToShareTo.id,
                        sharedMatchId: returnedSharedMatch.id,
                        sharedPlayerId: returnedSharedPlayer?.id ?? undefined,
                        matchPlayerId: matchPlayer.id,
                        permission:
                          friendSettings?.defaultPermissionForMatches ??
                          input.permission,
                      })
                      .returning();
                    if (!returnedSharedMatchPlayer) {
                      throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to generate share.",
                      });
                    }
                  }
                }
              }
              return true;
            });
            if (!result2) {
              continue;
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
                    id: z.string(),
                  }),
                )
                .min(1),
            }),
          ]),
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (tx) => {
        const returnedPlayer = await tx.query.player.findFirst({
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
          const [newShare] = await tx
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
            const returnedMatch = await tx.query.match.findFirst({
              where: {
                id: matchToShare.matchId,
                createdBy: ctx.userId,
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

            if (returnedMatch.locationId) {
              const existingShareLocation =
                await tx.query.shareRequest.findFirst({
                  where: {
                    itemId: returnedMatch.locationId,
                    itemType: "location",
                    ownerId: ctx.userId,
                    parentShareId: newShare.id,
                  },
                });
              if (!existingShareLocation) {
                await tx.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  itemType: "location",
                  itemId: returnedMatch.locationId,
                  permission: matchToShare.permission,
                  parentShareId: newShare.id,
                  expiresAt: input.expiresAt ?? null,
                });
              }
            }

            await tx.insert(shareRequest).values({
              ownerId: ctx.userId,
              sharedWithId: null,
              itemType: "match",
              itemId: matchToShare.matchId,
              permission: matchToShare.permission,
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });

            const existingShareGameRequest =
              await tx.query.shareRequest.findFirst({
                where: {
                  itemId: returnedMatch.gameId,
                  itemType: "game",
                  ownerId: ctx.userId,
                  parentShareId: newShare.id,
                },
              });

            if (!existingShareGameRequest) {
              await tx.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: null,
                itemType: "game",
                itemId: returnedMatch.gameId,
                permission: matchToShare.permission,
                parentShareId: newShare.id,
                expiresAt: input.expiresAt ?? null,
              });
              const gamesScoreSheets = await tx.query.scoresheet.findMany({
                where: {
                  gameId: returnedMatch.gameId,
                  createdBy: ctx.userId,
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
                  message: "No games scoresheets found",
                });
              }
            }

            if (matchToShare.includePlayers) {
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
            const result2 = await tx.transaction(async (tx2) => {
              const recipientSettings =
                await tx2.query.userSharingPreference.findFirst({
                  where: {
                    userId: friendToShareTo.id,
                  },
                });

              if (recipientSettings?.allowSharing === "none") {
                shareMessages.push({
                  success: false,
                  message: `User ${recipientSettings.userId} does not allow sharing.`,
                });
                return false;
              }
              const returnedFriend = await tx2.query.friend.findFirst({
                where: {
                  friendId: ctx.userId,
                  userId: friendToShareTo.id,
                },
              });
              if (!returnedFriend) {
                shareMessages.push({
                  success: false,
                  message: `User ${friendToShareTo.id} does not exist.`,
                });
                return false;
              }
              const friendSettings = await tx2.query.friendSetting.findFirst({
                where: {
                  createdById: returnedFriend.userId,
                  friendId: returnedFriend.id,
                },
              });
              if (friendSettings?.allowSharedGames === false) {
                shareMessages.push({
                  success: false,
                  message: `User ${friendToShareTo.id} does not allow sharing games with you.`,
                });
                return false;
              }
              const existingShare = await tx2.query.shareRequest.findFirst({
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

              if (existingShare?.status === "pending") {
                shareMessages.push({
                  success: false,
                  message: "There is already a pending share",
                });
                return false;
              }
              if (existingShare?.status === "accepted") {
                shareMessages.push({
                  success: false,
                  message: "This has already been accepted",
                });
                return false;
              }
              const [newShare] = await tx2
                .insert(shareRequest)
                .values({
                  ownerId: ctx.userId,
                  sharedWithId: friendToShareTo.id,
                  itemType: "player",
                  itemId: input.playerId,
                  permission: input.permission,
                  status: friendSettings?.autoAcceptPlayers
                    ? "accepted"
                    : "pending",
                  expiresAt: input.expiresAt ?? null,
                })
                .returning();
              if (!newShare) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to generate share.",
                });
              }

              if (friendSettings?.autoAcceptPlayers) {
                const existingSharedPlayer =
                  await tx2.query.sharedPlayer.findFirst({
                    where: {
                      playerId: input.playerId,
                      sharedWithId: friendToShareTo.id,
                      ownerId: ctx.userId,
                    },
                  });
                if (!existingSharedPlayer) {
                  const [createdSharedPlayer] = await tx2
                    .insert(sharedPlayer)
                    .values({
                      ownerId: ctx.userId,
                      sharedWithId: friendToShareTo.id,
                      playerId: input.playerId,
                      permission: friendSettings.defaultPermissionForPlayers,
                    })
                    .returning();
                  if (!createdSharedPlayer) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to generate share.",
                    });
                  }
                }
              }
              for (const matchToShare of input.sharedMatches) {
                const returnedMatch = await tx2.query.match.findFirst({
                  where: {
                    id: matchToShare.matchId,
                    createdBy: ctx.userId,
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

                const existingMatchShare =
                  await tx2.query.shareRequest.findFirst({
                    where: {
                      itemId: matchToShare.matchId,
                      itemType: "match",
                      ownerId: ctx.userId,
                      sharedWithId: friendToShareTo.id,
                      status: "accepted",
                    },
                  });
                if (existingMatchShare) {
                  shareMessages.push({
                    success: false,
                    message: `Match ${matchToShare.matchId} already shared.`,
                  });
                  continue;
                }
                await tx2.insert(shareRequest).values({
                  ownerId: ctx.userId,
                  sharedWithId: friendToShareTo.id,
                  itemType: "match",
                  itemId: matchToShare.matchId,
                  permission: matchToShare.permission,
                  status: friendSettings?.autoAcceptMatches
                    ? "accepted"
                    : "pending",
                  parentShareId: newShare.id,
                  expiresAt: input.expiresAt ?? null,
                });

                let returnedSharedLocation: z.infer<
                  typeof selectSharedLocationSchema
                > | null = null;
                if (returnedMatch.locationId) {
                  returnedSharedLocation = await handleLocationSharing(
                    tx2,
                    ctx.userId,
                    returnedMatch.locationId,
                    friendToShareTo.id,
                    friendSettings?.defaultPermissionForLocation ??
                      input.permission,
                    friendSettings?.autoAcceptLocation ?? false,
                    newShare.id,
                    input.expiresAt ?? null,
                  );
                }

                const existingShareGameRequest =
                  await tx2.query.shareRequest.findFirst({
                    where: {
                      OR: [
                        {
                          itemId: returnedMatch.gameId,
                          itemType: "game",
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          parentShareId: newShare.id,
                        },
                        {
                          itemId: returnedMatch.gameId,
                          itemType: "game",
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          status: "accepted",
                        },
                      ],
                    },
                  });
                let returnedSharedGame: z.infer<
                  typeof selectSharedGameSchema
                > | null = null;
                if (!existingShareGameRequest) {
                  await tx2.insert(shareRequest).values({
                    ownerId: ctx.userId,
                    sharedWithId: friendToShareTo.id,
                    itemType: "game",
                    itemId: returnedMatch.gameId,
                    permission:
                      friendSettings?.defaultPermissionForGame ??
                      matchToShare.permission,
                    status: friendSettings?.autoAcceptMatches
                      ? "accepted"
                      : "pending",
                    parentShareId: newShare.id,
                    expiresAt: input.expiresAt ?? null,
                  });
                  if (friendSettings?.autoAcceptMatches) {
                    const existingSharedGame =
                      await tx2.query.sharedGame.findFirst({
                        where: {
                          gameId: returnedMatch.gameId,
                          sharedWithId: friendToShareTo.id,
                          ownerId: ctx.userId,
                        },
                      });
                    if (!existingSharedGame) {
                      const [createdSharedGame] = await tx2
                        .insert(sharedGame)
                        .values({
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          gameId: returnedMatch.gameId,
                          permission: friendSettings.defaultPermissionForGame,
                        })
                        .returning();
                      if (!createdSharedGame) {
                        throw new TRPCError({
                          code: "INTERNAL_SERVER_ERROR",
                          message: "Failed to generate share.",
                        });
                      }
                      returnedSharedGame = createdSharedGame;
                    } else {
                      returnedSharedGame = existingSharedGame;
                    }
                  }
                  const gamesScoreSheets = await tx2.query.scoresheet.findMany({
                    where: {
                      gameId: returnedMatch.gameId,
                      createdBy: ctx.userId,
                      OR: [{ type: "Default" }, { type: "Game" }],
                    },
                  });
                  const defaultScoreSheet = gamesScoreSheets.find(
                    (sheet) => sheet.type === "Default",
                  );
                  if (defaultScoreSheet) {
                    const existingShareScoresheet =
                      await tx2.query.shareRequest.findFirst({
                        where: {
                          itemId: defaultScoreSheet.id,
                          itemType: "scoresheet",
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          parentShareId: newShare.id,
                        },
                      });
                    if (!existingShareScoresheet) {
                      await tx2.insert(shareRequest).values({
                        ownerId: ctx.userId,
                        sharedWithId: friendToShareTo.id,
                        itemType: "scoresheet",
                        itemId: defaultScoreSheet.id,
                        permission: input.permission,
                        status: friendSettings?.autoAcceptMatches
                          ? "accepted"
                          : "pending",
                        expiresAt: input.expiresAt ?? null,
                        parentShareId: newShare.id,
                      });
                      if (
                        friendSettings?.autoAcceptMatches &&
                        returnedSharedGame
                      ) {
                        const existingSharedScoresheet =
                          await tx2.query.sharedScoresheet.findFirst({
                            where: {
                              scoresheetId: defaultScoreSheet.id,
                              sharedWithId: friendToShareTo.id,
                              ownerId: ctx.userId,
                            },
                          });
                        if (!existingSharedScoresheet) {
                          const returnedScoresheet =
                            await tx2.query.scoresheet.findFirst({
                              where: {
                                id: defaultScoreSheet.id,
                              },
                              with: {
                                rounds: true,
                              },
                            });
                          if (!returnedScoresheet) {
                            throw new TRPCError({
                              code: "NOT_FOUND",
                              message: "Scoresheet not found.",
                            });
                          }
                          const [createdSharedScoresheet] = await tx2
                            .insert(sharedScoresheet)
                            .values({
                              ownerId: ctx.userId,
                              sharedWithId: friendToShareTo.id,
                              scoresheetId: defaultScoreSheet.id,
                              sharedGameId: returnedSharedGame.id,
                              permission:
                                friendSettings.defaultPermissionForMatches,
                              type: "game",
                            })
                            .returning();
                          if (!createdSharedScoresheet) {
                            throw new TRPCError({
                              code: "INTERNAL_SERVER_ERROR",
                              message: "Failed to generate share.",
                            });
                          }
                          const sharedScoresheetRoundsInput =
                            returnedScoresheet.rounds.map((round) => ({
                              roundId: round.id,
                              linkedRoundId: null,
                              sharedScoresheetId: createdSharedScoresheet.id,
                              ownerId: ctx.userId,
                              sharedWithId: friendToShareTo.id,
                              permission:
                                friendSettings.defaultPermissionForMatches,
                            }));
                          if (sharedScoresheetRoundsInput.length > 0) {
                            await scoresheetRepository.insertSharedRounds(
                              { input: sharedScoresheetRoundsInput },
                              tx2,
                            );
                          }
                        }
                      }
                    }
                  } else if (gamesScoreSheets[0]) {
                    const existingShareScoresheet =
                      await tx2.query.shareRequest.findFirst({
                        where: {
                          itemId: gamesScoreSheets[0].id,
                          itemType: "scoresheet",
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          parentShareId: newShare.id,
                        },
                      });
                    if (!existingShareScoresheet) {
                      await tx2.insert(shareRequest).values({
                        ownerId: ctx.userId,
                        sharedWithId: friendToShareTo.id,
                        itemType: "scoresheet",
                        itemId: gamesScoreSheets[0].id,
                        permission: input.permission,
                        status: friendSettings?.autoAcceptMatches
                          ? "accepted"
                          : "pending",
                        expiresAt: input.expiresAt ?? null,
                        parentShareId: newShare.id,
                      });
                      if (
                        friendSettings?.autoAcceptMatches &&
                        returnedSharedGame
                      ) {
                        const existingSharedScoresheet =
                          await tx2.query.sharedScoresheet.findFirst({
                            where: {
                              scoresheetId: gamesScoreSheets[0].id,
                              sharedWithId: friendToShareTo.id,
                              ownerId: ctx.userId,
                            },
                          });
                        if (!existingSharedScoresheet) {
                          const returnedScoresheet =
                            await tx2.query.scoresheet.findFirst({
                              where: {
                                id: gamesScoreSheets[0].id,
                              },
                              with: {
                                rounds: true,
                              },
                            });
                          if (!returnedScoresheet) {
                            throw new TRPCError({
                              code: "NOT_FOUND",
                              message: "Scoresheet not found.",
                            });
                          }
                          const [createdSharedScoresheet] = await tx2
                            .insert(sharedScoresheet)
                            .values({
                              ownerId: ctx.userId,
                              sharedWithId: friendToShareTo.id,
                              scoresheetId: gamesScoreSheets[0].id,
                              sharedGameId: returnedSharedGame.id,
                              permission:
                                friendSettings.defaultPermissionForMatches,
                              type: "game",
                            })
                            .returning();
                          if (!createdSharedScoresheet) {
                            throw new TRPCError({
                              code: "INTERNAL_SERVER_ERROR",
                              message: "Failed to generate share.",
                            });
                          }
                          const sharedScoresheetRoundsInput =
                            returnedScoresheet.rounds.map((round) => ({
                              roundId: round.id,
                              linkedRoundId: null,
                              sharedScoresheetId: createdSharedScoresheet.id,
                              ownerId: ctx.userId,
                              sharedWithId: friendToShareTo.id,
                              permission:
                                friendSettings.defaultPermissionForMatches,
                            }));
                          if (sharedScoresheetRoundsInput.length > 0) {
                            await scoresheetRepository.insertSharedRounds(
                              { input: sharedScoresheetRoundsInput },
                              tx2,
                            );
                          }
                        }
                      }
                    }
                  }
                }
                const returnedSharedMatch = await handleMatchSharing(
                  tx2,
                  ctx.userId,
                  friendToShareTo.id,
                  matchToShare.matchId,
                  returnedMatch.gameId,
                  returnedSharedGame,
                  returnedSharedLocation,
                  friendSettings,
                );

                if (matchToShare.includePlayers) {
                  for (const matchPlayer of returnedMatch.matchPlayers) {
                    const existingSharePlayer =
                      await tx2.query.shareRequest.findFirst({
                        where: {
                          itemId: matchPlayer.player.id,
                          itemType: "player",
                          ownerId: ctx.userId,
                          sharedWithId: friendToShareTo.id,
                          parentShareId: newShare.id,
                        },
                      });
                    let returnedSharedPlayer: z.infer<
                      typeof selectSharedPlayerSchema
                    > | null = null;
                    if (!existingSharePlayer) {
                      await tx2.insert(shareRequest).values({
                        ownerId: ctx.userId,
                        sharedWithId: friendToShareTo.id,
                        itemType: "player",
                        itemId: matchPlayer.player.id,
                        permission: "view",
                        status: friendSettings?.autoAcceptPlayers
                          ? "accepted"
                          : "pending",
                        parentShareId: newShare.id,
                        expiresAt: input.expiresAt ?? null,
                      });
                      if (friendSettings?.autoAcceptPlayers) {
                        const existingSharedPlayer =
                          await tx2.query.sharedPlayer.findFirst({
                            where: {
                              playerId: matchPlayer.player.id,
                              sharedWithId: friendToShareTo.id,
                              ownerId: ctx.userId,
                            },
                          });
                        if (!existingSharedPlayer) {
                          const [createdSharedPlayer] = await tx2
                            .insert(sharedPlayer)
                            .values({
                              ownerId: ctx.userId,
                              sharedWithId: friendToShareTo.id,
                              playerId: matchPlayer.player.id,
                              permission:
                                friendSettings.defaultPermissionForPlayers,
                            })
                            .returning();
                          if (!createdSharedPlayer) {
                            throw new TRPCError({
                              code: "INTERNAL_SERVER_ERROR",
                              message: "Failed to generate share.",
                            });
                          }
                          returnedSharedPlayer = createdSharedPlayer;
                        } else {
                          returnedSharedPlayer = existingSharedPlayer;
                        }
                      }
                      if (
                        friendSettings?.autoAcceptMatches &&
                        returnedSharedMatch
                      ) {
                        const [returnedSharedMatchPlayer] = await tx2
                          .insert(sharedMatchPlayer)
                          .values({
                            ownerId: ctx.userId,
                            sharedWithId: friendToShareTo.id,
                            sharedMatchId: returnedSharedMatch.id,
                            sharedPlayerId:
                              returnedSharedPlayer?.id ?? undefined,
                            matchPlayerId: matchPlayer.id,
                            permission:
                              friendSettings.defaultPermissionForMatches,
                          })
                          .returning();
                        if (!returnedSharedMatchPlayer) {
                          throw new TRPCError({
                            code: "INTERNAL_SERVER_ERROR",
                            message: "Failed to generate share.",
                          });
                        }
                      }
                    }
                  }
                }
              }
              return true;
            });
            if (!result2) {
              continue;
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
      });
      return response;
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
} satisfies TRPCRouterRecord;

async function requestShareGameToFriend(
  transaction: TransactionType,
  friendToShareTo: { id: string },
  shareMessages: { success: boolean; message: string }[],
  userId: string,
  input: {
    gameId: number;
    permission: "view" | "edit";
    sharedMatches: {
      matchId: number;
      permission: "view" | "edit";
      includePlayers: boolean;
    }[];
    scoresheetsToShare: { scoresheetId: number; permission: "view" | "edit" }[];
    expiresAt?: Date | undefined;
  } & { type: "friends"; friends: { id: string }[] },
  returnedGame: {
    id: number;
  },
) {
  return await transaction.transaction(async (tx2) => {
    const validationResult = await validateFriendSharingPermissions(
      tx2,
      userId,
      friendToShareTo.id,
    );

    if (!validationResult.success) {
      shareMessages.push({
        success: false,
        message: validationResult.message,
      });
      return false;
    }

    const returnedFriend = validationResult.friend;
    const friendSettings = await tx2.query.friendSetting.findFirst({
      where: {
        createdById: returnedFriend.userId,
        friendId: returnedFriend.id,
      },
    });
    if (friendSettings?.allowSharedGames === false) {
      shareMessages.push({
        success: false,
        message: `User ${friendToShareTo.id} does not allow sharing games with you.`,
      });
      return false;
    }

    if (
      await hasExistingShare(
        tx2,
        userId,
        friendToShareTo.id,
        "game",
        input.gameId,
      )
    ) {
      shareMessages.push({
        success: false,
        message: "Already shared or pending",
      });
      return false;
    }
    const parentShare = await createGameShareRequest(
      tx2,
      userId,
      friendToShareTo.id,
      input,
      friendSettings,
    );

    for (const matchToShare of input.sharedMatches) {
      const error = await sharedMatchWithFriends(
        tx2,
        userId,
        matchToShare,
        friendToShareTo.id,
        parentShare,
        friendSettings,
      );

      if (error) {
        shareMessages.push({
          success: error.success,
          message: error.message,
        });
      }
    }

    await shareScoresheetsWithFriend(
      tx2,
      userId,
      friendToShareTo.id,
      returnedGame.id,
      input.scoresheetsToShare,
      parentShare.id,
      friendSettings?.autoAcceptGame ?? false,
      input.expiresAt ?? null,
    );
    return true;
  });
}
async function validateFriendSharingPermissions(
  transaction: TransactionType,
  currentUserId: string,
  friendId: string,
) {
  // Check sharing preferences
  const recipientSettings =
    await transaction.query.userSharingPreference.findFirst({
      where: { userId: friendId },
    });

  if (recipientSettings?.allowSharing === "none") {
    return {
      success: false as const,
      message: `User ${recipientSettings.userId} does not allow sharing.`,
    };
  }

  // Check friend relationship exists
  const returnedFriend = await transaction.query.friend.findFirst({
    where: {
      friendId: currentUserId,
      userId: friendId,
    },
  });

  if (!returnedFriend) {
    return {
      success: false as const,
      message: `User ${friendId} does not exist.`,
    };
  }

  return {
    success: true as const,
    friend: returnedFriend,
  };
}
async function hasExistingShare(
  transaction: TransactionType,
  userId: string,
  friendId: string,
  itemType: "game" | "match" | "player" | "location" | "scoresheet",
  itemId: number,
) {
  const existingShare = await transaction.query.shareRequest.findFirst({
    where: {
      itemType: itemType,
      itemId: itemId,
      ownerId: userId,
      sharedWithId: friendId,
      OR: [
        { status: "accepted" },
        {
          status: "pending",
          createdAt: {
            gt: subDays(new Date(), 7),
          },
          parentShareId: {
            isNull: true,
          },
        },
      ],
    },
  });
  if (existingShare) {
    return true;
  }
  return false;
}
async function createGameShareRequest(
  transaction: TransactionType,
  userId: string,
  friendId: string,
  input: {
    gameId: number;
    permission: "view" | "edit";
    expiresAt?: Date;
  },
  friendSettings:
    | {
        id: number;
        createdById: string;
        friendId: number;
        autoShareMatches: boolean;
        sharePlayersWithMatch: boolean;
        includeLocationWithMatch: boolean;
        defaultPermissionForMatches: "view" | "edit";
        defaultPermissionForPlayers: "view" | "edit";
        defaultPermissionForLocation: "view" | "edit";
        defaultPermissionForGame: "view" | "edit";
        allowSharedPlayers: boolean;
        allowSharedLocation: boolean;
        autoAcceptMatches: boolean;
        autoAcceptPlayers: boolean;
        autoAcceptLocation: boolean;
        autoAcceptGame: boolean;
      }
    | undefined,
) {
  const [newShare] = await transaction
    .insert(shareRequest)
    .values({
      ownerId: userId,
      sharedWithId: friendId,
      itemType: "game",
      itemId: input.gameId,
      status: friendSettings?.autoAcceptGame ? "accepted" : "pending",
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
  if (friendSettings?.autoAcceptGame) {
    const existingSharedGame = await transaction.query.sharedGame.findFirst({
      where: {
        sharedWithId: friendId,
        ownerId: userId,
        gameId: input.gameId,
      },
    });
    if (!existingSharedGame) {
      const [createdSharedGame] = await transaction
        .insert(sharedGame)
        .values({
          ownerId: userId,
          sharedWithId: friendId,
          gameId: input.gameId,
          permission: friendSettings.defaultPermissionForGame,
        })
        .returning();
      if (!createdSharedGame) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }
    }
  }
  return newShare;
}
async function sharedMatchWithFriends(
  transaction: TransactionType,
  userId: string,
  matchToShare: {
    matchId: number;
    permission: "view" | "edit";
    includePlayers: boolean;
  },
  friendId: string,
  parentShare: {
    id: number;
    permission: "view" | "edit";
    expiresAt: Date | null;
  },
  friendSettings:
    | {
        id: number;
        createdById: string;
        friendId: number;
        autoShareMatches: boolean;
        sharePlayersWithMatch: boolean;
        includeLocationWithMatch: boolean;
        defaultPermissionForMatches: "view" | "edit";
        defaultPermissionForPlayers: "view" | "edit";
        defaultPermissionForLocation: "view" | "edit";
        defaultPermissionForGame: "view" | "edit";
        allowSharedPlayers: boolean;
        allowSharedLocation: boolean;
        autoAcceptMatches: boolean;
        autoAcceptPlayers: boolean;
        autoAcceptLocation: boolean;
        autoAcceptGame: boolean;
      }
    | undefined,
) {
  const returnedMatch = await transaction.query.match.findFirst({
    where: {
      id: matchToShare.matchId,
      createdBy: userId,
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
    return {
      success: false as const,
      message: `Match ${matchToShare.matchId} not found.`,
    };
  }
  let returnedSharedLocation: z.infer<
    typeof selectSharedLocationSchema
  > | null = null;

  if (returnedMatch.locationId) {
    returnedSharedLocation = await handleLocationSharing(
      transaction,
      userId,
      returnedMatch.locationId,
      friendId,
      friendSettings?.defaultPermissionForLocation ?? parentShare.permission,
      friendSettings?.autoAcceptLocation ?? false,
      parentShare.id,
      parentShare.expiresAt,
    );
  }

  await transaction.insert(shareRequest).values({
    ownerId: userId,
    sharedWithId: friendId,
    itemType: "match",
    itemId: matchToShare.matchId,
    permission: matchToShare.permission,
    parentShareId: parentShare.id,
    expiresAt: parentShare.expiresAt,
  });
  let returnedShareMatch: z.infer<typeof selectSharedMatchSchema> | null = null;
  if (friendSettings?.autoAcceptMatches) {
    const existingSharedMatch = await transaction.query.sharedMatch.findFirst({
      where: {
        matchId: matchToShare.matchId,
        sharedWithId: friendId,
        ownerId: userId,
      },
    });
    const returnedSharedGame = await transaction.query.sharedGame.findFirst({
      where: {
        id: returnedMatch.gameId,
        sharedWithId: friendId,
        ownerId: userId,
      },
      columns: {
        id: true,
      },
    });
    if (!existingSharedMatch && returnedSharedGame) {
      const createdSharedScoresheet = await createSharedScoresheetWithRounds(
        transaction,
        returnedMatch.scoresheetId,
        returnedMatch.createdBy,
        userId,
        friendId,
        friendSettings.defaultPermissionForMatches,
        returnedSharedGame.id,
        "match",
      );
      const [createdSharedMatch] = await transaction
        .insert(sharedMatch)
        .values({
          ownerId: userId,
          sharedWithId: friendId,
          sharedGameId: returnedSharedGame.id,
          matchId: matchToShare.matchId,
          sharedLocationId: returnedSharedLocation?.id ?? undefined,
          sharedScoresheetId: createdSharedScoresheet.id,
          permission: friendSettings.defaultPermissionForMatches,
        })
        .returning();
      if (!createdSharedMatch) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }
      returnedShareMatch = createdSharedMatch;
    }
  }

  if (matchToShare.includePlayers) {
    for (const matchPlayer of returnedMatch.matchPlayers) {
      const existingSharedMatchPlayer =
        await transaction.query.shareRequest.findFirst({
          where: {
            itemId: matchPlayer.player.id,
            itemType: "player",
            ownerId: userId,
            sharedWithId: friendId,
            status: "accepted",
          },
        });
      if (!existingSharedMatchPlayer) {
        await transaction.insert(shareRequest).values({
          ownerId: userId,
          sharedWithId: friendId,
          itemType: "player",
          itemId: matchPlayer.player.id,
          permission: "view",
          parentShareId: parentShare.id,
          status: friendSettings?.autoAcceptPlayers ? "accepted" : "pending",
          expiresAt: parentShare.expiresAt,
        });
        let returnedSharePlayer: z.infer<
          typeof selectSharedPlayerSchema
        > | null = null;
        if (friendSettings?.autoAcceptPlayers) {
          const existingSharedPlayer =
            await transaction.query.sharedPlayer.findFirst({
              where: {
                playerId: matchPlayer.player.id,
                sharedWithId: friendId,
                ownerId: userId,
              },
            });
          if (!existingSharedPlayer) {
            const [createdSharePlayer] = await transaction
              .insert(sharedPlayer)
              .values({
                ownerId: userId,
                sharedWithId: friendId,
                playerId: matchPlayer.player.id,
                permission: friendSettings.defaultPermissionForPlayers,
              })
              .returning();
            if (!createdSharePlayer) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to generate share.",
              });
            }
            returnedSharePlayer = createdSharePlayer;
          } else {
            returnedSharePlayer = existingSharedPlayer;
          }
        }
        if (returnedShareMatch) {
          const [returnedSharedMatchPlayer] = await transaction
            .insert(sharedMatchPlayer)
            .values({
              ownerId: userId,
              sharedWithId: friendId,
              sharedMatchId: returnedShareMatch.id,
              sharedPlayerId: returnedSharePlayer?.id ?? undefined,
              matchPlayerId: matchPlayer.id,
              permission:
                friendSettings?.defaultPermissionForMatches ??
                parentShare.permission,
            })
            .returning();
          if (!returnedSharedMatchPlayer) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to generate share.",
            });
          }
        }
      }
    }
  }
  return null;
}
async function handleMatchSharing(
  transaction: TransactionType,
  ownerId: string,
  friendId: string,
  matchId: number,
  gameId: number,
  sharedGame: {
    id: number;
    createdAt: Date;
    updatedAt: Date | null;
    gameId: number;
    ownerId: string;
    sharedWithId: string;
    linkedGameId: number | null;
    permission: "view" | "edit";
  } | null,
  sharedLocation: {
    id: number;
    createdAt: Date;
    updatedAt: Date | null;
    isDefault: boolean;
    locationId: number;
    ownerId: string;
    sharedWithId: string;
    permission: "view" | "edit";
    linkedLocationId: number | null;
  } | null,
  friendSettings:
    | {
        id: number;
        createdById: string;
        friendId: number;
        autoShareMatches: boolean;
        sharePlayersWithMatch: boolean;
        includeLocationWithMatch: boolean;
        defaultPermissionForMatches: "view" | "edit";
        defaultPermissionForPlayers: "view" | "edit";
        defaultPermissionForLocation: "view" | "edit";
        defaultPermissionForGame: "view" | "edit";
        allowSharedPlayers: boolean;
        allowSharedLocation: boolean;
        autoAcceptMatches: boolean;
        autoAcceptPlayers: boolean;
        autoAcceptLocation: boolean;
        autoAcceptGame: boolean;
      }
    | undefined,
) {
  // Skip if auto-accept not enabled
  if (!friendSettings?.autoAcceptMatches) {
    return null;
  }

  //check for match
  const returnedMatch = await transaction.query.match.findFirst({
    where: {
      id: matchId,
      createdBy: ownerId,
    },
  });

  if (!returnedMatch) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Match not found.",
    });
  }

  // Check for existing shared match
  const existingSharedMatch = await transaction.query.sharedMatch.findFirst({
    where: {
      matchId: matchId,
      sharedWithId: friendId,
      ownerId: ownerId,
    },
  });

  if (existingSharedMatch) {
    return existingSharedMatch;
  }

  // Ensure we have a shared game reference
  let sharedGameRef = sharedGame;
  if (!sharedGameRef) {
    const foundSharedGame = await transaction.query.sharedGame.findFirst({
      where: {
        gameId: gameId,
        sharedWithId: friendId,
        ownerId: ownerId,
      },
    });

    if (!foundSharedGame) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate share: shared game not found.",
      });
    }
    sharedGameRef = foundSharedGame;
  }

  // Create the shared scoresheet
  const createdSharedScoresheet = await createSharedScoresheetWithRounds(
    transaction,
    returnedMatch.scoresheetId,
    returnedMatch.createdBy,
    ownerId,
    friendId,
    friendSettings.defaultPermissionForMatches,
    sharedGameRef.id,
    "match",
  );

  // Create the shared match
  const [createdSharedMatch] = await transaction
    .insert(sharedMatch)
    .values({
      ownerId: ownerId,
      sharedWithId: friendId,
      sharedGameId: sharedGameRef.id,
      matchId: matchId,
      sharedLocationId: sharedLocation?.id,
      sharedScoresheetId: createdSharedScoresheet.id,
      permission: friendSettings.defaultPermissionForMatches,
    })
    .returning();

  if (!createdSharedMatch) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate share.",
    });
  }

  return createdSharedMatch;
}
async function shareScoresheetsWithFriend(
  transaction: TransactionType,
  userId: string,
  friendId: string,
  gameId: number,
  scoreSheets: {
    scoresheetId: number;
    permission: "view" | "edit";
  }[],
  newShareId: number,
  autoAcceptGame: boolean,
  expiresAt: Date | null,
) {
  for (const scoresheetToShare of scoreSheets) {
    await transaction.insert(shareRequest).values({
      ownerId: userId,
      sharedWithId: friendId,
      itemType: "scoresheet",
      itemId: scoresheetToShare.scoresheetId,
      permission: scoresheetToShare.permission,
      status: autoAcceptGame ? "accepted" : "pending",
      parentShareId: newShareId,
      expiresAt: expiresAt,
    });
    if (autoAcceptGame) {
      const existingSharedScoresheet =
        await transaction.query.sharedScoresheet.findFirst({
          where: {
            scoresheetId: scoresheetToShare.scoresheetId,
            sharedWithId: friendId,
            ownerId: userId,
          },
        });
      const returnedSharedGame = await transaction.query.sharedGame.findFirst({
        where: {
          gameId: gameId,
          sharedWithId: friendId,
          ownerId: userId,
        },
        columns: {
          id: true,
        },
      });
      if (!existingSharedScoresheet && returnedSharedGame) {
        const returnedScoresheet = await transaction.query.scoresheet.findFirst(
          {
            where: {
              id: scoresheetToShare.scoresheetId,
            },
          },
        );
        if (!returnedScoresheet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scoresheet not found.",
          });
        }
        await createSharedScoresheetWithRounds(
          transaction,
          scoresheetToShare.scoresheetId,
          returnedScoresheet.createdBy,
          userId,
          friendId,
          scoresheetToShare.permission,
          returnedSharedGame.id,
          "game",
        );
      }
    }
  }
}
