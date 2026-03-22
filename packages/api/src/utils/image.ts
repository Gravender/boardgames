import type {
  GameImage,
  ImageRowWithUsage,
  PlayerImage,
} from "@board-games/shared";

import { capturePosthogForUser } from "./logging";
import type { WithPosthogUserCtx } from "./shared-args.types";

export type {
  GameImage,
  ImageRowWithUsage,
  PlayerImage,
} from "@board-games/shared";

export const IMAGE_USAGE_TYPE_MISMATCH_EVENT = "api image usage type mismatch";

export type LogImageUsageTypeMismatchInput = {
  expectedUsageType: "player" | "game";
  actualUsageType: "game" | "player" | "match";
  imageId: number;
  imageName: string;
  entityType: "player" | "game";
  entityId: number;
};

export async function logImageUsageTypeMismatch(
  args: WithPosthogUserCtx<LogImageUsageTypeMismatchInput>,
): Promise<void> {
  await capturePosthogForUser({
    ctx: args.ctx,
    input: {
      event: IMAGE_USAGE_TYPE_MISMATCH_EVENT,
      properties: {
        expectedUsageType: args.input.expectedUsageType,
        actualUsageType: args.input.actualUsageType,
        imageId: args.input.imageId,
        imageName: args.input.imageName,
        entityType: args.input.entityType,
        entityId: args.input.entityId,
      },
    },
  });
}

export type MapPlayerImageRowInput = {
  image: ImageRowWithUsage | null;
  playerId: number;
};

export type MapGameImageRowInput = {
  image: ImageRowWithUsage | null;
  gameId: number;
};

/** Map without side effects. Returns `null` when the row is missing or `usageType` is not `player`. */
export function mapImageRowToPlayerImage(
  row: ImageRowWithUsage | null,
): PlayerImage | null {
  if (row === null || row.usageType !== "player") {
    return null;
  }
  return {
    name: row.name,
    url: row.url,
    type: row.type,
    usageType: "player",
  };
}

/** Map without side effects. Returns `null` when the row is missing or `usageType` is not `game`. */
export function mapImageRowToGameImage(
  row: ImageRowWithUsage | null,
): GameImage | null {
  if (row === null || row.usageType !== "game") {
    return null;
  }
  return {
    name: row.name,
    url: row.url,
    type: row.type,
    usageType: "game",
  };
}

export async function mapPlayerImageRowWithLogging(
  args: WithPosthogUserCtx<MapPlayerImageRowInput>,
): Promise<PlayerImage | null> {
  const { image, playerId } = args.input;
  if (image === null) {
    return null;
  }
  if (image.usageType !== "player") {
    await logImageUsageTypeMismatch({
      ctx: args.ctx,
      input: {
        expectedUsageType: "player",
        actualUsageType: image.usageType,
        imageId: image.id,
        imageName: image.name,
        entityType: "player",
        entityId: playerId,
      },
    });
    return null;
  }
  return {
    name: image.name,
    url: image.url,
    type: image.type,
    usageType: "player",
  };
}

export async function mapGameImageRowWithLogging(
  args: WithPosthogUserCtx<MapGameImageRowInput>,
): Promise<GameImage | null> {
  const { image, gameId } = args.input;
  if (image === null) {
    return null;
  }
  if (image.usageType !== "game") {
    await logImageUsageTypeMismatch({
      ctx: args.ctx,
      input: {
        expectedUsageType: "game",
        actualUsageType: image.usageType,
        imageId: image.id,
        imageName: image.name,
        entityType: "game",
        entityId: gameId,
      },
    });
    return null;
  }
  return {
    name: image.name,
    url: image.url,
    type: image.type,
    usageType: "game",
  };
}
