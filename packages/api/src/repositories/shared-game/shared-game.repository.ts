import { eq } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { sharedGame, sharedGameRole } from "@board-games/db/schema";

import type {
  GetSharedRoleArgs,
  InsertSharedGameInputArgs,
  LinkedSharedGameArgs,
  LinkedSharedRoleArgs,
} from "./shared-game.repository.types";

class SharedGameRepository {
  public async insertSharedGame(args: InsertSharedGameInputArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returningGame] = await database
      .insert(sharedGame)
      .values(input)
      .returning();
    return returningGame;
  }
  public async linkSharedGame(args: LinkedSharedGameArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [linkedGame] = await database
      .update(sharedGame)
      .set({
        linkedGameId: input.linkedGameId,
      })
      .where(eq(sharedGame.id, input.sharedGameId))
      .returning();
    if (!linkedGame) {
      throw new Error(
        `SharedGame not found: no row with id ${input.sharedGameId}`,
      );
    }
    return linkedGame;
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
  public async linkSharedRole(args: LinkedSharedRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [linkedRole] = await database
      .update(sharedGameRole)
      .set({
        linkedGameRoleId: input.linkedRoleId,
      })
      .where(eq(sharedGameRole.id, input.sharedRoleId))
      .returning();
    if (!linkedRole) {
      throw new Error(
        `SharedRole not found: no row with id ${input.sharedRoleId}`,
      );
    }
    return linkedRole;
  }
}
export const sharedGameRepository = new SharedGameRepository();
