import type { z } from "zod/v4";
import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { editScoresheetSchemaApiInput } from "@board-games/shared";

import type {
  GetGameMatchesOutputType,
  GetGameRolesOutputType,
  GetGameScoresheetsOutputType,
} from "../../routers/game/game.output";
import type {
  CreateGameArgs,
  EditGameArgs,
  GetGameArgs,
  GetGameRolesArgs,
  GetGameScoresheetsArgs,
} from "./game.service.types";
import { gameRepository } from "../../repositories/game/game.repository";
import { imageRepository } from "../../repositories/image/image.repository";
import { scoresheetRepository } from "../../routers/scoresheet/repository/scoresheet.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";

class GameService {
  public async createGame(args: CreateGameArgs) {
    const {
      input,
      ctx: { userId, posthog },
    } = args;
    try {
      const createdGame = await db.transaction(async (tx) => {
        const imageId = await this.resolveImageId({
          imageInput: input.image,
          userId,
          tx,
        });

        const insertedGame = await gameRepository.createGame({
          input: {
            ...input.game,
            imageId,
          },
          userId,
          tx,
        });

        assertInserted(
          insertedGame,
          {
            userId,
            value: input.game,
          },
          "Failed to create game",
        );

        if (input.roles.length > 0) {
          const createdRoles = await gameRepository.createGameRoles({
            input: input.roles.map((role) => ({
              name: role.name,
              description: role.description,
              gameId: insertedGame.id,
              createdBy: userId,
            })),
            tx,
          });
          assertInserted(
            createdRoles.at(0),
            {
              userId,
              value: { roles: input.roles },
            },
            "Failed to create game roles",
          );
        }

        if (input.scoresheets.length === 0) {
          const defaultScoresheet = await scoresheetRepository.insert(
            {
              name: "Default",
              createdBy: userId,
              gameId: insertedGame.id,
              type: "Default",
            },
            tx,
          );
          assertInserted(
            defaultScoresheet,
            {
              userId,
              value: { gameId: insertedGame.id },
            },
            "Failed to create scoresheet",
          );
          const defaultRound = await scoresheetRepository.insertRound(
            {
              name: "Round 1",
              scoresheetId: defaultScoresheet.id,
              type: "Numeric",
              order: 1,
            },
            tx,
          );
          assertInserted(
            defaultRound,
            {
              userId,
              value: { scoresheetId: defaultScoresheet.id },
            },
            "Failed to create round",
          );
        } else {
          for (const inputScoresheet of input.scoresheets) {
            const createdScoresheet = await scoresheetRepository.insert(
              {
                ...inputScoresheet.scoresheet,
                createdBy: userId,
                gameId: insertedGame.id,
                type: "Game",
              },
              tx,
            );
            assertInserted(
              createdScoresheet,
              {
                userId,
                value: { gameId: insertedGame.id },
              },
              "Failed to create scoresheet",
            );

            const rounds = inputScoresheet.rounds.map((round, index) => ({
              ...round,
              scoresheetId: createdScoresheet.id,
              order: index + 1,
            }));
            if (rounds.length > 0) {
              const createdRounds = await scoresheetRepository.insertRounds(
                rounds,
                tx,
              );
              assertInserted(
                createdRounds.at(0),
                {
                  userId,
                  value: { scoresheetId: createdScoresheet.id },
                },
                "Failed to create round",
              );
            }
          }
        }
        return insertedGame;
      });
      await posthog.captureImmediate({
        distinctId: userId,
        event: "game created",
        properties: {
          gameName: createdGame.name,
          gameId: createdGame.id,
        },
      });
      return createdGame;
    } catch (error) {
      await posthog.captureImmediate({
        distinctId: userId,
        event: "game create failure",
        properties: {
          error,
          input,
        },
      });
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create game",
        cause: {
          error,
          input,
        },
      });
    }
  }
  public async getGameMatches(
    args: GetGameArgs,
  ): Promise<GetGameMatchesOutputType> {
    const response = await gameRepository.getGameMatches({
      input: args.input,
      userId: args.ctx.userId,
    });
    if (args.input.type === "original") {
      return response.matches.map((match) => {
        const userMatchPlayer = match.matchPlayers.find(
          (mp) => mp.playerId === response.userPlayer.id,
        );
        if (match.type === "original") {
          if (match.game.type !== "original") {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Game and Match are not of the same type.",
            });
          }

          return {
            ...match,
            game: {
              id: match.game.id,
              type: "original" as const,
              name: match.game.name,
              image: match.game.image,
            },
            type: "original",
            hasUser: userMatchPlayer !== undefined,
            won: userMatchPlayer?.winner ?? false,
            matchPlayers: match.matchPlayers.map((mp) => {
              if (mp.playerType !== "original" || mp.type !== "original") {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message:
                    "Match player and Match are not of the correct type.",
                });
              }
              return {
                id: mp.id,
                playerId: mp.playerId,
                type: "original" as const,
                name: mp.name,
                score: mp.score,
                teamId: mp.teamId,
                placement: mp.placement,
                winner: mp.winner,
                playerType: "original" as const,
                image: mp.image as {
                  name: string;
                  url: string | null;
                  type: "file" | "svg";
                  usageType: "game" | "player" | "match";
                } | null,
              };
            }),
          };
        } else {
          if (match.game.type === "original") {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Game and Match are not of correct type.",
            });
          }
          if (match.game.sharedGameId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Game and Match are not of the correct type.",
            });
          }
          if (match.sharedMatchId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Game and Match are not of the correct type.",
            });
          }
          return {
            ...match,
            sharedMatchId: match.sharedMatchId,
            game: {
              id: match.game.id,
              name: match.game.name,
              image: match.game.image,
              linkedGameId: match.game.linkedGameId,
              sharedGameId: match.game.sharedGameId,
              type:
                match.game.type === "linked"
                  ? ("linked" as const)
                  : ("shared" as const),
            },
            type: "shared",
            hasUser: userMatchPlayer !== undefined,
            won: userMatchPlayer?.winner ?? false,
            matchPlayers: match.matchPlayers.map((mp) => {
              if (mp.playerType === "original" || mp.type !== "shared") {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message:
                    "Match player and Match are not of the correct type.",
                });
              }
              return {
                id: mp.id,
                playerId: mp.playerId,
                type: "shared" as const,
                name: mp.name,
                score: mp.score,
                teamId: mp.teamId,
                placement: mp.placement,
                winner: mp.winner,
                playerType:
                  mp.playerType === "linked"
                    ? ("linked" as const)
                    : mp.playerType === "not-shared"
                      ? ("not-shared" as const)
                      : ("shared" as const),
                sharedPlayerId: mp.sharedPlayerId,
                linkedPlayerId: mp.linkedPlayerId,
                image: mp.image as {
                  name: string;
                  url: string | null;
                  type: "file" | "svg";
                  usageType: "game" | "player" | "match";
                } | null,
              };
            }),
          };
        }
      });
    } else {
      return response.matches.map((match) => {
        const userMatchPlayer = match.matchPlayers.find(
          (mp) => mp.playerId === response.userPlayer.id,
        );

        if (match.game.type === "original") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Game and Match are not of correct type.",
          });
        }
        if (match.game.sharedGameId === null) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Game and Match are not of the correct type.",
          });
        }
        if (match.sharedMatchId === null) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Game and Match are not of the correct type.",
          });
        }
        return {
          ...match,
          sharedMatchId: match.sharedMatchId,
          game: {
            id: match.game.id,
            name: match.game.name,
            image: match.game.image,
            linkedGameId: match.game.linkedGameId,
            sharedGameId: match.game.sharedGameId,
            type:
              match.game.type === "linked"
                ? ("linked" as const)
                : ("shared" as const),
          },
          type: "shared",
          hasUser: userMatchPlayer !== undefined,
          won: userMatchPlayer?.winner ?? false,
          matchPlayers: match.matchPlayers.map((mp) => {
            if (mp.playerType === "original" || mp.type !== "shared") {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Match player and Match are not of the correct type.",
              });
            }
            return {
              id: mp.id,
              playerId: mp.playerId,
              type: "shared" as const,
              name: mp.name,
              score: mp.score,
              teamId: mp.teamId,
              placement: mp.placement,
              winner: mp.winner,
              playerType:
                mp.playerType === "linked"
                  ? ("linked" as const)
                  : mp.playerType === "not-shared"
                    ? ("not-shared" as const)
                    : ("shared" as const),
              sharedPlayerId: mp.sharedPlayerId,
              linkedPlayerId: mp.linkedPlayerId,
              image: mp.image as {
                name: string;
                url: string | null;
                type: "file" | "svg";
                usageType: "game" | "player" | "match";
              } | null,
            };
          }),
        };
      });
    }
  }

  public async getGameRoles(
    args: GetGameRolesArgs,
  ): Promise<GetGameRolesOutputType> {
    const response = await db.transaction(async (tx) => {
      let canonicalGameId: null | number = null;
      if (args.input.type === "original") {
        const returnedGame = await gameRepository.getGame(
          {
            id: args.input.id,
            createdBy: args.ctx.userId,
          },
          tx,
        );
        assertFound(
          returnedGame,
          {
            userId: args.ctx.userId,
            value: args.input,
          },
          "Game not found.",
        );
        canonicalGameId = returnedGame.id;
      } else {
        const returnedSharedGame = await gameRepository.getSharedGame(
          {
            id: args.input.sharedGameId,
            sharedWithId: args.ctx.userId,
          },
          tx,
        );
        assertFound(
          returnedSharedGame,
          {
            userId: args.ctx.userId,
            value: args.input,
          },
          "Shared game not found.",
        );
        canonicalGameId =
          returnedSharedGame.linkedGameId ?? returnedSharedGame.gameId;
      }
      if (!canonicalGameId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to find canonical game.",
        });
      }
      return gameRepository.getGameRoles({
        input: {
          sourceType: args.input.type,
          canonicalGameId,
        },
        userId: args.ctx.userId,
        tx: tx,
      });
    });
    const uniqueRoles = new Map<
      string,
      | {
          id: number;
          name: string;
          description: string | null;
          type: "original";
          permission: "edit";
        }
      | {
          name: string;
          description: string | null;
          type: "shared";
          sharedId: number;
          permission: "view" | "edit";
        }
    >();
    for (const role of response.rows) {
      if (role.type === "original" || role.type === "shared") {
        const existing = uniqueRoles.get(`${role.type}-${role.roleId}`);
        if (existing) {
          continue;
        }
        if (role.type === "original") {
          uniqueRoles.set(`${role.type}-${role.roleId}`, {
            type: "original",
            id: role.roleId,
            name: role.name,
            description: role.description,
            permission: "edit",
          });
        } else {
          if (role.sharedRoleId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared role not found.",
            });
          }
          uniqueRoles.set(`${role.type}-${role.roleId}`, {
            type: "shared",
            sharedId: role.sharedRoleId,
            name: role.name,
            description: role.description,
            permission: role.permission,
          });
        }
      }
    }
    return Array.from(uniqueRoles.values());
  }

  public async getGameScoresheets(
    args: GetGameScoresheetsArgs,
  ): Promise<GetGameScoresheetsOutputType> {
    const { input, ctx } = args;
    const response = await db.transaction(async (tx) => {
      if (input.type === "original") {
        const returnedGame = await gameRepository.getGame(
          {
            id: input.id,
            createdBy: ctx.userId,
            with: {
              linkedGames: {
                where: {
                  sharedWithId: ctx.userId,
                },
              },
            },
          },
          tx,
        );
        if (!returnedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found.",
          });
        }
        const originalScoresheets = await scoresheetRepository.getAll(
          {
            createdBy: ctx.userId,
            gameId: returnedGame.id,
          },
          tx,
        );
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: ctx.userId,
            where: {
              sharedGameId: {
                in: returnedGame.linkedGames.map((lg) => lg.id),
              },
            },
          },
          tx,
        );
        const mappedOriginalScoresheets = originalScoresheets.map(
          (scoresheet) => {
            return {
              id: scoresheet.id,
              name: scoresheet.name,
              type: "original" as const,
              isDefault: scoresheet.type === "Default",
            };
          },
        );
        const mappedSharedScoresheets = sharedScoresheets.map(
          (sharedScoresheet) => {
            return {
              sharedId: sharedScoresheet.id,
              name: sharedScoresheet.scoresheet.name,
              type: "shared" as const,
              isDefault: sharedScoresheet.isDefault,
            };
          },
        );
        const combinedScoresheets = [
          ...mappedOriginalScoresheets,
          ...mappedSharedScoresheets,
        ];
        combinedScoresheets.sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return a.name.localeCompare(b.name);
        });
        return combinedScoresheets;
      } else {
        const returnedSharedGame = await gameRepository.getSharedGame(
          {
            id: input.sharedGameId,
            sharedWithId: ctx.userId,
          },
          tx,
        );
        if (!returnedSharedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared game not found.",
          });
        }
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: ctx.userId,
            where: {
              sharedGameId: returnedSharedGame.id,
            },
          },
          tx,
        );
        return sharedScoresheets
          .map((sharedScoresheet) => {
            return {
              sharedId: sharedScoresheet.id,
              name: sharedScoresheet.scoresheet.name,
              type: "shared" as const,
              isDefault: sharedScoresheet.isDefault,
            };
          })
          .sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name);
          });
      }
    });
    return response;
  }
  public async editGame(args: EditGameArgs) {
    const {
      input,
      ctx: { userId, posthog, deleteFiles },
    } = args;

    const existingGame = await gameRepository.getGame({
      id: input.game.id,
      createdBy: userId,
    });

    assertFound(
      existingGame,
      {
        userId,
        value: input.game,
      },
      "Game not found.",
    );

    await db.transaction(async (tx) => {
      await this.updateGameRoles({
        input: {
          updatedRoles: input.updatedRoles,
          newRoles: input.newRoles,
          deletedRoles: input.deletedRoles,
        },
        gameId: existingGame.id,
        userId,
        tx,
      });

      if (input.game.type === "updateGame") {
        await this.updateGameDetails({
          input: input.game,
          existingGame,
          userId,
          posthog,
          deleteFiles,
          tx,
        });
      }

      if (input.scoresheets.length > 0) {
        await this.updateScoresheets({
          input: input.scoresheets,
          gameId: existingGame.id,
          userId,
          tx,
        });
      }

      if (input.scoresheetsToDelete.length > 0) {
        await this.deleteScoresheets({
          input: input.scoresheetsToDelete,
          userId,
          tx,
        });
      }
    });
  }

  private async updateGameRoles(args: {
    input: {
      updatedRoles: EditGameArgs["input"]["updatedRoles"];
      newRoles: EditGameArgs["input"]["newRoles"];
      deletedRoles: EditGameArgs["input"]["deletedRoles"];
    };
    gameId: number;
    userId: string;
    tx: TransactionType;
  }) {
    const { input, gameId, userId, tx } = args;

    if (input.updatedRoles.length > 0) {
      for (const updatedRole of input.updatedRoles) {
        await gameRepository.updateGameRole({
          input: {
            id: updatedRole.id,
            name: updatedRole.name,
            description: updatedRole.description,
          },
          tx,
        });
      }
    }

    if (input.newRoles.length > 0) {
      await gameRepository.createGameRoles({
        input: input.newRoles.map((newRole) => ({
          name: newRole.name,
          description: newRole.description,
          gameId,
          createdBy: userId,
        })),
        tx,
      });
    }

    if (input.deletedRoles.length > 0) {
      await gameRepository.deleteGameRole({
        input: {
          gameId,
          roleIds: input.deletedRoles,
        },
        tx,
      });
    }
  }

  private async updateGameDetails(args: {
    input: Extract<EditGameArgs["input"]["game"], { type: "updateGame" }>;
    existingGame: { id: number; imageId: number | null };
    userId: string;
    posthog: EditGameArgs["ctx"]["posthog"];
    deleteFiles: EditGameArgs["ctx"]["deleteFiles"];
    tx: TransactionType;
  }) {
    const { input, existingGame, userId, posthog, deleteFiles, tx } = args;

    let imageId: number | null | undefined = undefined;
    if (input.image !== undefined) {
      const existingImage = existingGame.imageId
        ? await imageRepository.getById(
            {
              id: existingGame.imageId,
            },
            tx,
          )
        : null;

      imageId = await this.resolveImageIdForEdit({
        imageInput: input.image,
        existingImage,
        userId,
        posthog,
        deleteFiles,
        tx,
      });
    }

    await gameRepository.updateGame({
      input: {
        id: existingGame.id,
        name: input.name,
        ownedBy: input.ownedBy,
        playersMin: input.playersMin,
        playersMax: input.playersMax,
        playtimeMin: input.playtimeMin,
        playtimeMax: input.playtimeMax,
        yearPublished: input.yearPublished,
        imageId,
      },
      tx,
    });
  }

  private async resolveImageIdForEdit(args: {
    imageInput: Extract<
      EditGameArgs["input"]["game"],
      { type: "updateGame" }
    >["image"];
    existingImage:
      | {
          type: string;
          fileId: string | null;
          name: string;
          id: number;
        }
      | null
      | undefined;
    userId: string;
    posthog: EditGameArgs["ctx"]["posthog"];
    deleteFiles: EditGameArgs["ctx"]["deleteFiles"];
    tx: TransactionType;
  }): Promise<number | null | undefined> {
    const { imageInput, existingImage, userId, posthog, deleteFiles, tx } =
      args;
    if (imageInput === undefined) {
      return undefined;
    }

    if (imageInput === null) {
      if (existingImage?.type === "file" && existingImage.fileId) {
        await posthog.captureImmediate({
          distinctId: userId,
          event: "uploadthing begin image delete",
          properties: {
            imageName: existingImage.name,
            imageId: existingImage.id,
            fileId: existingImage.fileId,
          },
        });
        const result = await deleteFiles(existingImage.fileId);
        if (!result.success) {
          await posthog.captureImmediate({
            distinctId: userId,
            event: "uploadthing image delete error",
            properties: {
              imageName: existingImage.name,
              imageId: existingImage.id,
              fileId: existingImage.fileId,
            },
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }
      return null;
    }

    if (imageInput.type === "file") {
      if (existingImage?.type === "file" && existingImage.fileId) {
        await posthog.captureImmediate({
          distinctId: userId,
          event: "uploadthing begin image delete",
          properties: {
            imageName: existingImage.name,
            imageId: existingImage.id,
            fileId: existingImage.fileId,
          },
        });
        const result = await deleteFiles(existingImage.fileId);
        if (!result.success) {
          await posthog.captureImmediate({
            distinctId: userId,
            event: "uploadthing image delete error",
            properties: {
              imageName: existingImage.name,
              imageId: existingImage.id,
              fileId: existingImage.fileId,
            },
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }
      return imageInput.imageId;
    }

    if (imageInput.type === "svg") {
      const existingSvg = await imageRepository.findFirst(
        {
          name: imageInput.name,
          type: "svg",
          usageType: "game",
        },
        tx,
      );
      if (existingSvg) {
        return existingSvg.id;
      }
      const returnedImage = await imageRepository.insert(
        {
          type: "svg",
          name: imageInput.name,
          usageType: "game",
        },
        tx,
      );
      assertInserted(
        returnedImage,
        {
          userId,
          value: { image: imageInput },
        },
        "Failed to create image",
      );
      return returnedImage.id;
    }

    return undefined;
  }

  private async updateScoresheets(args: {
    input: EditGameArgs["input"]["scoresheets"];
    gameId: number;
    userId: string;
    tx: TransactionType;
  }) {
    const { input, gameId, userId, tx } = args;

    for (const inputScoresheet of input) {
      if (inputScoresheet.type === "New") {
        const returnedScoresheet = await scoresheetRepository.insert(
          {
            name: inputScoresheet.scoresheet.name,
            winCondition: inputScoresheet.scoresheet.winCondition,
            isCoop: inputScoresheet.scoresheet.isCoop,
            roundsScore: inputScoresheet.scoresheet.roundsScore,
            targetScore: inputScoresheet.scoresheet.targetScore,
            createdBy: userId,
            gameId,
            type: "Game",
          },
          tx,
        );
        assertInserted(
          returnedScoresheet,
          {
            userId,
            value: { gameId },
          },
          "Failed to create scoresheet",
        );

        const roundsToInsert = inputScoresheet.rounds.map((round, index) => ({
          name: round.name,
          type: round.type,
          score: round.score,
          color: round.color,
          lookup: round.lookup,
          modifier: round.modifier,
          scoresheetId: returnedScoresheet.id,
          order: index + 1,
        }));
        await scoresheetRepository.insertRounds(roundsToInsert, tx);
      }

      if (inputScoresheet.type === "Update Scoresheet") {
        if (inputScoresheet.scoresheet.scoresheetType === "original") {
          const originalScoresheet = inputScoresheet.scoresheet;
          const scoresheetId = (
            originalScoresheet.scoresheet as { id: number; isDefault?: boolean }
          ).id;
          const isDefault =
            (
              originalScoresheet.scoresheet as {
                id: number;
                isDefault?: boolean;
              }
            ).isDefault ?? false;
          await scoresheetRepository.update(
            {
              input: {
                id: scoresheetId,
                name: originalScoresheet.name,
                winCondition: originalScoresheet.winCondition,
                isCoop: originalScoresheet.isCoop,
                type: isDefault ? "Default" : "Game",
                roundsScore: originalScoresheet.roundsScore,
                targetScore: originalScoresheet.targetScore,
              },
              tx,
            },
          );
        } else {
          const sharedScoresheetInput = inputScoresheet.scoresheet;
          const sharedScoresheetId = (
            sharedScoresheetInput.scoresheet as {
              id: number;
              isDefault?: boolean;
            }
          ).id;
          const isDefault =
            (
              sharedScoresheetInput.scoresheet as {
                id: number;
                isDefault?: boolean;
              }
            ).isDefault ?? false;
          const returnedSharedScoresheet = await scoresheetRepository.getShared(
            {
              id: sharedScoresheetId,
              sharedWithId: userId,
            },
            tx,
          );
          if (!returnedSharedScoresheet) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shared scoresheet not found.",
            });
          }
          if (returnedSharedScoresheet.permission === "edit") {
            await scoresheetRepository.update(
              {
                input: {
                  id: returnedSharedScoresheet.scoresheetId,
                  name: sharedScoresheetInput.name,
                  winCondition: sharedScoresheetInput.winCondition,
                  isCoop: sharedScoresheetInput.isCoop,
                  roundsScore: sharedScoresheetInput.roundsScore,
                  targetScore: sharedScoresheetInput.targetScore,
                },
                tx,
              },
            );
          }
          await scoresheetRepository.updateShared(
            {
              input: {
                id: returnedSharedScoresheet.id,
                isDefault,
              },
              tx,
            },
          );
        }
      }

      if (inputScoresheet.type === "Update Scoresheet & Rounds") {
        let scoresheetId: number | undefined = undefined;
        let sharedScoresheetId: number | undefined = undefined;
        let scoresheetPermission: "view" | "edit" = "view";

        if (inputScoresheet.scoresheet.scoresheetType === "original") {
          const originalScoresheet = inputScoresheet.scoresheet;
          if ("id" in originalScoresheet) {
            scoresheetId = originalScoresheet.id as number;
          }
          scoresheetPermission = "edit";
        } else {
          const sharedScoresheetInput = inputScoresheet.scoresheet;
          if ("id" in sharedScoresheetInput) {
            const returnedSharedScoresheet = await scoresheetRepository.getShared(
              {
                id: sharedScoresheetInput.id as number,
                sharedWithId: userId,
              },
              tx,
            );
            if (!returnedSharedScoresheet) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shared scoresheet not found.",
              });
            }
            scoresheetId = returnedSharedScoresheet.scoresheetId;
            sharedScoresheetId = returnedSharedScoresheet.id;
            scoresheetPermission = returnedSharedScoresheet.permission;
          }
        }

        if ("name" in inputScoresheet.scoresheet && scoresheetId) {
          const scoresheetData = inputScoresheet.scoresheet;
          if (scoresheetPermission === "edit") {
            const scoresheetType = () => {
              if (
                scoresheetData.scoresheetType === "original" &&
                "isDefault" in scoresheetData
              ) {
                return (scoresheetData.isDefault as boolean)
                  ? "Default"
                  : "Game";
              }
              return undefined;
            };
            await scoresheetRepository.update(
              {
                input: {
                  id: scoresheetId,
                  name: scoresheetData.name,
                  winCondition: scoresheetData.winCondition,
                  isCoop: scoresheetData.isCoop,
                  type: scoresheetType(),
                  roundsScore: scoresheetData.roundsScore,
                  targetScore: scoresheetData.targetScore,
                },
                tx,
              },
            );
          }
          if (
            scoresheetData.scoresheetType === "shared" &&
            sharedScoresheetId &&
            "isDefault" in scoresheetData
          ) {
            await scoresheetRepository.updateShared(
              {
                input: {
                  id: sharedScoresheetId,
                  isDefault: scoresheetData.isDefault as boolean,
                },
                tx,
              },
            );
          }
        }

        if (
          inputScoresheet.roundsToEdit.length > 0 &&
          scoresheetPermission === "edit"
        ) {
          await this.bulkUpdateRounds({
            roundsToEdit: inputScoresheet.roundsToEdit,
            tx,
          });
        }

        if (
          inputScoresheet.roundsToAdd.length > 0 &&
          scoresheetPermission === "edit"
        ) {
          await scoresheetRepository.insertRounds(
            inputScoresheet.roundsToAdd,
            tx,
          );
        }

        if (
          inputScoresheet.roundsToDelete.length > 0 &&
          scoresheetPermission === "edit"
        ) {
          await scoresheetRepository.deleteRounds(
            {
              input: {
                ids: inputScoresheet.roundsToDelete,
              },
              tx,
            },
          );
        }
      }
    }
  }

  private async bulkUpdateRounds(args: {
    roundsToEdit: Extract<
      z.infer<typeof editScoresheetSchemaApiInput>,
      { type: "Update Scoresheet & Rounds" }
    >["roundsToEdit"];
    tx: TransactionType;
  }) {
    const { roundsToEdit, tx } = args;
    await scoresheetRepository.updateRounds(
      {
        input: roundsToEdit.map((round) => ({
          id: round.id,
          name: round.name,
          score: round.score,
          type: round.type,
          color: round.color,
          lookup: round.lookup,
          modifier: round.modifier,
        })),
        tx,
      },
    );
  }

  private async deleteScoresheets(args: {
    input: EditGameArgs["input"]["scoresheetsToDelete"];
    userId: string;
    tx: TransactionType;
  }) {
    const { input, userId, tx } = args;
    const sharedScoresheetsToDelete = input.filter(
      (scoresheetDelete) => scoresheetDelete.scoresheetType === "shared",
    );
    const originalScoresheetsToDelete = input.filter(
      (scoresheetDelete) => scoresheetDelete.scoresheetType === "original",
    );

    if (originalScoresheetsToDelete.length > 0) {
      for (const scoresheetToDelete of originalScoresheetsToDelete) {
        await scoresheetRepository.deleteScoresheet(
          {
            input: {
              id: scoresheetToDelete.id,
              createdBy: userId,
            },
            tx,
          },
        );
      }
    }

    if (sharedScoresheetsToDelete.length > 0) {
      for (const sharedScoresheetToDelete of sharedScoresheetsToDelete) {
        await scoresheetRepository.deleteSharedScoresheet(
          {
            input: {
              id: sharedScoresheetToDelete.id,
            },
            tx,
          },
        );
      }
    }
  }

  private async resolveImageId(args: {
    imageInput: CreateGameArgs["input"]["image"];
    userId: string;
    tx: TransactionType;
  }): Promise<number | null> {
    const { imageInput, tx, userId } = args;
    if (!imageInput) {
      return null;
    }
    if (imageInput.type === "file") {
      return imageInput.imageId;
    }

    const existingSvg = await imageRepository.findFirst(
      {
        name: imageInput.name,
        type: "svg",
        usageType: "game",
      },
      tx,
    );
    if (existingSvg) {
      return existingSvg.id;
    }
    const returnedImage = await imageRepository.insert(
      {
        type: "svg",
        name: imageInput.name,
        usageType: "game",
      },
      tx,
    );
    assertInserted(
      returnedImage,
      {
        userId,
        value: { image: imageInput },
      },
      "Failed to create image",
    );
    return returnedImage.id;
  }
}
export const gameService = new GameService();
