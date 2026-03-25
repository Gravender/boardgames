import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player Insights - getPlayerGameWinRateCharts", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty game series", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Empty",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.stats.getPlayerGameWinRateCharts({
      type: "original",
      id: player.id,
    });
    expect(result.series.byGame).toEqual([]);
  });

  test("best case: returns populated chart series", async () => {
    const { ownerCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const result = await ownerCaller.newPlayer.stats.getPlayerGameWinRateCharts({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    expect(result.series.byGame.length).toBeGreaterThan(0);
    expect(result.series.byMode.length).toBe(2);
  });

  test("worst case: throws for missing player", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.stats.getPlayerGameWinRateCharts({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
  });
});
