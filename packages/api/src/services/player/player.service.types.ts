import type { PostHog } from "posthog-node";

import type { TransactionType } from "@board-games/db/client";

import type {
  CreatePlayerInputType,
  DeletePlayerInputType,
  GetPlayerToShareInputType,
  GetPlayersByGameInputType,
  UpdatePlayerInputType,
} from "../../routers/player/player.input";
import type {
  GetPlayerInsightsInputType,
  GetPlayerInsightsPerGameInputType,
  GetPlayerInputType,
} from "../../routers/player/sub-routers/stats/player-stats.input";
import type {
  WithOptionalTx,
  WithPosthogUserCtx,
  WithUserIdCtx,
  WithUserIdCtxOnly,
} from "../../utils/shared-args.types";

export type GetPlayersForMatchArgs = WithUserIdCtxOnly;

export type GetRecentMatchWithPlayersArgs = WithUserIdCtxOnly;

export type GetPlayersArgs = WithUserIdCtxOnly;

export type GetPlayersByGameArgs = WithUserIdCtx<GetPlayersByGameInputType>;

export type CreatePlayerArgs = WithUserIdCtx<CreatePlayerInputType>;

export type UpdatePlayerArgs = {
  ctx: {
    userId: string;
    posthog: PostHog;
    deleteFiles: (keys: string | string[]) => Promise<{
      readonly success: boolean;
      readonly deletedCount: number;
    }>;
  };
  input: UpdatePlayerInputType;
};

export type DeletePlayerArgs = {
  ctx: { userId: string };
  input: DeletePlayerInputType;
  /** When set, mutations run on this transaction instead of opening a new one. */
  tx?: TransactionType;
};

export type GetPlayerToShareArgs = WithUserIdCtx<GetPlayerToShareInputType>;

export type GetPlayerHeaderArgs = WithPosthogUserCtx<GetPlayerInputType>;

export type GetPlayerSummaryArgs = GetPlayerHeaderArgs;

export type GetPlayerInsightsArgs =
  WithPosthogUserCtx<GetPlayerInsightsInputType> & WithOptionalTx;

export type GetPlayerInsightsPerGameArgs =
  WithUserIdCtx<GetPlayerInsightsPerGameInputType>;

export type GetPlayerRecentMatchesArgs = WithUserIdCtx<GetPlayerInputType>;
