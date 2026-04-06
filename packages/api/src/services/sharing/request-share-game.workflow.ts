import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { TransactionType } from "@board-games/db/client";
import type {
  selectSharedGameSchema,
  selectSharedLocationSchema,
  selectSharedMatchSchema,
  selectSharedPlayerSchema,
} from "@board-games/db/zodSchema";
import {
  sharedGame,
  sharedGameRole,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  shareRequest,
} from "@board-games/db/schema";

import type {
  GameRoleToShareInputType,
  RequestShareGameInputType,
  ShareGameMatchInputType,
} from "../../routers/sharing/sharing.input";
import {
  createSharedScoresheetWithRounds,
  handleLocationSharing,
} from "../../utils/sharing";

import {
  hasExistingShare,
  validateFriendSharingPermissions,
} from "./share-friend-validation";

export async function shareScoresheetsWithFriend(
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
              createdBy: userId,
              gameId: gameId,
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
          userId,
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

export async function shareGameRolesWithFriend(
  transaction: TransactionType,
  userId: string,
  friendId: string,
  gameId: number,
  gameRoles: GameRoleToShareInputType[],
  newShareId: number,
  autoAcceptGame: boolean,
  expiresAt: Date | null,
) {
  if (gameRoles.length === 0) {
    return;
  }
  const returnedSharedGame = await transaction.query.sharedGame.findFirst({
    where: {
      gameId,
      sharedWithId: friendId,
      ownerId: userId,
    },
    columns: { id: true },
  });
  for (const role of gameRoles) {
    await transaction.insert(shareRequest).values({
      ownerId: userId,
      sharedWithId: friendId,
      itemType: "game_role",
      itemId: role.gameRoleId,
      permission: role.permission,
      status: autoAcceptGame ? "accepted" : "pending",
      parentShareId: newShareId,
      expiresAt,
    });
    if (autoAcceptGame && returnedSharedGame) {
      const existing = await transaction.query.sharedGameRole.findFirst({
        where: {
          gameRoleId: role.gameRoleId,
          sharedWithId: friendId,
          ownerId: userId,
          sharedGameId: returnedSharedGame.id,
        },
      });
      if (!existing) {
        await transaction.insert(sharedGameRole).values({
          ownerId: userId,
          sharedWithId: friendId,
          gameRoleId: role.gameRoleId,
          sharedGameId: returnedSharedGame.id,
          permission: role.permission,
        });
      }
    }
  }
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

export async function sharedMatchWithFriends(
  transaction: TransactionType,
  userId: string,
  matchToShare: ShareGameMatchInputType,
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
  const includeLocation = matchToShare.includeLocation !== false;

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

  if (returnedMatch.locationId && includeLocation) {
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
        gameId: returnedMatch.gameId,
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
    const playersToShare = matchToShare.playerIds?.length
      ? returnedMatch.matchPlayers.filter((mp) =>
          matchToShare.playerIds!.includes(mp.player.id),
        )
      : returnedMatch.matchPlayers;

    for (const matchPlayer of playersToShare) {
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

export async function requestShareGameToFriend(
  transaction: TransactionType,
  friendToShareTo: { id: string },
  shareMessages: { success: boolean; message: string }[],
  userId: string,
  input: RequestShareGameInputType,
  returnedGame: {
    id: number;
  },
) {
  if (input.type !== "friends") {
    return false;
  }
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

    await shareGameRolesWithFriend(
      tx2,
      userId,
      friendToShareTo.id,
      returnedGame.id,
      input.gameRolesToShare ?? [],
      parentShare.id,
      friendSettings?.autoAcceptGame ?? false,
      input.expiresAt ?? null,
    );
    return true;
  });
}
