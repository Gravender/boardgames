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
import {
  game,
  group as groupTable,
  groupPlayer,
  match,
  matchPlayer,
  player,
  scoresheet,
} from "@board-games/db/schema";

import {
  createAuthenticatedCaller,
  testLifecycle,
} from "../../../test-fixtures";

describe("group router — getGroupsWithPlayers match counts", () => {
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

  test("returns zero matches when group players have no finished matches", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);

    const [p1] = await db
      .insert(player)
      .values({ name: "G1 P1", createdBy: lifecycle.userId, isUser: false })
      .returning();
    const [p2] = await db
      .insert(player)
      .values({ name: "G1 P2", createdBy: lifecycle.userId, isUser: false })
      .returning();
    if (!p1 || !p2) throw new Error("Failed to insert players");

    const [g1] = await db
      .insert(groupTable)
      .values({ name: "Empty Group", createdBy: lifecycle.userId })
      .returning();
    if (!g1) throw new Error("Failed to insert group");

    await db.insert(groupPlayer).values([
      { groupId: g1.id, playerId: p1.id },
      { groupId: g1.id, playerId: p2.id },
    ]);

    const result = await caller.group.getGroupsWithPlayers();
    expect(result.groups.length).toBe(1);
    expect(result.groups[0]?.matches).toBe(0);
  });

  test("counts only matches where all group players appeared, ignoring partial-overlap ones", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);

    const [p1] = await db
      .insert(player)
      .values({ name: "G2 P1", createdBy: lifecycle.userId, isUser: false })
      .returning();
    const [p2] = await db
      .insert(player)
      .values({ name: "G2 P2", createdBy: lifecycle.userId, isUser: false })
      .returning();
    const [p3] = await db
      .insert(player)
      .values({ name: "G2 P3", createdBy: lifecycle.userId, isUser: false })
      .returning();
    if (!p1 || !p2 || !p3) throw new Error("Failed to insert players");

    const [g2] = await db
      .insert(groupTable)
      .values({ name: "Overlap Group", createdBy: lifecycle.userId })
      .returning();
    if (!g2) throw new Error("Failed to insert group");

    await db.insert(groupPlayer).values([
      { groupId: g2.id, playerId: p1.id },
      { groupId: g2.id, playerId: p2.id },
    ]);

    const [gameRow] = await db
      .insert(game)
      .values({ name: "Group Match Game", createdBy: lifecycle.userId })
      .returning();
    if (!gameRow) throw new Error("Failed to insert game");

    const [scoresheetRow] = await db
      .insert(scoresheet)
      .values({
        name: "Group Match Scoresheet",
        gameId: gameRow.id,
        createdBy: lifecycle.userId,
        isCoop: false,
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        targetScore: 0,
        type: "Default",
      })
      .returning();
    if (!scoresheetRow) throw new Error("Failed to insert scoresheet");

    // matchBoth: p1 + p2 — should be counted
    const [matchBoth] = await db
      .insert(match)
      .values({
        createdBy: lifecycle.userId,
        gameId: gameRow.id,
        scoresheetId: scoresheetRow.id,
        finished: true,
        date: new Date(),
      })
      .returning();
    if (!matchBoth) throw new Error("Failed to insert matchBoth");

    // matchOnlyP1: only p1 — should NOT be counted
    const [matchOnlyP1] = await db
      .insert(match)
      .values({
        createdBy: lifecycle.userId,
        gameId: gameRow.id,
        scoresheetId: scoresheetRow.id,
        finished: true,
        date: new Date(),
      })
      .returning();
    if (!matchOnlyP1) throw new Error("Failed to insert matchOnlyP1");

    // matchNeither: only p3 — should NOT be counted
    const [matchNeither] = await db
      .insert(match)
      .values({
        createdBy: lifecycle.userId,
        gameId: gameRow.id,
        scoresheetId: scoresheetRow.id,
        finished: true,
        date: new Date(),
      })
      .returning();
    if (!matchNeither) throw new Error("Failed to insert matchNeither");

    await db.insert(matchPlayer).values([
      { matchId: matchBoth.id, playerId: p1.id },
      { matchId: matchBoth.id, playerId: p2.id },
      { matchId: matchOnlyP1.id, playerId: p1.id },
      { matchId: matchNeither.id, playerId: p3.id },
    ]);

    const result = await caller.group.getGroupsWithPlayers();
    const overlapGroup = result.groups.find((g) => g.id === g2.id);
    expect(overlapGroup).toBeDefined();
    expect(overlapGroup?.matches).toBe(1);
  });

  test("unfinished matches are not counted", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);

    const [p1] = await db
      .insert(player)
      .values({ name: "G3 P1", createdBy: lifecycle.userId, isUser: false })
      .returning();
    const [p2] = await db
      .insert(player)
      .values({ name: "G3 P2", createdBy: lifecycle.userId, isUser: false })
      .returning();
    if (!p1 || !p2) throw new Error("Failed to insert players");

    const [g3] = await db
      .insert(groupTable)
      .values({ name: "Unfinished Group", createdBy: lifecycle.userId })
      .returning();
    if (!g3) throw new Error("Failed to insert group");

    await db.insert(groupPlayer).values([
      { groupId: g3.id, playerId: p1.id },
      { groupId: g3.id, playerId: p2.id },
    ]);

    const [gameRow] = await db
      .insert(game)
      .values({ name: "Unfinished Game", createdBy: lifecycle.userId })
      .returning();
    if (!gameRow) throw new Error("Failed to insert game");

    const [scoresheetRow] = await db
      .insert(scoresheet)
      .values({
        name: "Unfinished Scoresheet",
        gameId: gameRow.id,
        createdBy: lifecycle.userId,
        isCoop: false,
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        targetScore: 0,
        type: "Default",
      })
      .returning();
    if (!scoresheetRow) throw new Error("Failed to insert scoresheet");

    // Both players in an UNFINISHED match
    const [unfinishedMatch] = await db
      .insert(match)
      .values({
        createdBy: lifecycle.userId,
        gameId: gameRow.id,
        scoresheetId: scoresheetRow.id,
        finished: false,
        date: new Date(),
      })
      .returning();
    if (!unfinishedMatch) throw new Error("Failed to insert match");

    await db.insert(matchPlayer).values([
      { matchId: unfinishedMatch.id, playerId: p1.id },
      { matchId: unfinishedMatch.id, playerId: p2.id },
    ]);

    const result = await caller.group.getGroupsWithPlayers();
    const g3Result = result.groups.find((g) => g.id === g3.id);
    expect(g3Result).toBeDefined();
    expect(g3Result?.matches).toBe(0);
  });
});

