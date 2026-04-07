import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import { and, eq } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { shareRequest } from "@board-games/db/schema";

import {
  createAuthenticatedCaller,
  createGameFull,
  createGameWithFinishedMatch,
  createGameWithScoresheet,
  gameTestLifecycle,
} from "../game/game-test-fixtures";

describe("sharing.requestShareGame", () => {
  const lifecycle = gameTestLifecycle();

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

  test("link share inserts game_role share_request rows when roles are selected", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    const { gameId } = await createGameFull(caller, {
      gameName: "Role Bundle",
      roles: [{ name: "Carry", description: null }],
    });

    const preview = await caller.game.getGameToShare({ id: gameId });
    const roleId = preview.gameRoles.find((r) => r.name === "Carry")?.id;
    if (roleId === undefined) {
      throw new Error("Expected game role from getGameToShare");
    }

    const scoresheetId = preview.scoresheets[0]?.id;
    if (scoresheetId === undefined) {
      throw new Error("Expected scoresheet");
    }

    await caller.sharing.requestShareGame({
      type: "link",
      gameId,
      permission: "view",
      sharedMatches: [],
      scoresheetsToShare: [{ scoresheetId, permission: "view" }],
      gameRolesToShare: [{ gameRoleId: roleId, permission: "view" }],
    });

    const rows = await db
      .select()
      .from(shareRequest)
      .where(
        and(
          eq(shareRequest.ownerId, lifecycle.userId),
          eq(shareRequest.itemType, "game_role"),
          eq(shareRequest.itemId, roleId),
        ),
      );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test("rejects a match that belongs to another game", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    const { gameId: gameA, matchId } = await createGameWithFinishedMatch(
      caller,
      { gameName: "Game A" },
    );
    const { gameId: gameB } = await createGameWithScoresheet(caller, "Game B");
    const bPreview = await caller.game.getGameToShare({ id: gameB });
    const sheetB = bPreview.scoresheets[0]?.id;
    if (sheetB === undefined) throw new Error("scoresheet B");

    await expect(
      caller.sharing.requestShareGame({
        type: "link",
        gameId: gameB,
        permission: "view",
        sharedMatches: [
          {
            matchId,
            permission: "view",
            includePlayers: false,
            includeLocation: true,
          },
        ],
        scoresheetsToShare: [{ scoresheetId: sheetB, permission: "view" }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("rejects a scoresheet that does not belong to the game", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    const { gameId: g1 } = await createGameWithScoresheet(caller, "G1");
    const { gameId: g2 } = await createGameWithScoresheet(caller, "G2");
    const s2 = await caller.game.getGameToShare({ id: g2 });
    const otherSheet = s2.scoresheets[0]?.id;
    if (otherSheet === undefined) throw new Error("sheet");

    await expect(
      caller.sharing.requestShareGame({
        type: "link",
        gameId: g1,
        permission: "view",
        sharedMatches: [],
        scoresheetsToShare: [{ scoresheetId: otherSheet, permission: "view" }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("rejects a game role from another game", async () => {
    const caller = await createAuthenticatedCaller(lifecycle.userId);
    const { gameId: ga } = await createGameFull(caller, {
      gameName: "GA",
      roles: [{ name: "R1", description: null }],
    });
    const { gameId: gb } = await createGameWithScoresheet(caller, "GB");

    const roleId = (
      await caller.game.getGameToShare({ id: ga })
    ).gameRoles.find((r) => r.name === "R1")?.id;
    if (roleId === undefined) throw new Error("role");

    const previewB = await caller.game.getGameToShare({ id: gb });
    const sheetB = previewB.scoresheets[0]?.id;
    if (sheetB === undefined) throw new Error("sheet");

    await expect(
      caller.sharing.requestShareGame({
        type: "link",
        gameId: gb,
        permission: "view",
        sharedMatches: [],
        scoresheetsToShare: [{ scoresheetId: sheetB, permission: "view" }],
        gameRolesToShare: [{ gameRoleId: roleId, permission: "view" }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
