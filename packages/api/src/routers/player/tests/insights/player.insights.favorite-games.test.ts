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

describe("Player Insights - getPlayerFavoriteGames", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns empty games", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Empty",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.getPlayerFavoriteGames({
      type: "original",
      id: player.id,
    });
    expect(result.games).toEqual([]);
  });

  test("best case: returns discriminated game entries", async () => {
    const { ownerCaller, receiverCaller } = await createInsightsCallers(ids!);
    const seeded = await seedInsightsHistory(ids!);
    const original = await ownerCaller.newPlayer.getPlayerFavoriteGames({
      type: "original",
      id: seeded.ownerTargetPlayerId,
    });
    const shared = await receiverCaller.newPlayer.getPlayerFavoriteGames({
      type: "shared",
      sharedPlayerId: seeded.receiverSharedTargetPlayerId,
    });
    expect(original.games.length).toBeGreaterThan(0);
    expect(original.games[0]?.type).toBe("original");
    expect(shared.games.length).toBeGreaterThan(0);
    expect(shared.games[0]?.type).toBe("shared");
  });

  test("worst case: throws for missing players", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.getPlayerFavoriteGames({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
    await expect(
      receiverCaller.newPlayer.getPlayerFavoriteGames({
        type: "shared",
        sharedPlayerId: 99999999,
      }),
    ).rejects.toThrow("Shared player not found.");
  });
});
