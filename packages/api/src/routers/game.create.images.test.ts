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

import type { AppRouter } from "../root";
import { createContextInner } from "../context";
import { appRouter } from "../root";
import {
  createTestSession,
  createTestUser,
  deleteTestUser,
} from "../test-helpers";
import { createCallerFactory } from "../trpc";

describe("Game Create - Image Tests", () => {
  const testUserId = "test-user-1-game-images";

  beforeAll(async () => {
    await deleteTestUser(testUserId);
  });

  afterAll(async () => {
    await deleteTestUser(testUserId);
  });

  beforeEach(async () => {
    await createTestUser(testUserId);
  });

  afterEach(async () => {
    await deleteTestUser(testUserId);
  });

  describe("image configurations", () => {
    test("creates a game with SVG image", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Game with SVG Image",
          description: "Test game",
          playersMin: 2,
          playersMax: 4,
          playtimeMin: 15,
          playtimeMax: 30,
          yearPublished: 2024,
          ownedBy: true,
          rules: null,
        },
        image: {
          type: "svg",
          name: "test-game-icon.svg",
        },
        scoresheets: [],
        roles: [],
      };

      const result = await caller.game.create(input);
      expect(result.id).toBeDefined();
      expect(result.name).toBe("Game with SVG Image");

      // Verify SVG image is returned when getting the game
      const getInput: inferProcedureInput<AppRouter["game"]["getGame"]> = {
        type: "original",
        id: result.id,
      };
      const retrievedGame = await caller.game.getGame(getInput);

      expect(retrievedGame.type).toBe("original");
      expect(retrievedGame.image).not.toBeNull();
      expect(retrievedGame.image).toMatchObject({
        type: "svg",
        name: "test-game-icon.svg",
        usageType: "game",
      });
    });

    test("creates a game with null image", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Game without Image",
          description: null,
          playersMin: 2,
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

      const result = await caller.game.create(input);
      expect(result.id).toBeDefined();

      // Verify null image is returned when getting the game
      const getInput: inferProcedureInput<AppRouter["game"]["getGame"]> = {
        type: "original",
        id: result.id,
      };
      const retrievedGame = await caller.game.getGame(getInput);

      expect(retrievedGame.type).toBe("original");
      expect(retrievedGame.image).toBeNull();
    });
  });
});
