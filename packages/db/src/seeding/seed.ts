import { exit } from "process";
import type { Table } from "drizzle-orm";
import { getTableName, sql } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { image } from "@board-games/db/schema";

import { seedFriends } from "./friend-seeding";
import { seedGames } from "./game-seeding";
import { seedGroups } from "./group-seeding";
import { seedLocations } from "./location-seeding";
import { seedMatches } from "./match-seeding";
import { seedPlayers } from "./player-seeding";
import { seedScoresheets } from "./scoresheet-seeding";
import { seedSharing } from "./sharing-seeding";
import { seedUsers } from "./user-seeding";

// Set seed for deterministic data
export const d3Seed = 123;
export async function resetTable(table: Table) {
  return db.execute(
    sql.raw(`TRUNCATE TABLE ${getTableName(table)} RESTART IDENTITY CASCADE`),
  );
}

export async function seed() {
  await seedUsers(d3Seed);
  await seedFriends(d3Seed);
  await resetTable(image);
  await seedPlayers(d3Seed);
  await seedGroups(d3Seed);
  await seedGames(d3Seed);
  await seedLocations(d3Seed);
  await seedScoresheets(d3Seed);
  await seedMatches(d3Seed);
  await seedSharing(d3Seed);
  exit();
}

await seed();
