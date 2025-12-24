import type { PostHog } from "posthog-node";

import type {
  CreateGameInputType,
  EditGameInputType,
  GetGameInputType,
} from "../../routers/game/game.input";

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
