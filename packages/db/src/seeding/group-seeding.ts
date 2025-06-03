import type { z } from "zod/v4";
import { faker } from "@faker-js/faker";

import type {
  insertGroupPlayerSchema,
  insertGroupSchema,
} from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import { group, groupPlayer } from "@board-games/db/schema";

import { resetTable } from "./seed";

export async function seedGroups(d3Seed: number) {
  faker.seed(d3Seed);
  await resetTable(group);
  await resetTable(groupPlayer);
  const users = await db.query.user.findMany({
    with: {
      createdPlayers: true,
    },
  });

  console.log("Inserting groups...\n");
  for (const user of users) {
    const groupData: z.infer<typeof insertGroupSchema>[] = Array.from(
      { length: 2 },
      () => ({
        name: faker.company.name(),
        createdBy: user.id,
      }),
    );

    const groups = await db.insert(group).values(groupData).returning();
    for (const group of groups) {
      const playerCount = faker.number.int({
        min: 2,
        max: 10,
      });

      if (user.createdPlayers.length >= playerCount) {
        const groupPlayers = faker.helpers.arrayElements(
          user.createdPlayers,
          playerCount,
        );
        const groupPlayersData: z.infer<typeof insertGroupPlayerSchema>[] =
          groupPlayers.map((player) => ({
            groupId: group.id,
            playerId: player.id,
          }));
        await db.insert(groupPlayer).values(groupPlayersData);
      }
    }
  }
}
