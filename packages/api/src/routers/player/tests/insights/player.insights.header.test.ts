import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { InsightsUserIds } from "./player.insights.test-utils";
import {
  createInsightsCallers,
  createSharedPlayerFixture,
  setupInsightsUsers,
  teardownInsightsUsers,
} from "./player.insights.test-utils";

describe("Player - getPlayerHeader", () => {
  let ids: InsightsUserIds | undefined;

  beforeEach(async () => {
    await teardownInsightsUsers(ids);
    ids = await setupInsightsUsers();
  });
  afterEach(async () => {
    await teardownInsightsUsers(ids);
  });

  test("normal case: returns original header", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const player = await receiverCaller.player.create({
      name: "Header",
      imageId: null,
    });
    const result = await receiverCaller.newPlayer.getPlayerHeader({
      type: "original",
      id: player.id,
    });
    expect(result.type).toBe("original");
  });

  test("best case: returns shared header with permissions", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    const fixture = await createSharedPlayerFixture(ids!);
    const result = await receiverCaller.newPlayer.getPlayerHeader({
      type: "shared",
      sharedPlayerId: fixture.sharedPlayerId,
    });
    expect(result.type).toBe("shared");
    if (result.type === "shared") {
      expect(result.permissions).toBe("view");
    }
  });

  test("worst case: throws for missing player", async () => {
    const { receiverCaller } = await createInsightsCallers(ids!);
    await expect(
      receiverCaller.newPlayer.getPlayerHeader({
        type: "original",
        id: 99999999,
      }),
    ).rejects.toThrow("Player not found.");
  });
});
