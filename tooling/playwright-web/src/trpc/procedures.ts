import type { RouterInputs } from "@board-games/api";

import { createTrpcCaller } from "../trpc/trpc-helper";

type CreateGameInputType = RouterInputs["game"]["create"];
type CreateMatchInputType = RouterInputs["match"]["createMatch"];

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
  const result = await caller.game.create(gameData);
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

// ─── Match helpers ────────────────────────────────────────────────────────

/**
 * Creates players via tRPC directly (bypassing UI).
 *
 * @param browserName - The browser name used to identify the test user
 * @param count - Number of players to create
 * @param prefix - Prefix for player names
 * @returns Array of created players with { id, name }
 */
export async function createPlayersViaTrpc(
  browserName: string,
  count: number,
  prefix = "Player",
): Promise<{ id: number; name: string }[]> {
  const caller = createTrpcCaller(browserName);
  const players: { id: number; name: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const player = await caller.player.create({
      name: `${prefix} ${i}`,
      imageId: null,
    });
    players.push(player);
  }
  return players;
}

/**
 * Creates a full match (game + scoresheet + players + match) using tRPC
 * directly (bypassing UI). Useful for setting up test data for score entry,
 * finish, and delete Playwright tests.
 *
 * @param browserName - The browser name used to identify the test user
 * @param browserGameName - The name of the game to create
 * @param options - Optional match creation overrides
 * @returns Created match, gameId, scoresheetId, and player ids
 */
export async function createFullMatchViaTrpc(
  browserName: string,
  browserGameName: string,
  options?: {
    matchName?: string;
    matchDate?: Date;
    playerCount?: number;
    playerPrefix?: string;
    scoresheetConfigs?: Parameters<typeof createGameWithScoresheetViaTrpc>[2];
  },
) {
  const {
    matchName,
    matchDate = new Date(),
    playerCount = 2,
    playerPrefix = "Player",
    scoresheetConfigs,
  } = options ?? {};

  const caller = createTrpcCaller(browserName);

  // Create game (with scoresheets if provided, otherwise defaults)
  let createdGame;
  if (scoresheetConfigs) {
    createdGame = await createGameWithScoresheetViaTrpc(
      browserName,
      browserGameName,
      scoresheetConfigs,
    );
  } else {
    createdGame = await createGameViaTrpc(browserName, browserGameName);
  }

  // Fetch scoresheet id
  const scoresheets = await caller.game.gameScoreSheetsWithRounds({
    type: "original",
    id: createdGame.id,
  });
  const firstScoresheet = scoresheets[0];
  if (firstScoresheet?.type !== "original") {
    throw new Error("No default scoresheet found for created game");
  }

  // Create players
  const players = await createPlayersViaTrpc(
    browserName,
    playerCount,
    playerPrefix,
  );

  // Create match
  const matchInput: CreateMatchInputType = {
    name: matchName ?? `${browserGameName} Match #1`,
    date: matchDate,
    game: { type: "original", id: createdGame.id },
    scoresheet: { type: "original", id: firstScoresheet.id },
    players: players.map((p) => ({
      type: "original" as const,
      id: p.id,
      roles: [],
      teamId: null,
    })),
    teams: [],
    location: null,
  };

  const match = await caller.match.createMatch(matchInput);

  return {
    match,
    gameId: createdGame.id,
    scoresheetId: firstScoresheet.id,
    players,
  };
}
