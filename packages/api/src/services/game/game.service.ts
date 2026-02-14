import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";

import type {
  DeleteGameOutputType,
  GetGameOutputType,
} from "../../routers/game/game.output";
import type {
  CreateGameArgs,
  DeleteGameArgs,
  GetGameArgs,
} from "./game.service.types";
import { gameRoleRepository } from "../../repositories/game/game-role.repository";
import { gameRepository } from "../../repositories/game/game.repository";
import { imageRepository } from "../../repositories/image/image.repository";
import { roundRepository } from "../../repositories/scoresheet/round.repository";
import { scoresheetRepository } from "../../repositories/scoresheet/scoresheet.repository";
import { friendRepository } from "../../repositories/social/friend.repository";
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
          const createdRoles = await gameRoleRepository.createGameRoles({
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
          const defaultRound = await roundRepository.insertRound({
            input: {
              name: "Round 1",
              scoresheetId: defaultScoresheet.id,
              type: "Numeric",
              order: 1,
            },
            tx,
          });
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
              const createdRounds = await roundRepository.insertRounds({
                input: rounds,
                tx,
              });
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

  public async getGame(args: GetGameArgs): Promise<GetGameOutputType> {
    const { input, ctx } = args;
    const result = await db.transaction(async (tx) => {
      if (input.type === "original") {
        const returnedGame = await gameRepository.getGame(
          {
            id: input.id,
            createdBy: ctx.userId,
            with: {
              image: true,
            },
          },
          tx,
        );
        assertFound(
          returnedGame,
          {
            userId: ctx.userId,
            value: input,
          },
          "Game not found",
        );
        if (returnedGame.image?.usageType !== "game") {
          await ctx.posthog.captureImmediate({
            distinctId: ctx.userId,
            event: "game image not found",
            properties: {
              gameId: returnedGame.id,
            },
          });
        }
        return {
          type: "original" as const,
          id: returnedGame.id,
          name: returnedGame.name,
          image:
            returnedGame.image?.usageType === "game"
              ? {
                  name: returnedGame.image.name,
                  url: returnedGame.image.url,
                  type: returnedGame.image.type,
                  usageType: "game" as const,
                }
              : null,
          players: {
            min: returnedGame.playersMin,
            max: returnedGame.playersMax,
          },
          playtime: {
            min: returnedGame.playtimeMin,
            max: returnedGame.playtimeMax,
          },
          yearPublished: returnedGame.yearPublished,
          ownedBy: returnedGame.ownedBy,
        };
      } else {
        const returnedSharedGame = await gameRepository.getSharedGame(
          {
            id: input.sharedGameId,
            sharedWithId: ctx.userId,
            with: {
              game: {
                with: {
                  image: true,
                },
              },
            },
          },
          tx,
        );
        assertFound(
          returnedSharedGame,
          {
            userId: ctx.userId,
            value: input,
          },
          "Shared game not found",
        );
        const sharedBy = await friendRepository.get(
          {
            userId: ctx.userId,
            friendId: returnedSharedGame.ownerId,
            with: {
              friendPlayer: {
                columns: {
                  id: true,
                  name: true,
                },
              },
              friend: {
                columns: {
                  id: true,
                  name: true,
                  username: true,
                },
              },
            },
          },
          tx,
        );
        assertFound(
          sharedBy,
          {
            userId: ctx.userId,
            value: input,
          },
          "Shared by not found",
        );
        if (returnedSharedGame.game.image?.usageType !== "game") {
          await ctx.posthog.captureImmediate({
            distinctId: ctx.userId,
            event: "game image not found",
            properties: {
              gameId: returnedSharedGame.game.id,
            },
          });
        }
        return {
          type: "shared" as const,
          id: returnedSharedGame.game.id,
          sharedGameId: returnedSharedGame.id,
          name: returnedSharedGame.game.name,
          image:
            returnedSharedGame.game.image?.usageType === "game"
              ? {
                  name: returnedSharedGame.game.image.name,
                  url: returnedSharedGame.game.image.url,
                  type: returnedSharedGame.game.image.type,
                  usageType: "game" as const,
                }
              : null,
          players: {
            min: returnedSharedGame.game.playersMin,
            max: returnedSharedGame.game.playersMax,
          },
          playtime: {
            min: returnedSharedGame.game.playtimeMin,
            max: returnedSharedGame.game.playtimeMax,
          },
          yearPublished: returnedSharedGame.game.yearPublished,
          ownedBy: returnedSharedGame.game.ownedBy,
          permission: returnedSharedGame.permission,
          sharedBy: {
            id: sharedBy.friend.id,
            name: sharedBy.friend.name,
            username: sharedBy.friend.username,
            player: sharedBy.friendPlayer
              ? {
                  id: sharedBy.friendPlayer.id,
                  name: sharedBy.friendPlayer.name,
                }
              : null,
          },
        };
      }
    });
    return result;
  }

  public async deleteGame(args: DeleteGameArgs): Promise<DeleteGameOutputType> {
    const { input, ctx } = args;
    const result = await gameRepository.softDeleteGame({
      gameId: input.id,
      userId: ctx.userId,
    });
    await ctx.posthog.captureImmediate({
      distinctId: ctx.userId,
      event: "game delete",
      properties: {
        gameName: result.name,
        gameId: result.id,
      },
    });
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
