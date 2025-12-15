import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { sharingRepository } from "../../repositories/sharing/sharing.repository";
import { friendRepository } from "../../repositories/social/friend.repository";
import { gameRepository } from "../../routers/game/repository/game.repository";
import { sharedGameRepository } from "../../routers/game/sub-routers/shared/repository/shared-game.repository";
import { locationRepository } from "../../routers/location/repository/location.repository";
import { playerRepository } from "../../routers/player/repository/player.repository";
import { scoresheetRepository } from "../../routers/scoresheet/repository/scoresheet.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";

class FriendService {
  public async autoShareMatch(args: {
    input: {
      matchId: number;
    };
    ctx: {
      userId: string;
    };
  }) {
    await db.transaction(async (tx) => {
      const returnedMatch = await matchRepository.get(
        {
          id: args.input.matchId,
          createdBy: args.ctx.userId,
          with: {
            matchPlayers: {
              with: {
                player: {
                  columns: { id: true },
                  with: {
                    linkedFriend: true,
                  },
                },
              },
            },
            scoresheet: {
              with: {
                parent: {
                  with: {
                    sharedScoresheets: true,
                  },
                },
              },
            },
            game: {
              with: {
                linkedGames: true,
              },
            },
            location: {
              with: {
                linkedLocations: true,
              },
            },
          },
        },
        tx,
      );
      assertFound(
        returnedMatch,
        {
          userId: args.ctx.userId,
          value: args.input,
        },
        "Match not found.",
      );
      const friendsToShareWith = returnedMatch.matchPlayers
        .map((mp) => mp.player.linkedFriend?.id ?? false)
        .filter((id) => id !== false);
      const friendPlayers = await friendRepository.getMany(
        {
          userId: args.ctx.userId,
        },
        {
          where: {
            id: {
              in: friendsToShareWith,
            },
          },
          with: {
            friendSetting: true,
            friend: {
              with: {
                friends: {
                  where: { friendId: args.ctx.userId },
                  with: { friendSetting: true },
                },
              },
            },
          },
        },
        tx,
      );
      if (friendPlayers.length > 0) {
        const shareFriends = friendPlayers
          .map((friend) => {
            if (friend.friendSetting?.autoShareMatches === true) {
              const returnedFriendSetting = friend.friend.friends.find(
                (friend) => friend.friendId === args.ctx.userId,
              )?.friendSetting;
              if (returnedFriendSetting?.allowSharedMatches === true) {
                return {
                  friendUserId: friend.friendId,
                  shareLocation: friend.friendSetting.includeLocationWithMatch,
                  sharePlayers: friend.friendSetting.sharePlayersWithMatch,
                  defaultPermissionForMatches:
                    friend.friendSetting.defaultPermissionForMatches,
                  defaultPermissionForPlayers:
                    friend.friendSetting.defaultPermissionForPlayers,
                  defaultPermissionForLocation:
                    friend.friendSetting.defaultPermissionForLocation,
                  defaultPermissionForGame:
                    friend.friendSetting.defaultPermissionForGame,
                  allowSharedPlayers: returnedFriendSetting.allowSharedPlayers,
                  allowSharedLocation:
                    returnedFriendSetting.allowSharedLocation,
                  autoAcceptMatches: returnedFriendSetting.autoAcceptMatches,
                  autoAcceptPlayers: returnedFriendSetting.autoAcceptPlayers,
                  autoAcceptLocation: returnedFriendSetting.autoAcceptLocation,
                };
              }
            }
            return false;
          })
          .filter((friend) => friend !== false);
        for (const friend of shareFriends) {
          await tx.transaction(async (tx2) => {
            const insertedShareRequest = await sharingRepository.insert(
              {
                ownerId: args.ctx.userId,
                sharedWithId: friend.friendUserId,
                itemType: "match",
                itemId: returnedMatch.id,
                status: friend.autoAcceptMatches ? "accepted" : "pending",
                permission: friend.defaultPermissionForMatches,
                expiresAt: null,
              },
              tx2,
            );
            assertInserted(
              insertedShareRequest,
              {
                userId: args.ctx.userId,
                value: args.input,
              },
              "Share request not created.",
            );
            let sharedLocation: {
              sharedLocationId: number | null;
            } | null = null;
            const hasLinkedLocation =
              returnedMatch.location?.linkedLocations.find(
                (ll) => ll.ownerId === friend.friendUserId,
              );
            if (!hasLinkedLocation) {
              if (
                returnedMatch.locationId !== null &&
                friend.shareLocation &&
                friend.allowSharedLocation
              ) {
                const existingSharedLocationRequest =
                  await sharingRepository.get({
                    ownerId: args.ctx.userId,
                    sharedWithId: friend.friendUserId,
                    where: {
                      itemType: "location",
                      itemId: returnedMatch.locationId,
                      OR: [
                        {
                          status: "accepted",
                        },
                        {
                          parentShareId: insertedShareRequest.id,
                        },
                      ],
                    },
                  });
                if (existingSharedLocationRequest !== undefined) {
                  if (existingSharedLocationRequest.status === "accepted") {
                    const existingShared =
                      await locationRepository.getSharedByLocationId({
                        locationId: returnedMatch.locationId,
                        sharedWithId: friend.friendUserId,
                        where: {
                          ownerId: args.ctx.userId,
                        },
                      });
                    assertFound(
                      existingShared,
                      {
                        userId: args.ctx.userId,
                        value: args.input,
                      },
                      "Shared location not found.",
                    );
                    sharedLocation = {
                      sharedLocationId: existingShared.id,
                    };
                  }
                } else {
                  const createdSharedLocationRequest =
                    await sharingRepository.insert(
                      {
                        ownerId: args.ctx.userId,
                        sharedWithId: friend.friendUserId,
                        itemType: "location",
                        itemId: returnedMatch.locationId,
                        status: friend.autoAcceptLocation
                          ? "accepted"
                          : "pending",
                        permission: friend.defaultPermissionForLocation,
                        expiresAt: null,
                        parentShareId: insertedShareRequest.id,
                      },
                      tx2,
                    );
                  assertInserted(
                    createdSharedLocationRequest,
                    {
                      userId: args.ctx.userId,
                      value: args.input,
                    },
                    "Shared location request not created.",
                  );
                  if (friend.autoAcceptLocation) {
                    const existingSharedLocation =
                      await locationRepository.getShared({
                        id: createdSharedLocationRequest.itemId,
                        sharedWithId: friend.friendUserId,
                        where: {
                          ownerId: args.ctx.userId,
                        },
                      });
                    if (existingSharedLocation !== undefined) {
                      sharedLocation = {
                        sharedLocationId: existingSharedLocation.id,
                      };
                    } else {
                      const createdSharedLocation =
                        await locationRepository.insertShared({
                          ownerId: args.ctx.userId,
                          sharedWithId: friend.friendUserId,
                          locationId: returnedMatch.locationId,
                          permission: friend.defaultPermissionForLocation,
                        });
                      assertInserted(
                        createdSharedLocation,
                        {
                          userId: args.ctx.userId,
                          value: args.input,
                        },
                        "Shared location not created.",
                      );
                      sharedLocation = {
                        sharedLocationId: createdSharedLocation.id,
                      };
                    }
                  }
                }
              }
            } else {
              sharedLocation = {
                sharedLocationId: hasLinkedLocation.id,
              };
            }
            let sharedGame: {
              sharedGameId: number | null;
            } | null = null;
            const hasLinkedGame = returnedMatch.game.linkedGames.find(
              (lg) => lg.ownerId === friend.friendUserId,
            );
            if (!hasLinkedGame) {
              const existingSharedGameRequest = await sharingRepository.get({
                ownerId: args.ctx.userId,
                sharedWithId: friend.friendUserId,
                where: {
                  itemType: "game",
                  itemId: returnedMatch.gameId,
                  OR: [
                    {
                      status: "accepted",
                    },
                    {
                      parentShareId: insertedShareRequest.id,
                    },
                  ],
                },
              });

              if (existingSharedGameRequest !== undefined) {
                if (existingSharedGameRequest.status === "accepted") {
                  const existingSharedGame =
                    await gameRepository.getSharedGameByGameId({
                      gameId: returnedMatch.gameId,
                      sharedWithId: friend.friendUserId,
                      where: {
                        ownerId: args.ctx.userId,
                      },
                      tx: tx2,
                    });
                  assertFound(
                    existingSharedGame,
                    {
                      userId: args.ctx.userId,
                      value: args.input,
                    },
                    "Shared game not found.",
                  );
                  sharedGame = {
                    sharedGameId: existingSharedGame.id,
                  };
                }
              } else {
                const createdSharedGameRequest = await sharingRepository.insert(
                  {
                    ownerId: args.ctx.userId,
                    sharedWithId: friend.friendUserId,
                    itemType: "game",
                    itemId: returnedMatch.gameId,
                    status: friend.autoAcceptMatches ? "accepted" : "pending",
                    permission: friend.defaultPermissionForGame,
                    expiresAt: null,
                    parentShareId: insertedShareRequest.id,
                  },
                  tx2,
                );
                assertInserted(
                  createdSharedGameRequest,
                  {
                    userId: args.ctx.userId,
                    value: args.input,
                  },
                  "Shared game request not created.",
                );
                if (friend.autoAcceptMatches) {
                  const existingSharedGame =
                    await gameRepository.getSharedGameByGameId({
                      gameId: returnedMatch.gameId,
                      sharedWithId: friend.friendUserId,
                      where: {
                        ownerId: args.ctx.userId,
                      },
                      tx: tx2,
                    });
                  if (!existingSharedGame) {
                    const createdSharedGame =
                      await sharedGameRepository.insertSharedGame({
                        input: {
                          ownerId: args.ctx.userId,
                          sharedWithId: friend.friendUserId,
                          gameId: returnedMatch.gameId,
                          permission: friend.defaultPermissionForGame,
                        },
                        tx: tx2,
                      });
                    assertInserted(
                      createdSharedGame,
                      {
                        userId: args.ctx.userId,
                        value: args.input,
                      },
                      "Shared game not created.",
                    );
                    sharedGame = {
                      sharedGameId: createdSharedGame.id,
                    };
                  } else {
                    sharedGame = {
                      sharedGameId: existingSharedGame.id,
                    };
                  }
                }
              }
            } else {
              sharedGame = {
                sharedGameId: hasLinkedGame.id,
              };
            }
            if (!returnedMatch.scoresheet.parent) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Scoresheet does not have a parent for match.",
              });
            }
            const hasLinkedScoresheet =
              returnedMatch.scoresheet.parent.sharedScoresheets.find(
                (sharedParentScoreSheet) =>
                  sharedParentScoreSheet.ownerId === friend.friendUserId,
              );
            let parentSharedScoresheetOutput: {
              sharedScoresheetRequestId: number;
              sharedScoresheetId: number | null;
            } | null = null;
            if (!hasLinkedScoresheet) {
              const parentSharedScoresheetRequest = await sharingRepository.get(
                {
                  ownerId: args.ctx.userId,
                  sharedWithId: friend.friendUserId,
                  where: {
                    itemType: "scoresheet",
                    itemId: returnedMatch.scoresheet.parent.id,
                    OR: [
                      {
                        status: "accepted",
                      },
                      {
                        parentShareId: insertedShareRequest.id,
                      },
                    ],
                  },
                },
              );
              if (parentSharedScoresheetRequest !== undefined) {
                if (parentSharedScoresheetRequest.status === "accepted") {
                  const parentSharedScoresheet =
                    await scoresheetRepository.getSharedByScoresheetId({
                      sharedWithId: friend.friendUserId,
                      scoresheetId: parentSharedScoresheetRequest.itemId,
                      where: {
                        ownerId: args.ctx.userId,
                      },
                    });
                  if (!parentSharedScoresheet) {
                    if (!sharedGame?.sharedGameId) {
                      throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Shared game not found.",
                      });
                    }
                    const createdSharedScoresheet =
                      await scoresheetRepository.insertShared(
                        {
                          type: "game",
                          ownerId: args.ctx.userId,
                          sharedWithId: friend.friendUserId,
                          sharedGameId: sharedGame.sharedGameId,
                          scoresheetId: returnedMatch.scoresheet.parent.id,
                          permission: friend.defaultPermissionForGame,
                        },
                        tx2,
                      );
                    assertInserted(
                      createdSharedScoresheet,
                      {
                        userId: args.ctx.userId,
                        value: args.input,
                      },
                      "Shared parent scoresheet not created.",
                    );
                    parentSharedScoresheetOutput = {
                      sharedScoresheetRequestId:
                        parentSharedScoresheetRequest.id,
                      sharedScoresheetId: createdSharedScoresheet.id,
                    };
                  } else {
                    parentSharedScoresheetOutput = {
                      sharedScoresheetRequestId:
                        parentSharedScoresheetRequest.id,
                      sharedScoresheetId: parentSharedScoresheet.id,
                    };
                  }
                } else {
                  parentSharedScoresheetOutput = {
                    sharedScoresheetRequestId: parentSharedScoresheetRequest.id,
                    sharedScoresheetId: null,
                  };
                }
              } else {
                const parentSharedScoresheetRequest =
                  await sharingRepository.insert(
                    {
                      ownerId: args.ctx.userId,
                      sharedWithId: friend.friendUserId,
                      itemType: "scoresheet",
                      itemId: returnedMatch.scoresheet.parent.id,
                      status: friend.autoAcceptMatches ? "accepted" : "pending",
                      permission: friend.defaultPermissionForGame,
                      expiresAt: null,
                      parentShareId: insertedShareRequest.id,
                    },
                    tx2,
                  );
                assertInserted(
                  parentSharedScoresheetRequest,
                  {
                    userId: args.ctx.userId,
                    value: args.input,
                  },
                  "Shared parent scoresheet request not created.",
                );
                if (friend.autoAcceptMatches) {
                  if (!sharedGame?.sharedGameId) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Shared game not found.",
                    });
                  }
                  const parentSharedScoresheet =
                    await scoresheetRepository.insertShared(
                      {
                        type: "game",
                        ownerId: args.ctx.userId,
                        sharedWithId: friend.friendUserId,
                        sharedGameId: sharedGame.sharedGameId,
                        scoresheetId: returnedMatch.scoresheet.parent.id,
                        permission: friend.defaultPermissionForGame,
                      },
                      tx2,
                    );
                  assertInserted(
                    parentSharedScoresheet,
                    {
                      userId: args.ctx.userId,
                      value: args.input,
                    },
                    "Shared parent scoresheet not created.",
                  );
                  parentSharedScoresheetOutput = {
                    sharedScoresheetRequestId: parentSharedScoresheetRequest.id,
                    sharedScoresheetId: parentSharedScoresheet.id,
                  };
                }
              }
            }
            const parentSharedScoresheetId =
              parentSharedScoresheetOutput?.sharedScoresheetId ??
              hasLinkedScoresheet?.id;
            let sharedScoresheet: {
              sharedScoresheetRequestId: number;
              sharedScoresheetId: number | null;
            } | null = null;
            if (parentSharedScoresheetId) {
              if (friend.autoAcceptMatches) {
                if (!sharedGame?.sharedGameId) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Shared game not found.",
                  });
                }
                const insertedSharedMatchScoresheetRequest =
                  await sharingRepository.insert(
                    {
                      ownerId: args.ctx.userId,
                      sharedWithId: friend.friendUserId,
                      itemType: "scoresheet",
                      itemId: returnedMatch.scoresheet.id,
                      itemParentId: returnedMatch.scoresheet.parentId,
                      status: "accepted",
                      permission: friend.defaultPermissionForMatches,
                      expiresAt: null,
                      parentShareId: insertedShareRequest.id,
                    },
                    tx2,
                  );
                assertInserted(
                  insertedSharedMatchScoresheetRequest,
                  {
                    userId: args.ctx.userId,
                    value: args.input,
                  },
                  "Shared match scoresheet request not created.",
                );

                const insertedSharedMatchScoresheet =
                  await scoresheetRepository.insertShared(
                    {
                      type: "match",
                      ownerId: args.ctx.userId,
                      sharedWithId: friend.friendUserId,
                      sharedGameId: sharedGame.sharedGameId,
                      scoresheetId: returnedMatch.scoresheet.id,
                      permission: friend.defaultPermissionForMatches,
                      parentId: parentSharedScoresheetId,
                    },
                    tx2,
                  );
                assertInserted(
                  insertedSharedMatchScoresheet,
                  {
                    userId: args.ctx.userId,
                    value: args.input,
                  },
                  "Shared match scoresheet not created.",
                );
                sharedScoresheet = {
                  sharedScoresheetRequestId:
                    insertedSharedMatchScoresheetRequest.id,
                  sharedScoresheetId: insertedSharedMatchScoresheet.id,
                };
              } else {
                const insertedSharedMatchScoresheetRequest =
                  await sharingRepository.insert(
                    {
                      ownerId: args.ctx.userId,
                      sharedWithId: friend.friendUserId,
                      itemType: "scoresheet",
                      itemId: returnedMatch.scoresheet.id,
                      itemParentId: returnedMatch.scoresheet.parentId,
                      status: "pending",
                      permission: friend.defaultPermissionForMatches,
                      expiresAt: null,
                      parentShareId: insertedShareRequest.id,
                    },
                    tx2,
                  );
                assertInserted(
                  insertedSharedMatchScoresheetRequest,
                  {
                    userId: args.ctx.userId,
                    value: args.input,
                  },
                  "Shared match scoresheet request not created.",
                );
                sharedScoresheet = {
                  sharedScoresheetRequestId:
                    insertedSharedMatchScoresheetRequest.id,
                  sharedScoresheetId: null,
                };
              }
            } else {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Scoresheet does not have a parent request for match.",
              });
            }
            let sharedMatch: {
              sharedMatchId: number;
            } | null = null;
            if (friend.autoAcceptMatches) {
              if (!sharedGame?.sharedGameId) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Shared game not found. For Auto Accept Matches.",
                });
              }
              if (!sharedScoresheet.sharedScoresheetId) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message:
                    "Shared scoresheet not found. For Auto Accept Matches.",
                });
              }
              const insertedSharedMatch =
                await matchRepository.insertSharedMatch(
                  {
                    ownerId: args.ctx.userId,
                    sharedWithId: friend.friendUserId,
                    sharedGameId: sharedGame.sharedGameId,
                    matchId: returnedMatch.id,
                    sharedScoresheetId: sharedScoresheet.sharedScoresheetId,
                    sharedLocationId: sharedLocation?.sharedLocationId,
                    permission: friend.defaultPermissionForMatches,
                  },
                  tx2,
                );
              assertInserted(
                insertedSharedMatch,
                {
                  userId: args.ctx.userId,
                  value: args.input,
                },
                "Shared match not created.",
              );
              sharedMatch = {
                sharedMatchId: insertedSharedMatch.id,
              };
            }
            for (const matchPlayer of returnedMatch.matchPlayers) {
              const playerShareRequest = await sharingRepository.get({
                ownerId: args.ctx.userId,
                sharedWithId: friend.friendUserId,
                where: {
                  itemType: "player",
                  itemId: matchPlayer.playerId,
                  status: "accepted",
                },
              });
              if (!playerShareRequest) {
                const insertedPlayerShareRequest =
                  await sharingRepository.insert(
                    {
                      ownerId: args.ctx.userId,
                      sharedWithId: friend.friendUserId,
                      itemType: "player",
                      itemId: matchPlayer.playerId,
                      itemParentId: matchPlayer.matchId,
                      status: friend.autoAcceptPlayers ? "accepted" : "pending",
                      permission: friend.defaultPermissionForPlayers,
                      expiresAt: null,
                      parentShareId: insertedShareRequest.id,
                    },
                    tx2,
                  );
                assertInserted(
                  insertedPlayerShareRequest,
                  {
                    userId: args.ctx.userId,
                    value: args.input,
                  },
                  "Shared player request not created.",
                );
              }
              const insertedMatchPlayerRequest = await sharingRepository.insert(
                {
                  ownerId: args.ctx.userId,
                  sharedWithId: friend.friendUserId,
                  itemType: "matchPlayer",
                  itemId: matchPlayer.id,
                  status: friend.autoAcceptMatches ? "accepted" : "pending",
                  permission: friend.defaultPermissionForMatches,
                  expiresAt: null,
                  parentShareId: insertedShareRequest.id,
                },
                tx2,
              );
              assertInserted(
                insertedMatchPlayerRequest,
                {
                  userId: args.ctx.userId,
                  value: args.input,
                },
                "Shared match player request not created.",
              );
              let sharedPlayer: {
                sharedPlayerId: number | null;
              } | null = null;
              if (friend.autoAcceptPlayers) {
                const returnedSharedPlayer =
                  await playerRepository.getSharedPlayerByPlayerId({
                    playerId: matchPlayer.playerId,
                    sharedWithId: friend.friendUserId,
                    where: {
                      ownerId: args.ctx.userId,
                    },
                  });
                if (!returnedSharedPlayer) {
                  const insertedSharedPlayer =
                    await playerRepository.insertSharedPlayer({
                      input: {
                        playerId: matchPlayer.playerId,
                        ownerId: args.ctx.userId,
                        sharedWithId: friend.friendUserId,
                        permission: friend.defaultPermissionForPlayers,
                      },
                      tx: tx2,
                    });
                  assertInserted(
                    insertedSharedPlayer,
                    {
                      userId: args.ctx.userId,
                      value: args.input,
                    },
                    "Shared player not created.",
                  );
                  sharedPlayer = {
                    sharedPlayerId: insertedSharedPlayer.id,
                  };
                } else {
                  sharedPlayer = {
                    sharedPlayerId: returnedSharedPlayer.id,
                  };
                }
              }
              if (friend.autoAcceptMatches) {
                if (!sharedMatch?.sharedMatchId) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Shared match not found.",
                  });
                }
                const createdSharedMatchPlayer =
                  await matchPlayerRepository.insertSharedMatchPlayer({
                    input: {
                      matchPlayerId: matchPlayer.id,
                      ownerId: args.ctx.userId,
                      sharedWithId: friend.friendUserId,
                      sharedPlayerId: sharedPlayer?.sharedPlayerId,
                      permission: friend.defaultPermissionForMatches,
                      sharedMatchId: sharedMatch.sharedMatchId,
                    },
                    tx: tx2,
                  });
                assertInserted(
                  createdSharedMatchPlayer,
                  {
                    userId: args.ctx.userId,
                    value: args.input,
                  },
                  "Shared match player not created.",
                );
              }
            }
          });
        }
      }
    });
  }
}
export const friendService = new FriendService();
