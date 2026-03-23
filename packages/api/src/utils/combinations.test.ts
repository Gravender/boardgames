import { describe, expect, test } from "vitest";

import { kCombinations } from "./combinations";

describe("kCombinations", () => {
  test("returns empty for invalid k", () => {
    expect(kCombinations(["a", "b"], 0)).toEqual([]);
    expect(kCombinations(["a", "b"], 3)).toEqual([]);
  });

  test("returns all pairs from three elements", () => {
    const c = kCombinations(["a", "b", "c"], 2);
    expect(c).toEqual([
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
    ]);
  });

  test("respects input order for k=2", () => {
    const c = kCombinations(["z", "y"], 2);
    expect(c).toEqual([["z", "y"]]);
  });
});
