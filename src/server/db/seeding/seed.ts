import { exit } from "process";
import { faker } from "@faker-js/faker";
import { eq, getTableName, sql, Table } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/server/db";
import {
  game,
  group,
  groupPlayer,
  image,
  insertGameSchema,
  insertGroupPlayerSchema,
  insertGroupSchema,
  insertImageSchema,
  insertLocationSchema,
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertScoreSheetSchema,
  insertUserSchema,
  location,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  user,
} from "~/server/db/schema";

import { insertRoundSchema } from "../schema/round";
import roundPlayers, { insertRoundPlayerSchema } from "../schema/roundPlayer";

function weightedRandomSample<T>(
  weightedPlayers: { weight: number; value: T }[],
  count: number,
): T[] {
  if (count > weightedPlayers.length) {
    throw new Error("Count cannot be greater than the number of players");
  }
  // Step 1: Create the cumulative distribution
  const totalWeight = weightedPlayers.reduce(
    (sum, player) => sum + player.weight,
    0,
  );
  const cumulativeWeights: number[] = [];
  let cumulativeSum = 0;

  for (const player of weightedPlayers) {
    cumulativeSum += player.weight;
    cumulativeWeights.push(cumulativeSum / totalWeight); // Normalize to [0, 1]
  }

  // Step 2: Perform weighted sampling using faker
  const selectedItem: T[] = [];
  while (selectedItem.length < count) {
    const rand = faker.number.float({ min: 0, max: 1 }); // Generate a random number in [0, 1]
    for (let j = 0; j < cumulativeWeights.length; j++) {
      if (rand <= cumulativeWeights[j]!) {
        const valueInSelectedItem = selectedItem.find(
          (v) => v === weightedPlayers[j]!.value,
        );
        if (valueInSelectedItem) {
          continue;
        }
        selectedItem.push(weightedPlayers[j]!.value);
        break;
      }
    }
  }

  return selectedItem;
}

