import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { calculatePlacement } from "@board-games/shared";

import type { EditMatchInputType } from "../../routers/match/match.input";
import type { OriginalEditMatchOutputType } from "../../routers/match/match.output";
import type { TeamWithScoring } from "./match-edit.helpers";
import type { EditMatchArgs } from "./match.service.types";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { teamRepository } from "../../repositories/match/team.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import {
  addPlayersToMatch,
  removePlayersFromMatch,
  updateMatchPlayers,
} from "./match-edit-original-players";
import {
  buildOriginalTeams,
  computePlayerChanges,
  computeTeamChanges,
  computeTeamRoles,
} from "./match-edit.helpers";
import { matchParticipantsService } from "./match-participants.service";
import { matchSetupService } from "./match-setup.service";

type OriginalEditInput = Extract<EditMatchInputType, { type: "original" }>;

class MatchEditOriginalService {
  // ── Main entry point ───────────────────────────────────────────

  public async editOriginalMatch(args: {
    input: OriginalEditInput;
    ctx: EditMatchArgs["ctx"];
  }): Promise<OriginalEditMatchOutputType> {
    const { input, ctx } = args;
    const response = await db.transaction(async (tx) => {
      const returnedMatch = await matchRepository.get(
        {
          id: input.match.id,
          createdBy: ctx.userId,
          with: {
            scoresheet: { with: { rounds: true } },
            matchPlayers: { with: { playerRounds: true, roles: true } },
            teams: true,
          },
        },
        tx,
      );
      assertFound(
        returnedMatch,
        { userId: ctx.userId, value: input },
        "Match not found.",
      );

      const outputMatch: OriginalEditMatchOutputType = {
        type: "original",
        matchId: input.match.id,
        game: { id: returnedMatch.gameId },
        date: input.match.date,
        location: undefined,
        players: [],
        updatedScore: false,
      };

      await this.updateMatchDetails({
        input,
        returnedMatch,
        userId: ctx.userId,
        outputMatch,
        tx,
      });

      const { playersToAdd, playersToRemove, updatedPlayers } =
        computePlayerChanges(
          input.players,
          returnedMatch.matchPlayers,
          input.teams,
        );

      const { combinedTeams, mappedAddedTeams, deletedTeamIds } =
        await this.applyTeamEditsAndBuildCombined({
          input,
          returnedMatch,
          userId: ctx.userId,
          tx,
        });

      if (playersToAdd.length > 0) {
        await addPlayersToMatch({
          playersToAdd,
          combinedTeams,
          returnedMatch,
          userId: ctx.userId,
          tx,
        });
      }
      if (playersToRemove.length > 0) {
        await removePlayersFromMatch({
          playersToRemove,
          matchId: returnedMatch.id,
          tx,
        });
      }
      if (updatedPlayers.length > 0) {
        await updateMatchPlayers({
          updatedPlayers,
          returnedMatch,
          mappedAddedTeams,
          userId: ctx.userId,
          tx,
        });
      }

      if (deletedTeamIds.length > 0) {
        await teamRepository.deleteTeams({
          input: {
            matchId: returnedMatch.id,
            teamIds: deletedTeamIds,
          },
          tx,
        });
      }

      await this.recalculatePlacements({
        returnedMatch,
        hasPlayerChanges:
          playersToAdd.length > 0 ||
          playersToRemove.length > 0 ||
          updatedPlayers.length > 0,
        outputMatch,
        tx,
      });

      return outputMatch;
    });
    return response;
  }

  // ── Update match details (name, date, location) ────────────────

