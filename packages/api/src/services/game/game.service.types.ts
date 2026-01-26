import type { PostHog } from "posthog-node";
import { z } from "zod/v4";

import type {
  CreateGameInputType,
  EditGameInputType,
  GetGameInputType,
} from "../../routers/game/game.input";
import { getGameInput } from "../../routers/game/game.input";

export interface CreateGameArgs {
  input: CreateGameInputType;
  ctx: {
    userId: string;
    posthog: PostHog;
  };
}

export interface GetGameArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
    posthog: PostHog;
  };
}

export interface GetGameRolesArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
  };
}

export interface GetGameScoresheetsArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
  };
}

export interface GetGameScoreSheetsWithRoundsArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
  };
}

export interface EditGameArgs {
  input: EditGameInputType;
  ctx: {
    userId: string;
    posthog: PostHog;
    deleteFiles: (fileId: string) => Promise<{ success: boolean }>;
  };
}

export interface GetGameStatsHeaderArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
  };
}

export const getGamePlayerStatsArgsSchema = z.object({
  input: getGameInput,
  ctx: z.object({ userId: z.string() }),
});
export type GetGamePlayerStatsArgs = z.infer<
  typeof getGamePlayerStatsArgsSchema
>;
