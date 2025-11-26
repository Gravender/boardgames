import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";
import { isSameRole } from "@board-games/shared";

import type {
  CreateMatchOutputType,
  EditMatchOutputType,
  GetMatchOutputType,
  GetMatchPlayersAndTeamsOutputType,
  GetMatchScoresheetOutputType,
  GetMatchSummaryOutputType,
} from "../match.output";
import type {
  CreateMatchArgs,
  DeleteMatchArgs,
  EditMatchArgs,
  GetMatchArgs,
  GetMatchPlayersAndTeamsArgs,
  GetMatchScoresheetArgs,
} from "./match.service.types";
import { Logger } from "../../../common/logger";
import { assertFound, assertInserted } from "../../../utils/databaseHelpers";
import { friendService } from "../../friend/service/friend.service";
import { gameRepository } from "../../game/repository/game.repository";
import { sharedGameRepository } from "../../game/sub-routers/shared/repository/shared-game.repository";
import { locationRepository } from "../../location/repository/location.repository";
import { playerRepository } from "../../player/repository/player.repository";
import { scoresheetRepository } from "../../scoresheet/repository/scoresheet.repository";
import { matchRepository } from "../repository/match.repository";
import { matchPlayerRepository } from "../sub-routers/matchPlayer.repository";
import { teamRepository } from "../sub-routers/team/team.repository";