  private async updateMatchDetails(args: {
    input: OriginalEditInput;
    returnedMatch: { id: number; gameId: number };
    userId: string;
    outputMatch: OriginalEditMatchOutputType;
    tx: TransactionType;
  }) {
    const { input, returnedMatch, userId, outputMatch, tx } = args;

    if (
      input.match.name === undefined &&
      input.match.date === undefined &&
      input.match.location === undefined
    ) {
      return;
    }

    const locationId = await matchSetupService.resolveLocationForMatch({
      locationInput: input.match.location,
      userId,
      tx,
    });
    const updatedMatch = await matchRepository.updateMatch({
      input: {
        id: returnedMatch.id,
        name: input.match.name,
        date: input.match.date,
        locationId,
      },
      tx,
    });
    assertInserted(
      updatedMatch,
      { userId, value: input },
      "Match not updated.",
    );
    outputMatch.date = input.match.date;
    outputMatch.game = { id: returnedMatch.gameId };
    outputMatch.location = locationId ? { id: locationId } : undefined;
  }

  // ── Apply team edits, create new teams, build combined list ────

  private async applyTeamEditsAndBuildCombined(args: {
    input: OriginalEditInput;
    returnedMatch: {
      teams: { id: number; name: string }[];
      matchPlayers: {
        teamId: number | null;
        placement: number | null;
        score: number | null;
        winner: boolean | null;
        playerRounds: { roundId: number; score: number | null }[];
        roles: { id: number }[];
      }[];
    };
    userId: string;
    tx: TransactionType;
  }): Promise<{
    combinedTeams: TeamWithScoring[];
    mappedAddedTeams: { id: number; teamId: number }[];
    deletedTeamIds: number[];
  }> {
    const { input, returnedMatch, userId, tx } = args;

    const mappedTeams = computeTeamRoles(
      returnedMatch.teams,
      returnedMatch.matchPlayers,
    );
    const { addedTeams, editedTeams, deletedTeams } = computeTeamChanges(
      input.teams,
      mappedTeams,
    );

    for (const editedTeam of editedTeams) {
      await teamRepository.updateTeam({
        input: { id: editedTeam.id, name: editedTeam.name },
        tx,
      });
    }

    const mappedAddedTeams = (
      await matchParticipantsService.createMappedTeams({
        input: { teams: addedTeams },
        matchId: input.match.id,
        userId,
        tx,
      })
    ).map((t) => ({
      id: t.originalId,
      teamId: t.createdId,
      placement: null,
      winner: false as const,
      score: null,
      rounds: [] as { roundId: number; score: number | null }[],
    }));

    const originalTeams = buildOriginalTeams(
      returnedMatch.teams,
      returnedMatch.matchPlayers,
    );

    return {
      combinedTeams: [...originalTeams, ...mappedAddedTeams],
      mappedAddedTeams,
      deletedTeamIds: deletedTeams.map((t) => t.id),
    };
  }

  // ── Recalculate placements if finished match changed ───────────

  private async recalculatePlacements(args: {
    returnedMatch: {
      id: number;
      finished: boolean;
      scoresheet: {
        winCondition:
          | "Highest Score"
          | "Lowest Score"
          | "Manual"
          | "No Winner"
          | "Target Score";
        roundsScore: "Aggregate" | "Best Of" | "Manual" | "None";
        targetScore: number | null;
        rounds: { id: number }[];
      };
    };
    hasPlayerChanges: boolean;
    outputMatch: OriginalEditMatchOutputType;
    tx: TransactionType;
  }) {
    const { returnedMatch, hasPlayerChanges, outputMatch, tx } = args;

    if (!returnedMatch.finished || !hasPlayerChanges) {
      return;
    }

    if (returnedMatch.scoresheet.winCondition !== "Manual") {
      const newMatchPlayers = await matchPlayerRepository.getMany(
        { matchId: returnedMatch.id, with: { rounds: true } },
        tx,
      );
      const finalPlacements = calculatePlacement(
        newMatchPlayers,
        returnedMatch.scoresheet,
      );
      for (const mp of finalPlacements) {
        await matchPlayerRepository.updateMatchPlayerPlacementAndScore({
          input: {
            id: mp.id,
            placement: mp.placement,
            score: mp.score,
            winner: mp.placement === 1,
          },
          tx,
        });
      }
    }

    await matchRepository.unfinishedMatch({
      input: { matchId: returnedMatch.id },
      tx,
    });
    outputMatch.updatedScore = true;
    outputMatch.players = [];
  }
}

export const matchEditOriginalService = new MatchEditOriginalService();
