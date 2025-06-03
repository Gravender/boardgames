import type { z } from "zod/v4";
import { faker } from "@faker-js/faker";

import type { insertLocationSchema } from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import { location } from "@board-games/db/schema";

import { resetTable } from "./seed";

export async function seedLocations(d3Seed: number) {
  faker.seed(d3Seed);
  await resetTable(location);
  const users = await db.query.user.findMany();

  console.log("Inserting locations...");
  const locationNames = Array.from({ length: 100 }, () =>
    faker.location.city(),
  );
  for (const user of users) {
    const count = faker.number.int({ min: 2, max: 4 });
    const usedNames = new Set<string>();
    const locationData: z.infer<typeof insertLocationSchema>[] = [];
    while (locationData.length < count) {
      const name = faker.helpers.arrayElement(locationNames);
      if (!usedNames.has(name)) {
        usedNames.add(name);
        locationData.push({ name, createdBy: user.id });
      }
    }
    await db.insert(location).values(locationData);
  }
}
