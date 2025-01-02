import { and, eq, getTableName, sql, Table } from "drizzle-orm";
import { z } from "zod";

import { db as DrizzleDb } from "~/server/db";

import {
  game,
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundPlayerSchema,
  insertScoreSheetSchema,
  location,
  match,
  matchPlayer,
  player,
  roundPlayer,
  scoresheet,
} from "../schema";
import round, { insertRoundSchema } from "../schema/round";
import games from "./data/games.json";

async function resetTable(db: typeof DrizzleDb, table: Table) {
  return db.execute(
    sql.raw(`TRUNCATE TABLE ${getTableName(table)} RESTART IDENTITY CASCADE`),
  );
}
for (const table of [
  game,
  scoresheet,
  round,
  player,
  roundPlayer,
  match,
  matchPlayer,
  location,
]) {
  // await db.delete(table); // clear tables without truncating / resetting ids
  await resetTable(DrizzleDb, table);
}

export default async function seed(db: typeof DrizzleDb) {
  const createdByID = 1;
  for (const seedGame of games) {
    const returningGame = (
      await db
        .insert(game)
        .values({
          name: seedGame.name,
          description: seedGame.description,
          ownedBy: false,
          yearPublished: seedGame.yearPublished,
          rules: seedGame.rules,
          playersMin: seedGame.minPlayers,
          playersMax: seedGame.maxPlayers,
          playtimeMin: seedGame.minPlayTime,
          playtimeMax: seedGame.maxPlayTime,
          userId: createdByID,
        })
        .returning()
    )[0];
    const winConditionOptions = insertScoreSheetSchema
      .required()
      .pick({ winCondition: true }).shape.winCondition.options;
    if (!returningGame?.id) {
      throw new Error("Failed to create game");
    }
    let winCondition: (typeof winConditionOptions)[number] = "Highest Score";
    if (seedGame.scoresheet.manualWinner) {
      winCondition = "Manual";
    } else if (seedGame.scoresheet.winnerScoreType > 0) {
      winCondition = "Highest Score";
    } else if (seedGame.scoresheet.winnerScoreType < 0) {
      winCondition = "Lowest Score";
    }
    const returnedScoresheet = (
      await db
        .insert(scoresheet)
        .values({
          name: "Default",
          userId: createdByID,
          gameId: returningGame.id,
          type: "Default",
          winCondition: winCondition,
        })
        .returning()
    )[0];
    if (!returnedScoresheet?.id) {
      throw new Error("Failed to create scoresheet");
    }
    const rounds: z.infer<typeof insertRoundSchema>[] = seedGame.rounds.map(
      (round) => {
        return {
          name: round.name,
          order: round.position,
          type: "Numeric",
          scoresheetId: returnedScoresheet.id,
        };
      },
    );
    await db.insert(round).values(rounds);
    for (const play of seedGame.plays) {
      const currentLocations = await db.query.location.findMany();
      const currentLocation =
        "name" in play.location && play.location.name
          ? play.location
          : undefined;
      let locationId = currentLocations.find(
        (location) => location.name === currentLocation?.name,
      )?.id;
      if (!locationId && currentLocation?.name) {
        const newLocation = (
          await db
            .insert(location)
            .values({ createdBy: createdByID, name: currentLocation.name })
            .returning()
        )[0];
        locationId = newLocation?.id;
      }
      const scoresheetId = (
        await db
          .insert(scoresheet)
          .values({
            name: returnedScoresheet.name,
            gameId: returnedScoresheet.gameId,
            userId: createdByID,
            isCoop: returnedScoresheet.isCoop,
            winCondition: returnedScoresheet.winCondition,
            targetScore: returnedScoresheet.targetScore,
            roundsScore: returnedScoresheet.roundsScore,
            type: "Match",
          })
          .returning()
      )?.[0]?.id;
      if (!scoresheetId) {
        throw new Error("Failed to create scoresheet");
      }
      const rounds: z.infer<typeof insertRoundSchema>[] = play.scoresheet.rows
        .filter((row) => row.type === 0)
        .map((round, index) => ({
          name: round.gameRound.name ?? "",
          order: round.gameRound.position ?? index,
          type: "Numeric",
          scoresheetId: scoresheetId,
        }));
      const insertedRounds = await db.insert(round).values(rounds).returning();
      const matchToInsert: z.infer<typeof insertMatchSchema> = {
        userId: createdByID,
        scoresheetId: scoresheetId,
        gameId: returningGame.id,
        name: play.name,
        date: new Date(play.dateString),
        duration: Math.round(play.duration / 1000),
        finished: play.isFinished,
        locationId: locationId,
      };
      const returningMatch = (
        await db.insert(match).values(matchToInsert).returning()
      )?.[0];
      if (!returningMatch) {
        throw new Error("Failed to create match");
      }
      const playersToInsert: z.infer<typeof insertPlayerSchema>[] =
        play.participants.map((player) => ({
          name: player.name,
          createdBy: createdByID,
        }));

      // Fetch current players for the user
      let currentPlayers = await db
        .select({ id: player.id, name: player.name })
        .from(player)
        .where(eq(player.createdBy, createdByID));

      // Filter out existing players
      const newPlayers = playersToInsert.filter(
        (player) =>
          !currentPlayers.some(
            (existingPlayer) => existingPlayer.name === player.name,
          ),
      );

      // Insert new players only if there are any
      if (newPlayers.length > 0) {
        const insertedPlayers = await db
          .insert(player)
          .values(newPlayers)
          .returning();
        currentPlayers = currentPlayers.concat(insertedPlayers); // Update currentPlayers with newly inserted ones
      }

      const matchPlayersToInsert: z.infer<typeof insertMatchPlayerSchema>[] =
        play.participants.map((player) => {
          const foundPlayer = currentPlayers.find(
            (p) => p.name === player.name,
          );
          if (!foundPlayer) {
            throw new Error(
              `Error player ${player.name} not Found Game:${seedGame.name} Play:${play.name}`,
            );
          }
          return {
            matchId: returningMatch.id,
            playerId: foundPlayer.id,
            score: player.score,
            winner: player.isWinner,
            order: player.order,
          };
        });
      await db.insert(matchPlayer).values(matchPlayersToInsert);
      const matchPlayers = await db
        .select()
        .from(matchPlayer)
        .where(eq(matchPlayer.matchId, returningMatch.id))
        .leftJoin(
          player,
          and(
            eq(matchPlayer.playerId, player.id),
            eq(player.createdBy, createdByID),
          ),
        );
      const roundPlayersToInsert: z.infer<typeof insertRoundPlayerSchema>[] =
        insertedRounds.flatMap((round) => {
          const cells = play.scoresheet.rows
            .filter((row) => row.type === 0)
            .find((row) => row.gameRound.position === round.order)?.cells;
          if (!cells) {
            return [];
          }
          return cells.map((cell) => {
            const foundPlayer = matchPlayers.find(
              (matchPlayer) => matchPlayer.player?.name === cell.name,
            );
            if (!foundPlayer) {
              throw new Error(
                `Error player ${player.name} not Found Game:${seedGame.name} Play:${play.name} `,
              );
            }
            return {
              roundId: round.id,
              matchPlayerId: foundPlayer.match_player.id,
              score: Number(cell.value),
            };
          });
        });
      await db.insert(roundPlayer).values(roundPlayersToInsert);
    }
  }
}
await seed(DrizzleDb);
