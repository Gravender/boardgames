import type { TransactionType } from "@board-games/db/client";

import { assertFound } from "../../utils/databaseHelpers";
import type { PlayerInsightsTargetType } from "../../routers/player/player-insights.output";
import { playerRepository } from "../../repositories/player/player.repository";
import type { GetPlayerInsightsArgs } from "./player.service.types";

export const getInsightsTarget = async (
  args: GetPlayerInsightsArgs,
  tx?: TransactionType,
): Promise<PlayerInsightsTargetType> => {
  const { ctx, input } = args;
  if (input.type === "original") {
    const player = await playerRepository.getPlayer(
      {
        id: input.id,
        createdBy: ctx.userId,
      },
      tx,
    );
    assertFound(
      player,
      { userId: ctx.userId, value: input },
      "Player not found.",
    );
    return {
      type: "original",
      id: player.id,
      permissions: "edit",
    };
  }
  const sharedPlayer = await playerRepository.getSharedPlayer(
    {
      id: input.sharedPlayerId,
      sharedWithId: ctx.userId,
    },
    tx,
  );
  assertFound(
    sharedPlayer,
    { userId: ctx.userId, value: input },
    "Shared player not found.",
  );
  return {
    type: "shared",
    sharedPlayerId: sharedPlayer.id,
    permissions: sharedPlayer.permission,
  };
};
