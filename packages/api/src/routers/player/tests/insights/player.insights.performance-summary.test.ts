import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player Insights - getPlayerPerformanceSummary", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty summary for player with no history", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Empty",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.getPlayerPerformanceSummary({
      type: "original",
      id: player.id,
    });
    expect(result.overall.totalMatches).toBe(0);
    expect(result.recentForm).toEqual([]);
  });

  test("best case: returns populated summary for original and shared", async () => {
    const { ownerCaller, receiverCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const original = await ownerCaller.newPlayer.getPlayerPerformanceSummary({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    const shared = await receiverCaller.newPlayer.getPlayerPerformanceSummary({
      type: "shared",
      sharedPlayerId: seeded.receiverSharedTargetPlayerId,
    });
    expect(original.player.type).toBe("original");
    expect(shared.player.type).toBe("shared");
    expect(original.overall.totalMatches).toBeGreaterThan(0);
    expect(shared.overall.totalMatches).toBeGreaterThan(0);
  });

  test("worst case: throws for missing players", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.getPlayerPerformanceSummary({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
    await expect(
      receiverCaller.newPlayer.getPlayerPerformanceSummary({
        type: "shared",
        sharedPlayerId: 99999999,
      }),
    ).rejects.toThrow("Shared player not found.");
  });
});
