import type { RouterInputs } from "@board-games/api";

import { createTrpcCaller } from "../trpc/trpc-helper";

type CreateGameInputType = RouterInputs["newGame"]["create"];

/**
 * Creates a game using tRPC directly (bypassing UI).
 * This is useful for setting up test data quickly.
 * The game name will be generated as `{browserName}_{GAME_NAME}`.
 *
 * @param browserName - The browser name used to identify the test user
 * @param browserGameName - The name of the game to create
 * @param overrides - Optional game data overrides (defaults will be used if not provided)
 * @returns The created game
 */
export async function createGameViaTrpc(
  browserName: string,
  browserGameName: string,
  overrides?: {
    game?: Partial<Omit<CreateGameInputType["game"], "name">> & {
      name?: string;
    };
    image?: CreateGameInputType["image"];
    scoresheets?: CreateGameInputType["scoresheets"];
    roles?: CreateGameInputType["roles"];
  },
) {
  const gameData: CreateGameInputType = {
    game: {
      playersMin: 1,
      playersMax: 4,
      playtimeMin: 15,
      playtimeMax: 30,
      yearPublished: 2014,
      ownedBy: false,
      description: null,
      rules: null,
      ...overrides?.game,
      // Ensure name is always set to browserGameName unless explicitly overridden
      name: overrides?.game?.name ?? browserGameName,
    },
    image: overrides?.image ?? null,
    scoresheets: overrides?.scoresheets ?? [],
    roles: overrides?.roles ?? [],
  };

  const caller = createTrpcCaller(browserName);
  const result = await caller.newGame.create(gameData);
  return result;
}

/**
 * Deletes a game using tRPC directly (bypassing UI).
 * This is useful for cleaning up test data.
 *
 * @param browserName - The browser name used to identify the test user
 * @param gameId - The ID of the game to delete
 */
export async function deleteGameViaTrpc(browserName: string, gameId: number) {
  const caller = createTrpcCaller(browserName);
  await caller.game.deleteGame({ id: gameId });
}

/**
 * Creates a game with scoresheets using tRPC directly (bypassing UI).
 * This is a convenience function for creating games with scoresheet configurations.
 *
 * @param browserName - The browser name used to identify the test user
 * @param browserGameName - The name of the game to create
 * @param scoresheetConfigs - Array of scoresheet configurations
 * @param gameOverrides - Optional game data overrides
 * @returns The created game
 */
export async function createGameWithScoresheetViaTrpc(
  browserName: string,
  browserGameName: string,
  scoresheetConfigs: {
    name: string;
    winCondition:
      | "Manual"
      | "Highest Score"
      | "Lowest Score"
      | "No Winner"
      | "Target Score";
    isCoop?: boolean;
    isDefault?: boolean;
    roundsScore?: "Aggregate" | "Manual" | "Best Of" | "None";
    targetScore?: number;
    rounds?: {
      name: string;
      type?: "Numeric" | "Checkbox";
      score?: number;
      color?: string;
      lookup?: number;
      modifier?: number;
    }[];
  }[],
  gameOverrides?: Partial<CreateGameInputType["game"]>,
) {
  const scoresheets: CreateGameInputType["scoresheets"] = scoresheetConfigs.map(
    (config) => ({
      scoresheet: {
        name: config.name,
        isDefault: config.isDefault ?? false,
        winCondition: config.winCondition,
        isCoop: config.isCoop ?? false,
        targetScore: config.targetScore ?? 0,
        roundsScore: config.roundsScore ?? "Aggregate",
      },
      rounds:
        config.rounds?.map((round) => ({
          name: round.name,
          type: round.type ?? "Numeric",
          score: round.score ?? 0,
          color: round.color ?? "#cbd5e1",
          lookup: round.lookup ?? null,
          modifier: round.modifier ?? null,
          order: 0, // Will be set by the API
        })) ?? [],
    }),
  );

  return createGameViaTrpc(browserName, browserGameName, {
    game: gameOverrides,
    scoresheets,
  });
}
