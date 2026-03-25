import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player Insights - getPlayerPlayedWithGroups", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty groups", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Empty",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.stats.getPlayerPlayedWithGroups({
      type: "original",
      id: player.id,
    });
    expect(result.playedWithGroups).toEqual([]);
  });

  test("best case: returns grouped played-with data", async () => {
    const { ownerCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const result = await ownerCaller.newPlayer.stats.getPlayerPlayedWithGroups({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    expect(result.playedWithGroups.length).toBeGreaterThan(0);
    const first = result.playedWithGroups[0];
    expect(first).toBeDefined();
    expect(first?.recentMatches.length).toBeGreaterThan(0);
    expect(first?.profileInCohort.name).toBe("Owner Target");
    expect(first?.members.length).toBeGreaterThanOrEqual(2);
    expect(first?.stability).toBeGreaterThanOrEqual(0);
    expect(first?.groupOrdering.length).toBeGreaterThan(0);
    expect(first?.pairwiseWithinCohort.length).toBeGreaterThan(0);
  });

  test("worst case: throws for missing player", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.stats.getPlayerPlayedWithGroups({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
  });
});
