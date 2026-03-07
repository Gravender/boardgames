import { TRPCError } from "@trpc/server";
import { differenceInDays, isSameDay, max } from "date-fns";

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

class PlayerService {
  public async getPlayersForMatch(
    args: GetPlayersForMatchArgs,
  ): Promise<GetPlayersForMatchOutputType> {
    const response = await playerRepository.getPlayersForMatch({
      createdBy: args.ctx.userId,
    });

    const now = new Date();
    const ninetyDays = 90;
    const halfLifeInDays = 30;

    const recencyWeight = (date: Date): number => {
      const daysAgo = differenceInDays(now, date);
      return Math.exp(-Math.log(2) * (daysAgo / halfLifeInDays));
    };

    const frequencyWeight = (dates: Date[]): number => {
      const count = Math.min(dates.length, 30);
      return Math.log1p(count);
    };

    const computeScore = (matchDates: Date[]): number => {
      if (matchDates.length === 0) return 0;

      const recentDates = matchDates.filter(
        (date) => differenceInDays(now, date) <= ninetyDays,
      );

      if (recentDates.length === 0) return 0;

      const recency = recentDates.reduce(
        (maxScore, d) => Math.max(maxScore, recencyWeight(d)),
        0,
      );

      const frequency = frequencyWeight(recentDates);

      const lastPlayedAt = recentDates.reduce(
        (latest, d) => max([latest, d]),
        new Date(0),
      );
      const daysSinceLast = differenceInDays(now, lastPlayedAt);
      const frequencyDecay = Math.exp(-Math.log(2) * (daysSinceLast / 30));

      const sameDayBonus = isSameDay(lastPlayedAt, now) ? 0.3 : 0;

      return recency * 0.7 + frequency * frequencyDecay * 0.3 + sameDayBonus;
    };

    const mapPlayer = (base: {
      name: string;
      isUser: boolean;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "match" | "game" | "player";
      } | null;
      matches: { date: Date; finished: boolean }[];
    }) => {
      const finished = base.matches.filter((m) => m.finished);
      if (finished.length === 0) {
        return {
          ...base,
          matches: 0,
          lastPlayedAt: null,
          recency: 0,
          frequency: 0,
          score: 0,
        };
      }

      const finishedDates = finished.map((m) => m.date);

      const lastPlayedAt = finishedDates.reduce(
        (latest, d) => max([latest, d]),
        new Date(0),
      );

      const recentDates = finishedDates.filter(
        (d) => differenceInDays(now, d) <= ninetyDays,
      );

      const recency =
        recentDates.length > 0
          ? recentDates.reduce((best, d) => Math.max(best, recencyWeight(d)), 0)
          : 0;

      const frequency =
        recentDates.length > 0 ? frequencyWeight(recentDates) : 0;

      const score = computeScore(finishedDates);

      return {
        name: base.name,
        image: base.image,
        isUser: base.isUser,
        matches: finishedDates.length,
        lastPlayedAt,
        recency,
        frequency,
        score,
      };
    };

    const mappedOriginalPlayers = response.originalPlayers.map((player) => {
      const sharedMatches = player.sharedLinkedPlayers.flatMap((sp) =>
        sp.sharedMatchPlayers.map((sMp) => sMp.match),
      );
      const originalMatches = player.matchPlayers.map((mp) => mp.match);
      const mergedMatches = [...originalMatches, ...sharedMatches];

      const mappedBase = mapPlayer({
        name: player.name,
        image: player.image,
        isUser: player.isUser,
        matches: mergedMatches,
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
        name: sharedPlayer.player.name,
        image: sharedPlayer.player.image,
        isUser: false,
        matches,
      });

      return {
        sharedId: sharedPlayer.id,
        type: "shared" as const,
        ...mappedBase,
      };
    });

    const combinedPlayers = [...mappedOriginalPlayers, ...mappedSharedPlayers];

    combinedPlayers.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;

      if (a.lastPlayedAt && b.lastPlayedAt) {
        if (a.lastPlayedAt.getTime() !== b.lastPlayedAt.getTime()) {
          return b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime();
        }
      } else if (!a.lastPlayedAt) return 1;
      else if (!b.lastPlayedAt) return -1;

      if (a.matches !== b.matches) return b.matches - a.matches;

      return a.name.localeCompare(b.name);
    });

    return {
      players: combinedPlayers,
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

    await db.transaction(async (tx) => {
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

        await playerRepository.update({
          input: {
            id: returnedSharedPlayer.player.id,
            createdBy: returnedSharedPlayer.ownerId,
            name: input.name,
          },
          tx,
        });
        return;
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
        input.updateValues.type === "nameAndImageId"
          ? input.updateValues.name
          : undefined;
      const nextImageId =
        input.updateValues.type === "imageId" ||
        input.updateValues.type === "nameAndImageId"
          ? input.updateValues.imageId
          : undefined;
      const previousImageId = existingPlayer.imageId;
      const imageUpdateRequested = nextImageId !== undefined;
      const shouldDeleteExistingImage =
        imageUpdateRequested &&
        previousImageId !== null &&
        previousImageId !== nextImageId;
      await playerRepository.update({
        input: {
          id: input.id,
          createdBy: userId,
          name: nextName,
          imageId: nextImageId,
        },
        tx,
      });

      if (!shouldDeleteExistingImage) {
        return;
      }

      const imageToDelete = await imageRepository.getById(
        {
          id: previousImageId,
        },
        tx,
      );
      assertFound(
        imageToDelete,
        {
          userId,
          value: {
            imageId: previousImageId,
          },
        },
        "Image not found.",
      );
      if (imageToDelete.type !== "file" || !imageToDelete.fileId) {
        return;
      }
      await posthog.captureImmediate({
        distinctId: userId,
        event: "uploadthing begin image delete",
        properties: {
          imageName: imageToDelete.name,
          imageId: imageToDelete.id,
          fileId: imageToDelete.fileId,
        },
      });

      const result = await deleteFiles(imageToDelete.fileId);
      if (!result.success) {
        await posthog.captureImmediate({
          distinctId: userId,
          event: "uploadthing image delete error",
          properties: {
            imageName: imageToDelete.name,
            imageId: imageToDelete.id,
            fileId: imageToDelete.fileId,
          },
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    });
  }
}

export const playerService = new PlayerService();
