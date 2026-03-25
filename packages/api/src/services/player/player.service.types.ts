import type { PostHog } from "posthog-node";

import type { GetPlayersByGameInputType } from "../../routers/player/player.input";
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

export interface CreatePlayerArgs {
  ctx: {
    userId: string;
  };
  input: {
    name: string;
    imageId?: number | null;
  };
}

export interface UpdatePlayerArgs {
  ctx: {
    userId: string;
    posthog: PostHog;
    deleteFiles: (keys: string | string[]) => Promise<{
      readonly success: boolean;
      readonly deletedCount: number;
    }>;
  };
  input:
    | {
        type: "original";
        id: number;
        updateValues:
          | {
              type: "name";
              name: string;
            }
          | {
              type: "imageId";
              imageId: number;
            }
          | {
              type: "clearImage";
            }
          | {
              type: "nameAndImageId";
              name: string;
              imageId: number;
            }
          | {
              type: "nameAndClearImage";
              name: string;
            };
      }
    | {
        type: "shared";
        id: number;
        name: string;
      };
}

export type GetPlayerHeaderArgs = WithPosthogUserCtx<GetPlayerInputType>;

export type GetPlayerSummaryArgs = GetPlayerHeaderArgs;

export type GetPlayerInsightsArgs =
  WithPosthogUserCtx<GetPlayerInsightsInputType> & WithOptionalTx;

export type GetPlayerInsightsPerGameArgs =
  WithUserIdCtx<GetPlayerInsightsPerGameInputType>;

export type GetPlayerRecentMatchesArgs = WithUserIdCtx<GetPlayerInputType>;
