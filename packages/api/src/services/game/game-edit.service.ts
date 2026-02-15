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

interface PendingImageDeletion {
  existingImage: {
    type: string;
    fileId: string | null;
    name: string;
    id: number;
  };
  userId: string;
}

/**
 * Performs the external image deletion side-effects (posthog + deleteFiles)
 * that were collected during the transaction.  Must be called AFTER the
 * transaction commits so a rollback does not leave orphaned file deletions.
 */
const handleImageDeletion = async (args: {
  pending: PendingImageDeletion;
  posthog: EditGameArgs["ctx"]["posthog"];
  deleteFiles: EditGameArgs["ctx"]["deleteFiles"];
}) => {
  const { pending, posthog, deleteFiles } = args;
  const { existingImage, userId } = pending;

  if (existingImage.type !== "file" || !existingImage.fileId) {
    return;
  }

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
};

class GameEditService {
  public async editGame(args: EditGameArgs) {
    const {
      input,
      ctx: { userId, posthog, deleteFiles },
    } = args;

    // Collect file deletions during the transaction; execute after commit.
    const pendingDeletions: PendingImageDeletion[] = [];

    await db.transaction(async (tx) => {
      // Read the game inside the transaction to avoid TOCTOU issues.
      const existingGame = await gameRepository.getGame(
        {
          id: input.game.id,
          createdBy: userId,
        },
        tx,
      );

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
        const filesToDelete = await this.updateGameDetails({
          input: input.game,
          existingGame,
          userId,
          tx,
        });
        pendingDeletions.push(...filesToDelete);
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

    // Perform external file deletions after the transaction commits.
    for (const pending of pendingDeletions) {
      await handleImageDeletion({ pending, posthog, deleteFiles });
    }
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

          if (returnedSharedRole.permission !== "edit") {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to delete this role.",
            });
          }
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

  /**
   * Updates game details inside the transaction, returning any pending image
   * deletions that should be executed after commit.
   */
  private async updateGameDetails(args: {
    input: Extract<EditGameArgs["input"]["game"], { type: "updateGame" }>;
    existingGame: { id: number; imageId: number | null };
    userId: string;
    tx: TransactionType;
  }): Promise<PendingImageDeletion[]> {
    const { input, existingGame, userId, tx } = args;
    const pendingDeletions: PendingImageDeletion[] = [];

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

      const resolved = await this.resolveImageIdForEdit({
        imageInput: input.image,
        existingImage,
        userId,
        tx,
      });
      imageId = resolved.imageId;
      pendingDeletions.push(...resolved.pendingDeletions);
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

    return pendingDeletions;
  }

  /**
   * Resolves the image ID for an edit operation.  Instead of performing file
   * deletions inline, it collects them as PendingImageDeletion entries.
   */
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
    tx: TransactionType;
  }): Promise<{
    imageId: number | null | undefined;
    pendingDeletions: PendingImageDeletion[];
  }> {
    const { imageInput, existingImage, userId, tx } = args;
    const pendingDeletions: PendingImageDeletion[] = [];

    if (imageInput === undefined) {
      return { imageId: undefined, pendingDeletions };
    }

    if (imageInput === null) {
      if (existingImage?.type === "file" && existingImage.fileId) {
        pendingDeletions.push({ existingImage, userId });
      }
      return { imageId: null, pendingDeletions };
    }

    if (imageInput.type === "file") {
      if (existingImage?.type === "file" && existingImage.fileId) {
        pendingDeletions.push({ existingImage, userId });
      }
      return { imageId: imageInput.imageId, pendingDeletions };
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
        return { imageId: existingSvg.id, pendingDeletions };
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
      return { imageId: returnedImage.id, pendingDeletions };
    }

    return { imageId: undefined, pendingDeletions };
  }
}

export const gameEditService = new GameEditService();
