import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import type {
  UpdateMatchDetailsArgs,
  UpdateMatchPlayerTeamAndRolesArgs,
  UpdateMatchTeamArgs,
} from "./update-match.service.types";
import { matchUpdateDetailsRepository } from "../../repositories/match/match-update-details.repository";
import { matchUpdatePlayerRoleRepository } from "../../repositories/match/match-update-player-role.repository";
import { matchUpdatePlayerTeamRepository } from "../../repositories/match/match-update-player-team.repository";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { teamRepository } from "../../repositories/match/team.repository";
import { sharedGameRepository } from "../../routers/game/sub-routers/shared/repository/shared-game.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import { getMatchForUpdate } from "./match-update-helpers";

class MatchUpdatePlayerService {
  public async updateMatchDetails(args: UpdateMatchDetailsArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({
        input: input.match,
        ctx,
        tx,
      });

      if (input.type === "player") {
        const returnedMatchPlayer =
          await matchPlayerRepository.getFromViewCanonicalForUser({
            input: {
              id: input.id,
              matchId: returnedMatch.id,
              userId: ctx.userId,
            },
            tx,
          });
        assertFound(
          returnedMatchPlayer,
          {
            userId: ctx.userId,
            value: input,
          },
          "Match player not found.",
        );
        if (returnedMatchPlayer.permission !== "edit") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Does not have permission to edit this match player.",
          });
        }
        await matchUpdateDetailsRepository.updateMatchPlayerDetails({
          input: {
            id: input.id,
            details: input.details,
          },
          tx,
        });
      } else {
        await matchUpdateDetailsRepository.updateTeamDetails({
          input: {
            teamId: input.teamId,
            details: input.details,
          },
          tx,
        });
      }
    });
  }

  public async updateMatchPlayerTeamAndRoles(
    args: UpdateMatchPlayerTeamAndRolesArgs,
  ) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const foundMatchPlayer =
        input.type === "original"
          ? await matchPlayerRepository.getFromViewCanonicalForUserByOriginalId(
              {
                input: {
                  id: input.id,
                  userId: ctx.userId,
                },
                tx,
              },
            )
          : await matchPlayerRepository.getFromViewCanonicalForUserBySharedId({
              input: {
                sharedMatchPlayerId: input.sharedMatchPlayerId,
                userId: ctx.userId,
              },
              tx,
            });
      assertFound(
        foundMatchPlayer,
        {
          userId: ctx.userId,
          value: input,
        },
        "Match player not found.",
      );
      if (foundMatchPlayer.permission !== "edit") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match player.",
        });
      }

      if (input.teamId !== undefined) {
        if (input.teamId !== null) {
          const foundTeam = await teamRepository.get({
            id: input.teamId,
            tx,
          });
          assertFound(
            foundTeam,
            {
              userId: ctx.userId,
              value: input,
            },
            "Team not found.",
          );
          if (foundTeam.matchId !== foundMatchPlayer.canonicalMatchId) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Team does not belong to this match.",
            });
          }
        }
        await matchUpdatePlayerTeamRepository.updateMatchPlayerTeam({
          input: {
            id: foundMatchPlayer.baseMatchPlayerId,
            teamId: input.teamId,
          },
          tx,
        });
      }

      if (input.rolesToAdd.length > 0) {
        const originalRoles: number[] = [];
        const sharedRoles: number[] = [];
        for (const role of input.rolesToAdd) {
          if (role.type === "original") {
            originalRoles.push(role.id);
          } else {
            sharedRoles.push(role.sharedId);
          }
        }

        if (input.type === "original") {
          if (originalRoles.length > 0) {
            await matchUpdatePlayerRoleRepository.insertMatchPlayerRoles({
              input: originalRoles.map((roleId) => ({
                matchPlayerId: input.id,
                roleId: roleId,
              })),
              tx,
            });
          }

          const returnedMatch = await matchRepository.get(
            {
              id: foundMatchPlayer.canonicalMatchId,
              createdBy: ctx.userId,
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

          for (const sharedRoleToAdd of sharedRoles) {
            const returnedSharedRole = await sharedGameRepository.getSharedRole(
              {
                input: {
                  sharedRoleId: sharedRoleToAdd,
                },
                userId: ctx.userId,
                tx,
              },
            );
            assertFound(
              returnedSharedRole,
              {
                userId: ctx.userId,
                value: input,
              },
              "Shared role not found.",
            );

            let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;
            if (!linkedGameRoleId) {
              const createdGameRole =
                await matchUpdatePlayerRoleRepository.createGameRole({
                  input: {
                    gameId: returnedMatch.gameId,
                    name: returnedSharedRole.gameRole.name,
                    description: returnedSharedRole.gameRole.description,
                    createdBy: ctx.userId,
                  },
                  tx,
                });
              assertInserted(
                createdGameRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Game role not created.",
              );

              const linkedRole =
                await matchUpdatePlayerRoleRepository.linkSharedGameRole({
                  input: {
                    sharedGameRoleId: returnedSharedRole.id,
                    linkedGameRoleId: createdGameRole.id,
                  },
                  tx,
                });
              assertInserted(
                linkedRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Linked role not created.",
              );
              linkedGameRoleId = createdGameRole.id;
            }

            await matchUpdatePlayerRoleRepository.insertMatchPlayerRole({
              input: {
                matchPlayerId: input.id,
                roleId: linkedGameRoleId,
              },
              tx,
            });
          }
        }

        if (input.type === "shared") {
          if (originalRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Original roles not allowed for shared match players.",
            });
          }
          if (foundMatchPlayer.sharedMatchPlayerId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared Match Player not set.",
            });
          }

          for (const sharedRoleToAdd of sharedRoles) {
            const returnedSharedRole = await sharedGameRepository.getSharedRole(
              {
                input: {
                  sharedRoleId: sharedRoleToAdd,
                },
                userId: ctx.userId,
                tx,
              },
            );
            assertFound(
              returnedSharedRole,
              {
                userId: ctx.userId,
                value: input,
              },
              "Shared role not found.",
            );

            const existingMatchPlayerRole =
              await matchUpdatePlayerRoleRepository.getMatchPlayerRole({
                input: {
                  matchPlayerId: foundMatchPlayer.baseMatchPlayerId,
                  roleId: returnedSharedRole.gameRoleId,
                },
                tx,
              });
            if (existingMatchPlayerRole) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shared role already exists.",
              });
            }

            const insertedMatchPlayerRole =
              await matchUpdatePlayerRoleRepository.insertMatchPlayerRole({
                input: {
                  matchPlayerId: foundMatchPlayer.baseMatchPlayerId,
                  roleId: returnedSharedRole.gameRoleId,
                },
                tx,
              });
            assertInserted(
              insertedMatchPlayerRole,
              {
                userId: ctx.userId,
                value: input,
              },
              "Failed to create match player role",
            );

            const insertedSharedMatchPlayerRole =
              await matchUpdatePlayerRoleRepository.insertSharedMatchPlayerRole(
                {
                  input: {
                    sharedMatchPlayerId: foundMatchPlayer.sharedMatchPlayerId,
                    sharedGameRoleId: returnedSharedRole.id,
                  },
                  tx,
                },
              );
            assertInserted(
              insertedSharedMatchPlayerRole,
              {
                userId: ctx.userId,
                value: input,
              },
              "Failed to create shared match player role",
            );
          }
        }
      }

      if (input.rolesToRemove.length > 0) {
        const originalRoles: number[] = [];
        const sharedRoles: number[] = [];
        for (const role of input.rolesToRemove) {
          if (role.type === "original") {
            originalRoles.push(role.id);
          } else {
            sharedRoles.push(role.sharedId);
          }
        }

        if (input.type === "original") {
          if (originalRoles.length > 0) {
            await matchUpdatePlayerRoleRepository.deleteMatchPlayerRoles({
              input: {
                matchPlayerId: input.id,
                roleIds: originalRoles,
              },
              tx,
            });
          }
          if (sharedRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Original roles not allowed for shared match players.",
            });
          }
        }

        if (input.type === "shared") {
          if (originalRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Original roles not allowed for shared match players.",
            });
          }
          if (foundMatchPlayer.sharedMatchPlayerId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared Match Player not set.",
            });
          }

          for (const sharedRoleToRemove of sharedRoles) {
            const returnedSharedRole = await sharedGameRepository.getSharedRole(
              {
                input: {
                  sharedRoleId: sharedRoleToRemove,
                },
                userId: ctx.userId,
                tx,
              },
            );
            assertFound(
              returnedSharedRole,
              {
                userId: ctx.userId,
                value: input,
              },
              "Shared role not found.",
            );

            await matchUpdatePlayerRoleRepository.deleteSharedMatchPlayerRole({
              input: {
                sharedMatchPlayerId: foundMatchPlayer.sharedMatchPlayerId,
                sharedGameRoleId: returnedSharedRole.id,
              },
              tx,
            });

            await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
              input: {
                matchPlayerId: foundMatchPlayer.baseMatchPlayerId,
                roleId: returnedSharedRole.gameRoleId,
              },
              tx,
            });
          }
        }
      }
    });
  }

  public async updateMatchTeam(args: UpdateMatchTeamArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({
        input:
          input.type === "original"
            ? { type: "original", id: input.id }
            : { type: "shared", sharedMatchId: input.sharedMatchId },
        ctx,
        tx,
      });

      const currentTeam = await teamRepository.get({
        id: input.team.id,
        tx,
      });
      assertFound(
        currentTeam,
        {
          userId: ctx.userId,
          value: input,
        },
        "Team not found.",
      );

      if (currentTeam.matchId !== returnedMatch.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team does not belong to this match.",
        });
      }

      if (input.team.name !== undefined) {
        await teamRepository.updateTeam({
          input: {
            id: input.team.id,
            name: input.team.name,
          },
          tx,
        });
      }

      if (input.type === "original") {
        // Handle playersToAdd
        if (input.playersToAdd.length > 0) {
          const playerIds = input.playersToAdd.map((p) => p.id);
          const foundMatchPlayers =
            await matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser(
              {
                input: {
                  matchId: returnedMatch.id,
                  userId: ctx.userId,
                },
                tx,
              },
            );
          const playersToAdd = foundMatchPlayers.filter(
            (mp) =>
              playerIds.includes(mp.baseMatchPlayerId) &&
              mp.permission === "edit",
          );
          if (playersToAdd.length !== playerIds.length) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit all match players.",
            });
          }

          await matchUpdatePlayerTeamRepository.updateMatchPlayersTeam({
            input: {
              matchId: returnedMatch.id,
              matchPlayerIds: playerIds,
              teamId: currentTeam.id,
            },
            tx,
          });

          const originalRoles: number[] = [];
          const sharedRoles: { matchPlayerId: number; sharedId: number }[] = [];
          for (const playerToAdd of input.playersToAdd) {
            for (const role of playerToAdd.roles) {
              if (role.type === "original") {
                originalRoles.push(role.id);
              } else {
                sharedRoles.push({
                  matchPlayerId: playerToAdd.id,
                  sharedId: role.sharedId,
                });
              }
            }
          }

          if (originalRoles.length > 0) {
            const originalRolesToInsert = input.playersToAdd.flatMap((p) =>
              p.roles
                .filter((r) => r.type === "original")
                .map((r) => ({
                  matchPlayerId: p.id,
                  roleId: r.id,
                })),
            );
            await matchUpdatePlayerRoleRepository.insertMatchPlayerRoles({
              input: originalRolesToInsert,
              tx,
            });
          }

          if (sharedRoles.length > 0) {
            for (const sharedRole of sharedRoles) {
              const returnedSharedRole =
                await sharedGameRepository.getSharedRole({
                  input: {
                    sharedRoleId: sharedRole.sharedId,
                  },
                  userId: ctx.userId,
                  tx,
                });
              assertFound(
                returnedSharedRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Shared role not found.",
              );

              let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;
              if (!linkedGameRoleId) {
                const createdGameRole =
                  await matchUpdatePlayerRoleRepository.createGameRole({
                    input: {
                      gameId: returnedMatch.gameId,
                      name: returnedSharedRole.gameRole.name,
                      description: returnedSharedRole.gameRole.description,
                      createdBy: ctx.userId,
                    },
                    tx,
                  });
                assertInserted(
                  createdGameRole,
                  {
                    userId: ctx.userId,
                    value: input,
                  },
                  "Game role not created.",
                );

                const linkedRole =
                  await matchUpdatePlayerRoleRepository.linkSharedGameRole({
                    input: {
                      sharedGameRoleId: returnedSharedRole.id,
                      linkedGameRoleId: createdGameRole.id,
                    },
                    tx,
                  });
                assertInserted(
                  linkedRole,
                  {
                    userId: ctx.userId,
                    value: input,
                  },
                  "Linked role not created.",
                );
                linkedGameRoleId = createdGameRole.id;
              }

              await matchUpdatePlayerRoleRepository.insertMatchPlayerRole({
                input: {
                  matchPlayerId: sharedRole.matchPlayerId,
                  roleId: linkedGameRoleId,
                },
                tx,
              });
            }
          }
        }

        // Handle playersToRemove
        if (input.playersToRemove.length > 0) {
          const playerIds = input.playersToRemove.map((p) => p.id);
          const foundMatchPlayers =
            await matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser(
              {
                input: {
                  matchId: returnedMatch.id,
                  userId: ctx.userId,
                },
                tx,
              },
            );
          const playersToRemove = foundMatchPlayers.filter(
            (mp) =>
              playerIds.includes(mp.baseMatchPlayerId) &&
              mp.permission === "edit",
          );
          if (playersToRemove.length !== playerIds.length) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit all match players.",
            });
          }

          await matchUpdatePlayerTeamRepository.updateMatchPlayersTeam({
            input: {
              matchId: returnedMatch.id,
              matchPlayerIds: playerIds,
              teamId: null,
            },
            tx,
          });

          const rolesToRemove = input.playersToRemove.flatMap((p) =>
            p.roles.map((r) => ({
              matchPlayerId: p.id,
              roleId: r.id,
            })),
          );
          if (rolesToRemove.length > 0) {
            for (const roleToRemove of rolesToRemove) {
              await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
                input: {
                  matchPlayerId: roleToRemove.matchPlayerId,
                  roleId: roleToRemove.roleId,
                },
                tx,
              });
            }
          }
        }

        // Handle playersToUpdate
        if (input.playersToUpdate.length > 0) {
          const playerIds = input.playersToUpdate.map((p) => p.id);
          const foundMatchPlayers =
            await matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser(
              {
                input: {
                  matchId: returnedMatch.id,
                  userId: ctx.userId,
                },
                tx,
              },
            );
          const playersToUpdate = foundMatchPlayers.filter(
            (mp) =>
              playerIds.includes(mp.baseMatchPlayerId) &&
              mp.permission === "edit",
          );
          if (playersToUpdate.length !== playerIds.length) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit all match players.",
            });
          }

          // Add roles
          const rolesToAdd = input.playersToUpdate.flatMap((p) =>
            p.rolesToAdd.map((role) => ({
              matchPlayerId: p.id,
              role: role,
            })),
          );
          if (rolesToAdd.length > 0) {
            const originalRolesToAdd = rolesToAdd
              .filter((r) => r.role.type === "original")
              .map((r) => ({
                matchPlayerId: r.matchPlayerId,
                roleId: r.role.type === "original" ? r.role.id : 0,
              }))
              .filter((r) => r.roleId !== 0);
            if (originalRolesToAdd.length > 0) {
              await matchUpdatePlayerRoleRepository.insertMatchPlayerRoles({
                input: originalRolesToAdd,
                tx,
              });
            }

            const sharedRolesToAdd = rolesToAdd.filter(
              (r) => r.role.type !== "original",
            );
            for (const sharedRoleToAdd of sharedRolesToAdd) {
              const returnedSharedRole =
                await sharedGameRepository.getSharedRole({
                  input: {
                    sharedRoleId:
                      sharedRoleToAdd.role.type === "shared"
                        ? sharedRoleToAdd.role.sharedId
                        : 0,
                  },
                  userId: ctx.userId,
                  tx,
                });
              assertFound(
                returnedSharedRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Shared role not found.",
              );

              let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;
              if (!linkedGameRoleId) {
                const createdGameRole =
                  await matchUpdatePlayerRoleRepository.createGameRole({
                    input: {
                      gameId: returnedMatch.gameId,
                      name: returnedSharedRole.gameRole.name,
                      description: returnedSharedRole.gameRole.description,
                      createdBy: ctx.userId,
                    },
                    tx,
                  });
                assertInserted(
                  createdGameRole,
                  {
                    userId: ctx.userId,
                    value: input,
                  },
                  "Game role not created.",
                );

                const linkedRole =
                  await matchUpdatePlayerRoleRepository.linkSharedGameRole({
                    input: {
                      sharedGameRoleId: returnedSharedRole.id,
                      linkedGameRoleId: createdGameRole.id,
                    },
                    tx,
                  });
                assertInserted(
                  linkedRole,
                  {
                    userId: ctx.userId,
                    value: input,
                  },
                  "Linked role not created.",
                );
                linkedGameRoleId = createdGameRole.id;
              }

              await matchUpdatePlayerRoleRepository.insertMatchPlayerRole({
                input: {
                  matchPlayerId: sharedRoleToAdd.matchPlayerId,
                  roleId: linkedGameRoleId,
                },
                tx,
              });
            }
          }

          // Remove roles
          const rolesToRemove = input.playersToUpdate.flatMap((p) =>
            p.rolesToRemove.map((role) => ({
              matchPlayerId: p.id,
              roleId: role.id,
            })),
          );
          if (rolesToRemove.length > 0) {
            for (const roleToRemove of rolesToRemove) {
              await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
                input: {
                  matchPlayerId: roleToRemove.matchPlayerId,
                  roleId: roleToRemove.roleId,
                },
                tx,
              });
            }
          }
        }
      } else {
        // Handle shared match type
        // Handle playersToAdd
        if (input.playersToAdd.length > 0) {
          const sharedPlayerIds = input.playersToAdd.map(
            (p) => p.sharedMatchPlayerId,
          );
          const foundMatchPlayers =
            await matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser(
              {
                input: {
                  matchId: returnedMatch.id,
                  userId: ctx.userId,
                },
                tx,
              },
            );
          const playersToAdd = foundMatchPlayers.filter(
            (mp) =>
              mp.sharedMatchPlayerId !== null &&
              sharedPlayerIds.includes(mp.sharedMatchPlayerId) &&
              mp.permission === "edit",
          );
          if (playersToAdd.length !== sharedPlayerIds.length) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit all match players.",
            });
          }

          const baseMatchPlayerIds = playersToAdd.map(
            (mp) => mp.baseMatchPlayerId,
          );
          await matchUpdatePlayerTeamRepository.updateMatchPlayersTeam({
            input: {
              matchId: returnedMatch.id,
              matchPlayerIds: baseMatchPlayerIds,
              teamId: currentTeam.id,
            },
            tx,
          });

          for (const playerToAdd of input.playersToAdd) {
            const foundPlayer = playersToAdd.find(
              (mp) =>
                mp.sharedMatchPlayerId === playerToAdd.sharedMatchPlayerId,
            );
            if (!foundPlayer?.sharedMatchPlayerId) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Match Player not set.",
              });
            }

            for (const role of playerToAdd.roles) {
              const returnedSharedRole =
                await sharedGameRepository.getSharedRole({
                  input: {
                    sharedRoleId: role.sharedId,
                  },
                  userId: ctx.userId,
                  tx,
                });
              assertFound(
                returnedSharedRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Shared role not found.",
              );

              const existingMatchPlayerRole =
                await matchUpdatePlayerRoleRepository.getMatchPlayerRole({
                  input: {
                    matchPlayerId: foundPlayer.baseMatchPlayerId,
                    roleId: returnedSharedRole.gameRoleId,
                  },
                  tx,
                });
              if (existingMatchPlayerRole) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Shared role already exists.",
                });
              }

              const insertedMatchPlayerRole =
                await matchUpdatePlayerRoleRepository.insertMatchPlayerRole({
                  input: {
                    matchPlayerId: foundPlayer.baseMatchPlayerId,
                    roleId: returnedSharedRole.gameRoleId,
                  },
                  tx,
                });
              assertInserted(
                insertedMatchPlayerRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Failed to create match player role",
              );

              const insertedSharedMatchPlayerRole =
                await matchUpdatePlayerRoleRepository.insertSharedMatchPlayerRole(
                  {
                    input: {
                      sharedMatchPlayerId: foundPlayer.sharedMatchPlayerId,
                      sharedGameRoleId: returnedSharedRole.id,
                    },
                    tx,
                  },
                );
              assertInserted(
                insertedSharedMatchPlayerRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Failed to create shared match player role",
              );
            }
          }
        }

        // Handle playersToRemove
        if (input.playersToRemove.length > 0) {
          const sharedPlayerIds = input.playersToRemove.map(
            (p) => p.sharedMatchPlayerId,
          );
          const foundMatchPlayers =
            await matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser(
              {
                input: {
                  matchId: returnedMatch.id,
                  userId: ctx.userId,
                },
                tx,
              },
            );
          const playersToRemove = foundMatchPlayers.filter(
            (mp) =>
              mp.sharedMatchPlayerId !== null &&
              sharedPlayerIds.includes(mp.sharedMatchPlayerId) &&
              mp.permission === "edit",
          );
          if (playersToRemove.length !== sharedPlayerIds.length) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit all match players.",
            });
          }

          const baseMatchPlayerIds = playersToRemove.map(
            (mp) => mp.baseMatchPlayerId,
          );
          await matchUpdatePlayerTeamRepository.updateMatchPlayersTeam({
            input: {
              matchId: returnedMatch.id,
              matchPlayerIds: baseMatchPlayerIds,
              teamId: null,
            },
            tx,
          });

          for (const playerToRemove of input.playersToRemove) {
            const foundPlayer = playersToRemove.find(
              (mp) =>
                mp.sharedMatchPlayerId === playerToRemove.sharedMatchPlayerId,
            );
            if (!foundPlayer?.sharedMatchPlayerId) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Match Player not set.",
              });
            }

            for (const role of playerToRemove.roles) {
              const returnedSharedRole =
                await sharedGameRepository.getSharedRole({
                  input: {
                    sharedRoleId: role.sharedId,
                  },
                  userId: ctx.userId,
                  tx,
                });
              assertFound(
                returnedSharedRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Shared role not found.",
              );

              await matchUpdatePlayerRoleRepository.deleteSharedMatchPlayerRole(
                {
                  input: {
                    sharedMatchPlayerId: foundPlayer.sharedMatchPlayerId,
                    sharedGameRoleId: returnedSharedRole.id,
                  },
                  tx,
                },
              );

              await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
                input: {
                  matchPlayerId: foundPlayer.baseMatchPlayerId,
                  roleId: returnedSharedRole.gameRoleId,
                },
                tx,
              });
            }
          }
        }

        // Handle playersToUpdate
        if (input.playersToUpdate.length > 0) {
          const sharedPlayerIds = input.playersToUpdate.map(
            (p) => p.sharedMatchPlayerId,
          );
          const foundMatchPlayers =
            await matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser(
              {
                input: {
                  matchId: returnedMatch.id,
                  userId: ctx.userId,
                },
                tx,
              },
            );
          const playersToUpdate = foundMatchPlayers.filter(
            (mp) =>
              mp.sharedMatchPlayerId !== null &&
              sharedPlayerIds.includes(mp.sharedMatchPlayerId) &&
              mp.permission === "edit",
          );
          if (playersToUpdate.length !== sharedPlayerIds.length) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit all match players.",
            });
          }

          // Add roles
          for (const playerToUpdate of input.playersToUpdate) {
            const foundPlayer = playersToUpdate.find(
              (mp) =>
                mp.sharedMatchPlayerId === playerToUpdate.sharedMatchPlayerId,
            );
            if (!foundPlayer?.sharedMatchPlayerId) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Match Player not set.",
              });
            }

            for (const role of playerToUpdate.rolesToAdd) {
              const returnedSharedRole =
                await sharedGameRepository.getSharedRole({
                  input: {
                    sharedRoleId: role.sharedId,
                  },
                  userId: ctx.userId,
                  tx,
                });
              assertFound(
                returnedSharedRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Shared role not found.",
              );

              const existingMatchPlayerRole =
                await matchUpdatePlayerRoleRepository.getMatchPlayerRole({
                  input: {
                    matchPlayerId: foundPlayer.baseMatchPlayerId,
                    roleId: returnedSharedRole.gameRoleId,
                  },
                  tx,
                });
              if (existingMatchPlayerRole) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Shared role already exists.",
                });
              }

              const insertedMatchPlayerRole =
                await matchUpdatePlayerRoleRepository.insertMatchPlayerRole({
                  input: {
                    matchPlayerId: foundPlayer.baseMatchPlayerId,
                    roleId: returnedSharedRole.gameRoleId,
                  },
                  tx,
                });
              assertInserted(
                insertedMatchPlayerRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Failed to create match player role",
              );

              const insertedSharedMatchPlayerRole =
                await matchUpdatePlayerRoleRepository.insertSharedMatchPlayerRole(
                  {
                    input: {
                      sharedMatchPlayerId: foundPlayer.sharedMatchPlayerId,
                      sharedGameRoleId: returnedSharedRole.id,
                    },
                    tx,
                  },
                );
              assertInserted(
                insertedSharedMatchPlayerRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Failed to create shared match player role",
              );
            }
          }

          // Remove roles
          for (const playerToUpdate of input.playersToUpdate) {
            const foundPlayer = playersToUpdate.find(
              (mp) =>
                mp.sharedMatchPlayerId === playerToUpdate.sharedMatchPlayerId,
            );
            if (!foundPlayer?.sharedMatchPlayerId) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Shared Match Player not set.",
              });
            }

            for (const role of playerToUpdate.rolesToRemove) {
              const returnedSharedRole =
                await sharedGameRepository.getSharedRole({
                  input: {
                    sharedRoleId: role.sharedId,
                  },
                  userId: ctx.userId,
                  tx,
                });
              assertFound(
                returnedSharedRole,
                {
                  userId: ctx.userId,
                  value: input,
                },
                "Shared role not found.",
              );

              await matchUpdatePlayerRoleRepository.deleteSharedMatchPlayerRole(
                {
                  input: {
                    sharedMatchPlayerId: foundPlayer.sharedMatchPlayerId,
                    sharedGameRoleId: returnedSharedRole.id,
                  },
                  tx,
                },
              );

              await matchUpdatePlayerRoleRepository.deleteMatchPlayerRole({
                input: {
                  matchPlayerId: foundPlayer.baseMatchPlayerId,
                  roleId: returnedSharedRole.gameRoleId,
                },
                tx,
              });
            }
          }
        }
      }
    });
  }
}

export const matchUpdatePlayerService = new MatchUpdatePlayerService();
