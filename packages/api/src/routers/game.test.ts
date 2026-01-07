import type { inferProcedureInput } from "@trpc/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { db } from "@board-games/db/client";
import { game,
gameRole,
match,
matchPlayer,
matchPlayerRole,
round,
roundPlayer,
scoresheet,
team,
user, userSharingPreference } from "@board-games/db/schema";
import { eq,inArray } from "drizzle-orm";

import { createContextInner } from "../context";
import type { AppRouter } from "../root";
import { appRouter } from "../root";
import { createCallerFactory } from "../trpc";

/**
 * Helper function to delete a test user from the database
 */
async function deleteTestUser(userId: string) {
  const [returnedUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId));

  
  
  if (returnedUser) {
    const returnedGames = await db.query.game.findMany({
      where: {
        createdBy: returnedUser.id,
      },
      with: {
        scoresheets: true,
        matches: {
          with: {
            matchPlayers: true,
          },
        },
      },
    });
    if(returnedGames.length > 0) {
    const returnedScoresheets = await db.query.scoresheet.findMany({
      where: {
        gameId: {
          in: returnedGames.map((g) => g.id),
        },
      },
    });
    await db.transaction(async (tx) => {
      const matchPlayers = returnedGames.flatMap((g) =>
        g.matches.flatMap((m) => m.matchPlayers.map((mp) => mp.id)),
      );
      const matches = returnedGames.flatMap((g) => g.matches.map((m) => m.id));
    
      if (matchPlayers.length > 0) {
        await tx
          .delete(matchPlayerRole)
          .where(inArray(matchPlayerRole.matchPlayerId, matchPlayers));
        await tx
          .delete(roundPlayer)
          .where(inArray(roundPlayer.matchPlayerId, matchPlayers));
        await tx
          .delete(matchPlayer)
          .where(inArray(matchPlayer.id, matchPlayers));
      }
      if (matches.length > 0) {
        await tx.delete(team).where(inArray(team.matchId, matches));
        await tx.delete(match).where(inArray(match.id, matches));
      }
      if (returnedScoresheets.length > 0) {
        const scoresheetIds = returnedScoresheets.map((s) => s.id);
        await tx
          .delete(round)
          .where(inArray(round.scoresheetId, scoresheetIds));
        await tx
          .delete(scoresheet)
          .where(inArray(scoresheet.id, scoresheetIds));
      }
      const gameIds = returnedGames.map((g) => g.id);
      await tx.delete(gameRole).where(inArray(gameRole.gameId, gameIds));
      await tx.delete(game).where(inArray(game.id, gameIds));
    });
  }
  }
  await db.delete(userSharingPreference).where(eq(userSharingPreference.userId, userId));
  await db.delete(user).where(eq(user.id, userId));
}

/**
 * Helper function to create a test user in the database
 */
async function createTestUser(userId = "test-user-1") {
  // Try to delete first in case it exists from a previous test run
  await deleteTestUser(userId);

  const [createdUser] = await db
    .insert(user)
    .values({
      id: userId,
      name: "Test User",
      email: `test-${userId}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // Create user sharing preference
  await db.insert(userSharingPreference).values({
    userId: userId,
  });

  return createdUser;
}

/**
 * Helper function to create a test session for authenticated tests
 */
function createTestSession(userId = "test-user-1") {
  return {
    session: {
      id: `test-session-${userId}`,
      userId: userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      token: `test-token-${userId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: userId,
      name: "Test User",
      email: `test-${userId}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
      username: null,
      displayUsername: null,
      role: null,
      banned: false,
      banReason: null,
      banExpires: null,
    },
  };
}

describe("Game Router Integration Tests", () => {
  const testUserId = "test-user-1-game";

  beforeAll(async () => {
    // Clean up any existing test user data before all tests
    await deleteTestUser(testUserId);
  });

  afterAll(async () => {
    // Clean up test user data after all tests complete
    await deleteTestUser(testUserId);
  });

  beforeEach(async () => {
    // Ensure test user exists before each test
    await createTestUser(testUserId);
  });

  afterEach(async () => {
    // Clean up test user after each test
    await deleteTestUser(testUserId);
  });

  describe("game.create", () => {
    test("creates a game with minimal required data", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Test Game",
          description: null,
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

      const result = await caller.game.create(input);

      expect(result).toMatchObject({
        name: "Test Game",
        description: null,
        playersMin: 1,
        playersMax: 4,
        playtimeMin: 15,
        playtimeMax: 30,
        yearPublished: 2024,
        ownedBy: true,
        rules: null,
      });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("number");
    });

    test("creates a game with all optional fields", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
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

      const result = await caller.game.create(input);

      expect(result).toMatchObject({
        name: "Test Game Full",
        description: "Test description",
        playersMin: 2,
        playersMax: 6,
        playtimeMin: 30,
        playtimeMax: 60,
        yearPublished: 2023,
        ownedBy: false,
        rules: "Test rules",
      });
      expect(result.id).toBeDefined();
    });
  });

  describe("game.getGame", () => {
    test("retrieves a created game by id", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

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
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

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

