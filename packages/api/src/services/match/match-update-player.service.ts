import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";

import type {
  UpdateMatchDetailsArgs,
  UpdateMatchPlayerTeamAndRolesArgs,
  UpdateMatchTeamArgs,
} from "./update-match.service.types";
import { matchUpdateDetailsRepository } from "../../repositories/match/match-update-details.repository";
import { matchUpdatePlayerRoleRepository } from "../../repositories/match/match-update-player-role.repository";
import { matchUpdatePlayerTeamRepository } from "../../repositories/match/match-update-player-team.repository";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { teamRepository } from "../../repositories/match/team.repository";
import { sharedGameRepository } from "../../repositories/shared-game/shared-game.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import { getMatchForUpdate } from "./match-update-helpers";
import { sharedRoleService } from "./shared-role.service";

class MatchUpdatePlayerService {
  public async updateMatchDetails(args: UpdateMatchDetailsArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({
        input: input.match,
        ctx,
        tx,
      });

      if (input.type === "player") {
        const returnedMatchPlayer =
          await matchPlayerRepository.getFromViewCanonicalForUser({
            input: {
              id: input.id,
              matchId: returnedMatch.id,
              userId: ctx.userId,
            },
            tx,
          });
        assertFound(
          returnedMatchPlayer,
          {
            userId: ctx.userId,
            value: input,
          },
          "Match player not found.",
        );
        if (returnedMatchPlayer.permission !== "edit") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Does not have permission to edit this match player.",
          });
        }
        await matchUpdateDetailsRepository.updateMatchPlayerDetails({
          input: {
            id: input.id,
            details: input.details,
          },
          tx,
        });
      } else {
        const foundTeam = await teamRepository.get({
          id: input.teamId,
          tx,
        });
        assertFound(
          foundTeam,
          {
            userId: ctx.userId,
            value: input,
          },
          "Team not found.",
        );
        if (foundTeam.matchId !== returnedMatch.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team does not belong to this match.",
          });
        }
        await matchUpdateDetailsRepository.updateTeamDetails({
          input: {
            teamId: input.teamId,
            details: input.details,
          },
          tx,
        });
      }
    });
  }

  public async updateMatchPlayerTeamAndRoles(
    args: UpdateMatchPlayerTeamAndRolesArgs,
  ) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const foundMatchPlayer =
        input.type === "original"
          ? await matchPlayerRepository.getFromViewCanonicalForUserByOriginalId(
              {
                input: {
                  id: input.id,
                  userId: ctx.userId,
                },
                tx,
              },
            )
          : await matchPlayerRepository.getFromViewCanonicalForUserBySharedId({
              input: {
                sharedMatchPlayerId: input.sharedMatchPlayerId,
                userId: ctx.userId,
              },
              tx,
            });
      assertFound(
        foundMatchPlayer,
        {
          userId: ctx.userId,
          value: input,
        },
        "Match player not found.",
      );
      if (foundMatchPlayer.permission !== "edit") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match player.",
        });
      }

      if (input.teamId !== undefined) {
        if (input.teamId !== null) {
          const foundTeam = await teamRepository.get({
            id: input.teamId,
            tx,
          });
          assertFound(
            foundTeam,
            {
              userId: ctx.userId,
              value: input,
            },
            "Team not found.",
          );
          if (foundTeam.matchId !== foundMatchPlayer.canonicalMatchId) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Team does not belong to this match.",
            });
          }
        }
        await matchUpdatePlayerTeamRepository.updateMatchPlayerTeam({
          input: {
            id: foundMatchPlayer.baseMatchPlayerId,
            teamId: input.teamId,
          },
          tx,
        });
      }

      if (input.rolesToAdd.length > 0) {
        const originalRoles: number[] = [];
        const sharedRoles: number[] = [];
        for (const role of input.rolesToAdd) {
          if (role.type === "original") {
            originalRoles.push(role.id);
          } else {
            sharedRoles.push(role.sharedId);
          }
        }

        if (input.type === "original") {
          if (originalRoles.length > 0) {
            await matchUpdatePlayerRoleRepository.insertMatchPlayerRoles({
              input: originalRoles.map((roleId) => ({
                matchPlayerId: input.id,
                roleId: roleId,
              })),
              tx,
            });
          }

          const returnedMatch = await matchRepository.get(
            {
              id: foundMatchPlayer.canonicalMatchId,
              createdBy: foundMatchPlayer.ownerId,
            },
            tx,
          );
          assertFound(
            returnedMatch,
            {
              userId: ctx.userId,
              value: input,
            },
            "Match not found.",
          );

          for (const sharedRoleToAdd of sharedRoles) {
            await sharedRoleService.insertSharedRoleForMatchPlayer({
              userId: ctx.userId,
              tx,
              gameId: returnedMatch.gameId,
              matchPlayerId: input.id,
              sharedRoleId: sharedRoleToAdd,
              errorContext: input,
            });
          }
        }

        if (input.type === "shared") {
          if (originalRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Original roles not allowed for shared match players.",
            });
          }
          if (foundMatchPlayer.sharedMatchPlayerId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared Match Player not set.",
            });
          }

          for (const sharedRoleToAdd of sharedRoles) {
            const returnedSharedRole = await sharedGameRepository.getSharedRole(
              {
                input: {
                  sharedRoleId: sharedRoleToAdd,
                },
                userId: ctx.userId,
                tx,
              },
            );
            assertFound(
              returnedSharedRole,
              {
                userId: ctx.userId,
                value: input,
              },
              "Shared role not found.",
            );

            const existingMatchPlayerRole =
              await matchUpdatePlayerRoleRepository.getMatchPlayerRole({
                input: {
                  matchPlayerId: foundMatchPlayer.baseMatchPlayerId,
                  roleId: returnedSharedRole.gameRoleId,
                },
                tx,
              });
            if (existingMatchPlayerRole) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Shared role already exists.",
              });
            }

            const insertedMatchPlayerRole =
              await matchUpdatePlayerRoleRepository.insertMatchPlayerRole({
                input: {
                  matchPlayerId: foundMatchPlayer.baseMatchPlayerId,
                  roleId: returnedSharedRole.gameRoleId,
                },
                tx,
              });
            assertInserted(
              insertedMatchPlayerRole,
              {
                userId: ctx.userId,
                value: input,
              },
              "Failed to create match player role",
            );

            const insertedSharedMatchPlayerRole =
              await matchUpdatePlayerRoleRepository.insertSharedMatchPlayerRole(
                {
                  input: {
                    sharedMatchPlayerId: foundMatchPlayer.sharedMatchPlayerId,
                    sharedGameRoleId: returnedSharedRole.id,
                  },
                  tx,
                },
              );
            assertInserted(
              insertedSharedMatchPlayerRole,
              {
                userId: ctx.userId,
                value: input,
              },
              "Failed to create shared match player role",
            );
          }
        }
      }

      if (input.rolesToRemove.length > 0) {
        const originalRoles: number[] = [];
        const sharedRoles: number[] = [];
        for (const role of input.rolesToRemove) {
          if (role.type === "original") {
            originalRoles.push(role.id);
          } else {
            sharedRoles.push(role.sharedId);
          }
        }

        if (input.type === "original") {
          if (originalRoles.length > 0) {
            await matchUpdatePlayerRoleRepository.deleteMatchPlayerRoles({
              input: {
                matchPlayerId: input.id,
                roleIds: originalRoles,
              },
              tx,
            });
          }
          if (sharedRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message:
                "Shared roles cannot be removed from original match players via this method.",
            });
          }
        }

        if (input.type === "shared") {
          if (originalRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Original roles not allowed for shared match players.",
            });
          }
          if (foundMatchPlayer.sharedMatchPlayerId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared Match Player not set.",
            });
          }

          for (const sharedRoleToRemove of sharedRoles) {
            const returnedSharedRole = await sharedGameRepository.getSharedRole(
              {
                input: {
                  sharedRoleId: sharedRoleToRemove,
                },
                userId: ctx.userId,
                tx,
              },
            );
            assertFound(
              returnedSharedRole,
              {
                userId: ctx.userId,
                value: input,
              },
              "Shared role not found.",
            );

            await matchUpdatePlayerRoleRepository.deleteSharedMatchPlayerRole({
              input: {
                sharedMatchPlayerId: foundMatchPlayer.sharedMatchPlayerId,
                sharedGameRoleId: returnedSharedRole.id,
              },
              tx,
            });

            await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
              input: {
                matchPlayerId: foundMatchPlayer.baseMatchPlayerId,
                roleId: returnedSharedRole.gameRoleId,
              },
              tx,
            });
          }
        }
      }
    });
  }

  /**
   * Validates that a team belongs to the specified match.
   */
  private async validateTeamBelongsToMatch(
    ctx: UpdateMatchTeamArgs["ctx"],
    tx: TransactionType,
    returnedMatch: Awaited<ReturnType<typeof getMatchForUpdate>>,
    teamId: number,
  ): Promise<NonNullable<Awaited<ReturnType<typeof teamRepository.get>>>> {
    const currentTeam = await teamRepository.get({
      id: teamId,
      tx,
    });
    assertFound(
      currentTeam,
      {
        userId: ctx.userId,
        value: { teamId },
      },
      "Team not found.",
    );

    if (currentTeam.matchId !== returnedMatch.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team does not belong to this match.",
      });
    }

    return currentTeam;
  }

  /**
   * Fetches and filters match players by IDs with permission check.
   * Returns filtered players and throws if not all requested players have edit permission.
   */
  private async getAndFilterMatchPlayers(
    ctx: UpdateMatchTeamArgs["ctx"],
    tx: TransactionType,
    matchId: number,
    playerIds: number[],
    filterFn: (
      mp: Awaited<
        ReturnType<
          typeof matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser
        >
      >[number],
    ) => boolean,
  ) {
    const foundMatchPlayers =
      await matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser({
        input: {
          matchId,
          userId: ctx.userId,
        },
        tx,
      });

    const filteredPlayers = foundMatchPlayers.filter(filterFn);

    if (filteredPlayers.length !== playerIds.length) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Does not have permission to edit all match players.",
      });
    }

    return filteredPlayers;
  }

  /**
   * Handles adding players to a team for an original match.
   */
  private async handleOriginalMatchPlayersToAdd(
    ctx: UpdateMatchTeamArgs["ctx"],
    tx: TransactionType,
    returnedMatch: Awaited<ReturnType<typeof getMatchForUpdate>>,
    currentTeam: NonNullable<Awaited<ReturnType<typeof teamRepository.get>>>,
    playersToAdd: Extract<
      UpdateMatchTeamArgs["input"],
      { type: "original" }
    >["playersToAdd"],
  ) {
    const playerIds = playersToAdd.map((p) => p.id);
    await this.getAndFilterMatchPlayers(
      ctx,
      tx,
      returnedMatch.id,
      playerIds,
      (mp) =>
        playerIds.includes(mp.baseMatchPlayerId) && mp.permission === "edit",
    );

    await matchUpdatePlayerTeamRepository.updateMatchPlayersTeam({
      input: {
        matchId: returnedMatch.id,
        matchPlayerIds: playerIds,
        teamId: currentTeam.id,
      },
      tx,
    });

    const originalRoles: number[] = [];
    const sharedRoles: { matchPlayerId: number; sharedId: number }[] = [];
    for (const playerToAdd of playersToAdd) {
      for (const role of playerToAdd.roles) {
        if (role.type === "original") {
          originalRoles.push(role.id);
        } else {
          sharedRoles.push({
            matchPlayerId: playerToAdd.id,
            sharedId: role.sharedId,
          });
        }
      }
    }

    if (originalRoles.length > 0) {
      const originalRolesToInsert = playersToAdd.flatMap((p) =>
        p.roles
          .filter((r) => r.type === "original")
          .map((r) => ({
            matchPlayerId: p.id,
            roleId: r.id,
          })),
      );
      await matchUpdatePlayerRoleRepository.insertMatchPlayerRoles({
        input: originalRolesToInsert,
        tx,
      });
    }

    if (sharedRoles.length > 0) {
      for (const sharedRole of sharedRoles) {
        await sharedRoleService.insertSharedRoleForMatchPlayer({
          userId: ctx.userId,
          tx,
          gameId: returnedMatch.gameId,
          matchPlayerId: sharedRole.matchPlayerId,
          sharedRoleId: sharedRole.sharedId,
          errorContext: {
            sharedRoleId: sharedRole.sharedId,
          },
        });
      }
    }
  }

  /**
   * Handles removing players from a team for an original match.
   */
  private async handleOriginalMatchPlayersToRemove(
    ctx: UpdateMatchTeamArgs["ctx"],
    tx: TransactionType,
    returnedMatch: Awaited<ReturnType<typeof getMatchForUpdate>>,
    playersToRemove: Extract<
      UpdateMatchTeamArgs["input"],
      { type: "original" }
    >["playersToRemove"],
  ) {
    const playerIds = playersToRemove.map((p) => p.id);
    await this.getAndFilterMatchPlayers(
      ctx,
      tx,
      returnedMatch.id,
      playerIds,
      (mp) =>
        playerIds.includes(mp.baseMatchPlayerId) && mp.permission === "edit",
    );

    await matchUpdatePlayerTeamRepository.updateMatchPlayersTeam({
      input: {
        matchId: returnedMatch.id,
        matchPlayerIds: playerIds,
        teamId: null,
      },
      tx,
    });

    const rolesToRemove = playersToRemove.flatMap((p) =>
      p.roles.map((r) => ({
        matchPlayerId: p.id,
        roleId: r.id,
      })),
    );
    if (rolesToRemove.length > 0) {
      for (const roleToRemove of rolesToRemove) {
        await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
          input: {
            matchPlayerId: roleToRemove.matchPlayerId,
            roleId: roleToRemove.roleId,
          },
          tx,
        });
      }
    }
  }

  /**
   * Handles updating players (adding/removing roles) for an original match.
   */
  private async handleOriginalMatchPlayersToUpdate(
    ctx: UpdateMatchTeamArgs["ctx"],
    tx: TransactionType,
    returnedMatch: Awaited<ReturnType<typeof getMatchForUpdate>>,
    playersToUpdate: Extract<
      UpdateMatchTeamArgs["input"],
      { type: "original" }
    >["playersToUpdate"],
  ) {
    const playerIds = playersToUpdate.map((p) => p.id);
    await this.getAndFilterMatchPlayers(
      ctx,
      tx,
      returnedMatch.id,
      playerIds,
      (mp) =>
        playerIds.includes(mp.baseMatchPlayerId) && mp.permission === "edit",
    );

    // Add roles
    const rolesToAdd = playersToUpdate.flatMap((p) =>
      p.rolesToAdd.map((role) => ({
        matchPlayerId: p.id,
        role: role,
      })),
    );
    if (rolesToAdd.length > 0) {
      const originalRolesToAdd = rolesToAdd
        .filter((r) => r.role.type === "original")
        .map((r) => ({
          matchPlayerId: r.matchPlayerId,
          roleId: r.role.type === "original" ? r.role.id : 0,
        }))
        .filter((r) => r.roleId !== 0);
      if (originalRolesToAdd.length > 0) {
        await matchUpdatePlayerRoleRepository.insertMatchPlayerRoles({
          input: originalRolesToAdd,
          tx,
        });
      }

      const sharedRolesToAdd = rolesToAdd.filter(
        (r) => r.role.type !== "original",
      );
      for (const sharedRoleToAdd of sharedRolesToAdd) {
        const sharedRoleId =
          sharedRoleToAdd.role.type === "shared"
            ? sharedRoleToAdd.role.sharedId
            : 0;
        if (sharedRoleId !== 0) {
          await sharedRoleService.insertSharedRoleForMatchPlayer({
            userId: ctx.userId,
            tx,
            gameId: returnedMatch.gameId,
            matchPlayerId: sharedRoleToAdd.matchPlayerId,
            sharedRoleId: sharedRoleId,
            errorContext: { sharedRoleId },
          });
        }
      }
    }

    // Remove roles
    const rolesToRemove = playersToUpdate.flatMap((p) =>
      p.rolesToRemove.map((role) => ({
        matchPlayerId: p.id,
        roleId: role.id,
      })),
    );
    if (rolesToRemove.length > 0) {
      for (const roleToRemove of rolesToRemove) {
        await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
          input: {
            matchPlayerId: roleToRemove.matchPlayerId,
            roleId: roleToRemove.roleId,
          },
          tx,
        });
      }
    }
  }

  /**
   * Handles adding players to a team for a shared match.
   */
  private async handleSharedMatchPlayersToAdd(
    ctx: UpdateMatchTeamArgs["ctx"],
    tx: TransactionType,
    returnedMatch: Awaited<ReturnType<typeof getMatchForUpdate>>,
    currentTeam: NonNullable<Awaited<ReturnType<typeof teamRepository.get>>>,
    playersToAdd: Extract<
      UpdateMatchTeamArgs["input"],
      { type: "shared" }
    >["playersToAdd"],
  ) {
    const sharedPlayerIds = playersToAdd.map((p) => p.sharedMatchPlayerId);
    const filteredPlayers = await this.getAndFilterMatchPlayers(
      ctx,
      tx,
      returnedMatch.id,
      sharedPlayerIds,
      (mp) =>
        mp.sharedMatchPlayerId !== null &&
        sharedPlayerIds.includes(mp.sharedMatchPlayerId) &&
        mp.permission === "edit",
    );

    const baseMatchPlayerIds = filteredPlayers.map(
      (mp) => mp.baseMatchPlayerId,
    );
    await matchUpdatePlayerTeamRepository.updateMatchPlayersTeam({
      input: {
        matchId: returnedMatch.id,
        matchPlayerIds: baseMatchPlayerIds,
        teamId: currentTeam.id,
      },
      tx,
    });

    for (const playerToAdd of playersToAdd) {
      const foundPlayer = filteredPlayers.find(
        (mp) => mp.sharedMatchPlayerId === playerToAdd.sharedMatchPlayerId,
      );
      if (!foundPlayer?.sharedMatchPlayerId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Shared Match Player not set.",
        });
      }

      for (const role of playerToAdd.roles) {
        await sharedRoleService.insertSharedRoleForSharedMatchPlayer({
          userId: ctx.userId,
          tx,
          gameId: returnedMatch.gameId,
          baseMatchPlayerId: foundPlayer.baseMatchPlayerId,
          sharedMatchPlayerId: foundPlayer.sharedMatchPlayerId,
          sharedRoleId: role.sharedId,
          errorContext: { sharedRoleId: role.sharedId },
        });
      }
    }
  }

  /**
   * Handles removing players from a team for a shared match.
   */
  private async handleSharedMatchPlayersToRemove(
    ctx: UpdateMatchTeamArgs["ctx"],
    tx: TransactionType,
    returnedMatch: Awaited<ReturnType<typeof getMatchForUpdate>>,
    playersToRemove: Extract<
      UpdateMatchTeamArgs["input"],
      { type: "shared" }
    >["playersToRemove"],
  ) {
    const sharedPlayerIds = playersToRemove.map((p) => p.sharedMatchPlayerId);
    const filteredPlayers = await this.getAndFilterMatchPlayers(
      ctx,
      tx,
      returnedMatch.id,
      sharedPlayerIds,
      (mp) =>
        mp.sharedMatchPlayerId !== null &&
        sharedPlayerIds.includes(mp.sharedMatchPlayerId) &&
        mp.permission === "edit",
    );

    const baseMatchPlayerIds = filteredPlayers.map(
      (mp) => mp.baseMatchPlayerId,
    );
    await matchUpdatePlayerTeamRepository.updateMatchPlayersTeam({
      input: {
        matchId: returnedMatch.id,
        matchPlayerIds: baseMatchPlayerIds,
        teamId: null,
      },
      tx,
    });

    for (const playerToRemove of playersToRemove) {
      const foundPlayer = filteredPlayers.find(
        (mp) => mp.sharedMatchPlayerId === playerToRemove.sharedMatchPlayerId,
      );
      if (!foundPlayer?.sharedMatchPlayerId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Shared Match Player not set.",
        });
      }

      for (const role of playerToRemove.roles) {
        const returnedSharedRole = await sharedGameRepository.getSharedRole({
          input: {
            sharedRoleId: role.sharedId,
          },
          userId: ctx.userId,
          tx,
        });
        assertFound(
          returnedSharedRole,
          {
            userId: ctx.userId,
            value: { sharedRoleId: role.sharedId },
          },
          "Shared role not found.",
        );

        await matchUpdatePlayerRoleRepository.deleteSharedMatchPlayerRole({
          input: {
            sharedMatchPlayerId: foundPlayer.sharedMatchPlayerId,
            sharedGameRoleId: returnedSharedRole.id,
          },
          tx,
        });

        await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
          input: {
            matchPlayerId: foundPlayer.baseMatchPlayerId,
            roleId: returnedSharedRole.gameRoleId,
          },
          tx,
        });
      }
    }
  }

  /**
   * Handles updating players (adding/removing roles) for a shared match.
   */
  private async handleSharedMatchPlayersToUpdate(
    ctx: UpdateMatchTeamArgs["ctx"],
    tx: TransactionType,
    returnedMatch: Awaited<ReturnType<typeof getMatchForUpdate>>,
    playersToUpdate: Extract<
      UpdateMatchTeamArgs["input"],
      { type: "shared" }
    >["playersToUpdate"],
  ) {
    const sharedPlayerIds = playersToUpdate.map((p) => p.sharedMatchPlayerId);
    const filteredPlayers = await this.getAndFilterMatchPlayers(
      ctx,
      tx,
      returnedMatch.id,
      sharedPlayerIds,
      (mp) =>
        mp.sharedMatchPlayerId !== null &&
        sharedPlayerIds.includes(mp.sharedMatchPlayerId) &&
        mp.permission === "edit",
    );

    // Add roles
    for (const playerToUpdate of playersToUpdate) {
      const foundPlayer = filteredPlayers.find(
        (mp) => mp.sharedMatchPlayerId === playerToUpdate.sharedMatchPlayerId,
      );
      if (!foundPlayer?.sharedMatchPlayerId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Shared Match Player not set.",
        });
      }

      for (const role of playerToUpdate.rolesToAdd) {
        await sharedRoleService.insertSharedRoleForSharedMatchPlayer({
          userId: ctx.userId,
          tx,
          gameId: returnedMatch.gameId,
          baseMatchPlayerId: foundPlayer.baseMatchPlayerId,
          sharedMatchPlayerId: foundPlayer.sharedMatchPlayerId,
          sharedRoleId: role.sharedId,
          errorContext: { sharedRoleId: role.sharedId },
        });
      }
    }

    // Remove roles
    for (const playerToUpdate of playersToUpdate) {
      const foundPlayer = filteredPlayers.find(
        (mp) => mp.sharedMatchPlayerId === playerToUpdate.sharedMatchPlayerId,
      );
      if (!foundPlayer?.sharedMatchPlayerId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Shared Match Player not set.",
        });
      }

      for (const role of playerToUpdate.rolesToRemove) {
        const returnedSharedRole = await sharedGameRepository.getSharedRole({
          input: {
            sharedRoleId: role.sharedId,
          },
          userId: ctx.userId,
          tx,
        });
        assertFound(
          returnedSharedRole,
          {
            userId: ctx.userId,
            value: { sharedRoleId: role.sharedId },
          },
          "Shared role not found.",
        );

        await matchUpdatePlayerRoleRepository.deleteSharedMatchPlayerRole({
          input: {
            sharedMatchPlayerId: foundPlayer.sharedMatchPlayerId,
            sharedGameRoleId: returnedSharedRole.id,
          },
          tx,
        });

        await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
          input: {
            matchPlayerId: foundPlayer.baseMatchPlayerId,
            roleId: returnedSharedRole.gameRoleId,
          },
          tx,
        });
      }
    }
  }

  public async updateMatchTeam(args: UpdateMatchTeamArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({
        input:
          input.type === "original"
            ? { type: "original", id: input.id }
            : { type: "shared", sharedMatchId: input.sharedMatchId },
        ctx,
        tx,
      });

      const currentTeam = await this.validateTeamBelongsToMatch(
        ctx,
        tx,
        returnedMatch,
        input.team.id,
      );

      if (input.team.name !== undefined) {
        await teamRepository.updateTeam({
          input: {
            id: input.team.id,
            name: input.team.name,
          },
          tx,
        });
      }

      if (input.type === "original") {
        if (input.playersToAdd.length > 0) {
          await this.handleOriginalMatchPlayersToAdd(
            ctx,
            tx,
            returnedMatch,
            currentTeam,
            input.playersToAdd,
          );
        }

        if (input.playersToRemove.length > 0) {
          await this.handleOriginalMatchPlayersToRemove(
            ctx,
            tx,
            returnedMatch,
            input.playersToRemove,
          );
        }

        if (input.playersToUpdate.length > 0) {
          await this.handleOriginalMatchPlayersToUpdate(
            ctx,
            tx,
            returnedMatch,
            input.playersToUpdate,
          );
        }
      } else {
        if (input.playersToAdd.length > 0) {
          await this.handleSharedMatchPlayersToAdd(
            ctx,
            tx,
            returnedMatch,
            currentTeam,
            input.playersToAdd,
          );
        }

        if (input.playersToRemove.length > 0) {
          await this.handleSharedMatchPlayersToRemove(
            ctx,
            tx,
            returnedMatch,
            input.playersToRemove,
          );
        }

        if (input.playersToUpdate.length > 0) {
          await this.handleSharedMatchPlayersToUpdate(
            ctx,
            tx,
            returnedMatch,
            input.playersToUpdate,
          );
        }
      }
    });
  }
}

export const matchUpdatePlayerService = new MatchUpdatePlayerService();
