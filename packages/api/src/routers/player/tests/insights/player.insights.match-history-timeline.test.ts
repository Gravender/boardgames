import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player Insights - getPlayerMatchHistoryTimeline", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty timeline", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Empty",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.getPlayerMatchHistoryTimeline(
      {
        type: "original",
        id: player.id,
      },
    );
    expect(result.timeline).toEqual([]);
  });

  test("best case: returns ordered timeline entries", async () => {
    const { ownerCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const result = await ownerCaller.newPlayer.getPlayerMatchHistoryTimeline({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    expect(result.timeline.length).toBeGreaterThan(0);
    expect(result.timeline[0]?.delta.streakAfter).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < result.timeline.length; i++) {
      const prev = result.timeline[i - 1]!.date.getTime();
      const cur = result.timeline[i]!.date.getTime();
      expect(cur).toBeGreaterThanOrEqual(prev);
    }
  });

  test("worst case: throws for missing player", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.getPlayerMatchHistoryTimeline({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
  });
});
