import type { TransactionType } from "@board-games/db/client";
import { isSameRole } from "@board-games/shared";

import type { CreateMatchArgs } from "./match.service.types";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { teamRepository } from "../../repositories/match/team.repository";
import { playerRepository } from "../../routers/player/repository/player.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import { matchRolesService } from "./match-roles.service";

class MatchParticipantsService {
  public async createTeamsPlayersAndRounds(args: {
    input: CreateMatchArgs["input"];
    matchId: number;
    gameId: number;
    userId: string;
    tx: TransactionType;
    scoresheetRoundIds: number[];
  }) {
    const { input, matchId, gameId, userId, tx, scoresheetRoundIds } = args;

    const mappedTeams = await Promise.all(
      input.teams.map(async (inputTeam) => {
        const createdTeam = await teamRepository.createTeam({
          input: {
            name: inputTeam.name,
            matchId,
          },
          tx,
        });

        assertInserted(
          createdTeam,
          { userId, value: input },
          "Team not created.",
        );

        return {
          originalId: inputTeam.id,
          createdId: createdTeam.id,
          roles: inputTeam.roles,
        };
      }),
    );

    const mappedMatchPlayers = await Promise.all(
      input.players.map(async (p) => {
        const team = mappedTeams.find((t) => t.originalId === p.teamId);
        const teamRoles = team?.roles ?? [];

        const rolesToAdd = teamRoles.filter(
          (role) => !p.roles.find((r) => isSameRole(r, role)),
        );

        if (p.type === "original") {
          const returnedMatchPlayer = await matchPlayerRepository.insert({
            input: {
              matchId,
              playerId: p.id,
              teamId: team ? team.createdId : null,
            },
            tx,
          });

          assertInserted(
            returnedMatchPlayer,
            { userId, value: input },
            "Match player not created.",
          );

          return {
            matchPlayerId: returnedMatchPlayer.id,
            playerId: p.id,
            teamId: team ? team.createdId : null,
            roles: [...p.roles, ...rolesToAdd],
          };
        }

        // shared player branch
        const foundSharedPlayer = await playerRepository.getSharedPlayer(
          {
            sharedWithId: userId,
            id: p.sharedId,
            with: {
              player: true,
            },
          },
          tx,
        );

        assertFound(
          foundSharedPlayer,
          { userId, value: input },
          "Shared player not found. For Create Match.",
        );

        let localPlayerId: number;

        if (foundSharedPlayer.linkedPlayerId !== null) {
          const linkedPlayer = await playerRepository.getPlayer(
            {
              id: foundSharedPlayer.linkedPlayerId,
              createdBy: userId,
            },
            tx,
          );

          assertFound(
            linkedPlayer,
            { userId, value: input },
            "Linked player not found. For Create Match.",
          );

          localPlayerId = linkedPlayer.id;
        } else {
          const insertedPlayer = await playerRepository.insert({
            input: {
              createdBy: userId,
              name: foundSharedPlayer.player.name,
            },
            tx,
          });

          assertInserted(
            insertedPlayer,
            { userId, value: input },
            "Player not created.",
          );

          const linkedPlayer = await playerRepository.linkSharedPlayer({
            input: {
              sharedPlayerId: foundSharedPlayer.id,
              linkedPlayerId: insertedPlayer.id,
            },
            tx,
          });

          assertInserted(
            linkedPlayer,
            { userId, value: input },
            "Linked player not created.",
          );

          localPlayerId = insertedPlayer.id;
        }

        const returnedMatchPlayer = await matchPlayerRepository.insert({
          input: {
            matchId,
            playerId: localPlayerId,
            teamId: team ? team.createdId : null,
          },
          tx,
        });

        assertInserted(
          returnedMatchPlayer,
          { userId, value: input },
          "Match player not created.",
        );

        return {
          matchPlayerId: returnedMatchPlayer.id,
          playerId: localPlayerId,
          teamId: team ? team.createdId : null,
          roles: [...p.roles, ...rolesToAdd],
        };
      }),
    );

    await matchRolesService.attachRolesToMatchPlayers({
      input,
      userId,
      tx,
      gameId,
      mappedMatchPlayers,
    });

    const roundPlayersToInsert = scoresheetRoundIds.flatMap((roundId) =>
      mappedMatchPlayers.map((player) => ({
        roundId,
        matchPlayerId: player.matchPlayerId,
      })),
    );

    if (roundPlayersToInsert.length > 0) {
      await matchPlayerRepository.insertRounds({
        input: roundPlayersToInsert,
        tx,
      });
    }

    return { mappedMatchPlayers };
  }
}

export const matchParticipantsService = new MatchParticipantsService();