class MatchService {
  private readonly logger = new Logger(MatchService.name);
  public async createMatch(
    args: CreateMatchArgs,
  ): Promise<CreateMatchOutputType> {
    const {
      input,
      ctx: { userId },
    } = args;
    const response = await db.transaction(async (tx) => {
      let gameId: number | null = null;
      if (input.game.type === "original") {
        const returnedGame = await gameRepository.getGame(
          {
            id: input.game.id,
            createdBy: userId,
          },
          tx,
        );
        assertFound(
          returnedGame,
          {
            userId: args.ctx.userId,
            value: args.input,
          },
          "Game not found. For Create Match.",
        );
        gameId = returnedGame.id;
      }
      if (input.game.type === "shared") {
        const returnedSharedGame = await gameRepository.getSharedGame(
          {
            id: input.game.sharedGameId,
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
            userId: args.ctx.userId,
            value: args.input,
          },
          "Shared game not found. For Create Match.",
        );
        if (returnedSharedGame.linkedGameId !== null) {
          gameId = returnedSharedGame.linkedGameId;
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
            {
              userId: args.ctx.userId,
              value: args.input,
            },
            "Game not created. From shared game. For Create Match.",
          );
          gameId = createdGame.id;
          await sharedGameRepository.linkSharedGame({
            input: {
              sharedGameId: returnedSharedGame.id,
              linkedGameId: createdGame.id,
            },
            tx,
          });
        }
      }
      if (gameId === null) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Game not found.",
        });
      }
      let matchScoresheet: {
        id: number;
        rounds: { id: number }[];
      } | null = null;
      if (input.scoresheet.type === "original") {
        const returnedScoresheet = await scoresheetRepository.get(
          {
            id: input.scoresheet.id,
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
            userId: args.ctx.userId,
            value: args.input,
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
            userId: args.ctx.userId,
            value: args.input,
          },
          "Scoresheet Not Created Successfully. For Create Match.",
        );
        matchScoresheet = {
          id: insertedScoresheet.id,
          rounds: [],
        };
        const mappedRounds = returnedScoresheet.rounds.map((round) => ({
          name: round.name,
          order: round.order,
          color: round.color,
          type: round.type,
          score: round.score,
          scoresheetId: insertedScoresheet.id,
        }));
        if (mappedRounds.length > 0) {
          const insertedRounds = await scoresheetRepository.insertRound(
            mappedRounds,
            tx,
          );
          matchScoresheet.rounds = insertedRounds.map((round) => ({
            id: round.id,
          }));
        }
      }
      if (input.scoresheet.type === "shared") {
        const returnedSharedScoresheet = await scoresheetRepository.getShared(
          {
            id: input.scoresheet.sharedId,
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
            userId: args.ctx.userId,
            value: args.input,
          },
          "Shared scoresheet not found. For Create Match.",
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
            userId: args.ctx.userId,
            value: args.input,
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
            userId: args.ctx.userId,
            value: args.input,
          },
          "Scoresheet Not Linked Successfully. For Create Match. Based on Shared Scoresheet.",
        );
        const insertedScoresheet = await scoresheetRepository.insert(
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
          insertedScoresheet,
          {
            userId: args.ctx.userId,
            value: args.input,
          },
          "Match Scoresheet Not Created Successfully. For Create Match.",
        );
        matchScoresheet = {
          id: insertedScoresheet.id,
          rounds: [],
        };
        const mappedRounds = returnedSharedScoresheet.scoresheet.rounds.map(
          (round) => ({
            name: round.name,
            order: round.order,
            color: round.color,
            type: round.type,
            score: round.score,
            scoresheetId: insertedScoresheet.id,
          }),
        );
        if (mappedRounds.length > 0) {
          const insertedRounds = await scoresheetRepository.insertRound(
            mappedRounds,
            tx,
          );
          matchScoresheet.rounds = insertedRounds.map((round) => ({
            id: round.id,
          }));
        }
      }
      assertFound(
        matchScoresheet,
        {
          userId: args.ctx.userId,
          value: args.input,
        },
        "Scoresheet not found. For Create Match.",
      );
      let locationId: number | null = null;
      if (input.location) {
        if (input.location.type === "original") {
          const returnedLocation = await locationRepository.get(
            {
              id: input.location.id,
              createdBy: userId,
            },
            tx,
          );
          assertFound(
            returnedLocation,
            {
              userId: args.ctx.userId,
              value: args.input,
            },
            "Location not found.",
          );
          locationId = returnedLocation.id;
        }
        if (input.location.type === "shared") {
          const returnedSharedLocation = await locationRepository.getShared(
            {
              id: input.location.sharedId,
              sharedWithId: userId,
              with: {
                location: true,
              },
            },
            tx,
          );
          assertFound(
            returnedSharedLocation,
            {
              userId: args.ctx.userId,
              value: args.input,
            },
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
            {
              userId: args.ctx.userId,
              value: args.input,
            },
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
            {
              userId: args.ctx.userId,
              value: args.input,
            },
            "Location not linked.",
          );
          locationId = newLocation.id;
        }
      }
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
      const mappedTeams = await Promise.all(
        input.teams.map(async (inputTeam) => {
          const createdTeam = await teamRepository.createTeam({
            input: {
              name: inputTeam.name,
              matchId: insertedMatch.id,
            },
            tx,
          });
          assertInserted(
            createdTeam,
            {
              userId: args.ctx.userId,
              value: args.input,
            },
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
                matchId: insertedMatch.id,
                playerId: p.id,
                teamId: team ? team.createdId : null,
              },
              tx,
            });
            assertInserted(
              returnedMatchPlayer,
              {
                userId: args.ctx.userId,
                value: args.input,
              },
              "Match player not created.",
            );
            return {
              matchPlayerId: returnedMatchPlayer.id,
              playerId: p.id,
              teamId: team ? team.createdId : null,
              roles: [...p.roles, ...rolesToAdd],
            };
          } else {
            const foundSharedPlayer = await playerRepository.getSharedPlayer(
              {
                sharedWithId: args.ctx.userId,
                id: p.sharedId,
                with: {
                  player: true,
                },
              },
              tx,
            );
            assertFound(
              foundSharedPlayer,
              {
                userId: args.ctx.userId,
                value: args.input,
              },
              "Shared player not found. For Create Match.",
            );
            if (foundSharedPlayer.linkedPlayerId !== null) {
              const linkedPlayer = await playerRepository.getPlayer(
                {
                  id: foundSharedPlayer.linkedPlayerId,
                  createdBy: args.ctx.userId,
                },
                tx,
              );
              assertFound(
                linkedPlayer,
                {
                  userId: args.ctx.userId,
                  value: args.input,
                },
                "Linked player not found. For Create Match.",
              );
              const returnedMatchPlayer = await matchPlayerRepository.insert({
                input: {
                  matchId: insertedMatch.id,
                  playerId: linkedPlayer.id,
                  teamId: team ? team.createdId : null,
                },
                tx,
              });
              assertInserted(
                returnedMatchPlayer,
                {
                  userId: args.ctx.userId,
                  value: args.input,
                },
                "Match player not created.",
              );
              return {
                matchPlayerId: returnedMatchPlayer.id,
                playerId: linkedPlayer.id,
                teamId: team ? team.createdId : null,
                roles: [...p.roles, ...rolesToAdd],
              };
            } else {
              const insertedPlayer = await playerRepository.insert({
                input: {
                  createdBy: args.ctx.userId,
                  name: foundSharedPlayer.player.name,
                },
                tx,
              });
              assertInserted(
                insertedPlayer,
                {
                  userId: args.ctx.userId,
                  value: args.input,
                },
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
                {
                  userId: args.ctx.userId,
                  value: args.input,
                },
                "Linked player not created.",
              );
              const returnedMatchPlayer = await matchPlayerRepository.insert({
                input: {
                  matchId: insertedMatch.id,
                  playerId: insertedPlayer.id,
                  teamId: team ? team.createdId : null,
                },
                tx,
              });
              assertInserted(
                returnedMatchPlayer,
                {
                  userId: args.ctx.userId,
                  value: args.input,
                },
                "Match player not created.",
              );
              return {
                matchPlayerId: returnedMatchPlayer.id,
                playerId: insertedPlayer.id,
                teamId: team ? team.createdId : null,
                roles: [...p.roles, ...rolesToAdd],
              };
            }
          }
        }),
      );
      const rolesToAdd = mappedMatchPlayers.flatMap((p) =>
        p.roles.map((role) => ({
          ...role,
          matchPlayerId: p.matchPlayerId,
        })),
      );
      if (rolesToAdd.length > 0) {
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
          const uniqueRoles = sharedRoles.reduce<
            {
              sharedId: number;
            }[]
          >((acc, role) => {
            const existingRole = acc.find((r) => r.sharedId === role.sharedId);
            if (!existingRole) {
              acc.push({
                sharedId: role.sharedId,
              });
            }
            return acc;
          }, []);
          const mappedSharedRoles: {
            sharedRoleId: number;
            createRoleId: number;
          }[] = [];
          for (const uniqueRole of uniqueRoles) {
            const returnedSharedRole = await sharedGameRepository.getSharedRole(
              {
                input: {
                  sharedRoleId: uniqueRole.sharedId,
                },
                userId: args.ctx.userId,
                tx,
              },
            );
            assertFound(
              returnedSharedRole,
              {
                userId: args.ctx.userId,
                value: args.input,
              },
              "Shared role not found.",
            );
            let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;
            if (linkedGameRoleId === null) {
              const createdGameRole = await gameRepository.createGameRole({
                input: {
                  gameId: insertedMatch.gameId,
                  name: returnedSharedRole.gameRole.name,
                  description: returnedSharedRole.gameRole.description,
                  createdBy: args.ctx.userId,
                },
                tx,
              });
              assertInserted(
                createdGameRole,
                {
                  userId: args.ctx.userId,
                  value: args.input,
                },
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
                {
                  userId: args.ctx.userId,
                  value: args.input,
                },
                "Linked role not created.",
              );
            }
            mappedSharedRoles.push({
              sharedRoleId: uniqueRole.sharedId,
              createRoleId: linkedGameRoleId,
            });
          }
          const mappedSharedRolesWithMatchPlayers: {
            matchPlayerId: number;
            roleId: number;
          }[] = sharedRoles.map((role) => {
            const createdRole = mappedSharedRoles.find(
              (r) => r.sharedRoleId === role.sharedId,
            );
            assertFound(
              createdRole,
              {
                userId: args.ctx.userId,
                value: args.input,
              },
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
      const roundPlayersToInsert = matchScoresheet.rounds.flatMap((round) => {
        return mappedMatchPlayers.map((player) => ({
          roundId: round.id,
          matchPlayerId: player.matchPlayerId,
        }));
      });
      if (roundPlayersToInsert.length > 0) {
        await matchPlayerRepository.insertRounds({
          input: roundPlayersToInsert,
          tx,
        });
      }
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
