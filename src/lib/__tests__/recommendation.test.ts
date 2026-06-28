import { describe, it, expect } from "vitest";
import { cmp } from "@/lib/recommendation/engine";

describe("recommendation: cmp", () => {
  it("supports all comparators", () => {
    expect(cmp(74, "LT", 75)).toBe(true);
    expect(cmp(75, "LTE", 75)).toBe(true);
    expect(cmp(8, "GT", 7)).toBe(true);
    expect(cmp(7, "GTE", 7)).toBe(true);
    expect(cmp(5, "EQ", 5)).toBe(true);
    expect(cmp(5, "NEQ", 6)).toBe(true);
  });
  it("returns false for null actuals", () => {
    expect(cmp(null, "LT", 75)).toBe(false);
  });
});
