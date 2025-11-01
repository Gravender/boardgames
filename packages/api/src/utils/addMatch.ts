import type { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import type {
  insertMatchPlayerSchema,
  insertRoundPlayerSchema,
  selectRoundSchema,
  selectScoreSheetSchema,
  selectSharedLocationSchema,
  selectSharedMatchSchema,
} from "@board-games/db/zodSchema";
import {
  game,
  gameRole,
  matchPlayer,
  matchPlayerRole,
  player,
  round,
  roundPlayer,
  scoresheet,
  sharedGame,
  sharedGameRole,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  sharedScoresheet,
  shareRequest,
  team,
} from "@board-games/db/schema";

import { handleLocationSharing } from "./sharing";

interface ShareFriendConfig {
  friendUserId: string;
  shareLocation: boolean;
  sharePlayers: boolean;
  defaultPermissionForMatches: "view" | "edit";
  defaultPermissionForPlayers: "view" | "edit";
  defaultPermissionForLocation: "view" | "edit";
  defaultPermissionForGame: "view" | "edit";
  allowSharedPlayers: boolean;
  allowSharedLocation: boolean;
  autoAcceptMatches: boolean;
  autoAcceptPlayers: boolean;
  autoAcceptLocation: boolean;
}
export async function shareMatchWithFriends(
  transaction: TransactionType,
  userId: string,
  createdMatch: {
    id: number;
    location: {
      id: number;
    } | null;
    game: {
      id: number;
    };
    matchPlayers: {
      id: number;
      player: {
        id: number;
      };
    }[];
    scoresheet: {
      id: number;
      parentId: number | null;
    };
  },
  shareFriends: ShareFriendConfig[],
) {
  for (const shareFriend of shareFriends) {
    await transaction.transaction(async (tx) => {
      let returnedSharedLocation: z.infer<
        typeof selectSharedLocationSchema
      > | null = null;
      const [newShare] = await tx
        .insert(shareRequest)
        .values({
          ownerId: userId,
          sharedWithId: shareFriend.friendUserId,
          itemType: "match",
          itemId: createdMatch.id,
          status: shareFriend.autoAcceptMatches ? "accepted" : "pending",
          permission: shareFriend.defaultPermissionForMatches,
          expiresAt: null,
        })
        .returning();
      if (!newShare) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }
      if (
        createdMatch.location &&
        shareFriend.shareLocation &&
        shareFriend.allowSharedLocation
      ) {
        returnedSharedLocation = await handleLocationSharing(
          tx,
          userId,
          createdMatch.location.id,
          shareFriend.friendUserId,
          shareFriend.defaultPermissionForLocation,
          shareFriend.autoAcceptLocation,
          newShare.id,
        );
      }
      const returnedSharedGame = await handleGameSharing(
        tx,
        userId,
        createdMatch.game.id,
        shareFriend,
        newShare.id,
      );

      let returnedSharedMatch: z.infer<typeof selectSharedMatchSchema> | null =
        null;
      if (shareFriend.autoAcceptMatches && returnedSharedGame) {
        const [returnedSharedScoresheet] = await tx
          .insert(sharedScoresheet)
          .values({
            ownerId: userId,
            sharedWithId: shareFriend.friendUserId,
            scoresheetId: createdMatch.scoresheet.id,
            permission: shareFriend.defaultPermissionForMatches,
            sharedGameId: returnedSharedGame.id,
            type: "match",
          })
          .returning();
        if (!returnedSharedScoresheet) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate share.",
          });
        }
        returnedSharedMatch = await createSharedMatch(
          tx,
          userId,
          createdMatch.id,
          shareFriend,
          returnedSharedGame.id,
          returnedSharedLocation?.id ?? undefined,
          returnedSharedScoresheet.id,
        );
      }
      for (const matchPlayer of createdMatch.matchPlayers) {
        await handlePlayerSharing(
          tx,
          userId,
          matchPlayer,
          shareFriend,
          newShare,
          returnedSharedMatch,
        );
      }
    });
  }
}
async function handleGameSharing(
  transaction: TransactionType,
  ownerId: string,
  gameId: number,
  shareFriend: ShareFriendConfig,
  newShareId: number,
) {
  const existingSharedGame = await transaction.query.sharedGame.findFirst({
    where: {
      gameId: gameId,
      sharedWithId: shareFriend.friendUserId,
      ownerId: ownerId,
    },
  });
  if (!existingSharedGame) {
    await transaction.insert(shareRequest).values({
      ownerId: ownerId,
      sharedWithId: shareFriend.friendUserId,
      itemType: "game",
      itemId: gameId,
      permission: shareFriend.defaultPermissionForGame,
      status: shareFriend.autoAcceptMatches ? "accepted" : "pending",
      parentShareId: newShareId,
      expiresAt: null,
    });
    if (shareFriend.autoAcceptMatches) {
      const [createdSharedGame] = await transaction
        .insert(sharedGame)
        .values({
          ownerId: ownerId,
          sharedWithId: shareFriend.friendUserId,
          gameId: gameId,
          permission: shareFriend.defaultPermissionForGame,
        })
        .returning();
      if (!createdSharedGame) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }
      return createdSharedGame;
    }
  } else {
    return existingSharedGame;
  }
  return null;
}
async function createSharedMatch(
  transaction: TransactionType,
  ownerId: string,
  matchId: number,
  shareFriend: ShareFriendConfig,
  sharedGameId: number,
  sharedLocationId: number | undefined,
  sharedScoresheetId: number,
) {
  const [createdSharedMatch] = await transaction
    .insert(sharedMatch)
    .values({
      ownerId: ownerId,
      sharedWithId: shareFriend.friendUserId,
      sharedGameId: sharedGameId,
      matchId: matchId,
      sharedScoresheetId: sharedScoresheetId,
      sharedLocationId: sharedLocationId,
      permission: shareFriend.defaultPermissionForMatches,
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
async function handlePlayerSharing(
  transaction: TransactionType,
  userId: string,
  matchPlayer: {
    id: number;
    player: {
      id: number;
    };
  },
  shareFriend: ShareFriendConfig,
  parentShare: {
    id: number;
    expiresAt: Date | null;
  },
  returnedSharedMatch: {
    id: number;
  } | null,
) {
  const returnedSharedPlayer = await createOrFindSharedPlayer(
    transaction,
    userId,
    matchPlayer.player.id,
    shareFriend,
    parentShare,
  );

  if (returnedSharedMatch && shareFriend.autoAcceptMatches) {
    await createSharedMatchPlayer(
      transaction,
      userId,
      matchPlayer,
      shareFriend,
      returnedSharedMatch,
      returnedSharedPlayer,
    );
  }
}
async function createOrFindSharedPlayer(
  transaction: TransactionType,
  userId: string,
  playerId: number,
  shareFriend: ShareFriendConfig,
  parentShare: {
    id: number;
    expiresAt: Date | null;
  },
) {
  const alreadyExists = await transaction.query.shareRequest.findFirst({
    where: {
      ownerId: userId,
      sharedWithId: shareFriend.friendUserId,
      itemType: "player",
      itemId: playerId,
      status: "accepted",
    },
  });
  if (!alreadyExists) {
    await transaction.insert(shareRequest).values({
      ownerId: userId,
      sharedWithId: shareFriend.friendUserId,
      itemType: "player",
      itemId: playerId,
      permission: shareFriend.defaultPermissionForPlayers,
      status: shareFriend.autoAcceptPlayers ? "accepted" : "pending",
      parentShareId: parentShare.id,
      expiresAt: parentShare.expiresAt,
    });
  }
  if (shareFriend.autoAcceptPlayers) {
    const existingSharedPlayer = await transaction.query.sharedPlayer.findFirst(
      {
        where: {
          playerId: playerId,
          sharedWithId: shareFriend.friendUserId,
          ownerId: userId,
        },
      },
    );
    if (!existingSharedPlayer) {
      const [createdSharedPlayer] = await transaction
        .insert(sharedPlayer)
        .values({
          ownerId: userId,
          sharedWithId: shareFriend.friendUserId,
          playerId: playerId,
          permission: shareFriend.defaultPermissionForPlayers,
        })
        .returning();
      if (!createdSharedPlayer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }
      return createdSharedPlayer;
    } else {
      return existingSharedPlayer;
    }
  }
  return null;
}
async function createSharedMatchPlayer(
  transaction: TransactionType,
  userId: string,

  matchPlayer: {
    id: number;
    player: {
      id: number;
    };
  },
  shareFriend: ShareFriendConfig,
  returnedSharedMatch: {
    id: number;
  },
  returnedSharedPlayer: {
    id: number;
  } | null,
) {
  const [createMatchPlayer] = await transaction
    .insert(sharedMatchPlayer)
    .values({
      ownerId: userId,
      sharedWithId: shareFriend.friendUserId,
      sharedMatchId: returnedSharedMatch.id,
      sharedPlayerId: returnedSharedPlayer?.id ?? undefined,
      matchPlayerId: matchPlayer.id,
      permission: shareFriend.defaultPermissionForMatches,
    })
    .returning();
  if (!createMatchPlayer) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate share.",
    });
  }
}
export async function processPlayer(
  transaction: TransactionType,
  matchId: number,
  playerToProcess: { id: number; type: "original" | "shared" | "linked" },
  teamId: number | null,
  userId: string,
) {
  if (
    playerToProcess.type === "original" ||
    playerToProcess.type === "linked"
  ) {
    return {
      matchId,
      playerId: playerToProcess.id,
      teamId,
    };
  }

  const returnedSharedPlayer = await transaction.query.sharedPlayer.findFirst({
    where: {
      sharedWithId: userId,
      id: playerToProcess.id,
    },
    with: {
      player: true,
    },
  });

  if (!returnedSharedPlayer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Shared player not found.",
    });
  }

  if (returnedSharedPlayer.linkedPlayerId !== null) {
    // Verify that the linked player belongs to the current user
    const linkedPlayer = await transaction.query.player.findFirst({
      where: {
        id: returnedSharedPlayer.linkedPlayerId,
        createdBy: userId,
      },
    });

    if (!linkedPlayer) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Linked player does not belong to current user.",
      });
    }

    return {
      matchId,
      playerId: returnedSharedPlayer.linkedPlayerId,
      teamId,
    };
  }

  // Create and link a new player
  const [insertedPlayer] = await transaction
    .insert(player)
    .values({
      createdBy: userId,
      name: returnedSharedPlayer.player.name,
    })
    .returning();

  if (!insertedPlayer) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create player.",
    });
  }

  await transaction
    .update(sharedPlayer)
    .set({
      linkedPlayerId: insertedPlayer.id,
    })
    .where(eq(sharedPlayer.id, returnedSharedPlayer.id));

  return {
    matchId,
    playerId: insertedPlayer.id,
    teamId,
  };
}
export async function getGame(
  input:
    | {
        id: number;
        type: "original";
      }
    | {
        sharedGameId: number;
        type: "shared";
      },
  transaction: TransactionType,
  userId: string,
) {
  if (input.type === "original") {
    const returnedGame = await transaction.query.game.findFirst({
      where: {
        id: input.id,
      },
    });
    if (!returnedGame) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Game not found.",
      });
    }
    return returnedGame.id;
  } else {
    const returnedSharedGame = await transaction.query.sharedGame.findFirst({
      where: {
        id: input.sharedGameId,
        sharedWithId: userId,
      },
      with: {
        game: true,
      },
    });
    if (!returnedSharedGame) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared game not found.",
      });
    }
    if (returnedSharedGame.linkedGameId !== null) {
      return returnedSharedGame.linkedGameId;
    } else {
      const [returnedGame] = await transaction
        .insert(game)
        .values({
          name: returnedSharedGame.game.name,
          createdBy: userId,
          yearPublished: returnedSharedGame.game.yearPublished,
          description: returnedSharedGame.game.description,
          rules: returnedSharedGame.game.rules,
          playersMax: returnedSharedGame.game.playersMax,
          playersMin: returnedSharedGame.game.playersMin,
          playtimeMax: returnedSharedGame.game.playtimeMax,
          playtimeMin: returnedSharedGame.game.playtimeMin,
        })
        .returning();
      if (!returnedGame) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Game not created.",
        });
      }
      await transaction
        .update(sharedGame)
        .set({ linkedGameId: returnedGame.id })
        .where(eq(sharedGame.id, returnedSharedGame.id));
      return returnedGame.id;
    }
  }
}
export async function getScoreSheetAndRounds(
  input: {
    id: number;
    type: "original" | "shared";
    matchName: string;
    gameId: number;
  },
  transaction: TransactionType,
  userId: string,
) {
  let returnedScoresheet:
    | (z.infer<typeof selectScoreSheetSchema> & {
        rounds: z.infer<typeof selectRoundSchema>[];
      })
    | undefined;
  if (input.type === "original") {
    returnedScoresheet = await transaction.query.scoresheet.findFirst({
      where: {
        createdBy: userId,
        id: input.id,
      },
      with: {
        rounds: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });
  } else {
    const returnedSharedScoresheet =
      await transaction.query.sharedScoresheet.findFirst({
        where: {
          scoresheetId: input.id,
          sharedWithId: userId,
        },
      });
    if (!returnedSharedScoresheet) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared scoresheet not found.",
      });
    }
    returnedScoresheet = await transaction.query.scoresheet.findFirst({
      where: {
        id: returnedSharedScoresheet.scoresheetId,
        createdBy: returnedSharedScoresheet.ownerId,
      },
      with: {
        rounds: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });
    if (!returnedScoresheet) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No scoresheet found for given scoresheetId",
      });
    }
  }
  if (!returnedScoresheet) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No scoresheet found for given scoresheetId",
    });
  }
  const [insertedScoresheet] = await transaction
    .insert(scoresheet)
    .values({
      parentId: returnedScoresheet.id,
      name: `${input.matchName} Scoresheet`,
      gameId: input.gameId,
      createdBy: userId,
      isCoop: returnedScoresheet.isCoop,
      winCondition: returnedScoresheet.winCondition,
      targetScore: returnedScoresheet.targetScore,
      roundsScore: returnedScoresheet.roundsScore,
      type: "Match",
    })
    .returning();
  if (!insertedScoresheet) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Scoresheet Not Created Successfully",
    });
  }
  const mappedRounds = returnedScoresheet.rounds.map((round) => ({
    ...round,
    id: undefined,
    scoresheetId: insertedScoresheet.id,
  }));
  if (mappedRounds.length > 0) {
    const insertedRounds = await transaction
      .insert(round)
      .values(mappedRounds)
      .returning();
    return {
      scoresheet: insertedScoresheet,
      rounds: insertedRounds,
    };
  }
  return {
    scoresheet: insertedScoresheet,
    rounds: [],
  };
}
export async function getMatchPlayersAndTeams(
  matchId: number,
  teams: {
    name: string;
    players: {
      id: number;
      type: "original" | "shared" | "linked";
      roles: (
        | {
            id: number;
            type: "original";
          }
        | {
            sharedId: number;
            type: "shared";
          }
      )[];
    }[];
  }[],
  rounds: {
    id: number;
  }[],
  transaction: TransactionType,
  userId: string,
) {
  const insertedMatchPlayers: {
    id: number;
    playerId: number;
    roles: (
      | {
          id: number;
          type: "original";
        }
      | {
          sharedId: number;
          type: "shared";
        }
    )[];
  }[] = [];
  if (
    teams.length === 1 &&
    teams[0] !== undefined &&
    teams[0].name === "No Team"
  ) {
    const inputPlayers = teams[0].players;
    const playersToInsert: {
      processedPlayer: z.infer<typeof insertMatchPlayerSchema>;
      roles: (
        | {
            id: number;
            type: "original";
          }
        | {
            sharedId: number;
            type: "shared";
          }
      )[];
    }[] = await Promise.all(
      inputPlayers.map(async (p) => {
        const processedPlayer = await processPlayer(
          transaction,
          matchId,
          p,
          null,
          userId,
        );
        return { processedPlayer, roles: p.roles };
      }),
    );
    const returnedMatchPlayers = await transaction
      .insert(matchPlayer)
      .values(playersToInsert.map((p) => p.processedPlayer))
      .returning();

    returnedMatchPlayers.forEach((returnedMatchPlayer) => {
      const foundMatchPlayer = playersToInsert.find(
        (mp) => mp.processedPlayer.playerId === returnedMatchPlayer.playerId,
      );
      if (!foundMatchPlayer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match player not created",
        });
      }
      insertedMatchPlayers.push({
        id: returnedMatchPlayer.id,
        playerId: returnedMatchPlayer.playerId,
        roles: foundMatchPlayer.roles,
      });
    });
  } else {
    for (const inputTeam of teams) {
      if (inputTeam.name === "No Team") {
        const playersToInsert: {
          processedPlayer: z.infer<typeof insertMatchPlayerSchema>;
          roles: (
            | {
                id: number;
                type: "original";
              }
            | {
                sharedId: number;
                type: "shared";
              }
          )[];
        }[] = await Promise.all(
          inputTeam.players.map(async (p) => {
            const processedPlayer = await processPlayer(
              transaction,
              matchId,
              p,
              null,
              userId,
            );
            return { processedPlayer, roles: p.roles };
          }),
        );
        const returnedMatchPlayers = await transaction
          .insert(matchPlayer)
          .values(playersToInsert.map((p) => p.processedPlayer))
          .returning();

        returnedMatchPlayers.forEach((returnedMatchPlayer) => {
          const foundMatchPlayer = playersToInsert.find(
            (mp) =>
              mp.processedPlayer.playerId === returnedMatchPlayer.playerId,
          );
          if (!foundMatchPlayer) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Match player not created",
            });
          }
          insertedMatchPlayers.push({
            id: returnedMatchPlayer.id,
            playerId: returnedMatchPlayer.playerId,
            roles: foundMatchPlayer.roles,
          });
        });
      } else {
        const [returnedTeam] = await transaction
          .insert(team)
          .values({ name: inputTeam.name, matchId: matchId })
          .returning();

        if (!returnedTeam) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Team Not Created Successfully",
          });
        }

        const playersToInsert: {
          processedPlayer: z.infer<typeof insertMatchPlayerSchema>;
          roles: (
            | {
                id: number;
                type: "original";
              }
            | {
                sharedId: number;
                type: "shared";
              }
          )[];
        }[] = await Promise.all(
          inputTeam.players.map(async (p) => {
            const processedPlayer = await processPlayer(
              transaction,
              matchId,
              p,
              returnedTeam.id,
              userId,
            );
            return { processedPlayer, roles: p.roles };
          }),
        );
        const returnedMatchPlayers = await transaction
          .insert(matchPlayer)
          .values(playersToInsert.map((p) => p.processedPlayer))
          .returning();

        returnedMatchPlayers.forEach((returnedMatchPlayer) => {
          const foundMatchPlayer = playersToInsert.find(
            (mp) =>
              mp.processedPlayer.playerId === returnedMatchPlayer.playerId,
          );
          if (!foundMatchPlayer) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Match player not created",
            });
          }
          insertedMatchPlayers.push({
            id: returnedMatchPlayer.id,
            playerId: returnedMatchPlayer.playerId,
            roles: foundMatchPlayer.roles,
          });
        });
      }
    }
  }
  const rolesToAdd = insertedMatchPlayers.flatMap((p) =>
    p.roles.map((role) => ({
      ...role,
      matchPlayerId: p.id,
    })),
  );
  if (rolesToAdd.length > 0) {
    const originalRoles = rolesToAdd.filter(
      (roleToAdd) => roleToAdd.type === "original",
    );
    const sharedRoles = rolesToAdd.filter(
      (roleToAdd) => roleToAdd.type !== "original",
    );
    await transaction.insert(matchPlayerRole).values(
      originalRoles.map((originalRole) => ({
        matchPlayerId: originalRole.matchPlayerId,
        roleId: originalRole.id,
      })),
    );
    const returnedMatch = await transaction.query.match.findFirst({
      where: {
        id: matchId,
        createdBy: userId,
      },
    });
    if (!returnedMatch) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match not found.",
      });
    }
    const uniqueRoles = sharedRoles.reduce<
      {
        sharedId: number;
      }[]
    >((acc, role) => {
      const existingRole = acc.find((r) => r.sharedId === role.sharedId);
      if (!existingRole) {
        acc.push({
          sharedId: role.sharedId,
        });
      }
      return acc;
    }, []);
    const mappedSharedRoles: {
      sharedRoleId: number;
      createRoleId: number;
    }[] = [];
    for (const uniqueRole of uniqueRoles) {
      const returnedSharedRole =
        await transaction.query.sharedGameRole.findFirst({
          where: {
            id: uniqueRole.sharedId,
            sharedWithId: userId,
          },
          with: {
            gameRole: true,
          },
        });
      if (!returnedSharedRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared role not found.",
        });
      }
      let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;
      if (linkedGameRoleId === null) {
        const [createdGameRole] = await transaction
          .insert(gameRole)
          .values({
            gameId: returnedMatch.gameId,
            name: returnedSharedRole.gameRole.name,
            description: returnedSharedRole.gameRole.description,
            createdBy: userId,
          })
          .returning();
        if (!createdGameRole) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create game role",
          });
        }
        await transaction
          .update(sharedGameRole)
          .set({
            linkedGameRoleId: createdGameRole.id,
          })
          .where(eq(sharedGameRole.id, returnedSharedRole.id));
        linkedGameRoleId = createdGameRole.id;
      }
      mappedSharedRoles.push({
        sharedRoleId: uniqueRole.sharedId,
        createRoleId: linkedGameRoleId,
      });
    }
    const mappedSharedRolesWithMatchPlayers: {
      matchPlayerId: number;
      roleId: number;
    }[] = sharedRoles.map((role) => {
      const createdRole = mappedSharedRoles.find(
        (r) => r.sharedRoleId === role.sharedId,
      );
      if (!createdRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared role not found.",
        });
      }
      return {
        matchPlayerId: role.matchPlayerId,
        roleId: createdRole.createRoleId,
      };
    });
    await transaction
      .insert(matchPlayerRole)
      .values(mappedSharedRolesWithMatchPlayers);
  }
  const roundPlayersToInsert: z.infer<typeof insertRoundPlayerSchema>[] =
    rounds.flatMap((round) => {
      return insertedMatchPlayers.map((player) => ({
        roundId: round.id,
        matchPlayerId: player.id,
      }));
    });
  if (roundPlayersToInsert.length > 0) {
    await transaction.insert(roundPlayer).values(roundPlayersToInsert);
  }
  return insertedMatchPlayers;
}
