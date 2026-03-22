import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player Insights - getPlayerPlacementDistribution", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty distributions", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Empty",
      imageId: null,
    });
    const result =
      await receiverCaller.newPlayer.getPlayerPlacementDistribution({
        type: "original",
        id: player.id,
      });
    expect(result.placements).toEqual([]);
    expect(result.byGameSize).toEqual([]);
  });

  test("best case: returns populated distributions", async () => {
    const { ownerCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const result = await ownerCaller.newPlayer.getPlayerPlacementDistribution({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    expect(result.placements.length).toBeGreaterThan(0);
  });

  test("worst case: throws for missing player", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.getPlayerPlacementDistribution({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
  });
});
