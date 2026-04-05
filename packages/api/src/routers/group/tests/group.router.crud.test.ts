import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { groupPlayer, player } from "@board-games/db/schema";

import {
  createAuthenticatedCaller,
  testLifecycle,
} from "../../../test-fixtures";
import { createTestUser, deleteTestUser } from "../../../test-helpers";

describe("group router — CRUD and authorization", () => {
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

  test("getGroups returns empty when user has no groups", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    const result = await caller.group.getGroups();
    expect(result).toEqual([]);
  });

  test("create then getGroups returns group with players", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);

    const [p1] = await db
      .insert(player)
      .values({ name: "CRUD P1", createdBy: lifecycle.userId, isUser: false })
      .returning();
    const [p2] = await db
      .insert(player)
      .values({ name: "CRUD P2", createdBy: lifecycle.userId, isUser: false })
      .returning();
    if (!p1 || !p2) throw new Error("Failed to insert players");

    await caller.group.create({
      name: "My Group",
      players: [{ id: p1.id }, { id: p2.id }],
    });

    const groups = await caller.group.getGroups();
    expect(groups.length).toBe(1);
    const g = groups[0];
    expect(g?.name).toBe("My Group");
    expect(g?.players.length).toBe(2);
    expect(g?.players.map((x) => x.id).toSorted((a, b) => a - b)).toEqual(
      [p1.id, p2.id].toSorted((a, b) => a - b),
    );
  });

  test("create rejects players not owned by user", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);

    const otherUser = await createTestUser();
    try {
      const [otherPlayer] = await db
        .insert(player)
        .values({
          name: "Other owner",
          createdBy: otherUser.id,
          isUser: false,
        })
        .returning();
      if (!otherPlayer) throw new Error("Failed to insert player");

      await expect(
        caller.group.create({
          name: "Bad",
          players: [{ id: otherPlayer.id }],
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await deleteTestUser(otherUser.id);
    }
  });

  test("update renames group for owner", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);

    const [p1] = await db
      .insert(player)
      .values({ name: "U1", createdBy: lifecycle.userId, isUser: false })
      .returning();
    if (!p1) throw new Error("Failed to insert player");

    await caller.group.create({
      name: "Before",
      players: [{ id: p1.id }],
    });

    const before = await caller.group.getGroups();
    const id = before[0]?.id;
    if (id === undefined) throw new Error("Expected group id");

    const updated = await caller.group.update({
      id,
      name: "After",
      players: [{ id: p1.id }],
    });
    expect(updated.name).toBe("After");

    const after = await caller.group.getGroups();
    expect(after[0]?.name).toBe("After");
  });

  test("update adds and removes members in one call", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);

    const [p1] = await db
      .insert(player)
      .values({ name: "M1", createdBy: lifecycle.userId, isUser: false })
      .returning();
    const [p2] = await db
      .insert(player)
      .values({ name: "M2", createdBy: lifecycle.userId, isUser: false })
      .returning();
    const [p3] = await db
      .insert(player)
      .values({ name: "M3", createdBy: lifecycle.userId, isUser: false })
      .returning();
    if (!p1 || !p2 || !p3) throw new Error("Failed to insert players");

    await caller.group.create({
      name: "Members",
      players: [{ id: p1.id }],
    });

    const groups = await caller.group.getGroups();
    const gid = groups[0]?.id;
    if (gid === undefined) throw new Error("Expected group id");

    await caller.group.update({
      id: gid,
      name: "Members",
      players: [{ id: p1.id }, { id: p2.id }],
    });

    let g = (await caller.group.getGroups()).find((x) => x.id === gid);
    expect(g?.players.map((p) => p.id).toSorted((a, b) => a - b)).toEqual(
      [p1.id, p2.id].toSorted((a, b) => a - b),
    );

    await caller.group.update({
      id: gid,
      name: "Members",
      players: [{ id: p2.id }],
    });

    g = (await caller.group.getGroups()).find((x) => x.id === gid);
    expect(g?.players.map((p) => p.id)).toEqual([p2.id]);

    await caller.group.update({
      id: gid,
      name: "Members",
      players: [{ id: p2.id }, { id: p3.id }],
    });

    g = (await caller.group.getGroups()).find((x) => x.id === gid);
    expect(g?.players.map((p) => p.id).toSorted((a, b) => a - b)).toEqual(
      [p2.id, p3.id].toSorted((a, b) => a - b),
    );
  });

  test("deleteGroup removes group and memberships", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);

    const [p1] = await db
      .insert(player)
      .values({ name: "D1", createdBy: lifecycle.userId, isUser: false })
      .returning();
    if (!p1) throw new Error("Failed to insert player");

    await caller.group.create({
      name: "To Delete",
      players: [{ id: p1.id }],
    });

    const groups = await caller.group.getGroups();
    const gid = groups[0]?.id;
    if (gid === undefined) throw new Error("Expected group id");

    await caller.group.deleteGroup({ id: gid });

    const after = await caller.group.getGroups();
    expect(after.length).toBe(0);

    const rows = await db
      .select()
      .from(groupPlayer)
      .where(eq(groupPlayer.groupId, gid));
    expect(rows.length).toBe(0);
  });
});
