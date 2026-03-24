import { describe, expect, test } from "vitest";

import { kCombinations } from "./combinations";

describe("kCombinations", () => {
  test("returns empty for invalid k", () => {
    expect(kCombinations(["a", "b"], 0)).toEqual([]);
    expect(kCombinations(["a", "b"], 3)).toEqual([]);
    expect(kCombinations(["a", "b"], -1)).toEqual([]);
  });

  test("returns empty for empty input when k is 0 or 1", () => {
    expect(kCombinations([], 0)).toEqual([]);
    expect(kCombinations([], 1)).toEqual([]);
  });

  test("k equals array length returns one full combination", () => {
    expect(kCombinations(["a", "b", "c"], 3)).toEqual([["a", "b", "c"]]);
  });

  test("k is 1 returns singleton arrays", () => {
    expect(kCombinations(["x", "y", "z"], 1)).toEqual([["x"], ["y"], ["z"]]);
  });

  test("larger k on multi-element arrays (production cohort sizes)", () => {
    const six = ["a", "b", "c", "d", "e", "f"];
    const k3 = kCombinations(six, 3);
    expect(k3.length).toBe(20);
    expect(k3[0]).toEqual(["a", "b", "c"]);
    const k4 = kCombinations(six, 4);
    expect(k4.length).toBe(15);
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
