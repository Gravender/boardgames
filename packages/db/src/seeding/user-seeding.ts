import type { z } from "zod/v4";
import { faker } from "@faker-js/faker";

import type { insertUserSchema } from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import { user, userSharingPreference } from "@board-games/db/schema";

import { resetTable } from "./seed";

export async function seedUsers(d3Seed: number) {
  faker.seed(d3Seed);
  const currentUsers = await db.query.user.findMany();
  const usersToInsert: z.infer<typeof insertUserSchema>[] = currentUsers.map(
    (u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }),
  );
  await resetTable(user);
  await resetTable(userSharingPreference);
  console.log("Inserting users...\n");
  const users = await db.insert(user).values(usersToInsert).returning();
  console.log("Insert user sharing preference's");
  await db.insert(userSharingPreference).values(
    users.map((u) => ({
      userId: u.id,
    })),
  );
}
