import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";

import { gameRepository } from "../../repositories/game/game.repository";
import { matchUpdatePlayerRoleRepository } from "../../repositories/match/match-update-player-role.repository";
import { sharedGameRepository } from "../../routers/game/sub-routers/shared/repository/shared-game.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";

/**
 * Unified service for handling shared role operations.
 * Consolidates logic for linking shared roles, creating game roles, and inserting match player roles.
 */
class SharedRoleService {
  /**
   * Gets or creates a linked game role for a shared role.
   * If the shared role is not yet linked, creates a new game role and links it.
   * Returns the linked game role ID.
   */
  public async getOrCreateLinkedGameRole(args: {
    userId: string;
    tx: TransactionType;
    gameId: number;
    sharedRoleId: number;
    errorContext?: Record<string, unknown>;
  }): Promise<number> {
    const { userId, tx, gameId, sharedRoleId, errorContext } = args;

    const returnedSharedRole = await sharedGameRepository.getSharedRole({
      input: {
        sharedRoleId,
      },
      userId,
      tx,
    });

    assertFound(
      returnedSharedRole,
      {
        userId,
        value: errorContext ?? { sharedRoleId },
      },
      "Shared role not found.",
    );

    let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;

    if (!linkedGameRoleId) {
      const createdGameRole = await gameRepository.createGameRole({
        input: {
          gameId,
          name: returnedSharedRole.gameRole.name,
          description: returnedSharedRole.gameRole.description,
          createdBy: userId,
        },
        tx,
      });

      assertInserted(
        createdGameRole,
        {
          userId,
          value: errorContext ?? { sharedRoleId },
        },
        "Game role not created.",
      );

      linkedGameRoleId = createdGameRole.id;

      const linkedRole = await sharedGameRepository.linkSharedRole({
        input: {
          sharedRoleId: returnedSharedRole.id,
          linkedRoleId: createdGameRole.id,
        },
        tx,
      });

      assertInserted(
        linkedRole,
        {
          userId,
          value: errorContext ?? { sharedRoleId },
        },
        "Linked role not created.",
      );
    }

    return linkedGameRoleId;
  }

  /**
   * Inserts a shared role for a single match player.
   * Handles creating and linking the game role if needed.
   */
  public async insertSharedRoleForMatchPlayer(args: {
    userId: string;
    tx: TransactionType;
    gameId: number;
    matchPlayerId: number;
    sharedRoleId: number;
    errorContext?: Record<string, unknown>;
  }): Promise<void> {
    const { userId, tx, gameId, matchPlayerId, sharedRoleId, errorContext } =
      args;

    const linkedGameRoleId = await this.getOrCreateLinkedGameRole({
      userId,
      tx,
      gameId,
      sharedRoleId,
      errorContext,
    });

    await matchUpdatePlayerRoleRepository.insertMatchPlayerRole({
      input: {
        matchPlayerId,
        roleId: linkedGameRoleId,
      },
      tx,
    });
  }

  /**
   * Inserts shared roles for multiple match players with deduplication.
   * Efficiently handles batch operations by deduplicating shared roles
   * before creating/linking game roles.
   */
  public async insertSharedRolesForMatchPlayers(args: {
    userId: string;
    tx: TransactionType;
    gameId: number;
    roles: {
      matchPlayerId: number;
      sharedRoleId: number;
    }[];
    errorContext?: Record<string, unknown>;
  }): Promise<void> {
    const { userId, tx, gameId, roles, errorContext } = args;

    if (roles.length === 0) return;

    // Deduplicate by sharedRoleId
    const uniqueSharedRoleIds = Array.from(
      new Set(roles.map((r) => r.sharedRoleId)),
    );

    // Map shared role IDs to linked game role IDs
    const sharedRoleToGameRoleMap = new Map<number, number>();

    for (const sharedRoleId of uniqueSharedRoleIds) {
      const linkedGameRoleId = await this.getOrCreateLinkedGameRole({
        userId,
        tx,
        gameId,
        sharedRoleId,
        errorContext,
      });
      sharedRoleToGameRoleMap.set(sharedRoleId, linkedGameRoleId);
    }

    // Map roles to match player roles
    const matchPlayerRoles = roles.map((role) => {
      const gameRoleId = sharedRoleToGameRoleMap.get(role.sharedRoleId);
      if (!gameRoleId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get linked game role for shared role ${role.sharedRoleId}`,
        });
      }
      return {
        matchPlayerId: role.matchPlayerId,
        roleId: gameRoleId,
      };
    });

    await matchUpdatePlayerRoleRepository.insertMatchPlayerRoles({
      input: matchPlayerRoles,
      tx,
    });
  }

  /**
   * Inserts a shared role for a shared match player.
   * This handles both the base match player role and the shared match player role.
   * Checks for existing roles to prevent duplicates.
   */
  public async insertSharedRoleForSharedMatchPlayer(args: {
    userId: string;
    tx: TransactionType;
    gameId: number;
    baseMatchPlayerId: number;
    sharedMatchPlayerId: number;
    sharedRoleId: number;
    errorContext?: Record<string, unknown>;
  }): Promise<void> {
    const {
      userId,
      tx,
      gameId,
      baseMatchPlayerId,
      sharedMatchPlayerId,
      sharedRoleId,
      errorContext,
    } = args;

    const returnedSharedRole = await sharedGameRepository.getSharedRole({
      input: {
        sharedRoleId,
      },
      userId,
      tx,
    });

    assertFound(
      returnedSharedRole,
      {
        userId,
        value: errorContext ?? { sharedRoleId },
      },
      "Shared role not found.",
    );

    // Get or create linked game role
    const linkedGameRoleId = await this.getOrCreateLinkedGameRole({
      userId,
      tx,
      gameId,
      sharedRoleId,
      errorContext,
    });

    // Check if role already exists using the linked game role ID
    const existingMatchPlayerRole =
      await matchUpdatePlayerRoleRepository.getMatchPlayerRole({
        input: {
          matchPlayerId: baseMatchPlayerId,
          roleId: linkedGameRoleId,
        },
        tx,
      });

    if (existingMatchPlayerRole) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Shared role already exists.",
      });
    }

    // Insert base match player role
    const insertedMatchPlayerRole =
      await matchUpdatePlayerRoleRepository.insertMatchPlayerRole({
        input: {
          matchPlayerId: baseMatchPlayerId,
          roleId: linkedGameRoleId,
        },
        tx,
      });

    assertInserted(
      insertedMatchPlayerRole,
      {
        userId,
        value: errorContext ?? { sharedRoleId },
      },
      "Failed to create match player role",
    );

    // Insert shared match player role
    const insertedSharedMatchPlayerRole =
      await matchUpdatePlayerRoleRepository.insertSharedMatchPlayerRole({
        input: {
          sharedMatchPlayerId,
          sharedGameRoleId: returnedSharedRole.id,
        },
        tx,
      });

    assertInserted(
      insertedSharedMatchPlayerRole,
      {
        userId,
        value: errorContext ?? { sharedRoleId },
      },
      "Failed to create shared match player role",
    );
  }
}

export const sharedRoleService = new SharedRoleService();
