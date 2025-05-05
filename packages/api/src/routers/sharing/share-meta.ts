import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type {
  selectGameSchema,
  selectImageSchema,
  selectLocationSchema,
  selectMatchPlayerSchema,
  selectMatchSchema,
  selectPlayerSchema,
  selectScoreSheetSchema,
} from "@board-games/db/zodSchema";
import { scoresheet } from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../../trpc";

export const shareMetaRouter = createTRPCRouter({
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
            item: z.infer<typeof selectGameSchema> & {
              image: z.infer<typeof selectImageSchema> | null;
            };
            permission: "view" | "edit";
          }
        | {
            itemType: "match";
            shareId: number;
            item: z.infer<typeof selectMatchSchema> & {
              location: z.infer<typeof selectLocationSchema> | null;
              matchPlayers: (z.infer<typeof selectMatchPlayerSchema> & {
                player: z.infer<typeof selectPlayerSchema>;
              })[];
            };
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
            item: z.infer<typeof selectPlayerSchema> & {
              image: z.infer<typeof selectImageSchema> | null;
            };
            permission: "view" | "edit";
          }
        | {
            itemType: "location";
            shareId: number;
            item: z.infer<typeof selectLocationSchema>;
            permission: "view" | "edit";
          }
      )[] = [];
      if (sharedItem.childShareRequests.length > 0) {
        for (const childShareRequest of sharedItem.childShareRequests) {
          if (childShareRequest.itemType === "game") {
            const returnedGame = await ctx.db.query.game.findFirst({
              where: {
                id: childShareRequest.itemId,
                userId: sharedItem.ownerId,
              },
              with: {
                image: true,
              },
            });
            if (!returnedGame) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Game not found",
              });
            }
            childItems.push({
              itemType: "game",
              shareId: childShareRequest.id,
              item: returnedGame,
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
            const returnedPlayer = await ctx.db.query.player.findFirst({
              where: {
                id: childShareRequest.itemId,
                createdBy: sharedItem.ownerId,
              },
              with: {
                image: true,
              },
            });
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
          if (childShareRequest.itemType === "location") {
            const returnedLocation = await ctx.db.query.location.findFirst({
              where: {
                id: childShareRequest.itemId,
                createdBy: sharedItem.ownerId,
              },
            });
            if (!returnedLocation) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Location not found",
              });
            }
            childItems.push({
              itemType: "location",
              shareId: childShareRequest.id,
              item: returnedLocation,
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
          with: {
            image: true,
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
                matches: {
                  with: {
                    location: true,
                    matchPlayers: {
                      with: {
                        player: true,
                      },
                    },
                  },
                },
              },
            },
            sharedMatches: {
              with: {
                match: {
                  with: {
                    location: true,
                    matchPlayers: {
                      with: {
                        player: true,
                      },
                    },
                  },
                },
              },
              where: {
                sharedWithId: ctx.userId,
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
          columns: {
            name: true,
          },
          where: {
            id: sharedItem.itemId,
          },
          with: {
            image: true,
            createdBy: {
              columns: {
                name: true,
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
        const mappedGame: Record<
          string,
          | {
              type: "request";
              item: z.infer<typeof selectGameSchema> & {
                image: z.infer<typeof selectImageSchema> | null;
              };
              shareId: number;
              permission: "view" | "edit";
              matches: {
                itemType: "match";
                shareId: number;
                item: z.infer<typeof selectMatchSchema> & {
                  location: z.infer<typeof selectLocationSchema> | null;
                  matchPlayers: (z.infer<typeof selectMatchPlayerSchema> & {
                    player: z.infer<typeof selectPlayerSchema>;
                  })[];
                };
                permission: "view" | "edit";
              }[];
              scoresheets: {
                itemType: "scoresheet";
                shareId: number;
                item: z.infer<typeof selectScoreSheetSchema>;
                permission: "view" | "edit";
              }[];
            }
          | {
              type: "shared";
              sharedGame: {
                id: number;
                type: "linked" | "shared";
                ownerName: string | null;
                name: string;
                imageUrl: string | undefined;
                description: string | null;
                yearPublished: number | null;
                playersMax: number | null;
                playersMin: number | null;
                playtimeMax: number | null;
                playtimeMin: number | null;
                rules: string | null;
              };
              shareId: number;
              permission: "view" | "edit";
              matches: {
                itemType: "match";
                shareId: number;
                item: z.infer<typeof selectMatchSchema> & {
                  location: z.infer<typeof selectLocationSchema> | null;
                  matchPlayers: (z.infer<typeof selectMatchPlayerSchema> & {
                    player: z.infer<typeof selectPlayerSchema>;
                  })[];
                };
                permission: "view" | "edit";
              }[];
            }
        > = {};
        for (const cItem of childItems.filter(
          (cItem) => cItem.itemType === "game",
        )) {
          mappedGame[cItem.item.id] = {
            type: "request" as const,
            item: cItem.item,
            shareId: cItem.shareId,
            permission: cItem.permission,
            matches: [],
            scoresheets: [],
          };
        }
        for (const cItem of childItems.filter(
          (cItem) => cItem.itemType === "match",
        )) {
          if (mappedGame[cItem.item.gameId] !== undefined) {
            mappedGame[cItem.item.gameId]?.matches.push(cItem);
          } else {
            const returnedSharedGame = await ctx.db.query.sharedGame.findFirst({
              where: {
                gameId: cItem.item.gameId,
              },
              with: {
                owner: true,
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
            if (!returnedSharedGame) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Game not found",
              });
            }
            if (returnedSharedGame.linkedGame !== null) {
              mappedGame[cItem.item.gameId] = {
                type: "shared" as const,
                sharedGame: {
                  type: "linked" as const,
                  id: returnedSharedGame.linkedGame.id,
                  ownerName: returnedSharedGame.owner.name,
                  name: returnedSharedGame.linkedGame.name,
                  imageUrl: returnedSharedGame.linkedGame.image?.url,
                  description: returnedSharedGame.linkedGame.description,
                  yearPublished: returnedSharedGame.linkedGame.yearPublished,
                  playersMax: returnedSharedGame.linkedGame.playersMax,
                  playersMin: returnedSharedGame.linkedGame.playersMin,
                  playtimeMax: returnedSharedGame.linkedGame.playtimeMax,
                  playtimeMin: returnedSharedGame.linkedGame.playtimeMin,
                  rules: returnedSharedGame.linkedGame.rules,
                },
                shareId: returnedSharedGame.id,
                permission: returnedSharedGame.permission,
                matches: [cItem],
              };
            } else {
              mappedGame[cItem.item.gameId] = {
                type: "shared" as const,
                sharedGame: {
                  id: returnedSharedGame.id,
                  type: "shared" as const,
                  ownerName: returnedSharedGame.owner.name,
                  name: returnedSharedGame.game.name,
                  imageUrl: returnedSharedGame.game.image?.url,
                  description: returnedSharedGame.game.description,
                  yearPublished: returnedSharedGame.game.yearPublished,
                  playersMax: returnedSharedGame.game.playersMax,
                  playersMin: returnedSharedGame.game.playersMin,
                  playtimeMax: returnedSharedGame.game.playtimeMax,
                  playtimeMin: returnedSharedGame.game.playtimeMin,
                  rules: returnedSharedGame.game.rules,
                },
                shareId: returnedSharedGame.id,
                permission: returnedSharedGame.permission,
                matches: [cItem],
              };
            }
          }
        }
        for (const cItem of childItems.filter(
          (cItem) => cItem.itemType === "scoresheet",
        )) {
          const foundMappedGame = mappedGame[cItem.item.gameId];
          if (
            foundMappedGame !== undefined &&
            foundMappedGame.type === "request"
          ) {
            foundMappedGame.scoresheets.push(cItem);
          }
        }
        return {
          itemType: "player" as const,
          item: returnedPlayer,
          permission: sharedItem.permission,
          players: childItems.filter((cItem) => cItem.itemType === "player"),
          locations: childItems.filter(
            (cItem) => cItem.itemType === "location",
          ),
          games: Object.values(mappedGame),
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
        linkedGames: {
          with: {
            sharedMatches: {
              with: {
                match: {
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
              where: {
                sharedWithId: ctx.userId,
              },
            },
          },
          where: {
            sharedWithId: ctx.userId,
          },
        },
        image: true,
      },
    });
    const mappedGames = games.map((game) => {
      const linkedMatches = game.linkedGames.flatMap((linkedGame) => {
        return linkedGame.sharedMatches.map((sharedMatch) => {
          return sharedMatch.match;
        });
      });
      return {
        id: game.id,
        name: game.name,
        createdAt: game.createdAt,
        image: game.image,
        yearPublished: game.yearPublished,
        playersMin: game.playersMin,
        playersMax: game.playersMax,
        playtimeMax: game.playtimeMax,
        playtimeMin: game.playtimeMin,
        description: game.description,
        matches: [...linkedMatches, ...game.matches],
      };
    });
    return mappedGames;
  }),
  getUserPlayersForLinking: protectedUserProcedure.query(async ({ ctx }) => {
    const players = await ctx.db.query.player.findMany({
      where: {
        createdBy: ctx.userId,
      },
      with: {
        image: true,
      },
    });
    return players;
  }),
  getUserLocationsForLinking: protectedUserProcedure.query(async ({ ctx }) => {
    const locations = await ctx.db.query.location.findMany({
      where: {
        createdBy: ctx.userId,
      },
    });
    return locations;
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
              with: {
                image: true,
              },
            });
            if (!returnedGame) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Game not found",
              });
            }
            return {
              type: "game" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              name: returnedGame.name,
              imageUrl: returnedGame.image?.url,
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
              locations: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "location",
              ).length,
            };
          }
          if (sharedItem.itemType === "match") {
            const returnedMatch = await ctx.db.query.match.findFirst({
              where: {
                id: sharedItem.itemId,
                userId: sharedItem.ownerId,
              },
              with: {
                game: {
                  with: {
                    image: true,
                  },
                },
              },
            });
            if (!returnedMatch) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Match not found",
              });
            }
            return {
              type: "match" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              id: sharedItem.id,
              name: returnedMatch.name,
              imageUrl: returnedMatch.game.image?.url,
              ownerName: sharedItem.owner.name,
              permission: sharedItem.permission,
              game: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "game",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
              locations: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "location",
              ).length,
            };
          }
          if (sharedItem.itemType === "player") {
            const returnedPlayer = await ctx.db.query.player.findFirst({
              where: {
                id: sharedItem.itemId,
                createdBy: sharedItem.ownerId,
              },
              with: {
                image: true,
              },
            });
            if (!returnedPlayer) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Player not found",
              });
            }
            return {
              type: "player" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              id: sharedItem.id,
              name: returnedPlayer.name,
              imageUrl: returnedPlayer.image?.url,
              ownerName: sharedItem.owner.name,
              permission: sharedItem.permission,
              matches: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "match",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
              locations: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "location",
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
              with: {
                image: true,
              },
            });
            if (!returnedGame) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Game not found",
              });
            }
            return {
              type: "game" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              name: returnedGame.name,
              imageUrl: returnedGame.image?.url,
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
              locations: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "location",
              ).length,
            };
          }
          if (sharedItem.itemType === "match") {
            const returnedMatch = await ctx.db.query.match.findFirst({
              where: {
                id: sharedItem.itemId,
                userId: sharedItem.ownerId,
              },
              with: {
                game: {
                  with: {
                    image: true,
                  },
                },
              },
            });
            if (!returnedMatch) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Match not found",
              });
            }
            return {
              type: "match" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              id: sharedItem.id,
              name: returnedMatch.name,
              imageUrl: returnedMatch.game.image?.url,
              sharedWith: sharedItem.sharedWith?.name,
              permission: sharedItem.permission,
              token: sharedItem.token,
              game: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "game",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
              locations: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "location",
              ).length,
            };
          }
          if (sharedItem.itemType === "player") {
            const returnedPlayer = await ctx.db.query.player.findFirst({
              where: {
                id: sharedItem.itemId,
                createdBy: sharedItem.ownerId,
              },
              with: {
                image: true,
              },
            });
            if (!returnedPlayer) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Player not found",
              });
            }
            return {
              type: "player" as const,
              hasChildren: sharedItem.childShareRequests.length > 0,
              createdAt: sharedItem.createdAt,
              expiredAt: sharedItem.expiresAt,
              status: sharedItem.status,
              id: sharedItem.id,
              name: returnedPlayer.name,
              imageUrl: returnedPlayer.image?.url,
              sharedWith: sharedItem.sharedWith?.name,
              permission: sharedItem.permission,
              token: sharedItem.token,
              matches: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "match",
              ).length,
              players: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "player",
              ).length,
              locations: sharedItem.childShareRequests.filter(
                (child) => child.itemType === "location",
              ).length,
            };
          }
          return null;
        }),
      )
    ).filter((item) => item !== null);
    return mappedItems;
  }),
});
