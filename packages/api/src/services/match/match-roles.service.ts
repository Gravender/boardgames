import type { TransactionType } from "@board-games/db/client";

import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { sharedRoleService } from "./shared-role.service";

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
      await sharedRoleService.insertSharedRolesForMatchPlayers({
        userId,
        tx,
        gameId,
        roles: sharedRoles.map((role) => ({
          matchPlayerId: role.matchPlayerId,
          sharedRoleId: role.sharedId,
        })),
        errorContext: { input: mappedMatchPlayers },
      });
    }
  }
}
export const matchRolesService = new MatchRolesService();
