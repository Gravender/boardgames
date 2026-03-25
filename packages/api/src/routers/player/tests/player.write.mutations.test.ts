import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { db } from "@board-games/db/client";
import { player } from "@board-games/db/schema";

import { createContextInner } from "../../../context";
import { appRouter } from "../../../root";
import { testLifecycle } from "../../../test-fixtures";
import { createTestSession } from "../../../test-helpers";
import { createCallerFactory } from "../../../trpc";
import {
  createInsightsCallers,
  createSharedPlayerFixture,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./insights/player.insights.test-utils";

describe("Player write mutations (newPlayer router)", () => {
  const lifecycle = testLifecycle();

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

  test("deletePlayer original soft-deletes owned player", async () => {
    const ctx = await createContextInner({
      session: createTestSession(lifecycle.userId),
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const created = await caller.newPlayer.create({
      name: "To Delete",
      imageId: null,
    });

    await caller.newPlayer.deletePlayer({
      type: "original",
      id: created.id,
    });

    const [row] = await db
      .select({ deletedAt: player.deletedAt })
      .from(player)
      .where(eq(player.id, created.id));

    expect(row?.deletedAt).not.toBeNull();
  });

  test("deletePlayer original returns NOT_FOUND for missing player", async () => {
    const ctx = await createContextInner({
      session: createTestSession(lifecycle.userId),
    });
    const caller = createCallerFactory(appRouter)(ctx);

    await expect(
      caller.newPlayer.deletePlayer({ type: "original", id: 999_999_999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("deletePlayer shared removes recipient shared_player row", async () => {
    const ids = await setupInsightsUsers();
    try {
      const { receiverCaller } = await createInsightsCallers(ids);
      const fixture = await createSharedPlayerFixture(ids);

      await receiverCaller.newPlayer.deletePlayer({
        type: "shared",
        sharedId: fixture.sharedPlayerId,
      });

      const remaining = await db.query.sharedPlayer.findFirst({
        where: { id: fixture.sharedPlayerId },
      });
      expect(remaining).toBeUndefined();
    } finally {
      await teardownInsightsUsers(ids);
    }
  });

  test("deletePlayer shared returns NOT_FOUND for wrong id", async () => {
    const ctx = await createContextInner({
      session: createTestSession(lifecycle.userId),
    });
    const caller = createCallerFactory(appRouter)(ctx);

    await expect(
      caller.newPlayer.deletePlayer({ type: "shared", sharedId: 999_999_999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("update shared player rejects view-only permission", async () => {
    const ids = await setupInsightsUsers();
    try {
      const { receiverCaller } = await createInsightsCallers(ids);
      const fixture = await createSharedPlayerFixture(ids);

      await expect(
        receiverCaller.newPlayer.update({
          type: "shared",
          sharedId: fixture.sharedPlayerId,
          name: "Renamed By Recipient",
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    } finally {
      await teardownInsightsUsers(ids);
    }
  });

  test("update original clears image and deletes file post-commit", async () => {
    const deleteFilesSpy = vi.fn(() =>
      Promise.resolve({
        success: true as const,
        deletedCount: 1,
      }),
    );
    const ctx = await createContextInner({
      session: createTestSession(lifecycle.userId),
      deleteFiles: deleteFilesSpy,
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const image = await caller.image.create({
      name: "Player Clear Test",
      url: "https://example.com/clear.jpg",
      type: "file",
      usageType: "player",
      fileId: "utfs-clear-test",
      fileSize: 1024,
    });

    const created = await caller.newPlayer.create({
      name: "Has Image",
      imageId: image.id,
    });

    await caller.newPlayer.update({
      type: "original",
      id: created.id,
      updateValues: { type: "clearImage" },
    });

    const [row] = await db
      .select({ imageId: player.imageId })
      .from(player)
      .where(eq(player.id, created.id));

    expect(row?.imageId).toBeNull();
    expect(deleteFilesSpy).toHaveBeenCalledWith("utfs-clear-test");
  });

  test("getPlayerToShare returns player and finished matches", async () => {
    const ctx = await createContextInner({
      session: createTestSession(lifecycle.userId),
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const created = await caller.newPlayer.create({
      name: "Share Me",
      imageId: null,
    });

    const payload = await caller.newPlayer.getPlayerToShare({
      id: created.id,
    });

    expect(payload.id).toBe(created.id);
    expect(payload.name).toBe("Share Me");
    expect(Array.isArray(payload.matches)).toBe(true);
  });
});
