import type { RouterInputs } from "@board-games/api";

import { createTrpcCaller } from "../trpc/trpc-helper";

type CreateGameInputType = RouterInputs["game"]["create"];

/**
 * Creates a game using tRPC directly (bypassing UI).
 * This is useful for setting up test data quickly.
 * The game name will be generated as `{browserName}_{GAME_NAME}`.
 *
 * @param browserName - The browser name used to identify the test user
 * @param overrides - Optional game data overrides (defaults will be used if not provided)
 * @returns The created game
 */
export async function createGameViaTrpc(
  browserName: string,
  browserGameName: string,
  overrides?: Partial<CreateGameInputType>,
) {
  const gameData: CreateGameInputType = {
    game: {
      name: browserGameName,
      playersMin: 1,
      playersMax: 4,
      playtimeMin: 15,
      playtimeMax: 30,
      yearPublished: 2014,
      ownedBy: false,
      description: null,
      rules: null,
      ...overrides?.game,
    },
    image: null,
    scoresheets: [],
    roles: [],
    ...overrides,
  };

  const caller = createTrpcCaller(browserName);
  const result = await caller.game.create(gameData);
  return result;
}
