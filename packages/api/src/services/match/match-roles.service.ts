import type { TransactionType } from "@board-games/db/client";

import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { gameRepository } from "../../routers/game/repository/game.repository";
import { sharedGameRepository } from "../../routers/game/sub-routers/shared/repository/shared-game.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";

class MatchRolesService {
  public async attachRolesToMatchPlayers(args: {
    userId: string;
    tx: TransactionType;
    gameId: number;
    mappedMatchPlayers: {
      matchPlayerId: number;
      playerId: number;
      roles: (
        | {
            type: "original";
            id: number;
          }
        | {
            type: "shared";
            sharedId: number;
          }
      )[];
    }[];
  }) {
    const { userId, tx, gameId, mappedMatchPlayers } = args;

    const rolesToAdd = mappedMatchPlayers.flatMap((p) =>
      p.roles.map((role) => ({
        ...role,
        matchPlayerId: p.matchPlayerId,
      })),
    );

    if (rolesToAdd.length === 0) return;

    const originalRoles = rolesToAdd.filter(
      (roleToAdd) => roleToAdd.type === "original",
    );
    const sharedRoles = rolesToAdd.filter(
      (roleToAdd) => roleToAdd.type !== "original",
    );

    if (originalRoles.length > 0) {
      await matchPlayerRepository.insertMatchPlayerRoles({
        input: originalRoles.map((originalRole) => ({
          matchPlayerId: originalRole.matchPlayerId,
          roleId: originalRole.id,
        })),
        tx,
      });
    }

    if (sharedRoles.length > 0) {
      // Deduplicate by sharedId
      const uniqueRoles = sharedRoles.reduce<{ sharedId: number }[]>(
        (acc, role) => {
          if (!acc.find((r) => r.sharedId === role.sharedId)) {
            acc.push({ sharedId: role.sharedId });
          }
          return acc;
        },
        [],
      );

      const mappedSharedRoles: {
        sharedRoleId: number;
        createRoleId: number;
      }[] = [];

      for (const uniqueRole of uniqueRoles) {
        const returnedSharedRole = await sharedGameRepository.getSharedRole({
          input: {
            sharedRoleId: uniqueRole.sharedId,
          },
          userId,
          tx,
        });

        assertFound(
          returnedSharedRole,
          { userId, value: { input: mappedMatchPlayers } },
          "Shared role not found.",
        );

        let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;

        if (linkedGameRoleId === null) {
          const createdGameRole = await gameRepository.createGameRole({
            input: {
              gameId: gameId,
              name: returnedSharedRole.gameRole.name,
              description: returnedSharedRole.gameRole.description,
              createdBy: userId,
            },
            tx,
          });

          assertInserted(
            createdGameRole,
            { userId, value: { input: mappedMatchPlayers } },
            "Game role not created.",
          );

          linkedGameRoleId = createdGameRole.id;

          const linkedRole = await sharedGameRepository.linkSharedRole({
            input: {
              sharedRoleId: uniqueRole.sharedId,
              linkedRoleId: createdGameRole.id,
            },
            tx,
          });

          assertInserted(
            linkedRole,
            { userId, value: { input: mappedMatchPlayers } },
            "Linked role not created.",
          );
        }

        mappedSharedRoles.push({
          sharedRoleId: uniqueRole.sharedId,
          createRoleId: linkedGameRoleId,
        });
      }

      const mappedSharedRolesWithMatchPlayers = sharedRoles.map((role) => {
        const createdRole = mappedSharedRoles.find(
          (r) => r.sharedRoleId === role.sharedId,
        );

        assertFound(
          createdRole,
          { userId, value: { input: mappedMatchPlayers } },
          "Shared role not found.",
        );

        return {
          matchPlayerId: role.matchPlayerId,
          roleId: createdRole.createRoleId,
        };
      });

      if (mappedSharedRolesWithMatchPlayers.length > 0) {
        await matchPlayerRepository.insertMatchPlayerRoles({
          input: mappedSharedRolesWithMatchPlayers,
          tx,
        });
      }
    }
  }
}
export const matchRolesService = new MatchRolesService();
