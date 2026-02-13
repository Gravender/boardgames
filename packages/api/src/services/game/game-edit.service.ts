import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";

import type { EditGameArgs } from "./game.service.types";
import { gameRoleRepository } from "../../repositories/game/game-role.repository";
import { gameRepository } from "../../repositories/game/game.repository";
import { imageRepository } from "../../repositories/image/image.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import {
  deleteScoresheets,
  updateScoresheets,
} from "./game-scoresheet-edit.service";

class GameEditService {
  public async editGame(args: EditGameArgs) {
    const {
      input,
      ctx: { userId, posthog, deleteFiles },
    } = args;

    await db.transaction(async (tx) => {
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
        await updateScoresheets({
          input: input.scoresheets,
          gameId: existingGame.id,
          userId,
          tx,
        });
      }

      if (input.scoresheetsToDelete.length > 0) {
        await deleteScoresheets({
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
      const originalRoles = input.updatedRoles.filter(
        (role) => role.type === "original",
      );
      const sharedRoles = input.updatedRoles.filter(
        (role) => role.type === "shared",
      );
      for (const originalRole of originalRoles) {
        await gameRoleRepository.updateGameRole({
          input: originalRole,
          tx,
        });
      }
      for (const sharedRole of sharedRoles) {
        const returnedSharedRole = await gameRoleRepository.getSharedRole({
          input: {
            sharedRoleId: sharedRole.sharedId,
          },
          userId,
          tx,
        });
        assertFound(
          returnedSharedRole,
          {
            userId,
            value: sharedRole,
          },
          "Shared role not found.",
        );

        if (returnedSharedRole.permission !== "edit") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Does not have permission to edit this role.",
          });
        }

        await gameRoleRepository.updateGameRole({
          input: {
            id:
              returnedSharedRole.linkedGameRoleId ??
              returnedSharedRole.gameRoleId,
            name: sharedRole.name,
            description: sharedRole.description,
          },
          tx,
        });
      }
    }

    if (input.newRoles.length > 0) {
      await gameRoleRepository.createGameRoles({
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
      const originalRoles = input.deletedRoles.filter(
        (role) => role.type === "original",
      );
      const sharedRoles = input.deletedRoles.filter(
        (role) => role.type === "shared",
      );

      if (originalRoles.length > 0) {
        await gameRoleRepository.deleteGameRole({
          input: {
            gameId,
            roleIds: originalRoles.map((role) => role.id),
          },
          tx,
        });
      }

      if (sharedRoles.length > 0) {
        // Verify shared roles exist and user has permission before deleting
        for (const sharedRole of sharedRoles) {
          const returnedSharedRole = await gameRoleRepository.getSharedRole({
            input: {
              sharedRoleId: sharedRole.sharedId,
            },
            userId,
            tx,
          });
          assertFound(
            returnedSharedRole,
            {
              userId,
              value: sharedRole,
            },
            "Shared role not found.",
          );
        }

        await gameRoleRepository.deleteSharedGameRole({
          input: {
            sharedRoleIds: sharedRoles.map((role) => role.sharedId),
          },
          tx,
        });
      }
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
}

export const gameEditService = new GameEditService();
