import type { z } from "zod/v4";
import { faker } from "@faker-js/faker";

import type { insertPlayerSchema } from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import { image, player } from "@board-games/db/schema";

import { resetTable } from "./seed";

export async function seedPlayers(d3Seed: number) {
  faker.seed(d3Seed);
  const users = await db.query.user.findMany();
  const playerNames = Array.from({ length: 100 }, () =>
    faker.person.fullName(),
  );
  await resetTable(player);
  console.log("Inserting players...\n");
  await db.insert(player).values(
    users.map((u) => ({
      name: u.name ?? "",
      createdBy: u.id,
      isUser: true,
    })),
  );
  for (const user of users) {
    const playerCount = 30;
    const playerData: z.infer<typeof insertPlayerSchema>[] = [];
    const usedNames = new Set<string>();
    for (let i = 0; i < playerCount; i++) {
      let playerName = "";

      while (playerName === "") {
        const name = faker.helpers.arrayElement(playerNames);
        if (!usedNames.has(name)) {
          usedNames.add(name);
          playerName = name;
        }
      }
      let imageId: number | null = null;
      if (faker.datatype.boolean(0.5)) {
        const [playerImage] = await db
          .insert(image)
          .values({
            url: faker.image.avatar(),
            userId: user.id,
            name: playerName,
          })
          .returning();
        if (!playerImage) {
          throw new Error("Player image not created");
        }
        imageId = playerImage.id;
      }

      playerData.push({
        name: playerName,
        createdBy: user.id,
        imageId: imageId,
      });
    }
    await db.insert(player).values(playerData);
  }
}
