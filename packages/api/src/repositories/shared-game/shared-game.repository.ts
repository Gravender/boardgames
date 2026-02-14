import { eq } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { sharedGame, sharedGameRole } from "@board-games/db/schema";

import type {
  InsertSharedGameInputArgs,
  LinkedSharedGameArgs,
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
    return linkedGame;
  }
  public async getSharedRole(args: {
    input: {
      sharedRoleId: number;
    };
    userId: string;
    tx?: TransactionType;
  }) {
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
  public async linkSharedRole(args: {
    input: {
      sharedRoleId: number;
      linkedRoleId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [linkedRole] = await database
      .update(sharedGameRole)
      .set({
        linkedGameRoleId: input.linkedRoleId,
      })
      .where(eq(sharedGameRole.id, input.sharedRoleId))
      .returning();
    return linkedRole;
  }
}
export const sharedGameRepository = new SharedGameRepository();
