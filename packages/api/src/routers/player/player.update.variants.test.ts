import type { inferProcedureInput } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import { db } from "@board-games/db/client";
import { player } from "@board-games/db/schema";

import type { AppRouter } from "../../root";
import { createContextInner } from "../../context";
import { appRouter } from "../../root";
import {
  createTestSession,
  createTestUser,
  deleteTestUser,
} from "../../test-helpers";
import { createCallerFactory } from "../../trpc";

describe("Player Update - updateValues variants", () => {
  const testUserId = "test-user-player-update-variants";

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

  test("updates only name with updateValues.type=name", async () => {
    const ctx = await createContextInner({
      session: createTestSession(testUserId),
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const initialImage = await caller.image.create({
      name: "Initial Image",
      url: "https://example.com/initial-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: null,
      fileSize: null,
    });

    const createdPlayer = await caller.player.create({
      name: "Original Name",
      imageId: initialImage.id,
    });

    const input: inferProcedureInput<AppRouter["player"]["update"]> = {
      type: "original",
      id: createdPlayer.id,
      updateValues: {
        type: "name",
        name: "Updated Name Only",
      },
    };
    await caller.player.update(input);

    const [updatedPlayer] = await db
      .select({
        id: player.id,
        name: player.name,
        imageId: player.imageId,
      })
      .from(player)
      .where(eq(player.id, createdPlayer.id));

    expect(updatedPlayer).toBeDefined();
    expect(updatedPlayer?.name).toBe("Updated Name Only");
    expect(updatedPlayer?.imageId).toBe(initialImage.id);
  });

  test("updates only image with updateValues.type=imageId", async () => {
    const ctx = await createContextInner({
      session: createTestSession(testUserId),
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const initialImage = await caller.image.create({
      name: "Initial Image",
      url: "https://example.com/initial-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: null,
      fileSize: null,
    });
    const replacementImage = await caller.image.create({
      name: "Replacement Image",
      url: "https://example.com/replacement-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: null,
      fileSize: null,
    });

    const createdPlayer = await caller.player.create({
      name: "Stable Name",
      imageId: initialImage.id,
    });

    const input: inferProcedureInput<AppRouter["player"]["update"]> = {
      type: "original",
      id: createdPlayer.id,
      updateValues: {
        type: "imageId",
        imageId: replacementImage.id,
      },
    };
    await caller.player.update(input);

    const [updatedPlayer] = await db
      .select({
        id: player.id,
        name: player.name,
        imageId: player.imageId,
      })
      .from(player)
      .where(eq(player.id, createdPlayer.id));

    expect(updatedPlayer).toBeDefined();
    expect(updatedPlayer?.name).toBe("Stable Name");
    expect(updatedPlayer?.imageId).toBe(replacementImage.id);
  });

  test("updates name and image with updateValues.type=nameAndImageId", async () => {
    const ctx = await createContextInner({
      session: createTestSession(testUserId),
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const initialImage = await caller.image.create({
      name: "Initial Image",
      url: "https://example.com/initial-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: null,
      fileSize: null,
    });
    const replacementImage = await caller.image.create({
      name: "Replacement Image",
      url: "https://example.com/replacement-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: null,
      fileSize: null,
    });

    const createdPlayer = await caller.player.create({
      name: "Original Name",
      imageId: initialImage.id,
    });

    const input: inferProcedureInput<AppRouter["player"]["update"]> = {
      type: "original",
      id: createdPlayer.id,
      updateValues: {
        type: "nameAndImageId",
        name: "Updated Name",
        imageId: replacementImage.id,
      },
    };
    await caller.player.update(input);

    const [updatedPlayer] = await db
      .select({
        id: player.id,
        name: player.name,
        imageId: player.imageId,
      })
      .from(player)
      .where(eq(player.id, createdPlayer.id));

    expect(updatedPlayer).toBeDefined();
    expect(updatedPlayer?.name).toBe("Updated Name");
    expect(updatedPlayer?.imageId).toBe(replacementImage.id);
  });
});
