import { z } from "zod/v4";

import type {
  CreateGameInputType,
  EditGameInputType,
  GetGameInputType,
  ImportBGGGamesInputType,
} from "../../routers/game/game.input";
import { getGameInput } from "../../routers/game/game.input";
import type {
  PosthogUserCtx,
  WithPosthogUserCtx,
  WithServiceCtx,
  WithUserIdCtx,
  WithUserIdCtxOnly,
} from "../../utils/shared-args.types";

export type CreateGameArgs = WithPosthogUserCtx<CreateGameInputType>;

export type GetGamesArgs = WithUserIdCtxOnly;

export type GetGameArgs = WithPosthogUserCtx<GetGameInputType>;

export type GetGameToShareArgs = WithUserIdCtx<{ id: number }>;

export type DeleteGameArgs = WithPosthogUserCtx<{ id: number }>;

export type ImportBGGGamesArgs = WithUserIdCtx<ImportBGGGamesInputType>;

export type GetGameRolesArgs = WithUserIdCtx<GetGameInputType>;

export type GetGameScoresheetsArgs = WithUserIdCtx<GetGameInputType>;

export type GetGameScoreSheetsWithRoundsArgs = WithUserIdCtx<GetGameInputType>;

export type EditGameCtx = PosthogUserCtx & {
  deleteFiles: (fileId: string) => Promise<{ success: boolean }>;
};

export type EditGameArgs = WithServiceCtx<EditGameCtx, EditGameInputType>;

export type GetGameStatsHeaderArgs = WithUserIdCtx<GetGameInputType>;

export const getGamePlayerStatsArgsSchema = z.object({
  input: getGameInput,
  ctx: z.object({ userId: z.string() }),
});
export type GetGamePlayerStatsArgs = z.infer<
  typeof getGamePlayerStatsArgsSchema
>;

export type GetGameScoresheetStatsArgs = WithUserIdCtx<GetGameInputType>;

export type GetGameInsightsArgs = WithUserIdCtx<GetGameInputType>;
