import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";

import type { selectSharedLocationSchema } from "@board-games/db/zodSchema";
import {
  game,
  sharedGame,
  sharedLocation,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  sharedScoresheet,
  shareRequest,
} from "@board-games/db/schema";

import { scoresheetRepository } from "../../routers/scoresheet/repository/scoresheet.repository";
import { protectedUserProcedure } from "../../trpc";
import { createSharedScoresheetWithRounds } from "../../utils/sharing";

export const shareAcceptanceRouter = {
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
        locations: z.array(
          z.object({
            sharedId: z.number(),
            accept: z.boolean(),
            linkedId: z.number().optional(),
          }),
        ),
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
              eq(game.createdBy, existingRequest.ownerId),
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
              createdBy: existingRequest.ownerId,
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
              const [createdSharedScoresheet] = await tx
                .insert(sharedScoresheet)
                .values({
                  ownerId: returnedScoresheetRequest.ownerId,
                  sharedWithId: ctx.userId,
                  scoresheetId: returnedScoresheetRequest.itemId,
                  permission: returnedScoresheetRequest.permission,
                  sharedGameId: sharedGameExists.id,
                  type: "game",
                })
                .returning();
              if (createdSharedScoresheet) {
                const sharedScoresheetRoundsInput =
                  returnedScoresheet.rounds.map((round) => ({
                    roundId: round.id,
                    linkedRoundId: null,
                    sharedScoresheetId: createdSharedScoresheet.id,
                    ownerId: returnedScoresheetRequest.ownerId,
                    sharedWithId: ctx.userId,
                    permission: returnedScoresheetRequest.permission,
                  }));
                await scoresheetRepository.insertSharedRounds(
                  { input: sharedScoresheetRoundsInput },
                  tx,
                );
              }
            }
          }
        }
        for (const locationShareRequest of input.locations) {
          const returnedLocationRequest = await tx.query.shareRequest.findFirst(
            {
              where: {
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                id: locationShareRequest.sharedId,
              },
            },
          );
          if (!returnedLocationRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Location share request not found.",
            });
          }

          const returnedLocation = await tx.query.location.findFirst({
            where: {
              id: returnedLocationRequest.itemId,
              createdBy: existingRequest.ownerId,
            },
          });
          if (!returnedLocation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Location not found.",
            });
          }
          await tx
            .update(shareRequest)
            .set({
              status: locationShareRequest.accept ? "accepted" : "rejected",
            })
            .where(eq(shareRequest.id, returnedLocationRequest.id));
          if (locationShareRequest.accept) {
            const existingShareLocation =
              await tx.query.sharedLocation.findFirst({
                where: {
                  ownerId: returnedLocationRequest.ownerId,
                  sharedWithId: ctx.userId,
                  locationId: returnedLocationRequest.itemId,
                },
              });
            if (!existingShareLocation) {
              await tx.insert(sharedLocation).values({
                ownerId: returnedLocationRequest.ownerId,
                sharedWithId: ctx.userId,
                locationId: returnedLocationRequest.itemId,
                permission: returnedLocationRequest.permission,
                linkedLocationId: locationShareRequest.linkedId,
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
              createdBy: existingRequest.ownerId,
            },
            with: {
              matchPlayers: true,
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
            let sharedMatchExists = await tx.query.sharedMatch.findFirst({
              where: {
                ownerId: returnedMatchRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: returnedMatchRequest.itemId,
              },
            });
            if (!sharedMatchExists) {
              let sharedLocationForMatch: z.infer<
                typeof selectSharedLocationSchema
              > | null = null;
              if (returnedMatch.locationId !== null) {
                const existingSharedLocation =
                  await tx.query.sharedLocation.findFirst({
                    where: {
                      ownerId: returnedMatchRequest.ownerId,
                      sharedWithId: ctx.userId,
                      locationId: returnedMatch.locationId,
                    },
                  });
                if (existingSharedLocation) {
                  sharedLocationForMatch = existingSharedLocation;
                }
              }
              const returnedSharedScoresheet =
                await createSharedScoresheetWithRounds(
                  tx,
                  returnedMatch.scoresheetId,
                  returnedMatch.createdBy,
                  returnedMatchRequest.ownerId,
                  ctx.userId,
                  returnedMatchRequest.permission,
                  sharedGameExists.id,
                  "match",
                );
              const [returnedSharedMatch] = await tx
                .insert(sharedMatch)
                .values({
                  ownerId: returnedMatchRequest.ownerId,
                  sharedWithId: ctx.userId,
                  matchId: returnedMatchRequest.itemId,
                  sharedGameId: sharedGameExists.id,
                  sharedLocationId: sharedLocationForMatch?.id ?? null,
                  sharedScoresheetId: returnedSharedScoresheet.id,
                  permission: returnedMatchRequest.permission,
                })
                .returning();
              if (!returnedSharedMatch) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Shared Match not created successfully",
                });
              }
              sharedMatchExists = returnedSharedMatch;
            }
            for (const matchPlayer of returnedMatch.matchPlayers) {
              const existingSharedMatchPlayer =
                await tx.query.sharedMatchPlayer.findFirst({
                  where: {
                    ownerId: returnedMatchRequest.ownerId,
                    sharedWithId: ctx.userId,
                    matchPlayerId: matchPlayer.id,
                    sharedMatchId: sharedMatchExists.id,
                  },
                });
              if (!existingSharedMatchPlayer) {
                const sharedMatchPlayerExists =
                  await tx.query.sharedMatchPlayer.findFirst({
                    where: {
                      ownerId: returnedMatchRequest.ownerId,
                      sharedWithId: ctx.userId,
                      matchPlayerId: matchPlayer.id,
                      sharedMatchId: sharedMatchExists.id,
                    },
                  });
                if (!sharedMatchPlayerExists) {
                  const sharedPlayerExists =
                    await tx.query.sharedPlayer.findFirst({
                      where: {
                        ownerId: returnedMatchRequest.ownerId,
                        sharedWithId: ctx.userId,
                        playerId: matchPlayer.playerId,
                      },
                    });
                  await tx.insert(sharedMatchPlayer).values({
                    ownerId: returnedMatchRequest.ownerId,
                    sharedWithId: ctx.userId,
                    matchPlayerId: matchPlayer.id,
                    sharedPlayerId: sharedPlayerExists?.id ?? undefined,
                    sharedMatchId: sharedMatchExists.id,
                    permission: returnedMatchRequest.permission,
                  });
                }
              }
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
            with: {
              matchPlayers: {
                with: {
                  sharedMatchPlayers: {
                    where: {
                      sharedPlayerId: {
                        isNull: true,
                      },
                      sharedWithId: ctx.userId,
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
              const [returnedSharedPlayer] = await tx
                .insert(sharedPlayer)
                .values({
                  ownerId: returnedPlayerRequest.ownerId,
                  sharedWithId: ctx.userId,
                  playerId: returnedPlayerRequest.itemId,
                  permission: returnedPlayerRequest.permission,
                  linkedPlayerId: playerShareRequest.linkedId,
                })
                .returning();
              if (!returnedSharedPlayer) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Shared Player not created successfully",
                });
              }
              for (const returnedSharedMatchPlayer of returnedPlayer.matchPlayers.flatMap(
                (returnedMatchPlayer) => returnedMatchPlayer.sharedMatchPlayers,
              )) {
                await tx
                  .update(sharedMatchPlayer)
                  .set({
                    sharedPlayerId: returnedSharedPlayer.id,
                  })
                  .where(
                    and(
                      eq(sharedMatchPlayer.sharedWithId, ctx.userId),
                      eq(sharedMatchPlayer.id, returnedSharedMatchPlayer.id),
                    ),
                  );
              }
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
          location: z
            .object({
              sharedId: z.number(),
              accept: z.boolean(),
              linkedId: z.number().optional(),
            })
            .optional(),
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
            location: z
              .object({
                sharedId: z.number(),
                accept: z.boolean(),
                linkedId: z.number().optional(),
              })
              .optional(),
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

        const returnedMatch = await tx.query.match.findFirst({
          where: {
            id: existingRequest.itemId,
            createdBy: existingRequest.ownerId,
          },
          with: {
            matchPlayers: true,
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
          .set({ status: "accepted" })
          .where(eq(shareRequest.id, input.requestId));
        if (input.location) {
          const returnedLocationRequest = await tx.query.shareRequest.findFirst(
            {
              where: {
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                id: input.location.sharedId,
              },
            },
          );
          if (!returnedLocationRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Location share request not found.",
            });
          }
          const returnedLocation = await tx.query.location.findFirst({
            where: {
              id: returnedLocationRequest.itemId,
              createdBy: existingRequest.ownerId,
            },
          });
          if (!returnedLocation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Location not found.",
            });
          }
          await tx
            .update(shareRequest)
            .set({
              status: input.location.accept ? "accepted" : "rejected",
            })
            .where(eq(shareRequest.id, returnedLocationRequest.id));
          if (input.location.accept) {
            const existingShareLocation =
              await tx.query.sharedLocation.findFirst({
                where: {
                  ownerId: returnedLocationRequest.ownerId,
                  sharedWithId: ctx.userId,
                  locationId: returnedLocationRequest.itemId,
                },
              });
            if (!existingShareLocation) {
              await tx.insert(sharedLocation).values({
                ownerId: returnedLocationRequest.ownerId,
                sharedWithId: ctx.userId,
                locationId: returnedLocationRequest.itemId,
                permission: returnedLocationRequest.permission,
                linkedLocationId: input.location.linkedId,
              });
            }
          }
        }
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
            let sharedLocationForMatch: z.infer<
              typeof selectSharedLocationSchema
            > | null = null;
            if (returnedMatch.locationId !== null) {
              const existingSharedLocation =
                await tx.query.sharedLocation.findFirst({
                  where: {
                    ownerId: existingRequest.ownerId,
                    sharedWithId: ctx.userId,
                    locationId: returnedMatch.locationId,
                  },
                });
              if (existingSharedLocation) {
                sharedLocationForMatch = existingSharedLocation;
              }
            }
            const returnedSharedScoresheet =
              await createSharedScoresheetWithRounds(
                tx,
                returnedMatch.scoresheetId,
                returnedMatch.createdBy,
                existingRequest.ownerId,
                ctx.userId,
                existingRequest.permission,
                sharedGameExists.id,
                "match",
              );
            const [returnedSharedMatch] = await tx
              .insert(sharedMatch)
              .values({
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: existingRequest.itemId,
                sharedGameId: sharedGameExists.id,
                sharedLocationId: sharedLocationForMatch?.id ?? null,
                permission: existingRequest.permission,
                sharedScoresheetId: returnedSharedScoresheet.id,
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
            const shareScoresheetExists =
              await tx.query.sharedScoresheet.findFirst({
                where: {
                  ownerId: returnedScoresheetRequest.ownerId,
                  sharedWithId: ctx.userId,
                  scoresheetId: returnedScoresheetRequest.itemId,
                },
              });
            if (!shareScoresheetExists) {
              await tx
                .update(shareRequest)
                .set({
                  status: scoresheetShareRequest.accept
                    ? "accepted"
                    : "rejected",
                })
                .where(eq(shareRequest.id, returnedScoresheetRequest.id));
              if (scoresheetShareRequest.accept) {
                const existingSharedScoresheet =
                  await tx.query.sharedScoresheet.findFirst({
                    where: {
                      ownerId: returnedScoresheetRequest.ownerId,
                      sharedWithId: ctx.userId,
                      scoresheetId: returnedScoresheetRequest.itemId,
                    },
                  });
                if (!existingSharedScoresheet) {
                  await createSharedScoresheetWithRounds(
                    tx,
                    returnedScoresheetRequest.itemId,
                    returnedScoresheetRequest.ownerId,
                    returnedScoresheetRequest.ownerId,
                    ctx.userId,
                    returnedScoresheetRequest.permission,
                    sharedGameExists.id,
                    "game",
                  );
                }
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
            let sharedLocationForMatch: z.infer<
              typeof selectSharedLocationSchema
            > | null = null;
            if (returnedMatch.locationId !== null) {
              const existingSharedLocation =
                await tx.query.sharedLocation.findFirst({
                  where: {
                    ownerId: existingRequest.ownerId,
                    sharedWithId: ctx.userId,
                    locationId: returnedMatch.locationId,
                  },
                });
              if (existingSharedLocation) {
                sharedLocationForMatch = existingSharedLocation;
              }
            }
            const existingSharedScoresheet =
              await tx.query.sharedScoresheet.findFirst({
                where: {
                  ownerId: returnedMatch.createdBy,
                  sharedWithId: ctx.userId,
                  scoresheetId: returnedMatch.scoresheetId,
                },
              });
            let sharedScoresheetId: number | null = null;
            if (existingSharedScoresheet) {
              sharedScoresheetId = existingSharedScoresheet.id;
            } else {
              const createdSharedScoresheet =
                await createSharedScoresheetWithRounds(
                  tx,
                  returnedMatch.scoresheetId,
                  returnedMatch.createdBy,
                  returnedMatch.createdBy,
                  ctx.userId,
                  "view",
                  returnedSharedGame.id,
                  "game",
                );
              sharedScoresheetId = createdSharedScoresheet.id;
            }
            const [returnedSharedMatch] = await tx
              .insert(sharedMatch)
              .values({
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: existingRequest.itemId,
                sharedGameId: returnedSharedGame.id,
                sharedLocationId: sharedLocationForMatch?.id ?? null,
                sharedScoresheetId: sharedScoresheetId,
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
              with: {
                matchPlayers: {
                  with: {
                    sharedMatchPlayers: {
                      where: {
                        sharedPlayerId: {
                          isNull: true,
                        },
                        sharedWithId: ctx.userId,
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
            const sharedPlayerExists = await tx.query.sharedPlayer.findFirst({
              where: {
                ownerId: returnedPlayerRequest.ownerId,
                sharedWithId: ctx.userId,
                playerId: returnedPlayerRequest.itemId,
              },
            });
            if (!sharedPlayerExists) {
              const [returnedSharedPlayer] = await tx
                .insert(sharedPlayer)
                .values({
                  ownerId: returnedPlayerRequest.ownerId,
                  sharedWithId: ctx.userId,
                  playerId: returnedPlayerRequest.itemId,
                  permission: returnedPlayerRequest.permission,
                  linkedPlayerId: matchPlayer.linkedId,
                })
                .returning();
              if (!returnedSharedPlayer) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Shared Player not created successfully",
                });
              }
              for (const returnedSharedMatchPlayer of returnedPlayer.matchPlayers.flatMap(
                (returnedMatchPlayer) => returnedMatchPlayer.sharedMatchPlayers,
              )) {
                await tx
                  .update(sharedMatchPlayer)
                  .set({
                    sharedPlayerId: returnedSharedPlayer.id,
                  })
                  .where(
                    and(
                      eq(sharedMatchPlayer.sharedWithId, ctx.userId),
                      eq(sharedMatchPlayer.id, returnedSharedMatchPlayer.id),
                    ),
                  );
              }
            }
          }
        }
        const sharedMatchExists = await tx.query.sharedMatch.findFirst({
          where: {
            ownerId: existingRequest.ownerId,
            matchId: existingRequest.itemId,
            sharedWithId: ctx.userId,
          },
        });
        if (!sharedMatchExists) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found",
          });
        }
        for (const matchPlayer of returnedMatch.matchPlayers) {
          const existingSharedMatchPlayer =
            await tx.query.sharedMatchPlayer.findFirst({
              where: {
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                matchPlayerId: matchPlayer.id,
                sharedMatchId: sharedMatchExists.id,
              },
            });
          if (!existingSharedMatchPlayer) {
            const sharedMatchPlayerExists =
              await tx.query.sharedMatchPlayer.findFirst({
                where: {
                  ownerId: existingRequest.ownerId,
                  sharedWithId: ctx.userId,
                  matchPlayerId: matchPlayer.id,
                  sharedMatchId: sharedMatchExists.id,
                },
              });
            if (!sharedMatchPlayerExists) {
              const sharedPlayerExists = await tx.query.sharedPlayer.findFirst({
                where: {
                  ownerId: existingRequest.ownerId,
                  sharedWithId: ctx.userId,
                  playerId: matchPlayer.playerId,
                },
              });
              await tx.insert(sharedMatchPlayer).values({
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                matchPlayerId: matchPlayer.id,
                sharedPlayerId: sharedPlayerExists?.id ?? undefined,
                sharedMatchId: sharedMatchExists.id,
                permission: existingRequest.permission,
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
  acceptPersonShareRequest: protectedUserProcedure
    .input(
      z.object({
        requestId: z.number(),
        linkedPlayerId: z.number().optional(),
        locations: z.array(
          z.object({
            sharedId: z.number(),
            accept: z.boolean(),
            linkedId: z.number().optional(),
          }),
        ),
        players: z.array(
          z.object({
            sharedId: z.number(),
            accept: z.boolean(),
            linkedId: z.number().optional(),
          }),
        ),
        games: z.array(
          z
            .object({
              type: z.literal("request"),
              shareId: z.number(),
              accept: z.boolean(),
              linkedId: z.number().optional(),
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
            })
            .or(
              z.object({
                type: z.literal("shared"),
                shareId: z.number(),
                matches: z.array(
                  z.object({
                    sharedId: z.number(),
                    accept: z.boolean(),
                  }),
                ),
              }),
            ),
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
        const returnedPlayer = await tx.query.player.findFirst({
          where: {
            id: existingRequest.itemId,
            createdBy: existingRequest.ownerId,
          },
          with: {
            matchPlayers: {
              with: {
                sharedMatchPlayers: {
                  where: {
                    sharedPlayerId: {
                      isNull: true,
                    },
                    sharedWithId: ctx.userId,
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
        await tx
          .update(shareRequest)
          .set({ status: "accepted" })
          .where(eq(shareRequest.id, input.requestId));

        for (const inputSharedLocation of input.locations) {
          const returnedLocationRequest = await tx.query.shareRequest.findFirst(
            {
              where: {
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                id: inputSharedLocation.sharedId,
              },
            },
          );
          if (!returnedLocationRequest) {
            const message = `Location request ${inputSharedLocation.sharedId} not found.`;
            throw new TRPCError({
              code: "NOT_FOUND",
              message: message,
            });
          }
          await tx
            .update(shareRequest)
            .set({ status: "accepted" })
            .where(eq(shareRequest.id, inputSharedLocation.sharedId));
          if (inputSharedLocation.accept) {
            const returnedLocation = await tx.query.location.findFirst({
              where: {
                id: returnedLocationRequest.itemId,
                createdBy: existingRequest.ownerId,
              },
            });
            if (!returnedLocation) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Location not found.",
              });
            }
            const existingShareLocation =
              await tx.query.sharedLocation.findFirst({
                where: {
                  ownerId: returnedLocationRequest.ownerId,
                  sharedWithId: ctx.userId,
                  locationId: returnedLocationRequest.itemId,
                },
              });
            if (!existingShareLocation) {
              await tx.insert(sharedLocation).values({
                ownerId: returnedLocationRequest.ownerId,
                sharedWithId: ctx.userId,
                locationId: returnedLocationRequest.itemId,
                permission: returnedLocationRequest.permission,
                linkedLocationId: inputSharedLocation.linkedId,
              });
            }
          }
        }

        for (const inputSharedPlayer of input.players) {
          const returnedPlayerRequest = await tx.query.shareRequest.findFirst({
            where: {
              ownerId: existingRequest.ownerId,
              sharedWithId: ctx.userId,
              id: inputSharedPlayer.sharedId,
            },
          });
          if (!returnedPlayerRequest) {
            const message = `Player request ${inputSharedPlayer.sharedId} not found.`;
            throw new TRPCError({
              code: "NOT_FOUND",
              message: message,
            });
          }
          await tx
            .update(shareRequest)
            .set({
              status: inputSharedPlayer.accept ? "accepted" : "rejected",
            })
            .where(eq(shareRequest.id, returnedPlayerRequest.id));
          if (inputSharedPlayer.accept) {
            const returnedPlayer = await tx.query.player.findFirst({
              where: {
                id: returnedPlayerRequest.itemId,
                createdBy: returnedPlayerRequest.ownerId,
              },
              with: {
                matchPlayers: {
                  with: {
                    sharedMatchPlayers: {
                      where: {
                        sharedPlayerId: {
                          isNull: true,
                        },
                        sharedWithId: ctx.userId,
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
            let sharedPlayerExists = await tx.query.sharedPlayer.findFirst({
              where: {
                ownerId: returnedPlayerRequest.ownerId,
                sharedWithId: ctx.userId,
                playerId: returnedPlayerRequest.itemId,
              },
            });
            if (!sharedPlayerExists) {
              const [returnedSharedPlayer] = await tx
                .insert(sharedPlayer)
                .values({
                  ownerId: returnedPlayerRequest.ownerId,
                  sharedWithId: ctx.userId,
                  playerId: returnedPlayerRequest.itemId,
                  permission: returnedPlayerRequest.permission,
                  linkedPlayerId: inputSharedPlayer.linkedId,
                })
                .returning();
              if (!returnedSharedPlayer) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Shared Player not created successfully",
                });
              }
              sharedPlayerExists = returnedSharedPlayer;
            }
            for (const returnedSharedMatchPlayer of returnedPlayer.matchPlayers.flatMap(
              (returnedMatchPlayer) => returnedMatchPlayer.sharedMatchPlayers,
            )) {
              await tx
                .update(sharedMatchPlayer)
                .set({
                  sharedPlayerId: sharedPlayerExists.id,
                })
                .where(
                  and(
                    eq(sharedMatchPlayer.sharedWithId, ctx.userId),
                    eq(sharedMatchPlayer.id, returnedSharedMatchPlayer.id),
                  ),
                );
            }
          }
        }
        if (input.games.length > 0) {
          for (const inputGame of input.games) {
            if (inputGame.type === "request") {
              const gameShareRequest = await tx.query.shareRequest.findFirst({
                where: {
                  id: inputGame.shareId,
                  ownerId: ctx.userId,
                },
              });
              if (!gameShareRequest) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Game share request not found",
                });
              }
              await tx
                .update(shareRequest)
                .set({
                  status: "accepted",
                })
                .where(eq(shareRequest.id, gameShareRequest.id));
              const returnedGame = await tx.query.game.findFirst({
                where: {
                  id: gameShareRequest.itemId,
                  createdBy: gameShareRequest.ownerId,
                },
              });
              if (!returnedGame) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Game not found",
                });
              }
              let shareGameExists = await tx.query.sharedGame.findFirst({
                where: {
                  ownerId: gameShareRequest.ownerId,
                  sharedWithId: ctx.userId,
                  gameId: returnedGame.id,
                },
              });
              if (!shareGameExists) {
                const [returnedSharedGame] = await tx
                  .insert(sharedGame)
                  .values({
                    ownerId: gameShareRequest.ownerId,
                    sharedWithId: ctx.userId,
                    gameId: returnedGame.id,
                    permission: gameShareRequest.permission,
                    linkedGameId: inputGame.linkedId,
                  })
                  .returning();

                if (!returnedSharedGame) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Shared Game not created successfully",
                  });
                } else {
                  shareGameExists = returnedSharedGame;
                }
              }
              for (const inputMatch of inputGame.matches) {
                const matchShareRequest = await tx.query.shareRequest.findFirst(
                  {
                    where: {
                      id: inputMatch.sharedId,
                      ownerId: ctx.userId,
                    },
                  },
                );
                if (!matchShareRequest) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Match share request not found",
                  });
                }
                await tx
                  .update(shareRequest)
                  .set({
                    status: inputMatch.accept ? "accepted" : "rejected",
                  })
                  .where(eq(shareRequest.id, matchShareRequest.id));
                if (inputMatch.accept) {
                  const returnedMatch = await tx.query.match.findFirst({
                    where: {
                      id: matchShareRequest.itemId,
                      createdBy: matchShareRequest.ownerId,
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
                  const shareMatchExists = await tx.query.sharedMatch.findFirst(
                    {
                      where: {
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        matchId: returnedMatch.id,
                      },
                    },
                  );
                  if (!shareMatchExists) {
                    let sharedLocationForMatch: z.infer<
                      typeof selectSharedLocationSchema
                    > | null = null;
                    if (returnedMatch.locationId !== null) {
                      const existingSharedLocation =
                        await tx.query.sharedLocation.findFirst({
                          where: {
                            ownerId: existingRequest.ownerId,
                            sharedWithId: ctx.userId,
                            locationId: returnedMatch.locationId,
                          },
                        });
                      if (existingSharedLocation) {
                        sharedLocationForMatch = existingSharedLocation;
                      }
                    }
                    const returnedScoresheet =
                      await tx.query.scoresheet.findFirst({
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
                    const [returnedSharedScoresheet] = await tx
                      .insert(sharedScoresheet)
                      .values({
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        scoresheetId: returnedMatch.scoresheetId,
                        permission: matchShareRequest.permission,
                        sharedGameId: shareGameExists.id,
                        type: "match",
                      })
                      .returning();
                    if (!returnedSharedScoresheet) {
                      throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Shared Scoresheet not created successfully",
                      });
                    }
                    const sharedScoresheetRoundsInput =
                      returnedScoresheet.rounds.map((round) => ({
                        roundId: round.id,
                        linkedRoundId: null,
                        sharedScoresheetId: returnedSharedScoresheet.id,
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        permission: matchShareRequest.permission,
                      }));
                    if (sharedScoresheetRoundsInput.length > 0) {
                      await scoresheetRepository.insertSharedRounds(
                        { input: sharedScoresheetRoundsInput },
                        tx,
                      );
                    }
                    const [returnedSharedMatch] = await tx
                      .insert(sharedMatch)
                      .values({
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        matchId: returnedMatch.id,
                        sharedGameId: shareGameExists.id,
                        sharedLocationId: sharedLocationForMatch?.id ?? null,
                        sharedScoresheetId: returnedSharedScoresheet.id,
                        permission: matchShareRequest.permission,
                      })
                      .returning();
                    if (!returnedSharedMatch) {
                      throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Shared Match not created successfully",
                      });
                    }
                    for (const returnedMatchPlayer of returnedMatch.matchPlayers) {
                      const sharedMatchPlayerExists =
                        await tx.query.sharedMatchPlayer.findFirst({
                          where: {
                            ownerId: matchShareRequest.ownerId,
                            sharedWithId: ctx.userId,
                            matchPlayerId: returnedMatchPlayer.id,
                            sharedMatchId: returnedSharedMatch.id,
                          },
                        });
                      if (!sharedMatchPlayerExists) {
                        const sharedPlayerExists =
                          await tx.query.sharedPlayer.findFirst({
                            where: {
                              ownerId: matchShareRequest.ownerId,
                              sharedWithId: ctx.userId,
                              playerId: returnedMatchPlayer.playerId,
                            },
                          });
                        await tx.insert(sharedMatchPlayer).values({
                          ownerId: matchShareRequest.ownerId,
                          sharedWithId: ctx.userId,
                          matchPlayerId: returnedMatchPlayer.id,
                          sharedPlayerId: sharedPlayerExists?.id ?? undefined,
                          sharedMatchId: returnedSharedMatch.id,
                          permission: matchShareRequest.permission,
                        });
                      }
                    }
                  }
                }
              }
              for (const inputScoresheet of inputGame.scoresheets) {
                const scoresheetShareRequest =
                  await tx.query.shareRequest.findFirst({
                    where: {
                      id: inputScoresheet.sharedId,
                      ownerId: ctx.userId,
                    },
                  });
                if (!scoresheetShareRequest) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Scoresheet share request not found",
                  });
                }

                await tx
                  .update(shareRequest)
                  .set({
                    status: inputScoresheet.accept ? "accepted" : "rejected",
                  })
                  .where(eq(shareRequest.id, scoresheetShareRequest.id));
                if (inputScoresheet.accept) {
                  const returnedScoresheet =
                    await tx.query.scoresheet.findFirst({
                      where: {
                        id: scoresheetShareRequest.itemId,
                        createdBy: scoresheetShareRequest.ownerId,
                      },
                      with: {
                        rounds: true,
                      },
                    });
                  if (!returnedScoresheet) {
                    throw new TRPCError({
                      code: "NOT_FOUND",
                      message: "Scoresheet not found",
                    });
                  }
                  const shareScoresheetExists =
                    await tx.query.sharedScoresheet.findFirst({
                      where: {
                        ownerId: scoresheetShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        scoresheetId: returnedScoresheet.id,
                      },
                    });
                  if (!shareScoresheetExists) {
                    const [createdSharedScoresheet] = await tx
                      .insert(sharedScoresheet)
                      .values({
                        ownerId: scoresheetShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        scoresheetId: returnedScoresheet.id,
                        permission: scoresheetShareRequest.permission,
                        sharedGameId: shareGameExists.id,
                        type: "game",
                      })
                      .returning();
                    if (createdSharedScoresheet) {
                      const sharedScoresheetRoundsInput =
                        returnedScoresheet.rounds.map((round) => ({
                          roundId: round.id,
                          linkedRoundId: null,
                          sharedScoresheetId: createdSharedScoresheet.id,
                          ownerId: scoresheetShareRequest.ownerId,
                          sharedWithId: ctx.userId,
                          permission: scoresheetShareRequest.permission,
                        }));
                      await scoresheetRepository.insertSharedRounds(
                        { input: sharedScoresheetRoundsInput },
                        tx,
                      );
                    }
                  }
                }
              }
            }
            if (inputGame.type === "shared") {
              const returnedSharedGame = await tx.query.sharedGame.findFirst({
                where: {
                  id: inputGame.shareId,
                  sharedWithId: ctx.userId,
                },
              });
              if (!returnedSharedGame) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Shared Game not created successfully",
                });
              }
              for (const inputMatch of inputGame.matches) {
                const matchShareRequest = await tx.query.shareRequest.findFirst(
                  {
                    where: {
                      id: inputMatch.sharedId,
                      ownerId: ctx.userId,
                    },
                  },
                );
                if (!matchShareRequest) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Match share request not found",
                  });
                }
                await tx
                  .update(shareRequest)
                  .set({
                    status: inputMatch.accept ? "accepted" : "rejected",
                  })
                  .where(eq(shareRequest.id, matchShareRequest.id));
                if (inputMatch.accept) {
                  const returnedMatch = await tx.query.match.findFirst({
                    where: {
                      id: matchShareRequest.itemId,
                      createdBy: matchShareRequest.ownerId,
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
                  const shareMatchExists = await tx.query.sharedMatch.findFirst(
                    {
                      where: {
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        matchId: returnedMatch.id,
                      },
                    },
                  );
                  if (!shareMatchExists) {
                    let sharedLocationForMatch: z.infer<
                      typeof selectSharedLocationSchema
                    > | null = null;
                    if (returnedMatch.locationId !== null) {
                      const existingSharedLocation =
                        await tx.query.sharedLocation.findFirst({
                          where: {
                            ownerId: existingRequest.ownerId,
                            sharedWithId: ctx.userId,
                            locationId: returnedMatch.locationId,
                          },
                        });
                      if (existingSharedLocation) {
                        sharedLocationForMatch = existingSharedLocation;
                      }
                    }
                    const returnedScoresheet =
                      await tx.query.scoresheet.findFirst({
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
                    const [returnedSharedScoresheet] = await tx
                      .insert(sharedScoresheet)
                      .values({
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        scoresheetId: returnedMatch.scoresheetId,
                        permission: matchShareRequest.permission,
                        sharedGameId: returnedSharedGame.id,
                        type: "match",
                      })
                      .returning();
                    if (!returnedSharedScoresheet) {
                      throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Shared Scoresheet not created successfully",
                      });
                    }
                    const sharedScoresheetRoundsInput =
                      returnedScoresheet.rounds.map((round) => ({
                        roundId: round.id,
                        linkedRoundId: null,
                        sharedScoresheetId: returnedSharedScoresheet.id,
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        permission: matchShareRequest.permission,
                      }));
                    if (sharedScoresheetRoundsInput.length > 0) {
                      await scoresheetRepository.insertSharedRounds(
                        { input: sharedScoresheetRoundsInput },
                        tx,
                      );
                    }
                    const [returnedSharedMatch] = await tx
                      .insert(sharedMatch)
                      .values({
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        matchId: returnedMatch.id,
                        sharedGameId: returnedSharedGame.id,
                        sharedLocationId: sharedLocationForMatch?.id ?? null,
                        sharedScoresheetId: returnedSharedScoresheet.id,
                        permission: matchShareRequest.permission,
                      })
                      .returning();
                    if (!returnedSharedMatch) {
                      throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Shared Match not created successfully",
                      });
                    }
                    for (const returnedMatchPlayer of returnedMatch.matchPlayers) {
                      const sharedMatchPlayerExists =
                        await tx.query.sharedMatchPlayer.findFirst({
                          where: {
                            ownerId: matchShareRequest.ownerId,
                            sharedWithId: ctx.userId,
                            matchPlayerId: returnedMatchPlayer.id,
                            sharedMatchId: returnedSharedMatch.id,
                          },
                        });
                      if (!sharedMatchPlayerExists) {
                        const sharedPlayerExists =
                          await tx.query.sharedPlayer.findFirst({
                            where: {
                              ownerId: matchShareRequest.ownerId,
                              sharedWithId: ctx.userId,
                              playerId: returnedMatchPlayer.playerId,
                            },
                          });
                        await tx.insert(sharedMatchPlayer).values({
                          ownerId: matchShareRequest.ownerId,
                          sharedWithId: ctx.userId,
                          matchPlayerId: returnedMatchPlayer.id,
                          sharedPlayerId: sharedPlayerExists?.id ?? undefined,
                          sharedMatchId: returnedSharedMatch.id,
                          permission: matchShareRequest.permission,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
        const [returnedSharedPlayer] = await tx
          .insert(sharedPlayer)
          .values({
            ownerId: existingRequest.ownerId,
            sharedWithId: ctx.userId,
            playerId: returnedPlayer.id,
            permission: existingRequest.permission,
            linkedPlayerId: input.linkedPlayerId,
          })
          .returning();
        if (!returnedSharedPlayer) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Shared player not created successfully",
          });
        }
        for (const returnedSharedMatchPlayer of returnedPlayer.matchPlayers.flatMap(
          (returnedMatchPlayer) => returnedMatchPlayer.sharedMatchPlayers,
        )) {
          await tx
            .update(sharedMatchPlayer)
            .set({
              sharedPlayerId: returnedSharedPlayer.id,
            })
            .where(
              and(
                eq(sharedMatchPlayer.sharedWithId, ctx.userId),
                eq(sharedMatchPlayer.id, returnedSharedMatchPlayer.id),
              ),
            );
        }
        return returnedSharedPlayer;
      });
      return response;
    }),
} satisfies TRPCRouterRecord;
