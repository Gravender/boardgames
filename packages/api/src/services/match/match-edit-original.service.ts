import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { calculatePlacement } from "@board-games/shared";

import type { EditMatchInputType } from "../../routers/match/match.input";
import type { OriginalEditMatchOutputType } from "../../routers/match/match.output";
import type { MatchRoleRef } from "./match-edit.helpers";
import type { EditMatchArgs } from "./match.service.types";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { teamRepository } from "../../repositories/match/team.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import {
  computePlayerChanges,
  computeTeamChanges,
  computeTeamRoles,
} from "./match-edit.helpers";
import { matchParticipantsService } from "./match-participants.service";
import { matchRolesService } from "./match-roles.service";
import { matchSetupService } from "./match-setup.service";

interface TeamWithScoring {
  id: number;
  teamId: number;
  placement: number | null;
  winner: boolean;
  score: number | null;
  rounds: { roundId: number; score: number | null }[];
}

class MatchEditOriginalService {
  public async editOriginalMatch(args: {
    input: Extract<EditMatchInputType, { type: "original" }>;
    ctx: EditMatchArgs["ctx"];
  }): Promise<OriginalEditMatchOutputType> {
    const { input, ctx } = args;
    const response = await db.transaction(async (tx) => {
      const returnedMatch = await matchRepository.get(
        {
          id: input.match.id,
          createdBy: ctx.userId,
          with: {
            scoresheet: {
              with: {
                rounds: true,
              },
            },
            matchPlayers: {
              with: {
                playerRounds: true,
                roles: true,
              },
            },
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
        game: {
          id: returnedMatch.gameId,
        },
        date: input.match.date,
        location: undefined,
        players: [],
        updatedScore: false,
      };

      // ── Update match details (name, date, location) ──────────
      if (
        input.match.name !== undefined ||
        input.match.date !== undefined ||
        input.match.location !== undefined
      ) {
        const locationId = await matchSetupService.resolveLocationForMatch({
          locationInput: input.match.location,
          userId: ctx.userId,
          tx,
        });
        const updatedMatch = await matchRepository.updateMatch({
          input: {
            id: returnedMatch.id,
            name: input.match.name,
            date: input.match.date,
            locationId: locationId,
          },
          tx: tx,
        });
        assertInserted(
          updatedMatch,
          { userId: ctx.userId, value: input },
          "Match not updated.",
        );
        outputMatch.date = input.match.date;
        outputMatch.game = { id: returnedMatch.gameId };
        outputMatch.location = locationId ? { id: locationId } : undefined;
      }

      // ── Compute diffs ────────────────────────────────────────
      const mappedTeams = computeTeamRoles(
        returnedMatch.teams,
        returnedMatch.matchPlayers,
      );
      const { playersToAdd, playersToRemove, updatedPlayers } =
        computePlayerChanges(
          input.players,
          returnedMatch.matchPlayers,
          input.teams,
        );
      const { addedTeams, editedTeams, deletedTeams } = computeTeamChanges(
        input.teams,
        mappedTeams,
      );

      // ── Apply team edits ─────────────────────────────────────
      if (editedTeams.length > 0) {
        for (const editedTeam of editedTeams) {
          await teamRepository.updateTeam({
            input: {
              id: editedTeam.id,
              name: editedTeam.name,
            },
            tx,
          });
        }
      }

      const mappedAddedTeams = (
        await matchParticipantsService.createMappedTeams({
          input: {
            teams: addedTeams,
          },
          matchId: input.match.id,
          userId: args.ctx.userId,
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

      const originalTeams = returnedMatch.teams.map((team) => {
        const teamPlayer = returnedMatch.matchPlayers.find(
          (mp) => mp.teamId === team.id,
        );
        return {
          id: team.id,
          teamId: team.id,
          placement: teamPlayer?.placement ?? null,
          winner: teamPlayer?.winner ?? false,
          score: teamPlayer?.score ?? null,
          rounds: teamPlayer?.playerRounds ?? [],
        };
      });

      // ── Add new players ──────────────────────────────────────
      const combinedTeams = [...originalTeams, ...mappedAddedTeams];
      if (playersToAdd.length > 0) {
        await this.addPlayers({
          playersToAdd,
          combinedTeams,
          returnedMatch,
          userId: args.ctx.userId,
          tx,
        });
      }

      // ── Remove players ───────────────────────────────────────
      if (playersToRemove.length > 0) {
        await this.removePlayers({
          playersToRemove,
          matchId: returnedMatch.id,
          tx,
        });
      }

      // ── Update existing players (team/role changes) ──────────
      if (updatedPlayers.length > 0) {
        await this.updatePlayers({
          updatedPlayers,
          returnedMatch,
          mappedAddedTeams,
          userId: ctx.userId,
          tx,
        });
      }

      // ── Delete teams ─────────────────────────────────────────
      if (deletedTeams.length > 0) {
        await teamRepository.deleteTeams({
          input: {
            matchId: returnedMatch.id,
            teamIds: deletedTeams.map((t) => t.id),
          },
          tx,
        });
      }

      // ── Recalculate placements if finished match changed ─────
      if (
        returnedMatch.finished &&
        (playersToAdd.length > 0 ||
          playersToRemove.length > 0 ||
          updatedPlayers.length > 0)
      ) {
        if (returnedMatch.scoresheet.winCondition !== "Manual") {
          const newMatchPlayers = await matchPlayerRepository.getMany(
            {
              matchId: returnedMatch.id,
              with: {
                rounds: true,
              },
            },
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
          input: {
            matchId: returnedMatch.id,
          },
          tx,
        });
        outputMatch.updatedScore = true;
        outputMatch.players = [];
      }
      return outputMatch;
    });
    return response;
  }

  // ── Private helpers for editOriginalMatch ─────────────────────

  private async addPlayers(args: {
    playersToAdd: ReturnType<typeof computePlayerChanges>["playersToAdd"];
    combinedTeams: TeamWithScoring[];
    returnedMatch: {
      id: number;
      gameId: number;
      scoresheet: { rounds: { id: number }[] };
    };
    userId: string;
    tx: TransactionType;
  }) {
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

    if (playersToInsert.length === 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Edit Match No Match Players to Insert after Mapping players to add.",
      });
    }

    // Validate that all playerIds in playersToInsert are unique to prevent
    // mismapping when returnedMatchPlayers are matched back via find().
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

    const returnedMatchPlayers = await matchPlayerRepository.insertMatchPlayers(
      {
        input: playersToInsert.map((p) => p.processedPlayer),
        tx,
      },
    );

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
  }

  private async removePlayers(args: {
    playersToRemove: { matchPlayerId: number }[];
    matchId: number;
    tx: TransactionType;
  }) {
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
  }

  private async updatePlayers(args: {
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
  }) {
    const { updatedPlayers, returnedMatch, mappedAddedTeams, userId, tx } =
      args;

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
  }
}

export const matchEditOriginalService = new MatchEditOriginalService();
