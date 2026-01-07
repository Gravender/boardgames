import type { inferProcedureInput } from "@trpc/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { createContextInner } from "../context";
import type { AppRouter } from "../root";
import { appRouter } from "../root";
import { createCallerFactory } from "../trpc";
import { createTestSession, createTestUser, deleteTestUser } from "../test-helpers";

describe("Match Create - Basic Tests", () => {
  const testUserId = "test-user-1-match-basic";

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

  describe("basic match creation", () => {
    test("creates a match with minimal required data", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // Create a game with default scoresheet
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

      // Get scoresheets for the game
      const scoresheetsInput: inferProcedureInput<
        AppRouter["newGame"]["gameScoreSheetsWithRounds"]
      > = {
        type: "original",
        id: createdGame.id,
      };
      const scoresheets = await caller.newGame.gameScoreSheetsWithRounds(
        scoresheetsInput,
      );

      expect(scoresheets.length).toBeGreaterThan(0);
      const defaultScoresheet = scoresheets[0];
      if (defaultScoresheet?.type !== "original") {
        throw new Error("No scoresheet found");
      }

      // Create players
      const player1 = await caller.player.create({
        name: "Player 1",
        imageId: null,
      });
      const player2 = await caller.player.create({
        name: "Player 2",
        imageId: null,
      });

      // Create match
      const matchInput: inferProcedureInput<
        AppRouter["newMatch"]["createMatch"]
      > = {
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
            id: player1.id,
            roles: [],
            teamId: null,
          },
          {
            type: "original",
            id: player2.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      };

      const result = await caller.newMatch.createMatch(matchInput);

      expect(result).toMatchObject({
        name: "Test Match",
        game: {
          id: createdGame.id,
        },
        location: null,
      });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("number");
      expect(result.date).toBeInstanceOf(Date);
      expect(result.players).toHaveLength(2);
      expect(result.players.map((p) => p.id)).toContain(player1.id);
      expect(result.players.map((p) => p.id)).toContain(player2.id);
    });

    test("verifies match output structure matches schema", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // Create a game
      const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Schema Test Game",
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

      // Get scoresheets
      const scoresheetsInput: inferProcedureInput<
        AppRouter["newGame"]["gameScoreSheetsWithRounds"]
      > = {
        type: "original",
        id: createdGame.id,
      };
      const scoresheets = await caller.newGame.gameScoreSheetsWithRounds(
        scoresheetsInput,
      );

      expect(scoresheets.length).toBeGreaterThan(0);
      const defaultScoresheet = scoresheets[0];
      if (defaultScoresheet?.type !== "original") {
        throw new Error("No scoresheet found");
      }

      // Create player
      const player = await caller.player.create({
        name: "Schema Test Player",
        imageId: null,
      });

      // Create match
      const matchInput: inferProcedureInput<
        AppRouter["newMatch"]["createMatch"]
      > = {
        name: "Schema Test Match",
        date: new Date("2024-06-15T10:00:00Z"),
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
        location: null,
      };

      const result = await caller.newMatch.createMatch(matchInput);

      // Verify output structure matches createMatchOutput schema
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("date");
      expect(result).toHaveProperty("game");
      expect(result).toHaveProperty("location");
      expect(result).toHaveProperty("players");

      expect(typeof result.id).toBe("number");
      expect(typeof result.name).toBe("string");
      expect(result.date).toBeInstanceOf(Date);
      expect(result.game).toHaveProperty("id");
      expect(typeof result.game.id).toBe("number");
      expect(Array.isArray(result.players)).toBe(true);
      expect(result.players.length).toBeGreaterThan(0);
      expect(result.players[0]).toHaveProperty("id");
      expect(typeof result.players[0]?.id).toBe("number");
    });
  });
});

