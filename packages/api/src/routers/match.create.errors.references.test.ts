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

describe("Match Create - Invalid Reference Error Tests", () => {
  const testUserId = "test-user-1-match-errors-refs";

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

  describe("invalid reference error cases", () => {
    test("fails with invalid game reference (non-existent game ID)", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // Create a game and get scoresheet (but use wrong game ID)
      const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Test Game",
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

      const createdGame = await caller.game.create(gameInput);

      const scoresheetsInput: inferProcedureInput<
        AppRouter["newGame"]["gameScoreSheetsWithRounds"]
      > = {
        type: "original",
        id: createdGame.id,
      };
      const scoresheets =
        await caller.newGame.gameScoreSheetsWithRounds(scoresheetsInput);

      const defaultScoresheet = scoresheets[0];
      if (defaultScoresheet?.type !== "original") {
        throw new Error("No scoresheet found");
      }

      const player = await caller.player.create({
        name: "Test Player",
        imageId: null,
      });

      const input: inferProcedureInput<AppRouter["newMatch"]["createMatch"]> = {
        name: "Test Match",
        date: new Date(),
        game: {
          type: "original",
          id: 999999, // Non-existent game ID
        },
        scoresheet: {
          type: "original",
          id: defaultScoresheet.id,
        },
        players: [
          {
            type: "original",
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      };

      await expect(caller.newMatch.createMatch(input)).rejects.toThrow();
    });

    test("fails with invalid scoresheet reference (non-existent scoresheet ID)", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // Create a game
      const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Test Game",
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

      const createdGame = await caller.game.create(gameInput);

      const player = await caller.player.create({
        name: "Test Player",
        imageId: null,
      });

      const input: inferProcedureInput<AppRouter["newMatch"]["createMatch"]> = {
        name: "Test Match",
        date: new Date(),
        game: {
          type: "original",
          id: createdGame.id,
        },
        scoresheet: {
          type: "original",
          id: 999999, // Non-existent scoresheet ID
        },
        players: [
          {
            type: "original",
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      };

      await expect(caller.newMatch.createMatch(input)).rejects.toThrow();
    });

    test("fails with invalid player reference (non-existent player ID)", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // Create a game and get scoresheet
      const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Test Game",
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

      const createdGame = await caller.game.create(gameInput);

      const scoresheetsInput: inferProcedureInput<
        AppRouter["newGame"]["gameScoreSheetsWithRounds"]
      > = {
        type: "original",
        id: createdGame.id,
      };
      const scoresheets =
        await caller.newGame.gameScoreSheetsWithRounds(scoresheetsInput);

      const defaultScoresheet = scoresheets[0];
      if (defaultScoresheet?.type !== "original") {
        throw new Error("No scoresheet found");
      }

      const input: inferProcedureInput<AppRouter["newMatch"]["createMatch"]> = {
        name: "Test Match",
        date: new Date(),
        game: {
          type: "original",
          id: createdGame.id,
        },
        scoresheet: {
          type: "original",
          id: defaultScoresheet.id,
        },
        players: [
          {
            type: "original",
            id: 999999, // Non-existent player ID
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      };

      await expect(caller.newMatch.createMatch(input)).rejects.toThrow();
    });

    test("fails with invalid location reference (non-existent location ID)", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // Create a game and get scoresheet
      const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Test Game",
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

      const createdGame = await caller.game.create(gameInput);

      const scoresheetsInput: inferProcedureInput<
        AppRouter["newGame"]["gameScoreSheetsWithRounds"]
      > = {
        type: "original",
        id: createdGame.id,
      };
      const scoresheets =
        await caller.newGame.gameScoreSheetsWithRounds(scoresheetsInput);

      const defaultScoresheet = scoresheets[0];
      if (defaultScoresheet?.type !== "original") {
        throw new Error("No scoresheet found");
      }

      const player = await caller.player.create({
        name: "Test Player",
        imageId: null,
      });

      const input: inferProcedureInput<AppRouter["newMatch"]["createMatch"]> = {
        name: "Test Match",
        date: new Date(),
        game: {
          type: "original",
          id: createdGame.id,
        },
        scoresheet: {
          type: "original",
          id: defaultScoresheet.id,
        },
        players: [
          {
            type: "original",
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: {
          type: "original",
          id: 999999, // Non-existent location ID
        },
      };

      await expect(caller.newMatch.createMatch(input)).rejects.toThrow();
    });
  });
});
