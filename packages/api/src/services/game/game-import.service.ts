import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import type {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import { db } from "@board-games/db/client";
import { calculatePlacement } from "@board-games/shared";

import type { ImportBGGGamesOutputType } from "../../routers/game/game.output";
import type { ImportBGGGamesArgs } from "./game.service.types";
import { gameRepository } from "../../repositories/game/game.repository";
import { locationRepository } from "../../repositories/location/location.repository";
import { matchUpdateStateRepository } from "../../repositories/match/match-update-state.repository";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { teamRepository } from "../../repositories/match/team.repository";
import { playerRepository } from "../../repositories/player/player.repository";
import { roundRepository } from "../../repositories/scoresheet/round.repository";
import { scoresheetRepository } from "../../repositories/scoresheet/scoresheet.repository";
import { assertInserted } from "../../utils/databaseHelpers";

interface MappedParticipant {
  name: string;
  order: number;
  score: number | undefined;
  finishPlace: number;
  isWinner: boolean;
  team: string | undefined;
  isNew: boolean;
}

interface MappedPlay {
  name: string;
  participants: MappedParticipant[];
  dateString: string;
  duration: number;
  isFinished: boolean;
  comment: string | undefined;
  locationRefId: number;
  usesTeams: boolean;
}

interface MappedGame {
  name: string;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime: number;
  maxPlayTime: number;
  yearPublished: number;
  noPoints: boolean;
  isCoop: boolean;
  description: string;
  plays: MappedPlay[];
}

interface CreatedLocation {
  bggLocationId: number;
  name: string;
  trackerId: number;
}

interface DefaultScoresheetInfo {
  id: number;
  name: string;
  isCoop: boolean;
  winCondition: (typeof scoreSheetWinConditions)[number];
  targetScore: number | null;
  roundsScore: (typeof scoreSheetRoundsScore)[number];
  templateVersion: number | null;
  scoresheetKey: string | null;
}

interface DefaultRoundInfo {
  id: number;
  name: string;
  type: "Numeric" | "Checkbox";
  order: number;
  scoresheetId: number;
  color: string | null;
  score: number | null;
  winCondition: number | null;
  toggleScore: number | null;
  modifier: number | null;
  lookup: number | null;
  roundKey: string | null;
  templateRoundId: number | null;
  kind:
    | "numeric"
    | "rank"
    | "checkbox"
    | "timer"
    | "resources"
    | "victoryPoints"
    | null;
  config: unknown;
}

class GameImportService {
  public async importBGGGames(
    args: ImportBGGGamesArgs,
  ): Promise<ImportBGGGamesOutputType> {
    const { input, ctx } = args;
    const userId = ctx.userId;

    const mappedGames = this.mapBGGData(input);

    await db.transaction(async (tx) => {
      const hasGames = await gameRepository.hasGamesByUser(userId, tx);
      if (hasGames) {
        return;
      }

      const createdLocations = await this.createLocations(
        input.locations,
        userId,
        tx,
      );

      for (const mappedGame of mappedGames) {
        await this.importGame(mappedGame, createdLocations, userId, tx);
      }
    });

    return null;
  }

  private mapBGGData(input: ImportBGGGamesArgs["input"]): MappedGame[] {
    return input.games.map((g) => ({
      name: g.name,
      minPlayers: g.minPlayerCount,
      maxPlayers: g.maxPlayerCount,
      minPlayTime: g.minPlayTime,
      maxPlayTime: g.maxPlayTime,
      yearPublished: g.bggYear,
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
              name: foundPlayer?.name ?? "Unknown",
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
          dateString: play.playDate,
          duration: play.durationMin,
          isFinished: true,
          comment: play.comments,
          locationRefId: play.locationRefId,
          usesTeams: play.usesTeams,
        })),
    }));
  }

  private async createLocations(
    locations: ImportBGGGamesArgs["input"]["locations"],
    userId: string,
    tx: TransactionType,
  ): Promise<CreatedLocation[]> {
    const createdLocations: CreatedLocation[] = [];
    for (const loc of locations) {
      const insertedLocation = await locationRepository.insert(
        { name: loc.name, createdBy: userId },
        tx,
      );
      assertInserted(
        insertedLocation,
        { userId, value: { locationName: loc.name } },
        "Failed to create location",
      );
      createdLocations.push({
        bggLocationId: loc.id,
        name: insertedLocation.name,
        trackerId: insertedLocation.id,
      });
    }
    return createdLocations;
  }

  private async importGame(
    mappedGame: MappedGame,
    createdLocations: CreatedLocation[],
    userId: string,
    tx: TransactionType,
  ) {
    // Create game via gameRepository (same pattern as gameService.createGame)
    const insertedGame = await gameRepository.createGame({
      input: {
        name: mappedGame.name,
        description: mappedGame.description,
        ownedBy: false,
        yearPublished: mappedGame.yearPublished,
        playersMin: mappedGame.minPlayers,
        playersMax: mappedGame.maxPlayers,
        playtimeMin: mappedGame.minPlayTime,
        playtimeMax: mappedGame.maxPlayTime,
        imageId: null,
      },
      userId,
      tx,
    });
    assertInserted(
      insertedGame,
      { userId, value: { gameName: mappedGame.name } },
      "Failed to create game",
    );

    // Create default scoresheet (same pattern as gameService.createGame with no scoresheets)
    const winCondition: (typeof scoreSheetWinConditions)[number] =
      mappedGame.noPoints ? "Manual" : "Highest Score";
    const defaultScoresheet = await scoresheetRepository.insert(
      {
        name: "Default",
        type: "Default",
        createdBy: userId,
        gameId: insertedGame.id,
        isCoop: mappedGame.isCoop,
        winCondition,
      },
      tx,
    );
    assertInserted(
      defaultScoresheet,
      { userId, value: { gameId: insertedGame.id } },
      "Failed to create default scoresheet",
    );

    // Create default round
    const defaultRound = await roundRepository.insertRound(
      {
        name: "Round 1",
        type: "Numeric",
        order: 1,
        scoresheetId: defaultScoresheet.id,
      },
      tx,
    );
    assertInserted(
      defaultRound,
      { userId, value: { scoresheetId: defaultScoresheet.id } },
      "Failed to create default round",
    );

    // Import each play as a match
    for (const [index, play] of mappedGame.plays.entries()) {
      await this.importPlay({
        play,
        index,
        gameName: mappedGame.name,
        gameId: insertedGame.id,
        defaultScoresheet,
        defaultRound,
        createdLocations,
        userId,
        tx,
      });
    }
  }

  private async importPlay(args: {
    play: MappedPlay;
    index: number;
    gameName: string;
    gameId: number;
    defaultScoresheet: DefaultScoresheetInfo;
    defaultRound: DefaultRoundInfo;
    createdLocations: CreatedLocation[];
    userId: string;
    tx: TransactionType;
  }) {
    const {
      play,
      index,
      gameName,
      gameId,
      defaultScoresheet,
      defaultRound,
      createdLocations,
      userId,
      tx,
    } = args;

    // 1. Fork scoresheet for match (same pattern as matchSetupService.resolveOriginalScoresheet)
    const matchScoresheet = await scoresheetRepository.insert(
      {
        name: defaultScoresheet.name,
        isCoop: defaultScoresheet.isCoop,
        winCondition: defaultScoresheet.winCondition,
        targetScore: defaultScoresheet.targetScore ?? undefined,
        roundsScore: defaultScoresheet.roundsScore,
        parentId: defaultScoresheet.id,
        forkedFromScoresheetId: defaultScoresheet.id,
        forkedFromTemplateVersion: defaultScoresheet.templateVersion,
        scoresheetKey: defaultScoresheet.scoresheetKey ?? undefined,
        createdBy: userId,
        gameId,
        type: "Match",
      },
      tx,
    );
    assertInserted(
      matchScoresheet,
      { userId, value: { gameId } },
      "Failed to create match scoresheet",
    );

    // 2. Copy rounds from default with provenance (same as matchSetupService.insertRoundsFromTemplate)
    const matchRounds = await this.insertRoundsFromTemplate(
      [defaultRound],
      matchScoresheet.id,
      tx,
    );
    const matchRound = matchRounds[0];
    if (!matchRound) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create match round",
      });
    }

    // 3. Create match (same pattern as matchService.createMatch)
    const currentLocation = createdLocations.find(
      (loc) => loc.bggLocationId === play.locationRefId,
    );
    const parsedDate = Date.parse(play.dateString);
    const matchDate =
      !play.dateString || isNaN(parsedDate) ? new Date() : new Date(parsedDate);

    const insertedMatch = await matchRepository.insert(
      {
        name: gameName + " #" + String(index + 1),
        date: matchDate,
        gameId,
        locationId: currentLocation?.trackerId,
        createdBy: userId,
        scoresheetId: matchScoresheet.id,
        running: false,
      },
      tx,
    );
    assertInserted(
      insertedMatch,
      { userId, value: { gameName, index } },
      "Failed to create match",
    );

    // 4. Set match as finished and link scoresheet to match
    await matchUpdateStateRepository.updateMatchFinished({
      input: { id: insertedMatch.id, finished: true },
      tx,
    });
    await scoresheetRepository.update({
      input: { id: matchScoresheet.id, forkedForMatchId: insertedMatch.id },
      tx,
    });

    // 5. Create/dedup players
    let currentPlayers = await playerRepository.getPlayersByCreatedBy({
      createdBy: userId,
      tx,
    });
    const uniqueParticipantNames = [
      ...new Set(play.participants.map((p) => p.name)),
    ];
    for (const name of uniqueParticipantNames) {
      if (!currentPlayers.some((p) => p.name === name)) {
        const newPlayer = await playerRepository.insert({
          input: { createdBy: userId, name },
          tx,
        });
        assertInserted(
          newPlayer,
          { userId, value: { playerName: name } },
          "Failed to create player",
        );
        currentPlayers = [...currentPlayers, newPlayer];
      }
    }

    // 6. Create teams
    const createdTeams: { id: number; name: string }[] = [];
    if (play.usesTeams) {
      const teamNames = new Set(
        play.participants
          .map((p) => p.team)
          .filter((t): t is string => t !== undefined),
      );
      for (const teamName of teamNames) {
        const insertedTeam = await teamRepository.createTeam({
          input: { name: teamName, matchId: insertedMatch.id },
          tx,
        });
        assertInserted(
          insertedTeam,
          { userId, value: { teamName, matchId: insertedMatch.id } },
          "Failed to create team",
        );
        createdTeams.push({ id: insertedTeam.id, name: insertedTeam.name });
      }
    }

    // 7. Create match players without score/placement/winner (same as matchParticipantsService)
    const participantData = play.participants.map((p) => {
      const foundPlayer = currentPlayers.find((cp) => cp.name === p.name);
      if (!foundPlayer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Player " + p.name + " not found for game " + gameName,
        });
      }
      return {
        playerId: foundPlayer.id,
        teamId: createdTeams.find((t) => t.name === p.team)?.id ?? null,
        score: p.score,
        isWinner: p.isWinner,
      };
    });
    const matchPlayersInput = participantData.map((pd) => ({
      matchId: insertedMatch.id,
      playerId: pd.playerId,
      teamId: pd.teamId,
    }));
    const insertedMatchPlayers = await matchPlayerRepository.insertMatchPlayers(
      {
        input: matchPlayersInput,
        tx,
      },
    );
    assertInserted(
      insertedMatchPlayers.at(0),
      { userId, value: { matchId: insertedMatch.id } },
      "Failed to create match players",
    );

    // 8. Create round players without score (same as matchParticipantsService)
    const roundPlayersInput = insertedMatchPlayers.map((mp) => ({
      roundId: matchRound.id,
      matchPlayerId: mp.id,
      updatedBy: userId,
    }));
    const insertedRoundPlayers = await matchPlayerRepository.insertRounds({
      input: roundPlayersInput,
      tx,
    });

    // 9. Update round player scores
    for (const insertedRoundPlayer of insertedRoundPlayers) {
      const participantIdx = insertedMatchPlayers.findIndex(
        (mp) => mp.id === insertedRoundPlayer.matchPlayerId,
      );
      const score = participantData[participantIdx]?.score;
      if (score !== undefined) {
        await matchPlayerRepository.updateRoundPlayer({
          input: {
            id: insertedRoundPlayer.id,
            score,
            updatedBy: userId,
          },
          tx,
        });
      }
    }

    // 10. Calculate placement and update match players
    await this.updateMatchPlayerResults({
      insertedMatchPlayers,
      participantData,
      scoresheet: defaultScoresheet,
      tx,
    });
  }

  /**
   * Calculate placement and update match player score/placement/winner.
   * For Manual/Coop: uses BGG isWinner flag, no calculated placement.
   * For scored games: uses calculatePlacement from @board-games/shared
   * (same pattern as matchUpdateScoreService.updateMatchFinalScores).
   */
  private async updateMatchPlayerResults(args: {
    insertedMatchPlayers: { id: number; teamId: number | null }[];
    participantData: {
      score: number | undefined;
      isWinner: boolean;
    }[];
    scoresheet: {
      winCondition: (typeof scoreSheetWinConditions)[number];
      roundsScore: (typeof scoreSheetRoundsScore)[number];
      targetScore: number | null;
      isCoop: boolean;
    };
    tx: TransactionType;
  }) {
    const { insertedMatchPlayers, participantData, scoresheet, tx } = args;

    if (scoresheet.winCondition === "Manual" || scoresheet.isCoop) {
      // Manual/Coop: use BGG isWinner flag, no calculated placement
      for (const [idx, mp] of insertedMatchPlayers.entries()) {
        const data = participantData[idx];
        if (!data) continue;
        await matchPlayerRepository.updateMatchPlayerPlacementAndScore({
          input: {
            id: mp.id,
            placement: null,
            score: data.score ?? null,
            winner: data.isWinner,
          },
          tx,
        });
      }
    } else {
      // Scored games: use calculatePlacement from @board-games/shared
      if (
        scoresheet.winCondition === "Target Score" &&
        scoresheet.targetScore == null
      ) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Cannot calculate placement: winCondition is 'Target Score' but targetScore is not set.",
        });
      }
      const playersForCalc = insertedMatchPlayers.map((mp, idx) => ({
        id: mp.id,
        rounds: [{ score: participantData[idx]?.score ?? null }],
        teamId: mp.teamId,
      }));
      const placements = calculatePlacement(playersForCalc, {
        roundsScore: scoresheet.roundsScore,
        winCondition: scoresheet.winCondition,
        targetScore: scoresheet.targetScore,
      });
      for (const placement of placements) {
        await matchPlayerRepository.updateMatchPlayerPlacementAndScore({
          input: {
            id: placement.id,
            placement: placement.placement,
            score: placement.score,
            winner: placement.placement === 1,
          },
          tx,
        });
      }
    }
  }

  /**
   * Copies rounds from a template scoresheet to a new scoresheet, preserving provenance.
   * Same pattern as matchSetupService.insertRoundsFromTemplate.
   */
  private async insertRoundsFromTemplate(
    rounds: DefaultRoundInfo[],
    scoresheetId: number,
    tx: TransactionType,
  ) {
    const mappedRounds = rounds.map((sourceRound) => ({
      name: sourceRound.name,
      type: sourceRound.type,
      color: sourceRound.color ?? undefined,
      score: sourceRound.score ?? undefined,
      winCondition: sourceRound.winCondition ?? undefined,
      toggleScore: sourceRound.toggleScore ?? undefined,
      modifier: sourceRound.modifier ?? undefined,
      lookup: sourceRound.lookup ?? undefined,
      order: sourceRound.order,
      // provenance
      parentId: sourceRound.id,
      // root template anchor (follow chain to original, or this is the root)
      templateRoundId: sourceRound.templateRoundId ?? sourceRound.id,
      // stable identity across forks
      roundKey: sourceRound.roundKey ?? undefined,
      kind: sourceRound.kind ?? undefined,
      config: sourceRound.config,
      scoresheetId,
    }));
    if (mappedRounds.length === 0) return [];
    return roundRepository.insertRounds(mappedRounds, tx);
  }
}

export const gameImportService = new GameImportService();
