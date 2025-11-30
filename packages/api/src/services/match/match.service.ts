import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";
import { calculatePlacement, isSameRole } from "@board-games/shared";

import type { EditMatchInputType } from "../../routers/match/match.input";
import type {
  CreateMatchOutputType,
  EditMatchOutputType,
  GetMatchOutputType,
  GetMatchPlayersAndTeamsOutputType,
  GetMatchScoresheetOutputType,
  GetMatchSummaryOutputType,
  OriginalEditMatchOutputType,
  SharedEditMatchOutputType,
} from "../../routers/match/match.output";
import type {
  CreateMatchArgs,
  DeleteMatchArgs,
  EditMatchArgs,
  GetMatchArgs,
  GetMatchPlayersAndTeamsArgs,
  GetMatchScoresheetArgs,
  MatchPlayersAndTeamsResponse,
} from "./match.service.types";
import { Logger } from "../../common/logger";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { teamRepository } from "../../repositories/match/team.repository";
import { locationRepository } from "../../routers/location/repository/location.repository";
import { scoresheetRepository } from "../../routers/scoresheet/repository/scoresheet.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import { friendService } from "../social/friend.service";
import { matchParticipantsService } from "./match-participants.service";
import { matchRolesService } from "./match-roles.service";
import { matchSetupService } from "./match-setup.service";

class MatchService {
  private readonly logger = new Logger(MatchService.name);

  public async createMatch(
    args: CreateMatchArgs,
  ): Promise<CreateMatchOutputType> {
    const {
      input,
      ctx: { userId, posthog },
    } = args;
    const response = await db.transaction(async (tx) => {
      let part = 0;
      try {
        const gameId = await matchSetupService.resolveGameForMatch({
          gameInput: input.game,
          userId,
          tx,
        });
        // one
        part++;

        const matchScoresheet = await matchSetupService.resolveMatchScoresheet({
          scoresheetInput: input.scoresheet,
          userId,
          gameId,
          tx,
        });
        //two
        part++;

        const locationId = await matchSetupService.resolveLocationForMatch({
          locationInput: input.location,
          userId,
          tx,
        });
        //three
        part++;
        const insertedMatch = await matchRepository.insert(
          {
            name: input.name,
            date: input.date,
            gameId: gameId,
            locationId: locationId,
            createdBy: userId,
            scoresheetId: matchScoresheet.id,
            running: true,
          },
          tx,
        );

        await posthog.captureImmediate({
          distinctId: userId,
          event: "match.insert debug",
          properties: {
            insertedMatchId: insertedMatch?.id,
            table: "boardgames_match?",
          },
        });
        //four
        part++;
        assertInserted(
          insertedMatch,
          {
            userId: args.ctx.userId,
            value: args.input,
          },
          "Match not created.",
        );
        //five
        part++;
        const foundMatch = await matchRepository.get(
          {
            id: insertedMatch.id,
            createdBy: args.ctx.userId,
          },
          tx,
        );
        assertFound(
          foundMatch,
          {
            userId: args.ctx.userId,
            value: args.input,
          },
          "Match not created.",
        );
        //six
        part++;
        const { mappedMatchPlayers } =
          await matchParticipantsService.createTeamsPlayersAndRounds({
            input,
            matchId: foundMatch.id,
            gameId: foundMatch.gameId,
            userId,
            tx,
            scoresheetRoundIds: matchScoresheet.rounds.map((r) => r.id),
            posthog,
          });
        //seven
        part++;
        return {
          match: foundMatch,
          players: mappedMatchPlayers.map((mp) => ({
            matchPlayerId: mp.matchPlayerId,
            playerId: mp.playerId,
          })),
        };
      } catch (e) {
        await posthog.captureImmediate({
          distinctId: args.ctx.userId,
          event: "match.insert failure",
          properties: {
            error: e,
            part,
            input: args.input,
          },
        });
        if (e instanceof TRPCError) {
          throw e;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match Insert Failure" + " Part: " + part,
          cause: {
            error: e,
            part,
            input: args.input,
          },
        });
      }
    });
    try {
      await friendService.autoShareMatch({
        input: {
          matchId: response.match.id,
        },
        ctx: {
          userId: args.ctx.userId,
        },
      });
    } catch (e) {
      await posthog.captureImmediate({
        distinctId: args.ctx.userId,
        event: "friend share failure",
        properties: {
          error: e,
          response: response,
          input: args.input,
        },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Friend Share Failure",
        cause: {
          error: e,
          response: response,
          input: args.input,
        },
      });
    }

