import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

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

import { createTRPCRouter, protectedUserProcedure } from "../../trpc";

export const shareAcceptanceRouter = createTRPCRouter({
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
                if (!existingSharedLocation) {
                  const [insertedSharedLocation] = await tx
                    .insert(sharedLocation)
                    .values({
                      ownerId: returnedMatchRequest.ownerId,
                      sharedWithId: ctx.userId,
                      locationId: returnedMatch.locationId,
                      permission: returnedMatchRequest.permission,
                    })
                    .returning();
                  if (!insertedSharedLocation) {
                    throw Error("Shared Location not found");
                  }
                  sharedLocationForMatch = insertedSharedLocation;
                }
              }
              const [returnedSharedMatch] = await tx
                .insert(sharedMatch)
                .values({
                  ownerId: returnedMatchRequest.ownerId,
                  sharedWithId: ctx.userId,
                  matchId: returnedMatchRequest.itemId,
                  sharedGameId: sharedGameExists.id,
                  sharedLocationId: sharedLocationForMatch?.id ?? null,
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

        const returnedMatch = await tx.query.match.findFirst({
          where: {
            id: existingRequest.itemId,
            userId: existingRequest.ownerId,
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
              if (!existingSharedLocation) {
                const [insertedSharedLocation] = await tx
                  .insert(sharedLocation)
                  .values({
                    ownerId: existingRequest.ownerId,
                    sharedWithId: ctx.userId,
                    locationId: returnedMatch.locationId,
                    permission: existingRequest.permission,
                  })
                  .returning();
                if (!insertedSharedLocation) {
                  throw Error("Shared Location not found");
                }
                sharedLocationForMatch = insertedSharedLocation;
              }
            }
            const [returnedSharedMatch] = await tx
              .insert(sharedMatch)
              .values({
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: existingRequest.itemId,
                sharedGameId: sharedGameExists.id,
                sharedLocationId: sharedLocationForMatch?.id ?? null,
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
              if (!existingSharedLocation) {
                const [insertedSharedLocation] = await tx
                  .insert(sharedLocation)
                  .values({
                    ownerId: existingRequest.ownerId,
                    sharedWithId: ctx.userId,
                    locationId: returnedMatch.locationId,
                    permission: existingRequest.permission,
                  })
                  .returning();
                if (!insertedSharedLocation) {
                  throw Error("Shared Location not found");
                }
                sharedLocationForMatch = insertedSharedLocation;
              }
            }
            const [returnedSharedMatch] = await tx
              .insert(sharedMatch)
              .values({
                ownerId: existingRequest.ownerId,
                sharedWithId: ctx.userId,
                matchId: existingRequest.itemId,
                sharedGameId: returnedSharedGame.id,
                sharedLocationId: sharedLocationForMatch?.id ?? null,
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
                  userId: gameShareRequest.ownerId,
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
                      userId: matchShareRequest.ownerId,
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
                      if (!existingSharedLocation) {
                        const [insertedSharedLocation] = await tx
                          .insert(sharedLocation)
                          .values({
                            ownerId: existingRequest.ownerId,
                            sharedWithId: ctx.userId,
                            locationId: returnedMatch.locationId,
                            permission: matchShareRequest.permission,
                          })
                          .returning();
                        if (!insertedSharedLocation) {
                          throw Error("Shared Location not found");
                        }
                        sharedLocationForMatch = insertedSharedLocation;
                      }
                    }
                    const [returnedSharedMatch] = await tx
                      .insert(sharedMatch)
                      .values({
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        matchId: returnedMatch.id,
                        sharedGameId: shareGameExists.id,
                        sharedLocationId: sharedLocationForMatch?.id ?? null,
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
                        userId: scoresheetShareRequest.ownerId,
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
                    await tx.insert(sharedScoresheet).values({
                      ownerId: scoresheetShareRequest.ownerId,
                      sharedWithId: ctx.userId,
                      scoresheetId: returnedScoresheet.id,
                      permission: scoresheetShareRequest.permission,
                      sharedGameId: shareGameExists.id,
                    });
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
                      userId: matchShareRequest.ownerId,
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
                      if (!existingSharedLocation) {
                        const [insertedSharedLocation] = await tx
                          .insert(sharedLocation)
                          .values({
                            ownerId: existingRequest.ownerId,
                            sharedWithId: ctx.userId,
                            locationId: returnedMatch.locationId,
                            permission: matchShareRequest.permission,
                          })
                          .returning();
                        if (!insertedSharedLocation) {
                          throw Error("Shared Location not found");
                        }
                        sharedLocationForMatch = insertedSharedLocation;
                      }
                    }
                    const [returnedSharedMatch] = await tx
                      .insert(sharedMatch)
                      .values({
                        ownerId: matchShareRequest.ownerId,
                        sharedWithId: ctx.userId,
                        matchId: returnedMatch.id,
                        sharedGameId: returnedSharedGame.id,
                        sharedLocationId: sharedLocationForMatch?.id ?? null,
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
});
