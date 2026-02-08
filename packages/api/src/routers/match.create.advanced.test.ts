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

describe("Match Create - Advanced Tests", () => {
  const testUserId = "test-user-1-match-advanced";

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

  describe("advanced match creation", () => {
    test("creates a match with all optional fields", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // Create a game
      const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Test Game Full",
          description: "Test description",
          playersMin: 2,
          playersMax: 6,
          playtimeMin: 30,
          playtimeMax: 60,
          yearPublished: 2023,
          ownedBy: false,
          rules: "Test rules",
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
      const scoresheets =
        await caller.newGame.gameScoreSheetsWithRounds(scoresheetsInput);

      expect(scoresheets.length).toBeGreaterThan(0);
      const defaultScoresheet = scoresheets[0];
      if (defaultScoresheet?.type !== "original") {
        throw new Error("No scoresheet found");
      }

      // Create players
      const player1 = await caller.player.create({
        name: "Player A",
        imageId: null,
      });
      const player2 = await caller.player.create({
        name: "Player B",
        imageId: null,
      });
      const player3 = await caller.player.create({
        name: "Player C",
        imageId: null,
      });

      // Create location
      const locationInput: inferProcedureInput<
        AppRouter["location"]["create"]
      > = {
        name: "Test Location",
        isDefault: false,
      };
      const createdLocation = await caller.location.create(locationInput);

      // Create match with teams
      const matchDate = new Date("2024-01-15");
      const matchInput: inferProcedureInput<AppRouter["match"]["createMatch"]> =
        {
          name: "Full Test Match",
          date: matchDate,
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
              teamId: 1, // Will be created as part of teams
            },
            {
              type: "original",
              id: player2.id,
              roles: [],
              teamId: 1,
            },
            {
              type: "original",
              id: player3.id,
              roles: [],
              teamId: 2,
            },
          ],
          teams: [
            {
              id: 1,
              name: "Team Alpha",
              roles: [],
            },
            {
              id: 2,
              name: "Team Beta",
              roles: [],
            },
          ],
          location: {
            type: "original",
            id: createdLocation.id,
          },
        };

      const result = await caller.match.createMatch(matchInput);

      expect(result).toMatchObject({
        name: "Full Test Match",
        game: {
          id: createdGame.id,
        },
        location: {
          id: createdLocation.id,
        },
      });
      expect(result.id).toBeDefined();
      expect(result.date).toEqual(matchDate);
      expect(result.players).toHaveLength(3);
      expect(result.players.map((p) => p.id)).toContain(player1.id);
      expect(result.players.map((p) => p.id)).toContain(player2.id);
      expect(result.players.map((p) => p.id)).toContain(player3.id);
    });

    test("creates a match with multiple players", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // Create a game
      const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Multi-Player Game",
          description: null,
          playersMin: 3,
          playersMax: 8,
          playtimeMin: 20,
          playtimeMax: 45,
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
      const scoresheets =
        await caller.newGame.gameScoreSheetsWithRounds(scoresheetsInput);

      expect(scoresheets.length).toBeGreaterThan(0);
      const defaultScoresheet = scoresheets[0];
      if (defaultScoresheet?.type !== "original") {
        throw new Error("No scoresheet found");
      }

      // Create multiple players
      const players = await Promise.all([
        caller.player.create({ name: "Player 1", imageId: null }),
        caller.player.create({ name: "Player 2", imageId: null }),
        caller.player.create({ name: "Player 3", imageId: null }),
        caller.player.create({ name: "Player 4", imageId: null }),
        caller.player.create({ name: "Player 5", imageId: null }),
      ]);

      // Create match
      const matchInput: inferProcedureInput<AppRouter["match"]["createMatch"]> =
        {
          name: "Multi-Player Match",
          date: new Date(),
          game: {
            type: "original",
            id: createdGame.id,
          },
          scoresheet: {
            type: "original",
            id: defaultScoresheet.id,
          },
          players: players.map((player) => ({
            type: "original" as const,
            id: player.id,
            roles: [],
            teamId: null,
          })),
          teams: [],
          location: null,
        };

      const result = await caller.match.createMatch(matchInput);

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Multi-Player Match");
      expect(result.players).toHaveLength(5);
      expect(result.players.map((p) => p.id).sort()).toEqual(
        players.map((p) => p.id).sort(),
      );
    });

    test("creates a match with teams", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // Create a game
      const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Team Game",
          description: null,
          playersMin: 4,
          playersMax: 8,
          playtimeMin: 30,
          playtimeMax: 60,
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
      const scoresheets =
        await caller.newGame.gameScoreSheetsWithRounds(scoresheetsInput);

      expect(scoresheets.length).toBeGreaterThan(0);
      const defaultScoresheet = scoresheets[0];
      if (defaultScoresheet?.type !== "original") {
        throw new Error("No scoresheet found");
      }

      // Create players
      const player1 = await caller.player.create({
        name: "Team A Player 1",
        imageId: null,
      });
      const player2 = await caller.player.create({
        name: "Team A Player 2",
        imageId: null,
      });
      const player3 = await caller.player.create({
        name: "Team B Player 1",
        imageId: null,
      });
      const player4 = await caller.player.create({
        name: "Team B Player 2",
        imageId: null,
      });

      // Create match with teams
      const matchInput: inferProcedureInput<AppRouter["match"]["createMatch"]> =
        {
          name: "Team Match",
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
              teamId: 1,
            },
            {
              type: "original",
              id: player2.id,
              roles: [],
              teamId: 1,
            },
            {
              type: "original",
              id: player3.id,
              roles: [],
              teamId: 2,
            },
            {
              type: "original",
              id: player4.id,
              roles: [],
              teamId: 2,
            },
          ],
          teams: [
            {
              id: 1,
              name: "Red Team",
              roles: [],
            },
            {
              id: 2,
              name: "Blue Team",
              roles: [],
            },
          ],
          location: null,
        };

      const result = await caller.match.createMatch(matchInput);

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Team Match");
      expect(result.players).toHaveLength(4);
      expect(result.players.map((p) => p.id)).toContain(player1.id);
      expect(result.players.map((p) => p.id)).toContain(player2.id);
      expect(result.players.map((p) => p.id)).toContain(player3.id);
      expect(result.players.map((p) => p.id)).toContain(player4.id);
    });
  });
});
