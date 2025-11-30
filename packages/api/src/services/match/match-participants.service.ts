import type { PostHog } from "posthog-node";
import { TRPCError } from "@trpc/server";

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
    posthog: PostHog;
    matchId: number;
    gameId: number;
    userId: string;
    tx: TransactionType;
    scoresheetRoundIds: number[];
  }) {
    const { input, matchId, gameId, userId, tx, scoresheetRoundIds, posthog } =
      args;

    let part = 0;
    try {
      const mappedTeams =
        input.teams.length > 0
          ? await this.createMappedTeams({
              input: {
                teams: input.teams,
              },
              matchId,
              userId,
              tx,
            })
          : [];
      part++;

      const mappedMatchPlayers = await Promise.all(
        input.players.map(async (p) => {
          let matchPlayerPart = 0;
          try {
            const team = mappedTeams.find((t) => t.originalId === p.teamId);
            const teamRoles = team?.roles ?? [];

            const rolesToAdd = teamRoles.filter(
              (role) => !p.roles.find((r) => isSameRole(r, role)),
            );

            const processedPlayerId = await this.processPlayer({
              playerToProcess: p,
              userId,
              tx,
            });
            matchPlayerPart++;

            const returnedMatchPlayer = await matchPlayerRepository.insert({
              input: {
                matchId,
                playerId: processedPlayerId,
                teamId: team ? team.createdId : null,
              },
              tx,
            });
            matchPlayerPart++;

            assertInserted(
              returnedMatchPlayer,
              { userId, value: input },
              "Match player not created.",
            );
            matchPlayerPart++;

            return {
              matchPlayerId: returnedMatchPlayer.id,
              playerId: processedPlayerId,
              teamId: team ? team.createdId : null,
              roles: [...p.roles, ...rolesToAdd],
            };
          } catch (e) {
            await posthog.captureImmediate({
              distinctId: userId,
              event: "matchPlayer.create failure",
              properties: {
                matchId,
                gameId,
                errorName: e instanceof Error ? e.name : typeof e,
                errorMessage: e instanceof Error ? e.message : String(e),
              },
            });
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                "Match Player Insert Failure" +
                " Part: " +
                matchPlayerPart +
                " Input: " +
                (p.type === "original" ? p.id : p.sharedId) +
                (e instanceof Error ? ` – ${e.name}: ${e.message}` : ""),
              cause: {
                error: e,
                part,
                input: input,
              },
            });
          }
        }),
      );
      part++;

      await matchRolesService.attachRolesToMatchPlayers({
        userId,
        tx,
        gameId,
        mappedMatchPlayers,
      });
      part++;

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
      part++;

      return { mappedMatchPlayers };
    } catch (e) {
      await posthog.captureImmediate({
        distinctId: userId,
        event: "matchPlayer.create failure",
        properties: {
          matchId,
          gameId,
          error: e,
        },
      });
      if (e instanceof TRPCError) {
        throw e;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Match Player Insert Failure" + " Part: " + part,
        cause: {
          error: e,
          part,
          input: input,
        },
      });
    }
  }

  public async processPlayer(args: {
    playerToProcess:
      | {
          id: number;
          type: "original";
        }
      | {
          sharedId: number;
          type: "shared";
        };
    userId: string;
    tx: TransactionType;
  }) {
    const { playerToProcess, userId, tx } = args;
    if (playerToProcess.type === "original") {
      return playerToProcess.id;
    }
    const foundSharedPlayer = await playerRepository.getSharedPlayer(
      {
        sharedWithId: userId,
        id: playerToProcess.sharedId,
        with: {
          player: true,
        },
      },
      tx,
    );
    assertFound(
      foundSharedPlayer,
      { userId, value: playerToProcess },
      "Shared player not found. For Create Match.",
    );
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
        { userId, value: playerToProcess },
        "Linked player not found. For Create Match.",
      );

      return linkedPlayer.id;
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
        { userId, value: playerToProcess },
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
        { userId, value: playerToProcess },
        "Linked player not created.",
      );

      return insertedPlayer.id;
    }
  }

  public async createMappedTeams(args: {
    input: {
      teams: {
        id: number;
        name: string;
        roles: (
          | {
              id: number;
              type: "original";
            }
          | {
              sharedId: number;
              type: "shared";
            }
        )[];
      }[];
    };
    matchId: number;
    userId: string;
    tx: TransactionType;
  }) {
    const { input, matchId, userId, tx } = args;

    return Promise.all(
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
  }
}

export const matchParticipantsService = new MatchParticipantsService();
