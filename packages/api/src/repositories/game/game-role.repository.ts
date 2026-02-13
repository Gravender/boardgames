import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { gameRole, sharedGameRole } from "@board-games/db/schema";
import { vGameRoleCanonical } from "@board-games/db/views";

import type {
  CreateGameRoleArgs,
  CreateGameRolesArgs,
  DeleteGameRoleArgs,
  DeleteSharedGameRoleArgs,
  GetGameRolesArgs,
  GetSharedRoleArgs,
  UpdateGameRoleArgs,
} from "./game.repository.types";

class GameRoleRepository {
  public async createGameRole(args: CreateGameRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returningGameRole] = await database
      .insert(gameRole)
      .values(input)
      .returning();
    return returningGameRole;
  }

  public async createGameRoles(args: CreateGameRolesArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returningGameRoles = await database
      .insert(gameRole)
      .values(input)
      .returning();
    return returningGameRoles;
  }

  public async getGameRoles(args: GetGameRolesArgs) {
    const { input, tx } = args;

    const rows = await tx
      .select({
        type: vGameRoleCanonical.sourceType,
        roleId: vGameRoleCanonical.canonicalGameRoleId,
        sharedRoleId: vGameRoleCanonical.sharedGameRoleId,
        name: vGameRoleCanonical.name,
        description: vGameRoleCanonical.description,
        permission: vGameRoleCanonical.permission,
      })
      .from(vGameRoleCanonical)
      .where(
        and(
          eq(vGameRoleCanonical.canonicalGameId, input.canonicalGameId),
          eq(vGameRoleCanonical.visibleToUserId, args.userId),
          isNull(vGameRoleCanonical.linkedGameRoleId),
          input.sourceType === "shared"
            ? eq(vGameRoleCanonical.sourceType, "shared")
            : sql`true`,
        ),
      )
      .orderBy(asc(vGameRoleCanonical.name));

    return {
      rows,
    };
  }

  public async updateGameRole(args: UpdateGameRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(gameRole)
      .set({
        name: input.name,
        description: input.description,
      })
      .where(eq(gameRole.id, input.id));
  }

  public async deleteGameRole(args: DeleteGameRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(gameRole)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(gameRole.gameId, input.gameId),
          inArray(gameRole.id, input.roleIds),
        ),
      );
  }

  public async getSharedRole(args: GetSharedRoleArgs) {
    const { input, userId, tx } = args;
    const database = tx ?? db;
    const returnedSharedRole = await database.query.sharedGameRole.findFirst({
      where: {
        id: input.sharedRoleId,
        sharedWithId: userId,
      },
      with: {
        gameRole: true,
      },
    });
    return returnedSharedRole;
  }

  public async deleteSharedGameRole(args: DeleteSharedGameRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .delete(sharedGameRole)
      .where(inArray(sharedGameRole.id, input.sharedRoleIds));
  }
}

export const gameRoleRepository = new GameRoleRepository();