// Set seed for deterministic data
faker.seed(123);
async function resetTable(table: Table) {
  return db.execute(
    sql.raw(`TRUNCATE TABLE ${getTableName(table)} RESTART IDENTITY CASCADE`),
  );
}
for (const table of [
  location,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  user,
  game,
  group,
  groupPlayer,
  image,
]) {
  // await db.delete(table); // clear tables without truncating / resetting ids
  await resetTable(table);
}
export async function seed() {
  const userData: z.infer<typeof insertUserSchema>[] = Array.from(
    { length: 5 },
    () => ({
      clerkUserId: faker.person.fullName(),
    }),
  );

  const [user1, user2, ...otherUsers] = await db
    .insert(user)
    .values(userData)
    .returning();
  if (!user1) {
    throw new Error("User 1 not found");
  }
  if (!user2) {
    throw new Error("User 2 not found");
  }

  const imageGameData: z.infer<typeof insertImageSchema>[] = Array.from(
    { length: 10 },
    () => ({
      url: faker.image.urlPicsumPhotos(),
      userId: faker.helpers.arrayElement([user1.id, user2.id]),
      name: faker.commerce.productName(),
    }),
  );

  const gameImages = await db.insert(image).values(imageGameData).returning();

  const gameData: z.infer<typeof insertGameSchema>[] = Array.from(
    { length: 100 },
    () => ({
      name: faker.commerce.productName(),
      userId: faker.helpers.arrayElement([user1.id, user2.id]),
      imageId: faker.helpers.maybe(
        () => faker.helpers.arrayElement(gameImages).id,
        {
          probability: 0.5,
        },
      ),
      playersMin: faker.helpers.maybe(
        () => faker.number.int({ min: 1, max: 4 }),
        { probability: 0.5 },
      ),
      playersMax: faker.helpers.maybe(
        () => faker.number.int({ min: 4, max: 8 }),
        { probability: 0.5 },
      ),
      playtimeMin: faker.helpers.maybe(
        () => faker.number.int({ min: 15, max: 60 }),
        { probability: 0.5 },
      ),
      playtimeMax: faker.helpers.maybe(
        () => faker.number.int({ min: 60, max: 180 }),
        { probability: 0.5 },
      ),
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
    }),
  );

  const returnedGames = await db.insert(game).values(gameData).returning();

  const locationData: z.infer<typeof insertLocationSchema>[] = Array.from(
    { length: 8 },
    () => ({
      name: faker.location.city(),
      createdBy: faker.helpers.arrayElement([user1.id, user2.id]),
    }),
  );

  const locations = await db.insert(location).values(locationData).returning();

  const imagePlayerData: z.infer<typeof insertImageSchema>[] = Array.from(
    { length: 20 },
    () => ({
      url: faker.image.avatar(),
      userId: faker.helpers.arrayElement([user1.id, user2.id]),
      name: faker.person.fullName(),
    }),
  );

  const playerImages = await db
    .insert(image)
    .values(imagePlayerData)
    .returning();

  const playerData: z.infer<typeof insertPlayerSchema>[] = Array.from(
    { length: 66 },
    () => ({
      name: faker.person.fullName(),
      createdBy: faker.helpers.arrayElement([user1.id, user2.id]),
      userId: null,
      imageId: faker.helpers.maybe(
        () => faker.helpers.arrayElement(playerImages).id,
        { probability: 0.5 },
      ),
    }),
  );
  if (playerData[0] && playerData[1]) {
    playerData[0].userId = user1.id;
    playerData[1].userId = user2.id;
  }
  const players = await db.insert(player).values(playerData).returning();

  const groupData: z.infer<typeof insertGroupSchema>[] = Array.from(
    { length: 10 },
    () => ({
      name: faker.company.name(),
      createdBy: faker.helpers.arrayElement([user1.id, user2.id]),
    }),
  );
  const groups = await db.insert(group).values(groupData).returning();
  for (const group of groups) {
    const playerCount = faker.number.int({
      min: 2,
      max: 10,
    });
    const groupPlayers = faker.helpers.arrayElements(players, playerCount);
    const groupPlayersData: z.infer<typeof insertGroupPlayerSchema>[] =
      groupPlayers.map((player) => ({
        groupId: group.id,
        playerId: player.id,
      }));
    await db.insert(groupPlayer).values(groupPlayersData);
  }

  for (const returnedGame of returnedGames) {
    const scoresheetData: z.infer<typeof insertScoreSheetSchema> = {
      name: `${returnedGame.name} Default`,
      gameId: returnedGame.id,
      userId: returnedGame.userId,
      winCondition: faker.helpers.weightedArrayElement([
        { weight: 0.05, value: "Manual" },
        { weight: 0.4, value: "Highest Score" },
        { weight: 0.4, value: "Lowest Score" },
        { weight: 0.01, value: "No Winner" },
        { weight: 0.14, value: "Target Score" },
      ]),
      roundsScore: faker.helpers.weightedArrayElement([
        { weight: 0.7, value: "Aggregate" },
        { weight: 0.05, value: "Manual" },
        { weight: 0.15, value: "Best Of" },
      ]),
      targetScore: faker.number.int({ min: 10, max: 100 }),
      type: "Default",
      isCoop: faker.datatype.boolean(0.1),
    };
    const returnedScoresheet = (
      await db.insert(scoresheet).values(scoresheetData).returning()
    )[0];
    if (!returnedScoresheet) {
      throw new Error("Scoresheet not created");
    }
    const roundData: z.infer<typeof insertRoundSchema>[] = Array.from(
      { length: faker.number.int({ min: 3, max: 8 }) },
      (_, index) => {
        const type = faker.helpers.weightedArrayElement([
          { weight: 0.8, value: "Numeric" },
          { weight: 0.2, value: "Checkbox" },
        ]);
        return {
          name: `Round ${index + 1}`,
          scoresheetId: returnedScoresheet.id,
          type: type,
          color: faker.color.rgb(),
          score:
            type === "Checkbox" ? faker.number.int({ min: 1, max: 10 }) : 0,
          order: index + 1,
        };
      },
    );
    await db.insert(round).values(roundData).returning();
    let matchData: z.infer<typeof insertMatchSchema>[] = Array.from(
      { length: faker.number.int({ min: 3, max: 50 }) },
      (_, index) => {
        const finished = faker.datatype.boolean(0.85);
        return {
          name: faker.helpers.weightedArrayElement([
            {
              weight: 0.2,
              value: faker.book.title(),
            },
            {
              weight: 0.8,
              value: `${returnedGame.name} Match ${index + 1}`,
            },
          ]),
          userId: returnedGame.userId,
          gameId: returnedGame.id,
          scoresheetId: returnedScoresheet.id,
          locationId: faker.helpers.arrayElement(locations).id,
          date: faker.date.past({ years: 10 }),
          duration: faker.number.int({ min: 30, max: 240 }),
          finished: finished,
          running: !finished,
        };
      },
    );
    matchData = await Promise.all(
      matchData.map(async (match) => {
        const newScoreSheet = (
          await db
            .insert(scoresheet)
            .values({
              name: `${match.name} Scoresheet`,
              gameId: returnedScoresheet.gameId,
              userId: returnedScoresheet.userId,
              isCoop: returnedScoresheet.isCoop,
              winCondition: returnedScoresheet.winCondition,
              targetScore: returnedScoresheet.targetScore,
              roundsScore: returnedScoresheet.roundsScore,
              type: "Match",
            })
            .returning()
        )[0];
        if (!newScoreSheet) {
          throw new Error("Scoresheet not created");
        }
        const roundsResult = await db
          .select()
          .from(round)
          .where(eq(round.scoresheetId, returnedScoresheet.id));
        const roundsToInert = roundsResult.map((round) => ({
          color: round.color,
          name: round.name,
          type: round.type,
          lookup: round.lookup,
          modifier: round.modifier,
          score: round.score,
          toggleScore: round.toggleScore,
          scoresheetId: newScoreSheet.id,
          order: round.order,
        }));
        const insertedRounds = await db
          .insert(round)
          .values(roundsToInert)
          .returning();
        return {
          ...match,
          gameId: returnedGame.id,
          scoresheetId: newScoreSheet.id,
        };
      }),
    );

    const returnedMatches = await db
      .insert(match)
      .values(matchData)
      .returning();
    for (const returnedMatch of returnedMatches) {
      let weights: number[] = [0.2, 0.2];
      const remainingWeight = 1 - 0.2 - 0.2;
      const randomWeights = players.slice(2).map(() =>
        faker.number.float({
          min: (remainingWeight / (players.length - 2)) * 0.25,
          max: remainingWeight / (players.length - 2),
        }),
      );

      const totalRandomWeight = randomWeights.reduce((sum, w) => sum + w, 0);
      const normalizedWeights = randomWeights.map(
        (w) => (w / totalRandomWeight) * remainingWeight,
      );

      weights = weights.concat(normalizedWeights);

      const weightedPlayers = players.map((player, index) => ({
        weight: parseFloat(weights[index]!.toFixed(4)),
        value: player.id,
      }));

      const minPlayers = returnedGame.playersMin ?? 2;
      const maxPlayers = returnedGame.playersMax ?? 4;
      const playerCount = faker.number.int({
        min: minPlayers,
        max: maxPlayers,
      });
      const matchPlayers = weightedRandomSample(weightedPlayers, playerCount);
      const matchPlayerData: z.infer<typeof insertMatchPlayerSchema>[] =
        matchPlayers.map((player, index) => ({
          matchId: returnedMatch.id,
          playerId: player,
          winner:
            faker.number.int({ min: 0, max: matchPlayers.length - 1 }) === 0,
          score: faker.number.int({ min: 0, max: 100 }),
          order: index + 1,
        }));
      const matchPlayersResult = await db
        .insert(matchPlayer)
        .values(matchPlayerData)
        .returning();
      const matchRounds = await db
        .select()
        .from(round)
        .where(eq(round.scoresheetId, returnedMatch.scoresheetId));
      const matchScoresheet = (
        await db
          .select()
          .from(scoresheet)
          .where(eq(scoresheet.id, returnedMatch.scoresheetId))
      )[0];
      if (!matchScoresheet) {
        throw new Error("Scoresheet not found");
      }
      const roundPlayerData: z.infer<typeof insertRoundPlayerSchema>[] =
        matchRounds.flatMap((round) => {
          const maxScore =
            matchScoresheet.roundsScore === "Aggregate" ||
            matchScoresheet.roundsScore === "Best Of"
              ? 100
              : 5;
          const minScore =
            matchScoresheet.winCondition === "Lowest Score" ? -100 : 0;
          return matchPlayersResult.map((matchPlayer) => ({
            roundId: round.id,
            matchPlayerId: matchPlayer.id,
            score: faker.number.int({ min: minScore, max: maxScore }),
          }));
        });

      await db.insert(roundPlayers).values(roundPlayerData).returning();
    }
  }

  exit();
}
await seed();
