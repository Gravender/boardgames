import type { PostHog } from "posthog-node";
import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { matchPlayerRepository } from "@board-games/api/repositories/match/matchPlayer.repository";
import { teamRepository } from "@board-games/api/repositories/match/team.repository";
import { playerRepository } from "@board-games/api/routers/player/repository/player.repository";
import {
  assertFound,
  assertInserted,
} from "@board-games/api/utils/databaseHelpers";
import { isSameRole } from "@board-games/shared";

import type { CreateMatchArgs } from "./match.service.types";
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

      const mappedMatchPlayers: {
        matchPlayerId: number;
        playerId: number;
        teamId: number | null;
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
      }[] = [];
      for (const p of input.players) {
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

          const returnedMatchPlayer = await matchPlayerRepository.insert({
            input: {
              matchId,
              playerId: processedPlayerId,
              teamId: team ? team.createdId : null,
            },
            tx,
          });

          assertInserted(
            returnedMatchPlayer,
            { userId, value: input },
            "Match player not created.",
          );
          mappedMatchPlayers.push({
            matchPlayerId: returnedMatchPlayer.id,
            playerId: processedPlayerId,
            teamId: team ? team.createdId : null,
            roles: [...p.roles, ...rolesToAdd],
          });
        } catch (e) {
          await posthog.captureImmediate({
            distinctId: userId,
            event: "matchPlayer.create failure",
            properties: {
              matchId,
              gameId,
              errorName: e instanceof Error ? e.name : typeof e,
              errorMessage: e instanceof Error ? e.message : String(e),
              p: p,
            },
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Match Player Insert Failure",
            cause: {
              error: e,
              input: input,
            },
          });
        }
      }

      await matchRolesService.attachRolesToMatchPlayers({
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
    } catch (e) {
      await posthog.captureImmediate({
        distinctId: userId,
        event: "matchPlayers create failure",
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
        message: "Match Player Insert Failure",
        cause: {
          error: e,
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

    const mappedTeams: {
      originalId: number;
      createdId: number;
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
    }[] = [];
    for (const inputTeam of input.teams) {
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

      mappedTeams.push({
        originalId: inputTeam.id,
        createdId: createdTeam.id,
        roles: inputTeam.roles,
      });
    }
    return mappedTeams;
  }
}

export const matchParticipantsService = new MatchParticipantsService();
