import { describe, expect, test } from "vitest";

import {
  getPlayersByGameOutput,
  getPlayersForMatchOutput,
  getPlayersOutput,
} from "../player.output";

describe("player router output contracts (discriminated unions)", () => {
  test("getPlayersOutput accepts original and shared list items", () => {
    const parsed = getPlayersOutput.safeParse([
      {
        type: "original",
        id: 1,
        name: "Alice",
        image: null,
        matches: 2,
        gameType: "original",
        permissions: "edit",
      },
      {
        type: "shared",
        sharedId: 3,
        sharedPlayerId: 3,
        name: "Bob",
        image: null,
        matches: 0,
        gameType: "shared",
        permissions: "view",
      },
    ]);
    expect(parsed.success).toBe(true);
  });

  test("getPlayersByGameOutput accepts original and shared list items", () => {
    const parsed = getPlayersByGameOutput.safeParse([
      {
        type: "original",
        id: 1,
        name: "Alice",
        isUser: false,
        image: null,
        matches: 1,
      },
      {
        type: "shared",
        sharedId: 2,
        sharedPlayerId: 2,
        name: "Bob",
        isUser: false,
        image: null,
        matches: 0,
      },
    ]);
    expect(parsed.success).toBe(true);
  });

  test("getPlayersForMatchOutput accepts original and shared players", () => {
    const parsed = getPlayersForMatchOutput.safeParse({
      players: [
        {
          type: "original",
          id: 1,
          name: "Alice",
          matches: 1,
          isUser: false,
          image: null,
        },
        {
          type: "shared",
          sharedId: 2,
          sharedPlayerId: 2,
          name: "Bob",
          matches: 0,
          isUser: false,
          image: null,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
