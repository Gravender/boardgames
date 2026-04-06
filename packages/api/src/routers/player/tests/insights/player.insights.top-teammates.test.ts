import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player Insights - getPlayerTopTeammates", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty teammates", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Empty",
      imageId: null,
    });
    const result = await receiverCaller.player.stats.getPlayerTopTeammates({
      type: "original",
      id: player.id,
    });
    expect(result.teammates).toEqual([]);
  });

  test("fixture under five co-op games together: no teammates listed", async () => {
    const { ownerCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const result = await ownerCaller.player.stats.getPlayerTopTeammates({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    expect(result.teammates).toEqual([]);
  });

  test("invariant: any listed teammate has >=5 matches and byGame rows", async () => {
    const { ownerCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const result = await ownerCaller.player.stats.getPlayerTopTeammates({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    expect(
      result.teammates.every(
        (t) => t.matchesTogether >= 5 && t.byGame.length > 0,
      ),
    ).toBe(true);
  });

  test("worst case: throws for missing player", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.player.stats.getPlayerTopTeammates({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
  });
});
