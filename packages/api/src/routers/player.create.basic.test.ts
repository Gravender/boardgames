import type { inferProcedureInput } from "@trpc/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { createContextInner } from "../context";
import type { AppRouter } from "../root";
import { appRouter } from "../root";
import { createCallerFactory } from "../trpc";
import { createTestSession, createTestUser, deleteTestUser } from "../test-helpers";

describe("Player Create - Basic Tests", () => {
  const testUserId = "test-user-1-player-basic";

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

  describe("basic player creation", () => {
    test("creates a player with minimal required data", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["player"]["create"]> = {
        name: "Test Player",
        imageId: null,
      };

      const result = await caller.player.create(input);

      expect(result).toMatchObject({
        name: "Test Player",
        image: null,
        matches: 0,
        team: 0,
      });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("number");
    });

    test("creates a player with optional imageId", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      // First create an image
      const imageInput: inferProcedureInput<AppRouter["image"]["create"]> = {
        name: "Test Image",
        url: "https://example.com/image.jpg",
        type: "file",
        usageType: "player",
        fileId: null,
        fileSize: null,
      };
      const createdImage = await caller.image.create(imageInput);

      const input: inferProcedureInput<AppRouter["player"]["create"]> = {
        name: "Player With Image",
        imageId: createdImage.id,
      };

      const result = await caller.player.create(input);

      expect(result).toMatchObject({
        name: "Player With Image",
        matches: 0,
        team: 0,
      });
      expect(result.id).toBeDefined();
      expect(result.image).toBeDefined();
      expect(result.image?.id).toBe(createdImage.id);
      expect(result.image?.name).toBe("Test Image");
    });

    test("creates multiple players", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const players = await Promise.all([
        caller.player.create({ name: "Player 1", imageId: null }),
        caller.player.create({ name: "Player 2", imageId: null }),
        caller.player.create({ name: "Player 3", imageId: null }),
      ]);

      expect(players).toHaveLength(3);
      expect(players[0].name).toBe("Player 1");
      expect(players[1].name).toBe("Player 2");
      expect(players[2].name).toBe("Player 3");

      // Verify all players have unique IDs
      const playerIds = players.map((p) => p.id);
      expect(new Set(playerIds).size).toBe(3);
    });

    test("verifies player output structure matches expected schema", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["player"]["create"]> = {
        name: "Schema Test Player",
        imageId: null,
      };

      const result = await caller.player.create(input);

      // Verify output structure
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("image");
      expect(result).toHaveProperty("matches");
      expect(result).toHaveProperty("team");

      expect(typeof result.id).toBe("number");
      expect(typeof result.name).toBe("string");
      expect(typeof result.matches).toBe("number");
      expect(typeof result.team).toBe("number");
      expect(result.matches).toBe(0);
      expect(result.team).toBe(0);
    });

    test("verifies player is associated with correct user", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["player"]["create"]> = {
        name: "User Association Test",
        imageId: null,
      };

      const result = await caller.player.create(input);

      // Verify player was created
      expect(result.id).toBeDefined();

      // Query player directly to verify createdBy
      const db = (await import("@board-games/db/client")).db;
      const playerSchema = (await import("@board-games/db/schema")).player;
      const { eq } = await import("drizzle-orm");

      const [dbPlayer] = await db
        .select()
        .from(playerSchema)
        .where(eq(playerSchema.id, result.id));

      expect(dbPlayer).toBeDefined();
      expect(dbPlayer?.createdBy).toBe(testUserId);
    });
  });
});

