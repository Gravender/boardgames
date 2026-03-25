import { assertFound } from "../../utils/databaseHelpers";
import type { PlayerInsightsIdentityType } from "../../routers/player/sub-routers/stats/player-insights.output";
import type { GetPlayerInputType } from "../../routers/player/sub-routers/stats/player-stats.input";
import { playerRepository } from "../../repositories/player/player.repository";
import { mapPlayerImageRowWithLogging } from "../../utils/image";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import type {
  InsightMatchParticipant,
  InsightMatchRow,
} from "./player-insights.read.types";

/** Stable key for counting distinct games in insights (rivals / teammates / groups). */
export const gameIdentityKey = (row: InsightMatchRow): string => {
  if (row.sharedGameId != null) {
    return `shared-${row.sharedGameId}`;
  }
  return `game-${row.gameId}`;
};

export const participantIdentityKey = (p: InsightMatchParticipant): string => {
  if (p.playerType === "shared" && p.sharedPlayerId !== null) {
    return `shared-${p.sharedPlayerId}`;
  }
  return `original-${p.playerId}`;
};

export const identityKeyFromIdentity = (
  identity: PlayerInsightsIdentityType,
): string =>
  identity.type === "shared"
    ? `shared-${identity.sharedId}`
    : `original-${identity.id}`;

export const getTargetParticipant = (args: {
  row: InsightMatchRow;
  input: GetPlayerInsightsArgs["input"];
}): InsightMatchParticipant | undefined => {
  const { row, input } = args;
  if (input.type === "original") {
    return row.participants.find(
      (participant) => participant.playerId === input.id,
    );
  }
  return row.participants.find(
    (participant) => participant.sharedPlayerId === input.sharedPlayerId,
  );
};

export const toIdentity = async (
  participant: InsightMatchParticipant,
  ctx: GetPlayerInsightsArgs["ctx"],
): Promise<PlayerInsightsIdentityType> => {
  if (
    participant.playerType === "shared" &&
    participant.sharedPlayerId !== null
  ) {
    return {
      type: "shared",
      sharedId: participant.sharedPlayerId,
      id: participant.playerId,
      name: participant.name,
      image: await mapPlayerImageRowWithLogging({
        ctx,
        input: {
          image: participant.image,
          playerId: participant.playerId,
        },
      }),
    };
  }
  return {
    type: "original",
    id: participant.playerId,
    name: participant.name,
    image: await mapPlayerImageRowWithLogging({
      ctx,
      input: {
        image: participant.image,
        playerId: participant.playerId,
      },
    }),
  };
};

export const resolveProfileIdentityForGroups = async (
  args: GetPlayerInsightsArgs,
  rows: InsightMatchRow[],
): Promise<PlayerInsightsIdentityType> => {
  for (const row of rows) {
    const t = getTargetParticipant({
      row,
      input: args.input,
    });
    if (t) {
      return toIdentity(t, args.ctx);
    }
  }
  if (args.input.type === "original") {
    const p = await playerRepository.getPlayer({
      id: args.input.id,
      createdBy: args.ctx.userId,
      with: {
        image: true,
      },
    });
    assertFound(
      p,
      { userId: args.ctx.userId, value: args.input },
      "Player not found.",
    );
    return {
      type: "original",
      id: p.id,
      name: p.name,
      image: await mapPlayerImageRowWithLogging({
        ctx: args.ctx,
        input: {
          image: p.image,
          playerId: p.id,
        },
      }),
    };
  }
  const sp = await playerRepository.getSharedPlayer({
    id: args.input.sharedPlayerId,
    sharedWithId: args.ctx.userId,
    with: {
      player: {
        with: {
          image: true,
        },
      },
    },
  });
  assertFound(
    sp,
    { userId: args.ctx.userId, value: args.input },
    "Shared player not found.",
  );
  return {
    type: "shared",
    sharedId: sp.id,
    id: sp.playerId,
    name: sp.player.name,
    image: await mapPlayerImageRowWithLogging({
      ctx: args.ctx,
      input: {
        image: sp.player.image,
        playerId: sp.playerId,
      },
    }),
  };
};

export const isViewerSameAsProfileTarget = (
  input: GetPlayerInputType,
  userPlayerId: number | null,
  sharedLinkedPlayerId: number | null,
): boolean => {
  if (userPlayerId === null) return false;
  if (input.type === "original") return input.id === userPlayerId;
  return sharedLinkedPlayerId === userPlayerId;
};
