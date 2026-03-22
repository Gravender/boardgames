import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player Insights - getPlayerGamePerformanceTable", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty table", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Empty",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.getPlayerGamePerformanceTable(
      {
        type: "original",
        id: player.id,
      },
    );
    expect(result.rows).toEqual([]);
  });

  test("best case: returns rows for original and shared", async () => {
    const { ownerCaller, receiverCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const original = await ownerCaller.newPlayer.getPlayerGamePerformanceTable({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    const shared = await receiverCaller.newPlayer.getPlayerGamePerformanceTable(
      {
        type: "shared",
        sharedPlayerId: seeded.receiverSharedTargetPlayerId,
      },
    );
    expect(original.rows.length).toBeGreaterThan(0);
    expect(shared.rows.length).toBeGreaterThan(0);
  });

  test("worst case: throws for missing players", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.getPlayerGamePerformanceTable({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
  });
});
