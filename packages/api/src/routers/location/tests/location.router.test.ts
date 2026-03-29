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
import { location, sharedLocation } from "@board-games/db/schema";

import { createContextInner } from "../../../context";
import { appRouter } from "../../../root";
import {
  createAuthenticatedCaller,
  ensureUserPlayer,
  testLifecycle,
} from "../../../test-fixtures";
import { createTestUser, deleteTestUser } from "../../../test-helpers";
import { createCallerFactory } from "../../../trpc";

describe("location router — getLocation and mutations", () => {
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

  test("getLocationMatches original returns empty list for new location", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    await ensureUserPlayer(caller);
    const created = await caller.location.create({
      type: "original",
      name: "Empty room",
      isDefault: false,
    });
    const matches = await caller.location.getLocationMatches({
      type: "original",
      id: created.id,
    });
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBe(0);
  });

  test("getLocation original returns discriminated payload after create", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    const created = await caller.location.create({
      type: "original",
      name: "Living Room",
      isDefault: false,
    });
    const detail = await caller.location.getLocation({
      type: "original",
      id: created.id,
    });
    expect(detail).not.toBeNull();
    expect(detail?.type).toBe("original");
    if (detail?.type === "original") {
      expect(detail.id).toBe(created.id);
      expect(detail.name).toBe("Living Room");
      expect(detail.isDefault).toBe(false);
    }
  });

  test("getLocation original returns null for missing location", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    const detail = await caller.location.getLocation({
      type: "original",
      id: 999_999_999,
    });
    expect(detail).toBeNull();
  });

  test("getLocation original returns null for another user's location", async () => {
    const owner = await createTestUser();
    const [ownerLoc] = await db
      .insert(location)
      .values({
        name: "Secret base",
        createdBy: owner.id,
        isDefault: false,
      })
      .returning();
    try {
      const caller = await createAuthenticatedCaller(lifecycle.userId);
      const detail = await caller.location.getLocation({
        type: "original",
        id: ownerLoc!.id,
      });
      expect(detail).toBeNull();
    } finally {
      await deleteTestUser(owner.id);
    }
  });

  test("getLocation shared returns payload for recipient", async () => {
    const recipient = await createTestUser();
    try {
      const [ownerLoc] = await db
        .insert(location)
        .values({
          name: "Cafe",
          createdBy: lifecycle.userId,
          isDefault: false,
        })
        .returning();
      const [sharedRow] = await db
        .insert(sharedLocation)
        .values({
          ownerId: lifecycle.userId,
          sharedWithId: recipient.id,
          locationId: ownerLoc!.id,
          permission: "view",
          isDefault: false,
        })
        .returning();

      const recipientCaller = await createAuthenticatedCaller(recipient.id);
      const detail = await recipientCaller.location.getLocation({
        type: "shared",
        sharedId: sharedRow!.id,
      });
      expect(detail).not.toBeNull();
      expect(detail?.type).toBe("shared");
      if (detail?.type === "shared") {
        expect(detail.sharedId).toBe(sharedRow!.id);
        expect(detail.permission).toBe("view");
        expect(detail.name).toBe("Cafe");
      }
    } finally {
      await deleteTestUser(recipient.id);
    }
  });

  test("update original rejects another user's location", async () => {
    const owner = await createTestUser();
    const [ownerLoc] = await db
      .insert(location)
      .values({
        name: "Keep out",
        createdBy: owner.id,
        isDefault: false,
      })
      .returning();
    try {
      const caller = await createAuthenticatedCaller(lifecycle.userId);
      await expect(
        caller.location.update({
          type: "original",
          id: ownerLoc!.id,
          name: "Hacked",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await deleteTestUser(owner.id);
    }
  });

  test("update shared rejects view permission", async () => {
    const recipient = await createTestUser();
    try {
      const [ownerLoc] = await db
        .insert(location)
        .values({
          name: "Pub",
          createdBy: lifecycle.userId,
          isDefault: false,
        })
        .returning();
      const [sharedRow] = await db
        .insert(sharedLocation)
        .values({
          ownerId: lifecycle.userId,
          sharedWithId: recipient.id,
          locationId: ownerLoc!.id,
          permission: "view",
          isDefault: false,
        })
        .returning();

      const recipientCaller = await createAuthenticatedCaller(recipient.id);
      await expect(
        recipientCaller.location.update({
          type: "shared",
          sharedId: sharedRow!.id,
          name: "Renamed",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await deleteTestUser(recipient.id);
    }
  });

  test("update shared succeeds with edit permission", async () => {
    const recipient = await createTestUser();
    try {
      const [ownerLoc] = await db
        .insert(location)
        .values({
          name: "Hall",
          createdBy: lifecycle.userId,
          isDefault: false,
        })
        .returning();
      const [sharedRow] = await db
        .insert(sharedLocation)
        .values({
          ownerId: lifecycle.userId,
          sharedWithId: recipient.id,
          locationId: ownerLoc!.id,
          permission: "edit",
          isDefault: false,
        })
        .returning();

      const recipientCaller = await createAuthenticatedCaller(recipient.id);
      await recipientCaller.location.update({
        type: "shared",
        sharedId: sharedRow!.id,
        name: "Great Hall",
      });

      const after = await db.query.location.findFirst({
        where: { id: ownerLoc!.id },
      });
      expect(after?.name).toBe("Great Hall");
    } finally {
      await deleteTestUser(recipient.id);
    }
  });

  test("create with isDefault clears other defaults for user", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    const first = await caller.location.create({
      type: "original",
      name: "A",
      isDefault: true,
    });
    const second = await caller.location.create({
      type: "original",
      name: "B",
      isDefault: true,
    });
    const a = await caller.location.getLocation({
      type: "original",
      id: first.id,
    });
    const b = await caller.location.getLocation({
      type: "original",
      id: second.id,
    });
    expect(a?.type === "original" && !a.isDefault).toBe(true);
    expect(b?.type === "original" && b.isDefault).toBe(true);
  });

  test("editDefaultLocation throws NOT_FOUND when location id invalid", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    await expect(
      caller.location.editDefaultLocation({
        type: "original",
        id: 999_999_999,
        isDefault: true,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("deleteLocation shared removes access for recipient", async () => {
    const recipient = await createTestUser();
    try {
      const [ownerLoc] = await db
        .insert(location)
        .values({
          name: "Garage",
          createdBy: lifecycle.userId,
          isDefault: false,
        })
        .returning();
      const [sharedRow] = await db
        .insert(sharedLocation)
        .values({
          ownerId: lifecycle.userId,
          sharedWithId: recipient.id,
          locationId: ownerLoc!.id,
          permission: "view",
          isDefault: false,
        })
        .returning();

      const recipientCaller = await createAuthenticatedCaller(recipient.id);
      await recipientCaller.location.deleteLocation({
        type: "shared",
        sharedId: sharedRow!.id,
      });
      const after = await recipientCaller.location.getLocation({
        type: "shared",
        sharedId: sharedRow!.id,
      });
      expect(after).toBeNull();
    } finally {
      await deleteTestUser(recipient.id);
    }
  });

  test("deleteLocation shared returns NOT_FOUND for wrong id", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    await expect(
      caller.location.deleteLocation({
        type: "shared",
        sharedId: 999_999_999,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("unauthenticated caller cannot call getLocation", async () => {
    const ctx = await createContextInner({});
    const caller = createCallerFactory(appRouter)(ctx);
    await expect(
      caller.location.getLocation({ type: "original", id: 1 }),
    ).rejects.toThrow();
  });

  test("sharing.getSharedLocation maps shared branch from location service", async () => {
    const recipient = await createTestUser();
    try {
      const [ownerLoc] = await db
        .insert(location)
        .values({
          name: "Via sharing router",
          createdBy: lifecycle.userId,
          isDefault: false,
        })
        .returning();
      const [sharedRow] = await db
        .insert(sharedLocation)
        .values({
          ownerId: lifecycle.userId,
          sharedWithId: recipient.id,
          locationId: ownerLoc!.id,
          permission: "view",
          isDefault: false,
        })
        .returning();

      const recipientCaller = await createAuthenticatedCaller(recipient.id);
      await ensureUserPlayer(recipientCaller);
      const viaSharing = await recipientCaller.sharing.getSharedLocation({
        id: sharedRow!.id,
      });
      expect(viaSharing).not.toBeNull();
      expect(viaSharing?.id).toBe(sharedRow!.id);
      expect(viaSharing?.name).toBe("Via sharing router");
    } finally {
      await deleteTestUser(recipient.id);
    }
  });
});
