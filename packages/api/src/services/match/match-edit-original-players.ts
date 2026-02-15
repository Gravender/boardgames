import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";

import type {
  computePlayerChanges,
  MatchRoleRef,
  TeamWithScoring,
} from "./match-edit.helpers";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { matchParticipantsService } from "./match-participants.service";
import { matchRolesService } from "./match-roles.service";

// ── Add new players to a match ───────────────────────────────────

export const addPlayersToMatch = async (args: {
  playersToAdd: ReturnType<typeof computePlayerChanges>["playersToAdd"];
  combinedTeams: TeamWithScoring[];
  returnedMatch: {
    id: number;
    gameId: number;
    scoresheet: { rounds: { id: number }[] };
  };
  userId: string;
  tx: TransactionType;
}) => {
  const { playersToAdd, combinedTeams, returnedMatch, userId, tx } = args;

  const playersToInsert: {
    processedPlayer: {
      matchId: number;
      playerId: number;
      teamId: number | null;
      score: number | null;
      placement: number | null;
      winner: boolean | null;
    };
    roles: MatchRoleRef[];
  }[] = [];

  for (const p of playersToAdd) {
    const foundTeam = combinedTeams.find((t) => t.id === p.teamId);
    if (!foundTeam && p.teamId !== null) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team not found.",
      });
    }
    const processedPlayerId = await matchParticipantsService.processPlayer({
      playerToProcess: p,
      userId,
      tx,
    });
    playersToInsert.push({
      processedPlayer: {
        matchId: returnedMatch.id,
        playerId: processedPlayerId,
        teamId: foundTeam?.teamId ?? null,
        score: foundTeam?.score ?? null,
        placement: foundTeam?.placement ?? null,
        winner: foundTeam?.winner ?? null,
      },
      roles: p.roles,
    });
  }

  // Validate that all playerIds are unique to prevent mismapping
  // when returnedMatchPlayers are matched back via find().
  const seenPlayerIds = new Set<number>();
  for (const p of playersToInsert) {
    if (seenPlayerIds.has(p.processedPlayer.playerId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Edit Match: duplicate playerId ${p.processedPlayer.playerId} in players to add. Each player must appear at most once.`,
      });
    }
    seenPlayerIds.add(p.processedPlayer.playerId);
  }

  const returnedMatchPlayers = await matchPlayerRepository.insertMatchPlayers({
    input: playersToInsert.map((p) => p.processedPlayer),
    tx,
  });

  const remainingPlayersToInsert = [...playersToInsert];
  const mappedMatchPlayers = returnedMatchPlayers.map((mp) => {
    const foundIndex = remainingPlayersToInsert.findIndex(
      (p) => p.processedPlayer.playerId === mp.playerId,
    );
    if (foundIndex === -1) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Edit Match Match players not created after mapping players to add.",
      });
    }
    const foundPlayer = remainingPlayersToInsert[foundIndex];
    if (!foundPlayer) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Edit Match: foundPlayer not found for matchPlayerId ${mp.id}. remainingPlayersToInsert contained a playerId that does not exist in playersToInsert (ids: [${remainingPlayersToInsert.map((p) => p.processedPlayer.playerId).join(", ")}]).`,
      });
    }
    remainingPlayersToInsert.splice(foundIndex, 1);
    return {
      matchPlayerId: mp.id,
      playerId: mp.playerId,
      teamId: mp.teamId,
      roles: foundPlayer.roles,
    };
  });

  await matchRolesService.attachRolesToMatchPlayers({
    userId,
    tx,
    gameId: returnedMatch.gameId,
    mappedMatchPlayers,
  });

  const roundPlayersToInsert = returnedMatch.scoresheet.rounds.flatMap(
    (round) =>
      mappedMatchPlayers.map((player) => {
        const teamPlayer = combinedTeams.find(
          (t) => t.teamId === player.teamId,
        );
        return {
          roundId: round.id,
          matchPlayerId: player.matchPlayerId,
          score:
            teamPlayer?.rounds.find((pRound) => pRound.roundId === round.id)
              ?.score ?? null,
          updatedBy: userId,
        };
      }),
  );

  if (roundPlayersToInsert.length > 0) {
    await matchPlayerRepository.insertRounds({
      input: roundPlayersToInsert,
      tx,
    });
  }
};

