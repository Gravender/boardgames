import { exit } from "process";
import type { Table } from "drizzle-orm";
import type { z } from "zod";
import { faker } from "@faker-js/faker";
import { randomLcg, randomNormal, randomUniform } from "d3";
import { endOfMonth, getDaysInMonth, subMonths } from "date-fns";
import { eq, getTableName, inArray, sql } from "drizzle-orm";

import type {
  insertFriendRequestSchema,
  insertFriendSchema,
  insertGameSchema,
  insertGroupPlayerSchema,
  insertGroupSchema,
  insertImageSchema,
  insertLocationSchema,
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundPlayerSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
  insertSharedMatchPlayerSchema,
  insertTeamSchema,
  insertUserSchema,
  selectSharedLocationSchema,
} from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import {
  friend,
  friendRequest,
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
  sharedGame,
  sharedLocation,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  sharedScoresheet,
  shareRequest,
  team,
  user,
  userSharingPreference,
} from "@board-games/db/schema";
import { insertShareRequestSchema } from "@board-games/db/zodSchema";

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
const d3Seed = 123;
faker.seed(123);
async function resetTable(table: Table) {
  return db.execute(
    sql.raw(`TRUNCATE TABLE ${getTableName(table)} RESTART IDENTITY CASCADE`),
  );
}
for (const table of [
  friend,
  friendRequest,
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
  sharedGame,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  sharedScoresheet,
  shareRequest,
  team,
  user,
  userSharingPreference,
  sharedLocation,
]) {
  // await db.delete(table); // clear tables without truncating / resetting ids
  await resetTable(table);
}
export async function seed() {
  const totalUsers = 20;
  const totalGames = 20 * totalUsers;
  const maxMatches = 200 * totalGames; // Control total number of matches across all games
  const userData: z.infer<typeof insertUserSchema>[] = Array.from(
    { length: totalUsers },
    () => ({
      clerkUserId: faker.person.fullName(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
    }),
  );
  console.log("Inserting users...\n");
  const users = await db.insert(user).values(userData).returning();

  console.log("Inserting users player...\n");
  await db.insert(player).values(
    users.map((u) => ({
      name: u.name ?? "",
      createdBy: u.id,
      userId: u.id,
    })),
  );

  console.log("Insert user sharing preference's");
  await db.insert(userSharingPreference).values(
    users.map((u) => ({
      userId: u.id,
    })),
  );

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

  const imageGameData: z.infer<typeof insertImageSchema>[] = Array.from(
    { length: 30 },
    () => ({
      url: faker.image.urlPicsumPhotos(),
      userId: faker.helpers.arrayElement(users).id,
      name: faker.commerce.productName(),
    }),
  );
  console.log("Inserting game images...\n");
  const gameImages = await db.insert(image).values(imageGameData).returning();

  const normalGames = randomNormal.source(randomLcg(d3Seed))(30, 10);

  const gameNames = Array.from({ length: totalGames / totalUsers }, () =>
    faker.commerce.productName(),
  );

  const gameData: z.infer<typeof insertGameSchema>[] = Array.from(
    { length: totalGames },
    () => {
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
      return {
        name: faker.helpers.arrayElement(gameNames),
        userId: faker.helpers.arrayElement(users).id,
        imageId: faker.helpers.maybe(
          () => faker.helpers.arrayElement(gameImages).id,
          {
            probability: 0.75,
          },
        ),
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
      };
    },
  );
  console.log("Inserting games...\n");
  const returnedGames = await db.insert(game).values(gameData).returning();

  let remainingMatches = maxMatches;
  const gameMatchCounts = returnedGames.map(() => {
    let numMatches = Math.max(1, Math.round(normalGames()));
    numMatches = Math.min(numMatches, remainingMatches); // Prevent overflow
    remainingMatches -= numMatches;
    return numMatches;
  });
  const matchCount = gameMatchCounts.reduce((acc, curr) => acc + curr, 0);

  const locationNames = Array.from({ length: totalUsers }, () =>
    faker.location.city(),
  );

  const locationData: z.infer<typeof insertLocationSchema>[] = Array.from(
    { length: 5 * totalUsers },
    () => ({
      name: faker.helpers.arrayElement(locationNames),
      createdBy: faker.helpers.arrayElement(users).id,
    }),
  );
  console.log("Inserting locations...\n");
  const locations = await db.insert(location).values(locationData).returning();

  const imagePlayerData: z.infer<typeof insertImageSchema>[] = Array.from(
    { length: 30 },
    () => ({
      url: faker.image.avatar(),
      userId: faker.helpers.arrayElement(users).id,
      name: faker.person.fullName(),
    }),
  );
  console.log("Inserting player images...\n");
  const playerImages = await db
    .insert(image)
    .values(imagePlayerData)
    .returning();

  const playerNames = Array.from({ length: totalUsers * 10 }, () =>
    faker.person.fullName(),
  );

  const playerData: z.infer<typeof insertPlayerSchema>[] = Array.from(
    { length: Math.round(totalUsers * 30) },
    () => ({
      name: faker.helpers.arrayElement(playerNames),
      createdBy: faker.helpers.arrayElement(users).id,
      userId: null,
      imageId: faker.helpers.maybe(
        () => faker.helpers.arrayElement(playerImages).id,
        { probability: 0.75 },
      ),
    }),
  );

  console.log("Inserting players...\n");
  await db.insert(player).values(playerData);
  const players = await db.select().from(player);

  const groupData: z.infer<typeof insertGroupSchema>[] = Array.from(
    { length: totalUsers * 2 },
    () => ({
      name: faker.company.name(),
      createdBy: faker.helpers.arrayElement(users).id,
    }),
  );
  console.log("Inserting groups...\n");
  const groups = await db.insert(group).values(groupData).returning();
  for (const group of groups) {
    const playerCount = faker.number.int({
      min: 2,
      max: 10,
    });
    const playersFiltered = players.filter(
      (p) => p.createdBy === group.createdBy,
    );
    if (playersFiltered.length >= playerCount) {
      const groupPlayers = faker.helpers.arrayElements(
        playersFiltered,
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

  const playerAppearances = new Map<number, number>();

  // Setup a samples from a log-normal distribution where most players appear in a few matches, and some appear in many.
  const playerNormal = randomNormal.source(randomLcg(d3Seed))(
    Math.max(Math.min(5, matchCount), matchCount / 10),
    Math.max(Math.min(15, matchCount / 4), matchCount / 8),
  );

  for (const player of players) {
    let appearances = Math.round(Math.abs(playerNormal())); // Ensure positive values

    // Ensure at least 1 match, and cap at 20 to prevent extreme values
    appearances = Math.max(1, Math.min(appearances, matchCount / 3));

    playerAppearances.set(player.id, appearances);
  }
  const userMatches = new Map<number, number>();
  for (const [index, returnedGame] of returnedGames.entries()) {
    if (returnedGame.userId == null) continue;
    if (!userMatches.has(returnedGame.userId)) {
      userMatches.set(returnedGame.userId, gameMatchCounts[index] ?? 1);
    } else {
      userMatches.set(
        returnedGame.userId,
        (userMatches.get(returnedGame.userId) ?? 0) +
          (gameMatchCounts[index] ?? 1),
      );
    }
  }

  const dateNormal = randomUniform.source(randomLcg(d3Seed))(0, 24);

  const today = new Date();

  for (const [index, returnedGame] of returnedGames.entries()) {
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
    console.log(`Inserting scoresheet for ${returnedGame.name}...\n`);
    const [returnedScoresheet] = await db
      .insert(scoresheet)
      .values(scoresheetData)
      .returning();
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
    console.log(`Inserting rounds for ${returnedGame.name}...\n`);
    await db.insert(round).values(roundData).returning();

    let matchData: z.infer<typeof insertMatchSchema>[] = Array.from(
      { length: gameMatchCounts[index] ?? 1 },
      (_, index) => {
        const finished = faker.datatype.boolean(0.85);
        let monthsAgo = Math.round(Math.abs(dateNormal())); // Ensure positive months
        monthsAgo = Math.min(monthsAgo, 24); // Cap at 24 months

        // Calculate the final date
        const subbedDate = subMonths(today, monthsAgo);
        const matchDate = endOfMonth(subbedDate);

        const userLocations = locations.filter(
          (l) => l.createdBy === returnedGame.userId,
        );

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
          locationId:
            userLocations.length > 0
              ? faker.helpers.maybe(
                  () => faker.helpers.arrayElement(userLocations).id,
                  { probability: 0.5 },
                )
              : null,
          date: faker.date.recent({
            days: getDaysInMonth(subbedDate),
            refDate: matchDate,
          }),
          duration: faker.number.int({ min: 30 * 60, max: 400 * 60 }),
          finished: finished,
          running: !finished,
          comment: faker.helpers.maybe(() => faker.lorem.sentence(), {
            probability: 0.1,
          }),
        };
      },
    );
    matchData = await Promise.all(
      matchData.map(async (match) => {
        const [newScoreSheet] = await db
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
          .returning();
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
        await db.insert(round).values(roundsToInert).returning();
        return {
          ...match,
          gameId: returnedGame.id,
          scoresheetId: newScoreSheet.id,
        };
      }),
    );
    console.log(`Inserting matches for ${returnedGame.name}...\n`);
    if (matchData.length === 0) continue;
    const returnedMatches = await db
      .insert(match)
      .values(matchData)
      .returning();

    for (const returnedMatch of returnedMatches) {
      const filteredPlayers = players.filter(
        (player) => player.createdBy === returnedMatch.userId,
      );

      if (!filteredPlayers.length) {
        throw new Error("No eligible players found for match.");
      }

      const minPlayers = returnedGame.playersMin ?? 2;
      const maxPlayers = returnedGame.playersMax ?? 8;
      const playerCount =
        minPlayers > maxPlayers
          ? minPlayers
          : faker.number.int({
              min: minPlayers,
              max: maxPlayers,
            });

      const teamsToInsert: z.infer<typeof insertTeamSchema>[] = Array.from(
        {
          length: faker.number.int({
            min: 1,
            max: Math.max(2, Math.floor(playerCount / 1.5)),
          }),
        },
        () => {
          const teamName = faker.animal.insect();
          return {
            name: teamName,
            matchId: returnedMatch.id,
            details: faker.helpers.maybe(() => faker.lorem.sentence(), {
              probability: 0.05,
            }),
          };
        },
      );
      console.log(`Inserting teams for ${returnedMatch.name}...\n`);
      const returnedTeams = faker.datatype.boolean(0.3)
        ? await db.insert(team).values(teamsToInsert).returning()
        : undefined;

      const weightedPlayers = filteredPlayers.map((player) => ({
        weight:
          player.userId === returnedMatch.userId
            ? Math.max(
                (playerAppearances.get(player.id) ?? 1) / matchCount,
                0.75,
              )
            : (playerAppearances.get(player.id) ?? 1) / matchCount,
        value: player.id,
      }));

      const matchPlayers = weightedRandomSample(
        weightedPlayers,
        Math.min(weightedPlayers.length, playerCount),
      );
      const matchPlayerData: z.infer<typeof insertMatchPlayerSchema>[] =
        matchPlayers.map((player, index) => ({
          matchId: returnedMatch.id,
          playerId: player,
          order: index + 1,
          details: faker.helpers.maybe(() => faker.lorem.sentence(), {
            probability: 0.05,
          }),
          teamId:
            returnedTeams !== undefined
              ? faker.helpers.maybe(
                  () => faker.helpers.arrayElement(returnedTeams).id,
                  { probability: 0.9 },
                )
              : undefined,
        }));
      console.log(`Inserting match players for ${returnedMatch.name}...\n`);
      const matchPlayersResult = await db
        .insert(matchPlayer)
        .values(matchPlayerData)
        .returning();
      const matchRounds = await db
        .select()
        .from(round)
        .where(eq(round.scoresheetId, returnedMatch.scoresheetId));

      const [matchScoresheet] = await db
        .select()
        .from(scoresheet)
        .where(eq(scoresheet.id, returnedMatch.scoresheetId));
      if (!matchScoresheet) {
        throw new Error("Scoresheet not found");
      }
      const teamPlayers = matchPlayersResult.reduce<
        Record<number, typeof matchPlayersResult>
      >((acc, curr) => {
        if (curr.teamId) {
          if (acc[curr.teamId]) {
            acc[curr.teamId]?.push(curr);
          } else {
            acc[curr.teamId] = [curr];
          }
        }
        return acc;
      }, {});
      const maxScore =
        matchScoresheet.roundsScore === "Aggregate" ||
        matchScoresheet.roundsScore === "Best Of"
          ? faker.number.int({ min: 10, max: 30 })
          : 5;
      const minScore =
        matchScoresheet.winCondition === "Lowest Score"
          ? faker.number.int({ min: -30, max: -1 })
          : 0;
      const roundPlayerData: z.infer<typeof insertRoundPlayerSchema>[] =
        returnedTeams !== undefined &&
        matchPlayersResult.find(
          (matchPlayerResult) => matchPlayerResult.teamId !== null,
        )
          ? Object.values(teamPlayers).flatMap((teamPlayers) => {
              const scoreToSet = faker.number.int({
                min: minScore,
                max: maxScore,
              });
              const isChecked = faker.datatype.boolean(0.5);
              return teamPlayers.flatMap((matchPlayer) => {
                return matchRounds.map((round) => ({
                  roundId: round.id,
                  matchPlayerId: matchPlayer.id,
                  score:
                    round.type === "Checkbox"
                      ? isChecked
                        ? round.score
                        : null
                      : scoreToSet,
                }));
              });
            })
          : [];
      matchPlayersResult
        .filter((matchPlayerResult) => matchPlayerResult.teamId === null)
        .forEach((matchPlayer) => {
          matchRounds.forEach((round) => {
            roundPlayerData.push({
              roundId: round.id,
              matchPlayerId: matchPlayer.id,
              score:
                round.type === "Checkbox"
                  ? faker.helpers.maybe(() => round.score, {
                      probability: 0.5,
                    })
                  : faker.number.int({ min: minScore, max: maxScore }),
            });
          });
        });
      console.log(`Inserting round players for ${returnedMatch.name}...\n`);
      await db.insert(roundPlayer).values(roundPlayerData).returning();

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
            return sql<number>`SUM(
                CASE WHEN ${roundPlayer.score} = ${matchScoresheet.targetScore} 
                THEN ${roundPlayer.score} ELSE 0 END
              )`.as("finalScore");
          }
        }
        return sql<number>`0`.as("finalScore");
      };

      console.log(`Calculating final scores for ${returnedMatch.name}...\n`);
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
        if (matchScoresheet.winCondition === "Manual") {
          return faker.datatype.boolean(
            returnedRoundPlayersGroupByMatchPLayer.length > 1
              ? 1.5 / returnedRoundPlayersGroupByMatchPLayer.length
              : 0.5,
          );
        }
        return false;
      };
      const finalScores = returnedRoundPlayersGroupByMatchPLayer.map(
        (player) => ({
          id: player.matchPlayerId,
          score: player.finalScore,
        }),
      );
      finalScores.sort((a, b) => {
        if (matchScoresheet.winCondition === "Highest Score") {
          return b.score - a.score;
        }
        if (matchScoresheet.winCondition === "Lowest Score") {
          return a.score - b.score;
        }
        if (matchScoresheet.winCondition === "Target Score") {
          if (a.score == b.score) {
            return 0;
          }
          if (a.score === matchScoresheet.targetScore) return -1;
          if (b.score === matchScoresheet.targetScore) return 1;
        }
        return 0;
      });
      let placement = 1;
      const placements: { id: number; score: number; placement: number }[] = [];

      for (let i = 0; i < finalScores.length; i++) {
        if (i > 0 && finalScores[i]?.score !== finalScores[i - 1]?.score) {
          placement = i + 1; // Adjust placement only if score changes
        }
        placements.push({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: finalScores[i]!.id,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          score: finalScores[i]!.score,
          placement,
        });
      }
      const findPlacement = (matchPlayerId: number): number => {
        const parsedMatchPlayerId = Number(matchPlayerId); // Ensure it's a number
        const foundPlayer = placements.find(
          (player) => player.id === parsedMatchPlayerId,
        );
        return foundPlayer?.placement ?? 0;
      };

      console.log(`Updating player placements for ${returnedMatch.name}...\n`);
      for (const returnedRoundPlayer of returnedRoundPlayersGroupByMatchPLayer) {
        const playerIsWinner = isWinner(returnedRoundPlayer.finalScore);
        if (matchScoresheet.winCondition === "Manual") {
          await db
            .update(matchPlayer)
            .set({
              winner: playerIsWinner,
              score: returnedRoundPlayer.finalScore,
              placement: playerIsWinner ? 1 : 0,
            })
            .where(eq(matchPlayer.id, returnedRoundPlayer.matchPlayerId));
        } else {
          const placement = findPlacement(returnedRoundPlayer.matchPlayerId);
          await db
            .update(matchPlayer)
            .set({
              winner: isWinner(returnedRoundPlayer.finalScore),
              score: returnedRoundPlayer.finalScore,
              placement: placement,
            })
            .where(eq(matchPlayer.id, returnedRoundPlayer.matchPlayerId));
        }
      }
      console.log(`Finished ${returnedMatch.name}\n`);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parentShareRequestSchema = insertShareRequestSchema
    .required({ createdAt: true, ownerId: true, permission: true })
    .omit({ updatedAt: true, id: true, token: true, parentShareId: true });
  for (const userA of users) {
    const userAFriends = await db
      .select()
      .from(friend)
      .where(eq(friend.userId, userA.id));
    const filteredGames = returnedGames.filter((g) => g.userId === userA.id);
    const filteredPlayers = players.filter((p) => p.createdBy === userA.id);
    const userShareRequests: z.infer<typeof parentShareRequestSchema>[] = (
      await Promise.all(
        Array.from(
          { length: faker.number.int({ min: 8, max: 30 }) },
          async () => {
            const isLink =
              faker.datatype.boolean(0.2) || userAFriends.length === 0;
            const itemType = faker.helpers.arrayElement([
              "match",
              "game",
              "player",
            ]);
            const status = faker.helpers.weightedArrayElement([
              { weight: 0.5, value: "accepted" },
              { weight: 0.4, value: "pending" },
              { weight: 0.1, value: "rejected" },
            ]);
            const pastDate = faker.date.past();
            if (itemType === "game" && filteredGames.length > 0) {
              return {
                ownerId: userA.id,
                sharedWithId: isLink
                  ? undefined
                  : faker.helpers.arrayElement(userAFriends).friendId,
                itemType,
                itemId: faker.helpers.arrayElement(filteredGames).id,
                createdAt: pastDate,
                expiresAt: isLink
                  ? faker.date.future({ years: 1, refDate: pastDate })
                  : faker.helpers.maybe(
                      () => faker.date.future({ years: 1, refDate: pastDate }),
                      {
                        probability: 0.5,
                      },
                    ),
                status,
                permission: faker.helpers.arrayElement(["view", "edit"]),
              };
            }
            if (itemType === "player" && filteredPlayers.length > 0) {
              return {
                ownerId: userA.id,
                sharedWithId: isLink
                  ? undefined
                  : faker.helpers.arrayElement(userAFriends).friendId,
                itemType,
                itemId: faker.helpers.arrayElement(filteredPlayers).id,
                createdAt: pastDate,
                expiresAt: isLink
                  ? faker.date.future({ years: 1, refDate: pastDate })
                  : faker.helpers.maybe(
                      () => faker.date.future({ years: 1, refDate: pastDate }),
                      {
                        probability: 0.5,
                      },
                    ),
                status,
                permission: faker.helpers.arrayElement(["view", "edit"]),
              };
            }
            if (itemType === "match") {
              const returnedMatches = await db
                .select()
                .from(match)
                .where(eq(match.userId, userA.id));
              if (returnedMatches.length === 0) return null;
              return {
                ownerId: userA.id,
                sharedWithId: isLink
                  ? undefined
                  : faker.helpers.arrayElement(userAFriends).friendId,
                itemType,
                itemId: faker.helpers.arrayElement(returnedMatches).id,
                expiresAt: isLink
                  ? faker.date.future({ years: 1, refDate: pastDate })
                  : faker.helpers.maybe(
                      () => faker.date.future({ years: 1, refDate: pastDate }),
                      {
                        probability: 0.5,
                      },
                    ),
                createdAt: pastDate,
                status,
                permission: faker.helpers.arrayElement(["view", "edit"]),
              };
            }
            return null;
          },
        ),
      )
    ).filter((item) => item !== null);
    const returnedUserShareRequests = await db
      .insert(shareRequest)
      .values(userShareRequests)
      .returning();
    for (const returnedUserShareRequest of returnedUserShareRequests) {
      const currentShareRequests = await db.query.shareRequest.findMany({
        where: {
          ownerId: returnedUserShareRequest.ownerId,
          status: "accepted",
          sharedWith: true,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const childShareRequestSchema = insertShareRequestSchema
        .required({ parentShareId: true, createdAt: true })
        .omit({ updatedAt: true, id: true, token: true });
      if (returnedUserShareRequest.itemType === "game") {
        const returnedGame = await db.query.game.findFirst({
          where: {
            id: returnedUserShareRequest.itemId,
            userId: returnedUserShareRequest.ownerId,
          },
          with: {
            scoresheets: true,
            matches: {
              with: {
                matchPlayers: true,
              },
            },
          },
        });
        if (returnedGame) {
          const childShareRequest: z.infer<typeof childShareRequestSchema>[] =
            [];
          if (returnedGame.matches.length > 0 && faker.datatype.boolean()) {
            faker.helpers
              .arrayElements(returnedGame.matches, {
                min: 1,
                max: returnedGame.matches.length,
              })
              .forEach((m) => {
                if (m.locationId !== null) {
                  childShareRequest.push({
                    createdAt: returnedUserShareRequest.createdAt,
                    itemId: m.locationId,
                    parentShareId: returnedUserShareRequest.id,
                    status: returnedUserShareRequest.status,
                    itemType: "location",
                    ownerId: returnedUserShareRequest.ownerId,
                    expiresAt: returnedUserShareRequest.expiresAt,
                    permission: faker.helpers.arrayElement(["view", "edit"]),
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                  });
                }
                childShareRequest.push({
                  createdAt: returnedUserShareRequest.createdAt,
                  itemId: m.id,
                  parentShareId: returnedUserShareRequest.id,
                  status: returnedUserShareRequest.status,
                  itemType: "match",
                  ownerId: returnedUserShareRequest.ownerId,
                  expiresAt: returnedUserShareRequest.expiresAt,
                  permission: faker.helpers.arrayElement(["view", "edit"]),
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                });
                if (faker.datatype.boolean(0.8)) {
                  m.matchPlayers.forEach((mPlayer) => {
                    childShareRequest.push({
                      createdAt: returnedUserShareRequest.createdAt,
                      itemId: mPlayer.playerId,
                      parentShareId: returnedUserShareRequest.id,
                      status: returnedUserShareRequest.status,
                      itemType: "player",
                      ownerId: returnedUserShareRequest.ownerId,
                      expiresAt: returnedUserShareRequest.expiresAt,
                      permission: "view",
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                    });
                  });
                }
              });
            returnedGame.scoresheets.forEach((sSheet) => {
              if (sSheet.type === "Default") {
                childShareRequest.push({
                  createdAt: returnedUserShareRequest.createdAt,
                  itemId: sSheet.id,
                  parentShareId: returnedUserShareRequest.id,
                  status: returnedUserShareRequest.status,
                  itemType: "scoresheet",
                  ownerId: returnedUserShareRequest.ownerId,
                  expiresAt: returnedUserShareRequest.expiresAt,
                  permission: faker.helpers.arrayElement(["view", "edit"]),
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                });
              } else if (faker.datatype.boolean(0.5)) {
                childShareRequest.push({
                  createdAt: returnedUserShareRequest.createdAt,
                  itemId: sSheet.id,
                  parentShareId: returnedUserShareRequest.id,
                  status: returnedUserShareRequest.status,
                  itemType: "scoresheet",
                  ownerId: returnedUserShareRequest.ownerId,
                  expiresAt: returnedUserShareRequest.expiresAt,
                  permission: faker.helpers.arrayElement(["view", "edit"]),
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                });
              }
            });
          }
          const uniqueMap = new Map<
            string,
            z.infer<typeof childShareRequestSchema>
          >();
          for (const req of childShareRequest) {
            const key = `${req.itemType}-${req.itemId}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, req);
            }
          }

          // Filter out items that are already in currentShareRequest
          const filteredChildShareRequest = Array.from(
            uniqueMap.values(),
          ).filter(
            (cShareRequest) =>
              !currentShareRequests.find(
                (existing) =>
                  existing.itemType === cShareRequest.itemType &&
                  existing.itemId === cShareRequest.itemId &&
                  existing.sharedWithId === cShareRequest.sharedWithId,
              ),
          );

          if (filteredChildShareRequest.length > 0) {
            await db.insert(shareRequest).values(filteredChildShareRequest);
          }
          if (
            returnedUserShareRequest.status === "accepted" &&
            returnedUserShareRequest.sharedWithId !== null
          ) {
            const sharedWithGames = await db.query.game.findMany({
              where: {
                userId: returnedUserShareRequest.sharedWithId,
              },
            });
            const [returnedSharedGame] = await db
              .insert(sharedGame)
              .values({
                ownerId: returnedUserShareRequest.ownerId,
                sharedWithId: returnedUserShareRequest.sharedWithId,
                gameId: returnedGame.id,
                permission: returnedUserShareRequest.permission,
                linkedGameId:
                  sharedWithGames.length > 0
                    ? faker.helpers.maybe(
                        () => faker.helpers.arrayElement(sharedWithGames).id,
                        { probability: 0.2 },
                      )
                    : undefined,
              })
              .returning();
            if (!returnedSharedGame) {
              throw new Error("Failed to create shared game");
            }
            const sharedUserPlayers = await db.query.player.findMany({
              where: {
                userId: returnedUserShareRequest.sharedWithId,
              },
            });
            const sharedUserPlayerIds = sharedUserPlayers.map(
              (player) => player.id,
            );
            const sharedUserLocations = await db.query.location.findMany({
              where: {
                createdBy: returnedUserShareRequest.sharedWithId,
              },
            });
            const sharedUserLocationIds = sharedUserLocations.map(
              (location) => location.id,
            );
            const childShareRequest = await db.query.shareRequest.findMany({
              where: {
                parentShareId: returnedUserShareRequest.id,
                status: "accepted",
              },
              orderBy: { createdAt: "asc" },
            });
            for (const cShareRequest of childShareRequest.filter(
              (cShareRequest) => cShareRequest.itemType === "player",
            )) {
              if (cShareRequest.itemType === "player") {
                const existingSharedPlayer =
                  await db.query.sharedPlayer.findFirst({
                    where: {
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      playerId: cShareRequest.itemId,
                    },
                  });
                if (!existingSharedPlayer) {
                  await db.insert(sharedPlayer).values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    playerId: cShareRequest.itemId,
                    permission: cShareRequest.permission,
                    linkedPlayerId:
                      sharedUserPlayerIds.length > 0
                        ? faker.helpers.maybe(
                            () =>
                              faker.helpers.arrayElement(sharedUserPlayerIds),
                            { probability: 0.2 },
                          )
                        : undefined,
                  });
                }
              }
            }
            for (const cShareRequest of childShareRequest.filter(
              (c) => c.itemType === "location",
            )) {
              if (cShareRequest.itemType === "location") {
                const existingLocation = await db.query.location.findFirst({
                  where: {
                    createdBy: returnedUserShareRequest.ownerId,
                    id: cShareRequest.itemId,
                  },
                });
                if (!existingLocation) {
                  throw new Error("Location not found.");
                }
                const existingSharedLocation =
                  await db.query.sharedLocation.findFirst({
                    where: {
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      locationId: cShareRequest.itemId,
                    },
                  });
                if (!existingSharedLocation) {
                  const [insertedSharedLocation] = await db
                    .insert(sharedLocation)
                    .values({
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      locationId: cShareRequest.itemId,
                      permission: cShareRequest.permission,
                      linkedLocationId:
                        sharedUserLocationIds.length > 0
                          ? faker.helpers.maybe(
                              () =>
                                faker.helpers.arrayElement(
                                  sharedUserLocationIds,
                                ),
                              { probability: 0.5 },
                            )
                          : null,
                    })
                    .returning();
                  if (!insertedSharedLocation) {
                    throw Error("Shared Location not found");
                  }
                }
              }
            }
            for (const cShareRequest of childShareRequest.filter(
              (cShareRequest) => cShareRequest.itemType === "match",
            )) {
              if (cShareRequest.itemType === "match") {
                const existingMatch = await db.query.match.findFirst({
                  where: {
                    userId: returnedUserShareRequest.ownerId,
                    id: cShareRequest.itemId,
                  },
                });
                if (!existingMatch) {
                  throw Error("Match not found");
                }
                const existingSharedMatch =
                  await db.query.sharedMatch.findFirst({
                    where: {
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      matchId: cShareRequest.itemId,
                    },
                  });
                if (!existingSharedMatch) {
                  let sharedLocationForMatch: z.infer<
                    typeof selectSharedLocationSchema
                  > | null = null;
                  if (existingMatch.locationId !== null) {
                    const existingSharedLocation =
                      await db.query.sharedLocation.findFirst({
                        where: {
                          ownerId: returnedUserShareRequest.ownerId,
                          sharedWithId: returnedUserShareRequest.sharedWithId,
                          locationId: existingMatch.locationId,
                        },
                      });
                    if (existingSharedLocation) {
                      sharedLocationForMatch = existingSharedLocation;
                    }
                  }
                  const [returnedSharedMatch] = await db
                    .insert(sharedMatch)
                    .values({
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      matchId: cShareRequest.itemId,
                      sharedGameId: returnedSharedGame.id,
                      sharedLocationId: sharedLocationForMatch?.id ?? null,
                      permission: cShareRequest.permission,
                    })
                    .returning();
                  if (!returnedSharedMatch) {
                    throw new Error("Shared Match not created successfully");
                  }
                  const returnedMatchPlayers =
                    await db.query.matchPlayer.findMany({
                      where: {
                        matchId: cShareRequest.itemId,
                      },
                    });
                  const sharedMatchPlayersToInsert: z.infer<
                    typeof insertSharedMatchPlayerSchema
                  >[] = await Promise.all(
                    returnedMatchPlayers.map(async (returnedMatchPlayer) => {
                      const existingSharedPlayer =
                        await db.query.sharedPlayer.findFirst({
                          where: {
                            ownerId: returnedUserShareRequest.ownerId,
                            sharedWithId:
                              returnedUserShareRequest.sharedWithId ?? 0,
                            playerId: returnedMatchPlayer.playerId,
                          },
                        });
                      if (existingSharedPlayer) {
                        return {
                          matchPlayerId: returnedMatchPlayer.id,
                          sharedPlayerId: existingSharedPlayer.id,
                          ownerId: returnedUserShareRequest.ownerId,
                          sharedWithId:
                            returnedUserShareRequest.sharedWithId ?? 0,
                          sharedMatchId: returnedSharedMatch.id,
                          permission: cShareRequest.permission,
                        };
                      }
                      return {
                        matchPlayerId: returnedMatchPlayer.id,
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId:
                          returnedUserShareRequest.sharedWithId ?? 0,
                        sharedMatchId: returnedSharedMatch.id,
                        permission: cShareRequest.permission,
                      };
                    }),
                  );
                  await db
                    .insert(sharedMatchPlayer)
                    .values(sharedMatchPlayersToInsert);
                }
              }
            }
            for (const cShareRequest of childShareRequest.filter(
              (cShareRequest) => cShareRequest.itemType === "scoresheet",
            )) {
              if (cShareRequest.itemType === "scoresheet") {
                await db.insert(sharedScoresheet).values({
                  ownerId: returnedUserShareRequest.ownerId,
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                  scoresheetId: cShareRequest.itemId,
                  permission: cShareRequest.permission,
                  sharedGameId: returnedSharedGame.id,
                });
              }
            }
          }
        }
      }
      if (returnedUserShareRequest.itemType === "match") {
        const returnedMatch = await db.query.match.findFirst({
          where: {
            id: returnedUserShareRequest.itemId,
            userId: returnedUserShareRequest.ownerId,
          },
          with: {
            game: {
              with: {
                scoresheets: true,
              },
            },
            matchPlayers: true,
          },
        });
        if (returnedMatch) {
          const childShareRequest: z.infer<typeof childShareRequestSchema>[] =
            [];
          childShareRequest.push({
            createdAt: returnedUserShareRequest.createdAt,
            itemId: returnedMatch.gameId,
            parentShareId: returnedUserShareRequest.id,
            status: returnedUserShareRequest.status,
            itemType: "game",
            ownerId: returnedUserShareRequest.ownerId,
            expiresAt: returnedUserShareRequest.expiresAt,
            permission: faker.helpers.arrayElement(["view", "edit"]),
            sharedWithId: returnedUserShareRequest.sharedWithId,
          });
          if (returnedMatch.locationId) {
            childShareRequest.push({
              createdAt: returnedUserShareRequest.createdAt,
              itemId: returnedMatch.locationId,
              parentShareId: returnedUserShareRequest.id,
              status: returnedUserShareRequest.status,
              itemType: "location",
              ownerId: returnedUserShareRequest.ownerId,
              expiresAt: returnedUserShareRequest.expiresAt,
              permission: faker.helpers.arrayElement(["view", "edit"]),
              sharedWithId: returnedUserShareRequest.sharedWithId,
            });
          }
          for (const childScoresheet of returnedMatch.game.scoresheets) {
            childShareRequest.push({
              createdAt: returnedUserShareRequest.createdAt,
              itemId: childScoresheet.id,
              parentShareId: returnedUserShareRequest.id,
              status: returnedUserShareRequest.status,
              itemType: "scoresheet",
              ownerId: returnedUserShareRequest.ownerId,
              expiresAt: returnedUserShareRequest.expiresAt,
              permission: faker.helpers.arrayElement(["view", "edit"]),
              sharedWithId: returnedUserShareRequest.sharedWithId,
            });
          }

          if (faker.datatype.boolean(0.8)) {
            returnedMatch.matchPlayers.forEach((mPlayer) => {
              childShareRequest.push({
                createdAt: returnedUserShareRequest.createdAt,
                itemId: mPlayer.playerId,
                parentShareId: returnedUserShareRequest.id,
                status: returnedUserShareRequest.status,
                itemType: "player",
                ownerId: returnedUserShareRequest.ownerId,
                expiresAt: returnedUserShareRequest.expiresAt,
                permission: faker.helpers.arrayElement(["view", "edit"]),
                sharedWithId: returnedUserShareRequest.sharedWithId,
              });
            });
          }
          const uniqueMap = new Map<
            string,
            z.infer<typeof childShareRequestSchema>
          >();
          for (const req of childShareRequest) {
            const key = `${req.itemType}-${req.itemId}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, req);
            }
          }

          // Filter out items that are already in currentShareRequest
          const filteredChildShareRequest = Array.from(
            uniqueMap.values(),
          ).filter(
            (cShareRequest) =>
              !currentShareRequests.find(
                (existing) =>
                  existing.itemType === cShareRequest.itemType &&
                  existing.itemId === cShareRequest.itemId &&
                  existing.sharedWithId === cShareRequest.sharedWithId &&
                  existing.ownerId === cShareRequest.ownerId &&
                  existing.status === cShareRequest.status,
              ),
          );
          if (filteredChildShareRequest.length > 0) {
            await db.insert(shareRequest).values(filteredChildShareRequest);
          }
          if (
            returnedUserShareRequest.status === "accepted" &&
            returnedUserShareRequest.sharedWithId !== null
          ) {
            const sharedUserPlayers = await db.query.player.findMany({
              where: {
                userId: returnedUserShareRequest.sharedWithId,
              },
            });
            const sharedUserPlayerIds = sharedUserPlayers.map(
              (player) => player.id,
            );
            const sharedUserLocations = await db.query.location.findMany({
              where: {
                createdBy: returnedUserShareRequest.sharedWithId,
              },
            });
            const sharedUserLocationIds = sharedUserLocations.map(
              (location) => location.id,
            );
            const childShareRequest = await db.query.shareRequest.findMany({
              where: {
                parentShareId: returnedUserShareRequest.id,
                status: "accepted",
              },
              orderBy: {
                createdAt: "asc",
              },
            });
            const locationChildShareRequest = childShareRequest.find(
              (cShareRequest) => cShareRequest.itemType === "location",
            );
            if (locationChildShareRequest) {
              const existingSharedLocation =
                await db.query.sharedLocation.findFirst({
                  where: {
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    locationId: locationChildShareRequest.itemId,
                  },
                });
              if (!existingSharedLocation) {
                const [insertedSharedLocation] = await db
                  .insert(sharedLocation)
                  .values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    locationId: locationChildShareRequest.itemId,
                    permission: locationChildShareRequest.permission,
                    linkedLocationId:
                      sharedUserLocationIds.length > 0
                        ? faker.helpers.maybe(
                            () =>
                              faker.helpers.arrayElement(sharedUserLocationIds),
                            { probability: 0.5 },
                          )
                        : null,
                  })
                  .returning();
                if (!insertedSharedLocation) {
                  throw Error("Shared Location not found");
                }
              }
            }
            for (const cShareRequest of childShareRequest) {
              if (cShareRequest.itemType === "game") {
                const sharedWithGames = await db.query.game.findMany({
                  where: {
                    userId: returnedUserShareRequest.sharedWithId,
                  },
                });
                await db.insert(sharedGame).values({
                  ownerId: returnedUserShareRequest.ownerId,
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                  gameId: cShareRequest.itemId,
                  permission: cShareRequest.permission,
                  linkedGameId:
                    sharedWithGames.length > 0
                      ? faker.helpers.maybe(
                          () => faker.helpers.arrayElement(sharedWithGames).id,
                          { probability: 0.2 },
                        )
                      : undefined,
                });
              }
              if (cShareRequest.itemType === "player") {
                await db.insert(sharedPlayer).values({
                  ownerId: returnedUserShareRequest.ownerId,
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                  playerId: cShareRequest.itemId,
                  permission: cShareRequest.permission,
                  linkedPlayerId:
                    sharedUserPlayerIds.length > 0
                      ? faker.helpers.maybe(
                          () => faker.helpers.arrayElement(sharedUserPlayerIds),
                          { probability: 0.2 },
                        )
                      : undefined,
                });
              }
            }
            const returnedSharedGame = await db.query.sharedGame.findFirst({
              where: {
                ownerId: returnedUserShareRequest.ownerId,
                sharedWithId: returnedUserShareRequest.sharedWithId,
                gameId: returnedMatch.gameId,
              },
            });
            if (returnedSharedGame) {
              for (const cShareRequest of childShareRequest.filter(
                (c) => c.itemType === "scoresheet",
              )) {
                if (cShareRequest.itemType === "scoresheet") {
                  await db.insert(sharedScoresheet).values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    scoresheetId: cShareRequest.itemId,
                    permission: cShareRequest.permission,
                    sharedGameId: returnedSharedGame.id,
                  });
                }
              }
              const existingMatch = await db.query.match.findFirst({
                where: {
                  id: returnedMatch.id,
                  userId: returnedUserShareRequest.ownerId,
                },
              });
              if (!existingMatch) {
                throw new Error("Match not found");
              }
              const existingSharedMatch = await db.query.sharedMatch.findFirst({
                where: {
                  ownerId: returnedUserShareRequest.ownerId,
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                  matchId: returnedMatch.id,
                },
              });
              if (!existingSharedMatch) {
                let sharedLocationForMatch: z.infer<
                  typeof selectSharedLocationSchema
                > | null = null;
                if (existingMatch.locationId !== null) {
                  const existingSharedLocation =
                    await db.query.sharedLocation.findFirst({
                      where: {
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        locationId: existingMatch.locationId,
                      },
                    });
                  if (existingSharedLocation) {
                    sharedLocationForMatch = existingSharedLocation;
                  }
                }
                const [returnedSharedMatch] = await db
                  .insert(sharedMatch)
                  .values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    matchId: returnedMatch.id,
                    sharedGameId: returnedSharedGame.id,
                    sharedLocationId: sharedLocationForMatch?.id ?? null,
                    permission: returnedUserShareRequest.permission,
                  })
                  .returning();
                if (!returnedSharedMatch) {
                  throw new Error("Shared Match not created successfully");
                }
                const returnedMatchPlayers =
                  await db.query.matchPlayer.findMany({
                    where: {
                      matchId: returnedMatch.id,
                    },
                  });
                const sharedMatchPlayersToInsert: z.infer<
                  typeof insertSharedMatchPlayerSchema
                >[] = await Promise.all(
                  returnedMatchPlayers.map(async (returnedMatchPlayer) => {
                    const existingSharedPlayer =
                      await db.query.sharedPlayer.findFirst({
                        where: {
                          ownerId: returnedUserShareRequest.ownerId,
                          sharedWithId:
                            returnedUserShareRequest.sharedWithId ?? 0,
                          playerId: returnedMatchPlayer.playerId,
                        },
                      });
                    if (existingSharedPlayer) {
                      return {
                        matchPlayerId: returnedMatchPlayer.id,
                        sharedPlayerId: existingSharedPlayer.id,
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId:
                          returnedUserShareRequest.sharedWithId ?? 0,
                        sharedMatchId: returnedSharedMatch.id,
                        permission: returnedUserShareRequest.permission,
                      };
                    }
                    return {
                      matchPlayerId: returnedMatchPlayer.id,
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId ?? 0,
                      sharedMatchId: returnedSharedMatch.id,
                      permission: returnedUserShareRequest.permission,
                    };
                  }),
                );
                await db
                  .insert(sharedMatchPlayer)
                  .values(sharedMatchPlayersToInsert);
              }
            }
          }
        }
      }
      if (returnedUserShareRequest.itemType === "player") {
        const returnedPlayer = await db.query.player.findFirst({
          where: {
            id: returnedUserShareRequest.itemId,
            createdBy: returnedUserShareRequest.ownerId,
          },
          with: {
            matchPlayers: {
              with: {
                match: {
                  with: {
                    matchPlayers: {
                      where: {
                        NOT: {
                          playerId: returnedUserShareRequest.itemId,
                        },
                      },
                      with: {
                        match: true,
                      },
                    },
                    game: {
                      with: {
                        scoresheets: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        if (returnedPlayer) {
          const childShareRequest: z.infer<typeof childShareRequestSchema>[] =
            [];
          if (
            returnedPlayer.matchPlayers.length > 0 &&
            faker.datatype.boolean()
          ) {
            faker.helpers
              .arrayElements(returnedPlayer.matchPlayers, {
                min: 1,
                max: returnedPlayer.matchPlayers.length,
              })
              .forEach((mPlayer) => {
                childShareRequest.push({
                  createdAt: returnedUserShareRequest.createdAt,
                  itemId: mPlayer.match.id,
                  parentShareId: returnedUserShareRequest.id,
                  status: returnedUserShareRequest.status,
                  itemType: "match",
                  ownerId: returnedUserShareRequest.ownerId,
                  expiresAt: returnedUserShareRequest.expiresAt,
                  permission: faker.helpers.arrayElement(["view", "edit"]),
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                });
                if (mPlayer.match.locationId !== null) {
                  childShareRequest.push({
                    createdAt: returnedUserShareRequest.createdAt,
                    itemId: mPlayer.match.locationId,
                    parentShareId: returnedUserShareRequest.id,
                    status: returnedUserShareRequest.status,
                    itemType: "location",
                    ownerId: returnedUserShareRequest.ownerId,
                    expiresAt: returnedUserShareRequest.expiresAt,
                    permission: faker.helpers.arrayElement(["view", "edit"]),
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                  });
                }
                childShareRequest.push({
                  createdAt: returnedUserShareRequest.createdAt,
                  itemId: mPlayer.match.gameId,
                  parentShareId: returnedUserShareRequest.id,
                  status: returnedUserShareRequest.status,
                  itemType: "game",
                  ownerId: returnedUserShareRequest.ownerId,
                  expiresAt: returnedUserShareRequest.expiresAt,
                  permission: faker.helpers.arrayElement(["view", "edit"]),
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                });
                for (const childScoresheet of mPlayer.match.game.scoresheets) {
                  childShareRequest.push({
                    createdAt: returnedUserShareRequest.createdAt,
                    itemId: childScoresheet.id,
                    parentShareId: returnedUserShareRequest.id,
                    status: returnedUserShareRequest.status,
                    itemType: "scoresheet",
                    ownerId: returnedUserShareRequest.ownerId,
                    expiresAt: returnedUserShareRequest.expiresAt,
                    permission: faker.helpers.arrayElement(["view", "edit"]),
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                  });
                }
                if (faker.datatype.boolean(0.8)) {
                  mPlayer.match.matchPlayers.forEach((mPlayer) => {
                    if (mPlayer.playerId !== returnedUserShareRequest.itemId) {
                      childShareRequest.push({
                        createdAt: returnedUserShareRequest.createdAt,
                        itemId: mPlayer.playerId,
                        parentShareId: returnedUserShareRequest.id,
                        status: returnedUserShareRequest.status,
                        itemType: "player",
                        ownerId: returnedUserShareRequest.ownerId,
                        expiresAt: returnedUserShareRequest.expiresAt,
                        permission: faker.helpers.arrayElement([
                          "view",
                          "edit",
                        ]),
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                      });
                    }
                  });
                }
              });
          }
          const uniqueMap = new Map<
            string,
            z.infer<typeof childShareRequestSchema>
          >();
          for (const req of childShareRequest) {
            const key = `${req.itemType}-${req.itemId}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, req);
            }
          }

          // Filter out items that are already in currentShareRequest
          const filteredChildShareRequest = Array.from(
            uniqueMap.values(),
          ).filter(
            (cShareRequest) =>
              !currentShareRequests.find(
                (existing) =>
                  existing.itemType === cShareRequest.itemType &&
                  existing.itemId === cShareRequest.itemId &&
                  existing.sharedWithId === cShareRequest.sharedWithId,
              ),
          );
          console.log(
            "About to insert childShareRequests",
            uniqueMap.size,
            filteredChildShareRequest.length,
          );

          if (filteredChildShareRequest.length > 0) {
            const inserted = await db
              .insert(shareRequest)
              .values(filteredChildShareRequest)
              .returning();
            if (inserted.length !== filteredChildShareRequest.length) {
              console.warn(
                "Some share requests may not have been inserted:",
                inserted,
              );
            }
          }
          if (
            returnedUserShareRequest.status === "accepted" &&
            returnedUserShareRequest.sharedWithId !== null
          ) {
            const childShareRequest = await db.query.shareRequest.findMany({
              where: {
                parentShareId: returnedUserShareRequest.id,
                status: "accepted",
              },
              orderBy: {
                createdAt: "asc",
              },
            });
            const sharedUserPlayers = await db.query.player.findMany({
              where: {
                userId: returnedUserShareRequest.sharedWithId,
              },
            });
            const sharedUserPlayerIds = sharedUserPlayers.map(
              (player) => player.id,
            );
            const sharedUserLocations = await db.query.location.findMany({
              where: {
                createdBy: returnedUserShareRequest.sharedWithId,
              },
            });
            const sharedUserLocationIds = sharedUserLocations.map(
              (location) => location.id,
            );
            const sharedWithGames = await db.query.game.findMany({
              where: {
                userId: returnedUserShareRequest.sharedWithId,
              },
            });
            for (const cShareRequest of childShareRequest) {
              if (cShareRequest.itemType === "game") {
                await db.insert(sharedGame).values({
                  ownerId: returnedUserShareRequest.ownerId,
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                  gameId: cShareRequest.itemId,
                  permission: cShareRequest.permission,
                  linkedGameId:
                    sharedWithGames.length > 0
                      ? faker.helpers.maybe(
                          () => faker.helpers.arrayElement(sharedWithGames).id,
                          { probability: 0.2 },
                        )
                      : undefined,
                });
              }
              if (cShareRequest.itemType === "player") {
                await db.insert(sharedPlayer).values({
                  ownerId: returnedUserShareRequest.ownerId,
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                  playerId: cShareRequest.itemId,
                  permission: cShareRequest.permission,
                  linkedPlayerId:
                    sharedUserPlayerIds.length > 0
                      ? faker.helpers.maybe(
                          () => faker.helpers.arrayElement(sharedUserPlayerIds),
                          { probability: 0.2 },
                        )
                      : undefined,
                });
              }
            }

            for (const cShareRequest of childShareRequest.filter(
              (cShareRequest) => cShareRequest.itemType === "location",
            )) {
              const existingLocation = await db.query.location.findFirst({
                where: {
                  createdBy: returnedUserShareRequest.ownerId,
                  id: cShareRequest.itemId,
                },
              });
              if (!existingLocation) {
                throw new Error("Location not found.");
              }
              const existingSharedLocation =
                await db.query.sharedLocation.findFirst({
                  where: {
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    locationId: cShareRequest.itemId,
                  },
                });
              if (!existingSharedLocation) {
                const [insertedSharedLocation] = await db
                  .insert(sharedLocation)
                  .values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    locationId: cShareRequest.itemId,
                    permission: cShareRequest.permission,
                    linkedLocationId:
                      sharedUserLocationIds.length > 0
                        ? faker.helpers.maybe(
                            () =>
                              faker.helpers.arrayElement(sharedUserLocationIds),
                            { probability: 0.5 },
                          )
                        : null,
                  })
                  .returning();
                if (!insertedSharedLocation) {
                  throw Error("Shared Location not found");
                }
              }
            }

            for (const cShareRequest of childShareRequest.filter(
              (c) => c.itemType === "scoresheet" || c.itemType === "match",
            )) {
              if (cShareRequest.itemType === "scoresheet") {
                const returnedScoresheet = await db.query.scoresheet.findFirst({
                  where: {
                    id: cShareRequest.itemId,
                    userId: returnedUserShareRequest.ownerId,
                  },
                });
                if (!returnedScoresheet) {
                  throw new Error("Scoresheet not found.");
                }
                const returnedSharedGame = await db.query.sharedGame.findFirst({
                  where: {
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    gameId: returnedScoresheet.gameId,
                  },
                });
                if (returnedSharedGame) {
                  await db.insert(sharedScoresheet).values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    scoresheetId: cShareRequest.itemId,
                    permission: cShareRequest.permission,
                    sharedGameId: returnedSharedGame.id,
                  });
                }
              }
              if (cShareRequest.itemType === "match") {
                const returnedMatch = await db.query.match.findFirst({
                  where: {
                    id: cShareRequest.itemId,
                    userId: returnedUserShareRequest.ownerId,
                  },
                });
                if (!returnedMatch) {
                  throw new Error("Match not found.");
                }
                const returnedSharedGame = await db.query.sharedGame.findFirst({
                  where: {
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    gameId: returnedMatch.gameId,
                  },
                });
                if (returnedSharedGame) {
                  const existingMatch = await db.query.match.findFirst({
                    where: {
                      id: cShareRequest.itemId,
                      userId: returnedUserShareRequest.ownerId,
                    },
                  });
                  if (!existingMatch) {
                    throw new Error("Match not found.");
                  }
                  const existingSharedMatch =
                    await db.query.sharedMatch.findFirst({
                      where: {
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        matchId: cShareRequest.itemId,
                      },
                    });
                  if (!existingSharedMatch) {
                    let sharedLocationForMatch: z.infer<
                      typeof selectSharedLocationSchema
                    > | null = null;
                    if (existingMatch.locationId !== null) {
                      const existingSharedLocation =
                        await db.query.sharedLocation.findFirst({
                          where: {
                            ownerId: returnedUserShareRequest.ownerId,
                            sharedWithId: returnedUserShareRequest.sharedWithId,
                            locationId: existingMatch.locationId,
                          },
                        });
                      if (existingSharedLocation) {
                        sharedLocationForMatch = existingSharedLocation;
                      }
                    }
                    const [returnedSharedMatch] = await db
                      .insert(sharedMatch)
                      .values({
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        matchId: cShareRequest.itemId,
                        sharedGameId: returnedSharedGame.id,
                        sharedLocationId: sharedLocationForMatch?.id ?? null,
                        permission: cShareRequest.permission,
                      })
                      .returning();
                    if (!returnedSharedMatch) {
                      throw new Error("Shared Match not created successfully");
                    }

                    const returnedMatchPlayers =
                      await db.query.matchPlayer.findMany({
                        where: {
                          matchId: cShareRequest.itemId,
                        },
                      });
                    const sharedMatchPlayersToInsert: z.infer<
                      typeof insertSharedMatchPlayerSchema
                    >[] = await Promise.all(
                      returnedMatchPlayers.map(async (returnedMatchPlayer) => {
                        const existingSharedPlayer =
                          await db.query.sharedPlayer.findFirst({
                            where: {
                              ownerId: returnedUserShareRequest.ownerId,
                              sharedWithId:
                                returnedUserShareRequest.sharedWithId ?? 0,
                              playerId: returnedMatchPlayer.playerId,
                            },
                          });
                        if (existingSharedPlayer) {
                          return {
                            matchPlayerId: returnedMatchPlayer.id,
                            sharedPlayerId: existingSharedPlayer.id,
                            ownerId: returnedUserShareRequest.ownerId,
                            sharedWithId:
                              returnedUserShareRequest.sharedWithId ?? 0,
                            sharedMatchId: returnedSharedMatch.id,
                            permission: cShareRequest.permission,
                          };
                        }
                        return {
                          matchPlayerId: returnedMatchPlayer.id,
                          ownerId: returnedUserShareRequest.ownerId,
                          sharedWithId:
                            returnedUserShareRequest.sharedWithId ?? 0,
                          sharedMatchId: returnedSharedMatch.id,
                          permission: cShareRequest.permission,
                        };
                      }),
                    );
                    await db
                      .insert(sharedMatchPlayer)
                      .values(sharedMatchPlayersToInsert);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  exit();
}
await seed();
