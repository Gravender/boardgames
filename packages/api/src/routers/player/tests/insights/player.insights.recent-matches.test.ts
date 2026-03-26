import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  seedInsightsHistory,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player Insights - getPlayerRecentMatches", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty matches", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.newPlayer.create({
      name: "Empty",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.stats.getPlayerRecentMatches({
      type: "original",
      id: player.id,
    });
    expect(result.matches).toEqual([]);
  });

  test("best case: returns discriminated match entries", async () => {
    const { ownerCaller, receiverCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const original = await ownerCaller.newPlayer.stats.getPlayerRecentMatches({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    const shared = await receiverCaller.newPlayer.stats.getPlayerRecentMatches({
      type: "shared",
      sharedPlayerId: seeded.receiverSharedTargetPlayerId,
    });
    expect(original.matches.length).toBeGreaterThan(0);
    expect(original.matches[0]?.type).toBe("original");
    expect(original.matches[0]?.viewerParticipation).toEqual(
      expect.objectContaining({
        inMatch: expect.any(Boolean),
        isSameAsProfilePlayer: expect.any(Boolean),
      }),
    );
    expect(shared.matches.length).toBeGreaterThan(0);
    expect(shared.matches[0]?.type).toBe("shared");
    expect(shared.matches[0]?.viewerParticipation).toEqual(
      expect.objectContaining({
        inMatch: expect.any(Boolean),
        isSameAsProfilePlayer: expect.any(Boolean),
      }),
    );
  });

  test("worst case: throws for missing players", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.stats.getPlayerRecentMatches({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
    await expect(
      receiverCaller.newPlayer.stats.getPlayerRecentMatches({
        type: "shared",
        sharedPlayerId: 99999999,
      }),
    ).rejects.toThrow("Shared player not found.");
  });
});
