import { and, eq } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { group, groupPlayer } from "@board-games/db/schema";

class GroupRepository {
  public async findGroupsWithPlayersByCreator(createdBy: string) {
    return db.query.group.findMany({
      where: { createdBy },
      columns: { id: true, name: true },
      with: {
        players: {
          columns: { id: true, name: true, deletedAt: true },
          with: {
            image: true,
          },
        },
      },
    });
  }

  public async findGroupWithPlayersOwnedBy(groupId: number, createdBy: string) {
    return db.query.group.findFirst({
      where: { id: groupId, createdBy },
      columns: { id: true, name: true },
      with: {
        players: {
          columns: { id: true, name: true, deletedAt: true },
          with: {
            image: true,
          },
        },
      },
    });
  }

  public async insertGroup(createdBy: string, name: string) {
    const [row] = await db
      .insert(group)
      .values({ createdBy, name })
      .returning({ id: group.id });
    return row;
  }

  public async insertGroupPlayerLinks(groupId: number, playerIds: number[]) {
    if (playerIds.length === 0) return;
    await db.insert(groupPlayer).values(
      playerIds.map((playerId) => ({
        groupId,
        playerId,
      })),
    );
  }

  public async findGroupOwnedBy(groupId: number, createdBy: string) {
    const row = await db.query.group.findFirst({
      where: { id: groupId, createdBy },
      columns: { id: true },
    });
    return row;
  }

  public async deleteAllGroupPlayers(groupId: number) {
    await db.delete(groupPlayer).where(eq(groupPlayer.groupId, groupId));
  }

  public async deleteGroupIfOwned(id: number, createdBy: string) {
    const deleted = await db
      .delete(group)
      .where(and(eq(group.id, id), eq(group.createdBy, createdBy)))
      .returning({ id: group.id });
    return deleted.length > 0;
  }
}

export const groupRepository = new GroupRepository();