describe("group router — getGroup", () => {
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

  test("returns NOT_FOUND for missing group id", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    await expect(
      caller.group.getGroup({ id: 9_999_999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("returns players and full match payloads for all-member finished matches", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);

    const [p1] = await db
      .insert(player)
      .values({ name: "GG P1", createdBy: lifecycle.userId, isUser: false })
      .returning();
    const [p2] = await db
      .insert(player)
      .values({ name: "GG P2", createdBy: lifecycle.userId, isUser: false })
      .returning();
    if (!p1 || !p2) throw new Error("Failed to insert players");

    const [g] = await db
      .insert(groupTable)
      .values({ name: "GetGroup Test", createdBy: lifecycle.userId })
      .returning();
    if (!g) throw new Error("Failed to insert group");

    await db.insert(groupPlayer).values([
      { groupId: g.id, playerId: p1.id },
      { groupId: g.id, playerId: p2.id },
    ]);

    const [gameRow] = await db
      .insert(game)
      .values({ name: "GetGroup Game", createdBy: lifecycle.userId })
      .returning();
    if (!gameRow) throw new Error("Failed to insert game");

    const [scoresheetRow] = await db
      .insert(scoresheet)
      .values({
        name: "GetGroup Scoresheet",
        gameId: gameRow.id,
        createdBy: lifecycle.userId,
        isCoop: false,
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        targetScore: 0,
        type: "Default",
      })
      .returning();
    if (!scoresheetRow) throw new Error("Failed to insert scoresheet");

    const [matchBoth] = await db
      .insert(match)
      .values({
        createdBy: lifecycle.userId,
        gameId: gameRow.id,
        scoresheetId: scoresheetRow.id,
        finished: true,
        date: new Date("2024-06-15T12:00:00.000Z"),
        name: "Group outing",
      })
      .returning();
    if (!matchBoth) throw new Error("Failed to insert match");

    await db.insert(matchPlayer).values([
      { matchId: matchBoth.id, playerId: p1.id },
      { matchId: matchBoth.id, playerId: p2.id },
    ]);

    const detail = await caller.group.getGroup({ id: g.id });

    expect(detail.id).toBe(g.id);
    expect(detail.name).toBe("GetGroup Test");
    expect(detail.players.map((x) => x.id).toSorted((a, b) => a - b)).toEqual(
      [p1.id, p2.id].toSorted((a, b) => a - b),
    );
    expect(detail.matches.length).toBe(1);
    const m = detail.matches[0];
    expect(m?.id).toBe(matchBoth.id);
    expect(m?.name).toBe("Group outing");
    expect(m?.finished).toBe(true);
    expect(m?.type).toBe("original");
    expect(m?.game.id).toBe(gameRow.id);
  });
});
