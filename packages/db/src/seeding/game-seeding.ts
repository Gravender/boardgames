import type { z } from "zod";
import { faker } from "@faker-js/faker";
import { randomLcg, randomLogNormal } from "d3";

import type { insertGameSchema } from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import { game, image } from "@board-games/db/schema";

import { resetTable } from "./seed";

export async function seedGames(d3Seed: number) {
  faker.seed(d3Seed);
  await resetTable(game);
  const users = await db.query.user.findMany();
  const normalGames = randomLogNormal.source(randomLcg(d3Seed))(2, 0.7);
  const gameNames = Array.from({ length: 100 }, () =>
    faker.commerce.productName(),
  );
  console.log("Inserting games...\n");
  for (const user of users) {
    const gameCount = Math.max(8, normalGames() + 5);
    const gameData: z.infer<typeof insertGameSchema>[] = [];
    const usedNames = new Set<string>();
    for (let i = 0; i < gameCount; i++) {
      const fakePlayerMin = faker.helpers.maybe(
        () => faker.number.int({ min: 1, max: 4 }),
        { probability: 0.5 },
      );
      const fakePlayerMax = faker.helpers.maybe(
        () => faker.number.int({ min: fakePlayerMin ?? 2, max: 8 }),
        { probability: 0.5 },
      );
      const fakePlayTimeMin = faker.helpers.maybe(
        () => faker.number.int({ min: 15, max: 60 }),
        { probability: 0.5 },
      );
      const fakePlayTimeMax = faker.helpers.maybe(
        () => faker.number.int({ min: fakePlayTimeMin ?? 20, max: 180 }),
        { probability: 0.5 },
      );
      let imageId: number | null = null;
      if (faker.datatype.boolean(0.5)) {
        const [gameImage] = await db
          .insert(image)
          .values({
            url: faker.image.urlPicsumPhotos(),
            userId: user.id,
            name: faker.commerce.productName(),
          })
          .returning();
        if (!gameImage) {
          throw new Error("Game image not created");
        }
        imageId = gameImage.id;
      }
      let gameName = "";

      while (gameName === "") {
        const name = faker.helpers.arrayElement(gameNames);
        if (!usedNames.has(name)) {
          usedNames.add(name);
          gameName = name;
        }
      }
      gameData.push({
        name: gameName,
        userId: user.id,
        imageId: imageId,
        playersMin: fakePlayerMin,
        playersMax: fakePlayerMax,
        playtimeMin: fakePlayTimeMin,
        playtimeMax: fakePlayTimeMax,
        yearPublished: faker.helpers.maybe(
          () => faker.date.past({ years: 20 }).getFullYear(),
          { probability: 0.5 },
        ),
        description: faker.helpers.maybe(() => faker.lorem.paragraph(), {
          probability: 0.5,
        }),
        rules: faker.helpers.maybe(() => faker.lorem.paragraphs(3), {
          probability: 0.5,
        }),
      });
    }
    await db.insert(game).values(gameData);
  }
}
