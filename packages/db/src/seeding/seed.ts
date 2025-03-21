import { exit } from "process";
import type { Table } from "drizzle-orm";
import type { z } from "zod";
import { faker } from "@faker-js/faker";
import { randomLcg, randomNormal, randomUniform } from "d3";
import { endOfMonth, getDaysInMonth, subMonths } from "date-fns";
import { eq, getTableName, inArray, sql } from "drizzle-orm";

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
  insertTeamSchema,
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
  team,
  user,
} from "@board-games/db/schema";

import type { insertRoundPlayerSchema, insertRoundSchema } from "../schema";
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
const d3Seed = 123;
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
    { length: 10 },
    () => ({
      clerkUserId: faker.person.fullName(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
    }),
  );
  console.log("Inserting users...\n");
  const users = await db.insert(user).values(userData).returning();

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

  const totalGames = 400;
  const maxMatches = 30000; // Control total number of matches across all games

  const normalGames = randomNormal.source(randomLcg(d3Seed))(40, 25);

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
        name: faker.commerce.productName(),
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

  const locationData: z.infer<typeof insertLocationSchema>[] = Array.from(
    { length: 12 },
    () => ({
      name: faker.location.city(),
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

  const playerData: z.infer<typeof insertPlayerSchema>[] = Array.from(
    { length: Math.round(matchCount / 20) },
    () => ({
      name: faker.person.fullName(),
      createdBy: faker.helpers.arrayElement(users).id,
      userId: null,
      imageId: faker.helpers.maybe(
        () => faker.helpers.arrayElement(playerImages).id,
        { probability: 0.75 },
      ),
    }),
  );
  if (playerData[0] && playerData[1]) {
    playerData[0].userId = users[0]?.id;
    playerData[1].userId = users[1]?.id;
  }
  console.log("Inserting players...\n");
  const players = await db.insert(player).values(playerData).returning();

  const groupData: z.infer<typeof insertGroupSchema>[] = Array.from(
    { length: 10 },
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
    const groupPlayers = faker.helpers.arrayElements(players, playerCount);
    const groupPlayersData: z.infer<typeof insertGroupPlayerSchema>[] =
      groupPlayers.map((player) => ({
        groupId: group.id,
        playerId: player.id,
      }));
    await db.insert(groupPlayer).values(groupPlayersData);
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
          date: faker.date.recent({
            days: getDaysInMonth(subbedDate),
            refDate: matchDate,
          }),
          duration: faker.number.int({ min: 30, max: 400 }),
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
      const playerCount = faker.number.int({
        min: minPlayers,
        max: maxPlayers,
      });

      const teamsToInsert: z.infer<typeof insertTeamSchema>[] = Array.from(
        {
          length: faker.number.int({
            min: Math.min(2, Math.ceil(playerCount / 2)),
            max: Math.ceil(playerCount / 2),
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

      const matchPlayers = weightedRandomSample(weightedPlayers, playerCount);
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
      await db.insert(roundPlayers).values(roundPlayerData).returning();

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
    }
  }

  exit();
}
await seed();
