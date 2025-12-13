import { and, eq, inArray } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import {
  gameRole,
  matchPlayerRole,
  sharedGameRole,
  sharedMatchPlayerRole,
} from "@board-games/db/schema";

import type {
  InsertMatchPlayerRoleRepoArgs,
  InsertMatchPlayerRolesRepoArgs,
  InsertSharedMatchPlayerRoleRepoArgs,
  InsertSharedMatchPlayerRolesRepoArgs,
  DeleteMatchPlayerRoleRepoArgs,
  DeleteMatchPlayerRolesRepoArgs,
  DeleteSharedMatchPlayerRoleRepoArgs,
  DeleteSharedMatchPlayerRolesRepoArgs,
  GetMatchPlayerRoleArgs,
} from "./match-update-player-role.repository.types";

class MatchUpdatePlayerRoleRepository {
  public async insertMatchPlayerRole(args: InsertMatchPlayerRoleRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [insertedRole] = await database
      .insert(matchPlayerRole)
      .values(input)
      .returning();
    return insertedRole;
  }

  public async insertMatchPlayerRoles(args: InsertMatchPlayerRolesRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const insertedRoles = await database
      .insert(matchPlayerRole)
      .values(input)
      .returning();
    return insertedRoles;
  }

  public async deleteMatchPlayerRole(args: DeleteMatchPlayerRoleRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .delete(matchPlayerRole)
      .where(
        and(
          eq(matchPlayerRole.matchPlayerId, input.matchPlayerId),
          eq(matchPlayerRole.roleId, input.roleId),
        ),
      );
  }

  public async deleteMatchPlayerRoles(args: DeleteMatchPlayerRolesRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .delete(matchPlayerRole)
      .where(
        and(
          eq(matchPlayerRole.matchPlayerId, input.matchPlayerId),
          inArray(matchPlayerRole.roleId, input.roleIds),
        ),
      );
  }

  public async insertSharedMatchPlayerRole(
    args: InsertSharedMatchPlayerRoleRepoArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [insertedRole] = await database
      .insert(sharedMatchPlayerRole)
      .values(input)
      .returning();
    return insertedRole;
  }

  public async insertSharedMatchPlayerRoles(
    args: InsertSharedMatchPlayerRolesRepoArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    const insertedRoles = await database
      .insert(sharedMatchPlayerRole)
      .values(input)
      .returning();
    return insertedRoles;
  }

  public async deleteSharedMatchPlayerRole(
    args: DeleteSharedMatchPlayerRoleRepoArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .delete(sharedMatchPlayerRole)
      .where(
        and(
          eq(
            sharedMatchPlayerRole.sharedMatchPlayerId,
            input.sharedMatchPlayerId,
          ),
          eq(
            sharedMatchPlayerRole.sharedGameRoleId,
            input.sharedGameRoleId,
          ),
        ),
      );
  }

  public async deleteSharedMatchPlayerRoles(
    args: DeleteSharedMatchPlayerRolesRepoArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .delete(sharedMatchPlayerRole)
      .where(
        and(
          eq(
            sharedMatchPlayerRole.sharedMatchPlayerId,
            input.sharedMatchPlayerId,
          ),
          inArray(
            sharedMatchPlayerRole.sharedGameRoleId,
            input.sharedGameRoleIds,
          ),
        ),
      );
  }

  public async createGameRole(args: {
    input: {
      gameId: number;
      name: string;
      description: string | null;
      createdBy: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [createdRole] = await database
      .insert(gameRole)
      .values(input)
      .returning();
    return createdRole;
  }

  public async linkSharedGameRole(args: {
    input: {
      sharedGameRoleId: number;
      linkedGameRoleId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [linkedRole] = await database
      .update(sharedGameRole)
      .set({ linkedGameRoleId: input.linkedGameRoleId })
      .where(eq(sharedGameRole.id, input.sharedGameRoleId))
      .returning();
    return linkedRole;
  }

  public async getMatchPlayerRole(args: GetMatchPlayerRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const foundRole = await database.query.matchPlayerRole.findFirst({
      where: and(
        eq(matchPlayerRole.matchPlayerId, input.matchPlayerId),
        eq(matchPlayerRole.roleId, input.roleId),
      ),
    });
    return foundRole;
  }
}

export const matchUpdatePlayerRoleRepository =
  new MatchUpdatePlayerRoleRepository();

