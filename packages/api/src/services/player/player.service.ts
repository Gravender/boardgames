import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";

import type {
  GetPlayersForMatchOutputType,
  GetRecentMatchWithPlayersOutputType,
} from "../../routers/player/player.output";
import type {
  CreatePlayerArgs,
  GetPlayersForMatchArgs,
  GetRecentMatchWithPlayersArgs,
  UpdatePlayerArgs,
} from "./player.service.types";
import { imageRepository } from "../../repositories/image/image.repository";
import { playerRepository } from "../../repositories/player/player.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import { mapPlayer, sortPlayersForMatch } from "./player-match-sorting";

class PlayerService {
  private async getAuthorizedImageById(args: {
    imageId: number;
    userId: string;
    tx?: TransactionType;
  }) {
    const returnedImage = await imageRepository.getById(
      {
        id: args.imageId,
      },
      args.tx,
    );
    assertFound(
      returnedImage,
      {
        userId: args.userId,
        value: {
          imageId: args.imageId,
        },
      },
      "Image not found.",
    );

    if (returnedImage.createdBy && returnedImage.createdBy !== args.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authorized to use this image.",
      });
    }
    return returnedImage;
  }

  public async getPlayersForMatch(
    args: GetPlayersForMatchArgs,
  ): Promise<GetPlayersForMatchOutputType> {
    const response = await playerRepository.getPlayersForMatch({
      createdBy: args.ctx.userId,
    });

    const now = new Date();

    const mappedOriginalPlayers = response.originalPlayers.map((player) => {
      const sharedMatches = player.sharedLinkedPlayers.flatMap((sp) =>
        sp.sharedMatchPlayers.map((sMp) => sMp.match),
      );
      const originalMatches = player.matchPlayers.map((mp) => mp.match);
      const mergedMatches = [...originalMatches, ...sharedMatches];

      const mappedBase = mapPlayer({
        base: {
          name: player.name,
          image: player.image,
          isUser: player.isUser,
          matches: mergedMatches,
        },
        now,
      });

      return {
        id: player.id,
        type: "original" as const,
        ...mappedBase,
      };
    });

    const mappedSharedPlayers = response.sharedPlayers.map((sharedPlayer) => {
      const matches = sharedPlayer.sharedMatchPlayers.map((sMp) => sMp.match);
      const mappedBase = mapPlayer({
        base: {
          name: sharedPlayer.player.name,
          image: sharedPlayer.player.image,
          isUser: false,
          matches,
        },
        now,
      });

      return {
        sharedId: sharedPlayer.id,
        type: "shared" as const,
        ...mappedBase,
      };
    });

    const combinedPlayers = [...mappedOriginalPlayers, ...mappedSharedPlayers];
    const sortedPlayers = sortPlayersForMatch(combinedPlayers);

    return {
      players: sortedPlayers,
    };
  }

  public async getRecentMatchWithPlayers(
    args: GetRecentMatchWithPlayersArgs,
  ): Promise<GetRecentMatchWithPlayersOutputType> {
    const response = await playerRepository.getRecentMatchWithPlayers({
      createdBy: args.ctx.userId,
    });
    return {
      recentMatches: response,
    };
  }

  public async createPlayer(args: CreatePlayerArgs) {
    if (typeof args.input.imageId === "number") {
      await this.getAuthorizedImageById({
        imageId: args.input.imageId,
        userId: args.ctx.userId,
      });
    }

    const returnedPlayer = await playerRepository.insert({
      input: {
        createdBy: args.ctx.userId,
        imageId: args.input.imageId,
        name: args.input.name,
      },
    });
    assertInserted(
      returnedPlayer,
      {
        userId: args.ctx.userId,
        value: args.input,
      },
      "Failed to create player",
    );

    const returnedPlayerImage = await playerRepository.getPlayer({
      id: returnedPlayer.id,
      createdBy: args.ctx.userId,
      with: {
        image: true,
      },
    });

    return {
      id: returnedPlayer.id,
      name: returnedPlayer.name,
      image: returnedPlayerImage?.image ?? null,
      matches: 0,
      team: 0,
    };
  }

  public async updatePlayer(args: UpdatePlayerArgs) {
    const {
      ctx: { userId, posthog, deleteFiles },
      input,
    } = args;

    const imageToDeleteMetadata = await db.transaction(async (tx) => {
      if (input.type === "shared") {
        const returnedSharedPlayer = await playerRepository.getSharedPlayer(
          {
            id: input.id,
            sharedWithId: userId,
            with: {
              player: true,
            },
          },
          tx,
        );
        assertFound(
          returnedSharedPlayer,
          {
            userId,
            value: input,
          },
          "Player not found.",
        );
        if (returnedSharedPlayer.permission !== "edit") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Does not have permission to edit this player.",
          });
        }

        const updatedSharedPlayer = await playerRepository.update({
          input: {
            id: returnedSharedPlayer.player.id,
            createdBy: returnedSharedPlayer.ownerId,
            name: input.name,
          },
          tx,
        });
        assertFound(
          updatedSharedPlayer,
          {
            userId,
            value: input,
          },
          "Player not found.",
        );
        return null;
      }

      const existingPlayer = await playerRepository.getPlayer(
        {
          id: input.id,
          createdBy: userId,
        },
        tx,
      );
      assertFound(
        existingPlayer,
        {
          userId,
          value: input,
        },
        "Player not found.",
      );

      const nextName =
        input.updateValues.type === "name" ||
        input.updateValues.type === "nameAndImageId" ||
        input.updateValues.type === "nameAndClearImage"
          ? input.updateValues.name
          : undefined;
      const nextImageId =
        input.updateValues.type === "imageId" ||
        input.updateValues.type === "nameAndImageId"
          ? input.updateValues.imageId
          : input.updateValues.type === "clearImage" ||
              input.updateValues.type === "nameAndClearImage"
            ? null
            : undefined;

      if (typeof nextImageId === "number") {
        await this.getAuthorizedImageById({
          imageId: nextImageId,
          userId,
          tx,
        });
      }

      const previousImageId = existingPlayer.imageId;
      const imageUpdateRequested = nextImageId !== undefined;
      const shouldDeleteExistingImage =
        imageUpdateRequested &&
        previousImageId !== null &&
        previousImageId !== nextImageId;
      const updatedPlayer = await playerRepository.update({
        input: {
          id: input.id,
          createdBy: userId,
          name: nextName,
          imageId: nextImageId,
        },
        tx,
      });
      assertFound(
        updatedPlayer,
        {
          userId,
          value: input,
        },
        "Player not found.",
      );

      if (!shouldDeleteExistingImage) {
        return null;
      }

      const imageToDelete = await this.getAuthorizedImageById({
        imageId: previousImageId,
        userId,
        tx,
      });
      if (imageToDelete.type !== "file" || !imageToDelete.fileId) {
        return null;
      }

      return {
        imageName: imageToDelete.name,
        imageId: imageToDelete.id,
        fileId: imageToDelete.fileId,
      };
    });

    if (!imageToDeleteMetadata) {
      return;
    }

    await posthog.captureImmediate({
      distinctId: userId,
      event: "uploadthing begin image delete",
      properties: {
        imageName: imageToDeleteMetadata.imageName,
        imageId: imageToDeleteMetadata.imageId,
        fileId: imageToDeleteMetadata.fileId,
      },
    });

    const result = await deleteFiles(imageToDeleteMetadata.fileId);
    if (!result.success) {
      await posthog.captureImmediate({
        distinctId: userId,
        event: "uploadthing image delete error",
        properties: {
          imageName: imageToDeleteMetadata.imageName,
          imageId: imageToDeleteMetadata.imageId,
          fileId: imageToDeleteMetadata.fileId,
        },
      });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }
}

export const playerService = new PlayerService();
