import { and, eq, inArray, like } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { group as groupTable, groupPlayer, user } from "@board-games/db/schema";

import { getBetterAuthUserId } from "../getUserId";

export async function deleteGroupsByPrefix(
  browserName: string,
  groupNamePrefix: string,
) {
  const betterAuthUserId = getBetterAuthUserId(browserName);
  const [returnedUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, betterAuthUserId));

  if (!returnedUser) return;

  const groups = await db
    .select({ id: groupTable.id })
    .from(groupTable)
    .where(
      and(
        eq(groupTable.createdBy, returnedUser.id),
        like(groupTable.name, `${groupNamePrefix}%`),
      ),
    );

  if (groups.length === 0) return;

  const groupIds = groups.map((g) => g.id);

  await db.transaction(async (tx) => {
    await tx
      .delete(groupPlayer)
      .where(inArray(groupPlayer.groupId, groupIds));
    await tx.delete(groupTable).where(inArray(groupTable.id, groupIds));
  });
}
