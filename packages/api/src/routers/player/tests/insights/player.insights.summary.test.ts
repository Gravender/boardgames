import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player - getPlayerSummary", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns zeroed summary", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Summary",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.getPlayerSummary({
      type: "original",
      id: player.id,
    });
    expect(result.finishedMatches).toBe(0);
  });

  test("best case: returns populated summary", async () => {
    const { ownerCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const result = await ownerCaller.newPlayer.getPlayerSummary({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    expect(result.finishedMatches).toBeGreaterThan(0);
    expect(result.gamesPlayed).toBeGreaterThan(0);
  });

  test("worst case: throws for missing player", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.getPlayerSummary({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
  });
});
