import { describe, expect, test } from "vitest";

import { getLocationOutput, getLocationsOutput } from "../location.output";

describe("location router output contracts (discriminated unions)", () => {
  test("getLocationsOutput accepts original and shared rows", () => {
    const parsed = getLocationsOutput.safeParse([
      {
        type: "original",
        id: 1,
        name: "Home",
        isDefault: false,
        matches: 0,
      },
      {
        type: "shared",
        sharedId: 2,
        name: "Cafe",
        isDefault: false,
        matches: 1,
        permission: "view",
      },
    ]);
    expect(parsed.success).toBe(true);
  });

  test("getLocationOutput accepts original and shared detail payloads", () => {
    const original = getLocationOutput.safeParse({
      type: "original",
      id: 10,
      name: "Hall",
      isDefault: true,
    });
    expect(original.success).toBe(true);

    const shared = getLocationOutput.safeParse({
      type: "shared",
      sharedId: 20,
      permission: "edit",
      name: "Shared hall",
      isDefault: false,
    });
    expect(shared.success).toBe(true);
  });
});