    return {
      id: response.match.id,
      date: response.match.date,
      name: response.match.name,
      game: {
        id: response.match.gameId,
      },
      location: response.match.locationId
        ? {
            id: response.match.locationId,
          }
        : null,
      players: response.players.map((mp) => ({
        id: mp.playerId,
      })),
    };
  }
  public async getMatch(args: GetMatchArgs): Promise<GetMatchOutputType> {
    return matchRepository.getMatch({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async getMatchScoresheet(
    args: GetMatchScoresheetArgs,
  ): Promise<GetMatchScoresheetOutputType> {
    return matchRepository.getMatchScoresheet({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async getMatchPlayersAndTeams(
    args: GetMatchPlayersAndTeamsArgs,
  ): Promise<GetMatchPlayersAndTeamsOutputType> {
    const response = await matchRepository.getMatchPlayersAndTeams({
      input: args.input,
      userId: args.ctx.userId,
    });
    if (response.type === "original") {
      return {
        teams: response.teams,
        players: this.mapOriginalPlayers(response),
      };
    }
    return {
      teams: response.teams,
      players: this.mapSharedPlayers(response),
    };
  }
  private mapOriginalPlayers(
    response: Extract<MatchPlayersAndTeamsResponse, { type: "original" }>,
  ) {
    const refinedPlayers = response.players.map((matchPlayer) => {
      return {
        name: matchPlayer.player.name,
        rounds: response.scoresheet.rounds.map((scoresheetRound) => {
          const matchPlayerRound = matchPlayer.playerRounds.find(
            (roundPlayer) => roundPlayer.roundId === scoresheetRound.id,
          );
          if (!matchPlayerRound) {
            const message = `Match Player Round not found with roundId: ${scoresheetRound.id} and matchPlayerId: ${matchPlayer.id}`;
            this.logger.error(message);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: message,
            });
          }
          return matchPlayerRound;
        }),
        score: matchPlayer.score,
        baseMatchPlayerId: matchPlayer.id,
        id: matchPlayer.id,
        type: "original" as const,
        playerType: "original" as const,
        permissions: "edit" as const,
        playerId: matchPlayer.player.id,
        image:
          matchPlayer.player.image?.usageType === "player"
            ? {
                name: matchPlayer.player.image.name,
                url: matchPlayer.player.image.url,
                type: matchPlayer.player.image.type,
                usageType: "player" as const,
              }
            : null,
        details: matchPlayer.details,
        teamId: matchPlayer.teamId,
        isUser: matchPlayer.player.isUser,
        order: matchPlayer.order,
        roles: matchPlayer.roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          type: "original" as const,
        })),
        winner: matchPlayer.winner,
        placement: matchPlayer.placement,
      };
    });
    return this.sortPlayersByOrderThenName(refinedPlayers);
  }
  private mapSharedPlayers(
    response: Extract<MatchPlayersAndTeamsResponse, { type: "shared" }>,
  ) {
    const refinedPlayers = response.players.map((sharedMatchPlayer) => {
      const playerRounds = response.scoresheet.rounds.map((scoresheetRound) => {
        const sharedMatchPlayerRound =
          sharedMatchPlayer.matchPlayer.playerRounds.find(
            (round) => round.roundId === scoresheetRound.id,
          );
        if (!sharedMatchPlayerRound) {
          const message = `Shared Match Player Round not found with roundId: ${scoresheetRound.id} and matchPlayerId: ${sharedMatchPlayer.matchPlayerId}`;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: message,
          });
        }
        return sharedMatchPlayerRound;
      });

      const roles = sharedMatchPlayer.roles.map((role) => {
        const sharedGameRole = role.sharedGameRole;
        const linkedGameRole = sharedGameRole.linkedGameRole;
        if (linkedGameRole === null) {
          return {
            sharedId: sharedGameRole.id,
            name: sharedGameRole.gameRole.name,
            description: sharedGameRole.gameRole.description,
            type: "shared" as const,
            sharedType: "shared" as const,
          };
        }
        return {
          sharedId: sharedGameRole.id,
          name: linkedGameRole.name,
          description: linkedGameRole.description,
          type: "shared" as const,
          sharedType: "linked" as const,
        };
      });

      const matchPlayer = {
        baseMatchPlayerId: sharedMatchPlayer.matchPlayer.id,
        sharedMatchPlayerId: sharedMatchPlayer.id,
        type: "shared" as const,
        permissions: sharedMatchPlayer.permission,
        score: sharedMatchPlayer.matchPlayer.score,
        details: sharedMatchPlayer.matchPlayer.details,
        teamId: sharedMatchPlayer.matchPlayer.teamId,
        order: sharedMatchPlayer.matchPlayer.order,
        rounds: playerRounds,
        roles,
        isUser: false,
        placement: sharedMatchPlayer.matchPlayer.placement,
        winner: sharedMatchPlayer.matchPlayer.winner,
      };
      const sharedPlayer = sharedMatchPlayer.sharedPlayer;
      if (sharedPlayer === null) {
        return {
          ...matchPlayer,
          playerType: "not-shared" as const,
          name: sharedMatchPlayer.matchPlayer.player.name,
          playerId: sharedMatchPlayer.matchPlayer.player.id,
          sharedPlayerId: null,
          linkedPlayerId: null,
          image:
            sharedMatchPlayer.matchPlayer.player.image?.usageType === "player"
              ? {
                  name: sharedMatchPlayer.matchPlayer.player.image.name,
                  url: sharedMatchPlayer.matchPlayer.player.image.url,
                  type: sharedMatchPlayer.matchPlayer.player.image.type,
                  usageType: "player" as const,
                }
              : null,
        };
      }
      const linkedPlayer = sharedPlayer.linkedPlayer;
      if (linkedPlayer === null) {
        return {
          ...matchPlayer,
          playerType: "shared" as const,
          name: sharedPlayer.player.name,
          playerId: sharedPlayer.player.id,
          sharedPlayerId: sharedPlayer.id,
          linkedPlayerId: null,
          image:
            sharedPlayer.player.image?.usageType === "player"
              ? {
                  name: sharedPlayer.player.image.name,
                  url: sharedPlayer.player.image.url,
                  type: sharedPlayer.player.image.type,
                  usageType: "player" as const,
                }
              : null,
        };
      }
      return {
        ...matchPlayer,
        playerType: "linked" as const,
        name: linkedPlayer.name,
        playerId: linkedPlayer.id,
        sharedPlayerId: sharedPlayer.id,
        linkedPlayerId: linkedPlayer.id,
        image:
          linkedPlayer.image?.usageType === "player"
            ? {
                name: linkedPlayer.image.name,
                url: linkedPlayer.image.url,
                type: linkedPlayer.image.type,
                usageType: "player" as const,
              }
            : null,
        isUser: linkedPlayer.isUser,
      };
    });
    return this.sortPlayersByOrderThenName(refinedPlayers);
  }
  private sortPlayersByOrderThenName<
    T extends { order: number | null; name: string },
  >(players: T[]) {
    return players.sort((a, b) => {
      if (a.order === null && b.order === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.order === null) return 1; // nulls last
      if (b.order === null) return -1; // nulls last
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
  }
  public async getMatchSummary(
    args: GetMatchArgs,
  ): Promise<GetMatchSummaryOutputType> {
    const response = await matchRepository.getMatchSummary({
      input: args.input,
      userId: args.ctx.userId,
    });
    const playerStats: GetMatchSummaryOutputType["playerStats"] = [];
    for (const matchPlayer of response.players) {
      const matchPlayersForPlayer = response.matchPlayers.filter(
        (mp) => mp.canonicalPlayerId === matchPlayer.playerId,
      );
      const playerPlacements = matchPlayersForPlayer.reduce(
        (acc, mp) => {
          if (mp.placement !== null) {
            acc[mp.placement] = (acc[mp.placement] ?? 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>,
      );
      playerStats.push({
        id: matchPlayer.id,
        playerId: matchPlayer.playerId,
        playerType: matchPlayer.playerType,
        type: matchPlayer.type,
        name: matchPlayer.name,
        scores: matchPlayersForPlayer
          .map((mp) => mp.score)
          .filter((score) => score !== null),
        plays: matchPlayersForPlayer.length,
        placements: playerPlacements,
        wins: matchPlayersForPlayer.filter((mp) => mp.winner).length,
        firstMatch: matchPlayersForPlayer[0]?.isFirstMatchForCurrent ?? false,
      });
    }
    return {
      playerStats,
    };
  }
  public async deleteMatch(args: DeleteMatchArgs) {
    const { input } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await matchRepository.get(
        {
          id: input.id,
          createdBy: args.ctx.userId,
        },
        tx,
      );
      assertFound(
        returnedMatch,
        {
          userId: args.ctx.userId,
          value: input,
        },
        "Match not found.",
      );
      await matchPlayerRepository.deleteMatchPlayersByMatchId({
        input: {
          matchId: returnedMatch.id,
        },
        tx,
      });
      await matchRepository.deleteMatch({
        input: {
          id: returnedMatch.id,
          createdBy: args.ctx.userId,
        },
        tx,
      });
      await scoresheetRepository.deleteScoresheet({
        input: {
          id: returnedMatch.scoresheetId,
          createdBy: args.ctx.userId,
        },
        tx,
      });
    });
  }
  public async editMatch(args: EditMatchArgs): Promise<EditMatchOutputType> {
    if (args.input.type === "original") {
      return this.editOriginalMatch({
        input: args.input,
        ctx: args.ctx,
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (args.input.type === "shared") {
      return this.editSharedMatch({
        input: args.input,
        ctx: args.ctx,
      });
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown match type.",
    });
  }
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
        {
          userId: ctx.userId,
          value: input,
        },
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
      if (input.match.name || input.match.date || input.match.location) {
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
          {
            userId: ctx.userId,
            value: input,
          },
          "Match not updated.",
        );
        outputMatch.date = input.match.date;
        outputMatch.game = { id: returnedMatch.gameId };
        outputMatch.location = locationId ? { id: locationId } : undefined;
      }
      // Compute team roles ie. roles assigned to every player on the team
      const mappedTeams = returnedMatch.teams.map((team) => {
        const teamPlayers = returnedMatch.matchPlayers.filter(
          (mp) => mp.teamId === team.id,
        );
        const roleCount: {
          id: number;
          count: number;
        }[] = [];
        teamPlayers.forEach((player) => {
          player.roles.forEach((role) => {
            const existingRole = roleCount.find((r) => r.id === role.id);
            if (existingRole) {
              existingRole.count++;
            } else {
              roleCount.push({
                id: role.id,
                count: 1,
              });
            }
          });
        });
        const teamRoles = roleCount
          .filter((role) => role.count === teamPlayers.length)
          .map((r) => {
            return {
              id: r.id,
              type: "original" as const,
            };
          });
        return {
          id: team.id,
          name: team.name,
          roles: teamRoles,
        };
      });

      const playersToRemove: {
        matchPlayerId: number;
      }[] = [];
      const playersToAdd: (
        | {
            id: number;
            type: "original";
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
          }
        | {
            sharedId: number;
            type: "shared";
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
          }
      )[] = [];
      const updatedPlayers: {
        matchPlayerId: number;
        teamId: number | null;
        rolesToAdd: (
          | {
              id: number;
              type: "original";
            }
          | {
              sharedId: number;
              type: "shared";
            }
        )[];
        rolesToRemove: {
          id: number;
        }[];
      }[] = [];

      input.players.forEach((player) => {
        const foundPlayer = returnedMatch.matchPlayers.find(
          (p) => player.type === "original" && p.playerId === player.id,
        );
        if (foundPlayer) {
          const teamChanged = foundPlayer.teamId !== player.teamId;
          const originalRoles = foundPlayer.roles;
          const playerRoles = player.roles;
          const teamRoles =
            input.teams.find((t) => t.id === player.teamId)?.roles ?? [];
          teamRoles.forEach((role) => {
            const foundRole = playerRoles.find((r) => isSameRole(r, role));
            if (!foundRole) {
              playerRoles.push(role);
            }
          });
          const rolesToRemove = originalRoles.filter(
            (role) =>
              !playerRoles.find((r) =>
                isSameRole(r, {
                  id: role.id,
                  type: "original",
                }),
              ),
          );
          const rolesToAdd = playerRoles.filter(
            (role) =>
              !originalRoles.find((r) =>
                isSameRole(
                  {
                    id: r.id,
                    type: "original",
                  },
                  role,
                ),
              ),
          );
          if (
            teamChanged ||
            rolesToAdd.length > 0 ||
            rolesToRemove.length > 0
          ) {
            updatedPlayers.push({
              matchPlayerId: foundPlayer.id,
              teamId: player.teamId,
              rolesToAdd: rolesToAdd,
              rolesToRemove: rolesToRemove,
            });
          }
        } else {
          const playerRoles = player.roles;
          const teamRoles =
            input.teams.find((t) => t.id === player.teamId)?.roles ?? [];
          teamRoles.forEach((role) => {
            const foundRole = playerRoles.find((r) => isSameRole(r, role));
            if (!foundRole) {
              playerRoles.push(role);
            }
          });
          playersToAdd.push({
            ...player,
            roles: playerRoles,
          });
        }
      });
      returnedMatch.matchPlayers.forEach((mp) => {
        const foundPlayer = input.players.find(
          (p) => p.type === "original" && p.id === mp.playerId,
        );
        if (!foundPlayer) {
          playersToRemove.push({
            matchPlayerId: mp.id,
          });
        }
      });

      // Teams to add, update, and remove
      const addedTeams: {
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
      }[] = [];
      const editedTeams: {
        id: number;
        name: string;
      }[] = [];

      const deletedTeams: {
        id: number;
      }[] = [];
      input.teams.forEach((team) => {
        const foundTeam = mappedTeams.find((t) => t.id === team.id);
        if (foundTeam) {
          const matchNameChanged = foundTeam.name !== team.name;
          if (matchNameChanged) {
            editedTeams.push({
              id: team.id,
              name: team.name,
            });
          }
          return;
        }
        addedTeams.push({
          id: team.id,
          name: team.name,
          roles: team.roles,
        });
      });
      mappedTeams.forEach((team) => {
        const foundTeam = input.teams.find((t) => t.id === team.id);
        if (!foundTeam) {
          deletedTeams.push({
            id: team.id,
          });
        }
      });

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
        winner: false,
        score: null,
        rounds: [],
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
      if (playersToAdd.length > 0) {
        const combinedTeams = [...originalTeams, ...mappedAddedTeams];

        const playersToInsert = await Promise.all(
          playersToAdd.map(async (p) => {
            const foundTeam = combinedTeams.find((t) => t.id === p.teamId);
            if (!foundTeam && p.teamId !== null)
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Team not found.",
              });
            const processedPlayerId =
              await matchParticipantsService.processPlayer({
                playerToProcess: p,
                userId: args.ctx.userId,
                tx,
              });
            return {
              processedPlayer: {
                matchId: returnedMatch.id,
                playerId: processedPlayerId,
                teamId: foundTeam?.teamId ?? null,
                score: foundTeam?.score ?? null,
                placement: foundTeam?.placement ?? null,
                winner: foundTeam?.winner ?? null,
              },
              roles: p.roles,
            };
          }),
        );
        if (playersToInsert.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Edit Match No Match Players to Insert after Mapping players to add.",
          });
        }
        const returnedMatchPlayers =
          await matchPlayerRepository.insertMatchPlayers({
            input: playersToInsert.map((p) => p.processedPlayer),
            tx,
          });
        const mappedMatchPlayers = returnedMatchPlayers.map((mp) => {
          const foundPlayer = playersToInsert.find(
            (p) => p.processedPlayer.playerId === mp.playerId,
          );
          if (!foundPlayer) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                "Edit Match Match players not created after mapping players to add.",
            });
          }
          return {
            matchPlayerId: mp.id,
            playerId: mp.playerId,
            teamId: mp.teamId,
            roles: foundPlayer.roles,
          };
        });
        await matchRolesService.attachRolesToMatchPlayers({
          userId: ctx.userId,
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
                  teamPlayer?.rounds.find(
                    (pRound) => pRound.roundId === round.id,
                  )?.score ?? null,
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
      if (playersToRemove.length > 0) {
        await matchPlayerRepository.deleteMatchPlayersRolesByMatchPlayerId({
          input: {
            matchPlayerIds: playersToRemove.map((p) => p.matchPlayerId),
          },
          tx,
        });
        const deletedMatchPlayers =
          await matchPlayerRepository.deleteMatchPlayers({
            input: {
              matchId: returnedMatch.id,
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
      if (updatedPlayers.length > 0) {
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
        for (const updatedPlayer of updatedPlayers) {
          let teamId: number | null = null;
          const originalPlayer = returnedMatch.matchPlayers.find(
            (mp) => mp.id === updatedPlayer.matchPlayerId,
          );
          if (!originalPlayer) continue;
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
          userId: ctx.userId,
          tx,
          gameId: returnedMatch.gameId,
          mappedMatchPlayers,
        });
      }

      if (deletedTeams.length > 0) {
        const deletedTeamIds = deletedTeams.map((t) => t.id);
        await teamRepository.deleteTeams({
          input: {
            matchId: returnedMatch.id,
            teamIds: deletedTeamIds,
          },
          tx,
        });
      }
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
  public async editSharedMatch(args: {
    input: Extract<EditMatchInputType, { type: "shared" }>;
    ctx: EditMatchArgs["ctx"];
  }): Promise<SharedEditMatchOutputType> {
    const { input, ctx } = args;
    const response = await db.transaction(async (tx) => {
      const returnedSharedMatch = await matchRepository.getShared(
        {
          id: input.match.sharedMatchId,
          sharedWithId: ctx.userId,
          with: {
            sharedGame: {
              with: {
                game: {
                  with: {
                    image: true,
                  },
                },
                linkedGame: {
                  with: {
                    image: true,
                  },
                },
              },
            },
          },
        },
        tx,
      );
      assertFound(
        returnedSharedMatch,
        {
          userId: ctx.userId,
          value: input,
        },
        "Shared match not found.",
      );
      if (returnedSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match.",
        });
      if (input.match.location !== undefined) {
        if (input.match.location !== null) {
          const returnedSharedLocation = await locationRepository.getShared({
            id: input.match.location.sharedId,
            sharedWithId: ctx.userId,
            where: {
              ownerId: returnedSharedMatch.ownerId,
            },
          });
          assertFound(
            returnedSharedLocation,
            {
              userId: ctx.userId,
              value: input,
            },
            "Shared location not found.",
          );
          const updatedShareMatch = await matchRepository.updateMatch({
            input: {
              id: returnedSharedMatch.matchId,
              name: input.match.name,
              date: input.match.date,
              locationId: returnedSharedLocation.locationId,
            },
            tx: tx,
          });
          assertInserted(
            updatedShareMatch,
            {
              userId: ctx.userId,
              value: input,
            },
            "Shared match not updated.",
          );
          return {
            type: "shared" as const,
            matchId: updatedShareMatch.id,
            game: returnedSharedMatch.sharedGame.linkedGame
              ? {
                  id: returnedSharedMatch.sharedGame.linkedGame.id,
                  type: "original" as const,
                  name: returnedSharedMatch.sharedGame.linkedGame.name,
                  image: returnedSharedMatch.sharedGame.linkedGame.image,
                }
              : {
                  id: returnedSharedMatch.sharedGame.gameId,
                  type: "shared" as const,
                  name: returnedSharedMatch.sharedGame.game.name,
                  image: returnedSharedMatch.sharedGame.game.image,
                },
            date: updatedShareMatch.date,
          };
        } else {
          const updatedShareMatch = await matchRepository.updateMatch({
            input: {
              id: returnedSharedMatch.matchId,
              name: input.match.name,
              date: input.match.date,
              locationId: null,
            },
            tx: tx,
          });
          assertInserted(
            updatedShareMatch,
            {
              userId: ctx.userId,
              value: input,
            },
            "Shared match not updated.",
          );
          return {
            type: "shared" as const,
            matchId: updatedShareMatch.id,
            game: returnedSharedMatch.sharedGame.linkedGame
              ? {
                  id: returnedSharedMatch.sharedGame.linkedGame.id,
                  type: "original" as const,
                  name: returnedSharedMatch.sharedGame.linkedGame.name,
                  image: returnedSharedMatch.sharedGame.linkedGame.image,
                }
              : {
                  id: returnedSharedMatch.sharedGame.gameId,
                  type: "shared" as const,
                  name: returnedSharedMatch.sharedGame.game.name,
                  image: returnedSharedMatch.sharedGame.game.image,
                },
            date: updatedShareMatch.date,
          };
        }
      }
      const updatedShareMatch = await matchRepository.updateMatch({
        input: {
          id: returnedSharedMatch.matchId,
          name: input.match.name,
          date: input.match.date,
        },
        tx: tx,
      });
      assertInserted(
        updatedShareMatch,
        {
          userId: ctx.userId,
          value: input,
        },
        "Shared match not updated.",
      );
      return {
        type: "shared" as const,
        matchId: updatedShareMatch.id,
        game: returnedSharedMatch.sharedGame.linkedGame
          ? {
              id: returnedSharedMatch.sharedGame.linkedGame.id,
              type: "original" as const,
              name: returnedSharedMatch.sharedGame.linkedGame.name,
              image: returnedSharedMatch.sharedGame.linkedGame.image,
            }
          : {
              id: returnedSharedMatch.sharedGame.gameId,
              type: "shared" as const,
              name: returnedSharedMatch.sharedGame.game.name,
              image: returnedSharedMatch.sharedGame.game.image,
            },
        date: updatedShareMatch.date,
      };
    });
    return response;
  }
}
export const matchService = new MatchService();