// ── Remove players from a match ──────────────────────────────────

export const removePlayersFromMatch = async (args: {
  playersToRemove: { matchPlayerId: number }[];
  matchId: number;
  tx: TransactionType;
}) => {
  const { playersToRemove, matchId, tx } = args;

  await matchPlayerRepository.deleteMatchPlayersRolesByMatchPlayerId({
    input: {
      matchPlayerIds: playersToRemove.map((p) => p.matchPlayerId),
    },
    tx,
  });
  const deletedMatchPlayers = await matchPlayerRepository.deleteMatchPlayers({
    input: {
      matchId,
      matchPlayerIds: playersToRemove.map((p) => p.matchPlayerId),
    },
    tx,
  });
  if (deletedMatchPlayers.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Edit Match Match players not deleted after mapping players to remove.",
    });
  }
};

// ── Update existing players (team/role changes) ──────────────────

export const updateMatchPlayers = async (args: {
  updatedPlayers: {
    matchPlayerId: number;
    teamId: number | null;
    rolesToAdd: MatchRoleRef[];
    rolesToRemove: { id: number }[];
  }[];
  returnedMatch: {
    gameId: number;
    teams: { id: number }[];
    matchPlayers: { id: number; playerId: number; teamId: number | null }[];
  };
  mappedAddedTeams: { id: number; teamId: number }[];
  userId: string;
  tx: TransactionType;
}) => {
  const { updatedPlayers, returnedMatch, mappedAddedTeams, userId, tx } = args;

  const mappedMatchPlayers: {
    matchPlayerId: number;
    playerId: number;
    teamId: number | null;
    roles: MatchRoleRef[];
  }[] = [];

  for (const updatedPlayer of updatedPlayers) {
    let teamId: number | null = null;
    const originalPlayer = returnedMatch.matchPlayers.find(
      (mp) => mp.id === updatedPlayer.matchPlayerId,
    );
    if (!originalPlayer) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Edit Match: originalPlayer not found for matchPlayerId ${updatedPlayer.matchPlayerId}. updatedPlayers from computePlayerChanges contained a matchPlayerId that does not exist in returnedMatch.matchPlayers (ids: [${returnedMatch.matchPlayers.map((mp) => mp.id).join(", ")}]).`,
      });
    }

    if (originalPlayer.teamId !== updatedPlayer.teamId) {
      if (updatedPlayer.teamId !== null) {
        const foundTeam = returnedMatch.teams.find(
          (t) => t.id === updatedPlayer.teamId,
        );
        if (foundTeam) {
          teamId = foundTeam.id;
        } else {
          const foundInsertedTeam = mappedAddedTeams.find(
            (t) => t.id === updatedPlayer.teamId,
          );
          if (foundInsertedTeam) {
            teamId = foundInsertedTeam.teamId;
          } else {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Team not found.",
            });
          }
        }
      }
      await matchPlayerRepository.updateMatchPlayerTeam({
        input: {
          id: updatedPlayer.matchPlayerId,
          teamId,
        },
        tx,
      });
    }

    // Add new roles
    if (updatedPlayer.rolesToAdd.length > 0) {
      mappedMatchPlayers.push({
        matchPlayerId: originalPlayer.id,
        playerId: originalPlayer.playerId,
        teamId: originalPlayer.teamId,
        roles: updatedPlayer.rolesToAdd,
      });
    }

    // Remove old roles
    if (updatedPlayer.rolesToRemove.length > 0) {
      await matchPlayerRepository.deleteMatchPlayerRoles({
        input: {
          matchPlayerId: originalPlayer.id,
          roleIds: updatedPlayer.rolesToRemove.map((r) => r.id),
        },
        tx,
      });
    }
  }

  await matchRolesService.attachRolesToMatchPlayers({
    userId,
    tx,
    gameId: returnedMatch.gameId,
    mappedMatchPlayers,
  });
};
