import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player Insights - getPlayerTopRivals", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty rivals", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Empty",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.stats.getPlayerTopRivals({
      type: "original",
      id: player.id,
    });
    expect(result.rivals).toEqual([]);
  });

  test("fixture under five head-to-head games: no rivals listed", async () => {
    const { ownerCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!, {
      extraCompetitiveMatchCopies: 0,
    });
    const result = await ownerCaller.newPlayer.stats.getPlayerTopRivals({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    expect(result.rivals).toEqual([]);
  });

  test("invariant: any listed rival has >=5 matches and byGame rows", async () => {
    const { ownerCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const result = await ownerCaller.newPlayer.stats.getPlayerTopRivals({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    expect(
      result.rivals.every((r) => r.matches >= 5 && r.byGame.length > 0),
    ).toBe(true);
  });

  test("worst case: throws for missing player", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.stats.getPlayerTopRivals({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
  });
});
