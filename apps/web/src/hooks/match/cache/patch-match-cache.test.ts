import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { RouterOutputs } from "@board-games/api";

import { patchMatchQueryData } from "./patch-match-cache";

const matchFixture = {
  type: "original" as const,
  id: 1,
  name: "M",
  comment: "old" as string | null,
} as RouterOutputs["match"]["getMatch"];

describe("patchMatchQueryData", () => {
  it("merges comment into cached getMatch data", () => {
    const client = new QueryClient();
    const key = ["match", "getMatch"] as const;
    client.setQueryData(key, matchFixture);

    patchMatchQueryData(client, key, { comment: "new" });

    expect(client.getQueryData(key)).toMatchObject({
      ...matchFixture,
      comment: "new",
    });
  });

  it("no-ops when there is no cached data", () => {
    const client = new QueryClient();
    const key = ["match", "getMatch", "missing"] as const;

    patchMatchQueryData(client, key, { comment: "x" });

    expect(client.getQueryData(key)).toBeUndefined();
  });
});
