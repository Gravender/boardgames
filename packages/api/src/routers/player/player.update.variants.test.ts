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
  vi,
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
    const deleteFilesSpy = vi.fn(() =>
      Promise.resolve({
        success: true as const,
        deletedCount: 1,
      }),
    );
    const ctx = await createContextInner({
      session: createTestSession(testUserId),
      deleteFiles: deleteFilesSpy,
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const initialImage = await caller.image.create({
      name: "Initial Image",
      url: "https://example.com/initial-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: "utfs-initial-name-1",
      fileSize: 2048,
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
    expect(deleteFilesSpy).not.toHaveBeenCalled();
  });

  test("updates only image with updateValues.type=imageId", async () => {
    const deleteFilesSpy = vi.fn(() =>
      Promise.resolve({
        success: true as const,
        deletedCount: 1,
      }),
    );
    const ctx = await createContextInner({
      session: createTestSession(testUserId),
      deleteFiles: deleteFilesSpy,
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const initialImage = await caller.image.create({
      name: "Initial Image",
      url: "https://example.com/initial-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: "utfs-initial-image-2",
      fileSize: 4096,
    });
    const replacementImage = await caller.image.create({
      name: "Replacement Image",
      url: "https://example.com/replacement-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: "utfs-replacement-image-2",
      fileSize: 1024,
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
    expect(deleteFilesSpy).toHaveBeenCalledTimes(1);
    expect(deleteFilesSpy).toHaveBeenCalledWith(initialImage.fileId);
  });

  test("updates name and image with updateValues.type=nameAndImageId", async () => {
    const deleteFilesSpy = vi.fn(() =>
      Promise.resolve({
        success: true as const,
        deletedCount: 1,
      }),
    );
    const ctx = await createContextInner({
      session: createTestSession(testUserId),
      deleteFiles: deleteFilesSpy,
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const initialImage = await caller.image.create({
      name: "Initial Image",
      url: "https://example.com/initial-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: "utfs-initial-image-3",
      fileSize: 8192,
    });
    const replacementImage = await caller.image.create({
      name: "Replacement Image",
      url: "https://example.com/replacement-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: "utfs-replacement-image-3",
      fileSize: 3072,
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
    expect(deleteFilesSpy).toHaveBeenCalledTimes(1);
    expect(deleteFilesSpy).toHaveBeenCalledWith(initialImage.fileId);
  });

  test("updates name and clears image with updateValues.type=nameAndClearImage", async () => {
    const deleteFilesSpy = vi.fn(() =>
      Promise.resolve({
        success: true as const,
        deletedCount: 1,
      }),
    );
    const ctx = await createContextInner({
      session: createTestSession(testUserId),
      deleteFiles: deleteFilesSpy,
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const initialImage = await caller.image.create({
      name: "Initial Image",
      url: "https://example.com/initial-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: "utfs-initial-image-clear-1",
      fileSize: 4096,
    });

    const createdPlayer = await caller.player.create({
      name: "Original Name",
      imageId: initialImage.id,
    });

    const input: inferProcedureInput<AppRouter["player"]["update"]> = {
      type: "original",
      id: createdPlayer.id,
      updateValues: {
        type: "nameAndClearImage",
        name: "Updated Name No Image",
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
    expect(updatedPlayer?.name).toBe("Updated Name No Image");
    expect(updatedPlayer?.imageId).toBeNull();
    expect(deleteFilesSpy).toHaveBeenCalledTimes(1);
    expect(deleteFilesSpy).toHaveBeenCalledWith(initialImage.fileId);
  });

  test("throws when deleteFiles fails for replaced file-backed image", async () => {
    const deleteFilesSpy = vi.fn(() =>
      Promise.resolve({
        success: false as const,
        deletedCount: 0,
      }),
    );
    const ctx = await createContextInner({
      session: createTestSession(testUserId),
      deleteFiles: deleteFilesSpy,
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const initialImage = await caller.image.create({
      name: "Initial Image",
      url: "https://example.com/initial-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: "utfs-failing-delete-image",
      fileSize: 1024,
    });
    const replacementImage = await caller.image.create({
      name: "Replacement Image",
      url: "https://example.com/replacement-player-image.jpg",
      type: "file",
      usageType: "player",
      fileId: "utfs-failing-delete-image-replacement",
      fileSize: 2048,
    });

    const createdPlayer = await caller.player.create({
      name: "Original Name",
      imageId: initialImage.id,
    });

    await expect(
      caller.player.update({
        type: "original",
        id: createdPlayer.id,
        updateValues: {
          type: "imageId",
          imageId: replacementImage.id,
        },
      }),
    ).rejects.toThrow();

    expect(deleteFilesSpy).toHaveBeenCalledTimes(1);
    expect(deleteFilesSpy).toHaveBeenCalledWith(initialImage.fileId);
  });
});
