import type { z } from "zod/v4";
import { createClerkClient } from "@clerk/backend";
import { faker } from "@faker-js/faker";

import type { insertUserSchema } from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import { player, user, userSharingPreference } from "@board-games/db/schema";

import { resetTable } from "./seed";

export async function seedUsers(d3Seed: number) {
  faker.seed(d3Seed);
  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const { data: clerkUsers } = await clerkClient.users.getUserList();
  const usersToInsert: z.infer<typeof insertUserSchema>[] = clerkUsers.map(
    (u) => ({
      clerkUserId: u.id,
      name: u.fullName,
      email: u.emailAddresses[0]?.emailAddress,
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
