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

describe("Match Create - Error Tests", () => {
  const testUserId = "test-user-1-match-errors";

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

  describe("error cases", () => {
    test("fails with missing required name", async () => {
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

      const input = {
        date: new Date(),
        game: {
          type: "original" as const,
          id: createdGame.id,
        },
        scoresheet: {
          type: "original" as const,
          id: defaultScoresheet.id,
        },
        players: [
          {
            type: "original" as const,
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });

    test("fails with missing required date", async () => {
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

      const input = {
        name: "Test Match",
        game: {
          type: "original" as const,
          id: createdGame.id,
        },
        scoresheet: {
          type: "original" as const,
          id: defaultScoresheet.id,
        },
        players: [
          {
            type: "original" as const,
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });

    test("fails with missing required game", async () => {
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

      const input = {
        name: "Test Match",
        date: new Date(),
        scoresheet: {
          type: "original" as const,
          id: defaultScoresheet.id,
        },
        players: [
          {
            type: "original" as const,
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });

    test("fails with missing required scoresheet", async () => {
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

      const input = {
        name: "Test Match",
        date: new Date(),
        game: {
          type: "original" as const,
          id: createdGame.id,
        },
        players: [
          {
            type: "original" as const,
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });

    test("fails with missing required players", async () => {
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

      const input = {
        name: "Test Match",
        date: new Date(),
        game: {
          type: "original" as const,
          id: createdGame.id,
        },
        scoresheet: {
          type: "original" as const,
          id: defaultScoresheet.id,
        },
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });
  });
});
