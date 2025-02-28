import { describe, expect, it } from "vitest";

import { CapitalizeFirstLetterOfEachWord, formatDuration } from "./utils";

// Tests for CapitalizeFirstLetterOfEachWord
describe("CapitalizeFirstLetterOfEachWord", () => {
  it("should capitalize the first letter of each word", () => {
    expect(CapitalizeFirstLetterOfEachWord("hello world")).toBe("Hello World");
  });

  it("should handle multiple spaces correctly", () => {
    expect(CapitalizeFirstLetterOfEachWord("  multiple   spaces  ")).toBe(
      "  Multiple   Spaces  ",
    );
  });

  it("should handle single word input", () => {
    expect(CapitalizeFirstLetterOfEachWord("test")).toBe("Test");
  });

  it("should handle an empty string", () => {
    expect(CapitalizeFirstLetterOfEachWord("")).toBe("");
  });

  it("should handle mixed case input", () => {
    expect(CapitalizeFirstLetterOfEachWord("tEsT cAsE")).toBe("TEsT CAsE");
  });
});

// Tests for formatDuration
describe("formatDuration", () => {
  it("should format 0 seconds as 00:00:00", () => {
    expect(formatDuration(0)).toBe("00:00:00");
  });

  it("should format seconds correctly", () => {
    expect(formatDuration(45)).toBe("00:00:45");
  });

  it("should format minutes correctly", () => {
    expect(formatDuration(125)).toBe("00:02:05");
  });

  it("should format hours correctly", () => {
    expect(formatDuration(3725)).toBe("01:02:05");
  });

  it("should handle large durations", () => {
    expect(formatDuration(86400)).toBe("24:00:00"); // 24 hours
  });
});
