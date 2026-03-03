import type { PostHog } from "posthog-node";

export interface GetPlayersForMatchArgs {
  ctx: {
    userId: string;
  };
}

export interface GetRecentMatchWithPlayersArgs {
  ctx: {
    userId: string;
  };
}

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
        imageId?: number | null;
        name?: string;
      }
    | {
        type: "shared";
        id: number;
        name: string;
      };
}
