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

export interface GetPlayersArgs {
  ctx: {
    userId: string;
  };
}

export interface GetPlayersByGameArgs {
  ctx: {
    userId: string;
  };
  input:
    | {
        type: "original";
        id: number;
      }
    | {
        type: "shared";
        sharedId: number;
      };
}

export interface GetPlayerArgs {
  ctx: {
    userId: string;
  };
  input:
    | {
        type: "original";
        id: number;
      }
    | {
        type: "shared";
        sharedId: number;
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
