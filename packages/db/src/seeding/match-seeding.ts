import type { z } from "zod/v4";
import { faker } from "@faker-js/faker";
import { randomLcg, randomLogNormal, randomNormal, randomUniform } from "d3";
import { endOfMonth, getDaysInMonth, subMonths } from "date-fns";
import { eq, inArray, sql } from "drizzle-orm";

import type {
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertRoundPlayerSchema,
  insertTeamSchema,
} from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import {
  match,
  matchPlayer,
  round,
  roundPlayer,
  scoresheet,
  team,
} from "@board-games/db/schema";

import { resetTable } from "./seed";

export async function seedMatches(d3Seed: number) {
  faker.seed(d3Seed);
  await resetTable(match);
  await resetTable(matchPlayer);
  await resetTable(roundPlayer);
  await resetTable(team);
  const games = await db.query.game.findMany({
    with: {
      scoresheets: {
        where: {
          type: {
            OR: ["Game", "Default"],
          },
        },
        with: {
          rounds: true,
        },
      },
    },
  });
  const locations = await db.query.location.findMany();
  const players = await db.query.player.findMany();
  const normalMatches = randomLogNormal.source(randomLcg(d3Seed))(2, 0.5);
  console.log("Inserting matches...\n");
  const dateNormal = randomUniform.source(randomLcg(d3Seed))(0, 24);
  const today = new Date();
  const matchData: z.infer<typeof insertMatchSchema>[] = [];
  for (const game of games) {
    const matchCount = Math.max(3, Math.round(normalMatches() + 5));
    const userLocations = locations.filter((l) => l.createdBy === game.userId);

    for (let i = 0; i < matchCount; i++) {
      const matchName = faker.helpers.weightedArrayElement([
        {
          weight: 0.2,
          value: faker.book.title(),
        },
        {
          weight: 0.8,
          value: `${game.name} Match ${i + 1}`,
        },
      ]);
      const returnedScoresheet = faker.helpers.arrayElement(game.scoresheets);
      const [newScoreSheet] = await db
        .insert(scoresheet)
        .values({
          parentId: returnedScoresheet.id,
          name: `${matchName} Scoresheet`,
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
      const roundsToInert = returnedScoresheet.rounds.map((round) => ({
        parentId: round.id,
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
      const finished = faker.datatype.boolean(0.85);
      let monthsAgo = Math.round(Math.abs(dateNormal())); // Ensure positive months
      monthsAgo = Math.min(monthsAgo, 2); // Cap at 2 months

      // Calculate the final date
      const subbedDate = subMonths(today, monthsAgo);
      const matchDate = endOfMonth(subbedDate);
      matchData.push({
        name: matchName,
        userId: game.userId,
        gameId: game.id,
        scoresheetId: newScoreSheet.id,
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
      });
    }
  }
  await db.insert(match).values(matchData);
  const returnedMatches = await db.query.match.findMany({
    with: {
      game: true,
      scoresheet: {
        with: {
          rounds: true,
        },
      },
    },
  });
  const playerAppearances = new Map<number, number>();

  // Setup a samples from a log-normal distribution where most players appear in a few matches, and some appear in many.
  const playerNormal = randomNormal.source(randomLcg(d3Seed))(
    Math.max(Math.min(5, returnedMatches.length), returnedMatches.length / 10),
    Math.max(
      Math.min(15, returnedMatches.length / 4),
      returnedMatches.length / 8,
    ),
  );

  for (const player of players) {
    let appearances = Math.round(Math.abs(playerNormal())); // Ensure positive values

    appearances = Math.max(
      1,
      Math.min(appearances, returnedMatches.length / 3),
    );

    playerAppearances.set(player.id, appearances);
  }
  for (const returnedMatch of returnedMatches) {
    const userPlayers = players.filter(
      (p) => p.createdBy === returnedMatch.userId,
    );
    if (userPlayers.length < 2) continue;
    const minPlayers = returnedMatch.game.playersMin ?? 2;
    const maxPlayers = returnedMatch.game.playersMax ?? 8;
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
    const returnedTeams = faker.datatype.boolean(0.3)
      ? await db.insert(team).values(teamsToInsert).returning()
      : undefined;
    const weightedPlayers = userPlayers.map((player) => ({
      weight: player.isUser
        ? Math.max(
            (playerAppearances.get(player.id) ?? 1) / returnedMatches.length,
            0.75,
          )
        : (playerAppearances.get(player.id) ?? 1) / returnedMatches.length,
      value: player.id,
    }));
    const weightedMatchPlayers = weightedRandomSample(
      weightedPlayers,
      Math.min(weightedPlayers.length, playerCount),
    );
    const matchPlayerData: z.infer<typeof insertMatchPlayerSchema>[] =
      weightedMatchPlayers.map((player, index) => ({
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
    const matchPlayersResult = await db
      .insert(matchPlayer)
      .values(matchPlayerData)
      .returning();
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
      returnedMatch.scoresheet.roundsScore === "Aggregate" ||
      returnedMatch.scoresheet.roundsScore === "Best Of"
        ? faker.number.int({ min: 10, max: 30 })
        : 5;
    const minScore =
      returnedMatch.scoresheet.winCondition === "Lowest Score"
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
              return returnedMatch.scoresheet.rounds.map((round) => ({
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
        returnedMatch.scoresheet.rounds.forEach((round) => {
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
      if (returnedMatch.scoresheet.roundsScore === "Aggregate") {
        return sql<number>`SUM(${roundPlayer.score})`.as("finalScore");
      }
      if (returnedMatch.scoresheet.roundsScore === "Best Of") {
        if (returnedMatch.scoresheet.winCondition === "Highest Score") {
          return sql<number>`MAX(${roundPlayer.score})`.as("finalScore");
        }
        if (returnedMatch.scoresheet.winCondition === "Lowest Score") {
          return sql<number>`MIN(${roundPlayer.score})`.as("finalScore");
        }
        if (returnedMatch.scoresheet.winCondition === "Target Score") {
          return sql<number>`SUM(
                    CASE WHEN ${roundPlayer.score} = ${returnedMatch.scoresheet.targetScore} 
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
      if (returnedMatch.scoresheet.winCondition === "Highest Score") {
        const highestScore = Math.max(
          ...returnedRoundPlayersGroupByMatchPLayer.map((p) =>
            Number(p.finalScore),
          ),
        );
        return parsedScore === highestScore;
      }
      if (returnedMatch.scoresheet.winCondition === "Lowest Score") {
        const lowestScore = Math.min(
          ...returnedRoundPlayersGroupByMatchPLayer.map((p) =>
            Number(p.finalScore),
          ),
        );
        return parsedScore === lowestScore;
      }
      if (returnedMatch.scoresheet.winCondition === "Target Score") {
        return parsedScore === returnedMatch.scoresheet.targetScore;
      }
      if (returnedMatch.scoresheet.winCondition === "Manual") {
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
      if (returnedMatch.scoresheet.winCondition === "Highest Score") {
        return b.score - a.score;
      }
      if (returnedMatch.scoresheet.winCondition === "Lowest Score") {
        return a.score - b.score;
      }
      if (returnedMatch.scoresheet.winCondition === "Target Score") {
        if (a.score === b.score) {
          return 0;
        }
        if (a.score === returnedMatch.scoresheet.targetScore) return -1;
        if (b.score === returnedMatch.scoresheet.targetScore) return 1;
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
      if (returnedMatch.scoresheet.winCondition === "Manual") {
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
