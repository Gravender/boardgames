import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { isSameRole } from "@board-games/shared";

import type {
  CreateMatchOutputType,
  EditMatchOutputType,
  GetMatchOutputType,
  GetMatchPlayersAndTeamsOutputType,
  GetMatchScoresheetOutputType,
  GetMatchSummaryOutputType,
} from "../../routers/match/match.output";
import type {
  CreateMatchArgs,
  DeleteMatchArgs,
  EditMatchArgs,
  GetMatchArgs,
  GetMatchPlayersAndTeamsArgs,
  GetMatchScoresheetArgs,
} from "./match.service.types";
import { Logger } from "../../common/logger";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { teamRepository } from "../../repositories/match/team.repository";
import { gameRepository } from "../../routers/game/repository/game.repository";
import { gameService } from "../../routers/game/service/game.service";
import { sharedGameRepository } from "../../routers/game/sub-routers/shared/repository/shared-game.repository";
import { locationRepository } from "../../routers/location/repository/location.repository";
import { playerRepository } from "../../routers/player/repository/player.repository";
import { scoresheetRepository } from "../../routers/scoresheet/repository/scoresheet.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import { friendService } from "../social/friend.service";

class MatchService {
  private readonly logger = new Logger(MatchService.name);
  private async resolveGameForMatch(args: {
    gameInput: CreateMatchArgs["input"]["game"];
    userId: string;
    tx: TransactionType;
  }): Promise<number> {
    const { gameInput, userId, tx } = args;
    if (gameInput.type === "original") {
      const returnedGame = await gameRepository.getGame(
        {
          id: gameInput.id,
          createdBy: userId,
        },
        tx,
      );
      assertFound(
        returnedGame,
        {
          userId: userId,
          value: gameInput,
        },
        "Game not found. For Create Match.",
      );
      return returnedGame.id;
    }
    if (gameInput.type === "shared") {
      const returnedSharedGame = await gameRepository.getSharedGame(
        {
          id: gameInput.sharedGameId,
          sharedWithId: userId,
          with: {
            game: {
              with: {
                roles: true,
              },
            },
          },
        },
        tx,
      );

      assertFound(
        returnedSharedGame,
        {
          userId: userId,
          value: gameInput,
        },
        "Shared game not found. For Create Match.",
      );
      if (returnedSharedGame.linkedGameId !== null) {
        return returnedSharedGame.linkedGameId;
      } else {
        const createdGame = await gameRepository.createGame({
          input: {
            name: returnedSharedGame.game.name,
            playersMin: returnedSharedGame.game.playersMin,
            playersMax: returnedSharedGame.game.playersMax,
            playtimeMin: returnedSharedGame.game.playtimeMin,
            playtimeMax: returnedSharedGame.game.playtimeMax,
            yearPublished: returnedSharedGame.game.yearPublished,
            imageId: returnedSharedGame.game.imageId,
          },
          userId,
          tx,
        });

        assertInserted(
          createdGame,
          { userId, value: gameInput },
          "Game not created. From shared game. For Create Match.",
        );
        await sharedGameRepository.linkSharedGame({
          input: {
            sharedGameId: returnedSharedGame.id,
            linkedGameId: createdGame.id,
          },
          tx,
        });
        return createdGame.id;
      }
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown game type.",
    });
  }
  private async resolveMatchScoresheet(args: {
    scoresheetInput: CreateMatchArgs["input"]["scoresheet"];
    userId: string;
    gameId: number;
    tx: TransactionType;
  }): Promise<{ id: number; rounds: { id: number }[] }> {
    const { scoresheetInput, userId, gameId, tx } = args;
    if (scoresheetInput.type === "original") {
      const returnedScoresheet = await scoresheetRepository.get(
        {
          id: scoresheetInput.id,
          createdBy: userId,
          with: {
            rounds: true,
          },
        },
        tx,
      );
      assertFound(
        returnedScoresheet,
        {
          userId: userId,
          value: scoresheetInput,
        },
        "Scoresheet not found. For Create Match.",
      );
      const insertedScoresheet = await scoresheetRepository.insert(
        {
          name: returnedScoresheet.name,
          isCoop: returnedScoresheet.isCoop,
          winCondition: returnedScoresheet.winCondition,
          targetScore: returnedScoresheet.targetScore,
          roundsScore: returnedScoresheet.roundsScore,
          parentId: returnedScoresheet.id,
          createdBy: userId,
          gameId: gameId,
          type: "Match",
        },
        tx,
      );
      assertInserted(
        insertedScoresheet,
        {
          userId: userId,
          value: scoresheetInput,
        },
        "Scoresheet Not Created Successfully. For Create Match.",
      );

      const mappedRounds = returnedScoresheet.rounds.map((round) => ({
        name: round.name,
        order: round.order,
        color: round.color,
        type: round.type,
        score: round.score,
        scoresheetId: insertedScoresheet.id,
      }));

      let rounds: { id: number }[] = [];
      if (mappedRounds.length > 0) {
        const insertedRounds = await scoresheetRepository.insertRound(
          mappedRounds,
          tx,
        );
        rounds = insertedRounds.map((round) => ({ id: round.id }));
      }
      return { id: insertedScoresheet.id, rounds };
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (scoresheetInput.type === "shared") {
      const returnedSharedScoresheet = await scoresheetRepository.getShared(
        {
          id: scoresheetInput.sharedId,
          sharedWithId: userId,
          with: {
            scoresheet: {
              with: {
                rounds: true,
              },
            },
          },
        },
        tx,
      );
      assertFound(
        returnedSharedScoresheet,
        {
          userId: userId,
          value: scoresheetInput,
        },
        "Shared scoresheet not found. For Create Match",
      );
      const insertedNewScoresheet = await scoresheetRepository.insert(
        {
          name: returnedSharedScoresheet.scoresheet.name,
          isCoop: returnedSharedScoresheet.scoresheet.isCoop,
          winCondition: returnedSharedScoresheet.scoresheet.winCondition,
          targetScore: returnedSharedScoresheet.scoresheet.targetScore,
          roundsScore: returnedSharedScoresheet.scoresheet.roundsScore,
          createdBy: userId,
          gameId: gameId,
          type: "Game",
        },
        tx,
      );
      assertInserted(
        insertedNewScoresheet,
        {
          userId: userId,
          value: scoresheetInput,
        },
        "Scoresheet Not Created Successfully. For Create Match. Based on Shared Scoresheet.",
      );
      const linkScoresheet = await scoresheetRepository.linkSharedScoresheet({
        input: {
          sharedScoresheetId: returnedSharedScoresheet.id,
          linkedScoresheetId: insertedNewScoresheet.id,
        },
        tx,
      });
      assertInserted(
        linkScoresheet,
        {
          userId: userId,
          value: scoresheetInput,
        },
        "Scoresheet Not Linked Successfully. For Create Match. Based on Shared Scoresheet.",
      );
      const insertedMatchScoresheet = await scoresheetRepository.insert(
        {
          name: insertedNewScoresheet.name,
          isCoop: insertedNewScoresheet.isCoop,
          winCondition: insertedNewScoresheet.winCondition,
          targetScore: insertedNewScoresheet.targetScore,
          roundsScore: insertedNewScoresheet.roundsScore,
          parentId: insertedNewScoresheet.id,
          createdBy: userId,
          gameId: gameId,
          type: "Match",
        },
        tx,
      );
      assertInserted(
        insertedMatchScoresheet,
        {
          userId: userId,
          value: scoresheetInput,
        },
        "Match Scoresheet Not Created Successfully. For Create Match.",
      );

      const mappedRounds = returnedSharedScoresheet.scoresheet.rounds.map(
        (round) => ({
          name: round.name,
          order: round.order,
          color: round.color,
          type: round.type,
          score: round.score,
          scoresheetId: insertedMatchScoresheet.id,
        }),
      );
      let rounds: { id: number }[] = [];
      if (mappedRounds.length > 0) {
        const insertedRounds = await scoresheetRepository.insertRound(
          mappedRounds,
          tx,
        );
        rounds = insertedRounds.map((round) => ({ id: round.id }));
      }

      return { id: insertedMatchScoresheet.id, rounds };
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown scoresheet type.",
    });
  }

  private async resolveLocationForMatch(args: {
    locationInput: CreateMatchArgs["input"]["location"] | null | undefined;
    userId: string;
    tx: TransactionType;
  }): Promise<number | null> {
    const { locationInput, userId, tx } = args;
    if (!locationInput) return null;

    if (locationInput.type === "original") {
      const returnedLocation = await locationRepository.get(
        {
          id: locationInput.id,
          createdBy: userId,
        },
        tx,
      );

      assertFound(
        returnedLocation,
        { userId, value: locationInput },
        "Location not found.",
      );

      return returnedLocation.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (locationInput.type === "shared") {
      const returnedSharedLocation = await locationRepository.getShared(
        {
          id: locationInput.sharedId,
          sharedWithId: userId,
          with: {
            location: true,
          },
        },
        tx,
      );

      assertFound(
        returnedSharedLocation,
        { userId, value: locationInput },
        "Shared location not found.",
      );

      const newLocation = await locationRepository.insert(
        {
          name: returnedSharedLocation.location.name,
          isDefault: returnedSharedLocation.isDefault,
          createdBy: userId,
        },
        tx,
      );

      assertInserted(
        newLocation,
        { userId, value: locationInput },
        "Location not created.",
      );

      const linkedLocation = await locationRepository.linkSharedLocation({
        input: {
          sharedLocationId: returnedSharedLocation.id,
          linkedLocationId: newLocation.id,
        },
        tx,
      });

      assertInserted(
        linkedLocation,
        { userId, value: locationInput },
        "Location not linked.",
      );

      return newLocation.id;
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown location type.",
    });
  }

  private async createTeamsAndPlayersForMatch(args: {
    input: CreateMatchArgs["input"];
    matchId: number;
    gameId: number;
    userId: string;
    tx: TransactionType;
    scoresheetRoundIds: number[];
  }) {
    const { input, matchId, gameId, userId, tx, scoresheetRoundIds } = args;

    // 1. Teams
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

    // 2. Match players (including shared → linked)
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

    // 3. Roles
    await this.attachRolesToMatchPlayers({
      input,
      userId,
      tx,
      gameId,
      mappedMatchPlayers,
    });

    // 4. Round players
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

  private async attachRolesToMatchPlayers(args: {
    input: CreateMatchArgs["input"];
    userId: string;
    tx: TransactionType;
    gameId: number;
    mappedMatchPlayers: {
      matchPlayerId: number;
      playerId: number;
      teamId: number | null;
      roles: (
        | {
            type: "original";
            id: number;
          }
        | {
            type: "shared";
            sharedId: number;
          }
      )[];
    }[];
  }) {
    const { input, userId, tx, gameId, mappedMatchPlayers } = args;

    const rolesToAdd = mappedMatchPlayers.flatMap((p) =>
      p.roles.map((role) => ({
        ...role,
        matchPlayerId: p.matchPlayerId,
      })),
    );

    if (rolesToAdd.length === 0) return;

    const originalRoles = rolesToAdd.filter(
      (roleToAdd) => roleToAdd.type === "original",
    );
    const sharedRoles = rolesToAdd.filter(
      (roleToAdd) => roleToAdd.type !== "original",
    );

    if (originalRoles.length > 0) {
      await matchPlayerRepository.insertMatchPlayerRoles({
        input: originalRoles.map((originalRole) => ({
          matchPlayerId: originalRole.matchPlayerId,
          roleId: originalRole.id,
        })),
        tx,
      });
    }

    if (sharedRoles.length > 0) {
      // Deduplicate by sharedId
      const uniqueRoles = sharedRoles.reduce<{ sharedId: number }[]>(
        (acc, role) => {
          if (!acc.find((r) => r.sharedId === role.sharedId)) {
            acc.push({ sharedId: role.sharedId });
          }
          return acc;
        },
        [],
      );

      const mappedSharedRoles: {
        sharedRoleId: number;
        createRoleId: number;
      }[] = [];

      for (const uniqueRole of uniqueRoles) {
        const returnedSharedRole = await sharedGameRepository.getSharedRole({
          input: {
            sharedRoleId: uniqueRole.sharedId,
          },
          userId,
          tx,
        });

        assertFound(
          returnedSharedRole,
          { userId, value: input },
          "Shared role not found.",
        );

        let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;

        if (linkedGameRoleId === null) {
          const createdGameRole = await gameRepository.createGameRole({
            input: {
              gameId: gameId,
              name: returnedSharedRole.gameRole.name,
              description: returnedSharedRole.gameRole.description,
              createdBy: userId,
            },
            tx,
          });

          assertInserted(
            createdGameRole,
            { userId, value: input },
            "Game role not created.",
          );

          linkedGameRoleId = createdGameRole.id;

          const linkedRole = await sharedGameRepository.linkSharedRole({
            input: {
              sharedRoleId: uniqueRole.sharedId,
              linkedRoleId: createdGameRole.id,
            },
            tx,
          });

          assertInserted(
            linkedRole,
            { userId, value: input },
            "Linked role not created.",
          );
        }

        mappedSharedRoles.push({
          sharedRoleId: uniqueRole.sharedId,
          createRoleId: linkedGameRoleId,
        });
      }

      const mappedSharedRolesWithMatchPlayers = sharedRoles.map((role) => {
        const createdRole = mappedSharedRoles.find(
          (r) => r.sharedRoleId === role.sharedId,
        );

        assertFound(
          createdRole,
          { userId, value: input },
          "Shared role not found.",
        );

        return {
          matchPlayerId: role.matchPlayerId,
          roleId: createdRole.createRoleId,
        };
      });

      if (mappedSharedRolesWithMatchPlayers.length > 0) {
        await matchPlayerRepository.insertMatchPlayerRoles({
          input: mappedSharedRolesWithMatchPlayers,
          tx,
        });
      }
    }
  }

  public async createMatch(
    args: CreateMatchArgs,
  ): Promise<CreateMatchOutputType> {
    const {
      input,
      ctx: { userId },
    } = args;
    const response = await db.transaction(async (tx) => {
      const gameId = await this.resolveGameForMatch({
        gameInput: input.game,
        userId,
        tx,
      });

      const matchScoresheet = await this.resolveMatchScoresheet({
        scoresheetInput: input.scoresheet,
        userId,
        gameId,
        tx,
      });

      const locationId = await this.resolveLocationForMatch({
        locationInput: input.location,
        userId,
        tx,
      });
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
      assertInserted(
        insertedMatch,
        {
          userId: args.ctx.userId,
          value: args.input,
        },
        "Match not created.",
      );
      const { mappedMatchPlayers } = await this.createTeamsAndPlayersForMatch({
        input,
        matchId: insertedMatch.id,
        gameId,
        userId,
        tx,
        scoresheetRoundIds: matchScoresheet.rounds.map((r) => r.id),
      });
      return {
        match: insertedMatch,
        players: mappedMatchPlayers.map((mp) => ({
          matchPlayerId: mp.matchPlayerId,
          playerId: mp.playerId,
        })),
      };
    });
    await friendService.autoShareMatch({
      input: {
        matchId: response.match.id,
      },
      ctx: {
        userId: args.ctx.userId,
      },
    });
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
      refinedPlayers.sort((a, b) => {
        if (a.order === null && b.order === null) {
          return a.name.localeCompare(b.name);
        }
        if (a.order === null) return 1; // nulls last
        if (b.order === null) return -1; // nulls last
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });
      return {
        teams: response.teams,
        players: refinedPlayers,
      };
    } else {
      const refinedPlayers = response.players.map((sharedMatchPlayer) => {
        const playerRounds = response.scoresheet.rounds.map(
          (scoresheetRound) => {
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
          },
        );

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
      refinedPlayers.sort((a, b) => {
        if (a.order === null && b.order === null) {
          return a.name.localeCompare(b.name);
        }
        if (a.order === null) return 1; // nulls last
        if (b.order === null) return -1; // nulls last
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });
      return {
        teams: response.teams,
        players: refinedPlayers,
      };
    }
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
    return matchRepository.deleteMatch({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async editMatch(args: EditMatchArgs): Promise<EditMatchOutputType> {
    return matchRepository.editMatch({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
}
export const matchService = new MatchService();
