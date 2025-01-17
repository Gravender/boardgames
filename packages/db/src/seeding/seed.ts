import { exit } from "process";
import type { Table } from "drizzle-orm";
import { faker } from "@faker-js/faker";
import { eq, getTableName, inArray, sql } from "drizzle-orm";
import type {z} from "zod";

import type {
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
} from "@board-games/db/schema";
import { db } from "@board-games/db/client";
import {
  game,
  group,
  groupPlayer,
  image,
  location,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  user,
} from "@board-games/db/schema";

import type { insertRoundPlayerSchema } from "../schema";
import type {insertRoundSchema} from "../schema";
import roundPlayers from "../schema/roundPlayer";

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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (rand <= cumulativeWeights[j]!) {
        const valueInSelectedItem = selectedItem.find(
          (v) => v === weightedPlayers[j]?.value,
        );
        if (valueInSelectedItem) {
          continue;
        }
        selectedItem.push(weightedPlayers[j]?.value as T);
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

  const [user1, user2] = await db
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
    { length: 30 },
    () => ({
      url: faker.image.urlPicsumPhotos(),
      userId: faker.helpers.arrayElement([user1.id, user2.id]),
      name: faker.commerce.productName(),
    }),
  );

  const gameImages = await db.insert(image).values(imageGameData).returning();

  const gameData: z.infer<typeof insertGameSchema>[] = Array.from(
    { length: 30 },
    () => ({
      name: faker.commerce.productName(),
      userId: faker.helpers.arrayElement([user1.id, user2.id]),
      imageId: faker.helpers.maybe(
        () => faker.helpers.arrayElement(gameImages).id,
        {
          probability: 0.75,
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
    { length: 12 },
    () => ({
      name: faker.location.city(),
      createdBy: faker.helpers.arrayElement([user1.id, user2.id]),
    }),
  );

  const locations = await db.insert(location).values(locationData).returning();

  const imagePlayerData: z.infer<typeof insertImageSchema>[] = Array.from(
    { length: 30 },
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
    { length: 40 },
    () => ({
      name: faker.person.fullName(),
      createdBy: faker.helpers.arrayElement([user1.id, user2.id]),
      userId: null,
      imageId: faker.helpers.maybe(
        () => faker.helpers.arrayElement(playerImages).id,
        { probability: 0.75 },
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
    const winCondition = faker.helpers.weightedArrayElement([
      { weight: 0.05, value: "Manual" },
      { weight: 0.42, value: "Highest Score" },
      { weight: 0.41, value: "Lowest Score" },
      { weight: 0.01, value: "No Winner" },
      { weight: 0.1, value: "Target Score" },
    ]);
    const scoresheetData: z.infer<typeof insertScoreSheetSchema> = {
      name: `${returnedGame.name} Default`,
      gameId: returnedGame.id,
      userId: returnedGame.userId,
      winCondition: winCondition,
      roundsScore: faker.helpers.weightedArrayElement([
        { weight: 0.7, value: "Aggregate" },
        { weight: 0.05, value: "Manual" },
        { weight: 0.15, value: "Best Of" },
      ]),
      targetScore:
        winCondition === "Target Score"
          ? faker.number.int({ min: 10, max: 100 })
          : undefined,
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
      { length: faker.number.int({ min: 5, max: 30 }) },
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
       await db
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
      const filteredPlayers = players.filter(
        (player) => player.createdBy === returnedMatch.userId,
      );
      const baseWeight = 1 / filteredPlayers.length;
      let weights: number[] = [];
      const remainingWeight = 1 - baseWeight;
      const randomWeights = filteredPlayers.map((_, index) =>
        faker.number.float({
          min:
            (remainingWeight / (filteredPlayers.length - 2)) *
            (baseWeight * 0.01 + index * (baseWeight * 0.01)),
          max: remainingWeight / (filteredPlayers.length - 2),
        }),
      );

      const totalRandomWeight = randomWeights.reduce((sum, w) => sum + w, 0);
      const normalizedWeights = randomWeights.map(
        (w) => (w / totalRandomWeight) * remainingWeight,
      );

      weights = weights.concat(normalizedWeights);

      const weightedPlayers = filteredPlayers.map((player, index) => {
        if (player.createdBy === returnedMatch.userId) {
          return {
            weight: baseWeight,
            value: player.id,
          };
        }
        return {
          weight: Number(weights[index]?.toFixed(4) ?? 0),
          value: player.id,
        };
      });

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
              ? faker.number.int({ min: 10, max: 30 })
              : 5;
          const minScore =
            matchScoresheet.winCondition === "Lowest Score"
              ? faker.number.int({ min: -30, max: -1 })
              : 0;
          return matchPlayersResult.map((matchPlayer) => ({
            roundId: round.id,
            matchPlayerId: matchPlayer.id,
            score:
              round.type === "Checkbox"
                ? faker.helpers.maybe(() => round.score, { probability: 0.5 })
                : faker.number.int({ min: minScore, max: maxScore }),
          }));
        });

      await db
        .insert(roundPlayers)
        .values(roundPlayerData)
        .returning();

      const finalScoreSqlStatement = () => {
        if (matchScoresheet.roundsScore === "Aggregate") {
          return sql<number>`SUM(${roundPlayer.score})`.as("finalScore");
        }
        if (matchScoresheet.roundsScore === "Best Of") {
          if (matchScoresheet.winCondition === "Highest Score") {
            return sql<number>`MAX(${roundPlayer.score})`.as("finalScore");
          }
          if (matchScoresheet.winCondition === "Lowest Score") {
            return sql<number>`MIN(${roundPlayer.score})`.as("finalScore");
          }
          if (matchScoresheet.winCondition === "Target Score") {
            return sql<number>`CASE WHEN ${roundPlayer.score} = ${matchScoresheet.targetScore} THEN ${roundPlayer.score} ELSE 0 END`.as(
              "finalScore",
            );
          }
        }
        return sql<number>`0`.as("finalScore");
      };
      const returnedRoundPlayersGroupByMatchPLayer = await db
        .select({
          matchPlayerId: roundPlayer.matchPlayerId,
          finalScore: finalScoreSqlStatement(),
        })
        .from(roundPlayer)
        .where(
          inArray(
            roundPlayer.matchPlayerId,
            matchPlayersResult.map((p) => p.id),
          ),
        )
        .groupBy(roundPlayer.matchPlayerId);
      const isWinner = (score: number): boolean => {
        const parsedScore = Number(score); // Ensure it's a number
        if (matchScoresheet.winCondition === "Highest Score") {
          const highestScore = Math.max(
            ...returnedRoundPlayersGroupByMatchPLayer.map((p) =>
              Number(p.finalScore),
            ),
          );
          return parsedScore === highestScore;
        }
        if (matchScoresheet.winCondition === "Lowest Score") {
          const lowestScore = Math.min(
            ...returnedRoundPlayersGroupByMatchPLayer.map((p) =>
              Number(p.finalScore),
            ),
          );
          return parsedScore === lowestScore;
        }
        if (matchScoresheet.winCondition === "Target Score") {
          return parsedScore === matchScoresheet.targetScore;
        }
        return false;
      };

      for (const returnedRoundPlayer of returnedRoundPlayersGroupByMatchPLayer) {
        await db
          .update(matchPlayer)
          .set({
            winner: isWinner(returnedRoundPlayer.finalScore),
            score: returnedRoundPlayer.finalScore,
          })
          .where(eq(matchPlayer.id, returnedRoundPlayer.matchPlayerId));
      }
    }
  }

  exit();
}
await seed();
