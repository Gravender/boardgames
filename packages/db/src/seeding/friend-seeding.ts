import type { z } from "zod";
import { faker } from "@faker-js/faker";

import type {
  insertFriendRequestSchema,
  insertFriendSchema,
} from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import { friend, friendRequest } from "@board-games/db/schema";

import friendSettings from "../schema/friendSetting";
import { resetTable } from "./seed";

export async function seedFriends(d3Seed: number) {
  faker.seed(d3Seed);
  await resetTable(friendRequest);
  await resetTable(friend);
  await resetTable(friendSettings);
  const users = await db.query.user.findMany();
  const friendPairs = new Set<string>();
  const friendRequestsData: z.infer<typeof insertFriendRequestSchema>[] = [];
  const friendsData: z.infer<typeof insertFriendSchema>[] = [];
  for (const userA of users) {
    const friendCount = faker.number.int({ min: 1, max: 8 });
    if (friendCount === 0) continue;
    const potentialFriends = faker.helpers.arrayElements(
      users.filter((u) => u.id !== userA.id),
      friendCount,
    );

    for (const userB of potentialFriends) {
      const key = `${Math.min(userA.id, userB.id)}-${Math.max(userA.id, userB.id)}`;
      if (friendPairs.has(key)) continue;
      friendPairs.add(key);

      const status = faker.helpers.weightedArrayElement([
        { weight: 0.7, value: "accepted" },
        { weight: 0.2, value: "pending" },
        { weight: 0.1, value: "rejected" },
      ]);
      const date = faker.date.past({ years: 2 });

      friendRequestsData.push({
        userId: userA.id,
        requesteeId: userB.id,
        status,
        createdAt: date,
      });

      if (status === "accepted") {
        const futureDate = faker.date.future({ refDate: date, years: 1 });
        friendsData.push(
          {
            userId: userA.id,
            friendId: userB.id,
            createdAt: futureDate,
          },
          { userId: userB.id, friendId: userA.id, createdAt: futureDate },
        );
      }
    }
  }

  console.log("Inserting friend requests...");
  if (friendRequestsData.length > 0) {
    console.error("Need at least one friend request");
  }
  await db.insert(friendRequest).values(friendRequestsData);

  console.log("Inserting accepted friends...");
  if (friendsData.length > 0) {
    console.error("Need at least one friend");
  }
  await db.insert(friend).values(friendsData);
  console.log("📋 Inserting friend settings...");

  const allFriends = await db.query.friend.findMany();
  const settingsData = allFriends.map((f) => {
    const allowSharedMatches = faker.datatype.boolean(0.8);
    const allowSharedPlayers = faker.datatype.boolean(0.8);
    const allowSharedLocation = faker.datatype.boolean(0.8);
    const allowSharedGames = faker.datatype.boolean(0.8);
    const autoShareMatches = faker.datatype.boolean(0.5);
    return {
      createdById: f.userId,
      friendId: f.friendId,
      autoShareMatches,
      sharePlayersWithMatch: autoShareMatches
        ? faker.datatype.boolean(0.3)
        : false,
      includeLocationWithMatch: autoShareMatches
        ? faker.datatype.boolean(0.3)
        : false,
      defaultPermissionForMatches: faker.helpers.arrayElement(["view", "edit"]),
      defaultPermissionForPlayers: faker.helpers.arrayElement(["view", "edit"]),
      defaultPermissionForLocation: faker.helpers.arrayElement([
        "view",
        "edit",
      ]),
      defaultPermissionForGame: faker.helpers.arrayElement(["view", "edit"]),
      allowSharedMatches,
      allowSharedPlayers,
      allowSharedLocation,
      allowSharedGames,
      autoAcceptMatches: allowSharedMatches
        ? faker.datatype.boolean(0.2)
        : false,
      autoAcceptPlayers: allowSharedPlayers
        ? faker.datatype.boolean(0.2)
        : false,
      autoAcceptLocation: allowSharedLocation
        ? faker.datatype.boolean(0.2)
        : false,
      autoAcceptGame: allowSharedGames ? faker.datatype.boolean(0.2) : false,
    };
  });

  await db.insert(friendSettings).values(settingsData);
}
