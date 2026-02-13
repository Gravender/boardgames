import type { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import type {
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundPlayerSchema,
} from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import {
  game,
  location,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  team,
} from "@board-games/db/schema";

import type { ImportBGGGamesOutputType } from "../../routers/game/game.output";
import type { ImportBGGGamesArgs } from "./game.service.types";

class GameImportService {
  public async importBGGGames(
    args: ImportBGGGamesArgs,
  ): Promise<ImportBGGGamesOutputType> {
    const { input, ctx } = args;

    const currentGames = await db.query.game.findMany({
      where: {
        createdBy: ctx.userId,
        deletedAt: {
          isNull: true,
        },
      },
    });
    if (currentGames.length > 0) {
      return null;
    }

    const mappedGames = input.games.map((g) => ({
      name: g.name,
      minPlayers: g.minPlayerCount,
      maxPlayers: g.maxPlayerCount,
      playingTime: g.maxPlayTime,
      minPlayTime: g.minPlayTime,
      maxPlayTime: g.maxPlayTime,
      yearPublished: g.bggYear,
      age: g.minAge,
      noPoints: g.noPoints,
      isCoop: g.cooperative,
      description: "",
      plays: input.plays
        .filter((play) => play.gameRefId === g.id)
        .map((play) => ({
          name: g.name,
          participants: play.playerScores.map((playerScore) => {
            const foundPlayer = input.players.find(
              (p) => p.id === playerScore.playerRefId,
            );
            return {
              name: foundPlayer?.name,
              order: playerScore.seatOrder,
              score:
                playerScore.score !== "" && !g.noPoints
                  ? Number(playerScore.score)
                  : undefined,
              finishPlace: playerScore.rank,
              isWinner: playerScore.winner,
              team: playerScore.team,
              isNew: playerScore.newPlayer,
            };
          }),
          dateLong: new Date(play.playDate).getTime(),
          dateString: play.playDate,
          duration: play.durationMin,
          isFinished: true,
          comment: play.comments,
          locationRefId: play.locationRefId,
          usesTeams: play.usesTeams,
        })),
    }));

    const createdLocations: {
      bggLocationId: number;
      name: string;
      trackerId: number;
    }[] = [];
    for (const locationToInsert of input.locations) {
      const [insertedLocation] = await db
        .insert(location)
        .values({
          name: locationToInsert.name,
          createdBy: ctx.userId,
        })
        .returning();
      if (!insertedLocation) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create location",
        });
      }
      createdLocations.push({
        bggLocationId: locationToInsert.id,
        name: insertedLocation.name,
        trackerId: insertedLocation.id,
      });
    }

    for (const mappedGame of mappedGames) {
      const [returningGame] = await db
        .insert(game)
        .values({
          name: mappedGame.name,
          description: mappedGame.description,
          ownedBy: false,
          yearPublished: mappedGame.yearPublished,
          playersMin: mappedGame.minPlayers,
          playersMax: mappedGame.maxPlayers,
          playtimeMin: mappedGame.minPlayTime,
          playtimeMax: mappedGame.maxPlayTime,
          createdBy: ctx.userId,
        })
        .returning();
      if (!returningGame) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create game",
        });
      }

      let winCondition: (typeof scoreSheetWinConditions)[number] =
        "Highest Score";
      if (mappedGame.noPoints) {
        winCondition = "Manual";
      }
      const [returnedScoresheet] = await db
        .insert(scoresheet)
        .values({
          name: "Default",
          createdBy: ctx.userId,
          gameId: returningGame.id,
          isCoop: mappedGame.isCoop,
          type: "Default",
          winCondition: winCondition,
        })
        .returning();
      if (!returnedScoresheet) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create scoresheet",
        });
      }
      await db.insert(round).values({
        name: "Round 1",
        order: 1,
        type: "Numeric",
        scoresheetId: returnedScoresheet.id,
      });

      for (const [index, play] of mappedGame.plays.entries()) {
        await this.importPlay({
          play,
          index,
          mappedGame,
          returnedScoresheet,
          returningGame,
          createdLocations,
          userId: ctx.userId,
        });
      }
    }

    return null;
  }

  private async importPlay(args: {
    play: {
      name: string;
      participants: {
        name: string | undefined;
        order: number;
        score: number | undefined;
        finishPlace: number;
        isWinner: boolean;
        team: string | undefined;
        isNew: boolean;
      }[];
      dateString: string;
      duration: number;
      isFinished: boolean;
      comment: string | undefined;
      locationRefId: number;
      usesTeams: boolean;
    };
    index: number;
    mappedGame: { name: string; isCoop: boolean };
    returnedScoresheet: {
      id: number;
      name: string;
      gameId: number;
      isCoop: boolean;
      winCondition: (typeof scoreSheetWinConditions)[number];
      targetScore: number | null;
      roundsScore: (typeof scoreSheetRoundsScore)[number];
    };
    returningGame: { id: number };
    createdLocations: {
      bggLocationId: number;
      name: string;
      trackerId: number;
    }[];
    userId: string;
  }) {
    const {
      play,
      index,
      mappedGame,
      returnedScoresheet,
      returningGame,
      createdLocations,
      userId,
    } = args;

    const currentLocation = createdLocations.find(
      (loc) => loc.bggLocationId === play.locationRefId,
    );
    const playScoresheetValues = {
      name: returnedScoresheet.name,
      gameId: returnedScoresheet.gameId,
      createdBy: userId,
      isCoop: returnedScoresheet.isCoop,
      winCondition: returnedScoresheet.winCondition,
      targetScore: returnedScoresheet.targetScore ?? undefined,
      roundsScore: returnedScoresheet.roundsScore,
      type: "Match" as const,
    };
    const [playScoresheet] = await db
      .insert(scoresheet)
      .values(playScoresheetValues)
      .returning();
    if (!playScoresheet) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create scoresheet",
      });
    }
    const [insertedRound] = await db
      .insert(round)
      .values({
        name: "Round 1",
        order: 1,
        type: "Numeric",
        scoresheetId: playScoresheet.id,
      })
      .returning();
    if (!insertedRound) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create round",
      });
    }
    if (playScoresheet.type !== "Match") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Match must use a scoresheet with type Match. Invalid scoresheet type.",
      });
    }
    const matchToInsert: z.infer<typeof insertMatchSchema> = {
      createdBy: userId,
      scoresheetId: playScoresheet.id,
      gameId: returningGame.id,
      name: `${mappedGame.name} #${index + 1}`,
      date: new Date(play.dateString),
      finished: play.isFinished,
      locationId: currentLocation?.trackerId,
    };
    const [returningMatch] = await db
      .insert(match)
      .values(matchToInsert)
      .returning();
    if (!returningMatch) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create match",
      });
    }
    await db
      .update(scoresheet)
      .set({ forkedForMatchId: returningMatch.id })
      .where(eq(scoresheet.id, playScoresheet.id));

    const playersToInsert: z.infer<typeof insertPlayerSchema>[] =
      play.participants.map((p) => ({
        name: p.name ?? "Unknown",
        createdBy: userId,
      }));

    let currentPlayers = await db
      .select({ id: player.id, name: player.name })
      .from(player)
      .where(eq(player.createdBy, userId));

    const newPlayers = playersToInsert.filter(
      (p) =>
        !currentPlayers.some(
          (existingPlayer) => existingPlayer.name === p.name,
        ),
    );

    if (newPlayers.length > 0) {
      const insertedPlayers = await db
        .insert(player)
        .values(newPlayers)
        .returning();
      currentPlayers = currentPlayers.concat(insertedPlayers);
    }

    const createdTeams: { id: number; name: string }[] = [];
    if (play.usesTeams) {
      const teams = new Set(
        play.participants.map((p) => p.team).filter((t) => t !== undefined),
      );
      for (const playTeam of teams.values()) {
        if (playTeam) {
          const [insertedTeam] = await db
            .insert(team)
            .values({
              name: playTeam,
              matchId: returningMatch.id,
            })
            .returning();
          if (!insertedTeam) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create team",
            });
          }
          createdTeams.push({
            id: insertedTeam.id,
            name: insertedTeam.name,
          });
        }
      }
    }

    const calculatePlacement = (playerName: string) => {
      const sortedParticipants = [...play.participants];
      sortedParticipants.sort((a, b) => {
        if (a.score !== undefined && b.score !== undefined) {
          return b.score - a.score;
        }
        return a.order - b.order;
      });
      let placement = 1;
      let prevScore = -1;
      for (const [playerIndex, sortPlayer] of sortedParticipants.entries()) {
        if (playerIndex > 0 && prevScore !== sortPlayer.score) {
          placement = playerIndex + 1;
        }
        prevScore = sortPlayer.score ?? 0;
        if (sortPlayer.name === playerName) {
          return placement;
        }
      }
      return 0;
    };

    const matchPlayersToInsert: z.infer<typeof insertMatchPlayerSchema>[] =
      play.participants.map((p) => {
        const foundPlayer = currentPlayers.find((cp) => cp.name === p.name);
        if (!foundPlayer) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Error player ${p.name} not Found Game:${mappedGame.name} Play:${play.name}`,
          });
        }
        if (
          play.participants.every((pp) => pp.finishPlace === p.finishPlace) &&
          !play.participants.every((pp) => pp.isWinner === p.isWinner) &&
          !mappedGame.isCoop
        ) {
          return {
            matchId: returningMatch.id,
            playerId: foundPlayer.id,
            score: p.score,
            winner: p.isWinner,
            order: p.order,
            placement: playScoresheet.isCoop
              ? null
              : calculatePlacement(p.name ?? ""),
            teamId: createdTeams.find((t) => t.name === p.team)?.id ?? null,
          };
        }
        return {
          matchId: returningMatch.id,
          playerId: foundPlayer.id,
          score: p.score,
          winner: p.isWinner,
          order: p.order,
          placement: p.finishPlace,
          teamId: createdTeams.find((t) => t.name === p.team)?.id ?? null,
        };
      });

    const insertedMatchPlayers = await db
      .insert(matchPlayer)
      .values(matchPlayersToInsert)
      .returning();

    const roundPlayersToInsert: z.infer<typeof insertRoundPlayerSchema>[] =
      insertedMatchPlayers.map((mp) => ({
        roundId: insertedRound.id,
        matchPlayerId: mp.id,
        score: Number(mp.score),
        updatedBy: userId,
      }));
    await db.insert(roundPlayer).values(roundPlayersToInsert);
  }
}

export const gameImportService = new GameImportService();
