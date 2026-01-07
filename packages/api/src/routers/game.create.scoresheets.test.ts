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

describe("Game Create - Scoresheet Tests", () => {
  const testUserId = "test-user-1-game-scoresheets";

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

  describe("scoresheet configurations", () => {
    test("creates a game with empty scoresheets array (creates default)", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Game with Default Scoresheet",
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

      // Verify default scoresheet is created
      const scoresheetsInput: inferProcedureInput<
        AppRouter["newGame"]["gameScoreSheetsWithRounds"]
      > = {
        type: "original",
        id: result.id,
      };
      const scoresheets =
        await caller.newGame.gameScoreSheetsWithRounds(scoresheetsInput);

      expect(scoresheets).toHaveLength(1);
      expect(scoresheets[0]).toMatchObject({
        type: "original",
        name: "Default",
        isDefault: true,
      });
      // Default scoresheet should have at least one round
      expect(scoresheets[0]?.rounds.length).toBeGreaterThan(0);
    });

    test("creates a game with single scoresheet with multiple rounds", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Game with Scoresheet and Rounds",
          description: "Test game",
          playersMin: 2,
          playersMax: 4,
          playtimeMin: 20,
          playtimeMax: 45,
          yearPublished: 2024,
          ownedBy: true,
          rules: null,
        },
        image: null,
        scoresheets: [
          {
            scoresheet: {
              name: "Main Scoresheet",
              winCondition: "Highest Score",
              roundsScore: "Aggregate",
              isCoop: false,
            },
            rounds: [
              {
                name: "Round 1",
                type: "Numeric",
                order: 1,
              },
              {
                name: "Round 2",
                type: "Numeric",
                order: 2,
              },
              {
                name: "Final Round",
                type: "Checkbox",
                order: 3,
              },
            ],
          },
        ],
        roles: [],
      };

      const result = await caller.game.create(input);
      expect(result.id).toBeDefined();
      expect(result.name).toBe("Game with Scoresheet and Rounds");

      // Verify scoresheets and rounds are created correctly
      const scoresheetsInput: inferProcedureInput<
        AppRouter["newGame"]["gameScoreSheetsWithRounds"]
      > = {
        type: "original",
        id: result.id,
      };
      const scoresheets =
        await caller.newGame.gameScoreSheetsWithRounds(scoresheetsInput);

      expect(scoresheets).toHaveLength(1);
      expect(scoresheets[0]).toMatchObject({
        type: "original",
        name: "Main Scoresheet",
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        isCoop: false,
      });
      expect(scoresheets[0]?.rounds).toHaveLength(3);
      expect(scoresheets[0]?.rounds[0]).toMatchObject({
        name: "Round 1",
        type: "Numeric",
        order: 1,
      });
      expect(scoresheets[0]?.rounds[1]).toMatchObject({
        name: "Round 2",
        type: "Numeric",
        order: 2,
      });
      expect(scoresheets[0]?.rounds[2]).toMatchObject({
        name: "Final Round",
        type: "Checkbox",
        order: 3,
      });
    });

    test("creates a game with multiple scoresheets", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Game with Multiple Scoresheets",
          description: "Test game",
          playersMin: 2,
          playersMax: 6,
          playtimeMin: 30,
          playtimeMax: 60,
          yearPublished: 2024,
          ownedBy: true,
          rules: null,
        },
        image: null,
        scoresheets: [
          {
            scoresheet: {
              name: "Scoresheet 1",
              winCondition: "Highest Score",
              roundsScore: "Aggregate",
              isCoop: false,
            },
            rounds: [
              {
                name: "Round 1",
                type: "Numeric",
                order: 1,
              },
            ],
          },
          {
            scoresheet: {
              name: "Scoresheet 2",
              winCondition: "Lowest Score",
              roundsScore: "Best Of",
              isCoop: false,
            },
            rounds: [
              {
                name: "Round A",
                type: "Numeric",
                order: 1,
              },
              {
                name: "Round B",
                type: "Checkbox",
                order: 2,
              },
            ],
          },
        ],
        roles: [],
      };

      const result = await caller.game.create(input);
      expect(result.id).toBeDefined();

      // Verify scoresheets are created correctly
      const scoresheetsInput: inferProcedureInput<
        AppRouter["newGame"]["gameScoreSheetsWithRounds"]
      > = {
        type: "original",
        id: result.id,
      };
      const scoresheets =
        await caller.newGame.gameScoreSheetsWithRounds(scoresheetsInput);

      expect(scoresheets).toHaveLength(2);
      expect(scoresheets[0]).toMatchObject({
        type: "original",
        name: "Scoresheet 1",
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        isCoop: false,
      });
      expect(scoresheets[0]?.rounds).toHaveLength(1);
      expect(scoresheets[0]?.rounds[0]).toMatchObject({
        name: "Round 1",
        type: "Numeric",
        order: 1,
      });

      expect(scoresheets[1]).toMatchObject({
        type: "original",
        name: "Scoresheet 2",
        winCondition: "Lowest Score",
        roundsScore: "Best Of",
        isCoop: false,
      });
      expect(scoresheets[1]?.rounds).toHaveLength(2);
      expect(scoresheets[1]?.rounds[0]).toMatchObject({
        name: "Round A",
        type: "Numeric",
        order: 1,
      });
      expect(scoresheets[1]?.rounds[1]).toMatchObject({
        name: "Round B",
        type: "Checkbox",
        order: 2,
      });
    });
  });
});
