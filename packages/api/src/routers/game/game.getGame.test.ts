import type { inferProcedureInput } from "@trpc/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import type { AppRouter } from "../../root";
import {
  createAuthenticatedCaller,
  gameTestLifecycle,
} from "./game-test-fixtures";

describe("Game GetGame Tests", () => {
  const testUserId = "test-user-1-game-getgame";
  const lifecycle = gameTestLifecycle(testUserId);

  beforeAll(async () => {
    await lifecycle.deleteTestUser();
  });

  afterAll(async () => {
    await lifecycle.deleteTestUser();
  });

  beforeEach(async () => {
    await lifecycle.createTestUser();
  });

  afterEach(async () => {
    await lifecycle.deleteTestUser();
  });

  describe("game.getGame", () => {
    test("retrieves a created game by id", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      // First create a game
      const createInput: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Game to Retrieve",
          description: "This game will be retrieved",
          playersMin: 1,
          playersMax: 4,
          playtimeMin: 15,
          playtimeMax: 30,
          yearPublished: 2024,
          ownedBy: true,
          rules: null,
        },
        image: null,
        scoresheets: [],
        roles: [],
      };

      const createdGame = await caller.game.create(createInput);

      // Then retrieve it
      const getInput: inferProcedureInput<AppRouter["game"]["getGame"]> = {
        type: "original",
        id: createdGame.id,
      };

      const retrievedGame = await caller.game.getGame(getInput);

      expect(retrievedGame).toMatchObject({
        type: "original",
        id: createdGame.id,
        name: "Game to Retrieve",
        players: {
          min: 1,
          max: 4,
        },
        playtime: {
          min: 15,
          max: 30,
        },
        yearPublished: 2024,
        ownedBy: true,
      });
    });
  });

  describe("game.create and getGame (combined)", () => {
    test("creates a game and retrieves it", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Combined Test Game",
          description: "Test description",
          playersMin: 2,
          playersMax: 5,
          playtimeMin: 20,
          playtimeMax: 45,
          yearPublished: 2024,
          ownedBy: true,
          rules: "Test rules",
        },
        image: null,
        scoresheets: [],
        roles: [],
      };

      const createdGame = await caller.game.create(input);

      const getInput: inferProcedureInput<AppRouter["game"]["getGame"]> = {
        type: "original",
        id: createdGame.id,
      };

      const retrievedGame = await caller.game.getGame(getInput);

      // Verify the retrieved game matches the input
      expect(retrievedGame.type).toBe("original");
      expect(retrievedGame.id).toBe(createdGame.id);
      expect(retrievedGame.name).toBe(input.game.name);
      expect(retrievedGame.players.min).toBe(input.game.playersMin);
      expect(retrievedGame.players.max).toBe(input.game.playersMax);
      expect(retrievedGame.playtime.min).toBe(input.game.playtimeMin);
      expect(retrievedGame.playtime.max).toBe(input.game.playtimeMax);
      expect(retrievedGame.yearPublished).toBe(input.game.yearPublished);
      expect(retrievedGame.ownedBy).toBe(input.game.ownedBy);
    });
  });
});
